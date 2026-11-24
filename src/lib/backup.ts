import type { Note } from '../types';
import { ORDER_STEP, db } from '../db/db';
import { uid } from './id';
import { normalizeTags } from './tags';

export interface BackupFile {
  app: 'my-workspace';
  version: 1;
  exportedAt: string;
  notes: Note[];
}

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
}

function plainFromSerialized(value: unknown): string {
  const chunks: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    if (typeof record.text === 'string') chunks.push(record.text);
    if (Array.isArray(record.children)) record.children.forEach(walk);
  };
  walk(value);
  return chunks.join('\n').trim();
}

function isSerializedEditorState(body: string): boolean {
  if (!body) return true;
  try {
    const parsed = JSON.parse(body) as { root?: unknown };
    return Boolean(parsed && typeof parsed === 'object' && parsed.root);
  } catch {
    return false;
  }
}

export function parseBackup(text: string): Note[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  const rawNotes =
    Array.isArray(data)
      ? data
      : data && typeof data === 'object' && Array.isArray((data as { notes?: unknown }).notes)
        ? (data as { notes: unknown[] }).notes
        : null;

  if (!rawNotes) {
    throw new Error('This does not look like a My Workspace backup.');
  }

  const notes: Note[] = [];
  rawNotes.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      throw new Error(`Note ${index + 1} is not an object.`);
    }
    const item = raw as Record<string, unknown>;
    const body = typeof item.body === 'string' ? item.body : '';
    if (!isSerializedEditorState(body)) {
      throw new Error(`Note ${index + 1} has a corrupt editor body.`);
    }
    const now = Date.now();
    const createdAt =
      typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
        ? item.createdAt
        : now;
    const updatedAt =
      typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt)
        ? item.updatedAt
        : createdAt;
    const title = typeof item.title === 'string' ? item.title : '';
    const plain =
      typeof item.plain === 'string' && item.plain
        ? item.plain
        : plainFromSerialized(body ? JSON.parse(body) : null);
    const tags = Array.isArray(item.tags)
      ? normalizeTags(item.tags.filter((tag): tag is string => typeof tag === 'string'))
      : [];

    notes.push({
      id:
        typeof item.id === 'string' && item.id.trim() ? item.id : uid(),
      title,
      body,
      plain,
      tags,
      pinned: item.pinned === true,
      order:
        typeof item.order === 'number' && Number.isFinite(item.order)
          ? item.order
          : Number.NaN,
      createdAt,
      updatedAt,
    });
  });

  // Backups written before manual ordering existed have no order values.
  // Recreate the old pinned-first, most-recently-updated order.
  if (notes.some((note) => !Number.isFinite(note.order))) {
    notes.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
    notes.forEach((note, index) => {
      note.order = index * ORDER_STEP;
    });
  }

  return notes;
}

export function downloadBackup(notes: Note[]): void {
  const payload: BackupFile = {
    app: 'my-workspace',
    version: 1,
    exportedAt: new Date().toISOString(),
    notes,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `my-workspace-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function importBackup(
  notes: Note[],
  mode: ImportMode,
): Promise<ImportResult> {
  const result: ImportResult = { added: 0, updated: 0, skipped: 0 };

  await db.transaction('rw', db.notes, async () => {
    if (mode === 'replace') {
      await db.notes.clear();
    }

    for (const note of notes) {
      const existing = mode === 'merge' ? await db.notes.get(note.id) : undefined;
      if (existing) {
        if (existing.updatedAt >= note.updatedAt) {
          result.skipped += 1;
          continue;
        }
        await db.notes.put(note);
        result.updated += 1;
      } else {
        await db.notes.put(note);
        result.added += 1;
      }
    }
  });

  return result;
}
