/* Panel de SOS Cosméticos: categorías, promociones, cupones y contenido de la página.
   Usa lo que define admin.html: sb (Supabase), $, esc, money, toast, icons, products, CATS, shrink, loadProducts. */

const ICONS = ["palette","brush","paintbrush","droplet","droplets","flask-conical","sun","eye","wand-sparkles","sparkles","gem","gift","flower-2",
  "heart","hand-heart","scissors","spray-can","zap","notebook-pen","footprints","shirt","shopping-bag","star","crown","baby","bath","leaf","tag","package"];
const TZ = "-03:00"; // hora de Argentina
const dayStart = (d) => d ? new Date(`${d}T00:00:00${TZ}`).toISOString() : null;
const dayEnd = (d) => d ? new Date(`${d}T23:59:59${TZ}`).toISOString() : null;
const toDay = (iso) => iso ? new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10) : "";
const fmtDay = (iso) => iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }) : "";
const status = (x) => {
  const now = new Date();
  if (!x.active) return ["Pausada", "off"];
  if (x.starts_at && new Date(x.starts_at) > now) return ["Programada", "warn"];
  if (x.ends_at && new Date(x.ends_at) < now) return ["Vencida", "bad"];
  if (x.max_uses && x.uses >= x.max_uses) return ["Agotado", "bad"];
  return ["Activa", "ok"];
};
const PTYPE_INFO = {
  all: "Baja el precio de <b>todos los productos</b> de la tienda.",
  category: "Baja el precio solo de los productos de <b>la categoría que elijas</b>.",
  product: "Baja el precio de <b>un solo producto</b>.",
  qty: "El descuento se aplica cuando la clienta lleva <b>varias unidades</b>. Ej: llevando 3 o más, 10% menos en todo el pedido.",
};
let catList = [], promos = [], coupons = [], cms = null;   // cms = editor abierto: {kind, data, ...}

async function uploadPhoto(file) {
  const blob = await shrink(file);
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from("productos").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return sb.storage.from("productos").getPublicUrl(path).data.publicUrl;
}

/* ============ CATEGORÍAS ============ */
async function loadCats() {
  const { data, error } = await sb.from("categories").select("*").order("sort").order("name");
  if (error || !data) return;
  catList = data;
  CATS = Object.fromEntries(data.map((c) => [c.name, c.icon]));
  if (typeof fillCatFilter === "function") fillCatFilter();
}
function renderCatList() {
  const count = (n) => products.filter((p) => p.category === n).length;
  $("#catList").innerHTML = catList.length ? catList.map((c, i) => `
    <article class="card prod">
      <div class="thumb" style="${c.image_url ? "" : `background:oklch(0.93 0.045 ${c.hue});color:oklch(0.45 0.13 ${c.hue})`}">${c.image_url ? `<img src="${esc(c.image_url)}" alt="">` : `<i data-lucide="${esc(c.icon)}"></i>`}</div>
      <div><b>${esc(c.name)}</b>
        <div class="om">${esc(c.description || "")}</div>
        <div class="row" style="gap:6px;margin-top:4px"><span class="chip">${count(c.name)} ${count(c.name) === 1 ? "producto" : "productos"}</span>${c.active ? "" : `<span class="chip off">Oculta</span>`}${c.in_nav ? `<span class="chip mp">En el menú</span>` : ""}</div></div>
      <div class="row" style="gap:4px;justify-content:flex-end">
        <button class="btn b-ghost b-sm" data-cmove="${i}" data-dir="-1" aria-label="Subir ${esc(c.name)}" ${i ? "" : "disabled"}><i data-lucide="arrow-up"></i></button>
        <button class="btn b-ghost b-sm" data-cmove="${i}" data-dir="1" aria-label="Bajar ${esc(c.name)}" ${i < catList.length - 1 ? "" : "disabled"}><i data-lucide="arrow-down"></i></button>
        <button class="btn b-line b-sm" data-cedit="${esc(c.name)}"><i data-lucide="pencil"></i><span>Editar</span></button></div>
    </article>`).join("") : `<p class="empty">Todavía no hay categorías.</p>`;
  icons();
}
function openCat(name) {
  const c = name ? catList.find((x) => x.name === name) : { name: "", description: "", icon: "sparkles", hue: 330, image_url: "", active: true, in_nav: false, sort: (catList.length + 1) };
  cms = { kind: "cat", orig: name || null, data: { ...c }, file: null, confirmDel: false };
  renderCatEditor();
}
function renderCatEditor() {
  const c = cms.data, n = cms.orig ? products.filter((p) => p.category === cms.orig).length : 0;
  sheet(`${cms.orig ? "Editar categoría" : "Nueva categoría"}`, `
    <label class="fl" for="kName">Nombre de la categoría <small class="hint">Así aparece en la tienda. Ej: Fragancias</small><input class="in" id="kName" maxlength="40" value="${esc(c.name)}" placeholder="Ej: Fragancias"></label>
    <label class="fl" for="kDesc">Descripción corta <small class="hint">Una frase chiquita debajo del nombre. Ej: Perfumes y splash</small><input class="in" id="kDesc" maxlength="60" value="${esc(c.description || "")}" placeholder="Ej: Perfumes y splash"></label>
    <div class="fl">Foto de la categoría <small class="hint">Si no subís una, se usa la foto de un producto o el ícono.</small>
      <div class="photo"><div class="thumb">${cms.file ? `<img src="${URL.createObjectURL(cms.file)}" alt="">` : c.image_url ? `<img src="${esc(c.image_url)}" alt="">` : `<i data-lucide="${esc(c.icon)}"></i>`}</div>
        <div class="row"><label class="btn b-line b-sm" for="kFile"><i data-lucide="image-plus"></i>${c.image_url || cms.file ? "Cambiar" : "Subir foto"}</label><input id="kFile" type="file" accept="image/*" hidden>
        ${c.image_url || cms.file ? `<button class="btn b-ghost b-sm" id="kNoPhoto" type="button">Quitar</button>` : ""}</div></div></div>
    <div class="fl">Dibujito <small class="hint">Se muestra solo si no subiste una foto. Tocá el que más se parezca.</small>
      <div class="icons" role="radiogroup" aria-label="Ícono">${ICONS.map((ic) => `<button type="button" role="radio" aria-checked="${ic === c.icon}" data-kicon="${ic}" aria-label="${ic}"><i data-lucide="${ic}"></i></button>`).join("")}</div></div>
    <label class="fl" for="kHue">Color de fondo <small class="hint">Mové el círculo hacia los costados para elegir el color. Solo se usa si no hay foto.</small> <span class="swatch" style="background:oklch(0.93 0.045 ${c.hue});color:oklch(0.45 0.13 ${c.hue})"><i data-lucide="${esc(c.icon)}"></i></span>
      <input id="kHue" type="range" min="0" max="360" value="${c.hue}" class="hue"></label>
    <label class="row chk"><input type="checkbox" id="kActive" ${c.active ? "checked" : ""}><span>Visible en la tienda<small class="hint">Si la destildás, la categoría y sus productos no se ven, pero no se borra nada.</small></span></label>
    <label class="row chk"><input type="checkbox" id="kNav" ${c.in_nav ? "checked" : ""}><span>Mostrar en el menú de arriba<small class="hint">El menú de la parte de arriba de la tienda. Entran hasta 6.</small></span></label>
    <p class="err" id="kErr" hidden></p>`,
    `${cms.orig ? (cms.confirmDel ? `<span class="row"><span style="font-size:15px">¿Seguro? Se borra para siempre.</span><button class="btn b-rose b-sm" id="kDelYes">Sí, borrar</button><button class="btn b-line b-sm" id="kDelNo">No</button></span>`
      : `<button class="btn b-ghost" id="kDel" ${n ? `title="Tiene ${n} productos"` : ""}><i data-lucide="trash-2"></i>Borrar categoría</button>`) : "<span></span>"}
     <button class="btn b-rose" id="kSave"><i data-lucide="check"></i>Guardar categoría</button>`);
}
function syncCat() {
  if (!$("#kName")) return;
  const c = cms.data;
  c.name = $("#kName").value.replace(/\s+/g, " ").trim(); c.description = $("#kDesc").value.trim();
  c.hue = +$("#kHue").value; c.active = $("#kActive").checked; c.in_nav = $("#kNav").checked;
}
async function saveCat(btn) {
  syncCat(); const c = cms.data, err = $("#kErr"); err.hidden = true;
  const fail = (m) => { err.textContent = m; err.hidden = false; };
  if (c.name.length < 2) return fail("Poné un nombre de al menos 2 letras.");
  if (catList.some((x) => x.name.toLowerCase() === c.name.toLowerCase() && x.name !== cms.orig)) return fail("Ya existe una categoría con ese nombre.");
  if (c.in_nav && catList.filter((x) => x.in_nav && x.name !== cms.orig).length >= 6) return fail("El menú ya tiene 6 categorías. Sacá una antes de agregar otra.");
  btn.disabled = true;
  try {
    let image_url = c.image_url || null;
    if (cms.file) image_url = await uploadPhoto(cms.file);
    const row = { name: c.name, description: c.description, icon: c.icon, hue: c.hue, image_url, active: c.active, in_nav: c.in_nav, sort: c.sort, updated_at: new Date().toISOString() };
    const q = cms.orig ? sb.from("categories").update(row).eq("name", cms.orig) : sb.from("categories").insert(row);
    const { error } = await q; if (error) throw error;
    closeSheet(); toast(cms && cms.orig && cms.orig !== c.name ? "Categoría renombrada · productos actualizados" : "Categoría guardada");
    await loadCats(); await loadProducts(); renderCatList();
  } catch (x) { btn.disabled = false; fail("No se pudo guardar: " + (x.message || "error")); }
}
async function moveCat(i, dir) {
  const a = catList[i], b = catList[i + dir]; if (!a || !b) return;
  // reordena todo de corrido para que no haya empates
  const order = catList.map((c) => c.name); order.splice(i, 1); order.splice(i + dir, 0, a.name);
  await Promise.all(order.map((name, k) => sb.from("categories").update({ sort: k + 1 }).eq("name", name)));
  await loadCats(); renderCatList();
}

/* ============ PROMOCIONES Y CUPONES ============ */
async function loadPromos() {
  const [p, c] = await Promise.all([
    sb.from("promotions").select("*").order("created_at", { ascending: false }),
    sb.from("coupons").select("*").order("created_at", { ascending: false }),
  ]);
  promos = p.data || []; coupons = c.data || [];
  renderPromos();
}
const promoScope = (p) => p.scope === "all" ? "Toda la tienda" : p.scope === "category" ? `Categoría ${p.category}` : `Producto: ${(products.find((x) => x.id === p.product_id) || {}).name || "—"}`;
const dates = (x) => x.starts_at || x.ends_at ? ` · ${x.starts_at ? "desde " + fmtDay(x.starts_at) : ""}${x.starts_at && x.ends_at ? " " : ""}${x.ends_at ? "hasta " + fmtDay(x.ends_at) : ""}` : "";
function renderPromos() {
  $("#promoList").innerHTML = promos.length ? promos.map((p) => { const [l, k] = status(p); return `
    <article class="card order">
      <div class="oh"><b>${esc(p.title)} · ${p.pct}% OFF</b><span class="chip ${k}">${l}</span></div>
      <div class="om">${esc(promoScope(p))}${p.min_items ? ` · llevando ${p.min_items} o más` : ""}${dates(p)}${p.in_ribbon ? " · en la cinta" : ""}</div>
      <div class="row"><button class="btn b-line b-sm" data-pedit="${p.id}"><i data-lucide="pencil"></i>Editar</button>
        <button class="btn b-ghost b-sm" data-ptoggle="${p.id}">${p.active ? `<i data-lucide="pause"></i>Pausar` : `<i data-lucide="play"></i>Activar`}</button></div>
    </article>`; }).join("") : `<p class="empty">Todavía no hay promociones. Tocá <b>Nueva promoción</b> para crear la primera.</p>`;
  $("#couponList").innerHTML = coupons.length ? coupons.map((c) => { const [l, k] = status(c); return `
    <article class="card order">
      <div class="oh"><b><span class="code">${esc(c.code)}</span> · ${c.pct}% OFF</b><span class="chip ${k}">${l}</span></div>
      <div class="om">${c.min_amount ? `Compras desde ${money(c.min_amount)} · ` : ""}Usado ${c.uses}${c.max_uses ? ` de ${c.max_uses}` : ""} ${c.uses === 1 ? "vez" : "veces"}${dates(c)}${c.note ? ` · ${esc(c.note)}` : ""}</div>
      <div class="row"><button class="btn b-line b-sm" data-cpedit="${esc(c.code)}"><i data-lucide="pencil"></i>Editar</button>
        <button class="btn b-ghost b-sm" data-cptoggle="${esc(c.code)}">${c.active ? `<i data-lucide="pause"></i>Pausar` : `<i data-lucide="play"></i>Activar`}</button></div>
    </article>`; }).join("") : `<p class="empty">Todavía no creaste ningún cupón.</p>`;
  icons();
}
function openPromo(id) {
  const p = id ? promos.find((x) => x.id === id) : { title: "", pct: 10, scope: "all", category: Object.keys(CATS)[0], product_id: null, min_items: 0, starts_at: null, ends_at: null, active: true, in_ribbon: true };
  const kind = p.min_items > 0 ? "qty" : p.scope;
  cms = { kind: "promo", id: id || null, data: { ...p, type: kind }, confirmDel: false };
  renderPromoEditor();
}
function renderPromoEditor() {
  const p = cms.data, t = p.type;
  const prods = [...products].sort((a, b) => a.name.localeCompare(b.name));
  sheet(cms.id ? "Editar promoción" : "Nueva promoción", `
    <label class="fl" for="pTitle">1. Nombre de la promoción <small class="hint">Lo ven las clientas en los productos y en la cinta de arriba. Ej: Semana Ruby Rose, Hot Sale.</small><input class="in" id="pTitle" maxlength="40" value="${esc(p.title)}"></label>
    <div class="fl">2. ¿A qué se aplica? <small class="hint">Tocá una opción.</small>
      <div class="seg wrap" role="radiogroup">${[["all", "Toda la tienda"], ["category", "Una categoría"], ["product", "Un producto"], ["qty", "Por cantidad"]].map(([k, l]) => `<button type="button" role="radio" data-ptype="${k}" aria-pressed="${t === k}">${l}</button>`).join("")}</div>
      <p class="typeinfo">${PTYPE_INFO[t]}</p></div>
    ${t === "category" || t === "qty" ? `<label class="fl" for="pCatSel">${t === "qty" ? "¿Sobre qué productos?" : "Categoría"}<select class="in" id="pCatSel">${t === "qty" ? `<option value="" ${p.scope === "all" ? "selected" : ""}>Toda la tienda</option>` : ""}${Object.keys(CATS).map((c) => `<option ${p.scope === "category" && c === p.category ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>` : ""}
    ${t === "product" ? `<label class="fl" for="pProd">Producto<select class="in" id="pProd">${prods.map((x) => `<option value="${x.id}" ${x.id === p.product_id ? "selected" : ""}>${esc(x.name)} · ${money(x.price)}</option>`).join("")}</select></label>` : ""}
    <div class="grid2">
      <label class="fl" for="pPct">3. Descuento <small class="hint">Ej: 15 = 15% menos.</small><span class="cfg-in"><input class="in" id="pPct" type="number" min="1" max="90" inputmode="numeric" value="${p.pct}"><b>%</b></span></label>
      ${t === "qty" ? `<label class="fl" for="pMin">Llevando desde <small class="hint">Cantidad mínima de productos.</small><span class="cfg-in"><input class="in" id="pMin" type="number" min="2" max="50" inputmode="numeric" value="${p.min_items || 3}"><b>unid.</b></span></label>` : "<span></span>"}
      <label class="fl" for="pFrom">Empieza el día (opcional) <small class="hint">Vacío = empieza ahora.</small><input class="in" id="pFrom" type="date" value="${toDay(p.starts_at)}"></label>
      <label class="fl" for="pTo">Termina el día (opcional) <small class="hint">Vacío = sigue hasta que la pauses.</small><input class="in" id="pTo" type="date" value="${toDay(p.ends_at)}"></label>
    </div>
    <label class="row chk"><input type="checkbox" id="pRibbon" ${p.in_ribbon ? "checked" : ""}><span>Anunciarla en la cinta de arriba<small class="hint">La franja rosa con avisos que se mueve arriba de todo en la tienda.</small></span></label>
    <label class="row chk"><input type="checkbox" id="pActive" ${p.active ? "checked" : ""}><span>Promoción encendida<small class="hint">Si la destildás, queda guardada pero apagada.</small></span></label>
    <p class="hint">${t === "qty" ? "El descuento se aplica a todo el pedido cuando la clienta lleva esa cantidad de productos." : "Si un producto tiene varias promos, se aplica la más alta (no se suman)."}</p>
    <p class="err" id="pErr" hidden></p>`,
    `${cms.id ? (cms.confirmDel ? `<span class="row"><span style="font-size:15px">¿Seguro? Se borra para siempre.</span><button class="btn b-rose b-sm" id="pDelYes">Sí, borrar</button><button class="btn b-line b-sm" id="pDelNo">No</button></span>` : `<button class="btn b-ghost" id="pDel"><i data-lucide="trash-2"></i>Borrar promoción</button>`) : "<span></span>"}
     <button class="btn b-rose" id="pSave"><i data-lucide="check"></i>Guardar promoción</button>`);
}
function syncPromo() {
  if (!$("#pTitle")) return; const p = cms.data;
  p.title = $("#pTitle").value.trim(); p.pct = parseInt($("#pPct").value, 10);
  if ($("#pCatSel")) p.category = $("#pCatSel").value; if ($("#pProd")) p.product_id = +$("#pProd").value;
  if ($("#pMin")) p.min_items = parseInt($("#pMin").value, 10);
  p.from = $("#pFrom").value; p.to = $("#pTo").value; p.in_ribbon = $("#pRibbon").checked; p.active = $("#pActive").checked;
}
async function savePromo(btn) {
  syncPromo(); const p = cms.data, err = $("#pErr"); err.hidden = true;
  const fail = (m) => { err.textContent = m; err.hidden = false; };
  if (p.title.length < 2) return fail("Poné un nombre a la promo.");
  if (!(p.pct >= 1 && p.pct <= 90)) return fail("El descuento tiene que estar entre 1% y 90%.");
  if (p.type === "qty" && !(p.min_items >= 2)) return fail("La cantidad mínima tiene que ser 2 o más.");
  if (p.from && p.to && p.from > p.to) return fail("La fecha de fin es anterior a la de inicio.");
  const t = p.type;
  const scope = t === "qty" ? (p.category ? "category" : "all") : t;
  const row = { title: p.title, pct: p.pct, scope, category: scope === "category" ? p.category : null, product_id: scope === "product" ? p.product_id : null,
    min_items: t === "qty" ? p.min_items : 0, starts_at: dayStart(p.from), ends_at: dayEnd(p.to), in_ribbon: p.in_ribbon, active: p.active };
  btn.disabled = true;
  const { error } = cms.id ? await sb.from("promotions").update(row).eq("id", cms.id) : await sb.from("promotions").insert(row);
  if (error) { btn.disabled = false; return fail("No se pudo guardar: " + error.message); }
  closeSheet(); toast("Promoción guardada"); loadPromos();
}
function openCoupon(code) {
  const c = code ? coupons.find((x) => x.code === code) : { code: "", pct: 10, min_amount: 0, max_uses: null, starts_at: null, ends_at: null, active: true, note: "" };
  cms = { kind: "coupon", orig: code || null, data: { ...c }, confirmDel: false };
  renderCouponEditor();
}
function renderCouponEditor() {
  const c = cms.data;
  sheet(cms.orig ? "Editar cupón" : "Nuevo cupón", `
    <label class="fl" for="uCode">Palabra del cupón <small class="hint">La que la clienta escribe en el carrito. Solo letras y números, sin espacios. Ej: BIENVENIDA</small><input class="in code" id="uCode" maxlength="20" value="${esc(c.code)}" ${cms.orig ? "readonly" : ""} autocapitalize="characters" autocomplete="off"></label>
    <div class="grid2">
      <label class="fl" for="uPct">Descuento <small class="hint">Ej: 10 = 10% menos.</small><span class="cfg-in"><input class="in" id="uPct" type="number" min="1" max="90" inputmode="numeric" value="${c.pct}"><b>%</b></span></label>
      <label class="fl" for="uMin">Compra mínima <small class="hint">Vacío = sirve para cualquier compra.</small><span class="cfg-in"><b>$</b><input class="in" id="uMin" type="number" min="0" step="1000" inputmode="numeric" value="${c.min_amount || ""}" placeholder="Sin mínimo"></span></label>
      <label class="fl" for="uMax">¿Cuántas veces se puede usar? <small class="hint">Vacío = sin límite.</small><input class="in" id="uMax" type="number" min="1" inputmode="numeric" value="${c.max_uses || ""}" placeholder="Sin límite"></label>
      <span></span>
      <label class="fl" for="uFrom">Empieza el día (opcional)<input class="in" id="uFrom" type="date" value="${toDay(c.starts_at)}"></label>
      <label class="fl" for="uTo">Termina el día (opcional)<input class="in" id="uTo" type="date" value="${toDay(c.ends_at)}"></label>
    </div>
    <label class="fl" for="uNote">Nota para vos (opcional) <small class="hint">Las clientas no la ven. Te sirve para acordarte para qué lo creaste.</small><input class="in" id="uNote" maxlength="80" value="${esc(c.note || "")}" placeholder="Ej: para clientas de Instagram"></label>
    <label class="row chk"><input type="checkbox" id="uActive" ${c.active ? "checked" : ""}><span>Cupón encendido<small class="hint">Si lo destildás, la palabra deja de funcionar hasta que lo vuelvas a encender.</small></span></label>
    ${cms.orig ? `<p class="hint">Usado ${c.uses} ${c.uses === 1 ? "vez" : "veces"}.</p>` : ""}
    <p class="err" id="uErr" hidden></p>`,
    `${cms.orig ? (cms.confirmDel ? `<span class="row"><span style="font-size:15px">¿Seguro? Se borra para siempre.</span><button class="btn b-rose b-sm" id="uDelYes">Sí, borrar</button><button class="btn b-line b-sm" id="uDelNo">No</button></span>` : `<button class="btn b-ghost" id="uDel"><i data-lucide="trash-2"></i>Borrar cupón</button>`) : "<span></span>"}
     <button class="btn b-rose" id="uSave"><i data-lucide="check"></i>Guardar cupón</button>`);
}
async function saveCoupon(btn) {
  const c = cms.data, err = $("#uErr"); err.hidden = true; const fail = (m) => { err.textContent = m; err.hidden = false; };
  const code = $("#uCode").value.trim().toUpperCase(), pct = parseInt($("#uPct").value, 10);
  const min = parseInt($("#uMin").value || "0", 10), max = $("#uMax").value ? parseInt($("#uMax").value, 10) : null;
  const from = $("#uFrom").value, to = $("#uTo").value;
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return fail("El código tiene que tener de 3 a 20 letras o números, sin espacios.");
  if (!cms.orig && coupons.some((x) => x.code === code)) return fail("Ya existe un cupón con ese código.");
  if (!(pct >= 1 && pct <= 90)) return fail("El descuento tiene que estar entre 1% y 90%.");
  if (!(min >= 0)) return fail("La compra mínima no es válida.");
  if (max !== null && !(max >= 1)) return fail("El límite de usos tiene que ser 1 o más, o dejalo vacío.");
  if (from && to && from > to) return fail("La fecha de fin es anterior a la de inicio.");
  const row = { code, pct, min_amount: min, max_uses: max, starts_at: dayStart(from), ends_at: dayEnd(to), active: $("#uActive").checked, note: $("#uNote").value.trim() || null };
  btn.disabled = true;
  const { error } = cms.orig ? await sb.from("coupons").update(row).eq("code", cms.orig) : await sb.from("coupons").insert(row);
  if (error) { btn.disabled = false; return fail("No se pudo guardar: " + error.message); }
  closeSheet(); toast("Cupón guardado"); loadPromos();
}

/* ============ PÁGINA (contenido) ============ */
// Valores por defecto: los mismos textos que trae la tienda.
const PAGE_DEFAULTS = {
  ribbon: ["Envíos a todo el país", "Retiro en el local: Junín 830", "Nueva colección de sombras Ruby Rose", "Outlet de calzado: pares únicos", "Venta mayorista", "Consultas al 3794-717236"],
  hero: { kicker: "Nacionales e importados · Corrientes", title: "Tu *Sos* de belleza, en un solo lugar",
    text: "Skincare personalizado, maquillaje, insumos de uñas, pestañas y accesorios. Y el outlet de calzado con pares únicos. Elegí online, te confirmamos por WhatsApp y retirás en el local o te lo enviamos.",
    cta2_label: "Outlet de calzado", cta2_cat: "Outlet calzado", cta2_hide: false, note: "Calzado del 35 al 40 · nacional y brasilero 🇦🇷 🇧🇷",
    stamp_big: "Envíos", stamp_small: "A TODO EL PAÍS",
    collage: [{ cat: "Skincare", label: "Skincare", desc: "Mascarillas, vinchas y rutina", img: "/img/productos/hero-a.jpg" },
              { cat: "Maquillaje", label: "Maquillaje", desc: "Ruby Rose y más", img: "/img/productos/13.jpg" },
              { cat: "Brochas y pinceles", label: "Brochas y pinceles", desc: "Para maquillaje y skincare", img: "/img/productos/07.jpg" }] },
  perks: [{ title: "Envíos", text: "en Corrientes y a todo el país" }, { title: "Retiro en el local", text: "Junín 830, Corrientes" },
          { title: "Venta mayorista", text: "consultá precios por cantidad" }, { title: "Asesoramiento", text: "te armamos tu rutina por WhatsApp" }],
  cats: { title: "Comprá por categoría", text: "Lo que encontrás en el local, ahora online" },
  shop: { title: "La tienda", text: "Mirá qué hay en stock y, en el outlet de calzado, qué talles quedan de cada par." },
  story: { eyebrow: "Nuestra historia", title: "De un hobby a tu local de belleza",
    p1: "SOS Cosméticos empezó como un hobby, pasó por una estética y por una zapatería (de ahí nuestro outlet de calzado) y hoy es un local de insumos de belleza en el centro de Corrientes.",
    p2: "Te ayudamos a armar tu rutina de skincare, elegir tu maquillaje y conseguir todo para uñas y pestañas. Venite al local o escribinos: te asesoramos como a una amiga." },
  contact: { address: "Junín 830", address_note: "entre Salta y Buenos Aires · Corrientes Capital", hours: "Lunes a sábados, 9:30 a 12:30 y 17:30 a 21 hs", whatsapp: "3794-717236", instagram: "s.o.scosmeticos_ctes" },
  footer: { text: "Skincare personalizado, maquillaje, uñas, pestañas y accesorios, nacionales e importados. Outlet de calzado. Corrientes Capital." },
};
const merge = (a, b) => { if (Array.isArray(a)) return Array.isArray(b) && b.length ? (typeof a[0] === "object" ? a.map((x, i) => merge(x, b[i] || {})) : b) : a;
  if (a && typeof a === "object") { const o = { ...a }; for (const k in a) if (b && b[k] !== undefined) o[k] = merge(a[k], b[k]); return o; } return b ?? a; };
let page = null, pageFiles = {};
async function renderPage() {
  const { data } = await sb.from("settings").select("content").eq("id", 1).maybeSingle();
  page = merge(PAGE_DEFAULTS, (data && data.content) || {}); pageFiles = {};
  drawPage();
}
const fld = (id, label, val, opt = {}) => `<label class="fl" for="${id}">${label}${opt.hint ? ` <small class="hint">${opt.hint}</small>` : ""}${opt.area
  ? `<textarea class="in" id="${id}" rows="${opt.rows || 3}" maxlength="${opt.max || 400}">${esc(val ?? "")}</textarea>` : `<input class="in" id="${id}" maxlength="${opt.max || 120}" value="${esc(val ?? "")}">`}</label>`;
function drawPage() {
  const P = page, h = P.hero, catOpts = (sel) => Object.keys(CATS).map((c) => `<option ${c === sel ? "selected" : ""}>${esc(c)}</option>`).join("");
  $("#pageForm").innerHTML = `
  <details class="card pgs" open><summary><i data-lucide="megaphone"></i>Cinta de avisos (arriba de todo)</summary>
    ${fld("gRibbon", "Un aviso por renglón", P.ribbon.join("\n"), { area: 1, rows: 6, max: 800, hint: "Es la franja rosa que se mueve arriba de todo. Escribí cada aviso en un renglón distinto (tecla Enter para bajar). Las promociones encendidas y el descuento por transferencia se agregan solos." })}</details>
  <details class="card pgs" open><summary><i data-lucide="sparkles"></i>Inicio</summary>
    <p class="hint">Es lo primero que se ve al entrar a la tienda.</p>${fld("gKicker", "Frase chica de arriba del título", h.kicker)}
    ${fld("gTitle", "Título grande", h.title, { hint: "Encerrá entre asteriscos la palabra que va en cursiva rosa. Ej: Tu *Sos* de belleza" })}
    ${fld("gText", "Texto debajo del título", h.text, { area: 1, max: 400 })}
    <div class="grid2">${fld("gCta2", "Segundo botón: texto", h.cta2_label, { max: 30 })}
      <label class="fl" for="gCta2Cat">Segundo botón: lleva a<select class="in" id="gCta2Cat">${catOpts(h.cta2_cat)}</select></label></div>
    <label class="row chk"><input type="checkbox" id="gCta2Hide" ${h.cta2_hide ? "checked" : ""}> Ocultar el segundo botón</label>
    ${fld("gNote", "Nota chiquita debajo de los botones", h.note, { hint: "Dejalo vacío para ocultarla." })}
    <div class="grid2">${fld("gStampBig", "Sello redondo: grande", h.stamp_big, { max: 14 })}${fld("gStampSmall", "Sello redondo: chico", h.stamp_small, { max: 22 })}</div>
    <div class="fl">Las 3 fotos grandes del inicio <small class="hint">Cada foto lleva a una categoría cuando la tocan. Para cambiarla, tocá <b>Cambiar foto</b> y elegila de tu galería.</small>
      <div class="col3">${h.collage.map((c, i) => `
        <div class="colitem"><div class="thumb big">${pageFiles["col" + i] ? `<img src="${URL.createObjectURL(pageFiles["col" + i])}" alt="">` : c.img ? `<img src="${esc(c.img)}" alt="">` : ""}</div>
          <label class="btn b-line b-sm" for="gColFile${i}"><i data-lucide="image-plus"></i>Cambiar foto</label><input id="gColFile${i}" data-colfile="${i}" type="file" accept="image/*" hidden>
          <label class="fl" for="gColCat${i}">Lleva a<select class="in" id="gColCat${i}">${catOpts(c.cat)}</select></label>
          ${fld("gColLabel" + i, "Título", c.label, { max: 28 })}${fld("gColDesc" + i, "Texto chico", c.desc, { max: 40 })}</div>`).join("")}</div></div>
  </details>
  <details class="card pgs"><summary><i data-lucide="badge-check"></i>Beneficios (los 4 recuadros)</summary>
    ${P.perks.map((p, i) => `<div class="grid2">${fld("gPerkT" + i, `Beneficio ${i + 1}: título`, p.title, { max: 30 })}${fld("gPerkX" + i, "Texto", p.text, { max: 50 })}</div>
      <label class="row chk"><input type="checkbox" id="gPerkH${i}" ${p.hide ? "checked" : ""}> Ocultar este beneficio</label>`).join("")}</details>
  <details class="card pgs"><summary><i data-lucide="layout-grid"></i>Títulos de secciones</summary>
    <div class="grid2">${fld("gCatsT", "Categorías: título", P.cats.title, { max: 40 })}${fld("gCatsX", "Categorías: texto", P.cats.text, { max: 80 })}
      ${fld("gShopT", "Tienda: título", P.shop.title, { max: 40 })}${fld("gShopX", "Tienda: texto", P.shop.text, { max: 120 })}</div></details>
  <details class="card pgs"><summary><i data-lucide="book-heart"></i>Nuestra historia</summary>
    ${fld("gStEy", "Etiqueta", P.story.eyebrow, { max: 30 })}${fld("gStT", "Título", P.story.title, { max: 60 })}
    ${fld("gStP1", "Primer párrafo", P.story.p1, { area: 1, max: 500 })}${fld("gStP2", "Segundo párrafo", P.story.p2, { area: 1, max: 500 })}</details>
  <details class="card pgs"><summary><i data-lucide="map-pin"></i>Contacto y pie de página</summary>
    <div class="grid2">${fld("gAddr", "Dirección", P.contact.address, { max: 60 })}${fld("gAddrN", "Referencia", P.contact.address_note, { max: 80 })}
      ${fld("gHours", "Horarios", P.contact.hours, { max: 80 })}${fld("gWa", "WhatsApp (como se muestra)", P.contact.whatsapp, { max: 20 })}
      ${fld("gIg", "Instagram (usuario, sin @)", P.contact.instagram, { max: 40 })}</div>
    ${fld("gFoot", "Texto del pie de página", P.footer.text, { area: 1, max: 300 })}
    <p class="hint">Esto cambia solo cómo se ve el número en la página. El número al que llegan los pedidos por WhatsApp lo cambia quien armó la tienda.</p></details>
  <p class="err" id="gErr" hidden></p>
  <div class="row pg-actions"><span class="dirty" id="gDirty" hidden><i data-lucide="triangle-alert"></i>Tenés cambios sin guardar</span><button class="btn b-rose" type="submit" id="gSave"><i data-lucide="save"></i>Guardar cambios</button>
    <a class="btn b-line" href="/" target="_blank" rel="noopener"><i data-lucide="external-link"></i>Ver tienda</a>
    <button class="btn b-ghost" type="button" id="gReset">Volver a los textos originales</button></div>`;
  icons();
}
function readPage() {
  const v = (id) => ($("#" + id) ? $("#" + id).value.trim() : "");
  const P = page;
  P.ribbon = v("gRibbon").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 12);
  Object.assign(P.hero, { kicker: v("gKicker"), title: v("gTitle"), text: v("gText"), cta2_label: v("gCta2"), cta2_cat: v("gCta2Cat"), cta2_hide: $("#gCta2Hide").checked,
    note: v("gNote"), stamp_big: v("gStampBig"), stamp_small: v("gStampSmall") });
  P.hero.collage.forEach((c, i) => Object.assign(c, { cat: v("gColCat" + i), label: v("gColLabel" + i), desc: v("gColDesc" + i) }));
  P.perks.forEach((p, i) => Object.assign(p, { title: v("gPerkT" + i), text: v("gPerkX" + i), hide: $("#gPerkH" + i).checked }));
  Object.assign(P.cats, { title: v("gCatsT"), text: v("gCatsX") }); Object.assign(P.shop, { title: v("gShopT"), text: v("gShopX") });
  Object.assign(P.story, { eyebrow: v("gStEy"), title: v("gStT"), p1: v("gStP1"), p2: v("gStP2") });
  Object.assign(P.contact, { address: v("gAddr"), address_note: v("gAddrN"), hours: v("gHours"), whatsapp: v("gWa"), instagram: v("gIg").replace(/^@/, "") });
  P.footer.text = v("gFoot");
}
async function savePage(btn) {
  readPage(); const err = $("#gErr"); err.hidden = true;
  if (!page.hero.title) { err.textContent = "El título grande no puede quedar vacío."; err.hidden = false; return; }
  btn.disabled = true;
  try {
    for (const k of Object.keys(pageFiles)) { const i = +k.slice(3); page.hero.collage[i].img = await uploadPhoto(pageFiles[k]); }
    pageFiles = {};
    const { error } = await sb.from("settings").update({ content: page, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw error;
    toast("¡Listo! Los cambios ya se ven en la tienda"); drawPage();
  } catch (x) { err.textContent = "No se pudo guardar: " + (x.message || "error"); err.hidden = false; }
  btn.disabled = false;
}

/* ============ CAMBIAR MI CONTRASEÑA (por mail) ============ */
async function openMyPass() {
  const { data } = await sb.auth.getSession();
  const email = (data.session && data.session.user && data.session.user.email) || "";
  const fake = !email || email.endsWith("@" + LOGIN_DOMAIN);
  cms = { kind: "pass", email };
  sheet("Cambiar mi contraseña", fake
    ? `<p class="typeinfo">Este usuario no tiene un correo de verdad, así que no podemos mandarle el mail para cambiar la contraseña.</p>
       <p class="hint">Pedile el cambio a quien armó la tienda, o entrá con tu usuario de correo.</p>`
    : `<ol class="steps">
        <li><span>Tocá <b>Enviarme el correo</b>. Te mandamos un mail a <b>${esc(email)}</b>.</span></li>
        <li><span>Abrí ese mail (si no aparece en unos minutos, fijate en <b>Spam</b> o <b>Promociones</b>) y tocá el enlace <b>Reset Password</b>.</span></li>
        <li><span>Se abre el panel: escribí tu contraseña nueva dos veces y tocá <b>Guardar y entrar</b>. ¡Listo!</span></li></ol>
       <p class="tip"><i data-lucide="lightbulb"></i><span>Elegí una contraseña de al menos 8 letras o números que no uses en otro lado. Hasta que no la cambies, la anterior sigue funcionando.</span></p>
       <p class="okmsg" id="mpOk" hidden></p><p class="err" id="mpErr" hidden></p>`,
    `<span></span>${fake ? "" : `<button class="btn b-rose" id="mpSend"><i data-lucide="mail"></i>Enviarme el correo</button>`}`);
}
async function sendMyPass(btn) {
  btn.disabled = true; $("#mpErr").hidden = true;
  const { error } = await sb.auth.resetPasswordForEmail(cms.email, { redirectTo: location.origin + "/admin.html" });
  if (error) {
    btn.disabled = false;
    $("#mpErr").textContent = /rate|seconds|many/i.test(error.message) ? "Ya te mandamos un correo hace poco. Esperá unos minutos y probá de nuevo." : "No se pudo enviar el correo. Probá de nuevo en un rato.";
    $("#mpErr").hidden = false; return;
  }
  btn.innerHTML = '<i data-lucide="check"></i>Correo enviado'; icons();
  $("#mpOk").textContent = `Listo: revisá tu correo ${cms.email}.`; $("#mpOk").hidden = false;
}

/* ============ hoja lateral compartida ============ */
function sheet(title, body, foot) {
  $("#editor").hidden = false;
  $("#editor").innerHTML = `<div class="scrim" data-cclose></div>
  <aside class="sheet" role="dialog" aria-modal="true" aria-labelledby="cTitle">
    <div class="sh"><h2 id="cTitle">${title}</h2><button class="btn b-line b-sm" data-cclose><i data-lucide="x"></i>Cerrar sin guardar</button></div>
    <div class="sb">${body}</div><div class="sf">${foot}</div></aside>`;
  icons(); setTimeout(() => { const f = $("#editor .sb input:not([readonly]),#editor .sb select"); f && f.focus(); }, 50);
}
function closeSheet() { cms = null; $("#editor").hidden = true; $("#editor").innerHTML = ""; }

/* ============ eventos ============ */
document.addEventListener("click", async (ev) => {
  const t = ev.target.closest("button,[data-cclose]"); if (!t) return;
  if (t.id === "myPass") return openMyPass();
  if (t.id === "mpSend" && cms && cms.kind === "pass") return sendMyPass(t);
  if (t.id === "newCat") return openCat(null);
  if (t.dataset.cedit) return openCat(t.dataset.cedit);
  if (t.dataset.cmove) return moveCat(+t.dataset.cmove, +t.dataset.dir);
  if (t.id === "newPromo") return openPromo(null);
  if (t.dataset.pedit) return openPromo(+t.dataset.pedit);
  if (t.dataset.ptoggle) { const p = promos.find((x) => x.id === +t.dataset.ptoggle); t.disabled = true;
    await sb.from("promotions").update({ active: !p.active }).eq("id", p.id); toast(p.active ? "Promo pausada" : "Promo activada"); return loadPromos(); }
  if (t.id === "newCoupon") return openCoupon(null);
  if (t.dataset.cpedit) return openCoupon(t.dataset.cpedit);
  if (t.dataset.cptoggle) { const c = coupons.find((x) => x.code === t.dataset.cptoggle); t.disabled = true;
    await sb.from("coupons").update({ active: !c.active }).eq("code", c.code); toast(c.active ? "Cupón pausado" : "Cupón activado"); return loadPromos(); }
  if (t.id === "gReset") { if (t.dataset.sure) { page = merge(PAGE_DEFAULTS, {}); drawPage(); $("#gDirty").hidden = false; toast("Textos originales cargados: tocá Guardar para aplicarlos"); }
    else { t.dataset.sure = 1; t.textContent = "¿Seguro? Tocá de nuevo"; } return; }
  if (!cms) return;
  if (t.hasAttribute("data-cclose")) return closeSheet();
  if (cms.kind === "cat") {
    if (t.dataset.kicon) { syncCat(); cms.data.icon = t.dataset.kicon; return renderCatEditor(); }
    if (t.id === "kNoPhoto") { syncCat(); cms.data.image_url = ""; cms.file = null; return renderCatEditor(); }
    if (t.id === "kSave") return saveCat(t);
    if (t.id === "kDel") { const n = products.filter((p) => p.category === cms.orig).length;
      if (n) { $("#kErr").textContent = `Esta categoría tiene ${n} productos. Pasalos a otra categoría (o borralos) antes de borrarla, o desmarcá "Visible" para ocultarla.`; $("#kErr").hidden = false; return; }
      syncCat(); cms.confirmDel = true; return renderCatEditor(); }
    if (t.id === "kDelNo") { syncCat(); cms.confirmDel = false; return renderCatEditor(); }
    if (t.id === "kDelYes") { const { error } = await sb.from("categories").delete().eq("name", cms.orig);
      if (error) { $("#kErr").textContent = "No se pudo borrar: " + error.message; $("#kErr").hidden = false; return; }
      closeSheet(); toast("Categoría borrada"); await loadCats(); return renderCatList(); }
  }
  if (cms.kind === "promo") {
    if (t.dataset.ptype) { syncPromo(); cms.data.type = t.dataset.ptype; if (t.dataset.ptype === "qty" && !(cms.data.min_items > 0)) cms.data.min_items = 3; if (t.dataset.ptype === "qty") cms.data.category = ""; return renderPromoEditor(); }
    if (t.id === "pSave") return savePromo(t);
    if (t.id === "pDel") { syncPromo(); cms.confirmDel = true; return renderPromoEditor(); }
    if (t.id === "pDelNo") { syncPromo(); cms.confirmDel = false; return renderPromoEditor(); }
    if (t.id === "pDelYes") { await sb.from("promotions").delete().eq("id", cms.id); closeSheet(); toast("Promoción borrada"); return loadPromos(); }
  }
  if (cms.kind === "coupon") {
    if (t.id === "uSave") return saveCoupon(t);
    if (t.id === "uDel") { cms.confirmDel = true; return renderCouponEditor(); }
    if (t.id === "uDelNo") { cms.confirmDel = false; return renderCouponEditor(); }
    if (t.id === "uDelYes") { await sb.from("coupons").delete().eq("code", cms.orig); closeSheet(); toast("Cupón borrado"); return loadPromos(); }
  }
});
document.addEventListener("input", (ev) => {
  if (ev.target.id === "kHue" && cms) { const sw = $("#editor .swatch"); const h = ev.target.value; sw.style.background = `oklch(0.93 0.045 ${h})`; sw.style.color = `oklch(0.45 0.13 ${h})`; }
  if (ev.target.id === "uCode") ev.target.value = ev.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
});
document.addEventListener("change", (ev) => {
  if (ev.target.id === "kFile" && cms) { syncCat(); const f = ev.target.files[0]; if (f && f.size > 8 * 1024 * 1024) return toast("La foto pesa más de 8 MB"); cms.file = f || null; renderCatEditor(); }
  if (ev.target.dataset && ev.target.dataset.colfile !== undefined) { const f = ev.target.files[0]; if (!f) return; if (f.size > 8 * 1024 * 1024) return toast("La foto pesa más de 8 MB");
    readPage(); pageFiles["col" + ev.target.dataset.colfile] = f; drawPage(); $("#gDirty").hidden = false; }
});
document.addEventListener("input", (ev) => { if (ev.target.closest && ev.target.closest("#pageForm")) { const d = $("#gDirty"); if (d) d.hidden = false; } });
window.addEventListener("beforeunload", (ev) => { const d = $("#gDirty"); if (d && !d.hidden) { ev.preventDefault(); ev.returnValue = ""; } });
document.addEventListener("submit", (ev) => { if (ev.target.id === "pageForm") { ev.preventDefault(); savePage($("#gSave")); } });
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && cms) closeSheet(); });
