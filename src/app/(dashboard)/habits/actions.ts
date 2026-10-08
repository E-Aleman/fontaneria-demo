"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/get-current-user";
import { limitFor } from "@/lib/plan-limits";

const COLORS = ["#3658f1", "#16a34a", "#dc2626", "#d97706", "#7c3aed", "#0891b2"];

export async function createHabit(_prevState: { error?: string } | undefined, formData: FormData) {
  const { supabase, user, profile } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return { error: "El nombre es obligatorio." };

  const { count } = await supabase
    .from("habits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const limit = limitFor(profile?.plan ?? "free", "habits");
  if ((count ?? 0) >= limit) {
    return {
      error: `Llegaste al límite de ${limit} hábitos del plan gratis. Mejorá a Premium para hábitos ilimitados.`,
    };
  }

  const color = COLORS[(count ?? 0) % COLORS.length];
  const { error } = await supabase.from("habits").insert({ user_id: user.id, name, color });
  if (error) return { error: error.message };

  revalidatePath("/habits");
  return { error: undefined };
}

export async function deleteHabit(habitId: string) {
  const { supabase } = await requireUser();
  await supabase.from("habits").delete().eq("id", habitId);
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export async function toggleHabitLog(habitId: string, date: string, isCompleted: boolean) {
  const { supabase, user } = await requireUser();

  if (isCompleted) {
    await supabase
      .from("habit_logs")
      .delete()
      .eq("habit_id", habitId)
      .eq("completed_on", date)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("habit_logs")
      .insert({ habit_id: habitId, user_id: user.id, completed_on: date });
  }

  revalidatePath("/habits");
  revalidatePath("/dashboard");
}
