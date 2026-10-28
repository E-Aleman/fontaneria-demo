import type { AppData, Habit, Routine, Settings } from "./types";
import { DEFAULT_TZ } from "./dates";

export const MON_SAT = [1, 2, 3, 4, 5, 6];
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export const DEFAULT_PHASES = [
  { phase: 1, bed: "22:15", wake: "06:15" },
  { phase: 2, bed: "22:00", wake: "06:00" },
  { phase: 3, bed: "21:45", wake: "05:45" },
  { phase: 4, bed: "21:30", wake: "05:30" },
  { phase: 5, bed: "21:15", wake: "05:15" },
  { phase: 6, bed: "21:00", wake: "05:00" },
  { phase: 7, bed: "20:45", wake: "04:45" },
  { phase: 8, bed: "20:30", wake: "04:30" },
];

export function defaultSettings(): Settings {
  return {
    id: "settings",
    startDate: "2026-10-29",
    durationDays: 90,
    timezone: DEFAULT_TZ,
    finalBed: "20:30",
    finalWake: "04:30",
    desiredSleepHours: 8,
    minSleepHours: 7,
    activeDays: MON_SAT,
    flexibleSunday: true,
    phases: DEFAULT_PHASES.map((p) => ({ ...p })),
    repeats: [],
    streakThreshold: 80,
    focusGoalMinutes: 60,
    taskCategories: ["Personal", "Trabajo", "Estudio", "Salud", "Hogar"],
    theme: "dark",
  };
}

const SEED_HABITS: Array<Pick<Habit, "name" | "category" | "goal"> & { time?: string; key?: string }> = [
  { name: "Despertar a la hora programada", category: "Sueño", goal: "Hora objetivo de la semana", key: "wake" },
  { name: "Tender la cama", category: "Entorno", goal: "Al levantarme" },
  { name: "Beber agua", category: "Salud", goal: "1 vaso al despertar" },
  { name: "Evitar redes sociales al despertar", category: "Enfoque", goal: "Primera hora sin redes", key: "no_social" },
  { name: "Leer al menos dos páginas", category: "Aprendizaje", goal: "2 páginas" },
  { name: "Ejercicio o movilidad", category: "Salud", goal: "15–20 min" },
  { name: "Ordenar el espacio cinco minutos", category: "Entorno", goal: "5 min" },
  { name: "Definir tres prioridades", category: "Planificación", goal: "3 prioridades" },
  { name: "Preparar el día siguiente", category: "Planificación", goal: "Ropa, objetos y agenda" },
  { name: "Respetar el cierre digital nocturno", category: "Enfoque", goal: "Sin pantallas antes de dormir", key: "digital_close" },
];

export function defaultHabits(startDate: string): Habit[] {
  return SEED_HABITS.map((h, i) => ({
    id: `h-seed-${i + 1}`,
    name: h.name,
    category: h.category,
    goal: h.goal,
    days: [...MON_SAT],
    status: "active",
    activeFrom: startDate,
    pauses: [],
    order: i,
    key: h.key,
  }));
}

export function defaultRoutines(): Routine[] {
  // Desplazamientos relativos al despertar (4:30 en el horario final).
  return [
    {
      id: "morning",
      items: [
        { id: "m1", name: "Despertar", offset: 0, duration: 5 },
        { id: "m2", name: "Tender cama y aseo", offset: 5, duration: 10 },
        { id: "m3", name: "Ejercicio", offset: 15, duration: 20 },
        { id: "m4", name: "Lectura o estudio", offset: 35, duration: 25 },
        { id: "m5", name: "Planificación", offset: 60, duration: 10 },
        { id: "m6", name: "Preparación personal", offset: 70, duration: 20 },
      ],
    },
    {
      // Desplazamientos relativos a la hora de acostarse.
      id: "night",
      items: [
        { id: "n1", name: "Cerrar pendientes", offset: -60, duration: 15 },
        { id: "n2", name: "Ordenar espacio", offset: -45, duration: 10 },
        { id: "n3", name: "Preparar ropa y objetos", offset: -35, duration: 5 },
        { id: "n4", name: "Desactivar distracciones (cierre digital)", offset: -30, duration: 30 },
        { id: "n5", name: "Acostarse", offset: 0, duration: 0 },
      ],
    },
  ];
}

export function defaultData(): AppData {
  const settings = defaultSettings();
  return {
    settings,
    habits: defaultHabits(settings.startDate),
    habitLogs: [],
    sleep: [],
    tasks: [],
    focus: [],
    routines: defaultRoutines(),
  };
}

export function uid(prefix = "id"): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${rnd}`;
}
