import { requireBusinessContext } from "@/lib/auth/business-context";
import { startCheckout } from "./actions";

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

      <div className="max-w-lg rounded-xl border border-stone-200 p-5">
        <p className="font-bold text-lg text-petroleum">SEMBORA IA</p>
        <p className="mb-1 font-bold text-3xl text-ink">
          $599 <span className="font-normal text-base text-stone-500">MXN / mes</span>
        </p>
        <p className="mb-4 text-sm text-stone-500">
          WhatsApp con Bora, agendado en Google Calendar, leads y conversaciones ilimitadas.
        </p>
        <form action={startCheckout}>
          <button className="rounded-lg bg-petroleum px-4 py-2 text-sm text-white">
            Suscribirme
          </button>
        </form>
      </div>
    </div>
  );
}
