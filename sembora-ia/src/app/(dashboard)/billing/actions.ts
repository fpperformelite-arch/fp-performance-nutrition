"use server";

import { redirect } from "next/navigation";
import { getStripeClient } from "@/lib/stripe/client";
import { requireOwnerContext } from "@/lib/auth/business-context";

export async function startCheckout() {
  const { business } = await requireOwnerContext();

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error(
      "Falta configurar STRIPE_PRICE_ID en las variables de entorno (el Price ID de Stripe del plan de SEMBORA IA)."
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
