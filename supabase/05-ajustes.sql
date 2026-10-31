-- ============================================================
-- SOS Cosméticos: ajustes de la tienda (los edita la dueña desde el panel)
-- ============================================================
create table if not exists public.settings (
  id               int primary key default 1 check (id = 1),
  transfer_pct     int not null default 10 check (transfer_pct between 0 and 50),   -- % OFF pagando con transferencia
  installments     int not null default 0  check (installments between 0 and 12),   -- cuotas sin interés (0 = no ofrece)
  free_ship_min    int          check (free_ship_min is null or free_ship_min > 0), -- envío gratis en Corrientes Capital desde este monto (null = no)
  updated_at       timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

alter table public.settings enable row level security;
drop policy if exists "todos ven los ajustes" on public.settings;
drop policy if exists "dueña edita los ajustes" on public.settings;
create policy "todos ven los ajustes" on public.settings for select to anon, authenticated using (true);
create policy "dueña edita los ajustes" on public.settings for update to authenticated using (true) with check (true);

-- descuento aplicado al pedido (por transferencia)
alter table public.orders add column if not exists discount integer not null default 0;
