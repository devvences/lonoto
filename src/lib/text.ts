import type { Note } from '../types';

/** Lowercase + strip accents so "día" matches "dia". */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function tokenize(query: string): string[] {
  return normalizeText(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function matchesSearch(note: Note, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const haystack = normalizeText(
    `${note.title}\n${note.plain}\n${note.tags.join(' ')}`,
  );
  return tokens.every((token) => haystack.includes(token));
}

export function isBlankNote(note: Note): boolean {
  return (
    !note.title.trim() && !note.plain.trim() && note.tags.length === 0
  );
}

export function excerpt(note: Note, max = 260): string {
  const text = note.plain.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
