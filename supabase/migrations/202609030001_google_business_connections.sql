create table if not exists public.google_business_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  google_account_id text,
  account_name text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  status text not null default 'connected' check (status in ('connected','revoked','error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.google_business_connections enable row level security;

create policy "Users can view their Google Business connection"
on public.google_business_connections
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their Google Business connection"
on public.google_business_connections
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_google_business_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_google_business_updated_at on public.google_business_connections;
create trigger trg_google_business_updated_at
before update on public.google_business_connections
for each row execute function public.set_google_business_updated_at();

revoke all on public.google_business_connections from anon;
grant select, delete on public.google_business_connections to authenticated;
