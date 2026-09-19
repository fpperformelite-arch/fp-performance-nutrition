"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-petroleum px-4 py-2 font-medium text-white disabled:opacity-60"
    >
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, undefined);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-center font-bold text-2xl text-petroleum">SEMBORA IA</h1>
      <form action={formAction} className="flex flex-col gap-3">
        <input
          type="email"
          name="email"
          required
          placeholder="tu@negocio.com"
          className="rounded-lg border border-stone-300 px-4 py-2"
        />
        <input
          type="password"
          name="password"
          required
          placeholder="Contraseña"
          className="rounded-lg border border-stone-300 px-4 py-2"
        />
        <SubmitButton />
        {state?.error && <p className="text-red-600 text-sm">{state.error}</p>}
      </form>
      <p className="text-center text-sm text-stone-500">
        ¿Tu negocio no tiene cuenta?{" "}
        <Link href="/onboarding" className="font-medium text-petroleum">
          Crear cuenta
        </Link>
      </p>
    </main>
  );
}
