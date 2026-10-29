-- ============================================================
-- Botón de arrepentimiento (Res. 424/2020 SCI)
-- Ejecutar en Supabase: SQL Editor → New query → Run
-- ============================================================
create table if not exists public.revocations (
  id          uuid        primary key default gen_random_uuid(),
  code        text        not null unique,
  created_at  timestamptz not null default now(),
  status      text        not null default 'nuevo' check (status in ('nuevo','en_proceso','resuelto')),
  name        text        not null,
  email       text,
  phone       text,
  order_ref   text,
  product     text,
  reason      text
);
create index if not exists revocations_created_idx on public.revocations (created_at desc);

alter table public.revocations enable row level security;
drop policy if exists "dueña ve arrepentimientos"    on public.revocations;
drop policy if exists "dueña edita arrepentimientos" on public.revocations;
create policy "dueña ve arrepentimientos" on public.revocations
  for select to authenticated using (true);
create policy "dueña edita arrepentimientos" on public.revocations
  for update to authenticated using (true) with check (true);
-- Las solicitudes las crea el servidor (service role); el público no puede leerlas.
