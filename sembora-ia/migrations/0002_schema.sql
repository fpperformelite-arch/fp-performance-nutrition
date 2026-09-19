-- SEMBORA IA — esquema multi-tenant sobre Neon/Postgres.
--
-- Diseño: TODA la lógica del asistente "Bora" se controla por configuración
-- (bora_configs, services, faqs) por negocio. Nunca se debe bifurcar el
-- código de la aplicación por tipo de industria: si un gimnasio necesita
-- algo distinto de un consultorio, la diferencia vive en filas de estas
-- tablas, no en un "if industry === 'gym'" en el código.
--
-- Nota sobre aislamiento entre tenants: al no tener Row Level Security
-- (eso era una ventaja de Supabase), el aislamiento se aplica en la capa de
-- aplicación — TODA función de acceso a datos en src/lib/db/*.ts recibe y
-- filtra explícitamente por business_id obtenido de la sesión autenticada,
-- nunca de un parámetro que el cliente pueda manipular.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- 1. NEGOCIOS (tenants)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  industry_label text,                       -- solo texto informativo/UI, NUNCA usado por la lógica del bot
  timezone text not null default 'America/Mexico_City',
  status text not null default 'trial'
    check (status in ('trial','active','paused','cancelled')),
  plan text not null default 'pilot'
    check (plan in ('pilot','starter','pro')),
  trial_ends_at timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. USUARIOS DEL NEGOCIO (roles) — vincula la tabla `users` (auth propia) a un tenant
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists business_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner','staff')),
  full_name text,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists idx_business_users_user on business_users(user_id);
create index if not exists idx_business_users_business on business_users(business_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. CONFIGURACIÓN DE "BORA" POR NEGOCIO (1:1)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists bora_configs (
  business_id uuid primary key references businesses(id) on delete cascade,
  assistant_name text not null default 'Bora',
  tone text not null default 'amigable_profesional',
  welcome_message text not null default '¡Hola! Soy Bora 🤖, el asistente virtual. ¿En qué puedo ayudarte hoy?',
  language text not null default 'es',
  business_hours jsonb not null default '{
    "mon": [["09:00","18:00"]], "tue": [["09:00","18:00"]], "wed": [["09:00","18:00"]],
    "thu": [["09:00","18:00"]], "fri": [["09:00","18:00"]], "sat": [], "sun": []
  }'::jsonb,
  booking_buffer_minutes int not null default 15,
  min_notice_minutes int not null default 60,
  max_days_ahead int not null default 30,
  requires_confirmation boolean not null default false,
  reminder_hours_before int not null default 24, -- 0 desactiva los recordatorios
  whatsapp_phone_number_id text,
  whatsapp_business_account_id text,
  google_calendar_id text,
  -- Para el MVP se guarda aquí en texto plano, protegido solo por control de
  -- acceso a nivel de aplicación. Antes de manejar muchos negocios de pago,
  -- mover a un almacén de secretos cifrado (ej. Neon + pgsodium, o un KMS externo).
  google_refresh_token text,
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. SERVICIOS ofrecidos por el negocio (genérico: aplica a cualquier giro)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes int not null default 30,
  price_cents int,
  currency text not null default 'MXN',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_services_business on services(business_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. PREGUNTAS FRECUENTES configurables por negocio
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  question text not null,
  answer text not null,
  keywords text[] not null default '{}',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_faqs_business on faqs(business_id);
create index if not exists idx_faqs_keywords on faqs using gin(keywords);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. LEADS (contactos capturados por Bora u otros canales)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  full_name text,
  phone text not null,
  email text,
  interest text,
  service_id uuid references services(id),
  status text not null default 'new'
    check (status in ('new','contacted','scheduled','customer','lost')),
  source text not null default 'whatsapp',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, phone)
);

create index if not exists idx_leads_business on leads(business_id);
create index if not exists idx_leads_status on leads(business_id, status);

-- ─────────────────────────────────────────────────────────────────────────
-- 7. CONVERSACIONES (hilo de WhatsApp con un lead)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  channel text not null default 'whatsapp',
  status text not null default 'open' check (status in ('open','closed')),
  bot_state jsonb not null default '{"step": "greeting"}'::jsonb,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_conversations_business on conversations(business_id);
create index if not exists idx_conversations_lead on conversations(lead_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 8. MENSAJES individuales dentro de una conversación
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  sender_type text not null check (sender_type in ('lead','bora','staff')),
  content text not null,
  wa_message_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on messages(conversation_id, created_at);
create index if not exists idx_messages_business on messages(business_id);

-- Idempotencia: un mismo mensaje de WhatsApp nunca debe registrarse dos
-- veces (Meta reintenta la entrega del webhook). Postgres permite múltiples
-- NULL en una columna UNIQUE, así que no afecta mensajes salientes sin
-- wa_message_id (por ejemplo si el envío falló antes de obtener un ID).
alter table messages
  add constraint messages_wa_message_id_key unique (wa_message_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 9. CITAS agendadas (sincronizadas con Google Calendar)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  service_id uuid references services(id),
  staff_user_id uuid references business_users(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'booked'
    check (status in ('booked','confirmed','cancelled','completed','no_show')),
  google_event_id text,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_business on appointments(business_id, starts_at);
create index if not exists idx_appointments_lead on appointments(lead_id);
create index if not exists idx_appointments_reminder_pending
  on appointments(starts_at)
  where status in ('booked','confirmed') and reminder_sent_at is null;

-- Dos negocios NUNCA deben compartir el mismo phone_number_id de WhatsApp:
-- el webhook usa ese campo para decidir a qué tenant pertenece cada mensaje.
alter table bora_configs
  add constraint bora_configs_whatsapp_phone_number_id_key unique (whatsapp_phone_number_id);

-- ─────────────────────────────────────────────────────────────────────────
-- TRIGGERS: updated_at automático
-- ─────────────────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_businesses_updated before update on businesses
  for each row execute function set_updated_at();
create trigger trg_leads_updated before update on leads
  for each row execute function set_updated_at();
create trigger trg_appointments_updated before update on appointments
  for each row execute function set_updated_at();
create trigger trg_bora_configs_updated before update on bora_configs
  for each row execute function set_updated_at();
