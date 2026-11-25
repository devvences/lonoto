# My Workspace

An offline-first personal notes app. Notes live in your browser, the app installs
as a PWA, and the static build can be hosted on the AWS free tier.

The interface is a dark navy masonry board with amber headings, a tag dock at the
bottom, and a rich-text editor built on Lexical.

## Features

- **Rich notes** — headings, paragraphs, quotes, bold/italic/underline/strike,
  inline code, bulleted/numbered/check lists, links, code blocks with syntax
  highlighting, and images.
- **Images** — upload, paste, or drag and drop. Images are downscaled and
  compressed to WebP/JPEG data URLs, then embedded in the note so a note is
  fully self-contained.
- **Editing** — changes autosave after a short pause. The editor header has an
  explicit **Save** button that saves immediately and returns to the board;
  `Ctrl/Cmd + S` saves in place and confirms it. The back button also saves any
  pending change before returning.
- **Tags** — add as many tags as you like per note. The board filters by several
  tags at once (match all or any) and shows live counts per tag. The tag dock at
  the bottom keeps one compact row; when it overflows, the **Tags (n)** button
  expands it into a wrapped list so every tag is visible at once. Selected tags
  live in the URL (`?tag=movie&tag=important`, plus `match=any` for either-or),
  so a filtered board can be bookmarked or shared and survives opening a note.
- **Dates and calendar** — add a date with the dashed **Date** chip on any card
  or **Add date** in the editor. A date becomes a normal tag in one of these
  formats: `2026-11-02` (all day), `2026-11-02t17:00` (with a time), or a
  period such as `2026-11-02..2026-11-05` and
  `2026-11-02t09:00..2026-11-02t11:00`. Use the **Period** switch in the date
  dialog to enter a start and end. Periods appear on every day they cover;
  timed periods show the start time on the first day, the end time on the last
  day, and “Ongoing” in between. Tags are matched case-insensitively, so
  existing tags such as `2026-11-02T17:00` work too. In the editor, click an
  existing date tag to change its date, add a time, or turn it into a period;
  the tag is updated in place instead of being removed and re-added. The
  calendar button in the header opens a month view; each day shows its
  dated notes as chips with times, and clicking a day lists everything on it,
  lets you open a note, or start a new note already tagged with that day. Done
  notes stay visible on the calendar with a check mark. Notes opened from the
  calendar return there when you go back or save. A note with no title or body
  is discarded instead of being saved, so opening a day and changing your mind
  does not leave a blank card behind.
- **Movie info** — add the `movie` tag to a note and the app offers to fill it
  with the poster, IMDb rating, year, runtime, genre, director, cast, and a short
  plot. Search uses OMDb through this app's server-side proxy, so the OMDb API
  key is configured on the server and never sent to the browser. Posters are
  downloaded and embedded as data URLs, so the note stays self-contained and
  keeps working offline afterwards. Once watched, **Mark as seen** moves the
  note to Done without deleting it.
- **Done / seen** — use the check button in each card's top-right corner (or the
  eye on a movie note) to mark it done. This button stays visible all the time.
  The note gets the `done` tag and disappears from the
  board, but is not deleted. The archive button in the header opens the Done
  view, where every done note can be read, edited, or restored to the board.
  Done notes keep their content, other tags, and pin state; `done` is a system
  tag and is not offered as a normal tag filter or suggestion. Any note that
  already has the `done` tag is treated the same way.
- **Search** — searches titles, note text, and tags, ignoring case and accents.
- **Board** — masonry layout that shows every note in full. The done/seen button
  stays visible in each card's top-right corner; hover a card for edit, copy
  content, delete, and pin. Checklists can be ticked right on the board. A note that contains only a checklist gets an inline add-item row, and
  any card with ticked items offers **Uncheck all**; both sit directly under the
  checklist. Tags can be added and
  removed inline: use the dashed **Add tag** chip
  for a quick suggestion-backed input, or the `x` on a tag to remove it. Click
  an image on a card to open it enlarged, or use the expand button in the
  top-right of a code block; the code view has a copy button. Drag the grip at
  the top-left of a card to reorder it; the order is saved, and moving a note
  above the pinned notes pins it automatically.
  Reordering is available while the full board is visible (no search or tag
  filter). Pinned notes stay on top and get an accent strip, a soft warm wash,
  and a deeper shadow; the rest are flat.
- **Offline** — the app shell and every static asset are precached by a service
  worker. Notes are stored in IndexedDB, so creating, editing, and reading notes
  works with no network at all.
- **Backup** — export every note (including embedded images) to a JSON file and
  import it again from Settings. Import merges by note id.
- **Themes** — dark, light, or follow the system preference.
- **Installable** — add to the home screen / desktop from the browser. Updates
  are offered in-app instead of reloading underneath you.

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript, Material UI v7 |
| Editor | Lexical 0.38 with lists, check lists, links, code, images |
| Storage | Dexie 4 over IndexedDB |
| Build | Vite 6 |
| Offline | `vite-plugin-pwa` / Workbox |
| Routing | React Router `HashRouter` (no server rewrites required) |
| Movie lookup | Server-side OMDb proxy (local Node server / AWS Lambda) |
| Hosting | Private S3 + CloudFront with Origin Access Control |

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local   # then set OMDB_API_KEY
npm run dev          # http://localhost:5173
```

`npm run dev` starts Vite and the local movie API proxy together. The proxy
reads `OMDB_API_KEY` from `.env.local`; it never reaches the browser. Use
`npm run dev:web` or `npm run dev:api` to run only one half.

Other scripts:

```bash
npm run typecheck    # TypeScript, no emit
npm run build        # typecheck + production build into dist/
npm run preview      # serve dist/ at http://localhost:4173
npm run icons        # regenerate the PNG app icons
npm run deploy       # build + deploy to AWS (see below)
```

Use **Settings → Load sample notes** on an empty board to see example content.

## Data, privacy, and backups

- Notes are stored only in this browser profile, in the `my-workspace` IndexedDB
  database. The only outbound request is the optional movie lookup: the title
  you search goes to this app's `/api/movies` endpoint, which adds the
  server-side OMDb key and forwards it to OMDb. The poster is downloaded from
  Amazon's image host. The key is never included in the static build, local
  storage, or any browser response.
- There is no account and no sync between devices. Use **Settings → Export** to
  move notes between browsers or keep a backup.
- Clearing site data, using a private window, or resetting the browser profile
  removes the notes. Export regularly if the notes matter.
- Images are embedded in the note JSON, so large photo collections make the
  database and backup files large. Uploads are resized to a maximum edge of
  1600 px and compressed (WebP, falling back to JPEG), or kept as-is when the
  original is already smaller; files over 25 MB are rejected.
- The app asks the browser for persistent storage, but the browser may still
  evict data under storage pressure. Exports are the reliable backup.

## Offline behaviour

The production build registers a Workbox service worker that precaches the app
shell. On the first online visit the app becomes available offline; later visits
load from the cache even when the network is down.

When a new deployment is detected, a snackbar offers **Reload**. The old version
keeps working until you accept the update.

Movie lookup is the one feature that needs a connection. Once the movie info is
added, the poster is embedded in the note and everything works offline again.
Static-only builds (GitHub Pages) disable movie lookup entirely; see
[Deploy to GitHub Pages](#deploy-to-github-pages-static-only).

The service worker is only active in a production build (`npm run build` +
`npm run preview` or a deployed site), not in `npm run dev`.

## Deploy to AWS (free tier)

The included template creates:

- a private S3 bucket with public access blocked and AES-256 encryption;
- a CloudFront distribution using Origin Access Control (no public bucket, no
  legacy origin access identity);
- a cache policy and a response headers policy (HSTS, CSP, frame denial,
  referrer policy, content-type protection);
- a Lambda function URL and an `/api/*` CloudFront behavior for the movie
  lookup proxy, with the OMDb key stored only in the Lambda environment;
- SPA error handling that serves `index.html` for 403/404 responses.

The static app and movie API fit comfortably inside the AWS free tier for
typical personal use. Notes never go to AWS; only movie searches reach the
proxy.

### Prerequisites

1. AWS CLI v2 installed and authenticated (`aws sts get-caller-identity`).
2. Permission to manage CloudFormation, S3, CloudFront, Lambda, IAM, and
   CloudFront policies in the target account.
3. Node.js 20+.
4. An OMDb API key for movie lookup. Put it in `.env.local` as
   `OMDB_API_KEY=…`; the deploy script reads that file. Without a key the app
   deploys normally but movie lookup returns “not configured”.

### Deploy

```bash
cp .env.example .env.local   # set OMDB_API_KEY
npm run deploy
# or
./scripts/deploy.sh --stack my-workspace --region us-east-1
```

The script builds the app, renders the movie proxy into the stack template,
creates or updates the stack, uploads files with long-lived caching for hashed
assets and no-cache headers for `index.html`, `sw.js`, and the web manifest,
then invalidates CloudFront. It prints the public `https://….cloudfront.net`
URL and the movie API endpoint at the end.

The deploy script generates a random shared secret and configures CloudFront to
send it to the Lambda function URL. The browser cannot call the function URL
directly without that secret, and the OMDb key never leaves the Lambda
environment.

Useful flags:

```bash
./scripts/deploy.sh --skip-build          # reuse the existing dist/
./scripts/deploy.sh --price-class PriceClass_100
STACK_NAME=notes AWS_REGION=eu-west-1 ./scripts/deploy.sh
OMDB_API_KEY=… MOVIE_ORIGIN_SECRET=… ./scripts/deploy.sh
```

### Movie lookup API

The app calls `GET /api/movies?query=Inception` for search and
`GET /api/movies?id=tt1375666` for details. `server/movies.cjs` is the whole
proxy: it validates the request, adds the server-side key, calls OMDb, and
returns normalized JSON. The same file runs locally and inside Lambda.

The Lambda receives `OMDB_API_KEY` and `MOVIE_ORIGIN_SECRET` as environment
variables. CloudFront forwards `/api/*` without caching and adds the secret
header; requests that bypass CloudFront are rejected.

### Custom domain

The template uses the default CloudFront certificate. For a custom domain, add
an ACM certificate in `us-east-1`, set `Aliases` and `ViewerCertificate` on the
distribution, and point Route 53 (or your DNS provider) at the distribution.
ACM public certificates are free; a Route 53 hosted zone is not.

### Costs to watch

- CloudFront has a perpetual free tier (1 TB transfer and 10 million requests per
  month at the time of writing). A personal notes app will not approach it.
- S3 storage for the static build is a few megabytes. Note data is not uploaded.
- Lambda and function URLs have a monthly free tier; a personal notes app will
  not approach it. Movie searches are the only invocations.
- The first 1,000 invalidation paths per month are free; the deploy script uses
  one wildcard path per deployment.
- CloudFront request pricing varies by region; `PriceClass_100` keeps edges to
  North America and Europe.

### Tear down

CloudFormation cannot delete a non-empty bucket, so empty it first:

```bash
aws s3 rm s3://<BucketName> --recursive
aws cloudformation delete-stack --stack-name my-workspace --region us-east-1
```

`BucketName` is printed by the deploy script and available in the stack outputs.

## Deploy to GitHub Pages (static only)

GitHub Pages can host the frontend but cannot run the Node movie proxy. The
included workflow (`.github/workflows/deploy-pages.yml`) builds the app for the
project Pages URL and turns movie lookup off, so everything else — notes,
tags, images, calendar, backups, and offline use — works normally.

1. Push the repository to GitHub.
2. Open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually). The site is published at
   `https://<user>.github.io/<repo>/` — for this repository,
   `https://devvences.github.io/lonoto/`.

The workflow builds with:

```bash
VITE_BASE_PATH=/lonoto/ VITE_ENABLE_MOVIE_LOOKUP=false npm run build
```

- `VITE_BASE_PATH` sets Vite's `base` (and the PWA manifest `start_url`/`scope`)
  to the project subpath. It must match the repository name.
- `VITE_ENABLE_MOVIE_LOOKUP=false` hides the movie dialog and shows an
  informational message if the `movie` tag is added. Notes and their `movie`
  tag still work; only the automatic details/poster lookup is skipped.
- The workflow writes `dist/.nojekyll` so GitHub Pages serves Vite's files
  without Jekyll processing.

Hash routing (`#/…`) means no SPA 404 rewrites are needed. The same build works
on any static host; set `VITE_BASE_PATH` only when the site is not served from
the domain root.

## Hosting elsewhere

The build is a plain static site. Any static host works as long as it serves
`index.html` for unknown paths; hash routing means deep links are handled
client-side anyway. Set the site root to `dist/`.

Movie lookup needs a same-origin `/api/movies` endpoint. Run `server/dev.cjs`
behind a reverse proxy on that path (with `OMDB_API_KEY` in its environment), or
adapt `server/movies.cjs` to your serverless platform. Without the endpoint the
rest of the app still works; the movie dialog reports that lookup is not
configured.

## Project structure

```
src/
  components/       Board header, search, masonry grid, note cards, dialogs
  db/               Dexie schema, note helpers, sample notes
  editor/           Lexical nodes, plugins, toolbar, theme
  lib/              Search, tags, URLs, images, backups, movie API client
  pages/            BoardPage, EditorPage, CalendarPage
  App.tsx           Routes, lazy editor loading, PWA update UI
  theme.ts          MUI theme and light/dark palettes
  styles.css        Masonry, note content, code, checklist, image styles
server/             OMDb proxy shared by local dev and Lambda
infra/template.yaml CloudFormation: S3 + CloudFront + OAC + movie API
scripts/deploy.sh   Build, render Lambda, deploy, sync, invalidate
scripts/dev.mjs     Start Vite and the local movie API together
public/             Icons and favicon
```

## Keyboard shortcuts

- `Ctrl/Cmd + S` — save immediately without leaving the editor (autosave
  already runs after 500 ms).
- `Ctrl/Cmd + B/I/U` — bold, italic, underline.
- `/` on the board — focus search.
- Markdown shortcuts in the editor — `#`, `-`, `1.`, `>`, `[ ]`, and fenced
  code blocks.
# lonoto
