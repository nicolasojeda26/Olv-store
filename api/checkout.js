// POST /api/checkout
// Crea el pedido con precios y stock verificados en el servidor.
// - pay_method "mercadopago": arma el cobro en Mercado Pago y devuelve el link de pago.
// - pay_method "transfer" | "cash": solo registra el pedido (se confirma por WhatsApp).
const { sb, send, readBody, siteUrl, sellerToken, mp, TEST_MODE } = require("../lib/shared");

const SHIPPING = { pickup: "Retiro en el local", city: "Envío en Corrientes Capital", country: "Envío al resto del país" };
const PAY = ["mercadopago", "transfer", "cash"];
const clean = (s, max) => String(s || "").replace(/\s+/g, " ").trim().slice(0, max);

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Método no permitido" });
  try {
    const b = readBody(req);
    const items = Array.isArray(b.items) ? b.items : [];
    const buyer = b.buyer || {};
    const shipping = b.shipping;
    const payMethod = b.pay_method;

    // ---- Validaciones básicas ----
    if (!items.length || items.length > 40) return send(res, 400, { error: "El pedido está vacío." });
    if (!SHIPPING[shipping]) return send(res, 400, { error: "Elegí una forma de entrega." });
    if (!PAY.includes(payMethod)) return send(res, 400, { error: "Elegí una forma de pago." });
    const name = clean(buyer.name, 80), phone = clean(buyer.phone, 30);
    const email = clean(buyer.email, 120), address = clean(buyer.address, 200);
    if (name.length < 2) return send(res, 400, { error: "Completá tu nombre." });
    if (phone.replace(/\D/g, "").length < 8) return send(res, 400, { error: "Completá un teléfono válido." });
    if (shipping !== "pickup" && address.length < 5) return send(res, 400, { error: "Completá la dirección de envío." });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return send(res, 400, { error: "El email no es válido." });

    // ---- Precios y stock reales desde la base ----
    const ids = [...new Set(items.map((i) => Number(i.id)).filter(Number.isInteger))];
    const products = await sb(`products?id=in.(${ids.join(",")})&active=eq.true&select=id,name,price,sizes`);
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const merged = {};
    for (const i of items) {
      const p = byId[Number(i.id)];
      const qty = Number(i.qty);
      const size = String(i.size || "Único");
      if (!p) return send(res, 409, { error: "Un producto del pedido ya no está disponible. Actualizá la página." });
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) return send(res, 400, { error: "Cantidad inválida." });
      if (!(size in p.sizes)) return send(res, 400, { error: `Talle inválido para ${p.name}.` });
      const key = `${p.id}|${size}`;
      merged[key] = merged[key] || { id: p.id, name: p.name, size, qty: 0, price: p.price };
      merged[key].qty += qty;
    }
    const lines = Object.values(merged);
    for (const l of lines) {
      const stock = Number(byId[l.id].sizes[l.size] || 0);
      if (stock < l.qty) {
        const what = l.size === "Único" ? l.name : `${l.name} (talle ${l.size})`;
        return send(res, 409, { error: stock ? `De ${what} quedan ${stock}.` : `${what} se quedó sin stock.` });
      }
    }
    const total = lines.reduce((a, l) => a + l.qty * l.price, 0);

    // ---- Mercado Pago tiene que estar conectado antes de crear el pedido ----
    let token = null;
    if (payMethod === "mercadopago") {
      token = await sellerToken();
      if (!token) return send(res, 503, { error: "El pago con Mercado Pago todavía no está habilitado. Podés pedir por WhatsApp." });
    }

    const [order] = await sb("orders", {
      method: "POST",
      prefer: "return=representation",
      body: {
        items: lines, total, shipping, pay_method: payMethod,
        buyer_name: name, buyer_phone: phone, buyer_email: email || null,
        buyer_address: shipping === "pickup" ? null : address,
        notes: clean(b.notes, 300) || null,
      },
    });

    if (payMethod !== "mercadopago") return send(res, 200, { order_id: order.id, total });

    const base = siteUrl(req);
    const back = (estado) => `${base}/?pago=${estado}&pedido=${order.id}`;
    const pref = await mp("/checkout/preferences", token, {
      method: "POST",
      idempotencyKey: order.id,
      body: {
        items: lines.map((l) => ({
          id: String(l.id),
          title: l.size === "Único" ? l.name : `${l.name} · talle ${l.size}`,
          quantity: l.qty,
          unit_price: l.price,
          currency_id: "ARS",
        })),
        payer: { name, ...(email ? { email } : {}) },
        external_reference: order.id,
        notification_url: `${base}/api/mp-webhook`,
        back_urls: { success: back("aprobado"), pending: back("pendiente"), failure: back("rechazado") },
        auto_return: "approved",
        statement_descriptor: "ISABELLA",
        metadata: { order_id: order.id, shipping: SHIPPING[shipping] },
      },
    });

    await sb(`orders?id=eq.${order.id}`, { method: "PATCH", body: { mp_preference_id: pref.id } });
    const url = TEST_MODE() ? pref.sandbox_init_point || pref.init_point : pref.init_point;
    return send(res, 200, { order_id: order.id, total, init_point: url });
  } catch (e) {
    console.error("checkout", e);
    return send(res, 500, { error: "No pudimos iniciar el pago. Probá de nuevo o pedí por WhatsApp." });
  }
};
