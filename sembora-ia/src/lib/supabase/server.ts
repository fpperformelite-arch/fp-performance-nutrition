import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente de Supabase para Server Components / Route Handlers, atado a la
// sesión del usuario (respeta RLS).
export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se llama desde un Server Component sin permiso de escritura de
            // cookies; el middleware ya se encarga de refrescar la sesión.
          }
        },
      },
    }
  );
}

// Cliente "admin" con la service_role key: bypassa RLS por completo.
// Úsalo SOLO en contextos de servidor de confianza sin sesión de usuario,
// como el webhook de WhatsApp o jobs internos. Nunca lo importes desde
// código que pueda ejecutarse en el navegador.
export function createAdminSupabaseClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
