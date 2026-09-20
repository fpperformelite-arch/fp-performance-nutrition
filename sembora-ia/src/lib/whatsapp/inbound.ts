import { db } from "@/lib/db/client";
import { handleIncomingMessage } from "@/lib/bora/engine";
import type { BoraConfig, Business, Conversation, Faq, Lead, Service } from "@/types/database";

// ───────────────────────────────────────────────────────────────────────
// Lógica de negocio compartida por CUALQUIER canal de entrada de WhatsApp
// (Meta Cloud API directo, o un BSP como Kapso). Cada webhook solo necesita
// normalizar su payload propio a `NormalizedIncomingMessage` y darle una
// función para enviar la respuesta por su propio canal — todo lo demás
// (idempotencia, resolución de tenant, motor de Bora, persistencia) vive
// aquí una sola vez.
// ───────────────────────────────────────────────────────────────────────

export interface NormalizedIncomingMessage {
  phoneNumberId: string; // identifica a QUÉ negocio pertenece este mensaje
  from: string; // número del lead
  type: "text" | "unsupported";
  text: string; // vacío cuando type === "unsupported"
  unsupportedType?: string;
  waMessageId: string;
}

export type SendReplyFn = (params: {
  phoneNumberId: string;
  to: string;
  body: string;
}) => Promise<{ ok: boolean; messageId?: string; error?: string }>;

export async function processIncomingMessage(
  msg: NormalizedIncomingMessage,
  sendReply: SendReplyFn
) {
  // 0. Idempotencia: tanto Meta como Kapso pueden reintentar la entrega si
  //    no confirmamos a tiempo. wa_message_id es único por mensaje real de
  //    WhatsApp (viene de Meta en ambos casos), así que si ya lo procesamos
  //    salimos sin volver a contestarle al lead ni duplicar el lead/cita.
  const existing = await db
    .selectFrom("messages")
    .select("id")
    .where("wa_message_id", "=", msg.waMessageId)
    .executeTakeFirst();

  if (existing) {
    console.info(`Mensaje ${msg.waMessageId} ya procesado, se ignora el reintento.`);
    return;
  }

  // 1. Resolver el tenant a partir del phone_number_id de WhatsApp.
  const config = (await db
    .selectFrom("bora_configs")
    .selectAll()
    .where("whatsapp_phone_number_id", "=", msg.phoneNumberId)
    .where("is_active", "=", true)
    .executeTakeFirst()) as BoraConfig | undefined;

  if (!config) {
    console.warn(`Ningún negocio activo para phone_number_id=${msg.phoneNumberId}`);
    return;
  }

  const business = (await db
    .selectFrom("businesses")
    .selectAll()
    .where("id", "=", config.business_id)
    .executeTakeFirst()) as Business | undefined;

  if (!business) return;

  const [services, faqs] = await Promise.all([
    db.selectFrom("services").selectAll().where("business_id", "=", business.id).execute() as Promise<
      Service[]
    >,
    db.selectFrom("faqs").selectAll().where("business_id", "=", business.id).execute() as Promise<Faq[]>,
  ]);

  // 2. Obtener o crear el lead + conversación.
  let lead = (await db
    .selectFrom("leads")
    .selectAll()
    .where("business_id", "=", business.id)
    .where("phone", "=", msg.from)
    .executeTakeFirst()) as Lead | undefined;

  if (!lead) {
    lead = (await db
      .insertInto("leads")
      .values({ business_id: business.id, phone: msg.from, source: "whatsapp" })
      .returningAll()
      .executeTakeFirstOrThrow()) as Lead;
  }

  let conversation = (await db
    .selectFrom("conversations")
    .selectAll()
    .where("lead_id", "=", lead.id)
    .where("status", "=", "open")
    .executeTakeFirst()) as Conversation | undefined;

  if (!conversation) {
    conversation = (await db
      .insertInto("conversations")
      .values({ business_id: business.id, lead_id: lead.id })
      .returningAll()
      .executeTakeFirstOrThrow()) as Conversation;
  }

  // 3. Registrar el mensaje entrante (incluso si no es texto, para tener
  //    el historial completo de la conversación en el panel).
  await db
    .insertInto("messages")
    .values({
      business_id: business.id,
      conversation_id: conversation.id,
      direction: "inbound",
      sender_type: "lead",
      content: msg.type === "text" ? msg.text : `[mensaje no soportado: ${msg.unsupportedType}]`,
      wa_message_id: msg.waMessageId,
    })
    .execute();

  // 4. Si no es texto, Bora no intenta interpretarlo — responde un mensaje
  //    genérico en vez de dejar al lead sin respuesta.
  const reply =
    msg.type === "text"
      ? await handleIncomingMessage(
          { db, business, config, services, faqs },
          conversation,
          lead,
          msg.text
        )
      : {
          reply: "Por ahora solo puedo leer mensajes de texto. ¿Me cuentas en unas palabras en qué te ayudo?",
          newBotState: conversation.bot_state,
        };

  // 5. Persistir el nuevo estado de conversación / lead.
  await db
    .updateTable("conversations")
    .set({ bot_state: reply.newBotState, last_message_at: new Date().toISOString() })
    .where("id", "=", conversation.id)
    .execute();

  if ("leadUpdates" in reply && reply.leadUpdates) {
    await db.updateTable("leads").set(reply.leadUpdates).where("id", "=", lead.id).execute();
  }

  // 6. Enviar la respuesta (por el canal que corresponda) y guardarla como
  //    mensaje saliente.
  const sendResult = await sendReply({
    phoneNumberId: msg.phoneNumberId,
    to: msg.from,
    body: reply.reply,
  });

  if (!sendResult.ok) {
    console.error(`Fallo al enviar respuesta de WhatsApp a ${msg.from}:`, sendResult.error);
  }

  await db
    .insertInto("messages")
    .values({
      business_id: business.id,
      conversation_id: conversation.id,
      direction: "outbound",
      sender_type: "bora",
      content: reply.reply,
      wa_message_id: sendResult.messageId ?? null,
    })
    .execute();
}
