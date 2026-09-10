import Link from "next/link";

const FEATURES = [
  {
    title: "Tareas",
    description: "Organizá lo que tenés que hacer con prioridades y fechas límite.",
    icon: "✅",
  },
  {
    title: "Hábitos",
    description: "Seguí tu constancia día a día y construí rachas.",
    icon: "🔥",
  },
  {
    title: "Notas",
    description: "Guardá ideas y apuntes rápidos, siempre a mano.",
    icon: "📝",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold text-slate-900">Productividad</span>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Ingresar
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Crear cuenta gratis
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-6 pb-16 pt-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Tu día a día, organizado
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Tareas, hábitos y notas en una sola app simple. Empezá gratis y mejorá a
            Premium cuando lo necesites.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
            >
              Empezar gratis
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-20">
          <div className="grid gap-6 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200 p-6">
                <div className="mb-3 text-3xl">{f.icon}</div>
                <h3 className="mb-1 font-semibold text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-600">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="precios" className="mx-auto max-w-4xl px-6 pb-24">
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">Planes</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-8">
              <h3 className="mb-1 text-lg font-semibold text-slate-900">Gratis</h3>
              <p className="mb-4 text-3xl font-bold text-slate-900">$0</p>
              <ul className="mb-6 space-y-2 text-sm text-slate-600">
                <li>• Hasta 10 tareas activas</li>
                <li>• Hasta 3 hábitos</li>
                <li>• Hasta 15 notas</li>
              </ul>
              <Link
                href="/signup"
                className="block rounded-lg border border-slate-300 py-2.5 text-center font-medium text-slate-700 hover:bg-slate-50"
              >
                Empezar gratis
              </Link>
            </div>
            <div className="rounded-2xl border-2 border-brand-600 p-8">
              <h3 className="mb-1 text-lg font-semibold text-slate-900">Premium</h3>
              <p className="mb-4 text-3xl font-bold text-slate-900">
                ${process.env.MERCADOPAGO_PREMIUM_PRICE ?? "4900"}
                <span className="text-base font-normal text-slate-500">/mes</span>
              </p>
              <ul className="mb-6 space-y-2 text-sm text-slate-600">
                <li>• Tareas, hábitos y notas ilimitadas</li>
                <li>• Soporte prioritario</li>
                <li>• Pago seguro con Mercado Pago</li>
              </ul>
              <Link
                href="/signup"
                className="block rounded-lg bg-brand-600 py-2.5 text-center font-medium text-white hover:bg-brand-700"
              >
                Empezar con Premium
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Productividad
      </footer>
    </div>
  );
}
