import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { requireOwnerContext } from "@/lib/auth/business-context";
import { createKapsoCustomer, createKapsoSetupLink } from "@/lib/kapso/platform";
import type { BoraConfig } from "@/types/database";

// Inicia el flujo self-service de conexión de WhatsApp: crea (si no existe)
// un customer de Kapso para este negocio, genera un Setup Link, y manda al
// dueño directo a la pantalla de Kapso/Facebook donde conecta SU número.
// Reemplaza, para negocios nuevos, el proceso manual de 2 horas que tuvimos
// que hacer para el número real de FP Performance.
export async function GET() {
  const { business } = await requireOwnerContext();

  if (!process.env.KAPSO_API_KEY) {
    return new NextResponse(
      "Falta configurar KAPSO_API_KEY en las variables de entorno.",
      { status: 500 }
    );
  }

  const config = (await db
    .selectFrom("bora_configs")
    .selectAll()
    .where("business_id", "=", business.id)
    .executeTakeFirst()) as BoraConfig | undefined;

  let kapsoCustomerId = config?.kapso_customer_id ?? null;

  if (!kapsoCustomerId) {
    kapsoCustomerId = await createKapsoCustomer(business.name);
    await db
      .updateTable("bora_configs")
      .set({ kapso_customer_id: kapsoCustomerId })
      .where("business_id", "=", business.id)
      .execute();
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const setupUrl = await createKapsoSetupLink({
    customerId: kapsoCustomerId,
    successRedirectUrl: `${appUrl}/api/kapso/setup-callback`,
    failureRedirectUrl: `${appUrl}/settings?whatsapp=error`,
  });

  return NextResponse.redirect(setupUrl);
}
