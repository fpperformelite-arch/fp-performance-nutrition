import crypto from "node:crypto";
import type { NormalizedIncomingMessage } from "@/lib/whatsapp/inbound";

// Cliente delgado sobre la API de Kapso (BSP de WhatsApp).
//
// Se usa SOLO para negocios cuyo número está conectado vía Kapso en modo
// coexistencia con la app de WhatsApp Business (ver docs/whatsapp-setup.md).
// Para números conectados directo a Meta Cloud API sin BSP, usa
// src/lib/whatsapp/client.ts en su lugar.
//
// Kapso actúa como proxy de la Graph API de Meta: la forma del mensaje es
// la misma que Meta espera, solo cambian el host y el header de auth.
const KAPSO_META_PROXY_VERSION = "v24.0";

// ───────────────────────────────────────────────────────────────────────
// Verificación de firma del webhook (Kapso → nuestra app).
// Header: X-Webhook-Signature = HMAC-SHA256(secret, rawBody) en hex.
// El secreto es el `secret_key` DE ESE WEBHOOK específico en Kapso
// (KAPSO_WEBHOOK_SECRET), NO la API key general de la cuenta.
// ───────────────────────────────────────────────────────────────────────
export function verifyKapsoSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string
): boolean {
  if (!signatureHeader) return false;

  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest("hex");

  const receivedBuf = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);

  if (receivedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(receivedBuf, expectedBuf);
}

interface SendTextParams {
  phoneNumberId: string;
  apiKey: string;
  to: string;
  body: string;
}

export async function sendKapsoWhatsAppText({
  phoneNumberId,
  apiKey,
  to,
  body,
}: SendTextParams): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const res = await fetch(
    `https://api.kapso.ai/meta/whatsapp/${KAPSO_META_PROXY_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body, preview_url: false },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return { ok: false, error: JSON.stringify(data) };
  }

  return { ok: true, messageId: data.messages?.[0]?.id };
}

// Payload del evento whatsapp.message.received (webhook sin buffering).
// Ver https://docs.kapso.ai/docs/platform/webhooks/message-events.md
interface KapsoMessageWebhookBody {
  message?: {
    id: string;
    type: string;
    from: string;
    text?: { body: string };
  };
  phone_number_id?: string;
}

export function parseKapsoMessagePayload(body: unknown): NormalizedIncomingMessage | null {
  const payload = body as KapsoMessageWebhookBody;
  const msg = payload.message;
  const phoneNumberId = payload.phone_number_id;

  if (!msg || !phoneNumberId) return null;

  if (msg.type === "text") {
    return {
      phoneNumberId,
      from: msg.from,
      type: "text",
      text: msg.text?.body ?? "",
      waMessageId: msg.id,
    };
  }

  return {
    phoneNumberId,
    from: msg.from,
    type: "unsupported",
    text: "",
    unsupportedType: msg.type,
    waMessageId: msg.id,
  };
}
