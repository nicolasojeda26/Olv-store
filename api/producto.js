// GET /p/:slug  (reescrito por vercel.json a /api/producto?slug=...)
// Devuelve la tienda con los datos del producto en la cabecera, para que al compartir el link
// en WhatsApp, Instagram o Facebook se vea la foto, el nombre y el precio, y para Google.
// Al cargar, la tienda abre ese producto.
const fs = require("fs");
const path = require("path");
const { sb, siteUrl } = require("../lib/shared");
const { bestPromo } = require("../lib/pricing");

let TEMPLATE = null;
const template = () => (TEMPLATE ??= fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8"));

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("es-AR");
const slugify = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);

function redirect(res, to, code = 302) {
  res.statusCode = code;
  res.setHeader("Location", to);
  res.setHeader("Cache-Control", "public, s-maxage=300");
  res.end();
}

module.exports = async (req, res) => {
  const base = siteUrl(req);
  const slug = String((req.query && req.query.slug) || "");
  const id = parseInt(slug, 10);
  if (!Number.isInteger(id) || id <= 0) return redirect(res, "/");

  let p, pct = 0, promos = [];
  try {
    const [rows, cfg, pr] = await Promise.all([
      sb(`products?id=eq.${id}&active=eq.true&select=id,name,category,price,old_price,image_url,sizes`),
      sb("settings?id=eq.1&select=transfer_pct").catch(() => []),
      sb("promotions?active=eq.true&select=*").catch(() => []),
    ]);
    promos = pr || [];
    p = rows && rows[0];
    pct = Number(cfg && cfg[0] && cfg[0].transfer_pct) || 0;
  } catch (e) {
    console.error("producto", e.message);
    return redirect(res, "/");
  }
  if (!p) return redirect(res, "/");

  // Link canónico: /p/<id>-<nombre>. Si el nombre cambió, redirige al link nuevo.
  const canonicalPath = `/p/${p.id}-${slugify(p.name)}`;
  if (`/p/${slug}` !== canonicalPath) return redirect(res, canonicalPath, 301);

  const url = base + canonicalPath;
  const img = p.image_url ? (p.image_url.startsWith("http") ? p.image_url : base + p.image_url) : `${base}/img/compartir.jpg`;
  const stock = Object.values(p.sizes || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  const promo = bestPromo(p, promos);
  const price = promo ? Math.round(p.price * (1 - promo.pct / 100)) : p.price;
  const tr = pct ? ` · ${money(price * (1 - pct / 100))} con transferencia` : "";
  const title = `${p.name} · SOS Cosméticos`;
  const desc = `${promo ? `${promo.title}: ${promo.pct}% OFF · ` : ""}${money(price)}${tr}. ${p.category} en SOS Cosméticos, Junín 830, Corrientes. Retiro en el local o envío a todo el país.`;
  const ld = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, image: [img], category: p.category,
    brand: { "@type": "Brand", name: "SOS Cosméticos" },
    offers: { "@type": "Offer", url, priceCurrency: "ARS", price,
      availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };

  let html = template()
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(url)}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(img)}">`)
    .replace(/<meta property="og:image:width" content="[^"]*">\s*<meta property="og:image:height" content="[^"]*">/, `<meta property="og:image:width" content="900">\n<meta property="og:image:height" content="900">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(url)}">`)
    .replace(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="product">`)
    .replace("</head>", `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>\n<script>window.__OPEN_PRODUCT=${p.id}</script>\n</head>`);

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  res.end(html);
};
