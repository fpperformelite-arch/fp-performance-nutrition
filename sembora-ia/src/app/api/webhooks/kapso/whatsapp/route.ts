import { NextRequest, NextResponse } from "next/server";
import {
  verifyKapsoSignature,
  sendKapsoWhatsAppText,
  parseKapsoMessagePayload,
} from "@/lib/kapso/client";
import { processIncomingMessage } from "@/lib/whatsapp/inbound";

// ───────────────────────────────────────────────────────────────────────
// POST: mensajes entrantes de WhatsApp para negocios conectados vía Kapso
// (BSP), típicamente números en modo coexistencia con la app de WhatsApp
// Business. Meta le entrega los eventos a Kapso, y Kapso nos los reenvía
// aquí. Ver docs/whatsapp-setup.md para cuándo usar esta ruta vs
// /api/webhooks/whatsapp (Meta directo).
//
// Seguridad: TODA petición se valida contra X-Webhook-Signature (HMAC-SHA256
// del cuerpo crudo, firmado con el secret_key de ESTE webhook en Kapso)
// antes de tocar la base de datos.
// ───────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.KAPSO_WEBHOOK_SECRET;
  const apiKey = process.env.KAPSO_API_KEY;

  if (!webhookSecret || !apiKey) {
    console.error("Faltan KAPSO_WEBHOOK_SECRET o KAPSO_API_KEY en las variables de entorno. Rechazando webhook.");
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature");

  if (!verifyKapsoSignature(rawBody, signature, webhookSecret)) {
    console.warn("Firma de webhook Kapso inválida — la petición no viene de Kapso o el secret no coincide.");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  // Kapso manda el tipo de evento en un header, no en el body. Solo nos
  // interesan mensajes entrantes; otros eventos (status, conexión, etc.)
  // se confirman sin procesar.
  const eventType = req.headers.get("x-webhook-event");
  if (eventType && eventType !== "whatsapp.message.received") {
    return NextResponse.json({ received: true });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const msg = parseKapsoMessagePayload(body);
  if (!msg) {
    return NextResponse.json({ received: true });
  }

  try {
    await processIncomingMessage(msg, ({ phoneNumberId, to, body }) =>
      sendKapsoWhatsAppText({ phoneNumberId, apiKey, to, body })
    );
  } catch (err) {
    // No relanzamos: un fallo en un mensaje no debe tumbar el ack a Kapso.
    console.error("Error procesando mensaje de Kapso:", err);
  }

  return NextResponse.json({ received: true });
}
