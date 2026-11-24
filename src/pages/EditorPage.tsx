import {
  Alert,
  alpha,
  AppBar,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { $getRoot, type EditorState, type LexicalEditor } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { AutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import type { Note, SaveStatus } from '../types';
import { db, ensurePersistentStorage, topOrderForGroup } from '../db/db';
import { formatDate } from '../lib/time';
import {
  collectTagStats,
  isDoneTag,
  normalizeTags,
  setDoneTag,
} from '../lib/tags';
import { buildMovieNodes, isMovieTag, type MoviePayload } from '../lib/movie';
import { isContentlessNote } from '../lib/calendar';
import { isValidUrl } from '../lib/url';
import { NOTE_NODES } from '../editor/nodes';
import { lexicalTheme } from '../editor/lexical-theme';
import EditorToolbar from '../editor/EditorToolbar';
import CodeHighlightPlugin from '../editor/plugins/CodeHighlightPlugin';
import ImagesPlugin from '../editor/plugins/ImagesPlugin';
import { AUTO_LINK_MATCHERS } from '../editor/plugins/autoLinkMatchers';
import TagChip from '../components/TagChip';
import ConfirmDialog from '../components/ConfirmDialog';
import MovieLookupDialog from '../components/MovieLookupDialog';
import DateTagDialog from '../components/DateTagDialog';

function EditorRefPlugin({
  onReady,
}: {
  onReady: (editor: LexicalEditor) => void;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    onReady(editor);
  }, [editor, onReady]);
  return null;
}

interface Toast {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info';
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  // The calendar opens notes with { from: '/calendar' } so Back/Save returns
  // there instead of dumping the user on the board.
  const returnTo =
    typeof (location.state as { from?: unknown } | null)?.from === 'string' &&
    (location.state as { from: string }).from.startsWith('/')
      ? (location.state as { from: string }).from
      : '/';
  const returnLabel = returnTo === '/calendar' ? 'calendar' : 'board';

  const [note, setNote] = useState<Note | null | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [hasBody, setHasBody] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [movieOpen, setMovieOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [toast, setToast] = useState<Toast>({
    open: false,
    message: '',
    severity: 'info',
  });

  const noteRef = useRef<Note | null>(null);
  const pendingRef = useRef<Partial<Note>>({});
  const timerRef = useRef<number | undefined>(undefined);
  const deletedRef = useRef(false);
  const editorRef = useRef<LexicalEditor | null>(null);

  const notify = useCallback(
    (message: string, severity: Toast['severity'] = 'info') => {
      setToast({ open: true, message, severity });
    },
    [],
  );

  const allNotes = useLiveQuery(() => db.notes.toArray(), []);
  const allTags = useMemo(
    () =>
      collectTagStats(allNotes ?? [])
        .map((stat) => stat.tag)
        .filter((tag) => !isDoneTag(tag)),
    [allNotes],
  );

  useEffect(() => {
    let active = true;
    if (!id) {
      setNote(null);
      return;
    }
    setNote(undefined);
    void db.notes.get(id).then((found) => {
      if (!active) return;
      if (!found) {
        setNote(null);
        return;
      }
      noteRef.current = found;
      setNote(found);
      setTitle(found.title);
      setHasBody(Boolean(found.plain.trim()));
      setTags(found.tags);
      setPinned(found.pinned);
      setStatus('saved');
      setSavedAt(found.updatedAt);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const flush = useCallback(async (): Promise<'saved' | 'empty' | 'error'> => {
    const current = noteRef.current;
    if (!current) return 'empty';
    const patch = pendingRef.current;
    if (Object.keys(patch).length === 0) return 'empty';
    pendingRef.current = {};
    const next: Note = { ...current, ...patch, updatedAt: Date.now() };
    noteRef.current = next;
    try {
      await db.notes.put(next);
      setStatus('saved');
      setSavedAt(next.updatedAt);
      void ensurePersistentStorage();
      return 'saved';
    } catch (error) {
      pendingRef.current = { ...patch, ...pendingRef.current };
      setStatus('error');
      notify('Could not save this note. Check browser storage.', 'error');
      console.error('Could not save note', error);
      return 'error';
    }
  }, [notify]);

  const handleShortcutSave = useCallback(async () => {
    if (!noteRef.current) return;
    window.clearTimeout(timerRef.current);
    const result = await flush();
    if (result === 'saved') {
      notify('Note saved.', 'success');
    } else if (result === 'empty') {
      notify('All changes are already saved.', 'info');
    }
  }, [flush, notify]);

  const handleSaveAndClose = useCallback(async () => {
    const current = noteRef.current;
    if (!current) return;
    window.clearTimeout(timerRef.current);
    // A note with no title or body is not worth keeping, even if the calendar
    // added a date tag to it. Delete it instead of saving an empty card.
    if (isContentlessNote(current)) {
      deletedRef.current = true;
      noteRef.current = null;
      pendingRef.current = {};
      await db.notes.delete(current.id);
      navigate(returnTo);
      return;
    }
    const result = await flush();
    if (result === 'error') return;
    navigate(returnTo);
  }, [flush, navigate, returnTo]);

  const updateLocal = useCallback(
    (patch: Partial<Note>) => {
      const current = noteRef.current;
      if (!current) return;
      noteRef.current = { ...current, ...patch };
      pendingRef.current = { ...pendingRef.current, ...patch };
      setStatus('saving');
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void flush();
      }, 500);
    },
    [flush],
  );

  useEffect(() => {
    return () => {
      window.clearTimeout(timerRef.current);
      if (deletedRef.current) return;
      const current = noteRef.current;
      if (!current) return;
      if (isContentlessNote(current)) {
        deletedRef.current = true;
        noteRef.current = null;
        void db.notes.delete(current.id);
        return;
      }
      const pending = pendingRef.current;
      if (Object.keys(pending).length === 0) return;
      // Best-effort flush when navigating away.
      void db.notes.put({ ...current, ...pending, updatedAt: Date.now() });
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const current = noteRef.current;
      if (!current) return;
      if (isContentlessNote(current)) {
        void db.notes.delete(current.id);
        return;
      }
      const pending = pendingRef.current;
      if (Object.keys(pending).length > 0) {
        void db.notes.put({ ...current, ...pending, updatedAt: Date.now() });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void handleShortcutSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleShortcutSave]);

  useEffect(() => {
    document.title = title
      ? `${title} — My Workspace`
      : 'My Workspace — Notes';
    return () => {
      document.title = 'My Workspace — Notes';
    };
  }, [title]);

  const handleBodyChange = useCallback(
    (editorState: EditorState) => {
      const body = JSON.stringify(editorState.toJSON());
      const plain = editorState.read(() => $getRoot().getTextContent()).trim();
      const nextHasBody = plain.length > 0;
      setHasBody((previous) => (previous === nextHasBody ? previous : nextHasBody));
      updateLocal({ body, plain });
    },
    [updateLocal],
  );

  const handleTitleChange = (value: string) => {
    setTitle(value);
    updateLocal({ title: value });
  };

  const handleEditorReady = useCallback((editor: LexicalEditor) => {
    editorRef.current = editor;
  }, []);

  const handleTagsChange = (value: string[]) => {
    const next = normalizeTags(value);
    const hadMovie = tags.some(isMovieTag);
    const hasMovie = next.some(isMovieTag);
    setTags(next);
    updateLocal({ tags: next });
    if (!hadMovie && hasMovie) setMovieOpen(true);
  };

  const handleDateAdd = useCallback(
    (tag: string) => {
      const next = normalizeTags([...tags, tag]);
      setTags(next);
      updateLocal({ tags: next });
      notify('Date added. It will show up in the calendar.', 'success');
    },
    [notify, tags, updateLocal],
  );

  const handleMovieInsert = useCallback(
    async (payload: MoviePayload) => {
      const editor = editorRef.current;
      if (!editor) throw new Error('The editor is not ready yet. Try again.');
      editor.update(() => {
        $getRoot().splice(0, 0, buildMovieNodes(payload));
      });
      notify(
        payload.details.poster && !payload.posterDataUrl
          ? 'Movie info added. The poster could not be embedded, so it was skipped.'
          : 'Movie info added to the note.',
        payload.details.poster && !payload.posterDataUrl ? 'info' : 'success',
      );
    },
    [notify],
  );

  const togglePinned = () => {
    const next = !pinned;
    setPinned(next);
    updateLocal({ pinned: next });
    // Pinning moves the note to the top of its group on the board; unpinning
    // puts it at the top of the unpinned section.
    void topOrderForGroup(next).then((order) => {
      if (noteRef.current) updateLocal({ order });
    });
  };

  const toggleDone = () => {
    const wasDone = tags.some(isDoneTag);
    const movie = tags.some(isMovieTag);
    handleTagsChange(setDoneTag(tags, !wasDone));
    notify(
      wasDone
        ? 'Restored to the board.'
        : movie
          ? 'Marked as seen. It will be hidden from the board.'
          : 'Marked as done. It will be hidden from the board.',
      'success',
    );
  };

  const handleBack = async () => {
    const current = noteRef.current;
    if (current && isContentlessNote(current)) {
      window.clearTimeout(timerRef.current);
      deletedRef.current = true;
      noteRef.current = null;
      pendingRef.current = {};
      await db.notes.delete(current.id);
      navigate(returnTo);
      return;
    }
    await flush();
    navigate(returnTo);
  };

  const handleDelete = async () => {
    if (!note) return;
    deletedRef.current = true;
    window.clearTimeout(timerRef.current);
    pendingRef.current = {};
    noteRef.current = null;
    await db.notes.delete(note.id);
    navigate(returnTo, { replace: true });
  };

  const initialConfig = useMemo(
    () => ({
      namespace: 'note-editor',
      nodes: NOTE_NODES,
      theme: lexicalTheme,
      editorState: note?.body || undefined,
      onError: (error: Error) => {
        console.error('Lexical error', error);
      },
    }),
    // The composer is keyed by note id; only the initial body matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [note?.id],
  );

  const statusLabel =
    status === 'saving'
      ? 'Saving…'
      : status === 'error'
        ? 'Save failed'
        : 'Saved locally';

  const isDone = tags.some(isDoneTag);
  const doneActionLabel = isDone
    ? 'Restore to board'
    : tags.some(isMovieTag)
      ? 'Mark as seen'
      : 'Mark as done';

  return (
    <Box sx={{ minHeight: '100dvh' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: alpha(theme.palette.background.default, 0.82),
          backdropFilter: 'blur(18px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ minHeight: 64, gap: { xs: 0.5, sm: 1 }, px: { xs: 1, sm: 2 } }}>
          <Tooltip title={`Back to ${returnLabel} (saves automatically)`}>
            <IconButton
              aria-label={`Back to ${returnLabel}`}
              onClick={() => void handleBack()}
            >
              <ArrowBackRoundedIcon />
            </IconButton>
          </Tooltip>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', lineHeight: 1.1 }}
            >
              Note
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 650, lineHeight: 1.2 }}
              noWrap
            >
              {title || 'Untitled note'}
            </Typography>
          </Box>

          <Tooltip
            title={
              savedAt
                ? `Last saved ${new Date(savedAt).toLocaleTimeString()}`
                : 'Changes save automatically'
            }
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.6}
              sx={{
                display: { xs: 'none', sm: 'flex' },
                color: status === 'error' ? 'error.main' : 'text.secondary',
              }}
            >
              {status === 'saving' ? (
                <CircularProgress size={13} color="inherit" />
              ) : status === 'error' ? (
                <ErrorOutlineRoundedIcon sx={{ fontSize: 17 }} />
              ) : (
                <CloudDoneOutlinedIcon sx={{ fontSize: 18, color: 'success.main' }} />
              )}
              <Typography
                variant="caption"
                sx={{ display: { xs: 'none', sm: 'block' }, whiteSpace: 'nowrap' }}
              >
                {statusLabel}
              </Typography>
            </Stack>
          </Tooltip>

          <Tooltip title={`Save and return to ${returnLabel}`}>
            <Button
              variant="contained"
              size="small"
              aria-label={`Save note and return to ${returnLabel}`}
              onClick={() => void handleSaveAndClose()}
              disabled={!note}
              startIcon={<SaveRoundedIcon sx={{ fontSize: 18 }} />}
              sx={{
                flex: '0 0 auto',
                minWidth: { xs: 52, sm: 0 },
                minHeight: 40,
                px: { xs: 1.25, sm: 1.75 },
                ml: 0.25,
                whiteSpace: 'nowrap',
                '& .MuiButton-startIcon': {
                  display: { xs: 'none', sm: 'inline-flex' },
                  mr: 0.75,
                },
              }}
            >
              Save
            </Button>
          </Tooltip>

          <Tooltip title={pinned ? 'Unpin note' : 'Pin note'}>
            <IconButton
              aria-label={pinned ? 'Unpin note' : 'Pin note'}
              onClick={togglePinned}
              sx={{ color: pinned ? 'primary.main' : 'text.secondary' }}
            >
              <PushPinOutlinedIcon
                sx={{ transform: pinned ? 'rotate(0deg)' : 'rotate(35deg)' }}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title={doneActionLabel}>
            <IconButton
              aria-label={doneActionLabel}
              aria-pressed={isDone}
              onClick={toggleDone}
              sx={{ color: isDone ? 'success.main' : 'text.secondary' }}
            >
              {isDone ? (
                <RestoreRoundedIcon />
              ) : tags.some(isMovieTag) ? (
                <VisibilityOutlinedIcon />
              ) : (
                <TaskAltRoundedIcon />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete note">
            <IconButton
              aria-label="Delete note"
              onClick={() => setDeleteOpen(true)}
              sx={{ color: 'text.secondary' }}
            >
              <DeleteOutlineRoundedIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="md"
        sx={{ pt: { xs: 3, md: 4 }, pb: { xs: 6, md: 10 } }}
      >
        {note === undefined ? (
          <Box>
            <Skeleton variant="text" width="55%" height={64} />
            <Skeleton variant="rounded" height={26} width="35%" sx={{ mt: 1 }} />
            <Skeleton
              variant="rounded"
              height={420}
              sx={{ mt: 3, borderRadius: 3 }}
            />
          </Box>
        ) : note === null ? (
          <Stack alignItems="center" spacing={2} sx={{ py: 12 }}>
            <Typography variant="h5" sx={{ fontWeight: 750 }}>
              Note not found
            </Typography>
            <Typography color="text.secondary">
              It may have been deleted from this browser.
            </Typography>
            <Button variant="contained" onClick={() => navigate(returnTo)}>
              Back to {returnLabel}
            </Button>
          </Stack>
        ) : (
          <>
            <TextField
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="Untitled note"
              variant="standard"
              fullWidth
              autoFocus={!title}
              slotProps={{ htmlInput: { 'aria-label': 'Note title' } }}
              InputProps={{ disableUnderline: true }}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: { xs: 32, sm: 40, md: 44 },
                  fontWeight: 850,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.15,
                  color: 'primary.main',
                  p: 0,
                },
                '& .MuiInputBase-input::placeholder': {
                  color: alpha(theme.palette.primary.main, 0.38),
                  opacity: 1,
                },
              }}
            />

            <Stack
              direction="row"
              spacing={1}
              alignItems="flex-start"
              sx={{ mt: 2, maxWidth: 720 }}
            >
              <Autocomplete
                multiple
                freeSolo
                options={allTags}
                value={tags}
                onChange={(_, value) =>
                  handleTagsChange(
                    value.filter(
                      (item): item is string => typeof item === 'string',
                    ),
                  )
                }
                renderTags={(value, getTagProps) =>
                  value.map((tag, index) => {
                    const { key, onDelete } = getTagProps({ index });
                    return (
                      <TagChip key={key} tag={tag} onDelete={onDelete} />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    size="small"
                    placeholder={
                      tags.length ? 'Add another tag…' : 'Add tags…'
                    }
                    slotProps={{
                      htmlInput: {
                        ...params.inputProps,
                        'aria-label': 'Tags',
                      },
                    }}
                  />
                )}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 999,
                    bgcolor: alpha(theme.palette.text.primary, 0.03),
                    py: 0.35,
                  },
                  '& .MuiAutocomplete-input': { fontSize: 14 },
                }}
              />
              <Button
                variant="outlined"
                aria-label="Add date"
                onClick={() => setDateOpen(true)}
                startIcon={<EventOutlinedIcon />}
                sx={{
                  flex: '0 0 auto',
                  minHeight: 40,
                  borderRadius: 999,
                  px: { xs: 1.25, sm: 1.75 },
                  whiteSpace: 'nowrap',
                  '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.75 } },
                }}
              >
                <Box
                  component="span"
                  sx={{ display: { xs: 'none', sm: 'inline' } }}
                >
                  Add date
                </Box>
                <Box
                  component="span"
                  sx={{ display: { xs: 'inline', sm: 'none' } }}
                >
                  Date
                </Box>
              </Button>
            </Stack>

            <Paper
              elevation={0}
              sx={{
                mt: 3,
                p: { xs: 1.5, md: 2.5 },
                borderRadius: 3.5,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper',
              }}
            >
              <LexicalComposer key={note.id} initialConfig={initialConfig}>
                <EditorRefPlugin onReady={handleEditorReady} />
                <EditorToolbar onNotify={notify} />
                <Box
                  className="editor-shell"
                  sx={{
                    '--note-accent': theme.palette.primary.main,
                    '--note-check-border': alpha(
                      theme.palette.text.primary,
                      0.42,
                    ),
                  }}
                >
                  <RichTextPlugin
                    contentEditable={
                      <ContentEditable
                        className="note-content editor-content"
                        aria-label="Note body"
                      />
                    }
                    placeholder={
                      <div className="editor-placeholder">
                        Start writing… Use the toolbar for checklists, code,
                        images and links.
                      </div>
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                  />
                  <OnChangePlugin
                    onChange={handleBodyChange}
                    ignoreSelectionChange
                  />
                  <HistoryPlugin />
                  <ListPlugin />
                  <CheckListPlugin />
                  <LinkPlugin validateUrl={isValidUrl} />
                  <AutoLinkPlugin matchers={AUTO_LINK_MATCHERS} />
                  <CodeHighlightPlugin />
                  <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
                  <TabIndentationPlugin />
                  <ImagesPlugin
                    onError={(message) => notify(message, 'error')}
                  />
                </Box>
              </LexicalComposer>
            </Paper>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={0.75}
              sx={{ mt: 2, px: 0.5, color: 'text.secondary' }}
            >
              <Typography variant="caption">
                Created {formatDate(note.createdAt)} ·{' '}
                {!title.trim() && !hasBody && tags.length === 0
                  ? 'Empty note'
                  : `${tags.length} ${tags.length === 1 ? 'tag' : 'tags'}`}
              </Typography>
              <Typography variant="caption">
                Autosaved in this browser · Back up from Settings
              </Typography>
            </Stack>
          </>
        )}
      </Container>

      <Snackbar
        open={toast.open}
        autoHideDuration={4500}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this note?"
        message="The note and its images will be removed from this browser. This cannot be undone."
        confirmLabel="Delete note"
        destructive
        onConfirm={() => void handleDelete()}
      />

      <MovieLookupDialog
        open={movieOpen}
        initialTitle={title}
        onClose={() => setMovieOpen(false)}
        onInsert={handleMovieInsert}
      />

      <DateTagDialog
        open={dateOpen}
        onClose={() => setDateOpen(false)}
        onAdd={handleDateAdd}
        existingTags={tags}
      />
    </Box>
  );
}
