"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createHabit } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Agregando..." : "Agregar hábito"}
    </button>
  );
}

export default function HabitForm() {
  const [state, formAction] = useActionState(createHabit, undefined);

  return (
    <form action={formAction} className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          name="name"
          required
          placeholder="Ej: Tomar 2L de agua"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <SubmitButton />
      </div>
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
