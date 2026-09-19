// Tipos manuales que reflejan supabase/migrations/0001_init.sql.
// Cuando el esquema crezca, se puede reemplazar por tipos generados con
// `supabase gen types typescript` — mientras tanto esto mantiene el
// proyecto tipado sin depender del CLI de Supabase.

export type BusinessStatus = "trial" | "active" | "paused" | "cancelled";
export type BusinessPlan = "pilot" | "starter" | "pro";
export type UserRole = "owner" | "staff";
export type LeadStatus = "new" | "contacted" | "scheduled" | "customer" | "lost";
export type ConversationStatus = "open" | "closed";
export type MessageDirection = "inbound" | "outbound";
export type SenderType = "lead" | "bora" | "staff";
export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export interface Business {
  id: string;
  name: string;
  slug: string;
  industry_label: string | null;
  timezone: string;
  status: BusinessStatus;
  plan: BusinessPlan;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessUser {
  id: string;
  business_id: string;
  user_id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
}

export type DayHours = [string, string][]; // ej. [["09:00","13:00"], ["16:00","19:00"]]

export interface BusinessHours {
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
  sun: DayHours;
}

export interface BoraConfig {
  business_id: string;
  assistant_name: string;
  tone: string;
  welcome_message: string;
  language: string;
  business_hours: BusinessHours;
  booking_buffer_minutes: number;
  min_notice_minutes: number;
  max_days_ahead: number;
  requires_confirmation: boolean;
  whatsapp_phone_number_id: string | null;
  whatsapp_business_account_id: string | null;
  whatsapp_verify_token: string | null;
  google_calendar_id: string | null;
  google_refresh_token: string | null;
  is_active: boolean;
  updated_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number | null;
  currency: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Faq {
  id: string;
  business_id: string;
  question: string;
  answer: string;
  keywords: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  business_id: string;
  full_name: string | null;
  phone: string;
  email: string | null;
  interest: string | null;
  service_id: string | null;
  status: LeadStatus;
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationBotState {
  step: "greeting" | "collecting_name" | "collecting_service" | "booking" | "done";
  [key: string]: unknown;
}

export interface Conversation {
  id: string;
  business_id: string;
  lead_id: string;
  channel: "whatsapp";
  status: ConversationStatus;
  bot_state: ConversationBotState;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  business_id: string;
  conversation_id: string;
  direction: MessageDirection;
  sender_type: SenderType;
  content: string;
  wa_message_id: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  lead_id: string;
  service_id: string | null;
  staff_user_id: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
}
