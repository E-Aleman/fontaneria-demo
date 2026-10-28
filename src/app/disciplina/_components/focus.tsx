"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Info, Pause, Play, Smartphone, Square, Trash2 } from "lucide-react";
import { addDays, dateKeyInTz, formatShort, rangeKeys } from "../_lib/dates";
import { uid } from "../_lib/defaults";
import { focusMinutesOn, habitStats, isDue, logId, logSet, programEnd } from "../_lib/logic";
import { useStore } from "../_lib/store";
import { Badge, Button, Card, cx, Field, Input, PageHeader, pctText, Progress, Ring } from "./ui";

const TIMER_KEY = "disciplina-430-timer";
const PRESETS = [25, 50, 90];

interface TimerState {
  startedAt: number;
  plannedMin: number;
  label: string;
  /** Fin previsto (ms) mientras corre; null si está en pausa. */
  endAt: number | null;
  remainingMs: number;
}

function loadTimer(): TimerState | null {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    return raw ? (JSON.parse(raw) as TimerState) : null;
  } catch {
    return null;
  }
}

function storeTimer(t: TimerState | null) {
  try {
    if (t) localStorage.setItem(TIMER_KEY, JSON.stringify(t));
    else localStorage.removeItem(TIMER_KEY);
  } catch {
    /* almacenamiento no disponible: el temporizador sigue en memoria */
  }
}

function FocusTimer() {
  const { data, saveFocus } = useStore();
  // Este componente solo se monta en el cliente (tras cargar IndexedDB).
  const [timer, setTimer] = useState<TimerState | null>(loadTimer);
  const [planned, setPlanned] = useState(25);
  const [label, setLabel] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const finishing = useRef(false);
  const tz = data.settings.timezone;

  const update = (t: TimerState | null) => {
    setNowMs(Date.now());
    setTimer(t);
    storeTimer(t);
  };

  const remaining = timer ? (timer.endAt ? Math.max(0, timer.endAt - nowMs) : timer.remainingMs) : planned * 60_000;

  const finish = useCallback(
    async (t: TimerState, completed: boolean) => {
      const elapsedMs = t.plannedMin * 60_000 - (t.endAt ? Math.max(0, t.endAt - Date.now()) : t.remainingMs);
      const minutes = completed ? t.plannedMin : Math.floor(elapsedMs / 60_000);
      update(null);
      if (minutes >= 1) {
        await saveFocus({
          id: uid("f"),
          date: dateKeyInTz(new Date(t.startedAt), tz),
          startedAt: new Date(t.startedAt).toISOString(),
          minutes,
          plannedMinutes: t.plannedMin,
          label: t.label,
          completed,
        });
      }
      if (completed && typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Sesión de enfoque completada", { body: `${minutes} min registrados. Toma una pausa breve.` });
      }
    },
    [saveFocus, tz],
  );

  useEffect(() => {
    if (!timer?.endAt) return;
    const i = setInterval(() => {
      const t = Date.now();
      setNowMs(t);
      if (timer.endAt && t >= timer.endAt && !finishing.current) {
        finishing.current = true;
        finish(timer, true).finally(() => (finishing.current = false));
      }
    }, 500);
    return () => clearInterval(i);
  }, [timer, finish]);

  const mm = Math.floor(remaining / 60_000);
  const ss = Math.floor((remaining % 60_000) / 1000);
  const progress = timer ? 1 - remaining / (timer.plannedMin * 60_000) : 0;

  return (
    <Card title="Temporizador de concentración" subtitle="Una tarea, un bloque. Deja el celular en otra habitación.">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <Ring value={progress} size={168} stroke={10} label={<span className="text-3xl">{`${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`}</span>} sub={timer ? (timer.endAt ? "en curso" : "en pausa") : "listo"} />
        <div className="w-full flex-1 space-y-3">
          {!timer ? (
            <>
              <Field label="¿En qué trabajarás?">
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej. Capítulo 3 del informe" />
              </Field>
              <div className="flex flex-wrap items-end gap-2">
                {PRESETS.map((p) => (
                  <Button key={p} size="sm" variant={planned === p ? "primary" : "secondary"} onClick={() => setPlanned(p)}>
                    {p} min
                  </Button>
                ))}
                <Field label="Personalizado" className="w-28">
                  <Input type="number" min={1} max={240} value={planned} onChange={(e) => setPlanned(Math.min(240, Math.max(1, Number(e.target.value) || 1)))} />
                </Field>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  const now = Date.now();
                  update({ startedAt: now, plannedMin: planned, label: label.trim(), endAt: now + planned * 60_000, remainingMs: planned * 60_000 });
                }}
              >
                <Play size={16} /> Iniciar
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{timer.label || "Sesión sin etiqueta"} · {timer.plannedMin} min</p>
              <div className="flex flex-wrap gap-2">
                {timer.endAt ? (
                  <Button onClick={() => update({ ...timer, endAt: null, remainingMs: Math.max(0, timer.endAt! - Date.now()) })}>
                    <Pause size={16} /> Pausar
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => update({ ...timer, endAt: Date.now() + timer.remainingMs })}>
                    <Play size={16} /> Reanudar
                  </Button>
                )}
                <Button onClick={() => finish(timer, false)}>
                  <Square size={14} /> Terminar y guardar
                </Button>
                <Button variant="danger" onClick={() => confirm("¿Descartar esta sesión sin registrarla?") && update(null)}>
                  Descartar
                </Button>
              </div>
              <p className="text-xs text-zinc-500">Si terminas antes, se registran los minutos completos transcurridos.</p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function NotificationsCard() {
  const [perm, setPerm] = useState<string>(() => (typeof Notification === "undefined" ? "unsupported" : Notification.permission));
  return (
    <Card title={<span className="flex items-center gap-2"><Bell size={15} /> Aviso al terminar</span>}>
      <p className="text-xs text-zinc-500">
        Opcional. El navegador solo puede avisar mientras esta pestaña siga abierta; no funciona con el navegador cerrado ni reemplaza una alarma.
      </p>
      <div className="mt-3">
        {perm === "unsupported" ? (
          <Badge>No disponible en este navegador</Badge>
        ) : perm === "granted" ? (
          <Badge tone="emerald">Notificaciones permitidas</Badge>
        ) : perm === "denied" ? (
          <Badge tone="rose">Bloqueadas: habilítalas en la configuración del navegador</Badge>
        ) : (
          <Button size="sm" onClick={async () => setPerm(await Notification.requestPermission())}>
            Solicitar permiso
          </Button>
        )}
      </div>
    </Card>
  );
}

function DigitalControl() {
  const { data, today, toggleHabit } = useStore();
  const s = data.settings;
  const tracked = data.habits.filter((h) => h.key === "digital_close" || h.key === "no_social");
  const logs = logSet(data.habitLogs);
  const days = rangeKeys(addDays(today, -13), today);
  const stats = habitStats(data, s.startDate, programEnd(s), today).filter((st) => tracked.includes(st.habit));
  return (
    <Card title={<span className="flex items-center gap-2"><Smartphone size={15} /> Control del celular</span>} subtitle="Autorreporte de los hábitos de cierre digital y mañana sin redes">
      <p className="mb-3 flex gap-2 rounded-lg bg-zinc-100 p-2 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400">
        <Info size={14} className="mt-0.5 shrink-0" />
        Una aplicación web no puede medir el uso de tu celular ni bloquear otras apps. Para eso usa las herramientas del sistema (Bienestar digital / Tiempo en pantalla) y registra aquí tu cumplimiento.
      </p>
      {tracked.length === 0 ? (
        <p className="text-sm text-zinc-500">Los hábitos de cierre digital fueron eliminados. Puedes crear uno nuevo en Hábitos.</p>
      ) : (
        <div className="space-y-4">
          {tracked.map((h) => {
            const st = stats.find((x) => x.habit.id === h.id);
            return (
              <div key={h.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-zinc-800 dark:text-zinc-200">{h.name}</span>
                  <span className="text-xs tabular-nums text-zinc-500">{pctText(st?.pct ?? null)} · racha {st?.streak.current ?? 0}</span>
                </div>
                <div className="grid grid-cols-7 gap-1 sm:grid-cols-[repeat(14,minmax(0,1fr))]">
                  {days.map((d) => {
                    const due = isDue(s, h, d);
                    const done = logs.has(logId(h.id, d));
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleHabit(h.id, d)}
                        title={`${formatShort(d)}${due ? "" : " (no programado)"}`}
                        className={cx(
                          "rounded-md py-1 text-[10px] tabular-nums transition",
                          done ? "bg-emerald-500 text-white" : due ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" : "border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700",
                        )}
                      >
                        {Number(d.slice(8))}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function Focus() {
  const { data, today, deleteFocus } = useStore();
  const goal = data.settings.focusGoalMinutes;
  const mins = focusMinutesOn(data, today);
  const sessions = data.focus.filter((f) => f.date === today).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return (
    <div className="space-y-5">
      <PageHeader title="Enfoque" description="Bloques de trabajo profundo y seguimiento honesto del celular." />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <FocusTimer />
          <DigitalControl />
        </div>
        <div className="space-y-5">
          <Card title="Meta diaria">
            <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {mins} <span className="text-sm font-normal text-zinc-500">/ {goal} min</span>
            </p>
            <div className="mt-2">
              <Progress value={goal ? mins / goal : null} tone="emerald" />
            </div>
            <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">Sesiones de hoy</h3>
            {sessions.length === 0 ? (
              <p className="text-sm text-zinc-500">Aún no hay sesiones.</p>
            ) : (
              <ul className="space-y-1.5">
                {sessions.map((f) => (
                  <li key={f.id} className="group flex items-center gap-2 text-sm">
                    <span className="w-14 tabular-nums text-xs text-zinc-500">{new Date(f.startedAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", timeZone: data.settings.timezone })}</span>
                    <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-200">{f.label || "Sin etiqueta"}</span>
                    <Badge tone={f.completed ? "emerald" : "amber"}>{f.minutes} min</Badge>
                    <button type="button" aria-label="Eliminar sesión" onClick={() => confirm("¿Eliminar esta sesión?") && deleteFocus(f.id)} className="text-zinc-400 hover:text-rose-500">
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <NotificationsCard />
        </div>
      </div>
    </div>
  );
}
