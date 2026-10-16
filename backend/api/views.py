from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from api.mongo import feature_collection, filas

GEO = (
    "municipios",
    "estados",
    "anp_federales",
    "anp_otras",
    "manglar",
    "aicas",
    "sitios_terrestres",
    "sitios_marinos",
)


class ColeccionGeo(APIView):
    coleccion = ""

    @extend_schema(responses={200: dict})
    def get(self, request):
        return Response(feature_collection(self.coleccion))


def vista_geo(coleccion):
    return type(f"Vista{coleccion}", (ColeccionGeo,), {"coleccion": coleccion})


class Resumen(APIView):
    @extend_schema(responses={200: dict})
    def get(self, request):
        return Response({"estados": filas("resumen_superficie")})


class Reservas(APIView):
    @extend_schema(responses={200: list})
    def get(self, request):
        return Response(filas("reservas_estatales"))


class AcuiferoCenotes(APIView):
    @extend_schema(responses={200: list})
    def get(self, request):
        return Response(filas("acuifero_cenotes"))


class Especies(APIView):
    @extend_schema(responses={200: list})
    def get(self, request):
        return Response(filas("especies"))
