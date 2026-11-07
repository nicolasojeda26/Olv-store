// Utilidades compartidas por las funciones de /api (Vercel, Node 18+).
const crypto = require("crypto");

const env = (k, def) => {
  const v = process.env[k];
  if (v === undefined || v === "") {
    if (def !== undefined) return def;
    throw new Error(`Falta la variable de entorno ${k}`);
  }
  return v;
};

const MP_API = "https://api.mercadopago.com";
const MP_AUTH = () => env("MP_AUTH_URL", "https://auth.mercadopago.com.ar/authorization");
const TEST_MODE = () => env("MP_SANDBOX", "false") === "true";

// Dirección pública de la tienda (back_urls, aviso de Mercado Pago y conexión OAuth).
// Para cambiarla: variable PUBLIC_SITE_URL en Vercel (tiene prioridad sobre este valor).
const PUBLIC_SITE = "https://soscosmeticos.vercel.app";
function siteUrl(req) {
  const fixed = process.env.PUBLIC_SITE_URL || PUBLIC_SITE;
  if (fixed) return fixed.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers["x-forwarded-host"] || req.headers.host}`;
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}

// ---------- Base de datos (Neon) y sesión del panel ----------
// sb() mantiene la forma de llamar que se usaba con Supabase; ahora consulta Neon.
const { sb } = require("./db");
const { currentAdmin } = require("./auth");

// Verifica que quien llama sea una administradora con sesión abierta.
async function requireAdmin(req) {
  try { return await currentAdmin(req); } catch (e) { console.error("requireAdmin", e.message); return null; }
}

// ---------- "state" firmado para el OAuth (evita conexiones falsificadas) ----------
// Si no hay OAUTH_STATE_SECRET, se deriva una clave de la conexión a la base (nunca sale del servidor).
const stateSecret = () => process.env.OAUTH_STATE_SECRET || crypto.createHash("sha256").update("oauth-state:" + require("./db").dbUrl()).digest("hex");
function signState(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", stateSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}
function verifyState(state, maxAgeMs = 15 * 60 * 1000) {
  if (!state || !state.includes(".")) return null;
  const [data, sig] = state.split(".");
  const expected = crypto.createHmac("sha256", stateSecret()).update(data).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(Buffer.from(data, "base64url").toString());
  if (!payload.t || Date.now() - payload.t > maxAgeMs) return null;
  return payload;
}

// ---------- Mercado Pago ----------
async function mpToken(body) {
  const r = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env("MP_CLIENT_ID"),
      client_secret: env("MP_CLIENT_SECRET"),
      ...(TEST_MODE() ? { test_token: "true" } : {}),
      ...body,
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) throw new Error(`Mercado Pago OAuth ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

async function saveConnection(t) {
  const row = {
    id: 1,
    mp_user_id: t.user_id != null ? String(t.user_id) : null,
    access_token: t.access_token,
    refresh_token: t.refresh_token || null,
    public_key: t.public_key || null,
    live_mode: t.live_mode ?? null,
    expires_at: new Date(Date.now() + (Number(t.expires_in) || 15552000) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  await sb("mp_connection?on_conflict=id", { method: "POST", body: row, prefer: "resolution=merge-duplicates" });
  return row;
}

// Devuelve el access token de Isabella, renovándolo si vence en menos de 15 días.
async function sellerToken() {
  const rows = await sb("mp_connection?id=eq.1&select=*");
  const c = rows && rows[0];
  if (!c) return null;
  const left = c.expires_at ? new Date(c.expires_at).getTime() - Date.now() : Infinity;
  if (left < 15 * 24 * 3600 * 1000 && c.refresh_token) {
    try {
      const t = await mpToken({ grant_type: "refresh_token", refresh_token: c.refresh_token });
      return (await saveConnection(t)).access_token;
    } catch (e) {
      console.error("No se pudo renovar el token de Mercado Pago", e.message);
    }
  }
  return c.access_token;
}

async function mp(path, token, { method = "GET", body, idempotencyKey } = {}) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;
  const r = await fetch(`${MP_API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mercado Pago ${method} ${path} → ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

module.exports = {
  env, siteUrl, PUBLIC_SITE, send, readBody, sb, requireAdmin, signState, verifyState,
  mpToken, saveConnection, sellerToken, mp, MP_AUTH, TEST_MODE,
};
