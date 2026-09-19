import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireBusinessContext } from "@/lib/auth/business-context";
import { getOAuthClient, GOOGLE_CALENDAR_SCOPES } from "@/lib/google/oauth";

// Inicia el flujo OAuth para que el DUEÑO del negocio conecte SU propio
// Google Calendar. No recibe ni necesita el business_id en la URL: se
// re-deriva de la sesión en el callback (evita que alguien manipule a qué
// negocio se conecta el calendario).
export async function GET() {
  await requireBusinessContext(); // valida sesión; redirige a /login si no hay

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return new NextResponse(
      "Falta configurar GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET en las variables de entorno.",
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  cookies().set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // fuerza a Google a reemitir refresh_token aunque ya se haya autorizado antes
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  });

  return NextResponse.redirect(url);
}
