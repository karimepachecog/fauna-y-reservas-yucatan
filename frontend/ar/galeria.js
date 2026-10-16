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
const ficha = document.getElementById("ficha");
const menu = document.getElementById("especies");
let actual = null;

function mostrar(especie) {
  actual = especie;
  visor.setAttribute("src", especie.modelo);
  visor.alt = `Modelo tridimensional ilustrativo de ${especie.nombre}`;
  ficha.innerHTML = `
    <p class="ceja">${especie.cientifico}</p>
    <h2>${especie.nombre}</h2>
    <p><span class="estado-riesgo ${especie.clase}">${especie.riesgo}</span></p>
    <p>${especie.lugar}</p>
    <p class="nota">${especie.nota}</p>
    <p class="nota">Modelo: ${especie.credito} Estatus: NOM-059-SEMARNAT-2010.</p>
  `;
  menu.querySelectorAll("button").forEach((boton) => {
    boton.setAttribute("aria-pressed", boton.dataset.id === especie.id ? "true" : "false");
  });
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
