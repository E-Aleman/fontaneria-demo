import { Resend } from "resend";

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "Productividad <onboarding@resend.dev>";

export async function sendWelcomeEmail(to: string, name?: string | null) {
  const client = getClient();
  if (!client) return; // Resend no configurado (ej. en desarrollo local sin API key).

  await client.emails.send({
    from: FROM,
    to,
    subject: "¡Bienvenido/a a tu app de productividad!",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Hola${name ? ` ${name}` : ""} 👋</h2>
        <p>Tu cuenta ya está lista. Organizá tus tareas, seguí tus hábitos y guardá tus notas, todo en un solo lugar.</p>
        <p>Empezá ahora mismo desde tu panel.</p>
      </div>
    `,
  });
}

export async function sendPremiumActivatedEmail(to: string) {
  const client = getClient();
  if (!client) return;

  await client.emails.send({
    from: FROM,
    to,
    subject: "Tu plan Premium está activo",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>🎉 ¡Listo! Ya sos Premium</h2>
        <p>Se activaron los límites ilimitados de tareas, hábitos y notas en tu cuenta.</p>
        <p>Gracias por apoyar el proyecto.</p>
      </div>
    `,
  });
}

export async function sendPremiumCancelledEmail(to: string) {
  const client = getClient();
  if (!client) return;

  await client.emails.send({
    from: FROM,
    to,
    subject: "Tu suscripción Premium fue cancelada",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Suscripción cancelada</h2>
        <p>Tu cuenta volvió al plan gratuito. Podés reactivar Premium cuando quieras desde la sección de facturación.</p>
      </div>
    `,
  });
}
