const NOMBRES = {
  RB: "Reserva de la biosfera",
  PN: "Parque nacional",
  APFF: "Área de protección de flora y fauna",
  SANT: "Santuario",
};

const ICONOS = {
  RB: "/img/jaguar.svg",
  PN: "/img/hoja.svg",
  APFF: "/img/flamenco.svg",
  SANT: "/img/tortuga.svg",
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
  zoom: 4.8,
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
    const icono = ICONOS[p.cat_manejo] ? `<img src="${ICONOS[p.cat_manejo]}" alt="">` : "";
    return `<p class="ficha-titulo">${icono}<strong>${p.nombre}</strong></p><p>${NOMBRES[p.cat_manejo] || p.cat_manejo}</p><p>${p.estados}</p><p>${hectareas(p.superficie)} decretadas · tierra ${hectareas(p.s_terres)} · mar ${hectareas(p.s_marina)}</p>`;
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
  const maximo = Math.max(...filas.flatMap((e) => [e.ha_federales_por_habitante, e.ha_otras_por_habitante]), 0.001);
  destino.innerHTML = filas.map((e) => `
    <div class="stat-estado">
      <strong>${e.estado}</strong>
      <span class="nota">${e.poblacion_2020.toLocaleString("es-MX")} hab.</span>
      <div class="stat-linea"><span>Federal</span><span class="stat-pista"><i class="stat-relleno" data-ancho="${(e.ha_federales_por_habitante / maximo) * 100}"></i></span><span data-contar="${e.ha_federales_por_habitante}">0</span></div>
      <p class="nota">${Math.round(e.ha_federales_terrestres).toLocaleString("es-MX")} ha terrestres</p>
      <div class="stat-linea"><span>Otras</span><span class="stat-pista"><i class="stat-relleno otra" data-ancho="${(e.ha_otras_por_habitante / maximo) * 100}"></i></span><span data-contar="${e.ha_otras_por_habitante}">0</span></div>
      <p class="nota">${Math.round(e.ha_otras).toLocaleString("es-MX")} ha</p>
    </div>`).join("");
  requestAnimationFrame(() => {
    destino.querySelectorAll(".stat-relleno").forEach((barra) => {
      barra.style.width = `${barra.dataset.ancho}%`;
    });
    destino.querySelectorAll("[data-contar]").forEach((nodo) => {
      const valor = Number(nodo.dataset.contar);
      if (window.vida) window.vida.contar(nodo, valor, { decimales: 3, sufijo: " ha" });
      else nodo.textContent = `${valor.toLocaleString("es-MX", { maximumFractionDigits: 3 })} ha`;
    });
  });
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

    mapa.addSource("anp-hover", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    mapa.addLayer({
      id: "anp-hover",
      type: "line",
      source: "anp-hover",
      paint: { "line-color": "#f2d48a", "line-width": 2, "line-opacity": 0.95 },
    });
    aplicarFiltros();
    pintarLeyenda();
    CAPAS.forEach((capa, indice) => {
      window.setTimeout(() => aparecer(capa.id), indice * 140);
    });
    if (window.vida?.reducido) mapa.jumpTo({ center: [-89.6, 19.6], zoom: 6.2 });
    else mapa.flyTo({ center: [-89.6, 19.6], zoom: 6.2, speed: 0.32, curve: 1.45, essential: true });
    mapa.on("mousemove", "anp-federales", (evento) => {
      const feature = evento.features && evento.features[0];
      if (!feature || !mapa.getSource("anp-hover")) return;
      mapa.getCanvas().style.cursor = "pointer";
      pulsoActivo = true;
      if (feature.id === idPulso) return;
      idPulso = feature.id;
      const geo = feature.toJSON ? feature.toJSON() : feature;
      mapa.getSource("anp-hover").setData({
        type: "Feature",
        geometry: geo.geometry,
        properties: geo.properties || {},
      });
    });
    mapa.on("mouseleave", "anp-federales", () => {
      mapa.getCanvas().style.cursor = "";
      pulsoActivo = false;
      idPulso = null;
      const fuente = mapa.getSource("anp-hover");
      if (fuente) fuente.setData({ type: "FeatureCollection", features: [] });
    });
    requestAnimationFrame(latir);
    document.getElementById("btn-png").disabled = false;
    document.getElementById("btn-jpg").disabled = false;
  } catch (error) {
    document.getElementById("ficha").innerHTML = `<p>No se pudieron leer los datos (${error.message}). Sirve el sitio con un servidor local.</p>`;
  }
});

function aparecer(id) {
  if (!mapa.getLayer(id)) return;
  const esLinea = mapa.getLayer(id).type === "line";
  const prop = esLinea ? "line-opacity" : "fill-opacity";
  const destino = mapa.getPaintProperty(id, prop);
  if (window.vida?.reducido || typeof destino !== "number") return;
  const inicio = performance.now();
  mapa.setPaintProperty(id, prop, 0);
  function frame(ahora) {
    const t = Math.min(1, (ahora - inicio) / 800);
    mapa.setPaintProperty(id, prop, destino * t);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

let pulsoActivo = false;
let idPulso = null;
function latir(ahora) {
  if (pulsoActivo && mapa.getLayer("anp-hover") && !window.vida?.reducido) {
    mapa.setPaintProperty("anp-hover", "line-width", 2 + Math.sin(ahora / 180) * 1.4);
  }
  requestAnimationFrame(latir);
}

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
  ficha.classList.remove("entra");
  void ficha.offsetWidth;
  ficha.classList.add("entra");
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
