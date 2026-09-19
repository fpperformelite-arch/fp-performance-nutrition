import { requireBusinessContext } from "@/lib/auth/business-context";
import { startCheckout } from "./actions";

const PLANS = [
  { id: "starter", name: "Starter", description: "Un negocio, WhatsApp + Google Calendar." },
  { id: "pro", name: "Pro", description: "Más volumen de conversaciones y soporte prioritario." },
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const { business } = await requireBusinessContext();

  return (
    <div>
      <h1 className="mb-2 font-bold text-2xl">Plan y facturación</h1>
      <p className="mb-6 text-sm text-stone-500">
        Plan actual: <span className="font-medium text-petroleum">{business.plan}</span> — estado:{" "}
        <span className="font-medium">{business.status}</span>
      </p>

      {searchParams.success && (
        <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-green-700 text-sm">
          Pago iniciado. Tu plan se actualizará en cuanto Stripe confirme el pago (unos segundos).
        </p>
      )}
      {searchParams.canceled && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-amber-700 text-sm">
          Pago cancelado — no se hizo ningún cargo.
        </p>
      )}

      <div className="grid max-w-lg gap-4">
        {PLANS.map((plan) => (
          <div key={plan.id} className="rounded-xl border border-stone-200 p-4">
            <p className="font-bold text-petroleum">{plan.name}</p>
            <p className="mb-3 text-sm text-stone-500">{plan.description}</p>
            <form action={startCheckout}>
              <input type="hidden" name="plan" value={plan.id} />
              <button className="rounded-lg bg-petroleum px-4 py-2 text-sm text-white">
                Suscribirme a {plan.name}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
