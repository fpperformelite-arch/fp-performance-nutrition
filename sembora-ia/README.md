# SEMBORA IA

Plataforma SaaS multi-tenant, **independiente de cualquier otro producto**,
para negocios de servicios que agendan citas (gimnasios, nutriólogos,
entrenadores, clínicas, salones, spas, consultorios...). Cada negocio tiene
su propio panel y su propio asistente de WhatsApp con IA, **Bora**,
configurado sin escribir código.

Ver `ARCHITECTURE.md` para el diseño multi-tenant y `docs/whatsapp-setup.md`
para la guía paso a paso de Meta.

## Stack

- **Next.js 14** (App Router) — frontend + backend (Server Actions y rutas
  API) en un solo proyecto.
- **Neon (Postgres)** — base de datos. Sin Supabase: la auth, las sesiones y
  el multi-tenant se implementan sobre Postgres plano.
- **Kysely** — query builder tipado sobre `pg`.
- **Auth propia** — email + contraseña (bcrypt), sesiones respaldadas en la
  tabla `sessions` (revocables, no JWT stateless).
- **WhatsApp Cloud API** (directo, sin BSP) — mensajería.
- **Google Calendar API** (OAuth propio) — disponibilidad y agendado real.
- **Stripe** — cobros por suscripción (checkout + webhook).
- **Vercel** — despliegue + cron de recordatorios.

## 1. Base de datos (Neon)

1. Crea un proyecto gratuito en [neon.tech](https://neon.tech).
2. Copia la connection string **pooled** (host con `-pooler`) desde
   Connection Details → pégala en `DATABASE_URL`.
3. Corre las migraciones:

   ```bash
   cd sembora-ia
   cp .env.example .env.local   # llena DATABASE_URL como mínimo para esto
   npm install
   npm run db:migrate
   ```

   El runner (`scripts/migrate.mjs`) aplica `migrations/*.sql` en orden y
   lleva registro de lo ya aplicado en `_migrations` — es seguro correrlo
   de nuevo en cada deploy, solo aplica lo pendiente.

### Dar de alta el primer negocio

Ya no hace falta SQL manual: cualquier negocio (incluido el primero) se da
de alta solo, entrando a `/onboarding` (nombre del negocio, correo,
contraseña). Eso crea su fila en `businesses`, `bora_configs` y lo deja
logueado como owner.

## 2. Correr el proyecto localmente

```bash
cd sembora-ia
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) → "Crear cuenta" para
dar de alta tu primer negocio de prueba.

## 3. Configurar WhatsApp

Sigue `docs/whatsapp-setup.md` de principio a fin — ahí está exactamente
qué configurar en Meta (tokens, webhook, verify token) y cómo probarlo. El
endpoint del webhook es `/api/webhooks/whatsapp`.

## 4. Configurar Google Calendar

A diferencia de una integración manual, aquí hay un flujo OAuth real:
cada dueño de negocio entra a `/settings` y da clic en "Conectar Google
Calendar" — lo manda a `/api/google/connect`, que lo lleva a la pantalla de
consentimiento de Google, y `/api/google/callback` guarda su
`refresh_token` automáticamente.

Para que esto funcione necesitas credenciales OAuth propias:

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   → **Crear credenciales → ID de cliente de OAuth** → tipo "Aplicación web".
2. **URI de redirección autorizados**: agrega exactamente el valor de
   `GOOGLE_REDIRECT_URI` (ej. `https://sembora-ia.vercel.app/api/google/callback`).
3. Copia **Client ID** y **Client Secret** a `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`.
4. Habilita la **Google Calendar API** en el proyecto de Google Cloud
   (APIs & Services → Library).

## 5. Configurar Stripe (cobros)

1. Crea dos productos/precios recurrentes en tu
   [Dashboard de Stripe](https://dashboard.stripe.com/products) (planes
   "Starter" y "Pro") y copia sus Price IDs a `STRIPE_PRICE_STARTER` /
   `STRIPE_PRICE_PRO`.
2. Copia tu **Secret key** a `STRIPE_SECRET_KEY`.
3. En **Developers → Webhooks**, agrega un endpoint apuntando a
   `https://tu-dominio/api/webhooks/stripe`, escuchando los eventos
   `checkout.session.completed`, `customer.subscription.updated` y
   `customer.subscription.deleted`. Copia el **Signing secret** a
   `STRIPE_WEBHOOK_SECRET`.
4. Desde `/billing`, el dueño del negocio puede suscribirse — el webhook
   actualiza `businesses.status`/`plan` automáticamente cuando el pago se
   confirma.

Sin estas variables, `/billing` simplemente falla al iniciar un checkout
con un error explícito (no inventa un cobro ni finge éxito).

## 6. Recordatorios de citas (cron)

`vercel.json` programa `/api/cron/reminders` una vez al día (el plan Hobby
de Vercel limita la frecuencia de cron jobs; si estás en un plan de pago,
puedes cambiar el `schedule` a algo más frecuente, ej. cada hora).

Genera un secreto para `CRON_SECRET` (`openssl rand -hex 32`) y agrégalo en
Vercel — Vercel Cron lo manda automáticamente como header
`Authorization: Bearer <CRON_SECRET>` en cada invocación programada.

**Limitación real que debes conocer**: WhatsApp solo permite mensajes de
texto libres dentro de las 24h desde el último mensaje del lead. Un
recordatorio para una cita agendada hace más de 24h (y donde el lead no ha
vuelto a escribir) necesita una **plantilla de mensaje aprobada por Meta**
para entregarse con garantía — el mecanismo (cuándo recordar, marcar como
enviado) ya está listo en `src/app/api/cron/reminders/route.ts`; conectar
una plantilla aprobada es un cambio acotado a esa función, no de arquitectura.

## 7. Deploy a Vercel

1. Sube este repo a GitHub (ya lo tienes).
2. En [vercel.com](https://vercel.com) → **Add New Project**, importa el
   repo y selecciona `sembora-ia` como **Root Directory**.
3. Agrega TODAS las variables de `.env.example` en **Settings →
   Environment Variables**.
4. Deploy.
5. Corre `npm run db:migrate` (localmente, apuntando a la misma
   `DATABASE_URL` de producción, o desde un shell con esa variable) antes
   de usar la app por primera vez.
6. Usa la URL resultante como Callback URL del webhook de WhatsApp
   (`docs/whatsapp-setup.md`, Paso 6) y como `GOOGLE_REDIRECT_URI` /
   endpoint de webhook de Stripe.

## 8. Comandos útiles

```bash
npm run dev          # desarrollo local
npm run build        # build de producción (también valida tipos)
npm run typecheck    # solo TypeScript, sin build completo
npm run lint         # ESLint
npm run db:migrate   # aplica migraciones pendientes contra DATABASE_URL
```

## Estado de la plataforma

- [x] Base de datos multi-tenant en Neon/Postgres (sin Supabase)
- [x] Auth propia (email + contraseña, sesiones revocables) y onboarding self-service (`/onboarding`)
- [x] Roles owner/staff
- [x] Panel de administración (dashboard de métricas, CRM de leads, configuración de Bora)
- [x] Webhook de WhatsApp (`/api/webhooks/whatsapp`) con verificación de firma HMAC e idempotencia
- [x] Motor de conversación genérico de Bora (FAQs, captura de lead, agendado) — sin lógica por industria
- [x] Integración con Google Calendar vía OAuth propio (`/api/google/connect`, `/api/google/callback`)
- [x] Stripe: checkout (`/billing`) + webhook (`/api/webhooks/stripe`) que activa/cancela el plan del negocio
- [x] Recordatorios de cita vía Vercel Cron (`/api/cron/reminders`) — sujeto a la limitación de ventana de 24h de WhatsApp para garantía de entrega
- [ ] Plantillas de mensaje de WhatsApp aprobadas (necesarias para recordatorios fuera de la ventana de 24h)
- [ ] Selector de negocio para un usuario que pertenezca a más de uno (hoy se asume 1 usuario → 1 negocio)
