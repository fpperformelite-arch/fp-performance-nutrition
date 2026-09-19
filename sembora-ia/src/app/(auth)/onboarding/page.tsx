"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { registerAction } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-petroleum px-4 py-2 font-medium text-white disabled:opacity-60"
    >
      {pending ? "Creando cuenta..." : "Crear mi cuenta"}
    </button>
  );
}

// Alta self-service de un negocio nuevo: crea businesses + bora_configs +
// el usuario dueño (owner) en una sola transacción. Ver
// src/app/(auth)/actions.ts → registerAction.
export default function OnboardingPage() {
  const [state, formAction] = useFormState(registerAction, undefined);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-center font-bold text-2xl text-petroleum">Crea tu cuenta en SEMBORA IA</h1>
      <form action={formAction} className="flex flex-col gap-3">
        <input
          type="text"
          name="businessName"
          required
          placeholder="Nombre de tu negocio"
          className="rounded-lg border border-stone-300 px-4 py-2"
        />
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
          minLength={8}
          placeholder="Contraseña (mínimo 8 caracteres)"
          className="rounded-lg border border-stone-300 px-4 py-2"
        />
        <SubmitButton />
        {state?.error && <p className="text-red-600 text-sm">{state.error}</p>}
      </form>
      <p className="text-center text-sm text-stone-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-petroleum">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}
