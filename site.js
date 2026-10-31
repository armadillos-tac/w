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

document.querySelectorAll("dialog").forEach(d => d.addEventListener("click", e => {
  const r = d.getBoundingClientRect();
  const fuera = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  if (fuera || e.target.hasAttribute("data-close")) d.close();
}));
