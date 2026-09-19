import Stripe from "stripe";

// Instancia bajo demanda (no en el top level del módulo) para que la app
// no truene al importarse en entornos donde STRIPE_SECRET_KEY todavía no
// está configurado (ej. antes del piloto, cuando Stripe "va después").
export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY no está configurado. Agrégalo en las variables de entorno para habilitar cobros."
    );
  }
  return new Stripe(secretKey);
}
