#!/usr/bin/env python3
"""Revisa llaves y columnas de datos/ antes de cargarlas a MongoDB."""

import csv
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
DATOS = RAIZ / "datos"
FECHA = "2026-10-15"

GEO = {
    "anp_federales": ["id", "nombre", "cat_manejo", "estados", "superficie", "s_terres", "s_marina", "estados_filtro"],
    "anp_otras": ["id", "nombre", "tipo", "cat_dec", "entidad", "ha", "estados_filtro"],
    "manglar": ["id", "cambios", "ha"],
    "aicas": ["id", "nombre", "ha", "estados_filtro"],
    "sitios_terrestres": ["id", "prioridad", "ha", "estados_filtro"],
    "sitios_marinos": ["id", "nombre", "importancia", "habitat", "ha", "estados_filtro"],
    "municipios": ["id", "nomgeo", "cvegeo", "cve_ent", "estado", "pob_total"],
    "estados": ["id", "estado"],
}
CSV = {
    "reservas_estatales": ["id", "nombre", "categoria", "hectareas", "zona", "fecha_decreto"],
    "acuifero_cenotes": ["id", "indicador", "concepto", "valor", "unidad", "cota", "etiqueta"],
    "especies": ["id", "nombre", "nombre_cientifico", "categoria_nom059", "lugares", "archivo_modelo", "credito", "licencia"],
    "resumen_superficie": ["id", "estado", "poblacion_2020", "anp_federales", "ha_federales_terrestres", "ha_federales_por_habitante", "anp_otras", "ha_otras", "ha_otras_por_habitante"],
}
PROHIBIDOS = {"n/a", "na", "s/d", "-", "null", "none"}


def main():
    errores = []
    for nombre, campos in GEO.items():
        ruta = DATOS / f"fauna_{nombre}_{FECHA}.geojson"
        if not ruta.is_file():
            errores.append(f"falta {ruta.name}")
            continue
        features = json.loads(ruta.read_text(encoding="utf-8"))["features"]
        ids = []
        for feature in features:
            props = feature.get("properties") or {}
            ids.append(props.get("id"))
            faltan = [campo for campo in campos if campo not in props]
            if faltan or feature.get("geometry", {}).get("type") not in {"Polygon", "MultiPolygon"}:
                errores.append(f"{ruta.name} no trae la geometría o los campos del mapa")
                break
        if len(ids) != len(set(ids)) or any(not valor for valor in ids):
            errores.append(f"{ruta.name} no tiene id único")

    for nombre, columnas in CSV.items():
        ruta = DATOS / f"fauna_{nombre}_{FECHA}.csv"
        if not ruta.is_file():
            errores.append(f"falta {ruta.name}")
            continue
        with ruta.open(encoding="utf-8-sig", newline="") as archivo:
            lector = csv.DictReader(archivo)
            if list(lector.fieldnames or []) != columnas:
                errores.append(f"{ruta.name} no tiene las columnas esperadas")
            filas = list(lector)
        ids = [fila.get("id") for fila in filas]
        if len(ids) != len(set(ids)):
            errores.append(f"{ruta.name} repite id")
        for fila in filas:
            for contenido in fila.values():
                if (contenido or "").strip().lower() in PROHIBIDOS:
                    errores.append(f"{ruta.name} usa un faltante prohibido")

    reservas = DATOS / f"fauna_reservas_estatales_{FECHA}.csv"
    if reservas.is_file():
        with reservas.open(encoding="utf-8-sig", newline="") as archivo:
            filas = list(csv.DictReader(archivo))
        total = round(sum(float(fila["hectareas"]) for fila in filas), 2)
        if total != 535245.25 or {fila["zona"] for fila in filas} != {"Costa", "Interior"}:
            errores.append("las reservas no suman 535245.25 ha o no separan costa e interior")

    modelos = RAIZ / "frontend" / "ar" / "modelos"
    especies = DATOS / f"fauna_especies_{FECHA}.csv"
    if especies.is_file():
        with especies.open(encoding="utf-8-sig", newline="") as archivo:
            for fila in csv.DictReader(archivo):
                if not (modelos / fila["archivo_modelo"]).is_file():
                    errores.append(f"falta el modelo {fila['archivo_modelo']}")

    if errores:
        print("\n".join(errores))
        return 1
    print("datos/ tiene las columnas, las llaves y los modelos de las tres visualizaciones.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
