// Avisos por email con Resend (https://resend.com). Si no está configurado, no hace nada.
// Variables: RESEND_API_KEY (secreta), NOTIFY_EMAIL (a quién avisar, separadas por coma),
// MAIL_FROM (opcional, por defecto el remitente de prueba de Resend).
const money = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("es-AR");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const SHIP = { pickup: "Retiro en el local", city: "Envío en Corrientes Capital", country: "Envío al resto del país" };
const PAY = { mercadopago: "Mercado Pago", transfer: "Transferencia", cash: "Efectivo" };

async function sendMail({ to, subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  const list = (Array.isArray(to) ? to : String(to || "").split(",")).map((s) => s.trim()).filter(Boolean);
  if (!key || !list.length) return { skipped: true };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "SOS Cosméticos <onboarding@resend.dev>",
        to: list, subject, html, ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!r.ok) console.error("Resend", r.status, await r.text());
    return { ok: r.ok };
  } catch (e) {
    console.error("Resend", e.message);
    return { ok: false };
  }
}

const layout = (title, body) => `
<div style="font-family:Arial,Helvetica,sans-serif;background:#fff5fb;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #f6cdea">
    <div style="background:#c42a85;color:#fff;padding:16px 20px;font-size:20px;font-weight:bold">✦ SOS Cosméticos</div>
    <div style="padding:20px;color:#2c1520;font-size:15px;line-height:1.5">
      <h2 style="margin:0 0 12px;font-size:20px">${title}</h2>${body}
    </div>
  </div>
</div>`;

function orderTable(o) {
  const rows = (o.items || []).map((i) => `<tr><td style="padding:4px 0">${i.qty} × ${esc(i.name)}${i.size && i.size !== "Único" ? ` (talle ${esc(i.size)})` : ""}</td><td style="text-align:right">${money(i.price * i.qty)}</td></tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
    ${(() => { const itemSave = (o.items || []).reduce((a, i) => a + ((i.list || i.price) - i.price) * i.qty, 0); const q = (o.promo_discount || 0) - itemSave;
       return q > 0 ? `<tr><td style="padding-top:6px;color:#1f7a55">Promoción por cantidad</td><td style="text-align:right;padding-top:6px;color:#1f7a55">−${money(q)}</td></tr>` : ""; })()}
    ${o.coupon_discount ? `<tr><td style="padding-top:6px;color:#1f7a55">Cupón ${esc(o.coupon)}</td><td style="text-align:right;padding-top:6px;color:#1f7a55">−${money(o.coupon_discount)}</td></tr>` : ""}
    ${o.discount ? `<tr><td style="padding-top:6px;color:#1f7a55">Descuento por transferencia</td><td style="text-align:right;padding-top:6px;color:#1f7a55">−${money(o.discount)}</td></tr>` : ""}
    <tr><td style="padding-top:8px;border-top:1px solid #f6cdea"><b>Total</b></td><td style="text-align:right;padding-top:8px;border-top:1px solid #f6cdea"><b>${money(o.total)}</b></td></tr></table>`;
}

function buyerBlock(o) {
  const phone = String(o.buyer_phone || "").replace(/\D/g, "");
  const wa = phone.length === 10 ? "549" + phone : phone;
  return `<p style="margin:14px 0 0"><b>${esc(o.buyer_name)}</b><br>
    WhatsApp: <a href="https://wa.me/${wa}">${esc(o.buyer_phone)}</a>${o.buyer_email ? `<br>Email: ${esc(o.buyer_email)}` : ""}<br>
    Entrega: ${SHIP[o.shipping] || esc(o.shipping)}${o.buyer_address ? ` · ${esc(o.buyer_address)}` : ""}<br>
    Pago: ${PAY[o.pay_method] || esc(o.pay_method)}</p>`;
}

const panel = () => `${(process.env.PUBLIC_SITE_URL || "https://soscosmeticos.vercel.app").replace(/\/$/, "")}/admin.html`;

// Venta nueva (pagada por Mercado Pago, o pendiente por transferencia/efectivo)
function notifyOrder(o, { paid }) {
  const nro = String(o.id).slice(0, 8).toUpperCase();
  const title = paid ? `¡Venta nueva pagada! ${money(o.total)}` : `Pedido nuevo por ${PAY[o.pay_method] || "WhatsApp"} · ${money(o.total)}`;
  const intro = paid
    ? `<p style="margin:0 0 12px">Mercado Pago aprobó el pago del pedido <b>N° ${nro}</b>. El stock ya se descontó.</p>`
    : `<p style="margin:0 0 12px">Entró el pedido <b>N° ${nro}</b>. Cuando cobres, marcalo como pagado en el panel para descontar el stock.</p>`;
  return sendMail({
    to: process.env.NOTIFY_EMAIL,
    subject: `${paid ? "💰 Venta pagada" : "🛍️ Pedido nuevo"} N° ${nro} · ${money(o.total)}`,
    replyTo: o.buyer_email || undefined,
    html: layout(title, intro + orderTable(o) + buyerBlock(o) +
      `${o.stock_issue ? `<p style="background:#fdecec;color:#9b1c1c;padding:10px;border-radius:8px">Atención: se pagó algo que ya no tenía stock. Revisalo con la clienta.</p>` : ""}
       <p style="margin:18px 0 0"><a href="${panel()}" style="background:#c42a85;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:bold">Ver en el panel</a></p>`),
  });
}

// Pedido de arrepentimiento: aviso a la dueña y comprobante a la clienta
async function notifyRevocation(r) {
  const details = `<p style="margin:0">Código de arrepentimiento: <b style="font-size:18px">${esc(r.code)}</b></p>
    <p style="margin:12px 0 0">${esc(r.name)}${r.email ? `<br>Email: ${esc(r.email)}` : ""}${r.phone ? `<br>Teléfono: ${esc(r.phone)}` : ""}
    ${r.order_ref ? `<br>Pedido: ${esc(r.order_ref)}` : ""}${r.product ? `<br>Producto: ${esc(r.product)}` : ""}${r.reason ? `<br>Motivo: ${esc(r.reason)}` : ""}</p>`;
  const owner = sendMail({
    to: process.env.NOTIFY_EMAIL,
    subject: `↩️ Pedido de arrepentimiento ${r.code}`,
    replyTo: r.email || undefined,
    html: layout("Pedido de arrepentimiento", `<p style="margin:0 0 12px">Una clienta usó el botón de arrepentimiento. Contactala para coordinar la devolución.</p>${details}
      <p style="margin:18px 0 0"><a href="${panel()}" style="background:#c42a85;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:bold">Ver en el panel</a></p>`),
  });
  const buyer = r.email ? sendMail({
    to: r.email,
    subject: `Recibimos tu pedido de arrepentimiento ${r.code}`,
    html: layout("Recibimos tu pedido de arrepentimiento", `<p style="margin:0 0 12px">Guardá este código: es el número de tu trámite. Te vamos a contactar para coordinar la devolución, sin costo para vos.</p>${details}`),
  }) : Promise.resolve({ skipped: true });
  return Promise.all([owner, buyer]);
}

module.exports = { sendMail, notifyOrder, notifyRevocation };
