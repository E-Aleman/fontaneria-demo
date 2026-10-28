"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { formatShort, minKey, rangeKeys } from "../_lib/dates";
import { dailyCsv, downloadText, toCsv } from "../_lib/backup";
import { dailyRows, dayStreak, habitStats, isDue, logId, logSet, monthlyRows, programEnd, sleepSummary, sleepInRange, weeklyRows } from "../_lib/logic";
import { useStore } from "../_lib/store";
import { ChartTooltip, useChartColors } from "./charts";
import { Button, Card, Field, Input, Kpi, PageHeader, pctText, Progress } from "./ui";

const pct100 = (p: number | null) => (p === null ? null : Math.round(p * 100));

export function Stats() {
  const { data, today } = useStore();
  const s = data.settings;
  const c = useChartColors();
  const [from, setFrom] = useState(s.startDate);
  const [to, setTo] = useState(minKey(programEnd(s), today) < s.startDate ? programEnd(s) : minKey(programEnd(s), today));

  const rows = useMemo(() => dailyRows(data, from, to, today), [data, from, to, today]);
  const habits = useMemo(() => habitStats(data, from, to, today), [data, from, to, today]);
  const weekly = weeklyRows(s, rows);
  const monthly = monthlyRows(rows);
  const streak = dayStreak(data, today);
  const due = rows.reduce((a, r) => a + r.due, 0);
  const done = rows.reduce((a, r) => a + r.done, 0);
  const focusTotal = rows.reduce((a, r) => a + r.focusMin, 0);
  const sleep = sleepSummary(sleepInRange(data.sleep, from, minKey(to, today)));

  const daily = rows.map((r) => ({
    label: formatShort(r.date),
    pct: pct100(r.pct),
    sleep: r.sleepMin === null ? null : Math.round((r.sleepMin / 60) * 10) / 10,
    bed: r.inBedMin === null ? null : Math.round((r.inBedMin / 60) * 10) / 10,
    focus: r.focusMin,
  }));

  const exportDaily = () => downloadText(`disciplina-diario-${from}_${to}.csv`, dailyCsv(rows), "text/csv;charset=utf-8");
  const exportHabits = () => {
    const logs = logSet(data.habitLogs);
    const end = minKey(to, today);
    const out: unknown[][] = [];
    for (const d of end < from ? [] : rangeKeys(from, end)) {
      for (const h of data.habits) {
        const isDueDay = isDue(s, h, d);
        const isDone = logs.has(logId(h.id, d));
        if (isDueDay || isDone) out.push([d, h.name, h.category, isDueDay ? 1 : 0, isDone ? 1 : 0]);
      }
    }
    downloadText(`disciplina-habitos-${from}_${to}.csv`, toCsv(["fecha", "habito", "categoria", "programado", "completado"], out), "text/csv;charset=utf-8");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Estadísticas"
        description="Porcentajes = completados / programados en el rango, hasta hoy. Días futuros y domingos flexibles no cuentan."
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={exportDaily}>
              <Download size={14} /> CSV diario
            </Button>
            <Button size="sm" onClick={exportHabits}>
              <Download size={14} /> CSV hábitos
            </Button>
          </div>
        }
      />
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Desde">
            <Input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </Field>
          <Field label="Hasta">
            <Input type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} />
          </Field>
          <Button size="sm" variant="ghost" onClick={() => { setFrom(s.startDate); setTo(programEnd(s)); }}>
            Programa completo
          </Button>
          {from > to && <p className="text-xs text-rose-500">El rango es inválido.</p>}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Cumplimiento del rango" value={pctText(due ? done / due : null)} sub={`${done}/${due} hábitos programados`} />
        <Kpi label="Racha actual / mejor" value={`${streak.current} / ${streak.best}`} sub="Días del programa" />
        <Kpi label="Sueño promedio" value={sleep.avgSleepMin === null ? "—" : `${(sleep.avgSleepMin / 60).toFixed(1)} h`} sub={`${sleep.count} noches · meta cumplida ${pctText(sleep.goalPct)}`} />
        <Kpi label="Horas de enfoque" value={`${(focusTotal / 60).toFixed(1)} h`} sub={`${rows.length ? Math.round(focusTotal / rows.length) : 0} min/día promedio`} />
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-500">No hay días transcurridos en el rango seleccionado. Las estadísticas aparecerán con tus primeros registros.</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Tendencia diaria de cumplimiento">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={c.grid} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip unit="%" />} />
                    <ReferenceLine y={s.streakThreshold} stroke={c.muted} strokeDasharray="4 4" />
                    <Line dataKey="pct" name="Cumplimiento" stroke={c.primary} strokeWidth={2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Cumplimiento semanal (semanas del programa)">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly.map((w) => ({ label: w.label, pct: pct100(w.pct) }))} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={c.grid} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: c.cursor }} content={<ChartTooltip unit="%" />} />
                    <Bar dataKey="pct" name="Cumplimiento" fill={c.primary} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Evolución del sueño" subtitle="Horas estimadas y tiempo en cama">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={c.grid} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis domain={[0, 12]} tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip unit=" h" />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={s.minSleepHours} stroke={c.warn} strokeDasharray="4 4" />
                    <Line dataKey="bed" name="En cama" stroke={c.muted} strokeWidth={1.5} dot={false} connectNulls />
                    <Line dataKey="sleep" name="Sueño estimado" stroke={c.primary} strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Minutos de enfoque por día">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={c.grid} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: c.cursor }} content={<ChartTooltip unit=" min" />} />
                    <ReferenceLine y={s.focusGoalMinutes} stroke={c.muted} strokeDasharray="4 4" />
                    <Bar dataKey="focus" name="Enfoque" fill={c.secondary} radius={[3, 3, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card title="Cumplimiento por hábito" className="lg:col-span-2">
              <ul className="space-y-3">
                {habits.map((h) => (
                  <li key={h.habit.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-zinc-800 dark:text-zinc-200">{h.habit.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                        {h.done}/{h.due} · {pctText(h.pct)} · racha {h.streak.current} (mejor {h.streak.best})
                      </span>
                    </div>
                    <Progress value={h.pct} />
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Mensual">
              <ul className="space-y-3">
                {monthly.map((m) => (
                  <li key={m.key}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-zinc-800 dark:text-zinc-200">{m.label}</span>
                      <span className="text-xs tabular-nums text-zinc-500">
                        {pctText(m.pct)} · {(m.focusMin / 60).toFixed(1)} h enfoque
                      </span>
                    </div>
                    <Progress value={m.pct} tone="emerald" />
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
