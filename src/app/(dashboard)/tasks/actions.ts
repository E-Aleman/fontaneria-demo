"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/get-current-user";
import { limitFor } from "@/lib/plan-limits";

export async function createTask(_prevState: { error?: string } | undefined, formData: FormData) {
  const { supabase, user, profile } = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium");
  const dueDate = String(formData.get("due_date") ?? "");

  if (!title) return { error: "El título es obligatorio." };

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .neq("status", "done");

  const limit = limitFor(profile?.plan ?? "free", "tasks");
  if ((count ?? 0) >= limit) {
    return {
      error: `Llegaste al límite de ${limit} tareas activas del plan gratis. Mejorá a Premium para tareas ilimitadas.`,
    };
  }

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    title,
    priority,
    due_date: dueDate || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/tasks");
  return { error: undefined };
}

export async function toggleTaskStatus(taskId: string, currentStatus: string) {
  const { supabase } = await requireUser();
  const nextStatus = currentStatus === "done" ? "pending" : "done";

  await supabase.from("tasks").update({ status: nextStatus }).eq("id", taskId);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTask(taskId: string) {
  const { supabase } = await requireUser();
  await supabase.from("tasks").delete().eq("id", taskId);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
