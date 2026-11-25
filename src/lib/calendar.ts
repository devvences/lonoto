import type { Note } from '../types';
import { isDoneTag } from './tags';
import { isBlankNote } from './text';

/**
 * Date tags are ordinary tags in one of these shapes:
 *   2026-11-02                        all-day
 *   2026-11-02t17:00                  with a time
 *   2026-11-02 17:00                  with a space (imported / typed by hand)
 *   2026-11-02t17:00:00               seconds are accepted and ignored for display
 *   2026-11-02..2026-11-05            all-day period (inclusive)
 *   2026-11-02t09:00..2026-11-02t11:00 timed period
 *
 * Tags are normalized to lowercase, so the separator is usually a lowercase t.
 */
const DATE_TAG_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[t ](\d{2}):(\d{2})(?::(\d{2}))?)?$/i;

export interface DateTagInfo {
  /** The original tag, kept for display and removal. */
  tag: string;
  /** Local date and time represented by the tag. */
  date: Date;
  /** Local YYYY-MM-DD key used to group calendar entries. */
  dateKey: string;
  hasTime: boolean;
  /** Localized time label when `hasTime` is true. */
  timeLabel: string;
  /** True when the tag covers a start..end range. */
  isPeriod: boolean;
  /** True when the period includes times (even on middle days). */
  periodHasTime?: boolean;
  /** Inclusive end of a period. */
  endDate?: Date;
  endDateKey?: string;
  /** Label for this day in the calendar, e.g. "09:00", "All day" or "Ongoing". */
  dayLabel: string;
  /** 1-based position of this day inside a period. */
  periodDayIndex?: number;
  /** Total number of days in the period. */
  periodDayCount?: number;
  /** Human-readable range, e.g. "2 Nov 2026 – 5 Nov 2026". */
  periodLabel?: string;
}

export interface CalendarEntry {
  note: Note;
  info: DateTagInfo;
}

export interface DateEntryCollection {
  byDay: Map<string, CalendarEntry[]>;
  /** Number of notes with at least one valid date tag. */
  datedNotes: number;
  /** Number of note/day pairs (a note with two dates counts twice). */
  eventCount: number;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function parseSingleDateTag(raw: string): DateTagInfo | null {
  const match = DATE_TAG_PATTERN.exec(raw.trim());
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hasTime = hourText !== undefined;
  const hours = hasTime ? Number(hourText) : 0;
  const minutes = hasTime ? Number(minuteText) : 0;
  const seconds =
    hasTime && secondText !== undefined ? Number(secondText) : 0;

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (
    hasTime &&
    (hours > 23 || minutes > 59 || seconds > 59)
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day, hours, minutes, seconds, 0);
  // Reject impossible dates such as 2026-02-30.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  const timeLabel = hasTime ? formatTimeLabel(date) : '';
  return {
    tag: raw,
    date,
    dateKey: dateKey(date),
    hasTime,
    timeLabel,
    isPeriod: false,
    dayLabel: hasTime ? timeLabel : 'All day',
  };
}

/**
 * Parse a single date/datetime tag or a period written as
 * `start..end` (for example `2026-11-02..2026-11-05` or
 * `2026-11-02t09:00..2026-11-02t11:00`).
 */
export function parseDateTag(raw: string): DateTagInfo | null {
  const trimmed = raw.trim();
  const separator = trimmed.indexOf('..');
  if (separator === -1) return parseSingleDateTag(trimmed);

  const start = parseSingleDateTag(trimmed.slice(0, separator));
  const end = parseSingleDateTag(trimmed.slice(separator + 2));
  if (!start || !end) return null;
  if (start.hasTime !== end.hasTime) return null;
  if (end.date.getTime() < start.date.getTime()) return null;

  return {
    ...start,
    tag: raw,
    isPeriod: true,
    periodHasTime: start.hasTime,
    endDate: end.date,
    endDateKey: end.dateKey,
    periodDayIndex: 1,
    periodDayCount: daysBetweenInclusive(start.date, end.date),
    periodLabel: `${formatDateTagLabel(start)} – ${formatDateTagLabel(end)}`,
    dayLabel: start.dayLabel,
  };
}

export function isDateTag(tag: string): boolean {
  return parseDateTag(tag) !== null;
}

/**
 * A note with no title or body and only date/done tags has nothing to keep.
 * This covers notes created from the calendar (which start with just a date
 * tag) when the user backs out without writing anything.
 */
export function isContentlessNote(note: Note): boolean {
  return (
    !note.title.trim() &&
    !note.plain.trim() &&
    note.tags.every((tag) => isDateTag(tag) || isDoneTag(tag))
  );
}

export function formatDateTag(date: Date, hasTime: boolean): string {
  const day = dateKey(date);
  return hasTime
    ? `${day}t${pad(date.getHours())}:${pad(date.getMinutes())}`
    : day;
}

export function formatTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDayHeading(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDateTagLabel(info: DateTagInfo): string {
  const day = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(info.date);
  return info.hasTime ? `${day}, ${info.timeLabel}` : day;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1, 12);
}

export function addDays(date: Date, delta: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + delta,
    12,
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
  );
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Six weeks of local dates covering the month, starting on Monday. Keeping the
 * row count stable stops the calendar from jumping between months.
 */
export function getMonthGrid(cursor: Date): Date[] {
  const first = startOfMonth(cursor);
  const mondayOffset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) =>
    addDays(first, index - mondayOffset),
  );
}

/** Inclusive day count between two dates, ignoring time and DST shifts. */
function daysBetweenInclusive(start: Date, end: Date): number {
  const startDay = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    12,
  );
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12);
  return Math.round((endDay.getTime() - startDay.getTime()) / 86_400_000) + 1;
}

/**
 * Expand a period tag into one entry per day so a multi-day event appears on
 * every day it covers. Timed periods keep their start time on the first day
 * and their end time on the last day; days in between are marked as ongoing.
 */
function expandDateTag(info: DateTagInfo): DateTagInfo[] {
  if (!info.isPeriod || !info.endDate) return [info];

  const total = info.periodDayCount ?? daysBetweenInclusive(info.date, info.endDate);
  const startKey = info.dateKey;
  const endKey = info.endDateKey ?? dateKey(info.endDate);
  const endDate = info.endDate;
  const days: DateTagInfo[] = [];

  for (let index = 0; index < total; index += 1) {
    const day = addDays(
      new Date(info.date.getFullYear(), info.date.getMonth(), info.date.getDate(), 12),
      index,
    );
    const key = dateKey(day);
    const isStart = key === startKey;
    const isEnd = key === endKey;
    const hasTime = info.hasTime && (isStart || isEnd);
    let timeLabel = '';
    let dayLabel = 'All day';

    if (hasTime) {
      if (isStart && isEnd) {
        timeLabel = `${formatTimeLabel(info.date)}–${formatTimeLabel(endDate)}`;
      } else if (isStart) {
        timeLabel = formatTimeLabel(info.date);
      } else {
        timeLabel = formatTimeLabel(endDate);
      }
      dayLabel = timeLabel;
    } else if (info.hasTime) {
      dayLabel = 'Ongoing';
    }

    days.push({
      ...info,
      date: hasTime
        ? isStart
          ? info.date
          : endDate
        : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12),
      dateKey: key,
      hasTime,
      timeLabel,
      dayLabel,
      periodDayIndex: index + 1,
      periodDayCount: total,
    });
  }

  return days;
}

/** Timed entries win over all-day ones; an ongoing timed period beats an all-day tag. */
function entryRank(info: DateTagInfo): number {
  if (info.hasTime) return 2;
  return info.isPeriod && info.periodHasTime ? 1 : 0;
}

/**
 * Turn every valid date tag into a calendar entry. If a note has more than one
 * tag on the same day, it appears once for that day and a timed tag wins over
 * an all-day one.
 */
export function collectDateEntries(notes: Note[]): DateEntryCollection {
  const perDay = new Map<string, Map<string, CalendarEntry>>();
  const datedNoteIds = new Set<string>();
  let eventCount = 0;

  for (const note of notes) {
    if (isBlankNote(note) || isContentlessNote(note)) continue;

    const daysForNote = new Map<string, CalendarEntry>();
    for (const tag of note.tags) {
      const info = parseDateTag(tag);
      if (!info) continue;
      for (const dayInfo of expandDateTag(info)) {
        const existing = daysForNote.get(dayInfo.dateKey);
        if (!existing || entryRank(dayInfo) > entryRank(existing.info)) {
          daysForNote.set(dayInfo.dateKey, { note, info: dayInfo });
        }
      }
    }

    if (daysForNote.size === 0) continue;
    datedNoteIds.add(note.id);

    for (const [day, entry] of daysForNote) {
      const dayMap = perDay.get(day) ?? new Map<string, CalendarEntry>();
      dayMap.set(note.id, entry);
      perDay.set(day, dayMap);
      eventCount += 1;
    }
  }

  const byDay = new Map<string, CalendarEntry[]>();
  for (const [day, dayMap] of perDay) {
    byDay.set(
      day,
      [...dayMap.values()].sort((a, b) => {
        // All-day notes come first, then timed notes by time and title.
        if (a.info.hasTime !== b.info.hasTime) return a.info.hasTime ? 1 : -1;
        const timeDiff = a.info.date.getTime() - b.info.date.getTime();
        if (timeDiff !== 0) return timeDiff;
        return a.note.title.localeCompare(b.note.title);
      }),
    );
  }

  return { byDay, datedNotes: datedNoteIds.size, eventCount };
}
