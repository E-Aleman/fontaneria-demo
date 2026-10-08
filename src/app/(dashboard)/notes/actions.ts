"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/get-current-user";
import { limitFor } from "@/lib/plan-limits";

export async function createNote(_prevState: { error?: string } | undefined, formData: FormData) {
  const { supabase, user, profile } = await requireUser();

  const title = String(formData.get("title") ?? "").trim() || "Sin título";
  const content = String(formData.get("content") ?? "").trim();

  const { count } = await supabase
    .from("notes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const limit = limitFor(profile?.plan ?? "free", "notes");
  if ((count ?? 0) >= limit) {
    return {
      error: `Llegaste al límite de ${limit} notas del plan gratis. Mejorá a Premium para notas ilimitadas.`,
    };
  }

  const { error } = await supabase.from("notes").insert({ user_id: user.id, title, content });
  if (error) return { error: error.message };

  revalidatePath("/notes");
  return { error: undefined };
}

export async function togglePinned(noteId: string, pinned: boolean) {
  const { supabase } = await requireUser();
  await supabase.from("notes").update({ pinned: !pinned }).eq("id", noteId);
  revalidatePath("/notes");
  revalidatePath("/dashboard");
}

export async function deleteNote(noteId: string) {
  const { supabase } = await requireUser();
  await supabase.from("notes").delete().eq("id", noteId);
  revalidatePath("/notes");
  revalidatePath("/dashboard");
}
