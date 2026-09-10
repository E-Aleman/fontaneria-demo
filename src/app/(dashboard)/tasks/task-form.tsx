"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createTask } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Agregando..." : "Agregar tarea"}
    </button>
  );
}

export default function TaskForm() {
  const [state, formAction] = useActionState(createTask, undefined);

  return (
    <form action={formAction} className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          name="title"
          required
          placeholder="¿Qué tenés que hacer?"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <select
          name="priority"
          defaultValue="medium"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
        </select>
        <input
          type="date"
          name="due_date"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <SubmitButton />
      </div>
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
