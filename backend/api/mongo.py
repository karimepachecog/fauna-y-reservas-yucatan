from django.conf import settings
from pymongo import MongoClient

_cliente = None


def base():
    global _cliente
    if _cliente is None:
        _cliente = MongoClient(settings.MONGO_URI)
    return _cliente[settings.MONGO_DB]


def filas(coleccion):
    return list(base()[coleccion].find({}, {"_id": 0}).sort("_id", 1))


def feature_collection(coleccion):
    features = []
    for documento in base()[coleccion].find().sort("_id", 1):
        features.append({
            "type": "Feature",
            "id": documento["_id"],
            "geometry": documento["geometry"],
            "properties": documento["properties"],
        })
    return {"type": "FeatureCollection", "features": features}
