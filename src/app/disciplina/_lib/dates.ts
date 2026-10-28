import type { DateKey, TimeHM } from "./types";

export const DEFAULT_TZ = "America/El_Salvador";
export const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const WEEKDAYS_LETTER = ["D", "L", "M", "X", "J", "V", "S"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Fecha (YYYY-MM-DD) de un instante en la zona horaria dada. */
export function dateKeyInTz(date: Date, timeZone: string): DateKey {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Minutos desde medianoche de un instante en la zona horaria dada. */
export function minutesInTz(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function isValidDateKey(s: unknown): s is DateKey {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function isValidTime(s: unknown): s is TimeHM {
  return typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

function toUtc(key: DateKey): Date {
  return new Date(`${key}T00:00:00Z`);
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = toUtc(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Días entre dos fechas (b - a). */
export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** Día de la semana (0 = domingo). */
export function weekday(key: DateKey): number {
  return toUtc(key).getUTCDay();
}

export function rangeKeys(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

export function minKey(a: DateKey, b: DateKey): DateKey {
  return a < b ? a : b;
}

export function maxKey(a: DateKey, b: DateKey): DateKey {
  return a > b ? a : b;
}

/** Lunes de la semana calendario de la fecha. */
export function startOfIsoWeek(key: DateKey): DateKey {
  return addDays(key, -((weekday(key) + 6) % 7));
}

export function formatDate(key: DateKey, withWeekday = true): string {
  const d = toUtc(key);
  const base = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return withWeekday ? `${WEEKDAYS_SHORT[d.getUTCDay()]} ${base}` : base;
}

export function formatShort(key: DateKey): string {
  const d = toUtc(key);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function timeToMinutes(t: TimeHM): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(min: number): TimeHM {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "22:15" → "10:15 PM" */
export function format12(t: TimeHM): string {
  const min = timeToMinutes(t);
  const h = Math.floor(min / 60);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(min % 60).padStart(2, "0")} ${suffix}`;
}

export function formatDuration(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const m = Math.abs(Math.round(minutes));
  return `${sign}${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
}

/** Diferencia firmada entre dos horas del reloj, normalizada a [-720, 720). */
export function clockDiff(actual: TimeHM, target: TimeHM): number {
  const d = timeToMinutes(actual) - timeToMinutes(target);
  return ((((d + 720) % 1440) + 1440) % 1440) - 720;
}
