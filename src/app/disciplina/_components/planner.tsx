"use client";

import { useState } from "react";
import { Check, Plus, Star, Trash2 } from "lucide-react";
import { addDays, formatDate, formatShort } from "../_lib/dates";
import { uid } from "../_lib/defaults";
import { useStore } from "../_lib/store";
import type { Task } from "../_lib/types";
import { Badge, Button, Card, cx, Empty, Input, PageHeader, Select } from "./ui";

export const MAX_PRIORITIES = 3;

function TaskRow({ t, showDate }: { t: Task; showDate?: boolean }) {
  const { saveTask, deleteTask, today } = useStore();
  const done = t.status === "done";
  const overdue = !done && t.date < today;
  return (
    <li className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
      <button
        type="button"
        aria-label={done ? "Marcar pendiente" : "Completar"}
        onClick={() => saveTask({ ...t, status: done ? "pending" : "done", completedAt: done ? undefined : new Date().toISOString() })}
        className={cx(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
          done ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300 hover:border-emerald-500 dark:border-zinc-600",
        )}
      >
        {done && <Check size={12} strokeWidth={3} />}
      </button>
      <span className={cx("min-w-0 flex-1 truncate text-sm", done ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-200")}>{t.title}</span>
      <Badge>{t.category}</Badge>
      {showDate && <span className={cx("text-xs tabular-nums", overdue ? "text-rose-500" : "text-zinc-500")}>{formatShort(t.date)}</span>}
      <button type="button" aria-label="Eliminar" onClick={() => deleteTask(t.id)} className="text-zinc-400 opacity-60 hover:text-rose-500 group-hover:opacity-100">
        <Trash2 size={14} />
      </button>
    </li>
  );
}

function AddTask({ date, priority, disabled }: { date: string; priority: boolean; disabled?: boolean }) {
  const { data, saveTask } = useStore();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(data.settings.taskCategories[0] ?? "Personal");
  const [taskDate, setTaskDate] = useState(date);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || disabled) return;
    await saveTask({ id: uid("t"), title: title.trim(), date: priority ? date : taskDate, priority, category, status: "pending", createdAt: new Date().toISOString() });
    setTitle("");
  };
  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap gap-2">
      <Input className="min-w-0 flex-1 basis-40" placeholder={priority ? "Nueva prioridad…" : "Nueva tarea secundaria…"} value={title} onChange={(e) => setTitle(e.target.value)} disabled={disabled} />
      <Select className="w-auto" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoría" disabled={disabled}>
        {data.settings.taskCategories.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </Select>
      {!priority && <Input type="date" className="w-auto" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} aria-label="Fecha objetivo" />}
      <Button type="submit" variant="primary" disabled={disabled} aria-label="Añadir">
        <Plus size={16} />
      </Button>
    </form>
  );
}

export function Planner() {
  const { data, today } = useStore();
  const [date, setDate] = useState(today);
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const dayTasks = data.tasks.filter((t) => t.date === date);
  const priorities = dayTasks.filter((t) => t.priority);
  const secondary = dayTasks.filter((t) => !t.priority);
  const list = data.tasks
    .filter((t) => t.status === tab)
    .sort((a, b) => (tab === "pending" ? a.date.localeCompare(b.date) : (b.completedAt ?? "").localeCompare(a.completedAt ?? "")));

  return (
    <div className="space-y-5">
      <PageHeader title="Prioridades" description="Tres prioridades por día. Lo demás es secundario: si no cabe, no es esencial." />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setDate(addDays(date, -1))}>
          ←
        </Button>
        <Input type="date" className="w-auto" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <Button size="sm" onClick={() => setDate(addDays(date, 1))}>
          →
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDate(today)}>
          Hoy
        </Button>
        <span className="text-sm text-zinc-500">{formatDate(date)}</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={<span className="flex items-center gap-2"><Star size={15} className="text-amber-500" /> Tres prioridades</span>} subtitle={`${priorities.length}/${MAX_PRIORITIES}`}>
          {priorities.length === 0 ? <p className="text-sm text-zinc-500">Define qué hará que este día valga la pena.</p> : <ul>{priorities.map((t) => <TaskRow key={t.id} t={t} />)}</ul>}
          <AddTask key={`p-${date}`} date={date} priority disabled={priorities.length >= MAX_PRIORITIES} />
          {priorities.length >= MAX_PRIORITIES && <p className="mt-2 text-xs text-zinc-500">Límite alcanzado. Completa o elimina una antes de añadir otra.</p>}
        </Card>
        <Card title="Tareas secundarias">
          {secondary.length === 0 ? <p className="text-sm text-zinc-500">Sin tareas secundarias para esta fecha.</p> : <ul>{secondary.map((t) => <TaskRow key={t.id} t={t} />)}</ul>}
          <AddTask key={`s-${date}`} date={date} priority={false} />
        </Card>
      </div>
      <Card
        title="Todas las tareas"
        action={
          <div className="flex rounded-lg bg-zinc-100 p-0.5 text-xs dark:bg-zinc-800">
            {(["pending", "done"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={cx("rounded-md px-3 py-1 font-medium", tab === k ? "bg-white shadow-sm dark:bg-zinc-950 dark:text-zinc-100" : "text-zinc-500")}>
                {k === "pending" ? "Pendientes" : "Completadas"} ({data.tasks.filter((t) => t.status === k).length})
              </button>
            ))}
          </div>
        }
      >
        {list.length === 0 ? <Empty>Nada por aquí.</Empty> : <ul>{list.map((t) => <TaskRow key={t.id} t={t} showDate />)}</ul>}
      </Card>
    </div>
  );
}
