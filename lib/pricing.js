// Cálculo de precios de SOS Cosméticos. Lo usan la tienda (navegador) y el servidor (checkout),
// así los dos siempre dan el mismo total. El servidor es el que manda: recalcula todo al crear el pedido.
//
// Orden de los descuentos:
//   1) Promo del producto (la mejor entre: toda la tienda, su categoría o el producto). No se suman entre sí.
//   2) Promo por cantidad ("llevando 3 o más, 10% OFF") sobre los productos que entran en la promo.
//   3) Cupón (% sobre lo que queda, si llega al monto mínimo).
//   4) Descuento por transferencia (% sobre lo que queda).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Pricing = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const live = (x, now) => x && x.active !== false &&
    (!x.starts_at || new Date(x.starts_at) <= now) && (!x.ends_at || new Date(x.ends_at) >= now);

  const inScope = (promo, p) => promo.scope === "all" ||
    (promo.scope === "category" && promo.category === p.category) ||
    (promo.scope === "product" && Number(promo.product_id) === Number(p.id));

  // Mejor promo individual (sin mínimo de cantidad) para un producto.
  function bestPromo(p, promos, now = new Date()) {
    let best = null;
    for (const pr of promos || []) {
      if (!live(pr, now) || (pr.min_items || 0) > 0 || !inScope(pr, p)) continue;
      if (!best || pr.pct > best.pct) best = pr;
    }
    return best;
  }

  const unitPrice = (p, promos, now) => {
    const b = bestPromo(p, promos, now);
    return b ? Math.round(p.price * (1 - b.pct / 100)) : p.price;
  };

  // lines: [{ product: {id, name, category, price}, qty, size }]
  function priceCart(lines, { promos = [], coupon = null, transferPct = 0, now = new Date() } = {}) {
    const out = lines.map((l) => {
      const promo = bestPromo(l.product, promos, now);
      const unit = promo ? Math.round(l.product.price * (1 - promo.pct / 100)) : l.product.price;
      return { ...l, list: l.product.price, unit, promo: promo ? promo.title : null };
    });
    const subtotal = out.reduce((a, l) => a + l.list * l.qty, 0);
    const itemPromo = out.reduce((a, l) => a + (l.list - l.unit) * l.qty, 0);
    const applied = [...new Set(out.map((l) => l.promo).filter(Boolean))];

    // Promos por cantidad: la mejor que se cumpla
    let qtyPromo = 0, qtyTitle = null;
    for (const pr of promos || []) {
      if (!live(pr, now) || !(pr.min_items > 0)) continue;
      const inside = out.filter((l) => inScope(pr, l.product));
      const n = inside.reduce((a, l) => a + l.qty, 0);
      if (n < pr.min_items) continue;
      const d = Math.round(inside.reduce((a, l) => a + l.unit * l.qty, 0) * pr.pct / 100);
      if (d > qtyPromo) { qtyPromo = d; qtyTitle = pr.title; }
    }
    if (qtyTitle) applied.push(qtyTitle);

    const afterPromos = subtotal - itemPromo - qtyPromo;

    let couponDiscount = 0, couponError = null;
    if (coupon) {
      if (!live(coupon, now) || (coupon.max_uses && coupon.uses >= coupon.max_uses)) couponError = "Ese cupón no está vigente.";
      else if (afterPromos < (coupon.min_amount || 0)) couponError = `El cupón es para compras desde $${Number(coupon.min_amount).toLocaleString("es-AR")}.`;
      else couponDiscount = Math.round(afterPromos * coupon.pct / 100);
    }
    const afterCoupon = afterPromos - couponDiscount;
    const transferDiscount = Math.round(afterCoupon * (Number(transferPct) || 0) / 100);
    const total = afterCoupon - transferDiscount;

    return { lines: out, subtotal, promoDiscount: itemPromo + qtyPromo, couponDiscount, couponError,
      transferDiscount, total, applied, n: out.reduce((a, l) => a + l.qty, 0) };
  }

  return { live, bestPromo, unitPrice, priceCart };
});
