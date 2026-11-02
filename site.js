const ROOT = document.body.dataset.root || "";
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fechaLarga = a => new Date(a.fecha + "T12:00").toLocaleDateString("es-MX", { dateStyle: "long" });
const lectura = a => Math.max(1, Math.round(a.cuerpo.map(b => typeof b === "string" ? b : b.h || b.lista.join(" ")).join(" ").split(/\s+/).length / 200));

const LINKS = [["Inicio","index.html"],["Catálogo","catalogo/"],["Revista","revista/"],["Consultoría I+D","index.html#consultoria"],["Cotización","index.html#contacto","cta"]];
const activo = h => (h === "catalogo/" || h === "revista/") && location.pathname.includes("/" + h);

document.querySelector("header").innerHTML = `<div class="wrap">
  <a class="brand" href="${ROOT}index.html"><img src="${ROOT}arm.svg" alt="Armadillo Tacticals Logo"><div><b>Armadillo Tacticals</b><span>Ingeniería Táctica Artesanal</span></div></a>
  <nav>${LINKS.map(([t,h,c]) => `<a href="${ROOT + h}"${c ? ` class="${c}"` : ""}${activo(h) ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav></div>`;
document.querySelector("footer").innerHTML = `<div class="brand"><img src="${ROOT}arm.svg" alt="Logo"><span class="muted">ARMADILLO TACTICALS</span></div>
  <p style="margin-inline:auto">&copy; 2026 Armadillo Tacticals. Ingeniería Táctica Artesanal. Todos los derechos reservados.</p>`;

// Cierre de diálogos: clic en el fondo o en cualquier [data-close] (sirve también para diálogos creados después)
document.addEventListener("click", e => {
  const d = e.target.closest("dialog");
  if (!d) return;
  const r = d.getBoundingClientRect();
  const fuera = e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom);
  if (fuera || e.target.closest("[data-close]")) d.close();
});

// Productos (los usan el inicio y el catálogo)
const precio = p => p.precio ? "$" + p.precio.toLocaleString("es-MX") + " MXN" : "Cotización a medida";
const tarjeta = p => `
  <div class="cell"><article class="card product">
    <div class="ph">${p.imagen ? `<img src="${ROOT}${esc(p.imagen)}" alt="${esc(p.nombre)}">` : `[ PROTOTIPO ${esc(p.codigo)} ]`}</div>
    <div class="body">
      <div class="stack"><h3>${esc(p.nombre)}</h3><p class="teal small">${esc(p.materiales)}</p><p class="muted small">${esc(p.resumen)}</p><p class="gold small">${precio(p)}</p></div>
      <button class="btn" type="button" data-id="${esc(p.id)}">Ver detalles</button>
    </div></article></div>`;
const detalle = p => {
  if (!$("detalle")) document.body.insertAdjacentHTML("beforeend", `<dialog id="detalle"><div class="stack">
    <h3></h3><p class="teal small"></p><p class="muted"></p><p class="muted"></p><p class="gold small"></p>
    <a class="btn" data-close href="${ROOT}index.html#contacto">Solicitar cotización</a>
    <button class="btn" type="button" data-close>Cerrar</button></div></dialog>`);
  const d = $("detalle");
  [p.nombre, "Materiales: " + p.materiales_detalle, p.resumen, p.uso, precio(p)].forEach((t, i) => d.querySelectorAll("p, h3")[i].textContent = t);
  d.showModal();
};
const productos = (el, data) => {
  el.innerHTML = data.map(tarjeta).join("");
  el.onclick = e => { const b = e.target.closest("[data-id]"); if (b) detalle(data.find(p => p.id === b.dataset.id)); };
};

const cuerpoHTML = a => a.cuerpo.map(b => typeof b === "string" ? `<p>${esc(b)}</p>` : b.h ? `<h2>${esc(b.h)}</h2>` : `<ul>${b.lista.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`).join("");
