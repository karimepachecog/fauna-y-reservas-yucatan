const PRESENTACION = {
  acuifero: { nombre: "Acuífero" },
  cenotes: { nombre: "Cenotes" },
};
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const QUIETO = window.vida?.reducido || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  return [...grupos.entries()].map(([id, grupo]) => ({
    id,
    nombre: PRESENTACION[id]?.nombre || id,
    filas: grupo.map((fila) => ({
      nombre: fila.concepto,
      concepto: fila.concepto,
      valor: Number(fila.valor),
      etiqueta: fila.etiqueta,
      unidad: fila.unidad,
      cota: fila.cota,
    })),
  }));
}

const escena = document.getElementById("lamina");
const canvas = document.getElementById("cenotes");
const ctx = canvas.getContext("2d");
const capaBurbujas = document.getElementById("burbujas");
const globo = document.getElementById("globo");
const logro = document.getElementById("logro");
const estado = { anillo: 0, encender: 0, metaAnillo: 0, metaEncender: 0 };
let puntos = [];
let reservas = [];
let agua = [];
let vistas = new Set();
let medida = { w: 1, h: 1 };

function numero(valor, decimales = 0) {
  return valor.toLocaleString("es-MX", { maximumFractionDigits: decimales, minimumFractionDigits: decimales });
}

function filaAgua(concepto) {
  return agua.find((fila) => fila.concepto === concepto);
}

function prefijo(fila) {
  return fila.cota === "minimo" ? "más de " : "";
}

function medir() {
  const caja = escena.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(caja.width * dpr));
  canvas.height = Math.max(1, Math.round(caja.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  medida = { w: caja.width, h: caja.height };
  ubicarPuntos();
}

function ubicarPuntos() {
  const { w, h } = medida;
  const cols = 50;
  const rows = 40;
  const zona = { x: w * 0.08, y: h * 0.4, w: w * 0.84, h: h * 0.5 };
  const cx = w * 0.5;
  const cy = h * 0.42;
  const base = Math.min(w, h) * 0.16;
  const porArco = 400;
  puntos = Array.from({ length: 2000 }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const arco = Math.floor(i / porArco);
    const t = (i % porArco) / (porArco - 1);
    const ang = Math.PI * t;
    const radio = base + arco * Math.min(w, h) * 0.018;
    return {
      gx: zona.x + (col + 0.5) * (zona.w / cols),
      gy: zona.y + (row + 0.5) * (zona.h / rows),
      ax: cx + Math.cos(ang) * radio,
      ay: cy + Math.sin(ang) * radio * 0.62,
      fase: (i % 17) * 0.4,
    };
  });
}

function dibujarPuntos(ahora) {
  const { w, h } = medida;
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < puntos.length; i += 1) {
    const p = puntos[i];
    const visible = estado.encender - i / puntos.length;
    if (visible <= 0) continue;
    const x = p.gx + (p.ax - p.gx) * estado.anillo;
    const y = p.gy + (p.ay - p.gy) * estado.anillo;
    const brillo = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(ahora / 380 + p.fase));
    ctx.globalAlpha = Math.min(1, visible * 4) * brillo;
    ctx.fillStyle = "#e7fff8";
    ctx.beginPath();
    ctx.arc(x, y, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (estado.anillo > 0.82) dibujarSector();
}

function dibujarSector() {
  const acuifero = filaAgua("Acuífero");
  const anillo = filaAgua("Anillo de Cenotes");
  if (!acuifero || !anillo) return;
  const { w, h } = medida;
  const cx = w * 0.5;
  const cy = h * 0.42;
  const radio = Math.min(w, h) * 0.28;
  const angulo = Math.PI * 2 * (anillo.valor / acuifero.valor);
  const alfa = Math.min(1, (estado.anillo - 0.82) / 0.18);
  ctx.globalAlpha = 0.35 * alfa;
  ctx.strokeStyle = "#f2d48a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radio, 0, Math.PI);
  ctx.stroke();
  ctx.globalAlpha = 0.9 * alfa;
  ctx.fillStyle = "#e8a317";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, radio, Math.PI / 2 - angulo / 2, Math.PI / 2 + angulo / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff8e8";
  ctx.font = "700 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${(anillo.valor / acuifero.valor * 100).toLocaleString("es-MX", { maximumFractionDigits: 1 })}%`, cx, cy + radio + 18);
  ctx.globalAlpha = 1;
}

function cuadro() {
  if (!document.hidden) {
    estado.anillo += (estado.metaAnillo - estado.anillo) * (QUIETO ? 1 : 0.08);
    estado.encender += (estado.metaEncender - estado.encender) * (QUIETO ? 1 : 0.06);
    if (estado.encender > 0.01 || estado.metaEncender > 0) dibujarPuntos(performance.now());
    else ctx.clearRect(0, 0, medida.w, medida.h);
  }
  if (QUIETO) return;
  requestAnimationFrame(cuadro);
}

function aplicar(paso) {
  escena.dataset.paso = paso;
  const orden = ["superficie", "corte", "acuifero", "cenotes", "anillo", "reservas"];
  const indice = orden.indexOf(paso);
  estado.metaEncender = indice >= orden.indexOf("cenotes") ? 1 : 0;
  estado.metaAnillo = indice >= orden.indexOf("anillo") ? 1 : 0;
  if (indice >= orden.indexOf("acuifero")) contarPaso(paso);
  const textos = {
    superficie: "Baja para ver qué hay debajo de la selva.",
    corte: "La grieta abre el corte de la caliza.",
    acuifero: "El agua sube y llena el acuífero.",
    cenotes: "Cada punto es un cenote del mínimo que cita el boletín.",
    anillo: "Los puntos forman el arco. El sector ámbar es la reserva dentro del acuífero.",
    reservas: "Toca una burbuja para ver su decreto.",
  };
  if (!globo.dataset.fijo) globo.textContent = textos[paso] || "";
  document.querySelectorAll(".progreso i").forEach((marca, i) => {
    marca.classList.toggle("hecho", i <= indice);
  });
}

const contados = new Set();
function contarPaso(paso) {
  if (contados.has(paso) || !window.vida) return;
  contados.add(paso);
  if (paso === "acuifero") {
    const fila = filaAgua("Acuífero");
    window.vida.contar(document.getElementById("n-acuifero"), fila.valor);
  }
  if (paso === "cenotes") {
    window.vida.contar(document.getElementById("n-cenotes"), filaAgua("Cenotes").valor);
  }
  if (paso === "anillo") {
    window.vida.contar(document.getElementById("n-anillo"), filaAgua("Anillo de Cenotes").valor);
  }
  if (paso === "reservas") {
    const costa = reservas.filter((r) => r.zona === "Costa").reduce((s, r) => s + Number(r.hectareas), 0);
    const interior = reservas.filter((r) => r.zona === "Interior").reduce((s, r) => s + Number(r.hectareas), 0);
    window.vida.contar(document.getElementById("n-costa"), costa);
    window.vida.contar(document.getElementById("n-interior"), interior);
  }
}

function empacar(items, caja) {
  const suma = items.reduce((s, item) => s + item.ha, 0);
  const k = Math.sqrt((caja.w * caja.h * 0.62) / (Math.PI * suma));
  const circulos = items.map((item, indice) => {
    const angulo = indice * 2.399;
    return {
      ...item,
      r: Math.max(22, Math.sqrt(item.ha) * k),
      x: caja.x + caja.w / 2 + Math.cos(angulo) * caja.w * 0.12,
      y: caja.y + caja.h / 2 + Math.sin(angulo) * caja.h * 0.12,
    };
  });
  for (let n = 0; n < 280; n += 1) {
    for (let i = 0; i < circulos.length; i += 1) {
      const a = circulos[i];
      for (let j = i + 1; j < circulos.length; j += 1) {
        const b = circulos[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const minimo = a.r + b.r + 6;
        if (dist < minimo) {
          const empuje = (minimo - dist) / 2;
          a.x -= (dx / dist) * empuje;
          a.y -= (dy / dist) * empuje;
          b.x += (dx / dist) * empuje;
          b.y += (dy / dist) * empuje;
        }
      }
      a.x = Math.min(caja.x + caja.w - a.r, Math.max(caja.x + a.r, a.x));
      a.y = Math.min(caja.y + caja.h - a.r, Math.max(caja.y + a.r, a.y));
    }
  }
  return circulos;
}

function pintarReservas() {
  const { w, h } = medida;
  const grupos = [
    { zona: "Costa", caja: { x: w * 0.06, y: h * 0.36, w: w * 0.88, h: h * 0.24 } },
    { zona: "Interior", caja: { x: w * 0.06, y: h * 0.62, w: w * 0.88, h: h * 0.3 } },
  ];
  capaBurbujas.innerHTML = "";
  for (const grupo of grupos) {
    const items = reservas
      .filter((reserva) => reserva.zona === grupo.zona)
      .map((reserva) => ({ ...reserva, ha: Number(reserva.hectareas) }));
    for (const circulo of empacar(items, grupo.caja)) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = `burbuja ${circulo.zona === "Costa" ? "costa" : "interior"}`;
      boton.style.left = `${circulo.x - circulo.r}px`;
      boton.style.top = `${circulo.y - circulo.r}px`;
      boton.style.width = `${circulo.r * 2}px`;
      boton.style.height = `${circulo.r * 2}px`;
      boton.style.animationDelay = `${-Number(circulo.id.replace(/\D/g, "")) * 0.3}s`;
      boton.setAttribute("aria-pressed", vistas.has(circulo.id) ? "true" : "false");
      boton.setAttribute("aria-label", `${circulo.nombre}, ${numero(circulo.ha)} hectáreas, zona ${circulo.zona}`);
      const corto = circulo.r > 46 ? circulo.nombre.split(" ")[0] : "";
      boton.innerHTML = `<span class="burbuja-cuerpo">${corto}</span>`;
      boton.addEventListener("click", () => tocar(circulo, boton));
      capaBurbujas.appendChild(boton);
    }
  }
}

function tocar(reserva, boton) {
  vistas.add(reserva.id);
  globo.dataset.fijo = "1";
  document.querySelectorAll(".burbuja").forEach((otro) => otro.classList.remove("abierta"));
  boton.classList.add("abierta");
  boton.setAttribute("aria-pressed", "true");
  globo.textContent = textoDecreto(reserva);
  for (let i = 0; i < 6; i += 1) {
    const chispa = document.createElement("span");
    chispa.className = "chispa";
    chispa.style.left = `${40 + i * 8}%`;
    chispa.style.bottom = "18%";
    escena.appendChild(chispa);
    chispa.addEventListener("animationend", () => chispa.remove());
  }
  if (vistas.size === reservas.length) {
    logro.hidden = false;
    logro.innerHTML = `${window.vida.maya(9)} Encontraste las 9 reservas`;
  }
}

function escribirTextos() {
  const acuifero = filaAgua("Acuífero");
  const anillo = filaAgua("Anillo de Cenotes");
  const cenotes = filaAgua("Cenotes");
  const veces = acuifero.valor / anillo.valor;
  const total = reservas.reduce((s, r) => s + Number(r.hectareas), 0);
  const reservaAnillo = reservas.find((r) => r.nombre === "Anillo de Cenotes");
  const anilloHa = Number(reservaAnillo?.hectareas || 0);
  const parte = (anilloHa / total) * 100;
  document.getElementById("texto-acuifero").innerHTML = `El boletín lo describe como el acuífero más grande de México: ${prefijo(acuifero)}<strong class="cifra" id="n-acuifero">0</strong> ${acuifero.unidad} bajo la península. En ese mínimo caben unas ${numero(veces, 0)} veces los ${anillo.etiqueta} ${anillo.unidad} de la reserva Anillo de Cenotes.`;
  document.getElementById("texto-cenotes").innerHTML = `El boletín registra ${prefijo(cenotes).toLowerCase()}<strong class="cifra" id="n-cenotes">0</strong> cenotes en Yucatán. El dibujo enciende 2,000 puntos, uno por cada cenote de ese mínimo. No es una barra: es un pictograma.`;
  document.getElementById("texto-anillo").innerHTML = `Esos cenotes se alinean en un arco que sigue el borde del cráter de Chicxulub, bajo la losa de caliza. Así delimitan el anillo la <a href="https://rsis.ramsar.org/ris/2043">ficha Ramsar</a> y la <a href="https://whc.unesco.org/en/tentativelists/5784/">lista tentativa de UNESCO</a>. La reserva estatal geohidrológica cubre <strong class="cifra" id="n-anillo">0</strong> ${anillo.unidad}: ${(anillo.valor / acuifero.valor * 100).toLocaleString("es-MX", { maximumFractionDigits: 1 })}% del mínimo del acuífero y ${numero(parte, 0)}% de las nueve reservas juntas. El sector ámbar marca esa parte del acuífero, a escala.`;
  document.getElementById("texto-reservas").innerHTML = `La costa suma <strong class="cifra" id="n-costa">0</strong> ha y el interior <strong class="cifra" id="n-interior">0</strong> ha. Juntas son ${numero(total)} ha, cerca del 14% del estado, según la Secretaría de Desarrollo Sustentable.`;
  document.querySelectorAll(".paso").forEach((paso) => {
    const barra = document.createElement("div");
    barra.className = "progreso";
    barra.setAttribute("aria-hidden", "true");
    barra.innerHTML = "<i></i><i></i><i></i><i></i><i></i><i></i>";
    paso.prepend(barra);
  });
}

function partir(items, x, y, ancho, alto, vertical) {
  if (!items.length) return [];
  if (items.length === 1) return [{ ...items[0], x, y, ancho, alto }];
  const total = items.reduce((suma, item) => suma + item.ha, 0);
  let acumulado = 0;
  let corte = 1;
  for (let i = 0; i < items.length - 1; i += 1) {
    acumulado += items[i].ha;
    corte = i + 1;
    if (acumulado >= total / 2) break;
  }
  const primero = items.slice(0, corte);
  const resto = items.slice(corte);
  const fraccion = primero.reduce((suma, item) => suma + item.ha, 0) / total;
  if (vertical) {
    const anchoPrimero = ancho * fraccion;
    return [
      ...partir(primero, x, y, anchoPrimero, alto, false),
      ...partir(resto, x + anchoPrimero, y, ancho - anchoPrimero, alto, false),
    ];
  }
  const altoPrimero = alto * fraccion;
  return [
    ...partir(primero, x, y, ancho, altoPrimero, true),
    ...partir(resto, x, y + altoPrimero, ancho, alto - altoPrimero, true),
  ];
}

function textoDecreto(reserva) {
  const ha = Number(reserva.hectareas);
  return `${reserva.nombre} es ${reserva.categoria.toLowerCase()}, con ${ha.toLocaleString("es-MX")} ha. Decreto del ${fechaLarga(reserva.fecha_decreto)}.`;
}

function pintarTreemap() {
  const lienzo = document.getElementById("treemap");
  const detalle = document.getElementById("detalle-treemap");
  if (!lienzo) return;
  const ancho = lienzo.clientWidth;
  const alto = lienzo.clientHeight;
  if (ancho < 20 || alto < 20) return;
  const orden = reservas
    .map((reserva) => ({ ...reserva, ha: Number(reserva.hectareas) }))
    .sort((a, b) => b.ha - a.ha);
  const total = orden.reduce((suma, reserva) => suma + reserva.ha, 0);
  document.getElementById("total-treemap").textContent = `${numero(total)} ha en total`;
  const celdas = partir(orden, 0, 0, ancho, alto, ancho >= alto);
  const margen = 3;
  lienzo.innerHTML = "";
  for (const celda of celdas) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = `celda-reserva ${celda.zona === "Costa" ? "costa" : "interior"}`;
    boton.style.left = `${celda.x + margen}px`;
    boton.style.top = `${celda.y + margen}px`;
    boton.style.width = `${Math.max(0, celda.ancho - margen * 2)}px`;
    boton.style.height = `${Math.max(0, celda.alto - margen * 2)}px`;
    const etiqueta = `${celda.nombre}, ${numero(celda.ha)} hectáreas, zona ${celda.zona}`;
    boton.setAttribute("aria-label", etiqueta);
    boton.title = etiqueta;
    if (celda.ancho > 88 && celda.alto > 48) {
      boton.innerHTML = `<strong>${celda.nombre}</strong><em>${numero(celda.ha)} ha</em>`;
    }
    boton.addEventListener("click", () => {
      lienzo.querySelectorAll(".celda-reserva").forEach((otro) => otro.setAttribute("aria-pressed", "false"));
      boton.setAttribute("aria-pressed", "true");
      detalle.textContent = textoDecreto(celda);
    });
    lienzo.appendChild(boton);
  }
}

function tabla() {
  const cuerpo = document.querySelector("#tabla-reservas tbody");
  cuerpo.innerHTML = reservas.map((reserva) => `<tr><td>${reserva.nombre}</td><td>${reserva.categoria}</td><td>${Number(reserva.hectareas).toLocaleString("es-MX")}</td><td>${reserva.zona}</td><td>${fechaLarga(reserva.fecha_decreto)}</td></tr>`).join("");
}

function congelar() {
  if (window.gsap) window.gsap.globalTimeline.pause();
  escena.classList.add("congelada");
  escena.dataset.paso = "reservas";
  estado.anillo = 1;
  estado.encender = 1;
  estado.metaAnillo = 1;
  estado.metaEncender = 1;
  dibujarPuntos(0);
  globo.dataset.fijo = "";
}

async function exportar(formato) {
  congelar();
  await new Promise((resolver) => {
    requestAnimationFrame(() => requestAnimationFrame(resolver));
  });
  const captura = new Image();
  captura.className = "cenotes-captura";
  captura.alt = "";
  captura.src = canvas.toDataURL("image/png");
  canvas.hidden = true;
  canvas.after(captura);
  await captura.decode();
  const blob = await htmlToImage.toBlob(escena, {
    backgroundColor: "#123c32",
    pixelRatio: 2,
  });
  captura.remove();
  canvas.hidden = false;
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

function engancharScroll() {
  if (QUIETO || !window.gsap || !window.ScrollTrigger) {
    aplicar("reservas");
    estado.anillo = 1;
    estado.encender = 1;
    dibujarPuntos(0);
    ["acuifero", "cenotes", "anillo", "reservas"].forEach(contarPaso);
    return;
  }
  window.gsap.registerPlugin(window.ScrollTrigger);
  document.querySelectorAll(".paso").forEach((paso) => {
    window.ScrollTrigger.create({
      trigger: paso,
      start: "top center",
      end: "bottom center",
      onToggle: (self) => {
        if (self.isActive) aplicar(paso.dataset.paso);
      },
    });
  });
  aplicar("superficie");
}

async function iniciar() {
  const [filasAgua, filasReservas] = await Promise.all([
    fetch("/api/acuifero-cenotes/").then((respuesta) => respuesta.json()),
    fetch("/api/reservas/").then((respuesta) => respuesta.json()),
  ]);
  agua = indicadoresDesde(filasAgua).flatMap((grupo) => grupo.filas);
  reservas = filasReservas;
  escribirTextos();
  tabla();
  medir();
  pintarReservas();
  pintarTreemap();
  cuadro();
  engancharScroll();
  window.addEventListener("resize", () => {
    medir();
    pintarReservas();
    pintarTreemap();
    dibujarPuntos(performance.now());
  });
}

iniciar().catch((error) => {
  globo.textContent = `No se pudieron leer los datos (${error.message}).`;
});

document.getElementById("btn-png").addEventListener("click", () => exportar("png"));
document.getElementById("btn-jpg").addEventListener("click", () => exportar("jpg"));
