import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { requireBusinessContext } from "@/lib/auth/business-context";
import { getOAuthClient } from "@/lib/google/oauth";

export async function GET(req: NextRequest) {
  const { business } = await requireBusinessContext();

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = cookies().get("google_oauth_state")?.value;
  cookies().delete("google_oauth_state");

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/settings?google=error", req.url));
  }

  try {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      // No debería pasar porque /api/google/connect siempre manda prompt=consent,
      // pero si Google no lo entrega, no hay forma de refrescar el access token después.
      return NextResponse.redirect(new URL("/settings?google=error", req.url));
    }

    await db
      .updateTable("bora_configs")
      .set({ google_refresh_token: tokens.refresh_token, google_calendar_id: "primary" })
      .where("business_id", "=", business.id)
      .execute();

    return NextResponse.redirect(new URL("/settings?google=connected", req.url));
  } catch (err) {
    console.error("Error en el callback de Google OAuth:", err);
    return NextResponse.redirect(new URL("/settings?google=error", req.url));
  }
}
