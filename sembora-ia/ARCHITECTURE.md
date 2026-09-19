# Arquitectura de SEMBORA IA

## 1. Principio rector: configuración, no ramas de código

SEMBORA IA sirve a "cualquier negocio de servicios que agende citas". La
tentación natural sería escribir algo como:

```ts
if (business.industry === "gimnasio") { ... }
else if (business.industry === "nutriologo") { ... }
```

Esto está **prohibido** en este proyecto. En vez de eso, todo lo que hace
que Bora se comporte distinto para un negocio vive en filas de base de
datos, no en el código de la aplicación:

| Lo que varía por negocio          | Dónde vive                          |
|------------------------------------|--------------------------------------|
| Nombre y tono del asistente        | `bora_configs`                       |
| Mensaje de bienvenida              | `bora_configs`                       |
| Horarios de atención               | `bora_configs.business_hours`        |
| Qué se puede agendar y su duración | `services`                           |
| Qué preguntas responde y cómo      | `faqs`                               |
| Reglas de agendado (buffers, aviso mínimo, horizonte) | `bora_configs` |
| Número de WhatsApp y calendario    | `bora_configs`                       |

El único lugar donde aparece un texto de industria (`industry_label`) es
informativo, para que tú como vendedor filtres/reportes en el panel — el
motor del bot (`src/lib/bora/engine.ts`) nunca lo lee.

Si en el futuro un giro necesita un flujo genuinamente distinto (ej.
"seleccionar sucursal" antes de elegir servicio), la forma correcta de
agregarlo es como un **paso opcional configurable** (ej. una columna
`business_locations` + un flag `requires_location_selection` en
`bora_configs`), no como una bifurcación por industria.

## 2. Multi-tenancy y aislamiento de datos

- Cada negocio es una fila en `businesses` (el "tenant").
- Todas las tablas de negocio (`leads`, `conversations`, `messages`,
  `appointments`, `services`, `faqs`, `bora_configs`) tienen `business_id`.
- **Row Level Security (RLS)** en Postgres/Supabase es la línea de defensa
  real: un usuario autenticado solo puede leer/escribir filas de los
  negocios a los que pertenece (`business_users`). Esto significa que un
  bug en el código del panel no puede filtrar datos de un cliente a otro —
  la base de datos lo impide aunque la app tenga un error.
- El webhook de WhatsApp no tiene un usuario de Supabase logueado (Meta le
  pega directo), así que usa la `service_role key` (bypassa RLS) y resuelve
  el tenant manualmente a partir de `whatsapp_phone_number_id` — ver
  `src/app/api/whatsapp/webhook/route.ts`.

## 3. Roles

- **owner**: dueño del negocio. Puede configurar Bora, servicios, FAQs,
  invitar staff.
- **staff**: ve leads/conversaciones/citas, pero no puede tocar la
  configuración del asistente ni gestionar otros usuarios.

Los permisos se aplican en dos capas: RLS en `business_users` (owners
gestionan staff) y en la UI (`/settings` solo se enlaza para owners en
`src/app/(dashboard)/layout.tsx`).

## 4. Flujo de un mensaje de WhatsApp

```
Meta (WhatsApp Cloud API)
   │  POST webhook
   ▼
/api/whatsapp/webhook  (route.ts)
   │  1. Identifica el negocio por phone_number_id → bora_configs
   │  2. Busca/crea lead + conversación (por teléfono)
   │  3. Guarda el mensaje entrante
   │  4. Llama a handleIncomingMessage() → src/lib/bora/engine.ts
   │       - Intenta responder por FAQ (keywords configuradas)
   │       - Si no, avanza la máquina de estados: saludo → nombre →
   │         servicio → disponibilidad (Google Calendar) → confirmación
   │  5. Persiste el nuevo estado de la conversación y del lead
   │  6. Envía la respuesta por la Graph API y la guarda como mensaje saliente
   ▼
Meta entrega el mensaje al lead
```

Este es el mismo camino de código sin importar si el negocio es un gimnasio
o una clínica dental — lo único que cambia es el contenido de
`bora_configs`, `services` y `faqs` para ese `business_id`.

## 5. Por qué Next.js + Supabase + Vercel (todo gratis para el piloto)

- **Vercel (Hobby)**: despliegue del frontend + rutas API (webhook incluido)
  sin costo, con HTTPS automático — requisito de Meta para el webhook.
- **Supabase (Free tier)**: Postgres administrado + Auth (magic links) +
  RLS sin costo hasta 500MB de DB y 50,000 usuarios activos/mes — de sobra
  para un piloto de 3-5 negocios.
- **WhatsApp Cloud API directa**: Meta da gratis las primeras 1,000
  conversaciones iniciadas por el negocio al mes (y las conversaciones que
  inicia el usuario son gratis siempre) — sin pagar a un BSP como Twilio o
  360dialog mientras el volumen del piloto sea bajo.
- **Google Calendar API**: gratis hasta cuotas muy altas para este caso de uso.

Cuando el proyecto crezca, cada pieza escala de forma independiente
(Supabase Pro, Vercel Pro, migrar a un BSP si se necesitan plantillas de
mensajes a mayor escala) sin rehacer arquitectura.

## 6. Secretos por tenant (nota de seguridad para cuando cobres)

Para el piloto, `bora_configs.google_refresh_token` guarda el refresh token
de Google en texto plano en la base de datos, protegido solo por RLS. Esto
es aceptable para 3-5 negocios de confianza en un piloto gratuito, pero
**antes de cobrar** debe moverse a
[Supabase Vault](https://supabase.com/docs/guides/database/vault) (guarda
el secreto cifrado y solo expone una referencia), para que ni tú con acceso
al panel de Supabase puedas leer los tokens en claro por accidente.

## 7. Qué falta a propósito en este MVP

- Envío de **plantillas de mensaje** (necesarias si Bora necesita reabrir
  una conversación fuera de la ventana de 24h de WhatsApp) — se agrega
  cuando el piloto lo requiera; hay que darlas de alta y aprobarlas en Meta.
- Cobro con Stripe — placeholder en `.env.example`, se implementa después
  del piloto según lo pediste.
- Selección de sucursal / múltiples calendarios por negocio — no es parte
  del piloto, pero el esquema ya deja espacio (agregar una tabla
  `locations` referenciada desde `services`/`appointments` sin tocar el
  motor de Bora).
