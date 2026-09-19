// Cliente delgado sobre la WhatsApp Cloud API (Graph API de Meta).
// No usamos ningún BSP intermedio: hablamos directo con graph.facebook.com.
//
// phoneNumberId y accessToken vienen de bora_configs / env, NUNCA hardcodeados,
// para que el mismo código sirva a todos los negocios (multi-tenant).

const GRAPH_API_VERSION = "v20.0";

interface SendTextParams {
  phoneNumberId: string;
  accessToken: string;
  to: string; // número del lead en formato E.164 sin "+", ej. "521234567890"
  body: string;
}

export async function sendWhatsAppText({
  phoneNumberId,
  accessToken,
  to,
  body,
}: SendTextParams): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return { ok: false, error: JSON.stringify(data) };
  }

  return { ok: true, messageId: data.messages?.[0]?.id };
}

// Payload entrante simplificado del webhook de WhatsApp.
// La forma real es más anidada (entry[].changes[].value...); aquí normalizamos
// lo que la aplicación necesita.
export interface IncomingWhatsAppMessage {
  phoneNumberId: string; // identifica a QUÉ negocio pertenece este mensaje
  from: string; // número del lead
  type: "text" | "unsupported";
  text: string; // vacío cuando type === "unsupported"
  unsupportedType?: string; // "image", "audio", "document", "location", etc.
  waMessageId: string;
  timestamp: string;
}

export function parseWhatsAppWebhookBody(
  body: unknown
): IncomingWhatsAppMessage[] {
  const messages: IncomingWhatsAppMessage[] = [];

  const entries = (body as { entry?: unknown[] })?.entry ?? [];
  for (const entry of entries as any[]) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      for (const msg of value?.messages ?? []) {
        if (msg.type === "text") {
          messages.push({
            phoneNumberId,
            from: msg.from,
            type: "text",
            text: msg.text?.body ?? "",
            waMessageId: msg.id,
            timestamp: msg.timestamp,
          });
        } else {
          // Imágenes, audio, ubicación, stickers, etc. — no leemos su
          // contenido, pero sí acusamos recibo con una respuesta genérica
          // en vez de dejar al lead sin ninguna respuesta.
          messages.push({
            phoneNumberId,
            from: msg.from,
            type: "unsupported",
            text: "",
            unsupportedType: msg.type,
            waMessageId: msg.id,
            timestamp: msg.timestamp,
          });
        }
      }
    }
  }

  return messages;
}
