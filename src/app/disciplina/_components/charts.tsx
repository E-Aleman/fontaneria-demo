"use client";

import { useStore } from "../_lib/store";

export function useChartColors() {
  const dark = useStore().data.settings.theme === "dark";
  return {
    primary: dark ? "#818cf8" : "#4f46e5",
    secondary: dark ? "#34d399" : "#059669",
    muted: dark ? "#52525b" : "#a1a1aa",
    warn: dark ? "#fbbf24" : "#d97706",
    grid: dark ? "#27272a" : "#e4e4e7",
    axis: dark ? "#71717a" : "#71717a",
    cursor: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
  };
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ name?: string; value?: number | string | null; color?: string }>;
  unit?: string;
  format?: (v: number) => string;
}

export function ChartTooltip({ active, label, payload, unit = "", format }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <p className="mb-1 font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: {p.value === null || p.value === undefined ? "sin dato" : format && typeof p.value === "number" ? format(p.value) : `${p.value}${unit}`}
        </p>
      ))}
    </div>
  );
}
