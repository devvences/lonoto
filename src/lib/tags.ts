import type { Note } from '../types';

export interface TagStat {
  tag: string;
  count: number;
}

/**
 * System tag used to hide a note from the board without deleting it.
 * Notes carrying it live in the Done view and keep all their other tags.
 */
export const DONE_TAG = 'done';

export function isDoneTag(tag: string): boolean {
  return tag.trim().toLowerCase() === DONE_TAG;
}

export function isDoneNote(note: Note): boolean {
  return note.tags.some(isDoneTag);
}

/** Return `tags` with the done tag added or removed, leaving the rest intact. */
export function setDoneTag(tags: readonly string[], done: boolean): string[] {
  const rest = tags.filter((tag) => !isDoneTag(tag));
  return normalizeTags(done ? [...rest, DONE_TAG] : rest);
}

export function normalizeTag(raw: string): string {
  return raw
    .replace(/^#+/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 40)
    .toLowerCase();
}

export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = normalizeTag(raw);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }
  return result;
}

export function collectTagStats(notes: Note[]): TagStat[] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function filterByTags(
  note: Note,
  selected: string[],
  mode: 'all' | 'any',
): boolean {
  if (selected.length === 0) return true;
  if (mode === 'any') return selected.some((tag) => note.tags.includes(tag));
  return selected.every((tag) => note.tags.includes(tag));
}

const TAG_PALETTE = [
  '#ffb457',
  '#7fc8ff',
  '#7ee0b8',
  '#ff9db0',
  '#c4a7ff',
  '#f6d365',
  '#8fd3ff',
  '#ffb38a',
  '#9ee493',
  '#ffc2e2',
];

export function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  }
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
}
