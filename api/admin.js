// /api/admin?a=db|upload — todo lo del panel que necesita sesión.
//   db:     leer/guardar en las tablas del panel (solo tablas y columnas conocidas)
//   upload: subir una foto a Vercel Blob
// (La copia única desde Supabase se hizo el 7/11/2026; el código quedó en el historial de git.)
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
