"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { registerAction } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
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
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="mb-8 font-bold text-xl text-petroleum">
        SEMBORA IA
      </Link>
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 font-bold text-2xl text-ink">Crea tu cuenta</h1>
        <p className="mb-6 text-sm text-stone-500">
          Empieza gratis — 7 días de prueba, sin tarjeta.
        </p>
        <form action={formAction} className="flex flex-col gap-3">
          <input
            type="text"
            name="businessName"
            required
            placeholder="Nombre de tu negocio"
            className="input"
          />
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
            minLength={8}
            placeholder="Contraseña (mínimo 8 caracteres)"
            className="input"
          />
          <SubmitButton />
          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700 text-sm">{state.error}</p>
          )}
        </form>
      </div>
      <p className="mt-6 text-center text-sm text-stone-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-petroleum">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}
