// /api/admin?a=db|upload|import — todo lo del panel que necesita sesión.
//   db:     leer/guardar en las tablas del panel (solo tablas y columnas conocidas)
//   upload: subir una foto a Vercel Blob
//   import: copia única desde Supabase (datos, usuarios y fotos). Se puede borrar después de migrar.
const crypto = require("crypto");
const { send, readBody, requireAdmin } = require("../lib/shared");
const { rest, query } = require("../lib/db");

const PANEL_TABLES = new Set(["products", "categories", "orders", "revocations", "settings", "promotions", "coupons"]);

async function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
  const a = String((req.query && req.query.a) || "");
  try {
    if (a === "import") return await importFromSupabase(req, res);

    const me = await requireAdmin(req);
    if (!me) return send(res, 401, { error: "Iniciá sesión de nuevo." });

    if (a === "db") {
      if (req.method !== "POST") return send(res, 405, { error: "Método no permitido" });
      const b = readBody(req);
      if (!PANEL_TABLES.has(b.table)) return send(res, 400, { error: "Tabla no permitida" });
      if (!["select", "insert", "update", "delete"].includes(b.op)) return send(res, 400, { error: "Operación no permitida" });
      try {
        const rows = await rest({ table: b.table, op: b.op, select: b.select, filters: b.filters, order: b.order, limit: b.limit, values: b.values });
        return send(res, 200, { data: rows });
      } catch (e) {
        // errores de datos (ej: categoría con productos, código repetido) vuelven como mensaje
        return send(res, 400, { error: e.message, code: e.code || null });
      }
    }

    if (a === "upload") {
      if (req.method !== "POST") return send(res, 405, { error: "Método no permitido" });
      const buf = await rawBody(req);
      if (!buf.length) return send(res, 400, { error: "Foto vacía" });
      if (buf.length > 4 * 1024 * 1024) return send(res, 413, { error: "La foto pesa demasiado" });
      const type = String(req.headers["x-content-type"] || "image/jpeg");
      if (!/^image\/(jpeg|png|webp)$/.test(type)) return send(res, 400, { error: "Formato no permitido" });
      const { put } = require("@vercel/blob");
      const ext = type.split("/")[1].replace("jpeg", "jpg");
      const blob = await put(`productos/${crypto.randomUUID()}.${ext}`, buf, { access: "public", contentType: type, cacheControlMaxAge: 31536000, addRandomSuffix: false });
      return send(res, 200, { url: blob.url });
    }

    return send(res, 404, { error: "Acción desconocida" });
  } catch (e) {
    console.error("admin", a, e);
    return send(res, 500, { error: "Error del servidor. Probá de nuevo." });
  }
};

// ------------------------------------------------------------------
// Copia única Supabase → Neon (+ fotos a Vercel Blob)
// Solo corre si todavía no hay ninguna administradora en Neon, o si la pide una administradora.
// ------------------------------------------------------------------
async function importFromSupabase(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Método no permitido" });
  const fs = require("fs"), path = require("path");
  const { Client } = require("pg");
  const neonUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  const supaUrl = ["SUPABASE_DB_URL", "POSTGRES_URL_NON_POOLING", "POSTGRES_URL"].map((k) => process.env[k]).find((v) => v && /supabase/.test(v));
  if (!neonUrl || !supaUrl) return send(res, 500, { error: "Faltan las conexiones (DATABASE_URL de Neon o POSTGRES_URL de Supabase)." });

  const strip = (u) => u.replace(/[?&]sslmode=[^&]*/g, "");
  const ssl = (u) => (/@(localhost|127\.0\.0\.1)[:/]/.test(u) ? false : { rejectUnauthorized: false });
  const neonDb = new Client({ connectionString: strip(neonUrl), ssl: ssl(neonUrl) });
  const supa = new Client({ connectionString: strip(supaUrl), ssl: ssl(supaUrl) });
  await neonDb.connect();
  const log = [];
  try {
    // 1) estructura
    await neonDb.query(fs.readFileSync(path.join(process.cwd(), "neon", "schema.sql"), "utf8"));
    log.push("estructura lista");

    // seguridad: si ya hay administradoras, solo puede pedirlo una de ellas
    const { rows: [{ n }] } = await neonDb.query("select count(*)::int as n from admins");
    if (n > 0 && !(await requireAdmin(req))) return send(res, 403, { error: "La migración ya se hizo." });

    await supa.connect();
    const TABLES = ["categories", "products", "settings", "promotions", "coupons", "orders", "revocations", "mp_connection"];
    const data = {};
    for (const t of TABLES) data[t] = (await supa.query(`select * from public."${t}"`)).rows;
    const admins = (await supa.query("select lower(email) as email, encrypted_password as password_hash from auth.users where email is not null and deleted_at is null")).rows;

    // 2) fotos de Supabase Storage → Vercel Blob
    const { put } = require("@vercel/blob");
    const found = new Set();
    const re = /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/[^"'\s)]+/g;
    for (const t of ["categories", "products", "settings"]) for (const m of JSON.stringify(data[t]).match(re) || []) found.add(m);
    const map = {};
    let moved = 0, failed = 0;
    await Promise.all([...found].map(async (u) => {
      try {
        const r = await fetch(u);
        if (!r.ok) throw new Error(r.status);
        const buf = Buffer.from(await r.arrayBuffer());
        const type = r.headers.get("content-type") || "image/jpeg";
        const name = u.split("/").pop().split("?")[0];
        const b = await put(`productos/${name}`, buf, { access: "public", contentType: type, cacheControlMaxAge: 31536000, addRandomSuffix: false, allowOverwrite: true });
        map[u] = b.url; moved++;
      } catch (e) { failed++; console.error("foto", u, e.message); }
    }));
    const swap = (v) => {
      if (typeof v === "string") return map[v] || Object.keys(map).reduce((s, k) => s.split(k).join(map[k]), v);
      if (Array.isArray(v)) return v.map(swap);
      if (v && typeof v === "object" && !(v instanceof Date)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)]));
      return v;
    };
    log.push(`fotos copiadas: ${moved}${failed ? `, con error: ${failed}` : ""}`);

    // 3) datos (si ya existen, se actualizan)
    const JSONB = new Set(["sizes", "variant_images", "items", "content"]);
    const PK = { categories: "name", coupons: "code", settings: "id", mp_connection: "id" };
    await neonDb.query("begin");
    for (const t of TABLES) {
      const cols = (await neonDb.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1", [t])).rows.map((r) => r.column_name);
      const pk = PK[t] || "id";
      for (const row0 of data[t]) {
        const row = swap(row0);
        const keys = Object.keys(row).filter((k) => cols.includes(k));
        const vals = keys.map((k) => (JSONB.has(k) && row[k] !== null ? JSON.stringify(row[k]) : row[k]));
        const upd = keys.filter((k) => k !== pk);
        await neonDb.query(
          `insert into "${t}" (${keys.map((k) => `"${k}"`).join(",")}) overriding system value values (${keys.map((k, i) => `$${i + 1}${JSONB.has(k) ? "::jsonb" : ""}`).join(",")})
           on conflict ("${pk}") do update set ${upd.map((k) => `"${k}" = excluded."${k}"`).join(",")}`,
          vals
        );
      }
      log.push(`${t}: ${data[t].length}`);
    }
    for (const a of admins) {
      await neonDb.query("insert into admins (email, password_hash) values ($1, $2) on conflict (email) do update set password_hash = excluded.password_hash", [a.email, a.password_hash]);
    }
    log.push(`usuarias del panel: ${admins.length}`);
    // que los números nuevos sigan después de los copiados
    for (const t of ["products", "promotions"]) {
      await neonDb.query(`select setval(pg_get_serial_sequence('${t}','id'), greatest((select coalesce(max(id),0) from "${t}"), 1))`);
    }
    await neonDb.query("commit");
    return send(res, 200, { ok: true, log });
  } catch (e) {
    await neonDb.query("rollback").catch(() => {});
    console.error("import", e);
    return send(res, 500, { error: e.message, log });
  } finally {
    await neonDb.end().catch(() => {});
    await supa.end().catch(() => {});
  }
}
