// POST /api/cupon { code } — valida un cupón para mostrarlo en el carrito.
// Solo devuelve el % y el mínimo del cupón pedido: la lista de cupones nunca se expone.
// El descuento real lo vuelve a calcular /api/checkout al crear el pedido.
const { sb, send, readBody } = require("../lib/shared");
const { live } = require("../lib/pricing");

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Método no permitido" });
  const code = String(readBody(req).code || "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return send(res, 404, { error: "Ese cupón no existe." });
  try {
    const [c] = await sb(`coupons?code=eq.${encodeURIComponent(code)}&select=code,pct,min_amount,starts_at,ends_at,max_uses,uses,active`);
    if (!c) return send(res, 404, { error: "Ese cupón no existe." });
    if (!live(c, new Date()) || (c.max_uses && c.uses >= c.max_uses)) return send(res, 410, { error: "Ese cupón no está vigente." });
    return send(res, 200, { code: c.code, pct: c.pct, min_amount: c.min_amount, ends_at: c.ends_at });
  } catch (e) {
    console.error("cupon", e);
    return send(res, 500, { error: "No pudimos validar el cupón. Probá de nuevo." });
  }
};
