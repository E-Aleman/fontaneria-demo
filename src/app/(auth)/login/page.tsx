import Link from "next/link";
import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; checkEmail?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
        <p className="mb-6 text-sm text-slate-500">
          Organizá tus tareas, hábitos y notas en un solo lugar.
        </p>

        {params.checkEmail && (
          <p className="mb-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
            Te enviamos un email para confirmar tu cuenta.
          </p>
        )}
        {params.error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            Hubo un problema al confirmar tu email. Probá iniciar sesión de nuevo.
          </p>
        )}

        <LoginForm next={params.next} />

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿No tenés cuenta?{" "}
          <Link href="/signup" className="font-medium text-brand-600 hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
