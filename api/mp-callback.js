// /api/mp-callback — Mercado Pago vuelve acá después de que Isabella autoriza la conexión.
const { verifyState, mpToken, saveConnection, siteUrl } = require("../lib/shared");

module.exports = async (req, res) => {
  const base = siteUrl(req);
  const go = (q) => { res.statusCode = 302; res.setHeader("Location", `${base}/admin.html?mp=${q}`); res.end(); };
  const { code, state, error } = req.query || {};

  if (error) return go("cancelado");
  if (!code || !verifyState(state)) return go("invalido");

  try {
    const t = await mpToken({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${base}/api/mp-callback`,
    });
    await saveConnection(t);
    return go("conectado");
  } catch (e) {
    console.error("mp-callback", e);
    return go("error");
  }
};
