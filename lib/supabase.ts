import { createClient } from "@supabase/supabase-js";

// Client-side (anon key — read-only public data)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side (service role — full access, never expose to browser)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Types ────────────────────────────────────────────────────────────────────

export interface Contractor {
  id: string;
  email: string;
  phone: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: "trialing" | "active" | "canceled" | "past_due";
  trial_ends_at: string;
  check_frequency: string;
  created_at: string;
}

export interface Permit {
  id: string;
  contractor_id: string;
  permit_number: string;
  city: string;
  portal_url: string;
  scraper_config: Record<string, unknown>;
  current_status: string | null;
  last_checked_at: string | null;
  active: boolean;
  created_at: string;
}

export interface StatusEvent {
  id: string;
  permit_id: string;
  old_status: string | null;
  new_status: string;
  raw_data: Record<string, unknown> | null;
  alerted_at: string | null;
  created_at: string;
}
