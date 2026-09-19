import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { parseWhatsAppWebhookBody, sendWhatsAppText } from "@/lib/whatsapp/client";
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
// ───────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const incoming = parseWhatsAppWebhookBody(body);

  // Responder rápido; el procesamiento real no necesita bloquear a Meta.
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
  // 1. Resolver el tenant a partir del phone_number_id de WhatsApp.
  const { data: config } = await supabase
    .from("bora_configs")
    .select("*")
    .eq("whatsapp_phone_number_id", msg.phoneNumberId)
    .eq("is_active", true)
    .single<BoraConfig>();

  if (!config) {
    console.warn(`Ningún negocio activo para phone_number_id=${msg.phoneNumberId}`);
    return;
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", config.business_id)
    .single<Business>();

  if (!business) return;

  const [{ data: services }, { data: faqs }] = await Promise.all([
    supabase.from("services").select("*").eq("business_id", business.id),
    supabase.from("faqs").select("*").eq("business_id", business.id),
  ]);

  // 2. Obtener o crear el lead + conversación (idempotente por teléfono).
  let { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("business_id", business.id)
    .eq("phone", msg.from)
    .single<Lead>();

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
    .single<Conversation>();

  if (!conversation) {
    const { data: newConversation } = await supabase
      .from("conversations")
      .insert({ business_id: business.id, lead_id: lead.id })
      .select()
      .single<Conversation>();
    conversation = newConversation!;
  }

  // 3. Registrar el mensaje entrante.
  await supabase.from("messages").insert({
    business_id: business.id,
    conversation_id: conversation.id,
    direction: "inbound",
    sender_type: "lead",
    content: msg.text,
    wa_message_id: msg.waMessageId,
  });

  // 4. Ejecutar el motor genérico de Bora.
  const result = await handleIncomingMessage(
    { supabase, business, config, services: (services ?? []) as Service[], faqs: (faqs ?? []) as Faq[] },
    conversation,
    lead,
    msg.text
  );

  // 5. Persistir el nuevo estado de conversación / lead.
  await supabase
    .from("conversations")
    .update({ bot_state: result.newBotState, last_message_at: new Date().toISOString() })
    .eq("id", conversation.id);

  if (result.leadUpdates) {
    await supabase.from("leads").update(result.leadUpdates).eq("id", lead.id);
  }

  // 6. Enviar la respuesta y guardarla como mensaje saliente.
  const sendResult = await sendWhatsAppText({
    phoneNumberId: msg.phoneNumberId,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    to: msg.from,
    body: result.reply,
  });

  await supabase.from("messages").insert({
    business_id: business.id,
    conversation_id: conversation.id,
    direction: "outbound",
    sender_type: "bora",
    content: result.reply,
    wa_message_id: sendResult.messageId,
  });
}
