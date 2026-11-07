/* Conexión del panel con la base (Neon) a través de /api.
   Imita la parte de supabase-js que usa el panel (from/select/eq/order/insert/update/delete,
   auth y storage), así el resto del panel no cambia. */
(function () {
  const RESET = new URLSearchParams(location.hash.slice(1)).get("reset"); // enlace de "Olvidé mi contraseña"
  const j = async (url, opt = {}) => {
    const r = await fetch(url, { credentials: "same-origin", ...opt, headers: { "Content-Type": "application/json", ...(opt.headers || {}) } });
    let d = {}; try { d = await r.json(); } catch (e) {}
    return { ok: r.ok, status: r.status, d };
  };

  class Query {
    constructor(table) { this.b = { table, op: "select", filters: [], order: [] }; this.single = false; }
    select(cols) { if (this.b.op === "select") this.b.select = cols || "*"; return this; }
    insert(v) { this.b.op = "insert"; this.b.values = v; return this; }
    update(v) { this.b.op = "update"; this.b.values = v; return this; }
    delete() { this.b.op = "delete"; return this; }
    eq(c, v) { this.b.filters.push([c, "eq", v]); return this; }
    in(c, v) { this.b.filters.push([c, "in", v]); return this; }
    order(c, o) { this.b.order.push([c, !(o && o.ascending === false)]); return this; }
    limit(n) { this.b.limit = n; return this; }
    maybeSingle() { this.single = true; return this; }
    async run() {
      const { ok, status, d } = await j("/api/admin?a=db", { method: "POST", body: JSON.stringify(this.b) });
      if (status === 401) { (window.__onAuth || []).forEach((f) => f("SIGNED_OUT", null)); }
      if (!ok) return { data: null, error: { message: d.error || "Error", code: d.code } };
      return { data: this.single ? (d.data && d.data[0]) || null : d.data, error: null };
    }
    then(res, rej) { return this.run().then(res, rej); }
  }

  let me = null, meLoaded = false;
  const session = () => (me ? { user: { email: me.email }, access_token: "cookie" } : null);
  async function loadMe() { const { d } = await j("/api/auth?a=me"); me = d.user || null; meLoaded = true; return me; }

  const urls = {}; // ruta → url pública de la última subida
  window.SOSDB = {
    from: (t) => new Query(t),
    auth: {
      async getSession() { if (!meLoaded) await loadMe(); return { data: { session: session() } }; },
      onAuthStateChange(cb) { (window.__onAuth = window.__onAuth || []).push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
      async signInWithPassword({ email, password }) {
        const { ok, d } = await j("/api/auth?a=login", { method: "POST", body: JSON.stringify({ email, password }) });
        if (!ok) return { error: { message: d.error || "Invalid login credentials" } };
        await loadMe(); return { data: { session: session() }, error: null };
      },
      async signOut() { await j("/api/auth?a=logout", { method: "POST" }); me = null; return { error: null }; },
      async resetPasswordForEmail(email) {
        const { ok, d } = await j("/api/auth?a=forgot", { method: "POST", body: JSON.stringify({ email }) });
        return ok ? { data: {}, error: null } : { error: { message: d.error || "Error" } };
      },
      async updateUser({ password }) {
        const { ok, d } = RESET
          ? await j("/api/auth?a=reset", { method: "POST", body: JSON.stringify({ token: RESET, password }) })
          : await j("/api/auth?a=password", { method: "POST", body: JSON.stringify({ password }) });
        if (!ok) return { error: { message: d.error || "Error" } };
        await loadMe(); return { data: { user: me }, error: null };
      },
    },
    storage: {
      from: () => ({
        async upload(path, blob, opt = {}) {
          const r = await fetch("/api/admin?a=upload", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/octet-stream", "X-Content-Type": opt.contentType || blob.type || "image/jpeg" }, body: blob });
          let d = {}; try { d = await r.json(); } catch (e) {}
          if (!r.ok) return { error: { message: d.error || "No se pudo subir la foto" } };
          urls[path] = d.url; return { data: { path }, error: null };
        },
        getPublicUrl: (path) => ({ data: { publicUrl: urls[path] } }),
      }),
    },
    resetToken: RESET,
  };
})();
