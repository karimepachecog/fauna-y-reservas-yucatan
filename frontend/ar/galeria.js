const HABITATS = {
  "esp-01": "selva",
  "esp-02": "laguna",
  "esp-03": "mar",
  "esp-04": "bahia",
};

function especieDe(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    cientifico: fila.nombre_cientifico,
    modelo: `modelos/${fila.archivo_modelo}`,
    riesgo: fila.categoria_nom059,
    clase: fila.categoria_nom059 === "Amenazada" ? "amenazada" : "",
    lugar: fila.lugares,
    nota: "Modelo ilustrativo de baja poligonía, no un escaneo científico de un ejemplar de la península.",
    credito: `${fila.credito}. Licencia ${fila.licencia}.`,
  };
}

const visor = document.getElementById("visor");
const marco = document.getElementById("marco-visor");
const ficha = document.getElementById("ficha");
const menu = document.getElementById("especies");
let actual = null;
let cambiando = false;

function esperar(ms) {
  return new Promise((resolver) => window.setTimeout(resolver, ms));
}

async function mostrar(especie) {
  if (cambiando) return;
  cambiando = true;
  const reducido = window.vida?.reducido;
  if (actual && !reducido) {
    visor.style.opacity = "0";
    await esperar(280);
  }
  actual = especie;
  visor.setAttribute("src", especie.modelo);
  visor.alt = `Modelo tridimensional ilustrativo de ${especie.nombre}`;
  marco.dataset.habitat = HABITATS[especie.id] || "selva";
  const nivel = especie.clase === "amenazada" ? 58 : 88;
  ficha.innerHTML = `
    <p class="ceja">${especie.cientifico}</p>
    <h2>${especie.nombre}</h2>
    <div class="medidor">
      <div class="medidor-pista" aria-hidden="true"><i class="medidor-relleno ${especie.clase}"></i></div>
      <p><span class="estado-riesgo ${especie.clase}">${especie.riesgo}</span></p>
    </div>
    <button type="button" class="coleccion" aria-pressed="false">
      <span class="coleccion-inner">
        <span class="frente">
          <strong>Dónde vive</strong>
          <p>${especie.lugar}</p>
          <p class="nota">Toca para voltear la ficha</p>
        </span>
        <span class="reverso">
          <strong>La ficha</strong>
          <p>${especie.nota}</p>
          <p class="nota">Modelo: ${especie.credito} Estatus: NOM-059-SEMARNAT-2010.</p>
        </span>
      </span>
    </button>
  `;
  const barra = ficha.querySelector(".medidor-relleno");
  requestAnimationFrame(() => {
    barra.style.width = `${nivel}%`;
  });
  ficha.querySelector(".coleccion").addEventListener("click", (evento) => {
    const boton = evento.currentTarget;
    const vuelta = boton.classList.toggle("volteada");
    boton.setAttribute("aria-pressed", vuelta ? "true" : "false");
  });
  menu.querySelectorAll("button").forEach((boton) => {
    boton.setAttribute("aria-pressed", boton.dataset.id === especie.id ? "true" : "false");
  });
  visor.style.opacity = "1";
  if (!reducido) {
    visor.setAttribute("camera-orbit", "40deg 80deg 140%");
    await esperar(40);
    visor.setAttribute("camera-orbit", "0deg 75deg 105%");
  }
  cambiando = false;
}

async function iniciar() {
  const filas = await fetch("/api/especies/").then((respuesta) => respuesta.json());
  const especies = filas.map(especieDe);
  for (const especie of especies) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "secundario";
    boton.dataset.id = especie.id;
    boton.textContent = especie.nombre;
    boton.addEventListener("click", () => mostrar(especie));
    menu.appendChild(boton);
  }
  mostrar(especies[0]);
}

iniciar();

async function exportar(formato) {
  const blob = await visor.toBlob({ mimeType: "image/png" });
  const bitmap = await createImageBitmap(blob);
  const lienzo = lienzoConPie(
    bitmap,
    bitmap.width,
    bitmap.height,
    `${actual.nombre} · ${actual.riesgo}`,
    "NOM-059-SEMARNAT-2010 · modelo ilustrativo, ver créditos en la ficha"
  );
  descargarLienzo(lienzo, actual.id, formato);
}

document.getElementById("btn-png").addEventListener("click", () => exportar("png"));
document.getElementById("btn-jpg").addEventListener("click", () => exportar("jpg"));
