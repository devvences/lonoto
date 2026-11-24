import {
  alpha,
  Autocomplete,
  Box,
  Card,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { Note } from '../types';
import { formatDateTime, formatRelative } from '../lib/time';
import { isDoneTag, normalizeTags } from '../lib/tags';
import { isMovieTag } from '../lib/movie';
import NotePreview from './NotePreview';
import TagChip from './TagChip';

export interface NoteDragConfig {
  enabled: boolean;
  dragging: boolean;
  dropPosition: 'before' | 'after' | null;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onMoveBy: (step: -1 | 1) => void;
}

interface NoteCardProps {
  note: Note;
  isTagSelected: (tag: string) => boolean;
  onOpen: (id: string) => void;
  onTagClick: (tag: string) => void;
  onCopy: (note: Note) => void;
  onDelete: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onToggleDone: (note: Note) => void;
  onAddDate: (note: Note) => void;
  onContentChange: (id: string, body: string, plain: string) => void;
  onTagsChange: (id: string, tags: string[]) => void;
  allTags: string[];
  drag?: NoteDragConfig;
}

const actionButtonSx = {
  width: 26,
  height: 26,
  color: 'text.secondary',
  '& svg': { fontSize: 16 },
};

export default function NoteCard({
  note,
  isTagSelected,
  onOpen,
  onTagClick,
  onCopy,
  onDelete,
  onTogglePin,
  onToggleDone,
  onAddDate,
  onContentChange,
  onTagsChange,
  allTags,
  drag,
}: NoteCardProps) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const accent = theme.palette.primary.main;
  const done = note.tags.some(isDoneTag);
  const movie = note.tags.some(isMovieTag);
  const doneLabel = done
    ? 'Restore to board'
    : movie
      ? 'Mark as seen'
      : 'Mark as done';

  const addChipSx = {
    border: '1px dashed',
    borderColor: alpha(theme.palette.text.primary, 0.24),
    bgcolor: 'transparent',
    color: 'text.secondary',
    fontWeight: 500,
    '& .MuiChip-icon': { color: 'text.disabled' },
    '&:hover': {
      borderColor: alpha(accent, 0.65),
      bgcolor: alpha(accent, 0.08),
      color: 'primary.main',
      '& .MuiChip-icon': { color: 'primary.main' },
    },
  };

  const handleContentChange = useCallback(
    (body: string, plain: string) => onContentChange(note.id, body, plain),
    [note.id, onContentChange],
  );

  const availableTags = useMemo(
    () => allTags.filter((tag) => !note.tags.includes(tag)),
    [allTags, note.tags],
  );

  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const tagEditorRef = useRef<HTMLDivElement>(null);

  const closeTagEditor = useCallback(() => {
    setAddingTag(false);
    setTagDraft('');
  }, []);

  useEffect(() => {
    if (!addingTag) return;
    tagEditorRef.current?.querySelector('input')?.focus();
  }, [addingTag]);

  const handleTagsChange = useCallback(
    (value: string[]) => onTagsChange(note.id, normalizeTags(value)),
    [note.id, onTagsChange],
  );

  return (
    <Card
      component="article"
      className={`note-card${drag?.dragging ? ' is-dragging' : ''}`}
      data-note-id={note.id}
      aria-label={note.title || 'Untitled note'}
      sx={{
        position: 'relative',
        borderRadius: 0,
        border: `1px solid ${
          note.pinned ? alpha(accent, 0.42) : theme.palette.divider
        }`,
        bgcolor: note.pinned
          ? alpha(accent, dark ? 0.055 : 0.04)
          : 'background.paper',
        // Pinned notes get a soft accent wash behind the header; normal notes
        // stay flat and neutral so the board reads calm at a glance.
        backgroundImage: note.pinned
          ? `linear-gradient(180deg, ${alpha(
              accent,
              dark ? 0.16 : 0.11,
            )} 0, transparent 110px)`
          : 'none',
        overflow: 'visible',
        boxShadow: note.pinned
          ? dark
            ? '0 18px 40px rgba(0,0,0,0.34)'
            : '0 18px 38px rgba(150,90,10,0.16), 0 2px 6px rgba(30,40,60,0.05)'
          : dark
            ? '0 6px 18px rgba(0,0,0,0.16)'
            : '0 4px 14px rgba(30,40,60,0.055)',
        transition:
          'border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease',
        // Thin accent strip along the top edge, like a tab on a pinned card.
        '&::before': note.pinned
          ? {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              pointerEvents: 'none',
              background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${accent} 45%, ${theme.palette.primary.light})`,
            }
          : undefined,
        '&:hover': {
          borderColor: alpha(accent, 0.52),
          boxShadow: note.pinned
            ? dark
              ? '0 24px 52px rgba(0,0,0,0.44)'
              : '0 24px 48px rgba(150,90,10,0.22), 0 3px 8px rgba(30,40,60,0.07)'
            : dark
              ? '0 14px 32px rgba(0,0,0,0.26)'
              : '0 12px 28px rgba(30,40,60,0.11)',
        },
      }}
    >
      {drag?.dropPosition ? (
        <Box
          aria-hidden
          className="note-drop-indicator"
          sx={{
            position: 'absolute',
            left: -1,
            right: -1,
            height: 3,
            bgcolor: 'primary.main',
            boxShadow: `0 0 0 1px ${alpha(accent, 0.28)}`,
            pointerEvents: 'none',
            zIndex: 2,
            ...(drag.dropPosition === 'before'
              ? { top: -10 }
              : { bottom: -10 }),
          }}
        />
      ) : null}

      <Box sx={{ p: { xs: 1.9, sm: 2.2 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            height: 28,
            mt: { xs: -1.9, sm: -2.2 },
            mb: 0.6,
          }}
        >
          <Box
            className="note-card-drag-handle"
            role="button"
            tabIndex={drag?.enabled ? 0 : -1}
            aria-label="Drag to reorder this note, or press the up and down arrow keys"
            aria-hidden={drag?.enabled ? undefined : true}
            title={drag?.enabled ? 'Drag to reorder' : undefined}
            onPointerDown={drag?.enabled ? drag.onPointerDown : undefined}
            onKeyDown={
              drag?.enabled
                ? (event) => {
                    if (
                      event.key === 'ArrowUp' ||
                      event.key === 'ArrowDown'
                    ) {
                      event.preventDefault();
                      drag.onMoveBy(event.key === 'ArrowUp' ? -1 : 1);
                    }
                  }
                : undefined
            }
            sx={{
              position: 'relative',
              flex: '0 0 auto',
              width: 15,
              height: 22,
              ml: -0.55,
              display: 'grid',
              placeItems: 'center',
              color: 'text.disabled',
              cursor: 'grab',
              touchAction: 'none',
              userSelect: 'none',
              visibility: drag?.enabled ? 'visible' : 'hidden',
              transition: 'opacity 120ms ease, color 120ms ease',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: -6,
              },
              '&:hover': { color: 'primary.main' },
              '&:active': { cursor: 'grabbing' },
              '&:focus-visible': {
                outline: `2px solid ${alpha(accent, 0.7)}`,
                outlineOffset: 2,
              },
            }}
          >
            <DragIndicatorRoundedIcon sx={{ fontSize: 16 }} />
          </Box>

        </Box>

        <Typography
          component="h2"
          sx={{
            width: '100%',
            mb: 1,
            color: note.pinned ? 'primary.main' : 'text.primary',
            fontWeight: 800,
            fontSize: { xs: 18.5, sm: 20 },
            lineHeight: 1.28,
            letterSpacing: '-0.02em',
            overflowWrap: 'anywhere',
          }}
        >
          {note.title || 'Untitled note'}
        </Typography>

        <NotePreview
          body={note.body}
          plain={note.plain}
          onChange={handleContentChange}
        />

        <Stack
          direction="row"
          flexWrap="wrap"
          alignItems="center"
          gap={0.6}
          sx={{ mt: 1.4 }}
        >
          {note.tags.map((tag) => (
            <TagChip
              key={tag}
              className="note-tag-chip"
              tag={tag}
              selected={isTagSelected(tag)}
              onClick={(event) => {
                event.stopPropagation();
                onTagClick(tag);
              }}
              onDelete={(event) => {
                event.stopPropagation();
                handleTagsChange(
                  note.tags.filter((item) => item !== tag),
                );
              }}
            />
          ))}

          {addingTag ? (
            <Autocomplete
              ref={tagEditorRef}
              freeSolo
              autoFocus
              openOnFocus
              disableClearable
              forcePopupIcon={false}
              size="small"
              options={availableTags}
              value={undefined}
              inputValue={tagDraft}
              onInputChange={(_, value, reason) => {
                if (reason === 'reset') return;
                setTagDraft(value);
              }}
              onChange={(_, value) => {
                if (typeof value !== 'string') return;
                handleTagsChange([...note.tags, value]);
                closeTagEditor();
              }}
              onBlur={() => {
                // Let a click on a suggestion finish before collapsing.
                window.setTimeout(closeTagEditor, 0);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  closeTagEditor();
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  placeholder="Add tag…"
                  slotProps={{
                    htmlInput: {
                      ...params.inputProps,
                      'aria-label': 'Add tag',
                    },
                  }}
                  sx={{
                    '& .MuiInputBase-root': { p: 0 },
                    '& .MuiInputBase-input': {
                      fontSize: 12.5,
                      p: 0,
                      minWidth: 90,
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: 'text.disabled',
                      opacity: 1,
                    },
                  }}
                />
              )}
              sx={{ width: 160 }}
            />
          ) : (
            <Chip
              className="note-tag-add"
              size="small"
              icon={<AddRoundedIcon sx={{ fontSize: 14 }} />}
              label="Add tag"
              onClick={(event) => {
                event.stopPropagation();
                setAddingTag(true);
              }}
              sx={addChipSx}
            />
          )}

          <Tooltip title="Add a date or date & time tag">
            <Chip
              className="note-tag-add"
              size="small"
              icon={<EventOutlinedIcon sx={{ fontSize: 14 }} />}
              label="Date"
              onClick={(event) => {
                event.stopPropagation();
                onAddDate(note);
              }}
              sx={addChipSx}
            />
          </Tooltip>
        </Stack>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mt: 1.1,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.6}
            sx={{ color: 'text.secondary', minWidth: 0 }}
          >
            <ScheduleRoundedIcon sx={{ fontSize: 14, flex: '0 0 auto' }} />
            <Tooltip title={formatDateTime(note.updatedAt)}>
              <Typography variant="caption" noWrap sx={{ fontSize: 11.5 }}>
                {formatRelative(note.updatedAt)}
              </Typography>
            </Tooltip>
          </Stack>

          <Box
            className="note-card-actions"
            sx={{
              position: 'absolute',
              top: 1,
              right: 2,
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 0.1,
              height: 28,
              px: 0.25,
              flex: '0 0 auto',
              borderRadius: '8px',
              border: '1px solid transparent',
              bgcolor: 'transparent',
              pointerEvents: 'none',
              transition:
                'background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
              // The toolbar sits inside the card's top edge, above the title,
              // so the title still gets the whole card width.
              '@media (hover: hover)': {
                '.note-card:hover &, .note-card:focus-within &': {
                  bgcolor: 'background.paper',
                  borderColor: 'divider',
                  boxShadow: dark
                    ? '0 8px 18px rgba(0,0,0,0.42)'
                    : '0 6px 16px rgba(30,40,60,0.14)',
                },
              },
              '@media (hover: none)': {
                bgcolor: 'background.paper',
                borderColor: 'divider',
                boxShadow: dark
                  ? '0 8px 18px rgba(0,0,0,0.42)'
                  : '0 6px 16px rgba(30,40,60,0.14)',
              },
            }}
          >
            <Tooltip title="Edit note">
              <IconButton
                aria-label="Edit note"
                onClick={() => onOpen(note.id)}
                sx={{
                  ...actionButtonSx,
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                  },
                }}
              >
                <EditOutlinedIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Copy content">
              <IconButton
                aria-label="Copy note content"
                onClick={() => onCopy(note)}
                sx={{
                  ...actionButtonSx,
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                  },
                }}
              >
                <ContentCopyRoundedIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Delete note">
              <IconButton
                aria-label="Delete note"
                onClick={() => onDelete(note)}
                sx={{
                  ...actionButtonSx,
                  '&:hover': {
                    color: 'error.main',
                    bgcolor: alpha(theme.palette.error.main, 0.12),
                  },
                }}
              >
                <DeleteOutlineRoundedIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={note.pinned ? 'Unpin note' : 'Pin note'}>
              <IconButton
                aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                onClick={() => onTogglePin(note)}
                className={note.pinned ? 'is-pinned' : undefined}
                sx={{
                  ...actionButtonSx,
                  color: note.pinned ? 'primary.main' : 'text.secondary',
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                  },
                }}
              >
                {note.pinned ? (
                  <PushPinRoundedIcon />
                ) : (
                  <PushPinOutlinedIcon sx={{ transform: 'rotate(35deg)' }} />
                )}
              </IconButton>
            </Tooltip>

            {/* The done/seen action stays visible on every card; the other
                actions only appear on hover. It sits last so it lines up with
                the top-right corner while they are hidden. */}
            <Tooltip title={doneLabel}>
              <IconButton
                aria-label={doneLabel}
                aria-pressed={done}
                onClick={() => onToggleDone(note)}
                className={`is-done-toggle${done ? ' is-done' : ''}`}
                sx={{
                  ...actionButtonSx,
                  color: done ? 'success.main' : 'text.secondary',
                  '&:hover': {
                    color: done ? 'success.main' : 'primary.main',
                    bgcolor: done
                      ? alpha(theme.palette.success.main, 0.12)
                      : alpha(theme.palette.primary.main, 0.12),
                  },
                }}
              >
                {done ? (
                  <RestoreRoundedIcon />
                ) : movie ? (
                  <VisibilityOutlinedIcon />
                ) : (
                  <TaskAltRoundedIcon />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Card>
  );
}
