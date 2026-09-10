import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSubscription } from "@/lib/mercadopago";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendPremiumActivatedEmail, sendPremiumCancelledEmail } from "@/lib/resend";

// Verifica la firma HMAC que Mercado Pago envía en el header `x-signature`.
// https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks#editor_5
function isValidSignature(request: Request, dataId: string) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true; // Sin secreto configurado, se omite la verificación (solo para desarrollo).

  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signatureHeader || !requestId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key.trim(), value?.trim()];
    })
  );

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  if (type !== "preapproval" || !dataId) {
    return NextResponse.json({ received: true });
  }

  if (!isValidSignature(request, dataId)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const subscription = await getSubscription(dataId);
  const userId = subscription.external_reference;
  if (!userId) return NextResponse.json({ received: true });

  const supabase = createServiceRoleClient();
  const isActive = subscription.status === "authorized";

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, plan")
    .eq("id", userId)
    .single();

  if (!profile) return NextResponse.json({ received: true });

  const nextRenewal = subscription.next_payment_date ?? null;

  await supabase
    .from("profiles")
    .update({
      plan: isActive ? "premium" : "free",
      mercadopago_subscription_id: isActive ? dataId : null,
      plan_renews_at: isActive ? nextRenewal : null,
    })
    .eq("id", userId);

  if (isActive && profile.plan !== "premium") {
    await sendPremiumActivatedEmail(profile.email);
  } else if (!isActive && profile.plan === "premium") {
    await sendPremiumCancelledEmail(profile.email);
  }

  return NextResponse.json({ received: true });
}
