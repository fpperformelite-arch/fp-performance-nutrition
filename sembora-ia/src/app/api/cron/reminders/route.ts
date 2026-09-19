import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sendWhatsAppText } from "@/lib/whatsapp/client";
import type { BoraConfig } from "@/types/database";

// Recordatorios de cita. Pensado para dispararse desde Vercel Cron
// (ver vercel.json) con un GET autenticado por CRON_SECRET.
//
// Limitación importante de WhatsApp que NO se puede resolver desde código:
// un mensaje de texto normal (el que usa sendWhatsAppText) solo se entrega
// si el lead te escribió en las últimas 24 horas. Si la cita se agendó hace
// más de 24h y el lead no ha vuelto a escribir, Meta rechazará este envío —
// para garantizar la entrega en ese caso hace falta una plantilla de
// mensaje aprobada por Meta (ver docs/whatsapp-setup.md, Paso 8) y
// cambiar el payload de sendWhatsAppText por uno de tipo "template". El
// mecanismo (cuándo recordar, a quién, marcar como enviado) ya queda listo;
// conectar la plantilla es un cambio de una función, no de arquitectura.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!process.env.WHATSAPP_ACCESS_TOKEN) {
    console.error("WHATSAPP_ACCESS_TOKEN no configurado. No se pueden enviar recordatorios.");
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  const now = new Date();

  const configs = (await db
    .selectFrom("bora_configs")
    .selectAll()
    .where("is_active", "=", true)
    .execute()) as BoraConfig[];

  let sent = 0;
  let failed = 0;

  for (const config of configs) {
    if (config.reminder_hours_before <= 0 || !config.whatsapp_phone_number_id) continue;

    const windowEnd = new Date(now.getTime() + config.reminder_hours_before * 60 * 60 * 1000);

    const dueAppointments = await db
      .selectFrom("appointments")
      .innerJoin("leads", "leads.id", "appointments.lead_id")
      .select([
        "appointments.id as appointment_id",
        "appointments.starts_at as starts_at",
        "leads.phone as phone",
        "leads.full_name as full_name",
      ])
      .where("appointments.business_id", "=", config.business_id)
      .where("appointments.status", "in", ["booked", "confirmed"])
      .where("appointments.reminder_sent_at", "is", null)
      .where("appointments.starts_at", ">=", now.toISOString())
      .where("appointments.starts_at", "<=", windowEnd.toISOString())
      .execute();

    for (const appt of dueAppointments) {
      const when = new Date(appt.starts_at).toLocaleString("es-MX", {
        dateStyle: "full",
        timeStyle: "short",
      });
      const greeting = appt.full_name ? `Hola ${appt.full_name}` : "Hola";
      const body = `${greeting}, te recordamos tu cita el ${when}. ¡Te esperamos!`;

      const result = await sendWhatsAppText({
        phoneNumberId: config.whatsapp_phone_number_id,
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
        to: appt.phone,
        body,
      });

      if (result.ok) {
        await db
          .updateTable("appointments")
          .set({ reminder_sent_at: new Date().toISOString() })
          .where("id", "=", appt.appointment_id)
          .execute();
        sent++;
      } else {
        failed++;
        console.error(`Fallo al enviar recordatorio para cita ${appt.appointment_id}:`, result.error);
      }
    }
  }

  return NextResponse.json({ sent, failed });
}
