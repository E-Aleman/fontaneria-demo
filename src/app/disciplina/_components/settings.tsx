"use client";

import { useRef, useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { formatDate, isValidDateKey, isValidTime } from "../_lib/dates";
import { downloadText, parseBackupText, toBackup } from "../_lib/backup";
import { defaultData, DEFAULT_PHASES } from "../_lib/defaults";
import { canRepeatCurrent, phaseSequence, programEnd, targetWindowMinutes, totalWeeks, undoableRepeat } from "../_lib/logic";
import { useStore } from "../_lib/store";
import type { Settings as SettingsT } from "../_lib/types";
import { Badge, Button, Card, DaysPicker, Field, Input, PageHeader, Select, Toggle } from "./ui";

const TIMEZONES = ["America/El_Salvador", "America/Guatemala", "America/Tegucigalpa", "America/Mexico_City", "America/Bogota", "America/New_York", "Europe/Madrid", "UTC"];

export function Settings() {
  const { data, today, saveSettings, replaceAll } = useStore();
  const [draft, setDraft] = useState<SettingsT>(data.settings);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [newCat, setNewCat] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const s = data.settings;
  const dirty = JSON.stringify(draft) !== JSON.stringify(s);
  const set = <K extends keyof SettingsT>(k: K, v: SettingsT[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    if (!isValidDateKey(draft.startDate)) return setMsg({ tone: "err", text: "Fecha de inicio inválida." });
    if (!isValidTime(draft.finalWake) || !isValidTime(draft.finalBed)) return setMsg({ tone: "err", text: "Horario final inválido." });
    if (draft.phases.some((p) => !isValidTime(p.bed) || !isValidTime(p.wake))) return setMsg({ tone: "err", text: "Revisa las horas de las fases." });
    if (draft.minSleepHours > draft.desiredSleepHours) return setMsg({ tone: "err", text: "El mínimo de sueño no puede superar la duración deseada." });
    if (draft.activeDays.length === 0) return setMsg({ tone: "err", text: "Selecciona al menos un día activo." });
    await saveSettings(draft);
    setMsg({ tone: "ok", text: "Configuración guardada. Los registros de sueño conservan las metas con que se guardaron." });
  };

  const repeat = canRepeatCurrent(s, today);
  const undo = undoableRepeat(s, today);
  const seq = phaseSequence(s);
  const overflow = s.phases.length + s.repeats.length > totalWeeks(s);

  const applyRepeats = async (repeats: number[]) => {
    const next = { ...s, repeats };
    await saveSettings(next);
    setDraft((d) => ({ ...d, repeats }));
  };

  const exportJson = () => downloadText(`disciplina-respaldo-${today}.json`, JSON.stringify(toBackup(data), null, 2), "application/json");

  const importJson = async (file: File) => {
    try {
      const parsed = parseBackupText(await file.text());
      if (!confirm(`Se reemplazarán todos los datos actuales por el respaldo (${parsed.habits.length} hábitos, ${parsed.habitLogs.length} registros, ${parsed.sleep.length} noches). ¿Continuar?`)) return;
      await replaceAll(parsed);
      setDraft(parsed.settings);
      setMsg({ tone: "ok", text: "Respaldo importado correctamente." });
    } catch (e) {
      setMsg({ tone: "err", text: `Importación cancelada: ${e instanceof Error ? e.message : String(e)}` });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configuración"
        description="Las metas son configurables: priorizan el descanso suficiente sobre la hora de despertar."
        action={
          <Button variant="primary" disabled={!dirty} onClick={save}>
            Guardar cambios
          </Button>
        }
      />
      {msg && <p className={msg.tone === "ok" ? "rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" : "rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-300"}>{msg.text}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Programa">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de inicio" hint={`Termina el ${formatDate(programEnd(draft), false)}`}>
              <Input type="date" value={draft.startDate} onChange={(e) => e.target.value && set("startDate", e.target.value)} />
            </Field>
            <Field label="Duración (días)">
              <Input type="number" min={7} max={366} value={draft.durationDays} onChange={(e) => set("durationDays", Math.min(366, Math.max(7, Number(e.target.value) || 90)))} />
            </Field>
            <Field label="Zona horaria" className="col-span-2">
              <Select value={draft.timezone} onChange={(e) => set("timezone", e.target.value)}>
                {[...new Set([draft.timezone, ...TIMEZONES])].map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </Select>
            </Field>
            <Field label="Días activos" className="col-span-2" hint="Los días inactivos no cuentan en porcentajes ni rachas.">
              <DaysPicker value={draft.activeDays} onChange={(v) => set("activeDays", v)} />
            </Field>
            <div className="col-span-2 flex items-center justify-between gap-3 rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800/50">
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Domingo flexible</p>
                <p className="text-xs text-zinc-500">Ningún hábito se exige el domingo; lo que hagas cuenta como extra.</p>
              </div>
              <Toggle label="Domingo flexible" checked={draft.flexibleSunday} onChange={(v) => set("flexibleSunday", v)} />
            </div>
          </div>
        </Card>

        <Card title="Sueño y metas">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Despertar objetivo final">
              <Input type="time" value={draft.finalWake} onChange={(e) => set("finalWake", e.target.value)} />
            </Field>
            <Field label="Acostarse objetivo final">
              <Input type="time" value={draft.finalBed} onChange={(e) => set("finalBed", e.target.value)} />
            </Field>
            <Field label="Sueño deseado (h)">
              <Input type="number" step={0.25} min={5} max={11} value={draft.desiredSleepHours} onChange={(e) => set("desiredSleepHours", Number(e.target.value))} />
            </Field>
            <Field label="Mínimo saludable (h)" hint="Por debajo, madrugar no cuenta como meta cumplida.">
              <Input type="number" step={0.25} min={4} max={10} value={draft.minSleepHours} onChange={(e) => set("minSleepHours", Number(e.target.value))} />
            </Field>
            <Field label="Umbral de racha (%)" hint="Cumplimiento diario mínimo para sumar a la racha.">
              <Input type="number" min={1} max={100} value={draft.streakThreshold} onChange={(e) => set("streakThreshold", Math.min(100, Math.max(1, Number(e.target.value) || 80)))} />
            </Field>
            <Field label="Meta diaria de enfoque (min)">
              <Input type="number" min={0} max={600} value={draft.focusGoalMinutes} onChange={(e) => set("focusGoalMinutes", Math.max(0, Number(e.target.value) || 0))} />
            </Field>
          </div>
          {targetWindowMinutes(draft.finalBed, draft.finalWake) < draft.desiredSleepHours * 60 && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">El horario final deja menos tiempo en cama que el sueño deseado.</p>
          )}
        </Card>

        <Card title="Adaptación gradual" subtitle="Metas por fase. Después de la última fase sigue la consolidación con el horario final.">
          <div className="space-y-2">
            {draft.phases.map((p, i) => {
              const win = targetWindowMinutes(p.bed, p.wake);
              return (
                <div key={p.phase} className="flex items-center gap-2">
                  <span className="w-14 text-xs font-medium text-zinc-500">Fase {p.phase}</span>
                  <Input type="time" aria-label={`Acostarse fase ${p.phase}`} value={p.bed} onChange={(e) => set("phases", draft.phases.map((x, j) => (j === i ? { ...x, bed: e.target.value } : x)))} />
                  <Input type="time" aria-label={`Despertar fase ${p.phase}`} value={p.wake} onChange={(e) => set("phases", draft.phases.map((x, j) => (j === i ? { ...x, wake: e.target.value } : x)))} />
                  <span className={`w-12 shrink-0 text-right text-xs tabular-nums ${win < draft.minSleepHours * 60 ? "text-rose-500" : "text-zinc-500"}`}>{(win / 60).toFixed(1)} h</span>
                </div>
              );
            })}
          </div>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => set("phases", DEFAULT_PHASES.map((p) => ({ ...p })))}>
            <RotateCcw size={13} /> Restaurar fases originales
          </Button>
          <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">Repetir semana</p>
            <p className="mb-3 text-xs text-zinc-500">
              Si el descanso no es suficiente, repite la fase actual: se añade una semana más con el mismo horario y las siguientes se desplazan. El historial no cambia.
            </p>
            <div className="mb-3 flex flex-wrap gap-1">
              {seq.map((p, i) => (
                <Badge key={i} tone={p === 0 ? "emerald" : "indigo"}>
                  S{i + 1}: {p === 0 ? "C" : `F${p}`}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={!repeat.ok} onClick={() => applyRepeats([...s.repeats, repeat.phase])}>
                Repetir fase actual{repeat.ok ? ` (F${repeat.phase})` : ""}
              </Button>
              <Button size="sm" variant="ghost" disabled={undo === null} onClick={() => applyRepeats(s.repeats.slice(0, -1))}>
                Deshacer última repetición
              </Button>
            </div>
            {overflow && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Con las repeticiones, la adaptación ocupa todo el programa; puedes ampliar la duración.</p>}
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Apariencia y categorías">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-800 dark:text-zinc-200">Tema</span>
              <Select
                className="w-auto"
                value={s.theme}
                onChange={async (e) => {
                  const theme = e.target.value as SettingsT["theme"];
                  await saveSettings({ ...s, theme });
                  setDraft((d) => ({ ...d, theme }));
                }}
              >
                <option value="dark">Oscuro</option>
                <option value="light">Claro</option>
              </Select>
            </div>
            <p className="mb-2 mt-4 text-sm text-zinc-800 dark:text-zinc-200">Categorías de tareas</p>
            <div className="flex flex-wrap gap-1.5">
              {draft.taskCategories.map((c) => (
                <button key={c} type="button" title="Quitar" onClick={() => draft.taskCategories.length > 1 && set("taskCategories", draft.taskCategories.filter((x) => x !== c))} className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-700 hover:bg-rose-100 hover:text-rose-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {c} ×
                </button>
              ))}
            </div>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = newCat.trim();
                if (v && !draft.taskCategories.includes(v)) set("taskCategories", [...draft.taskCategories, v]);
                setNewCat("");
              }}
            >
              <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nueva categoría" />
              <Button type="submit">Añadir</Button>
            </form>
          </Card>

          <Card title="Respaldo de datos" subtitle="Tus datos viven solo en este navegador (IndexedDB). Exporta respaldos con regularidad.">
            <div className="flex flex-wrap gap-2">
              <Button onClick={exportJson}>
                <Download size={14} /> Exportar JSON
              </Button>
              <Button onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> Importar JSON
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importJson(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="danger"
                onClick={async () => {
                  if (!confirm("¿Borrar TODOS los datos y volver a la configuración inicial? Exporta un respaldo antes.")) return;
                  const fresh = defaultData();
                  await replaceAll(fresh);
                  setDraft(fresh.settings);
                  setMsg({ tone: "ok", text: "Datos restablecidos." });
                }}
              >
                Restablecer todo
              </Button>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              La importación valida el archivo completo antes de reemplazar cualquier dato.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
