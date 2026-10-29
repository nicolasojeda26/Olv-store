// POST /api/arrepentimiento — Botón de arrepentimiento (Res. 424/2020 SCI).
// Sin registro previo. Devuelve el código de trámite en el momento y, si dejó email, se lo manda.
const crypto = require("crypto");
const { sb, send, readBody } = require("../lib/shared");
const { notifyRevocation } = require("../lib/notify");

const clean = (s, max) => String(s || "").replace(/\s+/g, " ").trim().slice(0, max);

function newCode() {
  const d = new Date(Date.now() - 3 * 3600 * 1000); // hora de Argentina
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, "");
  const rnd = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `ARR-${ymd}-${rnd}`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Método no permitido" });
  try {
    const b = readBody(req);
    if (b.website) return send(res, 200, { code: newCode() }); // trampa para bots (campo oculto)
    const row = {
      name: clean(b.name, 80),
      email: clean(b.email, 120) || null,
      phone: clean(b.phone, 30) || null,
      order_ref: clean(b.order_ref, 60) || null,
      product: clean(b.product, 160) || null,
      reason: clean(b.reason, 500) || null,
    };
    if (row.name.length < 2) return send(res, 400, { error: "Completá tu nombre." });
    if (!row.email && !row.phone) return send(res, 400, { error: "Dejanos un email o un teléfono para contactarte." });
    if (row.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email)) return send(res, 400, { error: "El email no es válido." });
    if (row.phone && row.phone.replace(/\D/g, "").length < 8) return send(res, 400, { error: "El teléfono no es válido." });
    if (!row.order_ref && !row.product) return send(res, 400, { error: "Contanos el número de pedido o qué producto compraste." });

    let saved = null;
    for (let i = 0; i < 3 && !saved; i++) {
      try {
        [saved] = await sb("revocations", { method: "POST", prefer: "return=representation", body: { ...row, code: newCode() } });
      } catch (e) {
        if (!String(e.message).includes("duplicate")) throw e;
      }
    }
    if (!saved) throw new Error("No se pudo generar el código");
    const [, buyerMail] = await notifyRevocation(saved);
    return send(res, 200, { code: saved.code, emailed: !!(buyerMail && buyerMail.ok) });
  } catch (e) {
    console.error("arrepentimiento", e);
    return send(res, 500, { error: "No pudimos registrar tu pedido. Probá de nuevo o escribinos por WhatsApp al 3794-717236." });
  }
};
