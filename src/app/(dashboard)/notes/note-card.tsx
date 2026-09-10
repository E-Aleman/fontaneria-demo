"use client";

import { useTransition } from "react";
import { togglePinned, deleteNote } from "./actions";

export default function NoteCard({
  note,
}: {
  note: { id: string; title: string; content: string; pinned: boolean };
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-medium text-slate-800">{note.title}</h3>
        <button
          type="button"
          disabled={isPending}
          title={note.pinned ? "Desfijar" : "Fijar"}
          onClick={() => startTransition(() => togglePinned(note.id, note.pinned))}
          className={note.pinned ? "text-amber-500" : "text-slate-300 hover:text-slate-400"}
        >
          📌
        </button>
      </div>
      <p className="mb-3 flex-1 whitespace-pre-wrap text-sm text-slate-600">{note.content}</p>
      <button
        type="button"
        onClick={() => startTransition(() => deleteNote(note.id))}
        className="self-end text-xs text-slate-400 hover:text-red-600"
      >
        Eliminar
      </button>
    </div>
  );
}
