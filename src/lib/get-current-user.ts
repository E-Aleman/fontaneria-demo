import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PlanName } from "@/lib/plan-limits";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  plan: PlanName;
  mercadopago_subscription_id: string | null;
  plan_renews_at: string | null;
};

// Para usar en Server Components/actions dentro de rutas protegidas por el middleware.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, plan, mercadopago_subscription_id, plan_renews_at")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile: (profile as Profile) ?? null };
}
