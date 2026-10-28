// Respaldo JSON (exportar/importar con validación) y exportación CSV.
import { isValidDateKey, isValidTime } from "./dates";
import { defaultSettings } from "./defaults";
import { logId, type DailyRow } from "./logic";
import type { AppData, Habit, HabitLog, Routine, Settings, SleepEntry, Task, FocusSession } from "./types";

export const BACKUP_APP = "disciplina-430";
export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: AppData;
}

export function toBackup(data: AppData, now = new Date()): BackupFile {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isDays = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);

class BackupError extends Error {}

function fail(msg: string): never {
  throw new BackupError(msg);
}

function arr(data: Obj, key: string): unknown[] {
  const v = data[key];
  if (!Array.isArray(v)) fail(`Falta la colección "${key}".`);
  return v;
}

function checkSettings(v: unknown): Settings {
  if (!isObj(v)) fail("Configuración inválida.");
  const s = { ...defaultSettings(), ...v } as Settings;
  if (!isValidDateKey(s.startDate)) fail("Fecha de inicio inválida.");
  if (!isValidTime(s.finalBed) || !isValidTime(s.finalWake)) fail("Horario final inválido.");
  if (!isNum(s.durationDays) || s.durationDays < 1 || s.durationDays > 366) fail("Duración inválida.");
  if (!isNum(s.minSleepHours) || !isNum(s.desiredSleepHours)) fail("Horas de sueño inválidas.");
  if (!isDays(s.activeDays)) fail("Días activos inválidos.");
  if (!Array.isArray(s.phases) || !s.phases.every((p) => isObj(p) && isNum(p.phase) && isValidTime(p.bed) && isValidTime(p.wake)))
    fail("Fases de adaptación inválidas.");
  if (!Array.isArray(s.repeats) || !s.repeats.every(isNum)) fail("Repeticiones inválidas.");
  if (!Array.isArray(s.taskCategories) || !s.taskCategories.every(isStr)) fail("Categorías inválidas.");
  s.id = "settings";
  return s;
}

function checkHabit(v: unknown, i: number): Habit {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.name) || !isStr(v.category) || !isDays(v.days))
    fail(`Hábito #${i + 1} inválido.`);
  if (v.status !== "active" && v.status !== "paused") fail(`Estado del hábito "${v.name}" inválido.`);
  if (!isValidDateKey(v.activeFrom)) fail(`Fecha de inicio del hábito "${v.name}" inválida.`);
  if (v.time !== undefined && v.time !== "" && !isValidTime(v.time)) fail(`Hora del hábito "${v.name}" inválida.`);
  const pauses = Array.isArray(v.pauses) ? v.pauses : [];
  if (!pauses.every((p) => isObj(p) && isValidDateKey(p.from) && (p.to === undefined || isValidDateKey(p.to))))
    fail(`Pausas del hábito "${v.name}" inválidas.`);
  return { goal: "", order: i, ...v, pauses } as Habit;
}

function checkLog(v: unknown, habitIds: Set<string>): HabitLog | null {
  if (!isObj(v) || !isStr(v.habitId) || !isValidDateKey(v.date)) fail("Registro de hábito inválido.");
  if (!habitIds.has(v.habitId)) return null; // huérfano: se descarta
  return { id: logId(v.habitId, v.date), habitId: v.habitId, date: v.date };
}

function checkSleep(v: unknown): SleepEntry {
  if (!isObj(v) || !isValidDateKey(v.date) || !isValidTime(v.bedTime) || !isValidTime(v.wakeTime))
    fail("Registro de sueño inválido.");
  if (v.asleepTime !== undefined && v.asleepTime !== "" && !isValidTime(v.asleepTime))
    fail(`Hora de dormirse inválida (${v.date}).`);
  if (!isValidTime(v.targetBed) || !isValidTime(v.targetWake)) fail(`Metas de sueño inválidas (${v.date}).`);
  if (!isNum(v.quality) || !isNum(v.targetHours) || !isNum(v.minHours)) fail(`Valores de sueño inválidos (${v.date}).`);
  const e = { notes: "", ...v } as SleepEntry;
  if (!e.asleepTime) delete e.asleepTime;
  return e;
}

function checkTask(v: unknown): Task {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.title) || !isValidDateKey(v.date) || typeof v.priority !== "boolean")
    fail("Tarea inválida.");
  if (v.status !== "pending" && v.status !== "done") fail(`Estado de tarea inválido (${v.title}).`);
  return { category: "Personal", createdAt: new Date(0).toISOString(), ...v } as Task;
}

function checkFocus(v: unknown): FocusSession {
  if (!isObj(v) || !isStr(v.id) || !isValidDateKey(v.date) || !isNum(v.minutes) || v.minutes < 0)
    fail("Sesión de enfoque inválida.");
  return { label: "", plannedMinutes: v.minutes, completed: true, startedAt: "", ...v } as FocusSession;
}

function checkRoutine(v: unknown): Routine {
  if (!isObj(v) || (v.id !== "morning" && v.id !== "night") || !Array.isArray(v.items)) fail("Rutina inválida.");
  if (!v.items.every((it) => isObj(it) && isStr(it.id) && isStr(it.name) && isNum(it.offset) && isNum(it.duration)))
    fail("Actividad de rutina inválida.");
  return v as unknown as Routine;
}

/** Valida y normaliza un respaldo. Lanza un Error con mensaje legible. */
export function parseBackup(raw: unknown): AppData {
  if (!isObj(raw) || raw.app !== BACKUP_APP) fail("El archivo no es un respaldo de DISCIPLINA 4:30.");
  if (!isNum(raw.version) || raw.version > BACKUP_VERSION) fail("Versión de respaldo no compatible.");
  if (!isObj(raw.data)) fail("El respaldo no contiene datos.");
  const d = raw.data;
  const settings = checkSettings(d.settings);
  const habits = arr(d, "habits").map(checkHabit);
  const ids = new Set(habits.map((h) => h.id));
  if (ids.size !== habits.length) fail("Hay hábitos con identificadores duplicados.");
  const logs = new Map<string, HabitLog>();
  for (const l of arr(d, "habitLogs")) {
    const log = checkLog(l, ids);
    if (log) logs.set(log.id, log); // deduplicación por hábito y fecha
  }
  const sleep = new Map<string, SleepEntry>();
  for (const e of arr(d, "sleep").map(checkSleep)) sleep.set(e.date, e);
  const routines = arr(d, "routines").map(checkRoutine);
  return {
    settings,
    habits,
    habitLogs: [...logs.values()],
    sleep: [...sleep.values()],
    tasks: arr(d, "tasks").map(checkTask),
    focus: arr(d, "focus").map(checkFocus),
    routines,
  };
}

export function parseBackupText(text: string): AppData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail("El archivo no es un JSON válido.");
  }
  return parseBackup(raw);
}

/* ----------------------------------- CSV ---------------------------------- */

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

const round1 = (n: number | null) => (n === null ? "" : Math.round(n * 10) / 10);

export function dailyCsv(rows: DailyRow[]): string {
  return toCsv(
    ["fecha", "habitos_correspondientes", "habitos_completados", "cumplimiento_pct", "sueno_estimado_h", "tiempo_en_cama_h", "dif_despertar_min", "enfoque_min"],
    rows.map((r) => [
      r.date,
      r.due,
      r.done,
      r.pct === null ? "" : Math.round(r.pct * 1000) / 10,
      r.sleepMin === null ? "" : round1(r.sleepMin / 60),
      r.inBedMin === null ? "" : round1(r.inBedMin / 60),
      r.wakeDiff ?? "",
      r.focusMin,
    ]),
  );
}

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([mime.includes("csv") ? "﻿" + text : text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
