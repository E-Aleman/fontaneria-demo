"use client";

import { useState } from "react";
import { Check, Clock } from "lucide-react";
import { format12, formatDate, formatDuration, isValidTime } from "../_lib/dates";
import { dayStat, isDue, logId, logSet, sleepMetrics, SLEEP_STATUS_LABEL, targetsFor, validateSleepTimes } from "../_lib/logic";
import { useStore } from "../_lib/store";
import type { DateKey, SleepEntry } from "../_lib/types";
import { Badge, Button, cx, Field, Input, pctText, Select, Textarea } from "./ui";

/** Lista de hábitos de una fecha con marcado idempotente. */
export function HabitChecklist({ date, compact = false }: { date: DateKey; compact?: boolean }) {
  const { data, today, toggleHabit } = useStore();
  const logs = logSet(data.habitLogs);
  const future = date > today;
  const habits = [...data.habits].sort((a, b) => a.order - b.order);
  const due = habits.filter((h) => isDue(data.settings, h, date));
  const others = habits.filter((h) => !isDue(data.settings, h, date) && h.status === "active");
  const [showOthers, setShowOthers] = useState(false);
  const st = dayStat(data, date, logs);

  const row = (h: (typeof habits)[number], extra: boolean) => {
    const done = logs.has(logId(h.id, date));
    return (
      <li key={h.id}>
        <button
          type="button"
          disabled={future}
          onClick={() => toggleHabit(h.id, date)}
          aria-pressed={done}
          className={cx(
            "group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
            "hover:bg-zinc-100 dark:hover:bg-zinc-800/60",
          )}
        >
          <span
            className={cx(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
              done ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-600",
            )}
          >
            {done && <Check size={13} strokeWidth={3} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cx("block truncate text-sm", done ? "text-zinc-400 line-through dark:text-zinc-500" : "text-zinc-800 dark:text-zinc-200")}>
              {h.name}
            </span>
            {!compact && (
              <span className="block truncate text-[11px] text-zinc-500">
                {h.category} · {h.goal}
              </span>
            )}
          </span>
          {h.time && (
            <span className="hidden items-center gap-1 text-[11px] text-zinc-500 sm:flex">
              <Clock size={11} /> {format12(h.time)}
            </span>
          )}
          {extra && <Badge>extra</Badge>}
        </button>
      </li>
    );
  };

  return (
    <div>
      {future && <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">Fecha futura: no se puede registrar todavía.</p>}
      {due.length === 0 ? (
        <p className="px-2 py-3 text-sm text-zinc-500">
          No hay hábitos programados para este día{data.settings.flexibleSunday ? " (domingo flexible o día inactivo)" : ""}. No afecta tus rachas.
        </p>
      ) : (
        <ul className="space-y-0.5">{due.map((h) => row(h, false))}</ul>
      )}
      {others.length > 0 && (
        <div className="mt-2">
          <button type="button" className="px-2 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200" onClick={() => setShowOthers((v) => !v)}>
            {showOthers ? "Ocultar" : "Mostrar"} hábitos no programados ({others.length}) — cuentan como extra
          </button>
          {showOthers && <ul className="mt-1 space-y-0.5">{others.map((h) => row(h, true))}</ul>}
        </div>
      )}
      <p className="mt-3 px-2 text-xs text-zinc-500">
        {st.done}/{st.due} programados · {pctText(st.pct)}
        {st.extra > 0 && ` · ${st.extra} extra`}
      </p>
    </div>
  );
}

/** Formulario de registro de sueño para la noche que termina en `date`. */
export function SleepForm({ date, onSaved }: { date: DateKey; onSaved?: () => void }) {
  const { data, today, saveSleep, deleteSleep } = useStore();
  const existing = data.sleep.find((e) => e.date === date);
  const t = targetsFor(data.settings, date);
  const [bedTime, setBed] = useState(existing?.bedTime ?? "");
  const [asleepTime, setAsleep] = useState(existing?.asleepTime ?? "");
  const [wakeTime, setWake] = useState(existing?.wakeTime ?? "");
  const [quality, setQuality] = useState(existing?.quality ?? 3);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const future = date > today;
  const targets = existing
    ? { targetBed: existing.targetBed, targetWake: existing.targetWake, targetHours: existing.targetHours, minHours: existing.minHours }
    : { targetBed: t.bed, targetWake: t.wake, targetHours: data.settings.desiredSleepHours, minHours: data.settings.minSleepHours };

  const valid = isValidTime(bedTime) && isValidTime(wakeTime);
  const preview = valid && !validateSleepTimes(bedTime, wakeTime, asleepTime || undefined)
    ? sleepMetrics({ bedTime, wakeTime, asleepTime: asleepTime || undefined, ...targets })
    : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return setError("Indica hora de acostarte y de despertar.");
    const err = validateSleepTimes(bedTime, wakeTime, asleepTime || undefined);
    if (err) return setError(err);
    const entry: SleepEntry = { date, bedTime, asleepTime: asleepTime || undefined, wakeTime, quality, notes: notes.trim(), ...targets };
    await saveSleep(entry);
    setError(null);
    onSaved?.();
  };

  if (future) return <p className="text-sm text-zinc-500">No se puede registrar sueño de una fecha futura.</p>;

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-xs text-zinc-500">
        Noche que termina el <strong>{formatDate(date)}</strong>. Meta: acostarse {format12(targets.targetBed)} · despertar {format12(targets.targetWake)}
        {existing && " (metas guardadas con el registro)"}.
      </p>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Me acosté">
          <Input type="time" required value={bedTime} onChange={(e) => setBed(e.target.value)} />
        </Field>
        <Field label="Me dormí (opcional)">
          <Input type="time" value={asleepTime} onChange={(e) => setAsleep(e.target.value)} />
        </Field>
        <Field label="Desperté">
          <Input type="time" required value={wakeTime} onChange={(e) => setWake(e.target.value)} />
        </Field>
      </div>
      <Field label="Calidad subjetiva">
        <Select value={quality} onChange={(e) => setQuality(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((q) => (
            <option key={q} value={q}>
              {q} — {["Muy mala", "Mala", "Regular", "Buena", "Excelente"][q - 1]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Observaciones">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Desvelo, cafeína, ruido…" />
      </Field>
      {preview && (
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-3 text-xs dark:bg-zinc-800/60">
          <div>
            Tiempo en cama: <strong>{formatDuration(preview.inBedMin)}</strong>
          </div>
          <div>
            Sueño estimado: <strong>{formatDuration(preview.sleepMin)}</strong>
            {!preview.hasAsleep && <span className="text-zinc-500"> (sin latencia)</span>}
          </div>
          <div>
            Despertar vs meta: <strong>{preview.wakeDiff > 0 ? "+" : ""}{preview.wakeDiff} min</strong>
          </div>
          <div>
            <Badge tone={preview.goalMet ? "emerald" : preview.enough ? "amber" : "rose"}>{SLEEP_STATUS_LABEL[preview.status]}</Badge>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-rose-500">{error}</p>}
      <div className="flex justify-between gap-2">
        {existing ? (
          <Button
            variant="danger"
            onClick={async () => {
              if (confirm("¿Eliminar este registro de sueño?")) {
                await deleteSleep(date);
                onSaved?.();
              }
            }}
          >
            Eliminar
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" variant="primary">
          {existing ? "Actualizar" : "Guardar"} registro
        </Button>
      </div>
    </form>
  );
}
