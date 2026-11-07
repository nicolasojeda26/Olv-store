# Tienda online · SOS Cosméticos

Tienda con catálogo, stock por talle, pago con **Mercado Pago** (tarjeta, cuotas y dinero en cuenta), pedidos por WhatsApp para transferencia o efectivo y un panel para la dueña.

| Parte | Qué es |
| --- | --- |
| `index.html` | La tienda (lo que ven las clientas) |
| `admin.html`, `admin-*.js` | Panel de la dueña: pedidos, productos, categorías, promociones, textos de la página, Mercado Pago |
| `arrepentimiento.html`, `cambios.html` | Botón de arrepentimiento y política de cambios |
| `api/producto.js`, `vercel.json` | Link propio de cada producto (`/p/12-nombre`) con foto y precio al compartir |
| `api/` | Funciones del servidor en Vercel (pago, aviso de Mercado Pago, conexión, arrepentimiento) |
| `lib/notify.js` | Avisos por email (Resend) |
| `lib/shared.js`, `lib/db.js`, `lib/auth.js` | Código compartido: base de datos (Neon) y login del panel |
| `neon/schema.sql` | Estructura de la base de datos (Neon / Postgres) |
| `supabase/` | Historial: la tienda usó Supabase hasta noviembre de 2026 |

Cómo funciona un pago: la clienta arma el pedido → el servidor revisa precios y stock reales → Mercado Pago cobra → Mercado Pago avisa a `/api/mp-webhook` → el servidor confirma el pago consultando a Mercado Pago, marca el pedido como pagado y descuenta el stock. La plata va directo a la cuenta de Isabella.

---

## Instalación (una sola vez, ~30 minutos)

### 1. Base de datos (Neon) y fotos (Vercel Blob)

1. En Vercel → proyecto → **Storage → Create Database → Neon** (plan gratis). Conectala al proyecto con el prefijo `DATABASE`: crea la variable `DATABASE_URL`.
2. En **Storage → Create Database → Blob**, acceso **Public**, tildando "Add a read-write token": crea `BLOB_READ_WRITE_TOKEN`.
3. Creá las tablas: en la consola de Neon → **SQL Editor**, pegá `neon/schema.sql` y ejecutalo (se puede correr varias veces).
4. Primera usuaria del panel: en el SQL Editor de Neon, `insert into admins (email) values ('su-email@gmail.com');` y después, en el panel, **Olvidé mi contraseña** con ese email para elegir la contraseña (necesita Resend, paso 3).

### 2. Aplicación en Mercado Pago (la creás vos, sirve para todos tus clientes)

1. Entrá a [mercadopago.com.ar/developers/panel](https://www.mercadopago.com.ar/developers/panel) con **tu** cuenta → **Crear aplicación**. Tipo: pagos online, producto **Checkout Pro**.
2. En la aplicación → **Editar** → **URL de redireccionamiento**:
   `https://soscosmeticos.vercel.app/api/mp-callback`
   (si después usan dominio propio, cambiala por `https://SU-DOMINIO/api/mp-callback`).
3. En **Credenciales de producción** copiá el **Client ID** y el **Client Secret**.

### 3. Variables de entorno en Vercel

Proyecto `isabella-importados` → **Settings → Environment Variables**. Cargá estas (para Production y Preview):

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | la crea sola la integración de Neon |
| `BLOB_READ_WRITE_TOKEN` | la crea sola Vercel Blob |
| `MP_CLIENT_ID` | Client ID de tu aplicación de Mercado Pago |
| `MP_CLIENT_SECRET` | Client Secret (secreto) |
| `PUBLIC_SITE_URL` | opcional: dirección pública si cambia (por defecto `https://soscosmeticos.vercel.app`) |
| `WHATSAPP_NUMBER` | `5493794717236` |
| `MP_SANDBOX` | `true` mientras prueban, `false` para cobrar de verdad |
| `RESEND_API_KEY` | clave de [Resend](https://resend.com) para los correos (avisos de ventas y "Olvidé mi contraseña") (secreta) |
| `NOTIFY_EMAIL` | a quién avisar de ventas nuevas y arrepentimientos (se pueden poner varios separados por coma) |
| `MAIL_FROM` | opcional: remitente, ej. `SOS Cosméticos <avisos@su-dominio.com>`. Sin dominio propio, Resend solo deja mandar al email de la cuenta de Resend |

Después: **Deployments → ⋯ → Redeploy** para que tome las variables.

### 4. Subir el código

Reemplazá el contenido del repo por los archivos de esta carpeta (mantené la estructura de carpetas). Vercel publica solo.

---

## Probar antes de cobrar de verdad

1. En Mercado Pago Developers → tu aplicación → **Cuentas de prueba**: creá un **vendedor** y un **comprador** de prueba.
2. Con `MP_SANDBOX=true`, entrá a `/admin.html` → **Mercado Pago → Conectar** y autorizá con el **vendedor de prueba** (abrilo en una ventana de incógnito).
3. En la tienda, comprá algo eligiendo Mercado Pago y pagá con el **comprador de prueba** y una [tarjeta de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-cards) (titular `APRO` = aprobado).
4. Revisá en el panel: el pedido aparece **Pagado** y el stock bajó.

## Pasar a producción

1. En Vercel cambiá `MP_SANDBOX` a `false` y hacé **Redeploy**.
2. En el panel → **Mercado Pago → Desconectar**, y que **la dueña** toque **Conectar** con su propia cuenta.
3. Borrá los productos de ejemplo y cargá los reales desde **Productos → Nuevo producto**.

## Legales (Argentina)

- **Botón de arrepentimiento** (Res. 424/2020): en el pie de todas las páginas, lleva a `/arrepentimiento.html`. Sin registro; da un código de trámite al instante y lo manda por email. Los pedidos aparecen en el panel → **Arrepentimientos**.
- **Defensa de las y los Consumidores** (Res. 274/2021): link al formulario de la Ventanilla Única Federal en el pie.
- **Cambios y devoluciones**: `/cambios.html`. Confirmar con la dueña el plazo de cambio (puesto en 30 días).

## Uso diario (para la dueña)

- **Pedidos**: los pagados por Mercado Pago aparecen solos como *Pagado*. Los de transferencia o efectivo quedan *Pendiente*: cuando cobra, toca **Marcar pagado** y se descuenta el stock. Después, **Marcar entregado**.
- **Productos**: nombre, precio, precio anterior (muestra la oferta), foto, stock único o por talle y si se ve en la tienda.
- **Contraseña**: botón **Contraseña** arriba en el panel, o **Olvidé mi contraseña** en la entrada: llega un correo con un enlace (sirve 1 hora, una sola vez).
- **Usuarias del panel**: están en la tabla `admins` de Neon (contraseñas cifradas). Para agregar una: `insert into admins (email) values (...)` y que use **Olvidé mi contraseña**.

## Notas

- La conexión con Mercado Pago dura 6 meses y se renueva sola cuando hay ventas.
- El plan gratis (Hobby) de Vercel es para uso no comercial. Para una tienda que vende, Vercel pide el plan Pro.
