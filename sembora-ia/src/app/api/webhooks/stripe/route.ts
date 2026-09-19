import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/client";
import { db } from "@/lib/db/client";

// Webhook de Stripe: actualiza el plan/estado del negocio cuando el pago se
// confirma o la suscripción cambia. No existía ningún webhook de Stripe en
// el código antes de esto — se construye desde cero, sin inventar
// endpoints ni claves; STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET deben
// venir de tu cuenta real de Stripe (ver README).
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET no está configurado. Rechazando webhook.");
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", webhookSecret);
  } catch (err) {
    console.warn("Firma de webhook de Stripe inválida:", (err as Error).message);
    return new NextResponse("Invalid signature", { status: 401 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const businessId = session.client_reference_id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;

        if (businessId) {
          await db
            .updateTable("businesses")
            .set({
              status: "active",
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            })
            .where("id", "=", businessId)
            .execute();
        } else {
          console.warn(
            `checkout.session.completed sin client_reference_id (session ${session.id}) — no se pudo asociar a un negocio.`
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status === "active" || subscription.status === "trialing"
          ? "active"
          : "paused";

        await db
          .updateTable("businesses")
          .set({ status })
          .where("stripe_subscription_id", "=", subscription.id)
          .execute();
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await db
          .updateTable("businesses")
          .set({ status: "cancelled" })
          .where("stripe_subscription_id", "=", subscription.id)
          .execute();
        break;
      }

      default:
        // Eventos que no necesitamos manejar todavía (facturas, disputas, etc.)
        break;
    }
  } catch (err) {
    console.error("Error procesando evento de Stripe:", err);
    // Aun así respondemos 200: ya verificamos la firma, así que el evento es
    // legítimo. Un 5xx aquí solo lograría que Stripe reintente indefinidamente
    // un evento que probablemente vuelva a fallar por la misma razón.
  }

  return NextResponse.json({ received: true });
}
