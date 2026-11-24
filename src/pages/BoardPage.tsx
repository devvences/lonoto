import {
  Alert,
  alpha,
  Box,
  Button,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Note, TagMatchMode } from '../types';
import {
  cleanupBlankNotes,
  createNote,
  db,
  deleteNote,
  ORDER_STEP,
  saveBoardOrder,
  setPinned,
} from '../db/db';
import { seedSamples } from '../db/seed';
import { useOnlineStatus } from '../hooks/useEnvironment';
import { copyText } from '../lib/clipboard';
import {
  buildMovieBody,
  isMovieTag,
  type MoviePayload,
} from '../lib/movie';
import {
  collectTagStats,
  filterByTags,
  isDoneNote,
  isDoneTag,
  normalizeTags,
  setDoneTag,
} from '../lib/tags';
import { isContentlessNote } from '../lib/calendar';
import {
  matchesSearch,
  tokenize,
} from '../lib/text';
import Header from '../components/Header';
import MasonryGrid from '../components/MasonryGrid';
import TagDock from '../components/TagDock';
import NoteCard from '../components/NoteCard';
import SettingsDialog from '../components/SettingsDialog';
import MovieLookupDialog from '../components/MovieLookupDialog';
import DateTagDialog from '../components/DateTagDialog';
import ConfirmDialog from '../components/ConfirmDialog';

interface Toast {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info';
}

export default function BoardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const online = useOnlineStatus();
  const notes = useLiveQuery(() => db.notes.toArray(), []);

  const [query, setQuery] = useState('');
  // The tag filter lives in the URL so a filtered board can be bookmarked or
  // shared. Repeated `tag` params keep tags that contain commas unambiguous.
  const selectedTags = useMemo(
    () => normalizeTags(searchParams.getAll('tag')),
    [searchParams],
  );
  const matchMode: TagMatchMode =
    searchParams.get('match') === 'any' ? 'any' : 'all';
  const [doneView, setDoneView] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [movieTarget, setMovieTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [dateTarget, setDateTarget] = useState<{
    id: string;
    title: string;
    tags: string[];
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: 'before' | 'after';
  } | null>(null);
  const pointerCleanupRef = useRef<(() => void) | null>(null);
  const [toast, setToast] = useState<Toast>({
    open: false,
    message: '',
    severity: 'info',
  });
  const searchRef = useRef<HTMLInputElement>(null);

  const notify = useCallback(
    (message: string, severity: Toast['severity'] = 'info') => {
      setToast({ open: true, message, severity });
    },
    [],
  );

  const setTagFilters = useCallback(
    (tags: string[], mode: TagMatchMode) => {
      const next = new URLSearchParams(searchParams);
      next.delete('tag');
      for (const tag of normalizeTags(tags)) next.append('tag', tag);
      if (mode === 'any') {
        next.set('match', 'any');
      } else {
        next.delete('match');
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // Keep hand-written URLs tidy: normalize tag casing and drop a match value
  // that does not change the default behaviour.
  useEffect(() => {
    const rawTags = searchParams.getAll('tag');
    const normalized = normalizeTags(rawTags);
    const tagsDirty =
      normalized.length !== rawTags.length ||
      normalized.some((tag, index) => tag !== rawTags[index]);
    const match = searchParams.get('match');
    const matchDirty = match !== null && match !== 'any';
    if (!tagsDirty && !matchDirty) return;

    const next = new URLSearchParams(searchParams);
    next.delete('tag');
    for (const tag of normalized) next.append('tag', tag);
    if (match === 'any') {
      next.set('match', 'any');
    } else {
      next.delete('match');
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const boardUrl = `${location.pathname}${location.search}`;

  useEffect(() => {
    document.title = 'My Workspace — Notes';
    void cleanupBlankNotes();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const activeNotes = useMemo(
    () =>
      (notes ?? []).filter(
        (note) => !isContentlessNote(note) && !isDoneNote(note),
      ),
    [notes],
  );

  const doneNotes = useMemo(
    () =>
      (notes ?? []).filter(
        (note) => !isContentlessNote(note) && isDoneNote(note),
      ),
    [notes],
  );

  // The board and the Done view are two sides of the same list. The done tag
  // is a system tag, so it never appears in the tag dock or tag suggestions.
  const visibleNotes = doneView ? doneNotes : activeNotes;

  const tagStats = useMemo(
    () =>
      collectTagStats(visibleNotes).filter((stat) => !isDoneTag(stat.tag)),
    [visibleNotes],
  );
  const allTags = useMemo(
    () => tagStats.map((stat) => stat.tag),
    [tagStats],
  );

  const filteredNotes = useMemo(() => {
    const tokens = tokenize(query);
    const result = visibleNotes.filter(
      (note) =>
        matchesSearch(note, tokens) &&
        filterByTags(note, selectedTags, matchMode),
    );

    result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.order !== b.order) return a.order - b.order;
      return b.updatedAt - a.updatedAt;
    });

    return result;
  }, [visibleNotes, query, selectedTags, matchMode]);

  // Manual ordering only makes sense while the whole board is visible.
  const reorderEnabled =
    !doneView && !query.trim() && selectedTags.length === 0;

  const handleNewNote = async () => {
    try {
      await cleanupBlankNotes(0);
      const created = await createNote();
      navigate(`/n/${created.id}`, { state: { from: boardUrl } });
    } catch (error) {
      console.error('Could not create note', error);
      notify('Could not create a note. Is browser storage available?', 'error');
    }
  };

  const handleToggleTag = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((item) => item !== tag)
      : [...selectedTags, tag];
    setTagFilters(next, matchMode);
  };

  const clearFilters = () => {
    setQuery('');
    setTagFilters([], 'all');
  };

  const handleToggleDoneView = () => {
    setDoneView((value) => !value);
    // Filters belong to the view they were chosen in; start the other view
    // clean so the notes it contains are not hidden by stale filters.
    clearFilters();
  };

  const handleToggleDone = useCallback(
    async (note: Note) => {
      const done = note.tags.some(isDoneTag);
      try {
        await db.notes.update(note.id, {
          tags: setDoneTag(note.tags, !done),
        });
        if (done) {
          notify('Restored to the board.', 'success');
        } else {
          notify(
            note.tags.some(isMovieTag)
              ? 'Marked as seen. Find it in Done.'
              : 'Marked as done. Find it in Done.',
            'success',
          );
        }
      } catch (error) {
        console.error('Could not update the done tag', error);
        notify('Could not update that note.', 'error');
      }
    },
    [notify],
  );

  const handleDateAdd = useCallback(
    (tag: string) => {
      const target = dateTarget;
      if (!target) return;
      void (async () => {
        try {
          const latest = await db.notes.get(target.id);
          if (!latest) throw new Error('That note no longer exists.');
          await db.notes.update(target.id, {
            tags: normalizeTags([...latest.tags, tag]),
          });
          notify('Date added. It will show up in the calendar.', 'success');
        } catch (error) {
          console.error('Could not add the date tag', error);
          notify('Could not add that date.', 'error');
        } finally {
          setDateTarget(null);
        }
      })();
    },
    [dateTarget, notify],
  );

  const handleCopy = async (note: Note) => {
    const text = note.plain.trim();
    if (!text) {
      notify('This note has no text content to copy.', 'info');
      return;
    }
    const copied = await copyText(text);
    notify(
      copied ? 'Note content copied.' : 'Could not copy the note content.',
      copied ? 'success' : 'error',
    );
  };

  const handleContentChange = useCallback(
    async (id: string, body: string, plain: string) => {
      try {
        await db.notes.update(id, { body, plain });
      } catch (error) {
        console.error('Could not save the checklist change', error);
        notify('Could not save that change.', 'error');
      }
    },
    [notify],
  );

  const handleTagsChange = useCallback(
    async (id: string, tags: string[]) => {
      const next = normalizeTags(tags);
      try {
        const existing = await db.notes.get(id);
        await db.notes.update(id, { tags: next });
        const hadMovie = existing?.tags.some(isMovieTag) ?? false;
        const hasMovie = next.some(isMovieTag);
        if (existing && !hadMovie && hasMovie) {
          setMovieTarget({ id, title: existing.title });
        }
      } catch (error) {
        console.error('Could not save the tags', error);
        notify('Could not save those tags.', 'error');
      }
    },
    [notify],
  );

  const handleMovieInsert = useCallback(
    async (payload: MoviePayload) => {
      const target = movieTarget;
      if (!target) return;
      try {
        const latest = await db.notes.get(target.id);
        if (!latest) throw new Error('That note no longer exists.');
        const result = buildMovieBody(latest.body, payload);
        await db.notes.update(target.id, {
          body: result.body,
          plain: result.plain,
          updatedAt: Date.now(),
        });
        notify(
          payload.details.poster && !payload.posterDataUrl
            ? 'Movie info added. The poster could not be embedded, so it was skipped.'
            : 'Movie info added to the note.',
          payload.details.poster && !payload.posterDataUrl ? 'info' : 'success',
        );
      } catch (error) {
        console.error('Could not add movie info', error);
        notify(
          error instanceof Error
            ? error.message
            : 'Could not add the movie info.',
          'error',
        );
        throw error;
      }
    },
    [movieTarget, notify],
  );

  const handleTogglePin = async (note: Note) => {
    try {
      await setPinned(note.id, !note.pinned);
    } catch (error) {
      console.error('Could not pin note', error);
      notify('Could not update the pin.', 'error');
    }
  };

  /**
   * Move `sourceId` next to `targetId`, then persist the whole board order.
   * Pinned notes must stay above unpinned ones: dropping an unpinned note into
   * the pinned area pins it, and dropping a pinned note into the unpinned area
   * unpins it.
   */
  const commitReorder = useCallback(
    async (
      sourceId: string,
      targetId: string,
      position: 'before' | 'after',
    ) => {
      const base = filteredNotes;
      const fromIndex = base.findIndex((note) => note.id === sourceId);
      const targetIndex = base.findIndex((note) => note.id === targetId);
      if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return;

      const next = [...base];
      const [moved] = next.splice(fromIndex, 1);
      const insertAt = next.findIndex((note) => note.id === targetId);
      if (insertAt < 0) return;
      next.splice(position === 'after' ? insertAt + 1 : insertAt, 0, moved);

      const movedIndex = next.findIndex((note) => note.id === sourceId);
      const pinnedAfter = next
        .slice(movedIndex + 1)
        .some((note) => note.pinned);
      const unpinnedBefore = next
        .slice(0, movedIndex)
        .some((note) => !note.pinned);

      let pinned = moved.pinned;
      let message: string | null = null;
      if (!pinned && pinnedAfter) {
        pinned = true;
        message = 'Pinned this note to keep pinned notes at the top.';
      } else if (pinned && unpinnedBefore) {
        pinned = false;
        message = 'Unpinned this note because it now sits below pinned notes.';
      }

      const entries = next.map((note, index) => ({
        id: note.id,
        order: index * ORDER_STEP,
        pinned: note.id === sourceId ? pinned : note.pinned,
      }));

      try {
        await saveBoardOrder(entries);
        if (message) notify(message, 'info');
      } catch (error) {
        console.error('Could not save the note order', error);
        notify('Could not save the new note order.', 'error');
      }
    },
    [filteredNotes, notify],
  );

  const moveNoteBy = useCallback(
    (noteId: string, step: -1 | 1) => {
      if (!reorderEnabled) return;
      const index = filteredNotes.findIndex((note) => note.id === noteId);
      const targetIndex = index + step;
      if (index < 0 || targetIndex < 0 || targetIndex >= filteredNotes.length) {
        return;
      }
      const target = filteredNotes[targetIndex];
      void commitReorder(noteId, target.id, step < 0 ? 'before' : 'after');
    },
    [commitReorder, filteredNotes, reorderEnabled],
  );

  const handleReorderPointerDown = useCallback(
    (noteId: string, event: ReactPointerEvent<HTMLElement>) => {
      if (!reorderEnabled) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      pointerCleanupRef.current?.();

      const pointerId = event.pointerId;
      let currentTarget: { id: string; position: 'before' | 'after' } | null =
        null;

      setDraggingId(noteId);
      setDropTarget(null);
      document.body.classList.add('is-reordering');

      const resolveTarget = (clientX: number, clientY: number) => {
        const element = document.elementFromPoint(clientX, clientY);
        const card = element?.closest<HTMLElement>(
          '.note-card[data-note-id]',
        );
        const targetId = card?.dataset.noteId;
        if (!card || !targetId || targetId === noteId) return null;
        const rect = card.getBoundingClientRect();
        return {
          id: targetId,
          position: (clientY < rect.top + rect.height / 2
            ? 'before'
            : 'after') as 'before' | 'after',
        };
      };

      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        moveEvent.preventDefault();
        currentTarget = resolveTarget(moveEvent.clientX, moveEvent.clientY);
        setDropTarget((current) => {
          if (!currentTarget) return null;
          if (
            current?.id === currentTarget.id &&
            current.position === currentTarget.position
          ) {
            return current;
          }
          return currentTarget;
        });
        // Keep the board scrolling while dragging near the viewport edges.
        const margin = 72;
        if (moveEvent.clientY < margin) {
          window.scrollBy(0, -14);
        } else if (moveEvent.clientY > window.innerHeight - margin) {
          window.scrollBy(0, 14);
        }
      };

      const finish = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleCancel);
        window.removeEventListener('blur', handleCancel);
        document.body.classList.remove('is-reordering');
        pointerCleanupRef.current = null;
        setDraggingId(null);
        setDropTarget(null);
      };

      const handleUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId) return;
        const target =
          currentTarget ??
          resolveTarget(upEvent.clientX, upEvent.clientY);
        finish();
        if (target) {
          void commitReorder(noteId, target.id, target.position);
        }
      };

      const handleCancel = (cancelEvent: Event) => {
        if (
          cancelEvent instanceof PointerEvent &&
          cancelEvent.pointerId !== pointerId
        ) {
          return;
        }
        finish();
      };

      window.addEventListener('pointermove', handleMove, { passive: false });
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleCancel);
      window.addEventListener('blur', handleCancel);
      pointerCleanupRef.current = finish;
    },
    [commitReorder, reorderEnabled],
  );

  useEffect(() => {
    return () => pointerCleanupRef.current?.();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteNote(deleteTarget.id);
      notify('Note deleted.', 'success');
    } catch (error) {
      console.error('Could not delete note', error);
      notify('Could not delete that note.', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const added = await seedSamples();
      clearFilters();
      notify(
        added > 0
          ? `Added ${added} sample notes. Edit or delete them as you like.`
          : 'Sample notes are already in your workspace.',
        added > 0 ? 'success' : 'info',
      );
    } catch (error) {
      console.error('Could not add samples', error);
      notify('Could not add sample notes.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const loading = notes === undefined;

  return (
    <Box sx={{ minHeight: '100dvh', pb: '92px' }}>
      <Header
        query={query}
        onQueryChange={setQuery}
        totalCount={visibleNotes.length}
        filteredCount={filteredNotes.length}
        onOpenSettings={() => setSettingsOpen(true)}
        onNewNote={() => void handleNewNote()}
        searchRef={searchRef}
        online={online}
        doneCount={doneNotes.length}
        doneView={doneView}
        onToggleDoneView={handleToggleDoneView}
        onOpenCalendar={() => navigate('/calendar')}
      />

      <Box
        component="main"
        sx={{
          px: { xs: 1.5, sm: 2.5, md: 4 },
          pt: { xs: 2.5, md: 3.5 },
        }}
      >
        {doneView ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              mb: 2,
              px: { xs: 1.5, sm: 2 },
              py: 1.25,
              border: `1px solid ${theme.palette.divider}`,
              borderLeft: `3px solid ${theme.palette.primary.main}`,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.07),
            }}
          >
            <Inventory2OutlinedIcon
              sx={{ fontSize: 22, color: 'primary.main', flex: '0 0 auto' }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
                Done notes
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Hidden from the board. Restore a note to bring it back.
              </Typography>
            </Box>
            <Button
              size="small"
              startIcon={<ArrowBackRoundedIcon sx={{ fontSize: 17 }} />}
              onClick={handleToggleDoneView}
              sx={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}
            >
              Board
            </Button>
          </Box>
        ) : null}

        {loading ? (
          <MasonryGrid
            items={Array.from({ length: 6 }, (_, index) => index)}
            getKey={(index) => `skeleton-${index}`}
            renderItem={(index) => (
              <Skeleton
                variant="rectangular"
                height={190 + (index % 3) * 70}
                sx={{ borderRadius: 0 }}
              />
            )}
          />
        ) : visibleNotes.length === 0 ? (
          doneView ? (
            <Stack
              alignItems="center"
              spacing={2}
              sx={{ py: { xs: 8, md: 12 }, textAlign: 'center' }}
            >
              <Box
                sx={{
                  width: 74,
                  height: 74,
                  borderRadius: 4,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                }}
              >
                <Inventory2OutlinedIcon sx={{ fontSize: 36 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Nothing in Done
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 460 }}>
                Notes you mark as done or seen are kept here, hidden from the
                board. Mark a note from the board to clear it without deleting
                it.
              </Typography>
              <Button
                variant="contained"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={handleToggleDoneView}
              >
                Back to board
              </Button>
            </Stack>
          ) : doneNotes.length > 0 ? (
            <Stack
              alignItems="center"
              spacing={2}
              sx={{ py: { xs: 8, md: 12 }, textAlign: 'center' }}
            >
              <Box
                sx={{
                  width: 74,
                  height: 74,
                  borderRadius: 4,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'success.main',
                  bgcolor: alpha(theme.palette.success.main, 0.12),
                }}
              >
                <CheckCircleOutlineRoundedIcon sx={{ fontSize: 36 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Board is clear
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 460 }}>
                Every note is tucked away in Done. They are still saved and can
                be restored whenever you need them.
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.25}
                sx={{ pt: 1 }}
              >
                <Button
                  variant="contained"
                  startIcon={<AddRoundedIcon />}
                  onClick={() => void handleNewNote()}
                >
                  New note
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Inventory2OutlinedIcon />}
                  onClick={handleToggleDoneView}
                >
                  View done ({doneNotes.length})
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack
              alignItems="center"
              spacing={2}
              sx={{ py: { xs: 8, md: 12 }, textAlign: 'center' }}
            >
              <Box
                sx={{
                  width: 74,
                  height: 74,
                  borderRadius: 4,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                }}
              >
                <StickyNote2OutlinedIcon sx={{ fontSize: 36 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Your workspace is empty
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 460 }}>
                Capture recipes, tickets, snippets or anything else. Add tags to
                group notes, and use the toolbar for checklists, images, code and
                links.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ pt: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<AddRoundedIcon />}
                  onClick={() => void handleNewNote()}
                >
                  Create your first note
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AutoAwesomeOutlinedIcon />}
                  onClick={() => void handleSeed()}
                  disabled={seeding}
                >
                  {seeding ? 'Adding samples…' : 'Load sample notes'}
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
                Everything is saved in this browser and works offline.
              </Typography>
            </Stack>
          )
        ) : filteredNotes.length === 0 ? (
          <Stack
            alignItems="center"
            spacing={2}
            sx={{ py: { xs: 8, md: 12 }, textAlign: 'center' }}
          >
            <SearchOffRoundedIcon
              sx={{ fontSize: 54, color: 'text.secondary', opacity: 0.7 }}
            />
            <Typography variant="h5" sx={{ fontWeight: 750 }}>
              No notes match
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
              Try a different search, remove a tag filter, or switch the tag
              matching mode.
            </Typography>
            <Button variant="outlined" onClick={clearFilters}>
              Clear search and filters
            </Button>
          </Stack>
        ) : (
          <MasonryGrid
            items={filteredNotes}
            getKey={(note) => note.id}
            renderItem={(note) => (
              <NoteCard
                note={note}
                isTagSelected={(tag) => selectedTags.includes(tag)}
                onOpen={(noteId) =>
                  navigate(`/n/${noteId}`, { state: { from: boardUrl } })
                }
                onTagClick={handleToggleTag}
                onCopy={(item) => void handleCopy(item)}
                onDelete={setDeleteTarget}
                onTogglePin={(item) => void handleTogglePin(item)}
                onToggleDone={(item) => void handleToggleDone(item)}
                onAddDate={(item) =>
                  setDateTarget({
                    id: item.id,
                    title: item.title,
                    tags: item.tags,
                  })
                }
                onContentChange={handleContentChange}
                onTagsChange={(id, tags) => void handleTagsChange(id, tags)}
                allTags={allTags}
                drag={{
                  enabled: reorderEnabled,
                  dragging: draggingId === note.id,
                  dropPosition:
                    dropTarget?.id === note.id ? dropTarget.position : null,
                  onPointerDown: (event) =>
                    handleReorderPointerDown(note.id, event),
                  onMoveBy: (step) => moveNoteBy(note.id, step),
                }}
              />
            )}
          />
        )}
      </Box>

      <TagDock
        stats={tagStats}
        selected={selectedTags}
        mode={matchMode}
        totalCount={visibleNotes.length}
        filteredCount={filteredNotes.length}
        onToggle={handleToggleTag}
        onClear={() => setTagFilters([], 'all')}
        onModeChange={(mode) => setTagFilters(selectedTags, mode)}
      />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        notes={notes ?? []}
        notify={notify}
      />

      <MovieLookupDialog
        open={Boolean(movieTarget)}
        initialTitle={movieTarget?.title ?? ''}
        onClose={() => setMovieTarget(null)}
        onInsert={handleMovieInsert}
      />

      <DateTagDialog
        open={Boolean(dateTarget)}
        onClose={() => setDateTarget(null)}
        onAdd={handleDateAdd}
        existingTags={dateTarget?.tags ?? []}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete note?"
        message={
          deleteTarget
            ? `“${deleteTarget.title || 'Untitled note'}” will be removed from this browser. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete note"
        destructive
        onConfirm={() => void handleDelete()}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: { xs: 7, sm: 8 } }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((current) => ({ ...current, open: false }))}
          sx={{ borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

    </Box>
  );
}
