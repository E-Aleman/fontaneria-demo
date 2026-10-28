"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BarChart3, CalendarDays, CheckSquare, Focus as FocusIcon, LayoutDashboard, ListTodo, Menu, Moon, Settings as SettingsIcon, Sun, SunMoon, X } from "lucide-react";
import { programDay, targetsFor } from "../_lib/logic";
import { StoreProvider, useStore } from "../_lib/store";
import { CalendarView } from "./calendar";
import { Dashboard } from "./dashboard";
import { Focus } from "./focus";
import { Habits } from "./habits";
import { Planner } from "./planner";
import { Routines } from "./routines";
import { Settings } from "./settings";
import { Sleep } from "./sleep";
import { Stats } from "./stats";
import { cx } from "./ui";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "habits", label: "Hábitos", icon: CheckSquare },
  { id: "sleep", label: "Sueño", icon: Moon },
  { id: "calendar", label: "Calendario", icon: CalendarDays },
  { id: "routines", label: "Rutinas", icon: SunMoon },
  { id: "planner", label: "Prioridades", icon: ListTodo },
  { id: "focus", label: "Enfoque", icon: FocusIcon },
  { id: "stats", label: "Estadísticas", icon: BarChart3 },
  { id: "settings", label: "Configuración", icon: SettingsIcon },
] as const;
type ViewId = (typeof NAV)[number]["id"];
const isView = (v: string): v is ViewId => NAV.some((n) => n.id === v);

function Shell() {
  const { data, today, saveSettings } = useStore();
  const [view, setView] = useState<ViewId>("dashboard");
  const [open, setOpen] = useState(false);
  const dark = data.settings.theme === "dark";

  // La vista se refleja en el hash para conservarla al recargar.
  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.slice(1);
      setView(isView(h) ? h : "dashboard");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const go = useCallback((v: string) => {
    if (!isView(v)) return;
    window.location.hash = v;
    setView(v);
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  const day = programDay(data.settings, today);
  const t = targetsFor(data.settings, today);

  let content: ReactNode;
  switch (view) {
    case "habits": content = <Habits />; break;
    case "sleep": content = <Sleep />; break;
    case "calendar": content = <CalendarView />; break;
    case "routines": content = <Routines />; break;
    case "planner": content = <Planner />; break;
    case "focus": content = <Focus />; break;
    case "stats": content = <Stats />; break;
    case "settings": content = <Settings />; break;
    default: content = <Dashboard go={go} />;
  }

  const toggleTheme = () => saveSettings({ ...data.settings, theme: dark ? "light" : "dark" });

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const Icon = n.icon;
        const active = view === n.id;
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => go(n.id)}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100",
            )}
          >
            <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
            {n.label}
          </button>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">4:30</div>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">DISCIPLINA 4:30</p>
        <p className="text-[11px] text-zinc-500">Personal Operating System</p>
      </div>
    </div>
  );

  const footer = (
    <div className="rounded-xl border border-zinc-200 p-3 text-xs dark:border-zinc-800">
      <p className="text-zinc-500">{day ? `Día ${day} de ${data.settings.durationDays}` : today < data.settings.startDate ? "Antes del inicio" : "Programa finalizado"}</p>
      <p className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-200">{t.label}</p>
      <button type="button" onClick={toggleTheme} className="mt-2 flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        {dark ? <Sun size={13} /> : <Moon size={13} />} Tema {dark ? "claro" : "oscuro"}
      </button>
    </div>
  );

  return (
    <div className={cx(dark && "dark")} style={{ colorScheme: dark ? "dark" : "light" }}>
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {/* Sidebar escritorio */}
        <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-6 border-r border-zinc-200 bg-white px-3 py-5 lg:flex dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="px-2">{brand}</div>
          <div className="flex-1">{nav}</div>
          {footer}
        </aside>

        {/* Barra superior móvil */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-950/80">
          {brand}
          <button type="button" aria-label="Abrir menú" onClick={() => setOpen(true)} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
            <Menu size={20} />
          </button>
        </header>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <aside className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-white px-3 py-5 shadow-xl animate-[slideIn_.18s_ease-out] dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-2">
                {brand}
                <button type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1">{nav}</div>
              {footer}
            </aside>
          </div>
        )}

        <main className="px-4 pb-16 pt-5 sm:px-6 lg:ml-60 lg:px-10 lg:pt-8">
          <div key={view} className="mx-auto max-w-6xl animate-[fadeIn_.2s_ease-out]">
            {content}
          </div>
        </main>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-400" />
        Cargando tus datos…
      </div>
    </div>
  );
}

export function DisciplinaApp() {
  return (
    <StoreProvider fallback={<Loading />}>
      <Shell />
    </StoreProvider>
  );
}
