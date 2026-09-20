import type { Generated } from "kysely";

// Refleja migrations/0001_auth.sql y migrations/0002_schema.sql.
// Las columnas jsonb/array (business_hours, bot_state, keywords) se tipan
// como `unknown`/`string[]` a nivel de driver — node-postgres ya las
// serializa/parsea automáticamente; el tipado estructurado (BusinessHours,
// ConversationBotState) vive en src/types/database.ts y se aplica al leer.

export interface UsersTable {
  id: Generated<string>;
  email: string;
  password_hash: string;
  created_at: Generated<string>;
}

export interface SessionsTable {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: Generated<string>;
}

export interface BusinessesTable {
  id: Generated<string>;
  name: string;
  slug: string;
  industry_label: string | null;
  timezone: Generated<string>;
  status: Generated<string>;
  plan: Generated<string>;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface BusinessUsersTable {
  id: Generated<string>;
  business_id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  created_at: Generated<string>;
}

export interface BoraConfigsTable {
  business_id: string;
  assistant_name: Generated<string>;
  tone: Generated<string>;
  welcome_message: Generated<string>;
  language: Generated<string>;
  business_hours: unknown;
  booking_buffer_minutes: Generated<number>;
  min_notice_minutes: Generated<number>;
  max_days_ahead: Generated<number>;
  requires_confirmation: Generated<boolean>;
  reminder_hours_before: Generated<number>;
  whatsapp_phone_number_id: string | null;
  whatsapp_business_account_id: string | null;
  kapso_customer_id: string | null;
  google_calendar_id: string | null;
  google_refresh_token: string | null;
  is_active: Generated<boolean>;
  updated_at: Generated<string>;
}

export interface ServicesTable {
  id: Generated<string>;
  business_id: string;
  name: string;
  description: string | null;
  duration_minutes: Generated<number>;
  price_cents: number | null;
  currency: Generated<string>;
  is_active: Generated<boolean>;
  sort_order: Generated<number>;
  created_at: Generated<string>;
}

export interface FaqsTable {
  id: Generated<string>;
  business_id: string;
  question: string;
  answer: string;
  keywords: string[];
  sort_order: Generated<number>;
  is_active: Generated<boolean>;
  created_at: Generated<string>;
}

export interface LeadsTable {
  id: Generated<string>;
  business_id: string;
  full_name: string | null;
  phone: string;
  email: string | null;
  interest: string | null;
  service_id: string | null;
  status: Generated<string>;
  source: Generated<string>;
  notes: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface ConversationsTable {
  id: Generated<string>;
  business_id: string;
  lead_id: string;
  channel: Generated<string>;
  status: Generated<string>;
  bot_state: unknown;
  last_message_at: Generated<string>;
  created_at: Generated<string>;
}

export interface MessagesTable {
  id: Generated<string>;
  business_id: string;
  conversation_id: string;
  direction: string;
  sender_type: string;
  content: string;
  wa_message_id: string | null;
  created_at: Generated<string>;
}

export interface AppointmentsTable {
  id: Generated<string>;
  business_id: string;
  lead_id: string;
  service_id: string | null;
  staff_user_id: string | null;
  starts_at: string;
  ends_at: string;
  status: Generated<string>;
  google_event_id: string | null;
  reminder_sent_at: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface DB {
  users: UsersTable;
  sessions: SessionsTable;
  businesses: BusinessesTable;
  business_users: BusinessUsersTable;
  bora_configs: BoraConfigsTable;
  services: ServicesTable;
  faqs: FaqsTable;
  leads: LeadsTable;
  conversations: ConversationsTable;
  messages: MessagesTable;
  appointments: AppointmentsTable;
}
