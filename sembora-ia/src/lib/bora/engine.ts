import type { Kysely } from "kysely";
import type { DB } from "@/lib/db/schema";
import {
  BoraConfig,
  Business,
  Conversation,
  ConversationBotState,
  Faq,
  Lead,
  Service,
} from "@/types/database";
import { getBusySlots, createCalendarEvent } from "@/lib/calendar/google";

// ───────────────────────────────────────────────────────────────────────
// Motor genérico de Bora.
//
// REGLA DE ORO: nada aquí debe mencionar un giro de negocio específico
// ("gimnasio", "nutriólogo", etc). Todo el comportamiento sale de:
//   - bora_configs  (tono, horarios, buffers)
//   - services      (qué se puede agendar)
//   - faqs          (qué preguntas responde y con qué texto)
// Si un negocio necesita un flujo distinto, se resuelve agregando datos de
// configuración, no ramas de código por industria.
// ───────────────────────────────────────────────────────────────────────

interface EngineContext {
  db: Kysely<DB>;
  business: Business;
  config: BoraConfig;
  services: Service[];
  faqs: Faq[];
}

export interface EngineResult {
  reply: string;
  newBotState: ConversationBotState;
  leadUpdates?: Partial<Lead>;
}

const STOPWORDS = new Set([
  "el", "la", "los", "las", "de", "que", "y", "a", "en", "un", "una",
  "es", "por", "para", "con", "se", "su", "mi", "me", "tu", "lo",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// Coincidencia simple por solapamiento de keywords. Suficiente para el MVP;
// se puede sustituir por embeddings/LLM sin tocar el resto del motor.
export function matchFaq(faqs: Faq[], userText: string): Faq | null {
  const tokens = new Set(tokenize(userText));
  if (tokens.size === 0) return null;

  let best: { faq: Faq; score: number } | null = null;

  for (const faq of faqs.filter((f) => f.is_active)) {
    const kw = faq.keywords.map((k) => k.toLowerCase());
    const score = kw.filter((k) => tokens.has(k)).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { faq, score };
    }
  }

  return best?.faq ?? null;
}

function formatServicesList(services: Service[]): string {
  return services
    .filter((s) => s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s, i) => {
      const price =
        s.price_cents != null
          ? ` — $${(s.price_cents / 100).toLocaleString("es-MX")} ${s.currency}`
          : "";
      return `${i + 1}. ${s.name} (${s.duration_minutes} min)${price}`;
    })
    .join("\n");
}

function findServiceByReply(services: Service[], text: string): Service | null {
  const active = services.filter((s) => s.is_active).sort((a, b) => a.sort_order - b.sort_order);
  const asNumber = parseInt(text.trim(), 10);
  if (!Number.isNaN(asNumber) && active[asNumber - 1]) return active[asNumber - 1];

  const lower = text.toLowerCase();
  return active.find((s) => s.name.toLowerCase().includes(lower)) ?? null;
}

// Genera slots candidatos dentro del horario configurado, excluyendo los
// ocupados según Google Calendar. Devuelve como máximo `limit` opciones.
async function suggestAvailableSlots(
  ctx: EngineContext,
  service: Service,
  limit = 3
): Promise<Date[]> {
  const { config } = ctx;
  if (!config.google_refresh_token || !config.google_calendar_id) {
    return []; // Sin calendario conectado: el flujo cae a "un staff te confirma".
  }

  const now = new Date();
  const timeMin = new Date(now.getTime() + config.min_notice_minutes * 60_000);
  const timeMax = new Date(now.getTime() + config.max_days_ahead * 24 * 60 * 60_000);

  const busy = await getBusySlots({
    refreshToken: config.google_refresh_token,
    calendarId: config.google_calendar_id,
    timeMinISO: timeMin.toISOString(),
    timeMaxISO: timeMax.toISOString(),
  });

  const busyRanges = busy.map((b) => ({
    start: new Date(b.start!).getTime(),
    end: new Date(b.end!).getTime(),
  }));

  const durationMs = service.duration_minutes * 60_000;
  const bufferMs = config.booking_buffer_minutes * 60_000;
  const stepMs = 30 * 60_000; // candidatos cada 30 min

  const candidates: Date[] = [];
  for (
    let t = timeMin.getTime();
    t < timeMax.getTime() && candidates.length < limit;
    t += stepMs
  ) {
    const slotStart = t;
    const slotEnd = t + durationMs;

    const withinBusinessHours = isWithinBusinessHours(
      new Date(slotStart),
      config.business_hours
    );
    if (!withinBusinessHours) continue;

    const overlaps = busyRanges.some(
      (b) => slotStart < b.end + bufferMs && slotEnd + bufferMs > b.start
    );
    if (!overlaps) candidates.push(new Date(slotStart));
  }

  return candidates;
}

function isWithinBusinessHours(
  date: Date,
  hours: BoraConfig["business_hours"]
): boolean {
  const dayKeys: (keyof typeof hours)[] = [
    "sun", "mon", "tue", "wed", "thu", "fri", "sat",
  ];
  const day = dayKeys[date.getDay()];
  const ranges = hours[day] ?? [];
  const hhmm = date.toTimeString().slice(0, 5);
  return ranges.some(([start, end]) => hhmm >= start && hhmm <= end);
}

export async function handleIncomingMessage(
  ctx: EngineContext,
  conversation: Conversation,
  lead: Lead,
  userText: string
): Promise<EngineResult> {
  const { config, services, faqs } = ctx;
  const step = conversation.bot_state.step;

  // 1. Las FAQs se intentan SIEMPRE primero, sin importar el paso del flujo,
  //    para que el usuario pueda preguntar algo aunque esté a mitad de un
  //    agendado (ej. "¿cuánto cuesta?" mientras da su nombre).
  const faqHit = matchFaq(faqs, userText);
  if (faqHit && step !== "booking") {
    return { reply: faqHit.answer, newBotState: conversation.bot_state };
  }

  switch (step) {
    case "greeting": {
      return {
        reply: `${config.welcome_message}\n\nPara ayudarte mejor, ¿me compartes tu nombre?`,
        newBotState: { step: "collecting_name" },
      };
    }

    case "collecting_name": {
      const name = userText.trim();
      return {
        reply:
          `¡Gusto en saludarte, ${name}! Estos son nuestros servicios:\n\n` +
          `${formatServicesList(services)}\n\n` +
          `Responde con el número o nombre del que te interesa.`,
        newBotState: { step: "collecting_service" },
        leadUpdates: { full_name: name },
      };
    }

    case "collecting_service": {
      const service = findServiceByReply(services, userText);
      if (!service) {
        return {
          reply: "No identifiqué esa opción. ¿Puedes responder con el número de la lista?",
          newBotState: conversation.bot_state,
        };
      }

      const slots = await suggestAvailableSlots(ctx, service);
      if (slots.length === 0) {
        return {
          reply:
            `Perfecto, "${service.name}". Un miembro de nuestro equipo te confirmará ` +
            `la disponibilidad y te contactará en breve para agendar.`,
          newBotState: { step: "done", service_id: service.id },
          leadUpdates: { service_id: service.id, status: "contacted", interest: service.name },
        };
      }

      const options = slots
        .map((d, i) => `${i + 1}. ${d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}`)
        .join("\n");

      return {
        reply: `Perfecto, "${service.name}". Estos horarios están disponibles:\n\n${options}\n\nResponde con el número de tu preferencia.`,
        newBotState: {
          step: "booking",
          service_id: service.id,
          slot_options: slots.map((d) => d.toISOString()),
        },
        leadUpdates: { service_id: service.id, interest: service.name },
      };
    }

    case "booking": {
      const options = (conversation.bot_state.slot_options as string[]) ?? [];
      const idx = parseInt(userText.trim(), 10) - 1;
      const chosenISO = options[idx];

      if (!chosenISO) {
        return {
          reply: "No reconocí esa opción. Responde con el número del horario que prefieres.",
          newBotState: conversation.bot_state,
        };
      }

      const service = services.find((s) => s.id === conversation.bot_state.service_id);
      const startsAt = new Date(chosenISO);
      const endsAt = new Date(startsAt.getTime() + (service?.duration_minutes ?? 30) * 60_000);

      let googleEventId: string | null = null;
      if (config.google_refresh_token && config.google_calendar_id) {
        const event = await createCalendarEvent({
          refreshToken: config.google_refresh_token,
          calendarId: config.google_calendar_id,
          summary: `${service?.name ?? "Cita"} — ${lead.full_name ?? lead.phone}`,
          description: `Agendado automáticamente por Bora. Lead: ${lead.phone}`,
          startISO: startsAt.toISOString(),
          endISO: endsAt.toISOString(),
          timezone: ctx.business.timezone,
        });
        googleEventId = event.id ?? null;
      }

      await ctx.db
        .insertInto("appointments")
        .values({
          business_id: ctx.business.id,
          lead_id: lead.id,
          service_id: service?.id ?? null,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          status: config.requires_confirmation ? "booked" : "confirmed",
          google_event_id: googleEventId,
        })
        .execute();

      return {
        reply:
          `¡Listo! Tu cita para "${service?.name}" quedó agendada el ` +
          `${startsAt.toLocaleString("es-MX", { dateStyle: "full", timeStyle: "short" })}. ` +
          `Te esperamos 🙌`,
        newBotState: { step: "done" },
        leadUpdates: { status: "scheduled" },
      };
    }

    case "done":
    default: {
      if (faqHit) {
        return { reply: faqHit.answer, newBotState: conversation.bot_state };
      }
      return {
        reply:
          "Un miembro de nuestro equipo revisará tu mensaje y te contactará pronto. " +
          "¿Hay algo más en lo que pueda ayudarte?",
        newBotState: conversation.bot_state,
      };
    }
  }
}
