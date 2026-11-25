import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import { parseDateTag } from '../lib/calendar';

type DateMode = 'date' | 'datetime';

interface DateTagDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (tag: string) => void;
  /** Tags already on the note, used to avoid adding the same date twice. */
  existingTags?: string[];
  /** Existing date tag to edit instead of adding a new one. */
  initialTag?: string | null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function dateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function timeInputValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function DateTagDialog({
  open,
  onClose,
  onAdd,
  existingTags = [],
  initialTag = null,
}: DateTagDialogProps) {
  const theme = useTheme();
  const [mode, setMode] = useState<DateMode>('date');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const editing = Boolean(initialTag);

  useEffect(() => {
    if (!open) return;
    const initial = initialTag ? parseDateTag(initialTag) : null;
    if (initial) {
      setMode(initial.hasTime ? 'datetime' : 'date');
      setDate(dateInputValue(initial.date));
      setTime(timeInputValue(initial.date));
      return;
    }
    const now = new Date();
    setMode('date');
    setDate(dateInputValue(now));
    setTime(timeInputValue(now));
  }, [open, initialTag]);

  const tag = useMemo(
    () => (mode === 'datetime' && time ? `${date}t${time}` : date),
    [date, mode, time],
  );

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const validTime = mode === 'date' || /^\d{2}:\d{2}$/.test(time);
  const valid = validDate && validTime;
  const initialKey = initialTag?.trim().toLowerCase() ?? null;
  const duplicate =
    valid &&
    existingTags.some((existing) => {
      const key = existing.trim().toLowerCase();
      return key === tag.toLowerCase() && key !== initialKey;
    });

  const handleToday = () => {
    const now = new Date();
    setDate(dateInputValue(now));
    setTime(timeInputValue(now));
  };

  const handleAdd = () => {
    if (!valid || duplicate) return;
    onAdd(tag);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>
        {editing ? 'Edit date' : 'Add a date'}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {editing
            ? 'Change the date, or switch to Date & time to add a time.'
            : 'The date becomes a tag on this note and shows up in the calendar.'}
        </Typography>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          onChange={(_, value: DateMode | null) => {
            if (value) setMode(value);
          }}
          sx={{
            mb: 2,
            '& .MuiToggleButton-root': {
              px: 1.5,
              py: 0.6,
              textTransform: 'none',
              fontWeight: 650,
            },
          }}
        >
          <ToggleButton value="date">
            <CalendarTodayOutlinedIcon sx={{ fontSize: 17, mr: 0.6 }} />
            Date
          </ToggleButton>
          <ToggleButton value="datetime">
            <ScheduleOutlinedIcon sx={{ fontSize: 17, mr: 0.6 }} />
            Date &amp; time
          </ToggleButton>
        </ToggleButtonGroup>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            type="date"
            label="Date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            fullWidth
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { 'aria-label': 'Date' },
            }}
          />
          {mode === 'datetime' ? (
            <TextField
              type="time"
              label="Time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              fullWidth
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { 'aria-label': 'Time' },
              }}
            />
          ) : null}
        </Stack>

        <Box
          sx={{
            mt: 2,
            p: 1.25,
            borderRadius: 2,
            border: `1px dashed ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.25 }}
          >
            Tag preview
          </Typography>
          <Typography
            component="code"
            sx={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}
          >
            {tag || 'YYYY-MM-DD'}
          </Typography>
        </Box>

        {duplicate ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            That date is already on this note.
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleToday} sx={{ mr: 'auto' }}>
          Today
        </Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={!valid || duplicate}
          startIcon={<EventOutlinedIcon />}
        >
          {editing ? 'Save' : 'Add'} {mode === 'datetime' ? 'date & time' : 'date'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
