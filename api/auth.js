// /api/auth?a=login|logout|me|forgot|reset|password — login propio del panel.
const { send, readBody, siteUrl } = require("../lib/shared");
const auth = require("../lib/auth");
const { sendMail, layout } = require("../lib/notify");

const okPass = (p) => typeof p === "string" && p.length >= 8 && p.length <= 200;

module.exports = async (req, res) => {
  const a = String((req.query && req.query.a) || "");
  try {
    if (a === "me") {
      const me = await auth.currentAdmin(req);
      return send(res, 200, { user: me });
    }
    if (req.method !== "POST") return send(res, 405, { error: "Método no permitido" });
    const b = readBody(req);

    if (a === "login") {
      const ok = await auth.login(res, b.email, b.password);
      return ok ? send(res, 200, { ok: true }) : send(res, 401, { error: "Invalid login credentials" });
    }
    if (a === "logout") { await auth.logout(req, res); return send(res, 200, { ok: true }); }

    if (a === "forgot") {
      const email = auth.normEmail(b.email);
      const r = await auth.createReset(email);
      if (r.rateLimited) return send(res, 429, { error: "Too many requests: esperá unos segundos" });
      if (r.token) {
        const link = `${siteUrl(req)}/admin.html#reset=${encodeURIComponent(r.token)}&type=recovery`;
        const m = await sendMail({
          to: email, subject: "Cambiá tu contraseña · Panel SOS Cosméticos",
          html: layout("Cambiá tu contraseña", `<p>Tocá el botón para elegir una contraseña nueva para el panel de la tienda.</p>
            <p style="margin:22px 0"><a href="${link}" style="background:#c42a85;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Elegir contraseña nueva</a></p>
            <p style="color:#7a5866;font-size:13px">El enlace sirve por 1 hora y una sola vez. Si no lo pediste, ignorá este correo: tu contraseña no cambia.</p>`),
        });
        if (m && m.skipped) console.error("forgot: falta RESEND_API_KEY, no se envió el correo");
      }
      // misma respuesta exista o no el usuario
      return send(res, 200, { ok: true });
    }
    if (a === "reset") {
      if (!okPass(b.password)) return send(res, 400, { error: "La contraseña tiene que tener al menos 8 caracteres." });
      const ok = await auth.useReset(res, b.token, b.password);
      return ok ? send(res, 200, { ok: true }) : send(res, 400, { error: "otp_expired" });
    }
    if (a === "password") {
      const me = await auth.currentAdmin(req);
      if (!me) return send(res, 401, { error: "Iniciá sesión de nuevo." });
      if (!okPass(b.password)) return send(res, 400, { error: "La contraseña tiene que tener al menos 8 caracteres." });
      await auth.setPassword(me.email, b.password);
      await auth.login(res, me.email, b.password);
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: "Acción desconocida" });
  } catch (e) {
    console.error("auth", a, e);
    return send(res, 500, { error: "Error del servidor. Probá de nuevo." });
  }
};
