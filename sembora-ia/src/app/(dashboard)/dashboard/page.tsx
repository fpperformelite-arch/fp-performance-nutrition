import { db } from "@/lib/db/client";
import { requireBusinessContext } from "@/lib/auth/business-context";
import { sql } from "kysely";

// Métricas básicas del MVP: conversaciones, citas agendadas, conversión.
// Se calculan al vuelo con consultas simples; si el volumen crece, esto se
// puede mover a una vista materializada sin cambiar la interfaz de la página.
export default async function DashboardPage() {
  const { business } = await requireBusinessContext();

  const [conversationsResult, appointmentsResult, leadsResult] = await Promise.all([
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
  ]);

  const conversationsCount = Number(conversationsResult?.count ?? 0);
  const appointmentsCount = Number(appointmentsResult?.count ?? 0);
  const leadsCount = Number(leadsResult?.count ?? 0);

  const conversion = leadsCount > 0 ? Math.round((appointmentsCount / leadsCount) * 100) : 0;

  const metrics = [
    { label: "Conversaciones", value: conversationsCount },
    { label: "Leads capturados", value: leadsCount },
    { label: "Citas agendadas", value: appointmentsCount },
    { label: "Conversión lead → cita", value: `${conversion}%` },
  ];

  return (
    <div>
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
