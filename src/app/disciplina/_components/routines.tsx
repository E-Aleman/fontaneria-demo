"use client";

import { useState } from "react";
import { Moon, Plus, Sun, Trash2 } from "lucide-react";
import { format12, minutesToTime, timeToMinutes } from "../_lib/dates";
import { uid } from "../_lib/defaults";
import { phaseSequence, programWeek, targetsFor, totalWeeks, weekStartFor } from "../_lib/logic";
import { useStore } from "../_lib/store";
import type { Routine, RoutineItem } from "../_lib/types";
import { Button, Card, Input, PageHeader, Select } from "./ui";

function RoutineEditor({ routine, base, title, icon, note }: { routine: Routine; base: string; title: string; icon: React.ReactNode; note: string }) {
  const { saveRoutine } = useStore();
  const [items, setItems] = useState<RoutineItem[]>(routine.items);
  const [dirty, setDirty] = useState(false);
  const baseMin = timeToMinutes(base);
  const rel = (offset: number) => minutesToTime(baseMin + offset);

  const update = (id: string, patch: Partial<RoutineItem>) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setDirty(true);
  };

  /** Convierte la hora editada en desplazamiento relativo (−12 h..+12 h). */
  const offsetFromTime = (t: string) => {
    const d = timeToMinutes(t) - baseMin;
    return ((((d + 720) % 1440) + 1440) % 1440) - 720;
  };

  const sorted = [...items].sort((a, b) => a.offset - b.offset);

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          {icon} {title}
        </span>
      }
      subtitle={note}
      action={
        <Button
          variant="primary"
          size="sm"
          disabled={!dirty}
          onClick={async () => {
            await saveRoutine({ ...routine, items: sorted.filter((i) => i.name.trim()) });
            setDirty(false);
          }}
        >
          Guardar
        </Button>
      }
    >
      <ol className="relative space-y-2 border-l border-zinc-200 pl-4 dark:border-zinc-800">
        {sorted.map((it) => (
          <li key={it.id} className="relative">
            <span className="absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full border-2 border-indigo-500 bg-white dark:bg-zinc-900" />
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <Input type="time" aria-label="Hora" className="w-[7.5rem] shrink-0" value={rel(it.offset)} onChange={(e) => e.target.value && update(it.id, { offset: offsetFromTime(e.target.value) })} />
              <Input aria-label="Actividad" className="min-w-0 flex-1" value={it.name} onChange={(e) => update(it.id, { name: e.target.value })} />
              <div className="flex items-center gap-1">
                <Input type="number" min={0} max={240} aria-label="Duración en minutos" className="w-16" value={it.duration} onChange={(e) => update(it.id, { duration: Math.max(0, Number(e.target.value) || 0) })} />
                <span className="text-xs text-zinc-500">min</span>
                <Button
                  variant="danger"
                  size="sm"
                  aria-label="Eliminar actividad"
                  onClick={() => {
                    setItems((xs) => xs.filter((x) => x.id !== it.id));
                    setDirty(true);
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {format12(rel(it.offset))} – {format12(rel(it.offset + it.duration))} · {it.offset >= 0 ? "+" : ""}
              {it.offset} min respecto a la hora base
            </p>
          </li>
        ))}
      </ol>
      <Button
        className="mt-3"
        size="sm"
        onClick={() => {
          const last = sorted[sorted.length - 1];
          setItems((xs) => [...xs, { id: uid("r"), name: "Nueva actividad", offset: last ? last.offset + last.duration : 0, duration: 10 }]);
          setDirty(true);
        }}
      >
        <Plus size={14} /> Añadir actividad
      </Button>
    </Card>
  );
}

export function Routines() {
  const { data, today } = useStore();
  const s = data.settings;
  const current = programWeek(s, today) ?? 1;
  const [week, setWeek] = useState(current);
  const seq = phaseSequence(s);
  const ref = weekStartFor(s, week);
  // La rutina de la mañana usa el despertar de ese día; la nocturna, el acostarse de esa noche.
  const t = targetsFor(s, ref);
  const morning = data.routines.find((r) => r.id === "morning");
  const night = data.routines.find((r) => r.id === "night");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rutinas"
        description="Las horas se recalculan automáticamente según el horario de cada semana de adaptación."
        action={
          <Select value={week} onChange={(e) => setWeek(Number(e.target.value))} className="w-auto" aria-label="Semana">
            {Array.from({ length: totalWeeks(s) }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                Semana {w} · {seq[w - 1] ? `Fase ${seq[w - 1]}` : "Consolidación"}
                {w === current ? " (actual)" : ""}
              </option>
            ))}
          </Select>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {morning && (
          <RoutineEditor
            key={`m-${week}-${t.wake}`}
            routine={morning}
            base={t.wake}
            title="Rutina de mañana"
            icon={<Sun size={15} className="text-amber-500" />}
            note={`Hora base: despertar ${format12(t.wake)}`}
          />
        )}
        {night && (
          <RoutineEditor
            key={`n-${week}-${t.bed}`}
            routine={night}
            base={t.bed}
            title="Rutina de noche"
            icon={<Moon size={15} className="text-indigo-400" />}
            note={`Hora base: acostarse ${format12(t.bed)}`}
          />
        )}
      </div>
    </div>
  );
}
