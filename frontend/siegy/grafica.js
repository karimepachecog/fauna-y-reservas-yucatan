const PRESENTACION = {
  acuifero: { nombre: "Acuífero", titulo: "Acuífero de la península", unidad: "kilómetros cuadrados", color: ["#145e68", "#1c6848"] },
  cenotes: { nombre: "Cenotes", titulo: "Cenotes de Yucatán", unidad: "cenotes registrados en el estado", color: ["#145e68"] },
};
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function fechaLarga(iso) {
  const [anio, mes, dia] = iso.split("-");
  return `${Number(dia)} de ${MESES[Number(mes) - 1]} de ${anio}`;
}

function indicadoresDesde(filas) {
  const grupos = new Map();
  for (const fila of filas) {
    if (!grupos.has(fila.indicador)) grupos.set(fila.indicador, []);
    grupos.get(fila.indicador).push(fila);
  }
  return [...grupos.entries()].map(([id, grupo]) => {
    const presentacion = PRESENTACION[id];
    return {
      id,
      nombre: presentacion.nombre,
      titulo: presentacion.titulo,
      unidad: presentacion.unidad,
      filas: grupo.map((fila, indice) => ({
        nombre: fila.concepto,
        valor: Number(fila.valor),
        etiqueta: fila.etiqueta,
        color: presentacion.color[indice] || presentacion.color[0],
      })),
      definicion: definicionDe(id, grupo),
    };
  });
}

function definicionDe(id, grupo) {
  if (id === "acuifero") {
    const acuifero = grupo.find((fila) => fila.concepto === "Acuífero");
    const anillo = grupo.find((fila) => fila.concepto === "Anillo de Cenotes");
    return `El boletín lo describe como el acuífero más grande de México: ${acuifero.etiqueta} ${acuifero.unidad} bajo la península. La reserva estatal geohidrológica Anillo de Cenotes ocupa ${anillo.etiqueta} ${anillo.unidad} de ese sistema.`;
  }
  const cenotes = grupo[0];
  return `El boletín registra ${cenotes.etiqueta.toLowerCase()} cenotes en Yucatán. El Anillo de Cenotes protege el anillo geohidrológico de ese sistema.`;
}

const svg = document.getElementById("grafica");
let activo = null;

function dibujar(indicador) {
  activo = indicador;
  const max = Math.max(...indicador.filas.map((fila) => fila.valor));
  const tope = max * 1.22;
  const x = (valor) => 168 + (valor / tope) * 360;
  const filas = indicador.filas.map((fila, indice) => ({ ...fila, y: 108 + indice * 62 }));
  svg.innerHTML = `
    <text x="20" y="36" font-family="Georgia, serif" font-size="22" fill="#17241e">${indicador.titulo}</text>
    <text x="20" y="58" font-family="sans-serif" font-size="14" fill="#42564c">${indicador.unidad}</text>
    <line x1="168" y1="210" x2="560" y2="210" stroke="#ddd3c3" />
    ${filas.map((fila) => `
      <text x="8" y="${fila.y + 5}" font-family="sans-serif" font-size="15" fill="#17241e">${fila.nombre}</text>
      <line x1="168" y1="${fila.y}" x2="${Math.max(x(fila.valor), 176)}" y2="${fila.y}" stroke="${fila.color}" stroke-width="8" stroke-linecap="round" />
      <circle cx="${Math.max(x(fila.valor), 176)}" cy="${fila.y}" r="8" fill="${fila.color}" />
      <text x="${Math.max(x(fila.valor), 176) + 14}" y="${fila.y + 5}" font-family="sans-serif" font-size="16" font-weight="700" fill="${fila.color}">${fila.etiqueta}</text>
    `).join("")}
  `;
  document.getElementById("detalle").innerHTML = `<p>${indicador.definicion}</p><p class="nota">Fuente: SIEGY, Boletín 3 de 2026. Acuífero: CONAGUA, 2020. Cenotes y hectáreas de la reserva: Secretaría de Desarrollo Sustentable.</p>`;
  document.querySelectorAll("#indicadores button").forEach((boton) => {
    boton.setAttribute("aria-pressed", boton.dataset.id === indicador.id ? "true" : "false");
  });
}

function pintarReservas(reservas) {
  const maxHa = Math.max(...reservas.map((reserva) => Number(reserva.hectareas)));
  const contenedor = document.getElementById("reservas");
  for (const zona of ["Costa", "Interior"]) {
    const bloque = document.createElement("div");
    bloque.className = "grupo";
    bloque.innerHTML = `<h3>${zona}</h3>`;
    for (const reserva of reservas.filter((item) => item.zona === zona)) {
      const hectareas = Number(reserva.hectareas);
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "barra-reserva";
      boton.innerHTML = `<span>${reserva.nombre}</span><span class="pista"><i class="relleno ${zona === "Costa" ? "costa" : ""}" style="width:${(hectareas / maxHa) * 100}%"></i></span><span class="ha">${Math.round(hectareas).toLocaleString("es-MX")}</span>`;
      boton.addEventListener("click", () => {
        document.getElementById("reserva-detalle").textContent = `${reserva.nombre} es ${reserva.categoria.toLowerCase()}, con ${hectareas.toLocaleString("es-MX")} ha. Decreto del ${fechaLarga(reserva.fecha_decreto)}.`;
      });
      bloque.appendChild(boton);
    }
    contenedor.appendChild(bloque);
  }
}

async function iniciar() {
  const [agua, reservas] = await Promise.all([
    fetch("/api/acuifero-cenotes/").then((respuesta) => respuesta.json()),
    fetch("/api/reservas/").then((respuesta) => respuesta.json()),
  ]);
  const indicadores = indicadoresDesde(agua);
  const menu = document.getElementById("indicadores");
  for (const indicador of indicadores) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "secundario";
    boton.dataset.id = indicador.id;
    boton.textContent = indicador.nombre;
    boton.addEventListener("click", () => dibujar(indicador));
    menu.appendChild(boton);
  }
  dibujar(indicadores[0]);
  pintarReservas(reservas);
}

iniciar();

async function exportar(formato) {
  const blob = await htmlToImage.toBlob(document.getElementById("lamina"), {
    backgroundColor: "#fffdf8",
    pixelRatio: 2,
  });
  const bitmap = await createImageBitmap(blob);
  const lienzo = lienzoConPie(
    bitmap,
    bitmap.width,
    bitmap.height,
    "Yucatán, al lado de sus reservas",
    "SIEGY, Boletín 3 de 2026 · SDS Yucatán, SANPY"
  );
  descargarLienzo(lienzo, "yucatan-al-lado-de-sus-reservas", formato);
}

document.getElementById("btn-png").addEventListener("click", () => exportar("png"));
document.getElementById("btn-jpg").addEventListener("click", () => exportar("jpg"));
