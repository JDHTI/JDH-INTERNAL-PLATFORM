/*
 * Client-side copy of the API's business-day rule, used only to preview a
 * due date while a case is being written. The API recomputes and is the
 * authority: whatever it returns replaces this estimate.
 */

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" as a UTC midnight, so arithmetic never crosses a DST edge. */
export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Moves a date to the following Monday unless it already is one (Ley Emiliani). */
function nextMonday(date: Date): Date {
  const weekday = date.getUTCDay();
  return weekday === 1 ? date : addDays(date, (8 - weekday) % 7);
}

/** Anonymous Gregorian algorithm. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const holidayCache = new Map<number, Set<string>>();

/** Colombian public holidays, the same calendar the API takes from `holidays`. */
function colombianHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const fixed = (month: number, day: number) => new Date(Date.UTC(year, month - 1, day));
  const easter = easterSunday(year);
  const dates = [
    fixed(1, 1),
    fixed(5, 1),
    fixed(7, 20),
    fixed(8, 7),
    fixed(12, 8),
    fixed(12, 25),
    nextMonday(fixed(1, 6)),
    nextMonday(fixed(3, 19)),
    nextMonday(fixed(6, 29)),
    nextMonday(fixed(8, 15)),
    nextMonday(fixed(10, 12)),
    nextMonday(fixed(11, 1)),
    nextMonday(fixed(11, 11)),
    addDays(easter, -3),
    addDays(easter, -2),
    addDays(easter, 43),
    addDays(easter, 64),
    addDays(easter, 71),
  ];
  const set = new Set(dates.map(toIsoDate));
  holidayCache.set(year, set);
  return set;
}

function isBusinessDay(date: Date): boolean {
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !colombianHolidays(date.getUTCFullYear()).has(toIsoDate(date));
}

/**
 * First date whose inclusive business-day count reaches `days`, like the
 * spreadsheet's NETWORKDAYS: a reception on a business day is day one.
 */
export function addBusinessDays(start: string, days: number): string {
  let date = parseIsoDate(start);
  if (days <= 0) return start;
  let count = 0;
  for (;;) {
    if (isBusinessDay(date)) count += 1;
    if (count >= days) return toIsoDate(date);
    date = addDays(date, 1);
  }
}
