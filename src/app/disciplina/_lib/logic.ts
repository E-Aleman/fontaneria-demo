// Reglas de negocio y métricas. Todo se calcula a partir de registros reales.
//
// Denominadores (documentados también en el README):
// - Cumplimiento diario = hábitos completados que correspondían ese día /
//   hábitos que correspondían ese día. Un hábito "corresponde" si está activo
//   en esa fecha, su frecuencia incluye ese día de la semana, el día está entre
//   los días activos y no es un domingo flexible. Días sin hábitos
//   correspondientes no tienen porcentaje (no penalizan).
// - Cumplimiento de un rango (semana, mes, filtro) = suma de completados /
//   suma de correspondientes de los días del rango hasta hoy. Los días futuros
//   nunca entran en el denominador.
// - Completar un hábito en un día que no corresponde cuenta como "extra" y no
//   altera los porcentajes.
import {
  addDays,
  clockDiff,
  diffDays,
  maxKey,
  minKey,
  rangeKeys,
  timeToMinutes,
  weekday,
} from "./dates";
import type { AppData, DateKey, Habit, HabitLog, Settings, SleepEntry, TimeHM } from "./types";

/* ---------------------------- Programa / fases ---------------------------- */

export function programEnd(s: Settings): DateKey {
  return addDays(s.startDate, s.durationDays - 1);
}

/** Día del programa (1..durationDays) o null si está fuera. */
export function programDay(s: Settings, d: DateKey): number | null {
  const n = diffDays(s.startDate, d) + 1;
  return n >= 1 && n <= s.durationDays ? n : null;
}

export function programWeek(s: Settings, d: DateKey): number | null {
  const day = programDay(s, d);
  return day === null ? null : Math.floor((day - 1) / 7) + 1;
}

export function totalWeeks(s: Settings): number {
  return Math.ceil(s.durationDays / 7);
}

/**
 * Fase asignada a cada semana del programa. 0 = consolidación.
 * Las repeticiones insertan semanas extra de una fase, desplazando las
 * siguientes sin modificar las semanas ya vividas.
 */
export function phaseSequence(s: Settings): number[] {
  const seq: number[] = [];
  const phases = [...s.phases].sort((a, b) => a.phase - b.phase);
  for (const p of phases) {
    const times = 1 + s.repeats.filter((r) => r === p.phase).length;
    for (let i = 0; i < times; i++) seq.push(p.phase);
  }
  const weeks = totalWeeks(s);
  while (seq.length < weeks) seq.push(0);
  return seq;
}

export interface DayTargets {
  week: number | null;
  phase: number;
  bed: TimeHM;
  wake: TimeHM;
  label: string;
}

export function targetsFor(s: Settings, d: DateKey): DayTargets {
  const week = programWeek(s, d);
  const seq = phaseSequence(s);
  const first = [...s.phases].sort((a, b) => a.phase - b.phase)[0];
  let phase: number;
  if (week === null) phase = d < s.startDate && first ? first.phase : 0;
  else phase = seq[week - 1] ?? 0;
  const target = s.phases.find((p) => p.phase === phase);
  if (phase === 0 || !target) {
    return { week, phase: 0, bed: s.finalBed, wake: s.finalWake, label: "Consolidación" };
  }
  return { week, phase, bed: target.bed, wake: target.wake, label: `Adaptación ${phase}` };
}

/** Horas de cama implícitas en el horario objetivo. */
export function targetWindowMinutes(bed: TimeHM, wake: TimeHM): number {
  return (((timeToMinutes(wake) - timeToMinutes(bed)) % 1440) + 1440) % 1440;
}

/** Primer día de la semana del programa en la que corresponde `phase`. */
export function weekStartFor(s: Settings, week: number): DateKey {
  return addDays(s.startDate, (week - 1) * 7);
}

/** ¿Se puede repetir la fase de la semana actual? Solo afecta semanas futuras. */
export function canRepeatCurrent(s: Settings, today: DateKey): { ok: boolean; phase: number } {
  const t = targetsFor(s, today);
  return { ok: t.week !== null && t.phase > 0, phase: t.phase };
}

/** Repeticiones que aún no han comenzado y pueden deshacerse. */
export function undoableRepeat(s: Settings, today: DateKey): number | null {
  if (s.repeats.length === 0) return null;
  const last = s.repeats[s.repeats.length - 1];
  const seq = phaseSequence(s);
  const lastIdx = seq.lastIndexOf(last);
  const week = programWeek(s, today) ?? (today < s.startDate ? 0 : Infinity);
  // La última semana de esa fase debe ser futura.
  return lastIdx + 1 > week ? last : null;
}

/* --------------------------------- Hábitos -------------------------------- */

export const logId = (habitId: string, date: DateKey) => `${habitId}|${date}`;

export function isDayActive(s: Settings, d: DateKey): boolean {
  const dow = weekday(d);
  if (s.flexibleSunday && dow === 0) return false;
  return s.activeDays.includes(dow);
}

export function isHabitActiveOn(h: Habit, d: DateKey): boolean {
  if (d < h.activeFrom) return false;
  return !h.pauses.some((p) => d >= p.from && (!p.to || d <= p.to));
}

export function isDue(s: Settings, h: Habit, d: DateKey): boolean {
  return isDayActive(s, d) && h.days.includes(weekday(d)) && isHabitActiveOn(h, d);
}

export function logSet(logs: HabitLog[]): Set<string> {
  return new Set(logs.map((l) => l.id));
}

export interface DayStat {
  date: DateKey;
  due: number;
  done: number;
  extra: number;
  pct: number | null;
}

export function dayStat(data: AppData, d: DateKey, logs = logSet(data.habitLogs)): DayStat {
  let due = 0;
  let done = 0;
  let extra = 0;
  for (const h of data.habits) {
    const isDone = logs.has(logId(h.id, d));
    if (isDue(data.settings, h, d)) {
      due++;
      if (isDone) done++;
    } else if (isDone) extra++;
  }
  return { date: d, due, done, extra, pct: due ? done / due : null };
}

export interface RangeStat {
  due: number;
  done: number;
  pct: number | null;
}

/** Cumplimiento agregado entre `from` y `to`, sin contar días posteriores a `today`. */
export function rangeStat(data: AppData, from: DateKey, to: DateKey, today: DateKey): RangeStat {
  const end = minKey(to, today);
  if (end < from) return { due: 0, done: 0, pct: null };
  const logs = logSet(data.habitLogs);
  let due = 0;
  let done = 0;
  for (const d of rangeKeys(from, end)) {
    const st = dayStat(data, d, logs);
    due += st.due;
    done += st.done;
  }
  return { due, done, pct: due ? done / due : null };
}

export interface StreakResult {
  current: number;
  best: number;
}

/**
 * Racha genérica sobre una secuencia de días: `state` devuelve null para días
 * que no cuentan (no rompen ni suman), true si se cumplió y false si no.
 * El día de hoy suma si ya se cumplió, pero no rompe la racha si aún no.
 */
export function computeStreak(
  days: DateKey[],
  today: DateKey,
  state: (d: DateKey) => boolean | null,
): StreakResult {
  let best = 0;
  let run = 0;
  const states = days.map((d) => ({ d, v: state(d) }));
  for (const { d, v } of states) {
    if (v === null) continue;
    if (v) {
      run++;
      best = Math.max(best, run);
    } else if (d !== today) run = 0;
  }
  let current = 0;
  for (let i = states.length - 1; i >= 0; i--) {
    const { d, v } = states[i];
    if (v === null) continue;
    if (v) current++;
    else if (d === today) continue;
    else break;
  }
  return { current, best };
}

/** Días del programa transcurridos hasta hoy (incluido). */
export function elapsedProgramDays(s: Settings, today: DateKey): DateKey[] {
  const end = minKey(programEnd(s), today);
  return end < s.startDate ? [] : rangeKeys(s.startDate, end);
}

export function dayStreak(data: AppData, today: DateKey): StreakResult {
  const logs = logSet(data.habitLogs);
  const threshold = data.settings.streakThreshold / 100;
  return computeStreak(elapsedProgramDays(data.settings, today), today, (d) => {
    const st = dayStat(data, d, logs);
    return st.pct === null ? null : st.pct >= threshold - 1e-9;
  });
}

export function habitStreak(data: AppData, h: Habit, days: DateKey[], today: DateKey): StreakResult {
  const logs = logSet(data.habitLogs);
  return computeStreak(days, today, (d) =>
    isDue(data.settings, h, d) ? logs.has(logId(h.id, d)) : null,
  );
}

export interface HabitStat {
  habit: Habit;
  due: number;
  done: number;
  pct: number | null;
  streak: StreakResult;
}

export function habitStats(data: AppData, from: DateKey, to: DateKey, today: DateKey): HabitStat[] {
  const end = minKey(to, today);
  const days = end < from ? [] : rangeKeys(from, end);
  const logs = logSet(data.habitLogs);
  const programDays = elapsedProgramDays(data.settings, today);
  return [...data.habits]
    .sort((a, b) => a.order - b.order)
    .map((h) => {
      let due = 0;
      let done = 0;
      for (const d of days) {
        if (!isDue(data.settings, h, d)) continue;
        due++;
        if (logs.has(logId(h.id, d))) done++;
      }
      return { habit: h, due, done, pct: due ? done / due : null, streak: habitStreak(data, h, programDays, today) };
    });
}

/* ---------------------------------- Sueño --------------------------------- */

const mod1440 = (n: number) => ((n % 1440) + 1440) % 1440;

export interface SleepMetrics {
  inBedMin: number;
  sleepMin: number;
  /** true si el sueño se estimó con la hora real de quedarse dormido. */
  hasAsleep: boolean;
  latencyMin: number | null;
  wakeDiff: number;
  bedDiff: number;
  enough: boolean;
  onTime: boolean;
  goalMet: boolean;
  status: "met" | "insufficient" | "late" | "early" | "insufficient-late";
}

/** Tolerancias para considerar "a tiempo" el despertar respecto a la meta. */
export const WAKE_LATE_TOLERANCE = 10;
export const WAKE_EARLY_TOLERANCE = 30;

/**
 * Duración del sueño contemplando el cruce de medianoche: se toma la
 * diferencia módulo 24 h entre la hora de acostarse/dormirse y la de despertar.
 */
export function sleepMetrics(e: Pick<SleepEntry, "bedTime" | "asleepTime" | "wakeTime" | "targetBed" | "targetWake" | "minHours">): SleepMetrics {
  const bed = timeToMinutes(e.bedTime);
  const wake = timeToMinutes(e.wakeTime);
  const inBedMin = mod1440(wake - bed);
  let latencyMin: number | null = null;
  let sleepMin = inBedMin;
  if (e.asleepTime) {
    const lat = mod1440(timeToMinutes(e.asleepTime) - bed);
    if (lat <= inBedMin) {
      latencyMin = lat;
      sleepMin = inBedMin - lat;
    }
  }
  const wakeDiff = clockDiff(e.wakeTime, e.targetWake);
  const bedDiff = clockDiff(e.bedTime, e.targetBed);
  const enough = sleepMin >= e.minHours * 60;
  const onTime = wakeDiff <= WAKE_LATE_TOLERANCE && wakeDiff >= -WAKE_EARLY_TOLERANCE;
  const late = wakeDiff > WAKE_LATE_TOLERANCE;
  let status: SleepMetrics["status"];
  if (onTime && enough) status = "met";
  else if (!enough && late) status = "insufficient-late";
  else if (!enough) status = "insufficient";
  else if (late) status = "late";
  else status = "early";
  return {
    inBedMin,
    sleepMin,
    hasAsleep: latencyMin !== null,
    latencyMin,
    wakeDiff,
    bedDiff,
    enough,
    onTime,
    // No se premia madrugar si el descanso fue insuficiente.
    goalMet: onTime && enough,
    status,
  };
}

export const SLEEP_STATUS_LABEL: Record<SleepMetrics["status"], string> = {
  met: "Meta cumplida",
  insufficient: "Descanso insuficiente",
  late: "Despertar tardío",
  early: "Despertar muy anticipado",
  "insufficient-late": "Tarde y con poco descanso",
};

export function validateSleepTimes(bed: TimeHM, wake: TimeHM, asleep?: TimeHM): string | null {
  const inBed = mod1440(timeToMinutes(wake) - timeToMinutes(bed));
  if (inBed < 60) return "El tiempo en cama debe ser de al menos 1 hora.";
  if (inBed > 16 * 60) return "El tiempo en cama supera 16 horas; revisa las horas.";
  if (asleep) {
    const lat = mod1440(timeToMinutes(asleep) - timeToMinutes(bed));
    if (lat > inBed) return "La hora de dormirse debe estar entre acostarse y despertar.";
  }
  return null;
}

export interface SleepSummary {
  count: number;
  avgSleepMin: number | null;
  avgInBedMin: number | null;
  avgWakeDiff: number | null;
  goalPct: number | null;
  enoughPct: number | null;
}

export function sleepSummary(entries: SleepEntry[]): SleepSummary {
  if (entries.length === 0) {
    return { count: 0, avgSleepMin: null, avgInBedMin: null, avgWakeDiff: null, goalPct: null, enoughPct: null };
  }
  const ms = entries.map(sleepMetrics);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    count: entries.length,
    avgSleepMin: avg(ms.map((m) => m.sleepMin)),
    avgInBedMin: avg(ms.map((m) => m.inBedMin)),
    avgWakeDiff: avg(ms.map((m) => m.wakeDiff)),
    goalPct: ms.filter((m) => m.goalMet).length / ms.length,
    enoughPct: ms.filter((m) => m.enough).length / ms.length,
  };
}

export function sleepInRange(entries: SleepEntry[], from: DateKey, to: DateKey): SleepEntry[] {
  return entries.filter((e) => e.date >= from && e.date <= to).sort((a, b) => a.date.localeCompare(b.date));
}

/* --------------------------------- Enfoque -------------------------------- */

export function focusMinutesOn(data: AppData, d: DateKey): number {
  return data.focus.filter((f) => f.date === d).reduce((a, f) => a + f.minutes, 0);
}

/* ---------------------------------- Hitos --------------------------------- */

export interface Milestone {
  day: number;
  date: DateKey;
  label: string;
  reached: boolean;
}

export function milestones(s: Settings, today: DateKey): Milestone[] {
  const list: Array<{ day: number; label: string }> = [
    { day: 1, label: "Inicio del programa" },
    { day: 7, label: "Primera semana completa" },
    { day: 21, label: "Tres semanas de constancia" },
    { day: 30, label: "Primer mes" },
  ];
  const seq = phaseSequence(s);
  const lastPhase = Math.max(0, ...s.phases.map((p) => p.phase));
  const finalIdx = seq.indexOf(lastPhase);
  if (finalIdx >= 0) list.push({ day: finalIdx * 7 + 1, label: `Primer día con horario final (${s.finalWake})` });
  const consIdx = seq.indexOf(0);
  if (consIdx >= 0) list.push({ day: consIdx * 7 + 1, label: "Inicio de la consolidación" });
  list.push({ day: 60, label: "Dos meses" }, { day: s.durationDays, label: "Programa completado" });
  return list
    .filter((m) => m.day >= 1 && m.day <= s.durationDays)
    .sort((a, b) => a.day - b.day)
    .map((m) => {
      const date = addDays(s.startDate, m.day - 1);
      return { ...m, date, reached: date <= today };
    });
}

/* ------------------------------- Agregaciones ------------------------------ */

export interface DailyRow {
  date: DateKey;
  due: number;
  done: number;
  pct: number | null;
  sleepMin: number | null;
  inBedMin: number | null;
  wakeDiff: number | null;
  focusMin: number;
}

export function dailyRows(data: AppData, from: DateKey, to: DateKey, today: DateKey): DailyRow[] {
  const end = minKey(to, today);
  if (end < from) return [];
  const logs = logSet(data.habitLogs);
  const sleepByDate = new Map(data.sleep.map((e) => [e.date, e]));
  const focusByDate = new Map<DateKey, number>();
  for (const f of data.focus) focusByDate.set(f.date, (focusByDate.get(f.date) ?? 0) + f.minutes);
  return rangeKeys(from, end).map((d) => {
    const st = dayStat(data, d, logs);
    const e = sleepByDate.get(d);
    const m = e ? sleepMetrics(e) : null;
    return {
      date: d,
      due: st.due,
      done: st.done,
      pct: st.pct,
      sleepMin: m ? m.sleepMin : null,
      inBedMin: m ? m.inBedMin : null,
      wakeDiff: m ? m.wakeDiff : null,
      focusMin: focusByDate.get(d) ?? 0,
    };
  });
}

export interface GroupRow {
  key: string;
  label: string;
  due: number;
  done: number;
  pct: number | null;
  focusMin: number;
}

function group(rows: DailyRow[], keyOf: (d: DateKey) => string, labelOf: (k: string) => string): GroupRow[] {
  const map = new Map<string, GroupRow>();
  for (const r of rows) {
    const k = keyOf(r.date);
    const g = map.get(k) ?? { key: k, label: labelOf(k), due: 0, done: 0, pct: null, focusMin: 0 };
    g.due += r.due;
    g.done += r.done;
    g.focusMin += r.focusMin;
    map.set(k, g);
  }
  return [...map.values()].map((g) => ({ ...g, pct: g.due ? g.done / g.due : null }));
}

export function weeklyRows(s: Settings, rows: DailyRow[]): GroupRow[] {
  return group(
    rows.filter((r) => programWeek(s, r.date) !== null),
    (d) => String(programWeek(s, d)).padStart(2, "0"),
    (k) => `Sem ${Number(k)}`,
  );
}

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function monthlyRows(rows: DailyRow[]): GroupRow[] {
  return group(
    rows,
    (d) => d.slice(0, 7),
    (k) => `${MONTH_NAMES[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`,
  );
}

export function clampToProgram(s: Settings, from: DateKey, to: DateKey) {
  return { from: maxKey(from, s.startDate), to: minKey(to, programEnd(s)) };
}

/* ----------------------------- Mensajes breves ---------------------------- */

const MESSAGES = [
  "Lo pequeño, repetido, se vuelve enorme.",
  "Hoy no necesitas motivación: necesitas el siguiente paso.",
  "Protege la primera hora y la primera hora te protegerá a ti.",
  "Descansar bien también es disciplina.",
  "Menos cosas, mejor hechas.",
  "Tu entorno decide antes que tu fuerza de voluntad. Diséñalo.",
  "Un día imperfecto sigue sumando si no abandonas.",
  "El celular puede esperar; tu plan no.",
  "Primero lo importante, después lo urgente.",
  "No rompas la cadena dos veces seguidas.",
  "Concentración profunda: una tarea, un bloque, cero pestañas.",
  "Madrugar sin dormir no es progreso; es deuda.",
  "Prepara la noche y la mañana se ordena sola.",
  "Elige tres cosas. Hazlas. Lo demás es extra.",
  "Cada registro honesto vale más que una racha inventada.",
];

export function messageFor(d: DateKey): string {
  const n = diffDays("2026-01-01", d);
  return MESSAGES[((n % MESSAGES.length) + MESSAGES.length) % MESSAGES.length];
}
