import { MercadoPagoConfig, PreApproval } from "mercadopago";

function getClient() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.");
  }
  return new MercadoPagoConfig({ accessToken });
}

// Crea una suscripción recurrente (preapproval) para el plan Premium y devuelve
// la URL de checkout (init_point) a la que hay que redirigir al usuario.
export async function createPremiumSubscription(params: {
  userId: string;
  email: string;
}) {
  const client = getClient();
  const preapproval = new PreApproval(client);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const price = Number(process.env.MERCADOPAGO_PREMIUM_PRICE ?? 4900);
  const currency = process.env.MERCADOPAGO_CURRENCY ?? "ARS";

  const result = await preapproval.create({
    body: {
      reason: "Suscripción Premium - Productividad App",
      external_reference: params.userId,
      payer_email: params.email,
      back_url: `${appUrl}/billing?status=success`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: price,
        currency_id: currency,
      },
      status: "pending",
    },
  });

  return result;
}

export async function getSubscription(preapprovalId: string) {
  const client = getClient();
  const preapproval = new PreApproval(client);
  return preapproval.get({ id: preapprovalId });
}

export async function cancelSubscription(preapprovalId: string) {
  const client = getClient();
  const preapproval = new PreApproval(client);
  return preapproval.update({ id: preapprovalId, body: { status: "cancelled" } });
}
