import { requireUser } from "@/lib/get-current-user";
import { FREE_PLAN_LIMITS } from "@/lib/plan-limits";
import { startPremiumCheckout, cancelPremium } from "./actions";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { profile } = await requireUser();
  const params = await searchParams;
  const isPremium = profile?.plan === "premium";
  const price = process.env.MERCADOPAGO_PREMIUM_PRICE ?? "4900";

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Facturación</h1>

      {params.status === "success" && (
        <p className="mb-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
          Estamos confirmando tu pago con Mercado Pago. Tu plan se actualiza automáticamente en
          unos segundos.
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Plan actual</p>
            <p className="text-lg font-semibold text-slate-900">
              {isPremium ? "Premium" : "Gratis"}
            </p>
          </div>
          {isPremium && profile?.plan_renews_at && (
            <p className="text-sm text-slate-500">
              Próxima renovación: {new Date(profile.plan_renews_at).toLocaleDateString("es-ES")}
            </p>
          )}
        </div>

        {isPremium ? (
          <form action={cancelPremium}>
            <button
              type="submit"
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Cancelar suscripción
            </button>
          </form>
        ) : (
          <>
            <ul className="mb-4 space-y-1 text-sm text-slate-600">
              <li>Gratis: {FREE_PLAN_LIMITS.tasks} tareas, {FREE_PLAN_LIMITS.habits} hábitos, {FREE_PLAN_LIMITS.notes} notas.</li>
              <li>Premium (${price}/mes): todo ilimitado.</li>
            </ul>
            <form action={startPremiumCheckout}>
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Actualizar a Premium con Mercado Pago
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
