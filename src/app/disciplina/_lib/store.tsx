"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { addDays, dateKeyInTz, DEFAULT_TZ } from "./dates";
import { logId } from "./logic";
import { IndexedDbRepository, type Repository } from "./repository";
import type { AppData, DateKey, FocusSession, Habit, Routine, Settings, SleepEntry, Task } from "./types";

interface Store {
  data: AppData;
  today: DateKey;
  now: Date;
  saveSettings(s: Settings): Promise<void>;
  saveHabit(h: Habit): Promise<void>;
  deleteHabit(id: string): Promise<void>;
  toggleHabit(habitId: string, date: DateKey, done?: boolean): Promise<void>;
  saveSleep(e: SleepEntry): Promise<void>;
  deleteSleep(date: DateKey): Promise<void>;
  saveTask(t: Task): Promise<void>;
  deleteTask(id: string): Promise<void>;
  saveFocus(f: FocusSession): Promise<void>;
  deleteFocus(id: string): Promise<void>;
  saveRoutine(r: Routine): Promise<void>;
  replaceAll(d: AppData): Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore fuera de StoreProvider");
  return s;
}

const upsert = <T,>(list: T[], item: T, key: (x: T) => string) => {
  const k = key(item);
  const i = list.findIndex((x) => key(x) === k);
  return i === -1 ? [...list, item] : list.map((x, j) => (j === i ? item : x));
};

export function StoreProvider({
  children,
  fallback,
  repo: repoProp,
}: {
  children: ReactNode;
  fallback: ReactNode;
  repo?: Repository;
}) {
  const [repo] = useState<Repository>(() => repoProp ?? new IndexedDbRepository());
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    repo.load().then(setData, (e) => setError(String(e?.message ?? e)));
  }, [repo]);

  // Reloj: actualiza "hoy" al cambiar de día y las próximas actividades.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const run = useCallback(
    async (update: (d: AppData) => AppData, persist: () => Promise<void>) => {
      setData((d) => (d ? update(d) : d));
      try {
        await persist();
      } catch (e) {
        alert(`No se pudo guardar: ${e instanceof Error ? e.message : e}`);
        setData(await repo.load());
      }
    },
    [repo],
  );

  const store = useMemo<Store | null>(() => {
    if (!data) return null;
    const today = dateKeyInTz(now, data.settings.timezone || DEFAULT_TZ);
    return {
      data,
      today,
      now,
      saveSettings: (s) => run((d) => ({ ...d, settings: s }), () => repo.saveSettings(s)),
      saveHabit: (h) => run((d) => ({ ...d, habits: upsert(d.habits, h, (x) => x.id) }), () => repo.saveHabit(h)),
      deleteHabit: (id) =>
        run(
          (d) => ({ ...d, habits: d.habits.filter((h) => h.id !== id), habitLogs: d.habitLogs.filter((l) => l.habitId !== id) }),
          () => repo.deleteHabit(id),
        ),
      toggleHabit: (habitId, date, done) => {
        const id = logId(habitId, date);
        const exists = data.habitLogs.some((l) => l.id === id);
        const target = done ?? !exists;
        if (target === exists) return Promise.resolve();
        const log = { id, habitId, date };
        return run(
          (d) => ({
            ...d,
            habitLogs: target ? upsert(d.habitLogs, log, (x) => x.id) : d.habitLogs.filter((l) => l.id !== id),
          }),
          () => repo.setHabitLog(log, target),
        );
      },
      saveSleep: (e) => run((d) => ({ ...d, sleep: upsert(d.sleep, e, (x) => x.date) }), () => repo.saveSleep(e)),
      deleteSleep: (date) => run((d) => ({ ...d, sleep: d.sleep.filter((e) => e.date !== date) }), () => repo.deleteSleep(date)),
      saveTask: (t) => run((d) => ({ ...d, tasks: upsert(d.tasks, t, (x) => x.id) }), () => repo.saveTask(t)),
      deleteTask: (id) => run((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }), () => repo.deleteTask(id)),
      saveFocus: (f) => run((d) => ({ ...d, focus: upsert(d.focus, f, (x) => x.id) }), () => repo.saveFocus(f)),
      deleteFocus: (id) => run((d) => ({ ...d, focus: d.focus.filter((f) => f.id !== id) }), () => repo.deleteFocus(id)),
      saveRoutine: (r) => run((d) => ({ ...d, routines: upsert(d.routines, r, (x) => x.id) }), () => repo.saveRoutine(r)),
      replaceAll: (nd) => run(() => nd, () => repo.replaceAll(nd)),
    };
  }, [data, now, repo, run]);

  if (error) {
    return (
      <div className="p-8 text-sm text-red-400">
        No se pudo abrir la base de datos local (IndexedDB): {error}. Verifica que el navegador no esté en modo
        privado restringido.
      </div>
    );
  }
  if (!store) return <>{fallback}</>;
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export const tomorrowOf = (d: DateKey) => addDays(d, 1);
