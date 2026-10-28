"use client";

import { useState } from "react";
import { Flag, Moon } from "lucide-react";
import { addDays, format12, formatDate, weekday, WEEKDAYS_SHORT } from "../_lib/dates";
import { dayStat, isDayActive, logSet, milestones, programEnd, phaseSequence, sleepMetrics, targetsFor, totalWeeks, weekStartFor } from "../_lib/logic";
import { useStore } from "../_lib/store";
import { HabitChecklist, SleepForm } from "./shared";
import { Badge, Card, cx, PageHeader, pctText } from "./ui";

export function CalendarView() {
  const { data, today } = useStore();
  const s = data.settings;
  const end = programEnd(s);
  const initial = today < s.startDate ? s.startDate : today > end ? end : today;
  const [selected, setSelected] = useState(initial);
  const logs = logSet(data.habitLogs);
  const ms = milestones(s, today);
  const msByDate = new Map(ms.map((m) => [m.date, m]));
  const sleepByDate = new Map(data.sleep.map((e) => [e.date, e]));
  const seq = phaseSequence(s);
  const threshold = s.streakThreshold / 100;

  const weeks = Array.from({ length: totalWeeks(s) }, (_, i) => i + 1);
  const sel = dayStat(data, selected, logs);
  const selT = targetsFor(s, selected);
  const selSleep = sleepByDate.get(selected);

  return (
    <div className="space-y-5">
      <PageHeader title="Calendario de 90 días" description={`${formatDate(s.startDate, false)} → ${formatDate(end, false)}. Selecciona un día para consultar o corregir.`} />
      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-zinc-500">
            <Legend cls="bg-emerald-500" label={`≥ ${s.streakThreshold}%`} />
            <Legend cls="bg-indigo-400/70" label="≥ 50%" />
            <Legend cls="bg-amber-400/70" label="< 50%" />
            <Legend cls="bg-rose-400/40" label="0%" />
            <Legend cls="border border-dashed border-zinc-400" label="Flexible / sin programar" />
            <Legend cls="border border-zinc-300 dark:border-zinc-700" label="Pendiente" />
          </div>
          <div className="space-y-1.5">
            {weeks.map((w) => {
              const start = weekStartFor(s, w);
              const phase = seq[w - 1] ?? 0;
              const t = targetsFor(s, start);
              return (
                <div key={w} className="flex items-center gap-2">
                  <div className="w-14 shrink-0 text-[11px] leading-tight text-zinc-500 sm:w-24">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">S{w}</span>
                    <span className="hidden sm:inline"> · {phase === 0 ? "Consol." : `F${phase}`}</span>
                    <span className="block text-[10px]">{format12(t.wake)}</span>
                  </div>
                  <div className="grid flex-1 grid-cols-7 gap-1">
                    {Array.from({ length: 7 }, (_, i) => {
                      const d = addDays(start, i);
                      if (d > end) return <span key={i} />;
                      const future = d > today;
                      const st = dayStat(data, d, logs);
                      const flexible = !isDayActive(s, d) || st.due === 0;
                      const m = msByDate.get(d);
                      const tone = flexible
                        ? "border border-dashed border-zinc-300 dark:border-zinc-700"
                        : future
                          ? "border border-zinc-200 dark:border-zinc-800"
                          : st.pct! >= threshold - 1e-9
                            ? "bg-emerald-500 text-white"
                            : st.pct! >= 0.5
                              ? "bg-indigo-400/70 text-white"
                              : st.pct! > 0
                                ? "bg-amber-400/70 text-zinc-900"
                                : "bg-rose-400/40";
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelected(d)}
                          title={`${formatDate(d)} · ${flexible ? "sin hábitos programados" : pctText(st.pct)}`}
                          className={cx(
                            "relative flex aspect-square min-h-8 flex-col items-center justify-center rounded-lg text-[11px] font-medium tabular-nums transition hover:ring-2 hover:ring-indigo-400",
                            tone,
                            selected === d && "ring-2 ring-indigo-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900",
                            d === today && "outline outline-2 outline-offset-1 outline-zinc-900 dark:outline-zinc-100",
                            future && "text-zinc-400",
                          )}
                        >
                          <span>{Number(d.slice(8))}</span>
                          <span className="hidden text-[9px] opacity-70 sm:block">{WEEKDAYS_SHORT[weekday(d)]}</span>
                          {m && <Flag size={9} className={cx("absolute right-0.5 top-0.5", m.reached ? "text-amber-500" : "text-zinc-400")} />}
                          {sleepByDate.has(d) && <Moon size={8} className="absolute bottom-0.5 right-0.5 opacity-70" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-5 xl:col-span-2">
          <Card
            title={formatDate(selected)}
            subtitle={`${selT.week ? `Semana ${selT.week} · ` : ""}${selT.label} · meta ${format12(selT.bed)} → ${format12(selT.wake)}`}
            action={<Badge tone={sel.pct === null ? "zinc" : sel.pct >= threshold ? "emerald" : "amber"}>{sel.pct === null ? "Flexible" : pctText(sel.pct)}</Badge>}
          >
            <HabitChecklist date={selected} compact />
            <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Sueño</h3>
              {selSleep && (
                <p className="mb-2 text-xs text-zinc-500">
                  Registrado: {(sleepMetrics(selSleep).sleepMin / 60).toFixed(1)} h estimadas.
                </p>
              )}
              <SleepForm key={`${selected}-${selSleep?.wakeTime ?? ""}`} date={selected} />
            </div>
          </Card>
          <Card title="Hitos">
            <ul className="space-y-2">
              {ms.map((m) => (
                <li key={`${m.day}-${m.label}`} className="flex items-center gap-3 text-sm">
                  <Flag size={14} className={m.reached ? "text-amber-500" : "text-zinc-400"} />
                  <span className="min-w-0 flex-1 text-zinc-800 dark:text-zinc-200">{m.label}</span>
                  <span className="text-xs text-zinc-500">Día {m.day}</span>
                  {m.reached ? <Badge tone="emerald">Alcanzado</Badge> : <Badge>Pendiente</Badge>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cx("h-3 w-3 rounded", cls)} /> {label}
    </span>
  );
}
