import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { requireBusinessContext } from "@/lib/auth/business-context";

// Kapso redirige aquí después de que el dueño del negocio conecta su
// WhatsApp en la pantalla hospedada de Kapso, con phone_number_id y
// business_account_id como query params (ver docs de Kapso Setup Links).
// Guardamos esos valores y activamos a Bora automáticamente — el dueño ya
// tomó la decisión de conectar al darle "Conectar WhatsApp".
export async function GET(req: NextRequest) {
  const { business } = await requireBusinessContext();

  const { searchParams } = new URL(req.url);
  const phoneNumberId = searchParams.get("phone_number_id");
  const businessAccountId = searchParams.get("business_account_id");

  if (!phoneNumberId) {
    return NextResponse.redirect(new URL("/settings?whatsapp=error", req.url));
  }

  await db
    .updateTable("bora_configs")
    .set({
      whatsapp_phone_number_id: phoneNumberId,
      whatsapp_business_account_id: businessAccountId,
      is_active: true,
    })
    .where("business_id", "=", business.id)
    .execute();

  return NextResponse.redirect(new URL("/settings?whatsapp=connected", req.url));
}
