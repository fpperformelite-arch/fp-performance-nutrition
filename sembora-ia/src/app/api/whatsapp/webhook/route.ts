import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { parseWhatsAppWebhookBody, sendWhatsAppText } from "@/lib/whatsapp/client";
import { verifyWhatsAppSignature } from "@/lib/whatsapp/verify-signature";
import { handleIncomingMessage } from "@/lib/bora/engine";
import type { BoraConfig, Business, Conversation, Faq, Lead, Service } from "@/types/database";

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
// POST: mensajes entrantes reales de WhatsApp. Meta reintenta si no
// respondemos 200 rápido, así que confirmamos primero y procesamos.
// Este endpoint es multi-tenant: el phone_number_id de cada mensaje nos
// dice a qué `business` pertenece (bora_configs.whatsapp_phone_number_id).
//
// Seguridad: TODA petición se valida contra X-Hub-Signature-256 antes de
// tocar la base de datos. Sin WHATSAPP_APP_SECRET configurado, el webhook
// rechaza todo — preferimos no recibir mensajes a procesar peticiones que
// no podemos confirmar que vienen de Meta.
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
  const supabase = createAdminSupabaseClient();

  for (const msg of incoming) {
    try {
      await processIncomingMessage(supabase, msg);
    } catch (err) {
      // No relanzamos: un fallo en un mensaje no debe tumbar el ack a Meta
      // ni afectar a otros negocios cuyos mensajes lleguen en el mismo batch.
      console.error("Error procesando mensaje de WhatsApp:", err);
    }
  }

  return NextResponse.json({ received: true });
}

async function processIncomingMessage(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  msg: ReturnType<typeof parseWhatsAppWebhookBody>[number]
) {
  // 0. Idempotencia: Meta reintenta la entrega si no confirmamos a tiempo,
  //    y puede reenviar el mismo mensaje más de una vez. wa_message_id es
  //    único por mensaje de WhatsApp, así que si ya lo procesamos, salimos
  //    sin volver a contestarle al lead ni duplicar el lead/cita.
  const { data: existing } = await supabase
    .from("messages")
    .select("id")
    .eq("wa_message_id", msg.waMessageId)
    .maybeSingle();

  if (existing) {
    console.info(`Mensaje ${msg.waMessageId} ya procesado, se ignora el reintento de Meta.`);
    return;
  }

  // 1. Resolver el tenant a partir del phone_number_id de WhatsApp.
  const { data: config } = await supabase
    .from("bora_configs")
    .select("*")
    .eq("whatsapp_phone_number_id", msg.phoneNumberId)
    .eq("is_active", true)
    .maybeSingle<BoraConfig>();

  if (!config) {
    console.warn(`Ningún negocio activo para phone_number_id=${msg.phoneNumberId}`);
    return;
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", config.business_id)
    .maybeSingle<Business>();

  if (!business) return;

  const [{ data: services }, { data: faqs }] = await Promise.all([
    supabase.from("services").select("*").eq("business_id", business.id),
    supabase.from("faqs").select("*").eq("business_id", business.id),
  ]);

  // 2. Obtener o crear el lead + conversación.
  let { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("business_id", business.id)
    .eq("phone", msg.from)
    .maybeSingle<Lead>();

  if (!lead) {
    const { data: newLead } = await supabase
      .from("leads")
      .insert({ business_id: business.id, phone: msg.from, source: "whatsapp" })
      .select()
      .single<Lead>();
    lead = newLead!;
  }

  let { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("lead_id", lead.id)
    .eq("status", "open")
    .maybeSingle<Conversation>();

  if (!conversation) {
    const { data: newConversation } = await supabase
      .from("conversations")
      .insert({ business_id: business.id, lead_id: lead.id })
      .select()
      .single<Conversation>();
    conversation = newConversation!;
  }

  // 3. Registrar el mensaje entrante (incluso si no es texto, para tener
  //    el historial completo de la conversación en el panel).
  await supabase.from("messages").insert({
    business_id: business.id,
    conversation_id: conversation.id,
    direction: "inbound",
    sender_type: "lead",
    content: msg.type === "text" ? msg.text : `[mensaje no soportado: ${msg.unsupportedType}]`,
    wa_message_id: msg.waMessageId,
  });

  // 4. Si no es texto, Bora no intenta interpretarlo — responde un mensaje
  //    genérico en vez de dejar al lead sin respuesta.
  const reply =
    msg.type === "text"
      ? (
          await handleIncomingMessage(
            {
              supabase,
              business,
              config,
              services: (services ?? []) as Service[],
              faqs: (faqs ?? []) as Faq[],
            },
            conversation,
            lead,
            msg.text
          )
        )
      : {
          reply: "Por ahora solo puedo leer mensajes de texto. ¿Me cuentas en unas palabras en qué te ayudo?",
          newBotState: conversation.bot_state,
        };

  // 5. Persistir el nuevo estado de conversación / lead.
  await supabase
    .from("conversations")
    .update({ bot_state: reply.newBotState, last_message_at: new Date().toISOString() })
    .eq("id", conversation.id);

  if (reply.leadUpdates) {
    await supabase.from("leads").update(reply.leadUpdates).eq("id", lead.id);
  }

  // 6. Enviar la respuesta y guardarla como mensaje saliente.
  const sendResult = await sendWhatsAppText({
    phoneNumberId: msg.phoneNumberId,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    to: msg.from,
    body: reply.reply,
  });

  if (!sendResult.ok) {
    console.error(`Fallo al enviar respuesta de WhatsApp a ${msg.from}:`, sendResult.error);
  }

  await supabase.from("messages").insert({
    business_id: business.id,
    conversation_id: conversation.id,
    direction: "outbound",
    sender_type: "bora",
    content: reply.reply,
    wa_message_id: sendResult.messageId,
  });
}
