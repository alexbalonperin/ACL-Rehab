// All dates in the app are local YYYY-MM-DD strings. Never use toISOString()
// for these — it converts to UTC and shifts the date around midnight.

export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return localDateString();
}

/**
 * Today's date as YYYY-MM-DD in Asia/Tokyo, independent of the device timezone.
 * Used for all rehab-timeline / post-op math. Uses Intl only — works offline.
 */
export function tokyoToday(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Add n calendar months to a YYYY-MM-DD string, returning a YYYY-MM-DD string. */
export function addMonths(s: string, n: number): string {
  const d = parseLocalDate(s);
  const targetMonth = d.getMonth() + n;
  const result = new Date(d.getFullYear(), targetMonth, d.getDate());
  // Guard against month overflow (e.g. adding to the 31st): clamp to month end.
  if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    result.setDate(0);
  }
  return localDateString(result);
}

/** Parse a YYYY-MM-DD string into a local Date (midnight local time). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Add n days to a YYYY-MM-DD string, returning a YYYY-MM-DD string. */
export function addDays(s: string, n: number): string {
  const d = parseLocalDate(s);
  d.setDate(d.getDate() + n);
  return localDateString(d);
}

/** Inclusive count of days between two YYYY-MM-DD strings (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = parseLocalDate(b).getTime() - parseLocalDate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** ISO week key like "2026-W26" for grouping by week (Mon–Sun). */
export function weekKey(s: string): string {
  const d = parseLocalDate(s);
  // Shift to nearest Thursday (ISO week is defined by its Thursday).
  const day = (d.getDay() + 6) % 7; // Mon=0..Sun=6
  d.setDate(d.getDate() - day + 3);
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  const week =
    1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Short human label, e.g. "Jun 25". */
export function shortLabel(s: string): string {
  const d = parseLocalDate(s);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Format milliseconds as mm:ss or h:mm:ss. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
