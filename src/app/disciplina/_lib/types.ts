// Modelos de datos de DISCIPLINA 4:30. Las fechas son claves "YYYY-MM-DD"
// en la zona horaria configurada; las horas son "HH:MM" (24 h).

export type DateKey = string;
export type TimeHM = string;

export interface PhaseTarget {
  /** Fase de adaptación (1..n). */
  phase: number;
  bed: TimeHM;
  wake: TimeHM;
}

export type ThemeMode = "dark" | "light";

export interface Settings {
  id: "settings";
  startDate: DateKey;
  durationDays: number;
  timezone: string;
  /** Horario final (consolidación). */
  finalBed: TimeHM;
  finalWake: TimeHM;
  desiredSleepHours: number;
  /** Por debajo de este valor el descanso se considera insuficiente. */
  minSleepHours: number;
  /** Días de la semana activos (0 = domingo ... 6 = sábado). */
  activeDays: number[];
  flexibleSunday: boolean;
  /** Fases graduales de adaptación; después de la última viene la consolidación. */
  phases: PhaseTarget[];
  /** Fases repetidas (cada entrada añade una semana extra de esa fase). */
  repeats: number[];
  /** % mínimo de cumplimiento diario para que el día cuente en la racha. */
  streakThreshold: number;
  focusGoalMinutes: number;
  taskCategories: string[];
  theme: ThemeMode;
}

export interface HabitPause {
  from: DateKey;
  to?: DateKey;
}

export interface Habit {
  id: string;
  name: string;
  category: string;
  /** Días de la semana en que corresponde (0 = domingo). */
  days: number[];
  goal: string;
  time?: TimeHM;
  status: "active" | "paused";
  /** Desde cuándo cuenta el hábito (no penaliza días anteriores). */
  activeFrom: DateKey;
  pauses: HabitPause[];
  order: number;
  /** Identificador estable de hábitos semilla (p. ej. cierre digital). */
  key?: string;
}

export interface HabitLog {
  /** `${habitId}|${date}`: garantiza un único registro por hábito y fecha. */
  id: string;
  habitId: string;
  date: DateKey;
}

export interface SleepEntry {
  /** Fecha en que se despierta (la noche que termina ese día). */
  date: DateKey;
  bedTime: TimeHM;
  asleepTime?: TimeHM;
  wakeTime: TimeHM;
  quality: number;
  notes: string;
  /** Metas vigentes al registrar, para conservar el historial. */
  targetBed: TimeHM;
  targetWake: TimeHM;
  targetHours: number;
  minHours: number;
}

export interface Task {
  id: string;
  title: string;
  date: DateKey;
  priority: boolean;
  category: string;
  status: "pending" | "done";
  createdAt: string;
  completedAt?: string;
}

export interface FocusSession {
  id: string;
  date: DateKey;
  startedAt: string;
  minutes: number;
  plannedMinutes: number;
  label: string;
  completed: boolean;
}

export interface RoutineItem {
  id: string;
  name: string;
  /** Minutos relativos a la hora de despertar (mañana) o de acostarse (noche). */
  offset: number;
  duration: number;
}

export interface Routine {
  id: "morning" | "night";
  items: RoutineItem[];
}

export interface AppData {
  settings: Settings;
  habits: Habit[];
  habitLogs: HabitLog[];
  sleep: SleepEntry[];
  tasks: Task[];
  focus: FocusSession[];
  routines: Routine[];
}
