const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const DATE = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const DATE_TIME = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatRelative(timestamp: number): string {
  const diff = timestamp - Date.now();
  const abs = Math.abs(diff);

  if (abs < 45_000) return 'just now';
  if (abs < 3_600_000) {
    return RELATIVE.format(Math.round(diff / 60_000), 'minute');
  }
  if (abs < 86_400_000) {
    return RELATIVE.format(Math.round(diff / 3_600_000), 'hour');
  }
  if (abs < 7 * 86_400_000) {
    return RELATIVE.format(Math.round(diff / 86_400_000), 'day');
  }
  return DATE.format(timestamp);
}

export function formatDateTime(timestamp: number): string {
  return DATE_TIME.format(timestamp);
}

export function formatDate(timestamp: number): string {
  return DATE.format(timestamp);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : value >= 10 ? 0 : 1)} ${units[index]}`;
}
