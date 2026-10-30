-- ============================================================
-- S.O.S Cosméticos: categorías nuevas y productos de ejemplo
-- Ejecutar una vez en Supabase: SQL Editor → New query → Run
-- ============================================================
alter table public.products drop constraint if exists products_category_check;
alter table public.products add constraint products_category_check
  check (category in ('Maquillaje','Skincare','Uñas','Pestañas','Accesorios','Combos y regalos','Outlet calzado'));

-- Reemplaza los productos de ejemplo anteriores (los pedidos guardan su propia copia de nombre y precio).
delete from public.products;

insert into public.products (name, category, price, old_price, sizes, icon, sort) values
  ('Paleta de sombras Ruby Rose · nueva colección', 'Maquillaje',       14500, null, '{"Único":8}',  'palette',       1),
  ('Labial líquido matte Ruby Rose',               'Maquillaje',        6900, null, '{"Único":15}', 'brush',         2),
  ('Base líquida cobertura media',                 'Maquillaje',       12900, null, '{"Único":6}',  'droplet',       3),
  ('Máscara de pestañas a prueba de agua',         'Maquillaje',        7900, null, '{"Único":10}', 'eye',           4),
  ('Sérum niacinamida antimanchas 30 ml',          'Skincare',         15900, null, '{"Único":7}',  'flask-conical', 5),
  ('Gel limpiador facial',                         'Skincare',          9800, null, '{"Único":9}',  'droplets',      6),
  ('Protector solar FPS 50 toque seco',            'Skincare',         16900, null, '{"Único":6}',  'sun',           7),
  ('Esmalte semipermanente 9 ml',                  'Uñas',              4900, null, '{"Único":30}', 'paintbrush',    8),
  ('Kit kapping: base + top gel',                  'Uñas',             13500, null, '{"Único":5}',  'sparkles',      9),
  ('Lámpara UV/LED 48 W',                          'Uñas',             29000, null, '{"Único":3}',  'lamp',         10),
  ('Pestañas pelo a pelo · bandeja mixta',         'Pestañas',          8500, null, '{"Único":12}', 'eye',          11),
  ('Pegamento para extensiones 5 ml',              'Pestañas',          9900, null, '{"Único":6}',  'droplet',      12),
  ('Set de 12 brochas de maquillaje',              'Accesorios',       18900, null, '{"Único":4}',  'brush',        13),
  ('Neceser con espejo',                           'Accesorios',       15500, null, '{"Único":5}',  'gem',          14),
  ('Rutina antimanchas completa (4 pasos)',        'Combos y regalos', 42000, 48500, '{"Único":3}', 'gift',         15),
  ('Ramo de maquillaje para regalar',              'Combos y regalos', 35000, null, '{"Único":4}',  'flower-2',     16),
  ('Sandalias Via Uno doradas (Brasil)',           'Outlet calzado',   42000, 69000, '{"35":0,"36":1,"37":0,"38":1,"39":0,"40":0}', 'footprints', 17),
  ('Chatitas de cuero nacionales',                 'Outlet calzado',   28000, 41000, '{"35":2,"36":1,"37":2,"38":0,"39":1,"40":1}', 'footprints', 18),
  ('Stilettos plateados con strass',               'Outlet calzado',   36000, 58000, '{"35":1,"36":0,"37":1,"38":0,"39":1,"40":0}', 'sparkles',   19);
