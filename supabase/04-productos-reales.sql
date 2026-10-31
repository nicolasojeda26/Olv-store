-- ============================================================
-- SOS Cosméticos: productos reales con foto (fotos del Drive de la clienta)
-- Los precios son ESTIMADOS: confirmarlos desde el panel antes de vender.
-- ============================================================
-- Los productos de ejemplo sin foto se ocultan (no se borran). El outlet de calzado queda visible.
update public.products set active = false where image_url is null and category <> 'Outlet calzado';
update public.products set sort = sort + 100 where category = 'Outlet calzado';

insert into public.products (name, category, price, old_price, sizes, image_url, icon, sort) values
  ('Gorro de satén para dormir', 'Productos capilares', 4500, null, '{"Único":8}', '/img/productos/01.jpg', 'sparkles', 1),
  ('Toallitas desmaquillantes (variedades)', 'Skincare', 3500, null, '{"Único":15}', '/img/productos/02.jpg', 'droplets', 2),
  ('Limpiador de brochas de silicona', 'Brochas y pinceles', 6900, 9200, '{"Único":6}', '/img/productos/03.jpg', 'brush', 3),
  ('Peine alisador eléctrico', 'Aparatología', 24900, 33200, '{"Único":3}', '/img/productos/04.jpg', 'zap', 4),
  ('Máscara facial UNI ácido hialurónico', 'Skincare', 2500, null, '{"Único":20}', '/img/productos/05.jpg', 'flask-conical', 5),
  ('Máscara facial UNI niacinamida', 'Skincare', 2500, null, '{"Único":20}', '/img/productos/06.jpg', 'flask-conical', 6),
  ('Set de 3 pinceles para mascarillas', 'Brochas y pinceles', 5500, null, '{"Único":8}', '/img/productos/07.jpg', 'brush', 7),
  ('Guante exfoliante para baño', 'Productos corporales', 2900, null, '{"Único":12}', '/img/productos/08.jpg', 'hand-heart', 8),
  ('Vincha de toalla rosa para skincare', 'Accesorios', 3900, null, '{"Único":10}', '/img/productos/09.jpg', 'gem', 9),
  ('Aplicador hydra needle para sérum', 'Aparatología', 9900, null, '{"Único":5}', '/img/productos/10.jpg', 'zap', 10),
  ('Vincha spa colores pastel', 'Accesorios', 3900, null, '{"Único":10}', '/img/productos/11.jpg', 'gem', 11),
  ('Depilador de cristal', 'Productos corporales', 8900, null, '{"Único":6}', '/img/productos/12.jpg', 'hand-heart', 12),
  ('Paleta All-in-One Ruby Rose', 'Maquillaje', 16900, null, '{"Único":5}', '/img/productos/13.jpg', 'palette', 13),
  ('Máscara de pestañas Popstar Ruby Rose', 'Maquillaje', 9900, null, '{"Único":8}', '/img/productos/14.jpg', 'eye', 14),
  ('Polvo compacto Pure Porcelain Ruby Rose', 'Maquillaje', 8900, null, '{"Único":6}', '/img/productos/15.jpg', 'palette', 15),
  ('Paleta de sombras Falling Leaves Ruby Rose', 'Maquillaje', 15900, null, '{"Único":4}', '/img/productos/16.jpg', 'palette', 16),
  ('Tinta de labios osito', 'Maquillaje', 5900, null, '{"Único":10}', '/img/productos/17.jpg', 'brush', 17),
  ('Primer facial Skin Perfect Ruby Rose', 'Maquillaje', 8500, null, '{"Único":6}', '/img/productos/18.jpg', 'droplet', 18),
  ('Delineador líquido Melu by Ruby Rose', 'Maquillaje', 5900, null, '{"Único":8}', '/img/productos/19.jpg', 'brush', 19),
  ('Gel tint Juicy Ruby Rose', 'Maquillaje', 6500, null, '{"Único":10}', '/img/productos/20.jpg', 'droplet', 20),
  ('Gloss con glitter Ruby Rose', 'Maquillaje', 5900, null, '{"Único":12}', '/img/productos/21.jpg', 'sparkles', 21),
  ('Bálsamo labial hidratante', 'Maquillaje', 4900, null, '{"Único":10}', '/img/productos/22.jpg', 'droplet', 22),
  ('Masajeador facial HIH Beauty', 'Aparatología', 29900, null, '{"Único":3}', '/img/productos/23.jpg', 'zap', 23),
  ('Bálsamo labial que cambia de color', 'Maquillaje', 4500, null, '{"Único":12}', '/img/productos/24.jpg', 'droplet', 24),
  ('Tinta labial Gege Bear', 'Maquillaje', 6900, null, '{"Único":8}', '/img/productos/25.jpg', 'brush', 25),
  ('Labial líquido Vinyl Tei', 'Maquillaje', 5500, null, '{"Único":12}', '/img/productos/26.jpg', 'brush', 26),
  ('Sérum Hyaluronic 1,5% Dermachem', 'Skincare', 15900, null, '{"Único":5}', '/img/productos/27.jpg', 'flask-conical', 27),
  ('Protector solar facial FPS 60 Dermachem', 'Skincare', 17900, null, '{"Único":5}', '/img/productos/28.jpg', 'sun', 28);
