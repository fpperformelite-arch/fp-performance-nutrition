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
- **Sin Row Level Security**: al usar Neon/Postgres plano (sin Supabase),
  no hay una capa de RLS que aísle tenants automáticamente. El aislamiento
  se aplica **en la capa de aplicación**, y tiene un único punto de
  entrada: `requireBusinessContext()` (`src/lib/auth/business-context.ts`).
  Toda página, Server Action o handler que toque datos de negocio debe
  obtener `business.id` de ahí — nunca de un parámetro que venga del
  cliente (formulario, query string, body de una request). Esto es la
  responsabilidad más importante que antes cubría Supabase automáticamente
  y ahora recae en la disciplina del código: cualquier query nueva a
  `leads`, `appointments`, etc. DEBE incluir `.where("business_id", "=", business.id)`.
- El webhook de WhatsApp y el de Stripe no tienen una sesión de usuario
  (Meta/Stripe pegan directo), así que resuelven el tenant por otra vía:
  el webhook de WhatsApp por `whatsapp_phone_number_id` (ver
  `src/app/api/webhooks/whatsapp/route.ts`), el de Stripe por
  `stripe_customer_id`/`stripe_subscription_id` o el `client_reference_id`
  que se manda al crear el Checkout Session (ver
  `src/app/api/webhooks/stripe/route.ts`).

## 3. Autenticación y roles

- Auth propia sobre Neon: `users` (email + contraseña con bcrypt) y
  `sessions` (token aleatorio de 256 bits, revocable, no JWT stateless) —
  ver `src/lib/auth/`. Se eligió email+contraseña en vez de "magic link"
  para no depender de un proveedor de correo transaccional adicional
  (Resend, SMTP, etc.) que habría sido una dependencia nueva no pedida.
- **owner**: dueño del negocio. Puede configurar Bora, servicios, FAQs,
  facturación, y (a futuro) invitar staff.
- **staff**: ve leads/conversaciones/citas, pero no puede tocar la
  configuración del asistente, facturación, ni gestionar otros usuarios.

Los permisos se aplican en la UI (`/settings` y `/billing` solo se enlazan
para owners en `src/app/(dashboard)/layout.tsx`) y deben reforzarse en cada
Server Action que solo el owner debería poder ejecutar (hoy todas las
acciones de `/settings` son alcanzables por cualquier miembro del negocio,
igual que en el MVP anterior — restringir por rol es una mejora futura
acotada, no un cambio de arquitectura).

## 4. Flujo de un mensaje de WhatsApp

```
Meta (WhatsApp Cloud API)
   │  POST webhook
   ▼
/api/webhooks/whatsapp  (route.ts)
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

## 5. Piezas de producción y cómo encajan

- **Onboarding** (`/onboarding`): alta self-service de negocio + owner en
  una transacción (`src/app/(auth)/actions.ts` → `registerAction`).
- **Google Calendar** (`/api/google/connect`, `/api/google/callback`):
  OAuth real — el dueño autoriza su propio calendario, el refresh token
  queda guardado en `bora_configs.google_refresh_token` para que
  `src/lib/calendar/google.ts` consulte disponibilidad y cree eventos.
- **Stripe** (`/billing`, `/api/webhooks/stripe`): `startCheckout` crea una
  Checkout Session con `client_reference_id = business.id`; el webhook usa
  ese campo para activar el plan cuando el pago se confirma, y
  `stripe_subscription_id` para reaccionar a cambios/cancelaciones después.
- **Recordatorios** (`/api/cron/reminders` + `vercel.json`): revisa citas
  próximas por negocio (según `bora_configs.reminder_hours_before`) y
  envía un recordatorio de WhatsApp, marcando `appointments.reminder_sent_at`
  para no enviarlo dos veces.

## 6. Por qué Next.js + Neon + Vercel (bajo costo, escalable)

- **Vercel (Hobby)**: despliegue del frontend + rutas API (webhooks
  incluidos) sin costo, con HTTPS automático — requisito de Meta y Stripe
  para sus webhooks. El cron de recordatorios corre aquí también (con la
  limitación de frecuencia del plan gratuito, ver README).
- **Neon (Free tier)**: Postgres serverless real, con connection pooling
  incluido (necesario para funciones serverless de Vercel) — sin costo
  hasta 0.5 GB de almacenamiento, suficiente para un piloto de varios
  negocios.
- **WhatsApp Cloud API directa**: Meta da gratis las conversaciones que
  inicia el usuario (que es como opera Bora: siempre reacciona a mensajes
  entrantes) — sin pagar a un BSP como Twilio o 360dialog.
- **Google Calendar API**: gratis hasta cuotas muy altas para este caso de uso.
- **Stripe**: sin costo fijo, comisión solo por transacción cobrada.

## 7. Secretos por tenant (nota de seguridad para cuando el volumen crezca)

`bora_configs.google_refresh_token` guarda el refresh token de Google en
texto plano en la base de datos, protegido solo por el control de acceso a
nivel de aplicación (no hay RLS en Neon). Esto es aceptable para un número
manejable de negocios de confianza, pero antes de escalar a muchos clientes
de pago conviene moverlo a un almacén de secretos cifrado (ej. un KMS
externo, o cifrar la columna con una clave que NO viva en la misma base de
datos), para que ni con acceso directo a Postgres se puedan leer los
tokens en claro.

## 8. Qué falta a propósito

- **Plantillas de mensaje de WhatsApp** aprobadas por Meta — necesarias
  para que los recordatorios (o cualquier mensaje que Bora inicie) se
  entreguen con garantía fuera de la ventana de 24h. El mecanismo de
  recordatorios ya existe; conectar una plantilla aprobada es un cambio
  acotado a `sendWhatsAppText`/`route.ts` de `/api/cron/reminders`.
- **Restricción por rol en Server Actions**: hoy `requireBusinessContext()`
  valida que haya sesión y devuelve el rol, pero las acciones de
  `/settings` no verifican explícitamente `membership.role === "owner"`
  antes de escribir — la UI oculta el enlace a staff, pero un staff que
  llame la Server Action directamente (poco probable, pero posible) podría
  editar la configuración. Vale la pena añadir la verificación de rol
  explícita antes de dar de alta staff de verdad.
- Selección de sucursal / múltiples calendarios por negocio — el esquema
  ya deja espacio (agregar una tabla `locations` referenciada desde
  `services`/`appointments` sin tocar el motor de Bora).
