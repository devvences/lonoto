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
import DateRangeOutlinedIcon from '@mui/icons-material/DateRangeOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import { parseDateTag } from '../lib/calendar';

type DateMode = 'date' | 'datetime';
type DateSpan = 'single' | 'period';

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

function addHours(
  dateValue: string,
  timeValue: string,
  hours: number,
): { date: string; time: string } {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return { date: dateValue, time: timeValue };
  }
  const next = new Date(year, month - 1, day, hour, minute + hours * 60);
  return { date: dateInputValue(next), time: timeInputValue(next) };
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
  const [span, setSpan] = useState<DateSpan>('single');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const editing = Boolean(initialTag);

  useEffect(() => {
    if (!open) return;
    const initial = initialTag ? parseDateTag(initialTag) : null;
    if (initial) {
      setMode(initial.hasTime ? 'datetime' : 'date');
      setSpan(initial.isPeriod ? 'period' : 'single');
      setDate(dateInputValue(initial.date));
      setTime(timeInputValue(initial.date));
      if (initial.isPeriod && initial.endDate) {
        setEndDate(dateInputValue(initial.endDate));
        setEndTime(timeInputValue(initial.endDate));
      } else {
        const next = addHours(
          dateInputValue(initial.date),
          timeInputValue(initial.date),
          1,
        );
        setEndDate(next.date);
        setEndTime(next.time);
      }
      return;
    }
    const now = new Date();
    const nowDate = dateInputValue(now);
    const nowTime = timeInputValue(now);
    setMode('date');
    setSpan('single');
    setDate(nowDate);
    setTime(nowTime);
    const next = addHours(nowDate, nowTime, 1);
    setEndDate(next.date);
    setEndTime(next.time);
  }, [open, initialTag]);

  const singleTag =
    mode === 'datetime' && time ? `${date}t${time}` : date;
  const endTag =
    mode === 'datetime' && endTime ? `${endDate}t${endTime}` : endDate;
  const tag = useMemo(() => {
    if (!date) return '';
    if (span === 'single' || !endDate || endTag === singleTag) return singleTag;
    return `${singleTag}..${endTag}`;
  }, [date, endDate, endTag, singleTag, span]);

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const validTime = mode === 'date' || /^\d{2}:\d{2}$/.test(time);
  const validEndDate =
    span === 'single' || /^\d{4}-\d{2}-\d{2}$/.test(endDate);
  const validEndTime =
    span === 'single' || mode === 'date' || /^\d{2}:\d{2}$/.test(endTime);
  const validStart = validDate && validTime;
  const validEnd = validEndDate && validEndTime;

  const startStamp = validDate
    ? new Date(
        `${date}T${mode === 'datetime' ? time || '00:00' : '00:00'}`,
      ).getTime()
    : Number.NaN;
  const endStamp = validEndDate
    ? new Date(
        `${endDate}T${mode === 'datetime' ? endTime || '00:00' : '00:00'}`,
      ).getTime()
    : Number.NaN;
  const orderValid =
    span === 'single' ||
    (Number.isFinite(startStamp) &&
      Number.isFinite(endStamp) &&
      (mode === 'datetime' ? endStamp > startStamp : endStamp >= startStamp));
  const valid = validStart && validEnd && orderValid;

  const initialKey = initialTag?.trim().toLowerCase() ?? null;
  const duplicate =
    valid &&
    existingTags.some((existing) => {
      const key = existing.trim().toLowerCase();
      return key === tag.toLowerCase() && key !== initialKey;
    });

  const handleToday = () => {
    const now = new Date();
    const nowDate = dateInputValue(now);
    const nowTime = timeInputValue(now);
    setDate(nowDate);
    setTime(nowTime);
    if (span === 'period') {
      if (mode === 'datetime') {
        const next = addHours(nowDate, nowTime, 1);
        setEndDate(next.date);
        setEndTime(next.time);
      } else {
        setEndDate(nowDate);
      }
    }
  };

  const handleSpanChange = (value: DateSpan) => {
    setSpan(value);
    if (value === 'period') {
      if (mode === 'datetime') {
        const next = addHours(date, time, 1);
        setEndDate(next.date);
        setEndTime(next.time);
      } else {
        setEndDate(date);
      }
    }
  };

  const handleAdd = () => {
    if (!valid || duplicate) return;
    onAdd(tag);
    onClose();
  };

  const title =
    span === 'period'
      ? editing
        ? 'Edit period'
        : 'Add a period'
      : editing
        ? 'Edit date'
        : 'Add a date';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {span === 'period'
            ? 'The period becomes one tag and appears on every day it covers.'
            : editing
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
            mb: 1,
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

        <ToggleButtonGroup
          exclusive
          size="small"
          value={span}
          onChange={(_, value: DateSpan | null) => {
            if (value) handleSpanChange(value);
          }}
          sx={{
            mb: 2,
            display: 'flex',
            '& .MuiToggleButton-root': {
              flex: 1,
              px: 1.5,
              py: 0.6,
              textTransform: 'none',
              fontWeight: 650,
            },
          }}
        >
          <ToggleButton value="single">
            <EventOutlinedIcon sx={{ fontSize: 17, mr: 0.6 }} />
            Single
          </ToggleButton>
          <ToggleButton value="period">
            <DateRangeOutlinedIcon sx={{ fontSize: 17, mr: 0.6 }} />
            Period
          </ToggleButton>
        </ToggleButtonGroup>

        {span === 'single' ? (
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
        ) : (
          <Stack spacing={1.5}>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.5 }}
              >
                Starts
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  type="date"
                  label="Start date"
                  value={date}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDate(value);
                    if (span === 'period' && endDate && endDate < value) {
                      setEndDate(value);
                    }
                  }}
                  fullWidth
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { 'aria-label': 'Start date' },
                  }}
                />
                {mode === 'datetime' ? (
                  <TextField
                    type="time"
                    label="Start time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    fullWidth
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: { 'aria-label': 'Start time' },
                    }}
                  />
                ) : null}
              </Stack>
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.5 }}
              >
                Ends
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  type="date"
                  label="End date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  fullWidth
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { 'aria-label': 'End date' },
                  }}
                />
                {mode === 'datetime' ? (
                  <TextField
                    type="time"
                    label="End time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    fullWidth
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: { 'aria-label': 'End time' },
                    }}
                  />
                ) : null}
              </Stack>
            </Box>
          </Stack>
        )}

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

        {span === 'period' && validStart && validEnd && !orderValid ? (
          <Alert severity="warning" sx={{ mt: 2 }}>
            The end must be after the start.
          </Alert>
        ) : null}
        {duplicate ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            {span === 'period'
              ? 'That period is already on this note.'
              : 'That date is already on this note.'}
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
          {editing ? 'Save' : 'Add'}{' '}
          {span === 'period'
            ? 'period'
            : mode === 'datetime'
              ? 'date & time'
              : 'date'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
