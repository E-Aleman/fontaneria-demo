import Link from "next/link";
import { requireUser } from "@/lib/get-current-user";

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireUser();

  const [{ data: tasks }, { data: habits }, { data: notes }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, due_date, priority")
      .eq("user_id", user.id)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase.from("habits").select("id, name, color").eq("user_id", user.id).limit(5),
    supabase
      .from("notes")
      .select("id, title, content")
      .eq("user_id", user.id)
      .eq("pinned", true)
      .limit(4),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayLogs } = await supabase
    .from("habit_logs")
    .select("habit_id")
    .eq("user_id", user.id)
    .eq("completed_on", today);

  const completedHabitIds = new Set((todayLogs ?? []).map((l) => l.habit_id));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">
        Hola{profile?.full_name ? `, ${profile.full_name}` : ""} 👋
      </h1>
      <p className="mb-8 text-slate-500">Esto es lo que tenés pendiente hoy.</p>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Tareas pendientes</h2>
            <Link href="/tasks" className="text-sm text-brand-600 hover:underline">
              Ver todas
            </Link>
          </div>
          {tasks && tasks.length > 0 ? (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{t.title}</span>
                  {t.due_date && <span className="text-xs text-slate-400">{t.due_date}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No tenés tareas pendientes.</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Hábitos de hoy</h2>
            <Link href="/habits" className="text-sm text-brand-600 hover:underline">
              Ver todos
            </Link>
          </div>
          {habits && habits.length > 0 ? (
            <ul className="space-y-2">
              {habits.map((h) => (
                <li key={h.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      completedHabitIds.has(h.id) ? "bg-green-500" : "bg-slate-300"
                    }`}
                  />
                  {h.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Todavía no creaste hábitos.</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Notas fijadas</h2>
            <Link href="/notes" className="text-sm text-brand-600 hover:underline">
              Ver todas
            </Link>
          </div>
          {notes && notes.length > 0 ? (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="text-sm">
                  <p className="font-medium text-slate-800">{n.title}</p>
                  <p className="line-clamp-1 text-slate-500">{n.content}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No tenés notas fijadas.</p>
          )}
        </section>
      </div>
    </div>
  );
}
