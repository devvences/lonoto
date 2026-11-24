export interface Note {
  id: string;
  title: string;
  /** Serialized Lexical editor state (JSON). */
  body: string;
  /** Plain-text projection of the body, kept for fast full-text search. */
  plain: string;
  tags: string[];
  pinned: boolean;
  /** Manual board position. Pinned notes always sort before unpinned ones. */
  order: number;
  createdAt: number;
  updatedAt: number;
}

export type TagMatchMode = 'all' | 'any';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
