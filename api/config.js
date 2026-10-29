// GET /api/config — datos públicos que necesita el navegador (no incluye nada secreto).
const { send, env } = require("../lib/shared");

module.exports = (req, res) => {
  try {
    res.setHeader("Cache-Control", "public, max-age=300");
    return send(res, 200, {
      supabaseUrl: env("SUPABASE_URL"),
      supabaseAnonKey: env("SUPABASE_ANON_KEY"),
      whatsapp: env("WHATSAPP_NUMBER", "5493794717236"),
    });
  } catch (e) {
    return send(res, 500, { error: "Falta configurar la tienda (variables de entorno)." });
  }
};
