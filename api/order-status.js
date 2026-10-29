// GET /api/order-status?id=<uuid> — para mostrarle a la clienta cómo quedó su pago al volver de Mercado Pago.
const { send, sb } = require("../lib/shared");

module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return send(res, 400, { error: "Pedido inválido" });
  try {
    const [o] = await sb(`orders?id=eq.${id}&select=status,total,shipping`);
    if (!o) return send(res, 404, { error: "No encontramos el pedido" });
    return send(res, 200, o);
  } catch (e) {
    console.error("order-status", e);
    return send(res, 500, { error: "Error del servidor" });
  }
};
