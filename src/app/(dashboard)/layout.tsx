import Link from "next/link";
import { requireUser } from "@/lib/get-current-user";
import { signOut } from "../(auth)/actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Resumen", icon: "🏠" },
  { href: "/tasks", label: "Tareas", icon: "✅" },
  { href: "/habits", label: "Hábitos", icon: "🔥" },
  { href: "/notes", label: "Notas", icon: "📝" },
  { href: "/billing", label: "Facturación", icon: "💳" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireUser();
  const isPremium = profile?.plan === "premium";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white px-4 py-6">
        <div className="mb-8 px-2">
          <p className="text-lg font-semibold text-slate-900">Productividad</p>
          <p className="truncate text-xs text-slate-500">{profile?.email ?? user.email}</p>
          <span
            className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              isPremium ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {isPremium ? "Premium" : "Gratis"}
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Cerrar sesión
          </button>
        </form>
      </aside>

      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
