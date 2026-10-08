"use client";

import { useTransition } from "react";
import { toggleTaskStatus, deleteTask } from "./actions";

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

export default function TaskRow({
  task,
}: {
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const isDone = task.status === "done";

  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <button
        type="button"
        aria-label="Marcar como completada"
        onClick={() => startTransition(() => toggleTaskStatus(task.id, task.status))}
        className={`h-5 w-5 shrink-0 rounded-full border-2 ${
          isDone ? "border-green-500 bg-green-500" : "border-slate-300"
        }`}
      />
      <div className="flex-1">
        <p className={`text-sm ${isDone ? "text-slate-400 line-through" : "text-slate-800"}`}>
          {task.title}
        </p>
        {task.due_date && <p className="text-xs text-slate-400">Vence: {task.due_date}</p>}
      </div>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}>
        {task.priority === "low" ? "Baja" : task.priority === "high" ? "Alta" : "Media"}
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => deleteTask(task.id))}
        className="text-sm text-slate-400 hover:text-red-600"
      >
        Eliminar
      </button>
    </li>
  );
}
