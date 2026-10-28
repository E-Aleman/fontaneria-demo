"use client";

import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { addDays, format12, formatDate, formatDuration, formatShort, rangeKeys } from "../_lib/dates";
import { sleepInRange, sleepMetrics, sleepSummary, SLEEP_STATUS_LABEL } from "../_lib/logic";
import { useStore } from "../_lib/store";
import { SleepForm } from "./shared";
import { ChartTooltip, useChartColors } from "./charts";
import { Badge, Button, Card, Empty, Input, Kpi, PageHeader, pctText } from "./ui";

const signed = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : ""}${Math.round(n)} min`);

export function Sleep() {
  const { data, today } = useStore();
  const [date, setDate] = useState(today);
  const [saved, setSaved] = useState(0);
  const c = useChartColors();
  const s = data.settings;
  const w7 = sleepSummary(sleepInRange(data.sleep, addDays(today, -6), today));
  const w30 = sleepSummary(sleepInRange(data.sleep, addDays(today, -29), today));

  const chart = useMemo(() => {
    const byDate = new Map(data.sleep.map((e) => [e.date, e]));
    return rangeKeys(addDays(today, -27), today).map((d) => {
      const e = byDate.get(d);
      const m = e ? sleepMetrics(e) : null;
      return {
        label: formatShort(d),
        sleep: m ? Math.round((m.sleepMin / 60) * 10) / 10 : null,
        bed: m ? Math.round((m.inBedMin / 60) * 10) / 10 : null,
      };
    });
  }, [data.sleep, today]);

  const entries = [...data.sleep].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5">
      <PageHeader title="Sueño" description="El sueño estimado usa la hora de dormirte si la conoces; si no, equivale al tiempo en cama." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Promedio 7 días" value={w7.avgSleepMin === null ? "—" : formatDuration(w7.avgSleepMin)} sub={`${w7.count} registros · cama ${w7.avgInBedMin === null ? "—" : formatDuration(w7.avgInBedMin)}`} tone={w7.avgSleepMin === null ? "default" : w7.avgSleepMin >= s.minSleepHours * 60 ? "good" : "warn"} />
        <Kpi label="Promedio 30 días" value={w30.avgSleepMin === null ? "—" : formatDuration(w30.avgSleepMin)} sub={`${w30.count} registros`} />
        <Kpi label="Meta cumplida (7 d)" value={pctText(w7.goalPct)} sub="A tiempo y con descanso suficiente" />
        <Kpi label="Despertar vs meta (7 d)" value={signed(w7.avgWakeDiff)} sub="Promedio; negativo = antes" />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card title="Registrar noche" className="lg:col-span-2" subtitle="Selecciona la fecha en que despertaste">
          <div className="mb-3 flex gap-2">
            <Input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
            <Button onClick={() => setDate(today)}>Hoy</Button>
          </div>
          <SleepForm key={`${date}-${saved}`} date={date} onSaved={() => setSaved((n) => n + 1)} />
        </Card>
        <Card title="Tendencia · 28 días" className="lg:col-span-3" subtitle={`Línea punteada: mínimo saludable (${s.minSleepHours} h) · meta ${s.desiredSleepHours} h`}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={c.grid} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 12]} tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: c.cursor }} content={<ChartTooltip unit=" h" />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="bed" name="Tiempo en cama" fill={c.muted} radius={[3, 3, 0, 0]} maxBarSize={16} />
                <Line dataKey="sleep" name="Sueño estimado" stroke={c.primary} strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
                <ReferenceLine y={s.minSleepHours} stroke={c.warn} strokeDasharray="4 4" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Historial">
        {entries.length === 0 ? (
          <Empty>Aún no hay registros de sueño.</Empty>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500">
                  <th className="px-4 py-2 font-medium sm:px-2">Fecha</th>
                  <th className="px-2 py-2 font-medium">Acostarse</th>
                  <th className="px-2 py-2 font-medium">Despertar</th>
                  <th className="px-2 py-2 font-medium">En cama</th>
                  <th className="px-2 py-2 font-medium">Sueño</th>
                  <th className="px-2 py-2 font-medium">Vs meta</th>
                  <th className="px-2 py-2 font-medium">Calidad</th>
                  <th className="px-2 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const m = sleepMetrics(e);
                  return (
                    <tr key={e.date} className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40" onClick={() => setDate(e.date)} title={e.notes}>
                      <td className="px-4 py-2 sm:px-2">{formatDate(e.date)}</td>
                      <td className="px-2 py-2 tabular-nums">{format12(e.bedTime)}</td>
                      <td className="px-2 py-2 tabular-nums">{format12(e.wakeTime)}</td>
                      <td className="px-2 py-2 tabular-nums">{formatDuration(m.inBedMin)}</td>
                      <td className="px-2 py-2 tabular-nums">
                        {formatDuration(m.sleepMin)}
                        {m.hasAsleep ? "" : "*"}
                      </td>
                      <td className="px-2 py-2 tabular-nums">{signed(m.wakeDiff)}</td>
                      <td className="px-2 py-2">{e.quality}/5</td>
                      <td className="px-2 py-2">
                        <Badge tone={m.goalMet ? "emerald" : m.enough ? "amber" : "rose"}>{SLEEP_STATUS_LABEL[m.status]}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 px-4 text-[11px] text-zinc-500 sm:px-2">* Sin hora de dormirse: el sueño estimado equivale al tiempo en cama. Toca una fila para editarla.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
