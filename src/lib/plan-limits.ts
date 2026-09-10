// Límites del plan gratuito. El plan premium (vía Mercado Pago) no tiene límites.
export const FREE_PLAN_LIMITS = {
  tasks: 10,
  habits: 3,
  notes: 15,
} as const;

export type PlanName = "free" | "premium";

export function limitFor(plan: PlanName, resource: keyof typeof FREE_PLAN_LIMITS) {
  return plan === "premium" ? Infinity : FREE_PLAN_LIMITS[resource];
}
