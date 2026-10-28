"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { addDays, format12, formatShort, rangeKeys, WEEKDAYS_SHORT } from "../_lib/dates";
import { uid } from "../_lib/defaults";
import { habitStats, isDue, logId, logSet, programEnd } from "../_lib/logic";
import { useStore } from "../_lib/store";
import type { Habit } from "../_lib/types";
import { Badge, Button, Card, cx, DaysPicker, Empty, Field, Input, Modal, PageHeader, pctText, Progress } from "./ui";

const CATEGORIES = ["Sueño", "Salud", "Entorno", "Enfoque", "Aprendizaje", "Planificación"];

function daysLabel(days: number[]) {
  const set = [...days].sort().join(",");
  if (set === "0,1,2,3,4,5,6") return "Diario";
  if (set === "1,2,3,4,5,6") return "Lun–Sáb";
  if (set === "1,2,3,4,5") return "Lun–Vie";
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => WEEKDAYS_SHORT[d]).join(" ");
}

function HabitForm({ initial, onClose }: { initial: Habit | null; onClose: () => void }) {
  const { data, today, saveHabit } = useStore();
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Salud");
  const [goal, setGoal] = useState(initial?.goal ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [days, setDays] = useState<number[]>(initial?.days ?? [1, 2, 3, 4, 5, 6]);
  const [error, setError] = useState("");
  const categories = [...new Set([...CATEGORIES, ...data.habits.map((h) => h.category)])];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("El nombre es obligatorio.");
    if (days.length === 0) return setError("Selecciona al menos un día.");
    const base: Habit = initial ?? {
      id: uid("h"),
      name: "",
      category: "",
      days: [],
      goal: "",
      status: "active",
      // Un hábito nuevo empieza a contar hoy (o al iniciar el programa): no penaliza el pasado.
      activeFrom: today < data.settings.startDate ? data.settings.startDate : today,
      pauses: [],
      order: Math.max(-1, ...data.habits.map((h) => h.order)) + 1,
    };
    await saveHabit({ ...base, name: name.trim(), category: category.trim() || "General", goal: goal.trim(), time: time || undefined, days });
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Nombre">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Leer 10 minutos" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría">
          <Input list="habit-cats" value={category} onChange={(e) => setCategory(e.target.value)} />
          <datalist id="habit-cats">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Hora sugerida (opcional)">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label="Meta" hint="Versión mínima y concreta: fácil de cumplir incluso en un mal día.">
        <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ej. 2 páginas" />
      </Field>
      <Field label="Frecuencia (días de la semana)" hint="Los días no seleccionados no cuentan para porcentajes ni rachas.">
        <DaysPicker value={days} onChange={setDays} />
      </Field>
      {initial && <p className="text-[11px] text-zinc-500">Los cambios de frecuencia se aplican al cálculo de todo el historial del hábito; los registros marcados se conservan.</p>}
      {error && <p className="text-xs text-rose-500">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="primary">
          Guardar
        </Button>
      </div>
    </form>
  );
}

export function Habits() {
  const { data, today, saveHabit, deleteHabit } = useStore();
  const [editing, setEditing] = useState<Habit | null | "new">(null);
  const s = data.settings;
  const stats = habitStats(data, s.startDate, programEnd(s), today);
  const logs = logSet(data.habitLogs);
  const last14 = rangeKeys(addDays(today, -13), today);

  const setStatus = async (h: Habit, status: Habit["status"]) => {
    const pauses = [...h.pauses];
    if (status === "paused") pauses.push({ from: today });
    else {
      const open = pauses.findIndex((p) => !p.to);
      if (open >= 0) {
        const to = addDays(today, -1);
        // Pausa y reactivación el mismo día: no queda intervalo pausado.
        if (to < pauses[open].from) pauses.splice(open, 1);
        else pauses[open] = { ...pauses[open], to };
      }
    }
    await saveHabit({ ...h, status, pauses });
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const sorted = [...data.habits].sort((a, b) => a.order - b.order);
    const j = idx + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[j];
    await saveHabit({ ...a, order: b.order });
    await saveHabit({ ...b, order: a.order });
  };

  return (
    <div>
      <PageHeader
        title="Hábitos"
        description="Microhábitos concretos, con frecuencia propia. Pausar no borra historial."
        action={
          <Button variant="primary" onClick={() => setEditing("new")}>
            <Plus size={16} /> Nuevo hábito
          </Button>
        }
      />
      {stats.length === 0 && <Empty>No tienes hábitos. Crea el primero.</Empty>}
      <div className="space-y-3">
        {stats.map((st, idx) => {
          const h = st.habit;
          return (
            <Card key={h.id} className={cx(h.status === "paused" && "opacity-70")}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{h.name}</h3>
                    <Badge>{h.category}</Badge>
                    {h.status === "paused" ? <Badge tone="amber">Pausado</Badge> : <Badge tone="emerald">Activo</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {daysLabel(h.days)} · Meta: {h.goal || "—"}
                    {h.time && ` · ${format12(h.time)}`}
                  </p>
                  <div className="mt-2 flex gap-1" aria-label="Últimos 14 días">
                    {last14.map((d) => {
                      const due = isDue(s, h, d);
                      const done = logs.has(logId(h.id, d));
                      return (
                        <span
                          key={d}
                          title={`${formatShort(d)}: ${done ? "cumplido" : due ? "pendiente" : "no programado"}`}
                          className={cx(
                            "h-3 w-3 rounded-sm sm:h-3.5 sm:w-3.5",
                            done ? "bg-indigo-500" : due ? "bg-zinc-300 dark:bg-zinc-700" : "border border-dashed border-zinc-300 dark:border-zinc-700",
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-4 md:w-56">
                  <div className="flex-1">
                    <div className="mb-1 flex justify-between text-xs text-zinc-500">
                      <span>Programa</span>
                      <span className="tabular-nums">
                        {st.done}/{st.due} · {pctText(st.pct)}
                      </span>
                    </div>
                    <Progress value={st.pct} />
                    <p className="mt-1 text-xs text-zinc-500">
                      Racha {st.streak.current} · mejor {st.streak.best}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button variant="ghost" size="sm" aria-label="Subir" onClick={() => move(idx, -1)}>
                    <ArrowUp size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Bajar" onClick={() => move(idx, 1)}>
                    <ArrowDown size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => setEditing(h)}>
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={h.status === "active" ? "Pausar" : "Activar"}
                    onClick={() => setStatus(h, h.status === "active" ? "paused" : "active")}
                  >
                    {h.status === "active" ? <Pause size={14} /> : <Play size={14} />}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    aria-label="Eliminar"
                    onClick={() => confirm(`¿Eliminar "${h.name}" y todo su historial? Si solo quieres dejarlo de lado, mejor páusalo.`) && deleteHabit(h.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo hábito" : "Editar hábito"}>
        {editing !== null && <HabitForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
