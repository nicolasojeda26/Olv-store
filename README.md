# Tienda online · Isabella Importados

Tienda con catálogo, stock por talle, pago con **Mercado Pago** (tarjeta, cuotas y dinero en cuenta), pedidos por WhatsApp para transferencia o efectivo y un panel para la dueña.

| Parte | Qué es |
| --- | --- |
| `index.html` | La tienda (lo que ven las clientas) |
| `admin.html` | Panel de Isabella: pedidos, productos con fotos y stock, conexión con Mercado Pago |
| `api/` | Funciones del servidor en Vercel (pago, aviso de Mercado Pago, conexión) |
| `lib/shared.js` | Código compartido de las funciones |
| `supabase/schema.sql` | Base de datos: se ejecuta una sola vez en Supabase |

Cómo funciona un pago: la clienta arma el pedido → el servidor revisa precios y stock reales → Mercado Pago cobra → Mercado Pago avisa a `/api/mp-webhook` → el servidor confirma el pago consultando a Mercado Pago, marca el pedido como pagado y descuenta el stock. La plata va directo a la cuenta de Isabella.

---

## Instalación (una sola vez, ~30 minutos)

### 1. Base de datos en Supabase (gratis)

1. Entrá a [supabase.com](https://supabase.com) → **New project**. Nombre: `isabella-tienda`. Región: **South America (São Paulo)**. Guardá la contraseña de la base en un lugar seguro.
2. Andá a **SQL Editor → New query**, pegá todo el contenido de `supabase/schema.sql` y tocá **Run**. Crea las tablas, los permisos, la carpeta de fotos y 12 productos de ejemplo.
3. **Authentication → Sign In / Providers → Email**: desactivá **Allow new users to sign up** (así nadie más puede crearse una cuenta).
4. **Authentication → URL Configuration**: Site URL `https://isabella-importados.vercel.app/admin.html` y en Redirect URLs `https://isabella-importados.vercel.app/**`.
5. **Authentication → Users → Add user → Send invitation**: el email de Isabella. Le llega un mail, entra y elige su contraseña en el panel.
6. **Project Settings → API**: copiá **Project URL**, la clave **anon public** y la clave **service_role** (esta última es secreta: va solo en Vercel).

### 2. Aplicación en Mercado Pago (la creás vos, sirve para todos tus clientes)

1. Entrá a [mercadopago.com.ar/developers/panel](https://www.mercadopago.com.ar/developers/panel) con **tu** cuenta → **Crear aplicación**. Tipo: pagos online, producto **Checkout Pro**.
2. En la aplicación → **Editar** → **URL de redireccionamiento**:
   `https://isabella-importados.vercel.app/api/mp-callback`
   (si después usan dominio propio, cambiala por `https://SU-DOMINIO/api/mp-callback`).
3. En **Credenciales de producción** copiá el **Client ID** y el **Client Secret**.

### 3. Variables de entorno en Vercel

Proyecto `isabella-importados` → **Settings → Environment Variables**. Cargá estas (para Production y Preview):

| Variable | Valor |
| --- | --- |
| `SUPABASE_URL` | Project URL de Supabase |
| `SUPABASE_ANON_KEY` | clave anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | clave service_role (secreta) |
| `MP_CLIENT_ID` | Client ID de tu aplicación de Mercado Pago |
| `MP_CLIENT_SECRET` | Client Secret (secreto) |
| `ADMIN_EMAILS` | opcional: email de Isabella. Si está vacío, entra cualquier usuaria creada en Supabase |
| `SITE_URL` | `https://isabella-importados.vercel.app` |
| `WHATSAPP_NUMBER` | `5493794717236` |
| `MP_SANDBOX` | `true` mientras prueban, `false` para cobrar de verdad |

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
2. En el panel → **Mercado Pago → Desconectar**, y que **Isabella** toque **Conectar** con su propia cuenta.
3. Borrá los productos de ejemplo y cargá los reales desde **Productos → Nuevo producto**.

## Uso diario (para Isabella)

- **Pedidos**: los pagados por Mercado Pago aparecen solos como *Pagado*. Los de transferencia o efectivo quedan *Pendiente*: cuando cobra, toca **Marcar pagado** y se descuenta el stock. Después, **Marcar entregado**.
- **Productos**: nombre, precio, precio anterior (muestra la oferta), foto, stock único o por talle y si se ve en la tienda.
- **Contraseña olvidada**: se cambia en Supabase → Authentication → Users.

## Notas

- La conexión con Mercado Pago dura 6 meses y se renueva sola cuando hay ventas.
- El plan gratis (Hobby) de Vercel es para uso no comercial. Para una tienda que vende, Vercel pide el plan Pro.
