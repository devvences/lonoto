const ALLOWED_PROTOCOL = /^(https?:|mailto:|tel:)/i;

export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('#')) return trimmed;
  if (ALLOWED_PROTOCOL.test(trimmed)) return trimmed;
  // Bare domains like example.com/path
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

export function isValidUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('#')) return true;
  if (!ALLOWED_PROTOCOL.test(url)) return false;
  if (url.startsWith('mailto:') || url.startsWith('tel:')) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
