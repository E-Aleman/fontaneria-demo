"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlarmClock, BedDouble, CalendarDays, Flame, Moon, Sparkles, Target, Trophy } from "lucide-react";
import { addDays, format12, formatDate, formatDuration, formatShort, minutesInTz, minutesToTime, timeToMinutes } from "../_lib/dates";
import {
  dailyRows,
  dayStat,
  dayStreak,
  focusMinutesOn,
  messageFor,
  programDay,
  programEnd,
  programWeek,
  rangeStat,
  sleepMetrics,
  sleepSummary,
  sleepInRange,
  SLEEP_STATUS_LABEL,
  targetsFor,
  weekStartFor,
} from "../_lib/logic";
import { useStore } from "../_lib/store";
import { HabitChecklist } from "./shared";
import { Badge, Card, Kpi, pctText, Progress, Ring } from "./ui";
import { ChartTooltip, useChartColors } from "./charts";

export function Dashboard({ go }: { go: (v: string) => void }) {
  const { data, today, now } = useStore();
  const s = data.settings;
  const day = programDay(s, today);
  const week = programWeek(s, today);
  const tToday = targetsFor(s, today);
  const tTonight = targetsFor(s, addDays(today, 1));
  const st = dayStat(data, today);
  const weekFrom = week ? weekStartFor(s, week) : today;
  const weekStat = week ? rangeStat(data, weekFrom, addDays(weekFrom, 6), today) : null;
  const streak = dayStreak(data, today);
  const lastSleep = data.sleep.find((e) => e.date === today);
  const lastMetrics = lastSleep ? sleepMetrics(lastSleep) : null;
  const sleep7 = sleepSummary(sleepInRange(data.sleep, addDays(today, -6), today));
  const focusToday = focusMinutesOn(data, today);
  const c = useChartColors();

  const chart = useMemo(() => {
    const from = addDays(today, -13);
    return dailyRows(data, from, today, today).map((r) => ({
      label: formatShort(r.date),
      pct: r.pct === null ? null : Math.round(r.pct * 100),
    }));
  }, [data, today]);

  // Próximas actividades: rutina de hoy posterior a la hora actual + prioridades pendientes.
  const nowMin = minutesInTz(now, s.timezone);
  const upcoming = useMemo(() => {
    const items: Array<{ time: number; name: string; kind: string }> = [];
    const morning = data.routines.find((r) => r.id === "morning");
    const night = data.routines.find((r) => r.id === "night");
    const wake = timeToMinutes(tToday.wake);
    const bed = timeToMinutes(tTonight.bed);
    morning?.items.forEach((i) => items.push({ time: wake + i.offset, name: i.name, kind: "Mañana" }));
    night?.items.forEach((i) => items.push({ time: bed + i.offset, name: i.name, kind: "Noche" }));
    return items.filter((i) => i.time >= nowMin).sort((a, b) => a.time - b.time).slice(0, 5);
  }, [data.routines, tToday.wake, tTonight.bed, nowMin]);
  const priorities = data.tasks.filter((t) => t.date === today && t.priority && t.status === "pending");

  const notStarted = today < s.startDate;
  const finished = today > programEnd(s);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{formatDate(today)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {notStarted
              ? `El programa comienza el ${formatDate(s.startDate, false)}`
              : finished
                ? "Programa de 90 días completado"
                : `Día ${day} de ${s.durationDays}`}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <Sparkles size={14} className="text-indigo-500" /> {messageFor(today)}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="indigo">{week ? `Semana ${week} · ${tToday.label}` : notStarted ? "Preparación" : "Fuera del programa"}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Cumplimiento semanal"
          icon={<CalendarDays size={15} />}
          value={pctText(weekStat?.pct ?? null)}
          sub={weekStat ? `${weekStat.done}/${weekStat.due} hábitos programados` : "Sin semana activa"}
        />
        <Kpi label="Racha actual" icon={<Flame size={15} />} value={`${streak.current} d`} sub={`Mejor racha: ${streak.best} d · umbral ${s.streakThreshold}%`} />
        <Kpi
          label="Objetivo de horario"
          icon={<AlarmClock size={15} />}
          value={format12(tToday.wake)}
          sub={`Despertar hoy · acostarse esta noche ${format12(tTonight.bed)}`}
        />
        <Kpi
          label="Sueño de anoche"
          icon={<BedDouble size={15} />}
          tone={lastMetrics ? (lastMetrics.enough ? "good" : "warn") : "default"}
          value={lastMetrics ? formatDuration(lastMetrics.sleepMin) : "—"}
          sub={lastMetrics ? `${SLEEP_STATUS_LABEL[lastMetrics.status]} · cama ${formatDuration(lastMetrics.inBedMin)}` : "Sin registro de hoy"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Hábitos de hoy" subtitle="Marca y desmarca; un registro por hábito y fecha" className="lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-row items-center gap-4 sm:flex-col">
              <Ring value={st.pct} size={112} sub="hoy" />
              <p className="text-xs text-zinc-500 sm:text-center">
                {st.done} de {st.due}
                <br />
                completados
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <HabitChecklist date={today} />
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Próximas actividades" action={<button className="text-xs text-indigo-500 hover:underline" onClick={() => go("routines")}>Rutinas</button>}>
            {upcoming.length === 0 && priorities.length === 0 ? (
              <p className="text-sm text-zinc-500">Nada pendiente por hoy. Descansa.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((u, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-16 shrink-0 tabular-nums text-xs text-zinc-500">{format12(minutesToTime(u.time))}</span>
                    <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-200">{u.name}</span>
                    <Badge>{u.kind}</Badge>
                  </li>
                ))}
                {priorities.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 text-sm">
                    <Target size={14} className="w-16 shrink-0 text-indigo-500" />
                    <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-200">{t.title}</span>
                    <Badge tone="indigo">Prioridad</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Sueño · últimos 7 días" action={<button className="text-xs text-indigo-500 hover:underline" onClick={() => go("sleep")}>Registrar</button>}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-zinc-500">Promedio estimado</p>
                <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{sleep7.avgSleepMin === null ? "—" : formatDuration(sleep7.avgSleepMin)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Meta cumplida</p>
                <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{pctText(sleep7.goalPct)}</p>
              </div>
            </div>
            {sleep7.avgSleepMin !== null && sleep7.avgSleepMin < s.minSleepHours * 60 && (
              <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <Moon size={14} className="shrink-0" /> Tu promedio está por debajo de {s.minSleepHours} h. Considera repetir la semana de adaptación en Configuración.
              </p>
            )}
          </Card>

          <Card title="Enfoque de hoy">
            <div className="flex items-center justify-between text-sm">
              <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
                {focusToday} / {s.focusGoalMinutes} min
              </span>
              <button className="text-xs text-indigo-500 hover:underline" onClick={() => go("focus")}>
                Iniciar sesión
              </button>
            </div>
            <div className="mt-2">
              <Progress value={s.focusGoalMinutes ? focusToday / s.focusGoalMinutes : null} tone="emerald" />
            </div>
          </Card>
        </div>
      </div>

      <Card title="Cumplimiento diario · últimos 14 días" subtitle="Días sin hábitos programados (domingos flexibles) aparecen vacíos" action={<Trophy size={15} className="text-zinc-400" />}>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={c.grid} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: c.cursor }} content={<ChartTooltip unit="%" />} />
              <Bar dataKey="pct" name="Cumplimiento" fill={c.primary} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
