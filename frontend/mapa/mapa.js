const NOMBRES = {
  RB: "Reserva de la biosfera",
  PN: "Parque nacional",
  APFF: "Área de protección de flora y fauna",
  SANT: "Santuario",
};

const CAPAS = [
  { id: "manglar", titulo: "Cambio de manglar, 2020-2025", archivo: "/api/manglar/", activo: true },
  { id: "prioritarios-terrestres", titulo: "Sitios prioritarios terrestres", archivo: "/api/sitios-terrestres/", activo: false },
  { id: "aicas", titulo: "Áreas para la conservación de las aves", archivo: "/api/aicas/", activo: false },
  { id: "prioritarios-marinos", titulo: "Sitios prioritarios marinos", archivo: "/api/sitios-marinos/", activo: false },
  { id: "anp-otras", titulo: "ANP estatales, municipales y otras", archivo: "/api/anp-otras/", activo: true },
  { id: "anp-federales", titulo: "ANP federales, julio 2025", archivo: "/api/anp-federales/", activo: true },
];

const mapa = new maplibregl.Map({
  container: "mapa",
  style: "https://tiles.openfreemap.org/styles/positron",
  center: [-89.6, 19.6],
  zoom: 6.2,
  preserveDrawingBuffer: true,
  attributionControl: true,
});
mapa.addControl(new maplibregl.NavigationControl(), "top-right");

const estadoSelect = document.getElementById("estado");
const categoriaSelect = document.getElementById("categoria");
const busquedaInput = document.getElementById("busqueda");
let resumen = null;

function texto(valor) {
  return String(valor ?? "").toLowerCase();
}

function filtroDe(id) {
  const partes = ["all"];
  const estado = estadoSelect.value;
  const busca = busquedaInput.value.trim().toLowerCase();
  if (estado !== "todas" && id !== "manglar") {
    const campo = id === "municipios" || id === "estados" ? "estado" : "estados_filtro";
    if (campo === "estado") partes.push(["==", ["get", "estado"], estado]);
    else partes.push([">=", ["index-of", estado, ["coalesce", ["get", "estados_filtro"], ""]], 0]);
  }
  if (id === "anp-federales" && categoriaSelect.value !== "todas") {
    partes.push(["==", ["get", "cat_manejo"], categoriaSelect.value]);
  }
  if (busca && id !== "manglar" && id !== "municipios" && id !== "estados") {
    const campo = id === "prioritarios-terrestres" ? "prioridad" : "nombre";
    partes.push([">=", ["index-of", busca, ["downcase", ["coalesce", ["get", campo], ""]]], 0]);
  }
  return partes.length === 1 ? null : partes;
}

function aplicarFiltros() {
  for (const capa of ["municipios", "municipios-linea", "estados", ...CAPAS.map((c) => c.id)]) {
    if (!mapa.getLayer(capa)) continue;
    const idFiltro = capa === "municipios-linea" ? "municipios" : capa;
    mapa.setFilter(capa, filtroDe(idFiltro));
  }
  pintarStats();
}

function hectareas(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "sin dato";
  return `${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })} ha`;
}

function fichaDe(capa, p) {
  if (capa === "anp-federales") {
    return `<p><strong>${p.nombre}</strong></p><p>${NOMBRES[p.cat_manejo] || p.cat_manejo}</p><p>${p.estados}</p><p>${hectareas(p.superficie)} decretadas · tierra ${hectareas(p.s_terres)} · mar ${hectareas(p.s_marina)}</p>`;
  }
  if (capa === "anp-otras") {
    return `<p><strong>${p.nombre}</strong></p><p>${p.tipo}${p.cat_dec ? ` · ${p.cat_dec}` : ""}</p><p>${p.entidad}</p><p>${hectareas(p.ha)} en el polígono</p>`;
  }
  if (capa === "manglar") {
    return `<p><strong>${p.cambios}</strong></p><p>${hectareas(p.ha)} en la costa de la península, 2020-2025</p>`;
  }
  if (capa === "aicas") return `<p><strong>${p.nombre}</strong></p><p>${hectareas(p.ha)}</p>`;
  if (capa === "prioritarios-terrestres") return `<p><strong>Sitio prioritario terrestre</strong></p><p>${p.prioridad}</p><p>${hectareas(p.ha)}</p>`;
  if (capa === "prioritarios-marinos") {
    return `<p><strong>${p.nombre}</strong></p><p>${p.importancia || ""}</p><p>${p.habitat || ""}</p><p>${hectareas(p.ha)}</p>`;
  }
  if (capa === "municipios") return `<p><strong>${p.nomgeo}</strong></p><p>${p.estado}</p><p>${Number(p.pob_total).toLocaleString("es-MX")} habitantes en 2020</p>`;
  return "";
}

function pintarStats() {
  const destino = document.getElementById("stats");
  if (!resumen) return;
  const filas = resumen.estados.filter((e) => estadoSelect.value === "todas" || e.estado === estadoSelect.value);
  destino.innerHTML = `<table class="stats"><thead><tr><th>Estado</th><th>Federal</th><th>Otras</th></tr></thead><tbody>${filas.map((e) => `<tr><td>${e.estado}<br><span class="nota">${e.poblacion_2020.toLocaleString("es-MX")} hab.</span></td><td>${e.ha_federales_por_habitante.toLocaleString("es-MX", { maximumFractionDigits: 3 })} ha<br><span class="nota">${Math.round(e.ha_federales_terrestres).toLocaleString("es-MX")} ha</span></td><td>${e.ha_otras_por_habitante.toLocaleString("es-MX", { maximumFractionDigits: 3 })} ha<br><span class="nota">${Math.round(e.ha_otras).toLocaleString("es-MX")} ha</span></td></tr>`).join("")}</tbody></table>`;
}

function pintarLeyenda() {
  const items = [
    ["#1f6b4a", "Reserva de la biosfera"],
    ["#1d6f8a", "Parque nacional"],
    ["#c4963a", "Flora y fauna"],
    ["#c45c26", "Santuario"],
    ["#6d4d92", "ANP estatal u otra"],
    ["#2a9d8f", "Ganancia de manglar"],
    ["#c44536", "Pérdida de manglar"],
    ["#1d4e3a", "Manglar sin cambios"],
  ];
  document.getElementById("leyenda").innerHTML = items.map(([color, nombre]) => `<span><i class="muestra" style="background:${color}"></i>${nombre}</span>`).join("");
}

async function cargar(archivo) {
  const respuesta = await fetch(archivo);
  if (!respuesta.ok) throw new Error(archivo);
  return respuesta.json();
}

mapa.on("load", async () => {
  const controles = document.getElementById("capas");
  try {
    const [municipios, estados, ...resto] = await Promise.all([
      cargar("/api/municipios/"),
      cargar("/api/estados/"),
      ...CAPAS.map((c) => cargar(c.archivo)),
    ]);
    resumen = await cargar("/api/resumen/");

    mapa.addSource("municipios", { type: "geojson", data: municipios });
    mapa.addLayer({
      id: "municipios",
      type: "fill",
      source: "municipios",
      paint: { "fill-color": "#e7efe8", "fill-opacity": 0.35 },
    });
    mapa.addLayer({
      id: "municipios-linea",
      type: "line",
      source: "municipios",
      paint: { "line-color": "#c5d0c6", "line-width": 0.6 },
    });
    mapa.addSource("estados", { type: "geojson", data: estados });
    mapa.addLayer({
      id: "estados",
      type: "line",
      source: "estados",
      paint: { "line-color": "#17241e", "line-width": 1.4 },
    });

    resto.forEach((datos, i) => {
      const capa = CAPAS[i];
      mapa.addSource(capa.id, { type: "geojson", data: datos });
      mapa.addLayer(estilo(capa.id));
      mapa.setLayoutProperty(capa.id, "visibility", capa.activo ? "visible" : "none");
      const etiqueta = document.createElement("label");
      etiqueta.innerHTML = `<input type="checkbox" ${capa.activo ? "checked" : ""} /> ${capa.titulo}`;
      etiqueta.querySelector("input").addEventListener("change", (evento) => {
        mapa.setLayoutProperty(capa.id, "visibility", evento.target.checked ? "visible" : "none");
      });
      controles.appendChild(etiqueta);
    });

    aplicarFiltros();
    pintarLeyenda();
    document.getElementById("btn-png").disabled = false;
    document.getElementById("btn-jpg").disabled = false;
  } catch (error) {
    document.getElementById("ficha").innerHTML = `<p>No se pudieron leer los datos (${error.message}). Sirve el sitio con un servidor local.</p>`;
  }
});

function estilo(id) {
  if (id === "anp-federales") {
    return {
      id, type: "fill", source: id,
      paint: {
        "fill-color": ["match", ["get", "cat_manejo"], "RB", "#1f6b4a", "PN", "#1d6f8a", "APFF", "#c4963a", "SANT", "#c45c26", "#888"],
        "fill-opacity": 0.55,
      },
    };
  }
  if (id === "anp-otras") {
    return { id, type: "fill", source: id, paint: { "fill-color": "#6d4d92", "fill-opacity": 0.4 } };
  }
  if (id === "manglar") {
    return {
      id, type: "fill", source: id,
      paint: {
        "fill-color": ["match", ["get", "cambios"], "Ganancia de Manglar", "#2a9d8f", "Perdida de Manglar", "#c44536", "#1d4e3a"],
        "fill-opacity": 0.72,
      },
    };
  }
  if (id === "aicas") return { id, type: "line", source: id, paint: { "line-color": "#b5812f", "line-width": 1.6 } };
  if (id === "prioritarios-terrestres") return { id, type: "fill", source: id, paint: { "fill-color": "#d9a441", "fill-opacity": 0.28 } };
  return { id, type: "fill", source: id, paint: { "fill-color": "#1a6a8a", "fill-opacity": 0.3 } };
}

mapa.on("click", (evento) => {
  const ids = ["anp-federales", "anp-otras", "manglar", "aicas", "prioritarios-terrestres", "prioritarios-marinos", "municipios"];
  const visibles = ids.filter((id) => mapa.getLayer(id) && mapa.getLayoutProperty(id, "visibility") !== "none");
  const hallados = mapa.queryRenderedFeatures(evento.point, { layers: visibles });
  const ficha = document.getElementById("ficha");
  if (!hallados.length) {
    ficha.innerHTML = `<p class="nota">No hay una capa activa en ese punto.</p>`;
    return;
  }
  ficha.innerHTML = fichaDe(hallados[0].layer.id, hallados[0].properties);
});

estadoSelect.addEventListener("change", aplicarFiltros);
categoriaSelect.addEventListener("change", aplicarFiltros);
busquedaInput.addEventListener("input", aplicarFiltros);

function exportar(formato) {
  const origen = mapa.getCanvas();
  const lienzo = lienzoConPie(
    origen,
    origen.width,
    origen.height,
    "Dónde se cuida la península",
    "CONABIO, CC BY-NC 2.5 MX · INEGI, Censo 2020 y Marco Geoestadístico"
  );
  descargarLienzo(lienzo, "donde-se-cuida-la-peninsula", formato);
}

document.getElementById("btn-png").addEventListener("click", () => exportar("png"));
document.getElementById("btn-jpg").addEventListener("click", () => exportar("jpg"));
