-- PermitPulse Database Schema
-- Run this in your Supabase SQL editor

-- Contractors (subscribers)
create table contractors (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  phone text,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'trialing', -- trialing | active | canceled | past_due
  trial_ends_at timestamptz default (now() + interval '7 days'),
  check_frequency interval default '2 hours',   -- how often to poll
  created_at timestamptz default now()
);

-- Permits being monitored
create table permits (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid references contractors(id) on delete cascade,
  permit_number text not null,
  city text not null,
  portal_url text not null,          -- base URL of the city portal
  scraper_config jsonb default '{}', -- city-specific config (selectors, etc.)
  current_status text,
  last_checked_at timestamptz,
  active boolean default true,
  created_at timestamptz default now(),
  unique(contractor_id, permit_number, city)
);

-- Status change history (every change logged)
create table status_events (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid references permits(id) on delete cascade,
  old_status text,
  new_status text not null,
  raw_data jsonb,                    -- full scraped payload for debugging
  alerted_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index on permits(contractor_id);
create index on permits(active, last_checked_at);
create index on status_events(permit_id);
create index on status_events(created_at desc);

-- Row-level security (enable after setup)
alter table contractors enable row level security;
alter table permits enable row level security;
alter table status_events enable row level security;

-- Allow service role full access (used by API routes)
create policy "service_role_all" on contractors for all using (true);
create policy "service_role_all" on permits for all using (true);
create policy "service_role_all" on status_events for all using (true);
