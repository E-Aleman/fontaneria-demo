import { requireUser } from "@/lib/get-current-user";
import { limitFor } from "@/lib/plan-limits";
import HabitForm from "./habit-form";
import HabitRow from "./habit-row";

function getLast7Days() {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default async function HabitsPage() {
  const { supabase, user, profile } = await requireUser();
  const last7Days = getLast7Days();

  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, color")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("habit_logs")
      .select("habit_id, completed_on")
      .eq("user_id", user.id)
      .gte("completed_on", last7Days[0]),
  ]);

  const logsByHabit = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    if (!logsByHabit.has(log.habit_id)) logsByHabit.set(log.habit_id, new Set());
    logsByHabit.get(log.habit_id)!.add(log.completed_on);
  }

  const limit = limitFor(profile?.plan ?? "free", "habits");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Hábitos</h1>
        {Number.isFinite(limit) && (
          <span className="text-sm text-slate-500">
            {(habits ?? []).length}/{limit}
          </span>
        )}
      </div>

      <HabitForm />

      <ul className="space-y-2">
        {(habits ?? []).map((habit) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            last7Days={last7Days}
            completedDates={logsByHabit.get(habit.id) ?? new Set()}
          />
        ))}
        {(!habits || habits.length === 0) && (
          <p className="text-sm text-slate-400">Todavía no agregaste hábitos.</p>
        )}
      </ul>
    </div>
  );
}
