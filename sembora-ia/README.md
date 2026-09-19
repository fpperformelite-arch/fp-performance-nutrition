# SEMBORA IA

Plataforma SaaS multi-tenant para negocios de servicios que agendan citas
(gimnasios, nutriólogos, entrenadores, clínicas, salones, spas,
consultorios...). Cada negocio tiene su propio panel y su propio asistente
de WhatsApp con IA, **Bora**, configurado sin escribir código.

Ver `ARCHITECTURE.md` para el diseño multi-tenant y `docs/whatsapp-setup.md`
para la guía paso a paso de Meta.

## Stack

- **Next.js 14** (App Router) — frontend + backend en un solo proyecto.
- **Supabase** — Postgres, Auth (magic link), Row Level Security.
- **WhatsApp Cloud API** (directo, sin BSP) — mensajería.
- **Google Calendar API** — disponibilidad y agendado real.
- **Vercel** — despliegue (plan gratuito).
- **Stripe** — cobros (se activa después del piloto).

## 1. Setup del proyecto Supabase

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. En **SQL Editor**, corre en orden el contenido de
   `supabase/migrations/0001_init.sql` (tablas, RLS, triggers) y luego
   `supabase/migrations/0002_production_hardening.sql` (constraints de
   idempotencia y de aislamiento entre negocios — necesarias antes de
   conectar un número real).
3. En **Authentication → Providers**, confirma que **Email** esté activo
   (usamos magic links, no contraseñas, para el MVP).
4. En **Authentication → URL Configuration**, agrega
   `http://localhost:3000/**` y la URL de tu deploy de Vercel a los
   "Redirect URLs".
5. Copia `Project URL` y `anon public key` (Settings → API) para tu `.env`.
6. Copia también la `service_role key` (Settings → API) — **nunca la
   expongas al cliente**, solo se usa en `SUPABASE_SERVICE_ROLE_KEY`.

### Dar de alta tu primer negocio (piloto)

Como el registro de negocios (onboarding self-service) no es parte del
MVP prioritario, para el piloto das de alta cada negocio a mano desde el
SQL Editor de Supabase, usando la plantilla de
`supabase/seed/onboard_business_template.sql` (copia el archivo, rellena
los placeholders y córrelo). Necesitas haber completado
`docs/whatsapp-setup.md` hasta obtener el `phone_number_id` del número real
del negocio antes de correrla.

## 2. Correr el proyecto localmente

```bash
cd sembora-ia
cp .env.example .env.local   # llena los valores
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## 3. Configurar WhatsApp

Sigue `docs/whatsapp-setup.md` de principio a fin — ahí está exactamente
qué configurar en Meta (tokens, webhook, verify token) y cómo probarlo.

## 4. Configurar Google Calendar (por negocio)

El MVP asume que cada negocio conecta su propio Google Calendar vía OAuth.
Para el piloto, la forma más rápida (sin construir aún la pantalla de
"Conectar Google Calendar") es:

1. Crea credenciales OAuth 2.0 en
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (tipo "Aplicación web", con `GOOGLE_REDIRECT_URI` como URI autorizado).
2. Usa el [OAuth Playground](https://developers.google.com/oauthplayground)
   con tus propias credenciales para generar un `refresh_token` con el
   scope `https://www.googleapis.com/auth/calendar` autenticándote con la
   cuenta de Google del negocio.
3. Guarda ese `refresh_token` en `bora_configs.google_refresh_token` y el
   ID del calendario (normalmente el email de la cuenta) en
   `bora_configs.google_calendar_id`.

Una pantalla de "Conectar con Google" con el flujo OAuth completo es la
mejora natural una vez que el piloto valide el resto del producto.

## 5. Deploy a Vercel

1. Sube este repo/carpeta a GitHub (ya lo tienes).
2. En [vercel.com](https://vercel.com) → **Add New Project**, importa el
   repo y selecciona `sembora-ia` como **Root Directory**.
3. Agrega todas las variables de `.env.example` en **Settings →
   Environment Variables**.
4. Deploy. La URL resultante es la que usas como Callback URL del webhook
   de WhatsApp (`docs/whatsapp-setup.md`, Paso 5).

## 6. Comandos útiles

```bash
npm run dev        # desarrollo local
npm run build      # build de producción (también valida tipos)
npm run typecheck  # solo TypeScript, sin build completo
npm run lint       # ESLint
```

## Estado del MVP

- [x] Esquema de base de datos multi-tenant con RLS
- [x] Panel de administración (login, dashboard de métricas, leads, config de Bora)
- [x] Roles owner/staff
- [x] Webhook de WhatsApp + motor de conversación genérico (FAQs, captura de lead, agendado)
- [x] Webhook endurecido para producción: verifica firma HMAC de Meta (`X-Hub-Signature-256`), es idempotente ante reintentos de Meta, y responde con un mensaje de respaldo a mensajes que no son de texto (imagen, audio, ubicación, etc.)
- [x] Integración con Google Calendar (disponibilidad + creación de eventos)
- [ ] Stripe (se implementa después del piloto, según lo planeado)
- [ ] Onboarding self-service de negocios nuevos (por ahora, alta manual — ver arriba)
- [ ] Pantalla de conexión OAuth de Google Calendar (por ahora, alta manual — ver arriba)
