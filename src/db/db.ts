import Dexie, { type EntityTable } from 'dexie';
import type { Note } from '../types';
import { uid } from '../lib/id';
import { isContentlessNote } from '../lib/calendar';

/** Spacing between manual board positions, so one can be inserted in between. */
export const ORDER_STEP = 1000;

class WorkspaceDatabase extends Dexie {
  notes!: EntityTable<Note, 'id'>;

  constructor() {
    super('my-workspace');
    this.version(1).stores({
      notes: 'id, updatedAt, createdAt, pinned, *tags',
    });
    // v2 adds a manual board position. Existing notes are seeded from the old
    // pinned-first, most-recently-updated order so nothing appears to move.
    this.version(2)
      .stores({
        notes: 'id, updatedAt, createdAt, pinned, order, *tags',
      })
      .upgrade(async (tx) => {
        const table = tx.table<Note, string>('notes');
        const all = await table.toArray();
        all.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return b.updatedAt - a.updatedAt;
        });
        await Promise.all(
          all.map((note, index) =>
            table.update(note.id, { order: index * ORDER_STEP }),
          ),
        );
      });
  }
}

export const db = new WorkspaceDatabase();

export function emptyNote(): Note {
  const now = Date.now();
  return {
    id: uid(),
    title: '',
    body: '',
    plain: '',
    tags: [],
    pinned: false,
    order: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Position that puts a note at the top of its pinned/unpinned group.
 * Pinned notes are always rendered before unpinned ones, so the two groups can
 * safely reuse order values.
 */
export async function topOrderForGroup(pinned: boolean): Promise<number> {
  const group = await db.notes.filter((note) => note.pinned === pinned).toArray();
  if (group.length === 0) return 0;
  return Math.min(...group.map((note) => note.order ?? 0)) - ORDER_STEP;
}

export async function createNote(partial: Partial<Note> = {}): Promise<Note> {
  const order = await topOrderForGroup(false);
  const note: Note = { ...emptyNote(), order, ...partial };
  await db.notes.add(note);
  return note;
}

export async function saveNote(note: Note): Promise<void> {
  await db.notes.put(note);
}

export async function setPinned(id: string, pinned: boolean): Promise<void> {
  const order = await topOrderForGroup(pinned);
  await db.notes.update(id, { pinned, order, updatedAt: Date.now() });
}

export interface BoardOrderEntry {
  id: string;
  order: number;
  pinned: boolean;
}

/** Persist a complete manual board order in one transaction. */
export async function saveBoardOrder(entries: BoardOrderEntry[]): Promise<void> {
  if (entries.length === 0) return;
  await db.notes.bulkUpdate(
    entries.map((entry) => ({
      key: entry.id,
      changes: { order: entry.order, pinned: entry.pinned },
    })),
  );
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id);
}

export async function cleanupBlankNotes(
  olderThanMs = 60 * 60 * 1000,
): Promise<number> {
  const cutoff = Date.now() - olderThanMs;
  const blanks = await db.notes
    .filter((note) => isContentlessNote(note) && note.updatedAt < cutoff)
    .toArray();
  if (blanks.length > 0) {
    await db.notes.bulkDelete(blanks.map((note) => note.id));
  }
  return blanks.length;
}

let persistenceRequested = false;

/**
 * Ask the browser to keep IndexedDB around. Best-effort: browsers may ignore
 * the request (and may need a user gesture first).
 */
export async function ensurePersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    if (persistenceRequested) return false;
    persistenceRequested = true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
