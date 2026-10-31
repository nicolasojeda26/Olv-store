-- ============================================================
-- SOS Cosméticos: categorías de la clienta y productos de ejemplo
-- Ejecutar una vez en Supabase: SQL Editor → New query → Run
-- ============================================================
alter table public.products drop constraint if exists products_category_check;
alter table public.products add constraint products_category_check
  check (category in ('Maquillaje','Skincare','Combos y regalos','Pestañas','Insumos de uñas','Insumos de pestañas','Accesorios','Brochas y pinceles','Productos capilares','Productos corporales','Fragancias','Aparatología','Librería','Outlet calzado'));

-- Reemplaza los productos de ejemplo anteriores (los pedidos guardan su propia copia de nombre y precio).
delete from public.products;

insert into public.products (name, category, price, old_price, sizes, icon, sort) values
  ('Paleta de sombras Ruby Rose · nueva colección', 'Maquillaje', 14500, null, '{"Único":8}', 'palette', 1),
  ('Labial líquido matte Ruby Rose', 'Maquillaje', 6900, null, '{"Único":15}', 'brush', 2),
  ('Base líquida cobertura media', 'Maquillaje', 12900, null, '{"Único":6}', 'droplet', 3),
  ('Sérum niacinamida antimanchas 30 ml', 'Skincare', 15900, null, '{"Único":7}', 'flask-conical', 4),
  ('Protector solar FPS 50 toque seco', 'Skincare', 16900, null, '{"Único":6}', 'sun', 5),
  ('Rutina antimanchas completa (4 pasos)', 'Combos y regalos', 42000, 48500, '{"Único":3}', 'gift', 6),
  ('Ramo de maquillaje para regalar', 'Combos y regalos', 35000, null, '{"Único":4}', 'flower-2', 7),
  ('Pestañas postizas de tira naturales', 'Pestañas', 5500, null, '{"Único":20}', 'eye', 8),
  ('Esmalte semipermanente 9 ml', 'Insumos de uñas', 4900, null, '{"Único":30}', 'paintbrush', 9),
  ('Kit kapping: base + top gel', 'Insumos de uñas', 13500, null, '{"Único":5}', 'sparkles', 10),
  ('Pestañas pelo a pelo · bandeja mixta', 'Insumos de pestañas', 8500, null, '{"Único":12}', 'wand-sparkles', 11),
  ('Pegamento para extensiones 5 ml', 'Insumos de pestañas', 9900, null, '{"Único":6}', 'droplet', 12),
  ('Neceser con espejo', 'Accesorios', 15500, null, '{"Único":5}', 'gem', 13),
  ('Set de 12 brochas de maquillaje', 'Brochas y pinceles', 18900, null, '{"Único":4}', 'brush', 14),
  ('Set de pinceles para uñas', 'Brochas y pinceles', 7500, null, '{"Único":8}', 'paintbrush', 15),
  ('Shampoo + acondicionador sin sal', 'Productos capilares', 14800, null, '{"Único":6}', 'scissors', 16),
  ('Crema corporal hidratante 250 ml', 'Productos corporales', 9500, null, '{"Único":9}', 'hand-heart', 17),
  ('Body splash 250 ml', 'Fragancias', 11900, null, '{"Único":10}', 'spray-can', 18),
  ('Lámpara UV/LED 48 W', 'Aparatología', 29000, null, '{"Único":3}', 'zap', 19),
  ('Cuaderno A5 tapa dura', 'Librería', 6500, null, '{"Único":12}', 'notebook-pen', 20),
  ('Sandalias Via Uno doradas (Brasil)', 'Outlet calzado', 42000, 69000, '{"35":0,"36":1,"37":0,"38":1,"39":0,"40":0}', 'footprints', 21),
  ('Chatitas de cuero nacionales', 'Outlet calzado', 28000, 41000, '{"35":2,"36":1,"37":2,"38":0,"39":1,"40":1}', 'footprints', 22),
  ('Stilettos plateados con strass', 'Outlet calzado', 36000, 58000, '{"35":1,"36":0,"37":1,"38":0,"39":1,"40":0}', 'sparkles', 23);
