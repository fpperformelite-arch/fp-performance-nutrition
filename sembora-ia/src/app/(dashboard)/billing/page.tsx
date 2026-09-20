import { requireBusinessContext } from "@/lib/auth/business-context";
import { startCheckout } from "./actions";
import { CreditCard, CheckCircle2 } from "lucide-react";

const FEATURES = [
  "Bora respondiendo en WhatsApp 24/7",
  "Agendado automático en Google Calendar",
  "Leads y conversaciones ilimitadas",
  "Soporte por WhatsApp",
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const { business } = await requireBusinessContext();

  return (
    <div>
      <h1 className="mb-2 font-bold text-2xl text-ink">Plan y facturación</h1>
      <p className="mb-6 text-sm text-stone-500">
        Plan actual: <span className="font-medium text-petroleum">{business.plan}</span> — estado:{" "}
        <span className="font-medium text-ink">{business.status}</span>
      </p>

      <div className="mb-6 flex flex-col gap-2">
        {searchParams.success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-green-700 text-sm">
            Pago iniciado. Tu plan se actualizará en cuanto Stripe confirme el pago (unos segundos).
          </p>
        )}
        {searchParams.canceled && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700 text-sm">
            Pago cancelado — no se hizo ningún cargo.
          </p>
        )}
      </div>

      <div className="card max-w-lg">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-petroleum/10 text-petroleum">
            <CreditCard size={18} strokeWidth={1.75} />
          </span>
          <p className="font-bold text-lg text-petroleum">SEMBORA IA</p>
        </div>
        <p className="mb-1 font-bold text-3xl text-ink">
          $599 <span className="font-normal text-base text-stone-500">MXN / mes</span>
        </p>
        <p className="mb-4 text-sm text-stone-500">Un solo plan, todo incluido.</p>
        <ul className="mb-5 flex flex-col gap-2 text-sm">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-ink">
              <CheckCircle2 size={16} strokeWidth={2} className="shrink-0 text-petroleum" />
              {f}
            </li>
          ))}
        </ul>
        <form action={startCheckout}>
          <button className="btn-primary">Suscribirme</button>
        </form>
      </div>
    </div>
  );
}
