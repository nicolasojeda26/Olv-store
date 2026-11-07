// GET /api/catalog — todo lo público que necesita la tienda en una sola llamada:
// productos visibles, ajustes, categorías, promociones activas y el WhatsApp.
const { send } = require("../lib/shared");
const { query } = require("../lib/db");

module.exports = async (req, res) => {
  try {
    const [products, settings, categories, promotions] = await Promise.all([
      query("select * from products where active order by sort asc, id asc"),
      query("select transfer_pct, installments, free_ship_min, content from settings where id = 1"),
      query("select * from categories order by sort asc, name asc"),
      query("select * from promotions where active"),
    ]);
    res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=60");
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      whatsapp: process.env.WHATSAPP_NUMBER || "5493794717236",
      products, settings: settings[0] || null, categories, promotions,
    }));
  } catch (e) {
    console.error("catalog", e);
    return send(res, 500, { error: "No pudimos cargar los productos." });
  }
};
