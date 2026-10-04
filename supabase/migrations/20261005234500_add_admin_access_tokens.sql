create table if not exists public.admin_access_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  label text not null default 'primary admin',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_access_tokens enable row level security;

revoke all on public.admin_access_tokens from anon, authenticated;

insert into public.admin_access_tokens (token_hash, label, enabled)
values ('1eafbc5c0da00f5b2c84e7654dd36027640a57412a5e7a7b950f2f339d947315', 'Elgewaliy Admin', true)
on conflict (token_hash) do update
set enabled = true, label = excluded.label;
