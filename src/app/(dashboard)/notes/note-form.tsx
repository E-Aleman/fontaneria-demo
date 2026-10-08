"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createNote } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Guardando..." : "Guardar nota"}
    </button>
  );
}

export default function NoteForm() {
  const [state, formAction] = useActionState(createNote, undefined);

  return (
    <form action={formAction} className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <input
        type="text"
        name="title"
        placeholder="Título"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <textarea
        name="content"
        rows={3}
        placeholder="Escribí tu nota..."
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
