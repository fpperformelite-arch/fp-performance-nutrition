import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para usar en Client Components (navegador).
// Respeta RLS: solo ve lo que la política de la tabla permite al usuario logueado.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
