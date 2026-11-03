-- ============================================================
-- SOS Cosméticos: varias fotos por producto y variantes por tono o color
-- Ejecutar una vez en Supabase: SQL Editor → New query → Run
-- No borra ni cambia nada de lo que ya existe: solo agrega columnas.
-- ============================================================

-- Fotos extra (la principal sigue en image_url)
alter table public.products add column if not exists images text[] not null default '{}';

-- Cómo se llaman las opciones del producto: Talle (calzado), Tono, Color…
-- El stock de cada opción sigue en "sizes" (ej: {"Rojo 01": 3, "Nude 02": 1}).
alter table public.products add column if not exists variant_label text not null default 'Talle';
alter table public.products drop constraint if exists products_variant_label_check;
alter table public.products add constraint products_variant_label_check
  check (variant_label in ('Talle','Número','Tono','Color','Modelo','Aroma'));

-- Foto de cada opción (ej: {"Rojo 01": "https://…/rojo.jpg"}), opcional
alter table public.products add column if not exists variant_images jsonb not null default '{}'::jsonb;
