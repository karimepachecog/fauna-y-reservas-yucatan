#!/usr/bin/env python3
"""Carga los archivos de datos/ en la base MongoDB llamada datos."""

import csv
import json
import os
import re
import time
from pathlib import Path

from pymongo import MongoClient

RAIZ = Path(__file__).resolve().parents[1]
DATOS = Path(os.environ.get("DATOS_DIR", RAIZ / "datos"))
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.environ.get("MONGO_DB", "datos")
FECHA = re.compile(r"_\d{4}-\d{2}-\d{2}$")


def nombre_coleccion(ruta):
    nombre = ruta.stem.removeprefix("fauna_")
    return FECHA.sub("", nombre)


def valor(texto):
    if texto == "":
        return None
    if re.fullmatch(r"-?\d+", texto):
        return int(texto)
    if re.fullmatch(r"-?\d+\.\d+", texto):
        return float(texto)
    return texto


def cargar_geojson(coleccion, ruta):
    features = json.loads(ruta.read_text(encoding="utf-8"))["features"]
    documentos = []
    for feature in features:
        propiedades = feature["properties"]
        documentos.append({
            "_id": propiedades["id"],
            "geometry": feature["geometry"],
            "properties": propiedades,
        })
    if documentos:
        coleccion.delete_many({})
        coleccion.insert_many(documentos)
    return len(documentos)


def cargar_csv(coleccion, ruta):
    with ruta.open(encoding="utf-8-sig", newline="") as archivo:
        filas = list(csv.DictReader(archivo))
    documentos = []
    for fila in filas:
        documento = {clave: valor(contenido) for clave, contenido in fila.items()}
        documento["_id"] = documento["id"]
        documentos.append(documento)
    if documentos:
        coleccion.delete_many({})
        coleccion.insert_many(documentos)
    return len(documentos)


def conectar():
    ultimo = None
    for _ in range(30):
        try:
            cliente = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
            cliente.admin.command("ping")
            return cliente
        except Exception as error:
            ultimo = error
            time.sleep(1)
    raise SystemExit(f"MongoDB no respondió: {ultimo}")


def main():
    cliente = conectar()
    base = cliente[MONGO_DB]
    if base["anp_federales"].estimated_document_count() and os.environ.get("FORCE_CARGA") != "1":
        print("La base datos ya tiene capas. No se recarga.")
        return
    total = 0
    for ruta in sorted(DATOS.iterdir()):
        if ruta.suffix not in {".geojson", ".csv"}:
            continue
        coleccion = base[nombre_coleccion(ruta)]
        if ruta.suffix == ".geojson":
            cantidad = cargar_geojson(coleccion, ruta)
        else:
            cantidad = cargar_csv(coleccion, ruta)
        total += cantidad
        print(f"{coleccion.name}: {cantidad}")
    print(f"Listo. {total} documentos en {MONGO_DB}.")


if __name__ == "__main__":
    main()
