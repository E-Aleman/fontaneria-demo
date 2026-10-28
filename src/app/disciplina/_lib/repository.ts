// Capa de acceso a datos. La UI solo depende de la interfaz `Repository`;
// para migrar a una base de datos remota basta con otra implementación.
import { openDB, type IDBPDatabase } from "idb";
import { defaultData } from "./defaults";
import type { AppData, Habit, HabitLog, Routine, Settings, SleepEntry, Task, FocusSession } from "./types";

export interface Repository {
  load(): Promise<AppData>;
  saveSettings(s: Settings): Promise<void>;
  saveHabit(h: Habit): Promise<void>;
  deleteHabit(id: string): Promise<void>;
  setHabitLog(log: HabitLog, done: boolean): Promise<void>;
  saveSleep(e: SleepEntry): Promise<void>;
  deleteSleep(date: string): Promise<void>;
  saveTask(t: Task): Promise<void>;
  deleteTask(id: string): Promise<void>;
  saveFocus(f: FocusSession): Promise<void>;
  deleteFocus(id: string): Promise<void>;
  saveRoutine(r: Routine): Promise<void>;
  replaceAll(data: AppData): Promise<void>;
}

const DB_NAME = "disciplina-430";
const DB_VERSION = 1;
const STORES = ["settings", "habits", "habitLogs", "sleep", "tasks", "focus", "routines"] as const;
type StoreName = (typeof STORES)[number];

const KEY_PATH: Record<StoreName, string> = {
  settings: "id",
  habits: "id",
  habitLogs: "id",
  sleep: "date",
  tasks: "id",
  focus: "id",
  routines: "id",
};

export class IndexedDbRepository implements Repository {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  private db() {
    this.dbPromise ??= openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: KEY_PATH[name] });
        }
      },
    });
    return this.dbPromise;
  }

  async load(): Promise<AppData> {
    const db = await this.db();
    const settings = (await db.get("settings", "settings")) as Settings | undefined;
    if (!settings) {
      // Primera ejecución: sembrar datos iniciales (sin registros simulados).
      const seed = defaultData();
      await this.replaceAll(seed);
      return seed;
    }
    const [habits, habitLogs, sleep, tasks, focus, routines] = await Promise.all([
      db.getAll("habits"),
      db.getAll("habitLogs"),
      db.getAll("sleep"),
      db.getAll("tasks"),
      db.getAll("focus"),
      db.getAll("routines"),
    ]);
    const defaults = defaultData();
    return {
      settings: { ...defaults.settings, ...settings },
      habits,
      habitLogs,
      sleep,
      tasks,
      focus,
      routines: routines.length ? routines : defaults.routines,
    };
  }

  private async put(store: StoreName, value: unknown) {
    await (await this.db()).put(store, value);
  }

  private async del(store: StoreName, key: string) {
    await (await this.db()).delete(store, key);
  }

  saveSettings = (s: Settings) => this.put("settings", s);
  saveHabit = (h: Habit) => this.put("habits", h);
  saveSleep = (e: SleepEntry) => this.put("sleep", e);
  deleteSleep = (date: string) => this.del("sleep", date);
  saveTask = (t: Task) => this.put("tasks", t);
  deleteTask = (id: string) => this.del("tasks", id);
  saveFocus = (f: FocusSession) => this.put("focus", f);
  deleteFocus = (id: string) => this.del("focus", id);
  saveRoutine = (r: Routine) => this.put("routines", r);

  async setHabitLog(log: HabitLog, done: boolean) {
    // La clave `${habitId}|${date}` impide duplicados: marcar = put idempotente.
    if (done) await this.put("habitLogs", log);
    else await this.del("habitLogs", log.id);
  }

  async deleteHabit(id: string) {
    const db = await this.db();
    const tx = db.transaction(["habits", "habitLogs"], "readwrite");
    await tx.objectStore("habits").delete(id);
    const logs = tx.objectStore("habitLogs");
    let cursor = await logs.openCursor();
    while (cursor) {
      if ((cursor.value as HabitLog).habitId === id) await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  }

  async replaceAll(data: AppData) {
    const db = await this.db();
    const tx = db.transaction([...STORES], "readwrite");
    for (const name of STORES) await tx.objectStore(name).clear();
    const put = (name: StoreName, items: unknown[]) => items.map((i) => tx.objectStore(name).put(i));
    await Promise.all([
      ...put("settings", [data.settings]),
      ...put("habits", data.habits),
      ...put("habitLogs", data.habitLogs),
      ...put("sleep", data.sleep),
      ...put("tasks", data.tasks),
      ...put("focus", data.focus),
      ...put("routines", data.routines),
    ]);
    await tx.done;
  }
}
