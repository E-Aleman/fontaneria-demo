"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/get-current-user";
import { createPremiumSubscription, cancelSubscription } from "@/lib/mercadopago";

export async function startPremiumCheckout() {
  const { user, profile } = await requireUser();

  const subscription = await createPremiumSubscription({
    userId: user.id,
    email: profile?.email ?? user.email!,
  });

  if (!subscription.init_point) {
    throw new Error("Mercado Pago no devolvió una URL de checkout.");
  }

  redirect(subscription.init_point);
}

export async function cancelPremium() {
  const { supabase, user, profile } = await requireUser();

  if (profile?.mercadopago_subscription_id) {
    await cancelSubscription(profile.mercadopago_subscription_id);
  }

  await supabase
    .from("profiles")
    .update({ plan: "free", mercadopago_subscription_id: null, plan_renews_at: null })
    .eq("id", user.id);
}
