// /api/mp-webhook — Mercado Pago avisa acá cuando cambia un pago.
// No confiamos en el aviso: consultamos el pago real en Mercado Pago antes de tocar nada.
const { sb, send, readBody, sellerToken, mp } = require("../lib/shared");

function paymentIdFrom(req) {
  const b = readBody(req);
  const q = req.query || {};
  const type = b.type || b.topic || q.type || q.topic;
  const id = (b.data && b.data.id) || q["data.id"] || q.id || (b.resource && String(b.resource).split("/").pop());
  return type === "payment" && id ? String(id) : null;
}

module.exports = async (req, res) => {
  const paymentId = paymentIdFrom(req);
  if (!paymentId) return send(res, 200, { ignored: true });

  try {
    const token = await sellerToken();
    if (!token) return send(res, 200, { ignored: "sin conexión" });

    const pay = await mp(`/v1/payments/${encodeURIComponent(paymentId)}`, token);
    const orderId = pay.external_reference;
    if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return send(res, 200, { ignored: "sin pedido" });

    const [order] = await sb(`orders?id=eq.${orderId}&select=id,total,status,stock_applied`);
    if (!order) return send(res, 200, { ignored: "pedido inexistente" });

    if (pay.status === "approved") {
      // El monto cobrado tiene que cubrir el total del pedido.
      if (Number(pay.transaction_amount) + 0.5 < Number(order.total)) {
        await sb(`orders?id=eq.${orderId}`, {
          method: "PATCH",
          body: { mp_payment_id: paymentId, mp_status: "approved_amount_mismatch",
                  notes: `Monto cobrado ${pay.transaction_amount} distinto del total ${order.total}. Revisar.` },
        });
        return send(res, 200, { ok: true, warning: "monto" });
      }
      const result = await sb("rpc/mark_order_paid", {
        method: "POST",
        body: { p_order: orderId, p_payment: paymentId, p_status: pay.status },
      });
      return send(res, 200, { ok: true, result });
    }

    // Rechazado o cancelado: solo si el pedido no estaba ya pagado.
    const patch = { mp_payment_id: paymentId, mp_status: pay.status };
    if (["rejected", "cancelled"].includes(pay.status) && order.status === "pending") patch.status = "rejected";
    await sb(`orders?id=eq.${orderId}`, { method: "PATCH", body: patch });
    return send(res, 200, { ok: true, status: pay.status });
  } catch (e) {
    console.error("mp-webhook", e);
    // 500 hace que Mercado Pago reintente más tarde.
    return send(res, 500, { error: "reintentar" });
  }
};
