-- Google Business Profile OAuth metadata and private credentials.
-- Tokens live in a RLS-protected table with no client policies; only service-role code may read them.

create table if not exists public.google_business_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'connected' check (status in ('connected', 'api_access_required', 'error')),
  google_account_name text,
  account_display_name text,
  accounts jsonb not null default '[]'::jsonb,
  locations jsonb not null default '[]'::jsonb,
  scopes text[] not null default '{}'::text[],
  token_expires_at timestamptz,
  api_error text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.google_business_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_type text,
  scopes text[] not null default '{}'::text[],
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.google_business_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists google_business_oauth_states_user_idx
  on public.google_business_oauth_states(user_id);

create index if not exists google_business_oauth_states_expiry_idx
  on public.google_business_oauth_states(expires_at);

alter table public.google_business_connections enable row level security;
alter table public.google_business_credentials enable row level security;
alter table public.google_business_oauth_states enable row level security;

drop policy if exists "Users can view their Google Business connection" on public.google_business_connections;
create policy "Users can view their Google Business connection"
  on public.google_business_connections
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can remove their Google Business connection" on public.google_business_connections;
create policy "Users can remove their Google Business connection"
  on public.google_business_connections
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Intentionally no authenticated policies on credentials or OAuth states.
-- Supabase service-role Edge Functions bypass RLS and are the only code that should access them.

comment on table public.google_business_credentials is
  'Private Google OAuth credentials. Never query from browser code.';
comment on table public.google_business_oauth_states is
  'Single-use OAuth state values used to validate Google callback requests.';
