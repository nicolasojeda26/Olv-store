// /api/mp-admin?action=status|connect|disconnect — solo para la dueña (sesión de Supabase).
const { send, sb, requireAdmin, signState, siteUrl, env, MP_AUTH, TEST_MODE } = require("../lib/shared");

module.exports = async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return send(res, 401, { error: "Iniciá sesión de nuevo." });
    const action = (req.query && req.query.action) || "status";

    if (action === "status") {
      const rows = await sb("mp_connection?id=eq.1&select=mp_user_id,live_mode,expires_at,updated_at");
      const c = rows[0];
      return send(res, 200, c
        ? { connected: true, mp_user_id: c.mp_user_id, live_mode: c.live_mode, expires_at: c.expires_at, updated_at: c.updated_at, test_mode: TEST_MODE() }
        : { connected: false, test_mode: TEST_MODE() });
    }

    if (action === "connect") {
      const state = signState({ t: Date.now(), u: admin.id });
      const params = new URLSearchParams({
        client_id: env("MP_CLIENT_ID"),
        response_type: "code",
        platform_id: "mp",
        state,
        redirect_uri: `${siteUrl(req)}/api/mp-callback`,
      });
      return send(res, 200, { url: `${MP_AUTH()}?${params}` });
    }

    if (action === "disconnect" && req.method === "POST") {
      await sb("mp_connection?id=eq.1", { method: "DELETE" });
      return send(res, 200, { connected: false });
    }

    return send(res, 400, { error: "Acción desconocida" });
  } catch (e) {
    console.error("mp-admin", e);
    return send(res, 500, { error: "Error del servidor" });
  }
};
