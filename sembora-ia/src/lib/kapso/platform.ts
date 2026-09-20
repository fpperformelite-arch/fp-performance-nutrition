// API de plataforma de Kapso (distinta de la de mensajería en client.ts):
// crear clientes y generar Setup Links, para que el DUEÑO de un negocio
// conecte su propio WhatsApp sin que nadie de SEMBORA IA entre al
// dashboard de Kapso por él. Ver docs/whatsapp-setup.md.
const KAPSO_PLATFORM_BASE = "https://api.kapso.ai/platform/v1";

function requireApiKey(): string {
  const apiKey = process.env.KAPSO_API_KEY;
  if (!apiKey) {
    throw new Error("KAPSO_API_KEY no está configurado en las variables de entorno.");
  }
  return apiKey;
}

async function kapsoFetch(path: string, init: RequestInit) {
  const res = await fetch(`${KAPSO_PLATFORM_BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": requireApiKey(),
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Kapso API error (${res.status}) en ${path}: ${JSON.stringify(data)}`);
  }
  return data;
}

// Un "customer" en Kapso agrupa los números de WhatsApp de UN negocio de
// SEMBORA IA. Se crea una sola vez por negocio; guardamos su id en
// bora_configs.kapso_customer_id para no duplicarlo en conexiones futuras
// (ej. si el dueño reconecta o agrega un segundo número).
export async function createKapsoCustomer(name: string): Promise<string> {
  const data = await kapsoFetch("/customers", {
    method: "POST",
    body: JSON.stringify({ customer: { name } }),
  });
  return data.data.id as string;
}

interface CreateSetupLinkParams {
  customerId: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
}

// Genera la URL hospedada por Kapso donde el dueño del negocio inicia
// sesión con SU Facebook y conecta SU WhatsApp Business — nosotros nunca
// vemos ni tocamos esas credenciales. Al terminar, Kapso redirige de vuelta
// a `successRedirectUrl` con `phone_number_id` y `business_account_id` como
// query params.
export async function createKapsoSetupLink({
  customerId,
  successRedirectUrl,
  failureRedirectUrl,
}: CreateSetupLinkParams): Promise<string> {
  const data = await kapsoFetch(`/customers/${customerId}/setup_links`, {
    method: "POST",
    body: JSON.stringify({
      setup_link: {
        success_redirect_url: successRedirectUrl,
        failure_redirect_url: failureRedirectUrl,
        allowed_connection_types: ["coexistence", "dedicated"],
        meta_billing_mode: "customer_managed",
        language: "es",
      },
    }),
  });
  return data.data.url as string;
}
