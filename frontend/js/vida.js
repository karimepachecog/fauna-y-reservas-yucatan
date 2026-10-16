const REDUCIDO = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const BASE = new URL("../", document.currentScript.src);

function urlImagen(nombre) {
  return new URL(`img/${nombre}`, BASE).href;
}

function maya(numero) {
  const n = Math.max(0, Math.min(19, Math.round(numero)));
  const barras = Math.floor(n / 5);
  const puntos = n % 5;
  const piezas = `${"<i class=\"barra-maya\"></i>".repeat(barras)}${"<i class=\"punto-maya\"></i>".repeat(puntos)}`;
  return `<span class="maya" aria-hidden="true">${piezas || "<i class=\"punto-maya\"></i>"}</span>`;
}

function contar(elemento, valor, opciones = {}) {
  const decimales = opciones.decimales ?? 0;
  const prefijo = opciones.prefijo ?? "";
  const sufijo = opciones.sufijo ?? "";
  const duracion = opciones.duracion ?? 1100;
  const formatear = (n) => n.toLocaleString("es-MX", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
  const pintar = (n) => {
    elemento.textContent = `${prefijo}${formatear(n)}${sufijo}`;
  };
  if (REDUCIDO) {
    pintar(valor);
    return Promise.resolve();
  }
  const inicio = performance.now();
  return new Promise((resolver) => {
    function frame(ahora) {
      const t = Math.min(1, (ahora - inicio) / duracion);
      const suave = 1 - (1 - t) ** 3;
      pintar(valor * suave);
      if (t < 1) requestAnimationFrame(frame);
      else resolver();
    }
    requestAnimationFrame(frame);
  });
}

function revelar(selector) {
  const nodos = document.querySelectorAll(selector);
  if (REDUCIDO || !window.gsap || !window.ScrollTrigger) {
    nodos.forEach((nodo) => nodo.classList.add("visible"));
    return;
  }
  window.gsap.registerPlugin(window.ScrollTrigger);
  nodos.forEach((nodo) => {
    window.gsap.from(nodo, {
      y: 28,
      autoAlpha: 0,
      duration: 0.6,
      scrollTrigger: { trigger: nodo, start: "top 88%" },
    });
  });
}

function letras(elemento) {
  if (!elemento || elemento.dataset.letras === "1") return;
  const texto = elemento.textContent;
  elemento.textContent = "";
  elemento.dataset.letras = "1";
  let indice = 0;
  texto.split(" ").forEach((palabra, i, palabras) => {
    const grupo = document.createElement("span");
    grupo.className = "palabra";
    [...palabra].forEach((caracter) => {
      const span = document.createElement("span");
      span.className = "letra";
      if (!REDUCIDO) span.style.animationDelay = `${indice * 0.028}s`;
      span.textContent = caracter;
      grupo.appendChild(span);
      indice += 1;
    });
    elemento.appendChild(grupo);
    if (i < palabras.length - 1) {
      elemento.appendChild(document.createTextNode(" "));
      indice += 1;
    }
  });
}

function montarCapa() {
  if (document.querySelector(".vida-capa") || document.body.classList.contains("pagina-mapa")) return;
  const capa = document.createElement("div");
  capa.className = "vida-capa";
  if (REDUCIDO) capa.classList.add("quieta");
  capa.setAttribute("aria-hidden", "true");

  const lianas = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  lianas.setAttribute("class", "liana");
  lianas.setAttribute("viewBox", "0 0 80 320");
  lianas.style.left = "2%";
  lianas.innerHTML = '<path d="M40 0 C20 40 60 80 30 140 C10 190 55 230 34 320" fill="none" stroke="#1c6848" stroke-width="3"/>';
  const liana2 = lianas.cloneNode(true);
  liana2.style.left = "auto";
  liana2.style.right = "1%";
  capa.append(lianas, liana2);

  for (let i = 0; i < 7; i += 1) {
    const hoja = document.createElement("img");
    hoja.src = urlImagen("hoja.svg");
    hoja.alt = "";
    hoja.className = "hoja-vida";
    hoja.style.left = `${8 + (i * 13) % 84}%`;
    hoja.style.top = `${6 + (i * 17) % 28}%`;
    hoja.style.animationDelay = `${-i * 0.6}s`;
    capa.appendChild(hoja);
  }

  [18, 46, 72].forEach((top, i) => {
    const mariposa = document.createElement("img");
    mariposa.src = urlImagen("mariposa.svg");
    mariposa.alt = "";
    mariposa.className = "mariposa-vida";
    mariposa.style.top = `${top}%`;
    mariposa.style.left = "0";
    mariposa.style.animationDuration = `${12 + i * 3}s`;
    mariposa.style.animationDelay = `${-i * 4}s`;
    capa.appendChild(mariposa);
  });

  for (let i = 0; i < 10; i += 1) {
    const luz = document.createElement("span");
    luz.className = "luciernaga";
    luz.style.left = `${10 + (i * 9) % 80}%`;
    luz.style.top = `${18 + (i * 11) % 60}%`;
    luz.style.animationDelay = `${-i * 0.4}s`;
    capa.appendChild(luz);
  }

  document.body.appendChild(capa);
  document.addEventListener("visibilitychange", () => {
    capa.classList.toggle("pausada", document.hidden);
  });
}

function parallax() {
  const hero = document.querySelector("[data-parallax]");
  if (!hero || REDUCIDO) return;
  const capas = [...hero.querySelectorAll("[data-vel]")];
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    for (const capa of capas) {
      capa.style.transform = `translateY(${y * Number(capa.dataset.vel)}px)`;
    }
  }, { passive: true });
}

function inclinar() {
  if (REDUCIDO || !window.matchMedia("(pointer: fine)").matches) return;
  document.querySelectorAll("[data-inclinar]").forEach((tarjeta) => {
    tarjeta.addEventListener("pointermove", (evento) => {
      const caja = tarjeta.getBoundingClientRect();
      const x = (evento.clientX - caja.left) / caja.width - 0.5;
      const y = (evento.clientY - caja.top) / caja.height - 0.5;
      tarjeta.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
    });
    tarjeta.addEventListener("pointerleave", () => {
      tarjeta.style.transform = "";
    });
  });
}

function montarLottie() {
  if (!window.lottie) return;
  document.querySelectorAll("[data-lottie]").forEach((nodo) => {
    const animacion = window.lottie.loadAnimation({
      container: nodo,
      renderer: "svg",
      loop: !REDUCIDO,
      autoplay: !REDUCIDO,
      path: new URL(nodo.dataset.lottie, BASE).href,
    });
    if (REDUCIDO) {
      animacion.addEventListener("DOMLoaded", () => animacion.goToAndStop(0, true));
    }
  });
}

function iniciar() {
  montarCapa();
  montarLottie();
  document.querySelectorAll("[data-letras]").forEach(letras);
  parallax();
  inclinar();
  if (document.querySelector(".tarjeta")) revelar(".tarjeta");
}

window.vida = { contar, revelar, letras, maya, reducido: REDUCIDO, urlImagen };

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
else iniciar();
