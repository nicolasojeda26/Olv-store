// Login propio del panel (reemplaza a Supabase Auth).
// - Contraseñas cifradas con bcrypt (las que venían de Supabase siguen sirviendo).
// - Sesión en una cookie httpOnly; en la base se guarda solo el hash del código.
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { query } = require("./db");

const COOKIE = "sos_admin";
const SESSION_DAYS = 30;
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const newToken = () => crypto.randomBytes(32).toString("base64url");
const normEmail = (e) => String(e || "").trim().toLowerCase();

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function setCookie(res, value, maxAgeSec) {
  res.setHeader("Set-Cookie", `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`);
}

async function createSession(res, email) {
  const token = newToken();
  await query("insert into admin_sessions (token_hash, email, expires_at) values ($1, $2, now() + make_interval(days => $3))", [sha(token), email, SESSION_DAYS]);
  await query("update admins set last_login_at = now() where email = $1", [email]);
  // limpieza de sesiones vencidas
  query("delete from admin_sessions where expires_at < now()").catch(() => {});
  setCookie(res, token, SESSION_DAYS * 86400);
}

// Devuelve { email } si quien llama tiene sesión válida, o null.
async function currentAdmin(req) {
  const token = cookies(req)[COOKIE];
  if (!token || token.length < 20) return null;
  const rows = await query(
    "select s.email from admin_sessions s join admins a on a.email = s.email where s.token_hash = $1 and s.expires_at > now()",
    [sha(token)]
  );
  return rows[0] ? { email: rows[0].email } : null;
}

async function login(res, email, password) {
  email = normEmail(email);
  const rows = await query("select email, password_hash from admins where email = $1", [email]);
  const hash = rows[0] && rows[0].password_hash;
  // compara siempre (aunque no exista el usuario) para no revelar cuáles existen
  const ok = await bcrypt.compare(String(password || ""), hash || "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali");
  if (!rows[0] || !hash || !ok) return false;
  await createSession(res, email);
  return true;
}

async function logout(req, res) {
  const token = cookies(req)[COOKIE];
  if (token) await query("delete from admin_sessions where token_hash = $1", [sha(token)]).catch(() => {});
  setCookie(res, "", 0);
}

async function setPassword(email, password) {
  const hash = await bcrypt.hash(password, 10);
  await query("update admins set password_hash = $2 where email = $1", [email, hash]);
  // cierra las otras sesiones abiertas
  await query("delete from admin_sessions where email = $1", [email]);
}

// Crea un enlace de "Olvidé mi contraseña" (1 hora). Devuelve el token o null si no corresponde.
async function createReset(email) {
  email = normEmail(email);
  const [a] = await query("select email from admins where email = $1", [email]);
  if (!a) return { token: null };
  const [recent] = await query("select 1 from password_resets where email = $1 and created_at > now() - interval '60 seconds'", [email]);
  if (recent) return { rateLimited: true };
  const token = newToken();
  // cada enlace nuevo anula los anteriores
  await query("update password_resets set used_at = now() where email = $1 and used_at is null", [email]);
  await query("insert into password_resets (token_hash, email, expires_at) values ($1, $2, now() + interval '1 hour')", [sha(token), email]);
  return { token };
}

// Usa el enlace: si es válido, cambia la contraseña y abre sesión.
async function useReset(res, token, password) {
  const rows = await query(
    "update password_resets set used_at = now() where token_hash = $1 and used_at is null and expires_at > now() returning email",
    [sha(String(token || ""))]
  );
  if (!rows[0]) return false;
  await setPassword(rows[0].email, password);
  await createSession(res, rows[0].email);
  return true;
}

module.exports = { currentAdmin, login, logout, setPassword, createReset, useReset, normEmail, COOKIE };
