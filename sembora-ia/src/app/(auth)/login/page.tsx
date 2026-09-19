"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Login por "magic link" (sin contraseñas que gestionar) — el tier gratuito
// de Supabase Auth lo incluye sin costo. El dueño del negocio recibe un
// correo con un enlace de acceso.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-center font-bold text-2xl text-petroleum">SEMBORA IA</h1>
      {sent ? (
        <p className="text-center text-stone-600">
          Te enviamos un enlace de acceso a <strong>{email}</strong>. Revisa tu correo.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="tu@negocio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-stone-300 px-4 py-2"
          />
          <button
            type="submit"
            className="rounded-lg bg-petroleum px-4 py-2 font-medium text-white"
          >
            Enviarme un enlace de acceso
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      )}
    </main>
  );
}
