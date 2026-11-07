// Base de datos en Neon (Postgres). Reemplaza a Supabase.
// - query(sql, params): consulta directa.
// - rest({...}): select/insert/update/delete armados de forma segura (solo tablas y columnas conocidas).
// - sb("tabla?col=eq.x&select=..."): misma forma de llamar que usaba la tienda con Supabase,
//   así el resto del código no cambia.
const { neon, types } = require("@neondatabase/serverless");

// bigint (ids) como número, igual que devolvía Supabase
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

function dbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // Por si la integración se conectó con otro prefijo
  const k = Object.keys(process.env).find((k) => /DATABASE_URL$/.test(k) && /neon\.tech/.test(process.env[k]));
  if (k) return process.env[k];
  throw new Error("Falta la variable de entorno DATABASE_URL (Neon)");
}
let _sql = null, _pool = null;
const sql = () => (_sql ??= neon(dbUrl()));
async function query(text, params = []) {
  const url = dbUrl();
  // Pruebas en una computadora con Postgres local (no se usa en Vercel)
  if (/@(localhost|127\.0\.0\.1)[:/]|host=\//.test(url)) {
    const { Pool, types: pgTypes } = require("pg");
    pgTypes.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));
    _pool ??= new Pool({ connectionString: url });
    return (await _pool.query(text, params)).rows;
  }
  return await sql().query(text, params);
}

// ---------- tablas y columnas permitidas ----------
const T = {
  products: ["id", "name", "category", "price", "old_price", "sizes", "image_url", "images", "variant_label", "variant_images", "icon", "active", "sort", "created_at", "updated_at"],
  categories: ["name", "description", "icon", "hue", "image_url", "sort", "active", "in_nav", "updated_at"],
  orders: ["id", "created_at", "status", "stock_applied", "stock_issue", "items", "total", "discount", "subtotal", "promo_discount", "coupon", "coupon_discount", "shipping", "pay_method", "buyer_name", "buyer_phone", "buyer_email", "buyer_address", "notes", "mp_preference_id", "mp_payment_id", "mp_status", "paid_at"],
  mp_connection: ["id", "mp_user_id", "access_token", "refresh_token", "public_key", "live_mode", "expires_at", "updated_at"],
  revocations: ["id", "code", "created_at", "status", "name", "email", "phone", "order_ref", "product", "reason"],
  settings: ["id", "transfer_pct", "installments", "free_ship_min", "content", "updated_at"],
  promotions: ["id", "title", "pct", "scope", "category", "product_id", "min_items", "starts_at", "ends_at", "active", "in_ribbon", "created_at"],
  coupons: ["code", "pct", "min_amount", "starts_at", "ends_at", "max_uses", "uses", "active", "note", "created_at"],
};
const JSONB = new Set(["sizes", "variant_images", "items", "content"]);
const RPC = { mark_order_paid: ["p_order", "p_payment", "p_status"], use_coupon: ["p_code"] };

const q = (id) => `"${id}"`;
function checkTable(t) { if (!T[t]) throw new Error(`Tabla no permitida: ${t}`); return t; }
function checkCol(t, c) { if (!T[t].includes(c)) throw new Error(`Columna no permitida: ${t}.${c}`); return c; }
function cols(t, select) {
  if (!select || select === "*") return "*";
  return select.split(",").map((c) => q(checkCol(t, c.trim()))).join(", ");
}
const val = (col, v) => (JSONB.has(col) && v !== null && v !== undefined ? JSON.stringify(v) : v);
const cast = (col) => (JSONB.has(col) ? "::jsonb" : "");

const OPS = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=" };
function where(t, filters, params) {
  const parts = [];
  for (const [c, op, v] of filters || []) {
    checkCol(t, c);
    if (op === "in") {
      const list = Array.isArray(v) ? v : [];
      if (!list.length) { parts.push("false"); continue; }
      parts.push(`${q(c)} = any($${params.push(list)})`);
    } else if (op === "is") {
      parts.push(`${q(c)} is ${v === null || v === "null" ? "null" : v === true || v === "true" ? "true" : "false"}`);
    } else if (OPS[op]) {
      parts.push(`${q(c)} ${OPS[op]} $${params.push(v)}`);
    } else throw new Error(`Operador no permitido: ${op}`);
  }
  return parts.length ? ` where ${parts.join(" and ")}` : "";
}

// rest({ table, op: select|insert|update|upsert|delete, select, filters:[[col,op,val]], order:[[col,asc]], limit, values, onConflict })
async function rest({ table, op = "select", select, filters, order, limit, values, onConflict }) {
  const t = checkTable(table), params = [];
  if (op === "select") {
    let s = `select ${cols(t, select)} from ${q(t)}${where(t, filters, params)}`;
    if (order && order.length) s += " order by " + order.map(([c, asc]) => `${q(checkCol(t, c))} ${asc === false ? "desc" : "asc"}`).join(", ");
    if (limit) s += ` limit ${Math.max(1, Math.min(1000, parseInt(limit, 10) || 1))}`;
    return await query(s, params);
  }
  if (op === "insert" || op === "upsert") {
    const rows = Array.isArray(values) ? values : [values];
    if (!rows.length) return [];
    const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].map((c) => checkCol(t, c));
    const tuples = rows.map((r) => `(${keys.map((c) => (c in r ? `$${params.push(val(c, r[c]))}${cast(c)}` : "default")).join(", ")})`);
    let s = `insert into ${q(t)} (${keys.map(q).join(", ")}) values ${tuples.join(", ")}`;
    if (op === "upsert") {
      const key = checkCol(t, onConflict || T[t][0]);
      const upd = keys.filter((c) => c !== key);
      s += upd.length ? ` on conflict (${q(key)}) do update set ${upd.map((c) => `${q(c)} = excluded.${q(c)}`).join(", ")}` : ` on conflict (${q(key)}) do nothing`;
    }
    return await query(s + " returning *", params);
  }
  if (op === "update") {
    const keys = Object.keys(values || {}).map((c) => checkCol(t, c));
    if (!keys.length) return [];
    if (!filters || !filters.length) throw new Error("Update sin filtro");
    const set = keys.map((c) => `${q(c)} = $${params.push(val(c, values[c]))}${cast(c)}`).join(", ");
    return await query(`update ${q(t)} set ${set}${where(t, filters, params)} returning *`, params);
  }
  if (op === "delete") {
    if (!filters || !filters.length) throw new Error("Delete sin filtro");
    return await query(`delete from ${q(t)}${where(t, filters, params)} returning *`, params);
  }
  throw new Error(`Operación no permitida: ${op}`);
}

// ---------- compatibilidad con la forma de llamar de Supabase (PostgREST) ----------
function parseValue(op, raw) {
  if (op === "in") return raw.replace(/^\(|\)$/g, "").split(",").filter(Boolean).map((x) => decodeURIComponent(x.replace(/^"|"$/g, "")));
  return decodeURIComponent(raw);
}
async function sb(path, { method = "GET", body, prefer } = {}) {
  const [name, qs = ""] = path.split("?");
  if (name.startsWith("rpc/")) {
    const fn = name.slice(4), args = RPC[fn];
    if (!args) throw new Error(`Función no permitida: ${fn}`);
    const params = args.map((a) => (body || {})[a] ?? null);
    const rows = await query(`select ${q(fn)}(${args.map((a, i) => `${a} => $${i + 1}`).join(", ")}) as r`, params);
    return rows[0] ? rows[0].r : null;
  }
  const filters = [], opt = {};
  for (const part of qs.split("&").filter(Boolean)) {
    const i = part.indexOf("="), k = decodeURIComponent(part.slice(0, i)), v = part.slice(i + 1);
    if (k === "select") opt.select = decodeURIComponent(v);
    else if (k === "order") opt.order = decodeURIComponent(v).split(",").map((o) => { const [c, d] = o.split("."); return [c, d !== "desc"]; });
    else if (k === "limit") opt.limit = v;
    else if (k === "on_conflict") opt.onConflict = v;
    else { const j = v.indexOf("."); const op = v.slice(0, j); filters.push([k, op, parseValue(op, v.slice(j + 1))]); }
  }
  const upsert = /merge-duplicates/.test(prefer || "");
  if (method === "GET") return await rest({ table: name, op: "select", ...opt, filters });
  if (method === "POST") return await rest({ table: name, op: upsert ? "upsert" : "insert", values: body, onConflict: opt.onConflict });
  if (method === "PATCH") return await rest({ table: name, op: "update", values: body, filters });
  if (method === "DELETE") return await rest({ table: name, op: "delete", filters });
  throw new Error(`Método no permitido: ${method}`);
}

module.exports = { query, rest, sb, TABLES: T, dbUrl };
