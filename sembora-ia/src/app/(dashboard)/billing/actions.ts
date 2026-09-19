"use server";

import { redirect } from "next/navigation";
import { getStripeClient } from "@/lib/stripe/client";
import { requireOwnerContext } from "@/lib/auth/business-context";

const PRICE_ENV_BY_PLAN: Record<string, string> = {
  starter: "STRIPE_PRICE_STARTER",
  pro: "STRIPE_PRICE_PRO",
};

export async function startCheckout(formData: FormData) {
  const { business } = await requireOwnerContext();
  const plan = String(formData.get("plan"));
  const priceEnvVar = PRICE_ENV_BY_PLAN[plan];

  if (!priceEnvVar) {
    throw new Error(`Plan desconocido: "${plan}".`);
  }

  const priceId = process.env[priceEnvVar];
  if (!priceId) {
    throw new Error(
      `Falta configurar ${priceEnvVar} en las variables de entorno (el Price ID de Stripe para el plan "${plan}").`
    );
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: business.id,
    ...(business.stripe_customer_id ? { customer: business.stripe_customer_id } : {}),
    success_url: `${appUrl}/billing?success=1`,
    cancel_url: `${appUrl}/billing?canceled=1`,
  });

  if (!session.url) {
    throw new Error("Stripe no devolvió una URL de checkout.");
  }

  redirect(session.url);
}
