import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  alpha,
  AppBar,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { cleanupBlankNotes, createNote, db } from '../db/db';
import { isDoneNote } from '../lib/tags';
import { excerpt } from '../lib/text';
import {
  addMonths,
  collectDateEntries,
  dateKey,
  formatDayHeading,
  formatMonthYear,
  getMonthGrid,
  isSameMonth,
  isToday,
  startOfMonth,
} from '../lib/calendar';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));
  const notes = useLiveQuery(() => db.notes.toArray(), []);

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const collection = useMemo(() => collectDateEntries(notes ?? []), [notes]);
  const weeks = useMemo(() => getMonthGrid(cursor), [cursor]);

  const monthSummary = useMemo(() => {
    const noteIds = new Set<string>();
    let entries = 0;
    for (const day of weeks) {
      if (!isSameMonth(day, cursor)) continue;
      const dayEntries = collection.byDay.get(dateKey(day)) ?? [];
      entries += dayEntries.length;
      for (const entry of dayEntries) noteIds.add(entry.note.id);
    }
    return { notes: noteIds.size, entries };
  }, [collection.byDay, cursor, weeks]);

  const selectedEntries = selectedDay
    ? collection.byDay.get(dateKey(selectedDay)) ?? []
    : [];

  const openNote = useCallback(
    (id: string) => {
      setSelectedDay(null);
      navigate(`/n/${id}`, { state: { from: '/calendar' } });
    },
    [navigate],
  );

  const goToMonth = (delta: number) => {
    setCursor((current) => addMonths(current, delta));
  };

  const goToToday = () => {
    setCursor(startOfMonth(new Date()));
  };

  const createForDay = async () => {
    if (!selectedDay) return;
    try {
      await cleanupBlankNotes(0);
      const created = await createNote({ tags: [dateKey(selectedDay)] });
      setSelectedDay(null);
      navigate(`/n/${created.id}`, { state: { from: '/calendar' } });
    } catch (error) {
      console.error('Could not create a note for that day', error);
      setToast('Could not create a note for that day.');
    }
  };

  const loading = notes === undefined;
  const monthLabel = formatMonthYear(cursor);

  return (
    <Box sx={{ minHeight: '100dvh', pb: { xs: 4, md: 7 } }}>
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
        <Toolbar sx={{ minHeight: 64, gap: 1, px: { xs: 1, sm: 2 } }}>
          <Tooltip title="Back to board">
            <IconButton aria-label="Back to board" onClick={() => navigate('/')}>
              <ArrowBackRoundedIcon />
            </IconButton>
          </Tooltip>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', lineHeight: 1.1 }}
            >
              Calendar
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 650, lineHeight: 1.2 }}
              noWrap
            >
              {monthLabel}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<TodayRoundedIcon />}
            onClick={goToToday}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Today
          </Button>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          px: { xs: 1.5, sm: 2.5, md: 4 },
          pt: { xs: 2, md: 3 },
        }}
      >
        {loading ? (
          <Box sx={{ py: 14, display: 'grid', placeItems: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {collection.datedNotes === 0 ? (
              <Alert
                severity="info"
                icon={<EventOutlinedIcon />}
                sx={{ mb: 2, borderRadius: 2 }}
              >
                No dated notes yet. Add a date tag to a note, for example{' '}
                <code>2026-11-02</code>, <code>2026-11-02t17:00</code>, or{' '}
                <code>2026-11-02..2026-11-05</code>, or use{' '}
                <strong>Add date</strong> in the editor or on a card. Dated
                notes appear here automatically.
              </Alert>
            ) : null}

            <Stack
              direction="row"
              alignItems="flex-end"
              justifyContent="space-between"
              spacing={1}
              sx={{ mb: 1.5 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}
                >
                  {monthLabel}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {monthSummary.notes === 0
                    ? 'No dated notes this month'
                    : `${monthSummary.notes} dated ${
                        monthSummary.notes === 1 ? 'note' : 'notes'
                      } · ${monthSummary.entries} ${
                        monthSummary.entries === 1 ? 'entry' : 'entries'
                      }`}
                </Typography>
              </Box>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Tooltip title="Previous month">
                  <IconButton
                    aria-label="Previous month"
                    onClick={() => goToMonth(-1)}
                  >
                    <ChevronLeftRoundedIcon />
                  </IconButton>
                </Tooltip>
                <Button
                  size="small"
                  onClick={goToToday}
                  sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                >
                  Today
                </Button>
                <Tooltip title="Next month">
                  <IconButton
                    aria-label="Next month"
                    onClick={() => goToMonth(1)}
                  >
                    <ChevronRightRoundedIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            <Box
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? '0 10px 28px rgba(0,0,0,0.22)'
                    : '0 10px 26px rgba(30,40,60,0.07)',
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                {WEEKDAYS.map((weekday) => (
                  <Typography
                    key={weekday}
                    variant="caption"
                    sx={{
                      py: 1,
                      textAlign: 'center',
                      fontWeight: 750,
                      color: 'text.secondary',
                    }}
                  >
                    {weekday}
                  </Typography>
                ))}
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: '1px',
                  bgcolor: theme.palette.divider,
                }}
              >
                {weeks.map((day) => {
                  const dayEntries = collection.byDay.get(dateKey(day)) ?? [];
                  const inMonth = isSameMonth(day, cursor);
                  const today = isToday(day);
                  const weekend = day.getDay() === 0 || day.getDay() === 6;

                  return (
                    <Box
                      key={dateKey(day)}
                      onClick={() => setSelectedDay(day)}
                      sx={{
                        minHeight: { xs: 66, sm: 116 },
                        p: { xs: 0.45, sm: 0.75 },
                        cursor: 'pointer',
                        bgcolor: today
                          ? alpha(theme.palette.primary.main, 0.1)
                          : inMonth
                            ? 'background.paper'
                            : alpha(theme.palette.text.primary, 0.028),
                        opacity: inMonth ? 1 : 0.58,
                        transition: 'background-color 120ms ease',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.07),
                        },
                        ...(weekend && inMonth && !today
                          ? {
                              backgroundImage: `linear-gradient(${alpha(
                                theme.palette.primary.main,
                                0.025,
                              )}, ${alpha(
                                theme.palette.primary.main,
                                0.025,
                              )})`,
                            }
                          : {}),
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 0.5,
                          mb: 0.4,
                        }}
                      >
                        <ButtonBase
                          aria-label={`Open notes for ${formatDayHeading(day)}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedDay(day);
                          }}
                          sx={{
                            width: 23,
                            height: 23,
                            borderRadius: '50%',
                            bgcolor: today ? 'primary.main' : 'transparent',
                            color: today
                              ? 'primary.contrastText'
                              : inMonth
                                ? 'text.primary'
                                : 'text.secondary',
                            fontSize: { xs: 11, sm: 12.5 },
                            fontWeight: today ? 800 : 650,
                            '&:hover': {
                              bgcolor: today
                                ? 'primary.main'
                                : alpha(theme.palette.primary.main, 0.12),
                            },
                            '&:focus-visible': {
                              outline: `2px solid ${alpha(
                                theme.palette.primary.main,
                                0.7,
                              )}`,
                              outlineOffset: 2,
                            },
                          }}
                        >
                          {day.getDate()}
                        </ButtonBase>
                        {dayEntries.length > 1 && !isDesktop ? (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: 9.5,
                              lineHeight: 1,
                              color: 'text.secondary',
                            }}
                          >
                            {dayEntries.length}
                          </Typography>
                        ) : null}
                      </Box>

                      {isDesktop ? (
                        <Stack spacing={0.4}>
                          {dayEntries.slice(0, 3).map((entry) => {
                            const done = isDoneNote(entry.note);
                            const accent = done
                              ? theme.palette.success.main
                              : theme.palette.primary.main;
                            return (
                              <ButtonBase
                                key={entry.note.id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openNote(entry.note.id);
                                }}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  width: '100%',
                                  minWidth: 0,
                                  px: 0.6,
                                  py: 0.3,
                                  borderRadius: 1,
                                  textAlign: 'left',
                                  bgcolor: alpha(accent, 0.1),
                                  borderLeft: `3px solid ${accent}`,
                                  '&:hover': {
                                    bgcolor: alpha(accent, 0.18),
                                  },
                                }}
                              >
                                {entry.info.hasTime ? (
                                  <Typography
                                    component="span"
                                    sx={{
                                      flex: '0 0 auto',
                                      fontSize: 10.5,
                                      fontWeight: 750,
                                      color: accent,
                                    }}
                                  >
                                    {entry.info.timeLabel}
                                  </Typography>
                                ) : null}
                                <Typography
                                  component="span"
                                  noWrap
                                  sx={{
                                    minWidth: 0,
                                    fontSize: 11.5,
                                    color: 'text.primary',
                                  }}
                                >
                                  {entry.note.title || 'Untitled note'}
                                </Typography>
                                {done ? (
                                  <CheckCircleOutlineRoundedIcon
                                    sx={{
                                      flex: '0 0 auto',
                                      ml: 'auto',
                                      fontSize: 12,
                                      color: 'success.main',
                                    }}
                                  />
                                ) : null}
                              </ButtonBase>
                            );
                          })}
                          {dayEntries.length > 3 ? (
                            <Button
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedDay(day);
                              }}
                              sx={{
                                justifyContent: 'flex-start',
                                minWidth: 0,
                                px: 0.5,
                                py: 0,
                                fontSize: 10.5,
                              }}
                            >
                              +{dayEntries.length - 3} more
                            </Button>
                          ) : null}
                        </Stack>
                      ) : (
                        <Stack
                          direction="row"
                          alignItems="center"
                          sx={{ flexWrap: 'wrap', gap: 0.45, mt: 0.2 }}
                        >
                          {dayEntries.slice(0, 4).map((entry) => (
                            <Box
                              key={entry.note.id}
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                bgcolor: isDoneNote(entry.note)
                                  ? 'success.main'
                                  : 'primary.main',
                              }}
                            />
                          ))}
                          {dayEntries.length > 4 ? (
                            <Typography
                              variant="caption"
                              sx={{ fontSize: 9, lineHeight: 1 }}
                            >
                              +{dayEntries.length - 4}
                            </Typography>
                          ) : null}
                        </Stack>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1.5, px: 0.5 }}
            >
              Dates come from tags like <code>2026-11-02</code> (all day),{' '}
              <code>2026-11-02t17:00</code> (with a time), or{' '}
              <code>2026-11-02..2026-11-05</code> (a period). Click a day to see
              everything on it; done notes keep a check mark.
            </Typography>
          </>
        )}
      </Box>

      <Dialog
        open={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {selectedDay ? formatDayHeading(selectedDay) : ''}
        </DialogTitle>
        <DialogContent dividers={selectedEntries.length > 0}>
          {selectedEntries.length === 0 ? (
            <Stack
              alignItems="center"
              spacing={1}
              sx={{ py: 4, textAlign: 'center' }}
            >
              <EventOutlinedIcon
                sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.6 }}
              />
              <Typography color="text.secondary">
                No notes on this day yet.
              </Typography>
            </Stack>
          ) : (
            <Stack
              divider={<Divider flexItem />}
              sx={{ py: 0.25 }}
            >
              {selectedEntries.map((entry) => (
                <ButtonBase
                  key={entry.note.id}
                  onClick={() => openNote(entry.note.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.25,
                    width: '100%',
                    px: 0.75,
                    py: 1.25,
                    borderRadius: 1,
                    textAlign: 'left',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box
                    sx={{
                      flex: '0 0 auto',
                      minWidth: 58,
                      pt: 0.2,
                      fontSize: 12,
                      fontWeight: 700,
                      color: entry.info.hasTime
                        ? 'primary.main'
                        : 'text.secondary',
                    }}
                  >
                    {entry.info.dayLabel}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={0.75}
                    >
                      <Typography
                        noWrap
                        sx={{ fontWeight: 700, minWidth: 0 }}
                      >
                        {entry.note.title || 'Untitled note'}
                      </Typography>
                      {isDoneNote(entry.note) ? (
                        <CheckCircleOutlineRoundedIcon
                          sx={{ fontSize: 15, color: 'success.main' }}
                        />
                      ) : null}
                    </Stack>
                    {entry.note.plain.trim() ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 0.25,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {excerpt(entry.note, 140)}
                      </Typography>
                    ) : null}
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.4,
                        fontFamily: 'monospace',
                        color: 'text.disabled',
                      }}
                    >
                      {entry.info.tag}
                    </Typography>
                    {entry.info.isPeriod && entry.info.periodDayCount ? (
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', mt: 0.2, color: 'text.secondary' }}
                      >
                        {entry.info.periodLabel} · day{' '}
                        {entry.info.periodDayIndex} of{' '}
                        {entry.info.periodDayCount}
                      </Typography>
                    ) : null}
                  </Box>
                </ButtonBase>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSelectedDay(null)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => void createForDay()}
            disabled={!selectedDay}
          >
            New note on this day
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setToast(null)}
          sx={{ borderRadius: 2 }}
        >
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
