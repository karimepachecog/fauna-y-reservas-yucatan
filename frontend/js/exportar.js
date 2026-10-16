function descargarLienzo(lienzo, nombre, formato) {
  const mime = formato === "jpg" ? "image/jpeg" : "image/png";
  const enlace = document.createElement("a");
  enlace.href = lienzo.toDataURL(mime, 0.92);
  enlace.download = `${nombre}.${formato === "jpg" ? "jpg" : "png"}`;
  enlace.click();
}

function lienzoConPie(imagen, ancho, alto, titulo, pie) {
  const barra = Math.max(78, Math.round(ancho * 0.09));
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto + barra;
  const ctx = lienzo.getContext("2d");
  ctx.fillStyle = "#f3efe6";
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.drawImage(imagen, 0, 0, ancho, alto);
  ctx.fillStyle = "#17241e";
  ctx.font = `600 ${Math.round(ancho / 38)}px Georgia, serif`;
  ctx.fillText(titulo, 28, alto + barra * 0.42);
  ctx.fillStyle = "#42564c";
  ctx.font = `${Math.round(ancho / 62)}px sans-serif`;
  ctx.fillText(pie, 28, alto + barra * 0.74);
  return lienzo;
}
