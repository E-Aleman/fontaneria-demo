import { requireUser } from "@/lib/get-current-user";
import { limitFor } from "@/lib/plan-limits";
import NoteForm from "./note-form";
import NoteCard from "./note-card";

export default async function NotesPage() {
  const { supabase, user, profile } = await requireUser();

  const { data: notes } = await supabase
    .from("notes")
    .select("id, title, content, pinned")
    .eq("user_id", user.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  const limit = limitFor(profile?.plan ?? "free", "notes");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Notas</h1>
        {Number.isFinite(limit) && (
          <span className="text-sm text-slate-500">
            {(notes ?? []).length}/{limit}
          </span>
        )}
      </div>

      <NoteForm />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(notes ?? []).map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
      {(!notes || notes.length === 0) && (
        <p className="text-sm text-slate-400">Todavía no agregaste notas.</p>
      )}
    </div>
  );
}
