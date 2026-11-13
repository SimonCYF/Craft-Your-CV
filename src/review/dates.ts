/* Reads the free-text date ranges people type ("Jan 2020 – Present", "03/2019-05/2021", "2018 to 2020"). */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export type DateFormat = 'Mon YYYY' | 'Month YYYY' | 'MM/YYYY' | 'YYYY-MM' | 'YYYY';
export interface DateRange {
  start: number | null;     // months since year 0 (year * 12 + month)
  end: number | null;       // null while current
  current: boolean;         // "Present" / "Current"
  formats: DateFormat[];
  separator: string;
  ok: boolean;              // a start date was understood
}

export const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();
export const fmtMonth = (m: number) => `${MONTHS[m % 12][0].toUpperCase()}${MONTHS[m % 12].slice(1)} ${Math.floor(m / 12)}`;

const TOKEN = new RegExp(
  '(present|current|now|ongoing|till date|to date|today)' +                       // 1 open end
  '|(?:(\\d{1,2})[/.](\\d{4}))' +                                                  // 2,3 MM/YYYY
  '|(?:(\\d{4})[-/.](\\d{1,2})(?!\\d))' +                                          // 4,5 YYYY-MM
  '|(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?,?\\s*(\\d{4}))' + // 6,7 Mon YYYY
  '|\\b((?:19|20)\\d{2})\\b',                                                      // 8 YYYY
  'gi',
);

export function parseRange(when: string): DateRange {
  const out: DateRange = { start: null, end: null, current: false, formats: [], separator: '', ok: false };
  const text = when.trim();
  if (!text) return out;
  const found: { value: number | null; open: boolean; format: DateFormat | null; year: boolean }[] = [];
  for (const m of text.matchAll(TOKEN)) {
    if (m[1]) found.push({ value: null, open: true, format: null, year: false });
    else if (m[2]) found.push({ value: +m[3] * 12 + (Math.min(12, Math.max(1, +m[2])) - 1), open: false, format: 'MM/YYYY', year: false });
    else if (m[4]) found.push({ value: +m[4] * 12 + (Math.min(12, Math.max(1, +m[5])) - 1), open: false, format: 'YYYY-MM', year: false });
    else if (m[6]) found.push({ value: +m[7] * 12 + MONTHS.indexOf(m[6].slice(0, 3).toLowerCase()), open: false, format: m[6].length > 3 && !/^sept?$/i.test(m[6]) ? 'Month YYYY' : 'Mon YYYY', year: false });
    else if (m[8]) found.push({ value: +m[8] * 12, open: false, format: 'YYYY', year: true });
  }
  if (!found.length) return out;
  const sep = text.match(/\s(to|until|till)\s|[–—-]/i);
  out.separator = sep ? (sep[1] ? sep[1].toLowerCase() : sep[0]) : '';
  out.formats = found.filter((f) => f.format).map((f) => f.format!);
  const [a, b] = found;
  if (a.open) return out;
  out.start = a.value;
  out.ok = true;
  if (b) {
    if (b.open) out.current = true;
    else out.end = b.year ? b.value! + 11 : b.value;
  } else out.end = a.year ? a.value! + 11 : a.value;   // a single date: a one-month (or one-year) stint
  return out;
}

/** Months covered by a set of ranges, without counting overlaps twice. */
export function totalMonths(ranges: DateRange[], now = new Date()): number {
  const nowM = monthIndex(now);
  const spans = ranges
    .filter((r) => r.ok && r.start !== null)
    .map((r) => [r.start!, r.current ? nowM : (r.end ?? r.start!)] as [number, number])
    .filter(([s, e]) => e >= s)
    .sort((x, y) => x[0] - y[0]);
  let total = 0, curS = -1, curE = -1;
  for (const [s, e] of spans) {
    if (curE < 0 || s > curE) { if (curE >= 0) total += curE - curS + 1; curS = s; curE = e; } else curE = Math.max(curE, e);
  }
  if (curE >= 0) total += curE - curS + 1;
  return total;
}
