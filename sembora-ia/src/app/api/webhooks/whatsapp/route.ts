import { NextRequest, NextResponse } from "next/server";
import { parseWhatsAppWebhookBody, sendWhatsAppText } from "@/lib/whatsapp/client";
import { verifyWhatsAppSignature } from "@/lib/whatsapp/verify-signature";
import { processIncomingMessage } from "@/lib/whatsapp/inbound";

// ───────────────────────────────────────────────────────────────────────
// GET: handshake de verificación que Meta hace UNA vez al configurar el
// webhook en la app de Meta for Developers. Ver docs/whatsapp-setup.md.
// ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// ───────────────────────────────────────────────────────────────────────
// POST: mensajes entrantes reales de WhatsApp, recibidos DIRECTO de Meta
// (sin BSP intermedio). Meta reintenta si no respondemos 200 rápido, así
// que confirmamos primero y procesamos.
// Este endpoint es multi-tenant: el phone_number_id de cada mensaje nos
// dice a qué `business` pertenece (bora_configs.whatsapp_phone_number_id).
//
// Seguridad: TODA petición se valida contra X-Hub-Signature-256 antes de
// tocar la base de datos. Sin WHATSAPP_APP_SECRET configurado, el webhook
// rechaza todo — preferimos no recibir mensajes a procesar peticiones que
// no podemos confirmar que vienen de Meta.
//
// Nota: si tu número está conectado vía Kapso (coexistencia con la app de
// WhatsApp Business), Meta le entrega los eventos a Kapso, no aquí — usa
// /api/webhooks/kapso/whatsapp en ese caso. Ver docs/whatsapp-setup.md.
// ───────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !process.env.WHATSAPP_ACCESS_TOKEN) {
    console.error(
      "Faltan WHATSAPP_APP_SECRET o WHATSAPP_ACCESS_TOKEN en las variables de entorno. Rechazando webhook."
    );
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifyWhatsAppSignature(rawBody, signature, appSecret)) {
    console.warn("Firma de webhook inválida — la petición no viene de Meta o el App Secret no coincide.");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const incoming = parseWhatsAppWebhookBody(body);

  for (const msg of incoming) {
    try {
      await processIncomingMessage(msg, ({ phoneNumberId, to, body }) =>
        sendWhatsAppText({
          phoneNumberId,
          accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
          to,
          body,
        })
      );
    } catch (err) {
      // No relanzamos: un fallo en un mensaje no debe tumbar el ack a Meta
      // ni afectar a otros negocios cuyos mensajes lleguen en el mismo batch.
      console.error("Error procesando mensaje de WhatsApp:", err);
    }
  }

  return NextResponse.json({ received: true });
}
