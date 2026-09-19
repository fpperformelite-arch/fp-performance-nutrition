import { db } from "@/lib/db/client";
import { requireBusinessContext } from "@/lib/auth/business-context";
import type { Lead } from "@/types/database";

const STATUS_LABEL: Record<Lead["status"], string> = {
  new: "Nuevo",
  contacted: "Contactado",
  scheduled: "Agendado",
  customer: "Cliente",
  lost: "Perdido",
};

const STATUS_COLOR: Record<Lead["status"], string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  scheduled: "bg-purple-100 text-purple-700",
  customer: "bg-green-100 text-green-700",
  lost: "bg-stone-200 text-stone-600",
};

export default async function LeadsPage() {
  const { business } = await requireBusinessContext();

  const leads = (await db
    .selectFrom("leads")
    .selectAll()
    .where("business_id", "=", business.id)
    .orderBy("created_at", "desc")
    .execute()) as Lead[];

  return (
    <div>
      <h1 className="mb-6 font-bold text-2xl">Leads y conversaciones</h1>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-stone-500">
            <th className="py-2">Nombre</th>
            <th>Teléfono</th>
            <th>Interés</th>
            <th>Estado</th>
            <th>Creado</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-stone-100">
              <td className="py-2">{lead.full_name ?? "—"}</td>
              <td>{lead.phone}</td>
              <td>{lead.interest ?? "—"}</td>
              <td>
                <span className={`rounded-full px-2 py-1 text-xs ${STATUS_COLOR[lead.status]}`}>
                  {STATUS_LABEL[lead.status]}
                </span>
              </td>
              <td>{new Date(lead.created_at).toLocaleDateString("es-MX")}</td>
            </tr>
          ))}
          {leads.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-stone-400">
                Aún no hay leads. En cuanto alguien escriba a tu WhatsApp, aparecerá aquí.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
