"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, undefined);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="mb-8 font-bold text-xl text-petroleum">
        SEMBORA IA
      </Link>
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 font-bold text-2xl text-ink">Inicia sesión</h1>
        <p className="mb-6 text-sm text-stone-500">Entra al panel de tu negocio.</p>
        <form action={formAction} className="flex flex-col gap-3">
          <input
            type="email"
            name="email"
            required
            placeholder="tu@negocio.com"
            className="input"
          />
          <input
            type="password"
            name="password"
            required
            placeholder="Contraseña"
            className="input"
          />
          <SubmitButton />
          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700 text-sm">{state.error}</p>
          )}
        </form>
      </div>
      <p className="mt-6 text-center text-sm text-stone-500">
        ¿Tu negocio no tiene cuenta?{" "}
        <Link href="/onboarding" className="font-medium text-petroleum">
          Crear cuenta
        </Link>
      </p>
    </main>
  );
}
