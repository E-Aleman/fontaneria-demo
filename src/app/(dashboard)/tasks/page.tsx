import { requireUser } from "@/lib/get-current-user";
import { limitFor } from "@/lib/plan-limits";
import TaskForm from "./task-form";
import TaskRow from "./task-row";

export default async function TasksPage() {
  const { supabase, user, profile } = await requireUser();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, priority, due_date")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const activeCount = (tasks ?? []).filter((t) => t.status !== "done").length;
  const limit = limitFor(profile?.plan ?? "free", "tasks");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Tareas</h1>
        {Number.isFinite(limit) && (
          <span className="text-sm text-slate-500">
            {activeCount}/{limit} activas
          </span>
        )}
      </div>

      <TaskForm />

      <ul className="space-y-2">
        {(tasks ?? []).map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
        {(!tasks || tasks.length === 0) && (
          <p className="text-sm text-slate-400">Todavía no agregaste tareas.</p>
        )}
      </ul>
    </div>
  );
}
