// POST /api/orders-admin  { id, action: "paid" | "delivered" | "cancelled" }
// "paid" descuenta el stock (para pedidos por transferencia o efectivo confirmados a mano).
const { send, sb, readBody, requireAdmin } = require("../lib/shared");

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Método no permitido" });
  try {
    if (!(await requireAdmin(req))) return send(res, 401, { error: "Iniciá sesión de nuevo." });
    const { id, action } = readBody(req);
    if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) return send(res, 400, { error: "Pedido inválido" });

    if (action === "paid") {
      const result = await sb("rpc/mark_order_paid", { method: "POST", body: { p_order: id, p_payment: "manual", p_status: "manual" } });
      return send(res, 200, { ok: true, result });
    }
    if (action === "delivered" || action === "cancelled") {
      await sb(`orders?id=eq.${id}`, { method: "PATCH", body: { status: action } });
      return send(res, 200, { ok: true });
    }
    return send(res, 400, { error: "Acción desconocida" });
  } catch (e) {
    console.error("orders-admin", e);
    return send(res, 500, { error: "Error del servidor" });
  }
};
