import Link from "next/link";
import { db } from "@/lib/db/client";
import { requireBusinessContext } from "@/lib/auth/business-context";
import type { BoraConfig } from "@/types/database";
import { sql } from "kysely";

// Métricas básicas del MVP: conversaciones, citas agendadas, conversión.
// Se calculan al vuelo con consultas simples; si el volumen crece, esto se
// puede mover a una vista materializada sin cambiar la interfaz de la página.
export default async function DashboardPage() {
  const { business, membership } = await requireBusinessContext();

  const [conversationsResult, appointmentsResult, leadsResult, config, servicesResult, faqsResult] =
    await Promise.all([
      db
        .selectFrom("conversations")
        .select(sql<number>`count(*)`.as("count"))
        .where("business_id", "=", business.id)
        .executeTakeFirst(),
      db
        .selectFrom("appointments")
        .select(sql<number>`count(*)`.as("count"))
        .where("business_id", "=", business.id)
        .executeTakeFirst(),
      db
        .selectFrom("leads")
        .select(sql<number>`count(*)`.as("count"))
        .where("business_id", "=", business.id)
        .executeTakeFirst(),
      db
        .selectFrom("bora_configs")
        .selectAll()
        .where("business_id", "=", business.id)
        .executeTakeFirst() as Promise<BoraConfig | undefined>,
      db
        .selectFrom("services")
        .select(sql<number>`count(*)`.as("count"))
        .where("business_id", "=", business.id)
        .executeTakeFirst(),
      db
        .selectFrom("faqs")
        .select(sql<number>`count(*)`.as("count"))
        .where("business_id", "=", business.id)
        .executeTakeFirst(),
    ]);

  const conversationsCount = Number(conversationsResult?.count ?? 0);
  const appointmentsCount = Number(appointmentsResult?.count ?? 0);
  const leadsCount = Number(leadsResult?.count ?? 0);
  const servicesCount = Number(servicesResult?.count ?? 0);
  const faqsCount = Number(faqsResult?.count ?? 0);

  const conversion = leadsCount > 0 ? Math.round((appointmentsCount / leadsCount) * 100) : 0;

  const metrics = [
    { label: "Conversaciones", value: conversationsCount },
    { label: "Leads capturados", value: leadsCount },
    { label: "Citas agendadas", value: appointmentsCount },
    { label: "Conversión lead → cita", value: `${conversion}%` },
  ];

  const checklist = [
    {
      label: "Conecta tu número de WhatsApp",
      done: Boolean(config?.whatsapp_phone_number_id) && Boolean(config?.is_active),
    },
    { label: "Conecta Google Calendar", done: Boolean(config?.google_refresh_token) },
    { label: "Agrega al menos un servicio con precio", done: servicesCount > 0 },
    { label: "Agrega tus preguntas frecuentes", done: faqsCount > 0 },
  ];
  const pendingSteps = checklist.filter((s) => !s.done);

  return (
    <div>
      {membership.role === "owner" && pendingSteps.length > 0 && (
        <div className="mb-8 rounded-xl border border-coral/30 bg-coral/5 p-5">
          <h2 className="mb-3 font-semibold text-ink">
            Te faltan {pendingSteps.length} pasos para que Bora esté 100% activo
          </h2>
          <ul className="flex flex-col gap-2 text-sm">
            {checklist.map((step) => (
              <li key={step.label} className="flex items-center gap-2">
                <span
                  className={
                    step.done
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white text-xs"
                      : "flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 text-xs"
                  }
                >
                  {step.done ? "✓" : ""}
                </span>
                <span className={step.done ? "text-stone-400 line-through" : "text-ink"}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/settings"
            className="mt-4 inline-block rounded-full bg-petroleum px-5 py-2 text-sm text-white"
          >
            Ir a Configurar Bora
          </Link>
        </div>
      )}

      <h1 className="mb-6 font-bold text-2xl">Métricas</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-stone-200 p-4">
            <p className="text-sm text-stone-500">{m.label}</p>
            <p className="font-bold text-2xl text-petroleum">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
