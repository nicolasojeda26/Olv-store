/* Guías "¿Cómo se usa?" de cada sección del panel. Escritas para alguien que nunca usó un panel.
   Cada guía arranca abierta; si la dueña toca "Entendido", queda cerrada (se recuerda en este navegador). */
const GUIDES = {
  orders: {
    steps: [
      "Cada vez que alguien compra en la tienda, aparece acá una <b>tarjeta</b> con su nombre, lo que llevó y cuánto pagó.",
      "La etiqueta de color te dice cómo va: <span class='chip warn'>Pendiente</span> todavía no pagó, <span class='chip ok'>Pagado</span> ya pagó, <span class='chip mp'>Entregado</span> ya se lo llevó.",
      "Si pagó con <b>Mercado Pago</b>, se marca como pagado solo. Si pagó con <b>transferencia o efectivo</b>, cuando veas la plata tocá <b>Marcar pagado</b>.",
      "Cuando le entregues el pedido o lo despaches, tocá <b>Marcar entregado</b>.",
      "Para hablar con la clienta, tocá su número de <b>WhatsApp</b> y se abre el chat.",
    ],
    tip: "El número rosa sobre el botón <b>Pedidos</b> te dice cuántos pedidos están esperando. Tocá <b>Actualizar</b> para ver si entraron nuevos.",
  },
  products: {
    steps: [
      "Para <b>agregar</b> un producto, tocá el botón rosa <b>Nuevo producto</b>.",
      "Escribí el nombre, elegí la categoría, poné el precio y subí una foto (con el celular podés sacarla en el momento).",
      "En <b>Stock</b> poné cuántas unidades tenés. Tocá <b>Guardar</b> y listo: ya aparece en la tienda.",
      "Para <b>cambiar</b> el precio, la foto o el stock de uno que ya está, tocá <b>Editar</b> al lado del producto.",
      "Usá el buscador de arriba para encontrar un producto escribiendo parte del nombre.",
    ],
    tip: "Si se te terminó un producto, no lo borres: poné el stock en <b>0</b> y en la tienda dice “Agotado”. Si querés esconderlo un tiempo, entrá a Editar y destildá <b>Visible en la tienda</b>.",
  },
  cats: {
    steps: [
      "Las categorías son los <b>grupos</b> en los que se ordena la tienda (Maquillaje, Skincare, Pestañas…). Cada producto pertenece a una.",
      "Para crear una, tocá <b>Nueva categoría</b>, escribí el nombre, subí una foto si querés y tocá <b>Guardar</b>.",
      "Con las <b>flechitas ↑ ↓</b> cambiás el orden en que aparecen en la tienda.",
      "En <b>Editar</b> podés tildar <b>Mostrar en el menú de arriba</b> para que aparezca en la barra de arriba de la tienda (hasta 6).",
    ],
    tip: "Si le cambiás el nombre a una categoría, sus productos se pasan solos al nombre nuevo. Solo se puede borrar una categoría que no tenga productos; si no, destildá <b>Visible</b> para esconderla.",
  },
  promos: {
    steps: [
      "Una <b>promoción</b> baja el precio sola, sin que la clienta tenga que hacer nada. Tocá <b>Nueva promoción</b>.",
      "Ponele un nombre que se entienda, por ejemplo <b>Semana del Maquillaje</b>. Ese nombre lo ven las clientas.",
      "Elegí a qué se aplica: a <b>toda la tienda</b>, a <b>una categoría</b>, a <b>un producto</b>, o <b>por cantidad</b> (por ejemplo, llevando 3 o más).",
      "Escribí el <b>porcentaje</b> de descuento. Si querés, elegí <b>desde</b> y <b>hasta</b> qué día: al terminar, se apaga sola.",
      "Tocá <b>Guardar</b>. En la tienda se ve el precio viejo tachado y el precio nuevo.",
    ],
    tip: "<b>Pausar</b> apaga la promo sin borrarla, así la podés volver a <b>Activar</b> otro día con un solo toque.",
  },
  coupons: {
    steps: [
      "Un <b>cupón</b> es una palabra clave, por ejemplo <b>BIENVENIDA</b>. Se lo pasás a tus clientas por Instagram o WhatsApp.",
      "La clienta lo escribe en el carrito y le baja el precio. Sin la palabra, no hay descuento.",
      "Tocá <b>Nuevo cupón</b>, inventá la palabra, poné el porcentaje y tocá <b>Guardar</b>.",
      "Si querés, podés poner una <b>compra mínima</b> (por ejemplo, desde $20.000) o un <b>límite de usos</b> (por ejemplo, las primeras 10 clientas).",
    ],
    tip: "En cada cupón ves cuántas veces lo usaron. Así sabés si la publicación de Instagram funcionó.",
  },
  page: {
    steps: [
      "Acá cambiás los <b>textos y fotos</b> que se ven en la tienda. Cada recuadro es una parte de la página: tocá su título para abrirlo o cerrarlo.",
      "Borrá el texto que querés cambiar y escribí el nuevo, como en un mensaje de WhatsApp.",
      "Cuando termines, tocá el botón rosa <b>Guardar cambios</b> (está siempre abajo de todo).",
      "Tocá <b>Ver tienda</b> para mirar cómo quedó.",
    ],
    tip: "Si algo no te gustó, el botón <b>Volver a los textos originales</b> deja todo como al principio (después tocá Guardar cambios).",
  },
  arr: {
    steps: [
      "Por ley, quien compra online puede <b>arrepentirse</b> y devolver el producto dentro de los 10 días. Si alguna clienta lo pide desde la tienda, aparece acá y te llega un mail.",
      "Tocá su número de <b>WhatsApp</b>, escribile para coordinar la devolución y después tocá <b>Ya la contacté</b>.",
      "Cuando le devuelvas la plata (por el mismo medio con el que pagó), tocá <b>Marcar resuelto</b>.",
    ],
    tip: "El número rosa sobre el botón <b>Devoluciones</b> te avisa si hay pedidos nuevos sin atender.",
  },
  mp: {
    steps: [
      "Esto se hace <b>una sola vez</b>. Tocá el botón celeste <b>Conectar con Mercado Pago</b>.",
      "Se abre la página de Mercado Pago: entrá con tu usuario y contraseña de siempre y tocá <b>Autorizar</b>.",
      "Volvés sola a esta pantalla y vas a ver un <b>punto verde</b> con el texto <b>Cuenta conectada</b>. ¡Listo!",
    ],
    tip: "La plata de las ventas va directo a tu cuenta de Mercado Pago. Tu contraseña no la ve nadie: ni la tienda ni quien la armó.",
  },
  cfg: {
    steps: [
      "Cambiá el número que quieras. Al lado de cada casillero te explicamos qué hace.",
      "Tocá el botón rosa <b>Guardar ajustes</b>.",
      "Abrí <b>Ver tienda</b> (arriba a la derecha) para ver el cambio.",
    ],
    tip: "Si no estás segura de algo, dejalo como está. Nada de esto borra productos ni pedidos.",
  },
};

const guideKey = (k) => "sos-guia-" + k;
const guideClosed = (k) => { try { return localStorage.getItem(guideKey(k)) === "cerrada"; } catch (e) { return false; } };
const guideSave = (k, closed) => { try { closed ? localStorage.setItem(guideKey(k), "cerrada") : localStorage.removeItem(guideKey(k)); } catch (e) {} };

function renderGuides() {
  document.querySelectorAll("[data-guide]").forEach((slot) => {
    const k = slot.dataset.guide, g = GUIDES[k]; if (!g) return;
    const title = k === "coupons" ? "¿Cómo funcionan los cupones?" : "¿Cómo se usa esta sección?";
    slot.outerHTML = `<details class="guide" data-g="${k}" ${guideClosed(k) ? "" : "open"}>
      <summary><i data-lucide="circle-help"></i><span class="gt">${title}</span><span class="gx" data-gx></span></summary>
      <div class="gb"><ol class="steps">${g.steps.map((s) => `<li><span>${s}</span></li>`).join("")}</ol>
        ${g.tip ? `<p class="tip"><i data-lucide="lightbulb"></i><span>${g.tip}</span></p>` : ""}
        <button type="button" class="btn b-line b-sm gok" data-gok="${k}"><i data-lucide="check"></i>Entendido, ocultar la ayuda</button></div>
    </details>`;
  });
  document.querySelectorAll(".guide").forEach(syncGuideLabel);
  try { lucide.createIcons(); } catch (e) {}
}
function syncGuideLabel(d) { const x = d.querySelector("[data-gx]"); if (x) x.textContent = d.open ? "Ocultar" : "Ver ayuda"; }
document.addEventListener("toggle", (e) => { if (e.target.classList && e.target.classList.contains("guide")) { syncGuideLabel(e.target); guideSave(e.target.dataset.g, !e.target.open); } }, true);
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-gok]"); if (!b) return;
  const d = b.closest(".guide"); d.open = false; d.scrollIntoView({ block: "nearest" });
});
window.addEventListener("DOMContentLoaded", renderGuides);
