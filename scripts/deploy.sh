#!/usr/bin/env bash
#
# Build the app, create/update the CloudFormation stack, upload the static
# files and invalidate the CloudFront cache.
#
# Usage:
#   ./scripts/deploy.sh [--stack NAME] [--region REGION] [--skip-build]
#
# Environment overrides:
#   STACK_NAME, AWS_REGION, PROJECT_NAME, PRICE_CLASS,
#   OMDB_API_KEY, MOVIE_ORIGIN_SECRET
#
# OMDB_API_KEY is also read from .env.local or .env when not set in the shell.
# The key is passed only to the movie API Lambda, never into the static build.
#
set -euo pipefail

STACK_NAME="${STACK_NAME:-my-workspace}"
REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-my-workspace}"
PRICE_CLASS="${PRICE_CLASS:-PriceClass_100}"
SKIP_BUILD="false"

usage() {
  cat <<'EOF'
Build the app, create/update the CloudFormation stack, upload the static
files and invalidate the CloudFront cache.

Usage:
  ./scripts/deploy.sh [--stack NAME] [--region REGION] [--skip-build]

Environment overrides:
  STACK_NAME, AWS_REGION, PROJECT_NAME, PRICE_CLASS,
  OMDB_API_KEY, MOVIE_ORIGIN_SECRET

OMDB_API_KEY is read from the shell, .env.local, or .env. It is stored only
in the movie API Lambda environment, never in the static build.
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stack)
      STACK_NAME="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --project)
      PROJECT_NAME="$2"
      shift 2
      ;;
    --price-class)
      PRICE_CLASS="$2"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD="true"
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$ROOT_DIR/infra/template.yaml"
DIST="$ROOT_DIR/dist"
TEMP_TEMPLATE=""

load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" == export\ * ]] && line="${line#export }"
    local key="${line%%=*}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    local value="${line#*=}"
    if [[ "$value" == \"*\" ]]; then value="${value#\"}"; fi
    if [[ "$value" == *\" ]]; then value="${value%\"}"; fi
    if [[ "$value" == \'*\' ]]; then value="${value#\'}"; fi
    if [[ "$value" == *\' ]]; then value="${value%\'}"; fi
    if [[ -z "${!key:-}" ]]; then export "$key=$value"; fi
  done < "$file"
}

load_env_file "$ROOT_DIR/.env.local"
load_env_file "$ROOT_DIR/.env"

OMDB_API_KEY="${OMDB_API_KEY:-}"
MOVIE_ORIGIN_SECRET="${MOVIE_ORIGIN_SECRET:-}"

cleanup() {
  if [[ -n "$TEMP_TEMPLATE" ]]; then
    rm -f "$TEMP_TEMPLATE"
  fi
}
trap cleanup EXIT

command -v aws >/dev/null 2>&1 || {
  echo "AWS CLI not found. Install AWS CLI v2 first." >&2
  exit 1
}
command -v npm >/dev/null 2>&1 || {
  echo "npm not found. Install Node.js 20 or newer." >&2
  exit 1
}
command -v node >/dev/null 2>&1 || {
  echo "node not found. Install Node.js 20 or newer." >&2
  exit 1
}

if [[ -z "$MOVIE_ORIGIN_SECRET" ]]; then
  MOVIE_ORIGIN_SECRET="$(
    node -e "console.log(require('node:crypto').randomBytes(24).toString('hex'))"
  )"
fi

if [[ -z "$OMDB_API_KEY" ]]; then
  echo "==> OMDB_API_KEY is not set. Movie lookup will stay disabled unless the stack already has a key."
fi

aws sts get-caller-identity >/dev/null 2>&1 || {
  echo "No valid AWS credentials. Configure them with 'aws configure' or SSO." >&2
  exit 1
}

if [[ "$SKIP_BUILD" != "true" ]]; then
  echo "==> Building the app"
  (cd "$ROOT_DIR" && npm run build)
fi

[[ -f "$DIST/index.html" ]] || {
  echo "dist/index.html is missing. Run the build first." >&2
  exit 1
}

echo "==> Rendering the Lambda handler into the stack template"
TEMP_TEMPLATE="$(mktemp)"
node "$ROOT_DIR/scripts/render-template.mjs" "$TEMPLATE" "$TEMP_TEMPLATE"

PARAMETERS=(
  "ProjectName=$PROJECT_NAME"
  "PriceClass=$PRICE_CLASS"
  "MovieOriginSecret=$MOVIE_ORIGIN_SECRET"
)
if [[ -n "$OMDB_API_KEY" ]]; then
  PARAMETERS+=("OmdbApiKey=$OMDB_API_KEY")
fi

echo "==> Deploying stack '$STACK_NAME' in $REGION"
aws cloudformation deploy \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --template-file "$TEMP_TEMPLATE" \
  --no-fail-on-empty-changeset \
  --parameter-overrides "${PARAMETERS[@]}"

read_output() {
  aws cloudformation describe-stacks \
    --region "$REGION" \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" \
    --output text
}

BUCKET="$(read_output BucketName)"
DISTRIBUTION_ID="$(read_output DistributionId)"
SITE_URL="$(read_output SiteUrl)"
MOVIE_API_URL="$(read_output MovieApiEndpoint)"

[[ -n "$BUCKET" && "$BUCKET" != "None" ]] || {
  echo "Could not read the BucketName stack output." >&2
  exit 1
}

echo "==> Uploading app shell and unhashed assets"
aws s3 sync "$DIST/" "s3://$BUCKET/" \
  --region "$REGION" \
  --delete \
  --exclude "index.html" \
  --exclude "sw.js" \
  --exclude "registerSW.js" \
  --exclude "manifest.webmanifest" \
  --exclude "assets/*" \
  --cache-control "public, max-age=86400"

echo "==> Uploading hashed assets (immutable)"
aws s3 sync "$DIST/assets/" "s3://$BUCKET/assets/" \
  --region "$REGION" \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

echo "==> Uploading no-cache entry points"
NO_CACHE="no-cache, no-store, must-revalidate"
for file in index.html sw.js registerSW.js; do
  if [[ -f "$DIST/$file" ]]; then
    case "$file" in
      *.html) CONTENT_TYPE="text/html; charset=utf-8" ;;
      *.js) CONTENT_TYPE="application/javascript; charset=utf-8" ;;
      *) CONTENT_TYPE="application/octet-stream" ;;
    esac
    aws s3 cp "$DIST/$file" "s3://$BUCKET/$file" \
      --region "$REGION" \
      --cache-control "$NO_CACHE" \
      --content-type "$CONTENT_TYPE"
  fi
done

aws s3 cp "$DIST/manifest.webmanifest" "s3://$BUCKET/manifest.webmanifest" \
  --region "$REGION" \
  --cache-control "$NO_CACHE" \
  --content-type "application/manifest+json"

echo "==> Invalidating CloudFront"
INVALIDATION_ID="$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)"

echo
echo "Deployed: $SITE_URL"
echo "Movie API: $MOVIE_API_URL"
echo "Bucket:   s3://$BUCKET"
echo "Invalidation: $INVALIDATION_ID (usually visible in a few minutes)"
