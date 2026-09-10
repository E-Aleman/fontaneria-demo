"use client";

import { useTransition } from "react";
import { toggleHabitLog, deleteHabit } from "./actions";

export default function HabitRow({
  habit,
  last7Days,
  completedDates,
}: {
  habit: { id: string; name: string; color: string };
  last7Days: string[];
  completedDates: Set<string>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: habit.color }} />
      <span className="flex-1 text-sm font-medium text-slate-800">{habit.name}</span>

      <div className="flex gap-1.5">
        {last7Days.map((date) => {
          const isCompleted = completedDates.has(date);
          const dayLabel = new Date(`${date}T00:00:00`).toLocaleDateString("es-ES", {
            weekday: "narrow",
          });
          return (
            <button
              key={date}
              type="button"
              disabled={isPending}
              title={date}
              onClick={() => startTransition(() => toggleHabitLog(habit.id, date, isCompleted))}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-medium uppercase transition ${
                isCompleted
                  ? "text-white"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
              }`}
              style={isCompleted ? { backgroundColor: habit.color } : undefined}
            >
              {dayLabel}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => startTransition(() => deleteHabit(habit.id))}
        className="text-sm text-slate-400 hover:text-red-600"
      >
        Eliminar
      </button>
    </li>
  );
}
