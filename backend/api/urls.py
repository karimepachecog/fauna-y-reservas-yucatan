from django.urls import path

from api.views import GEO, AcuiferoCenotes, Especies, Resumen, Reservas, vista_geo

urlpatterns = [path(f"{nombre.replace('_', '-')}/", vista_geo(nombre).as_view()) for nombre in GEO]
urlpatterns += [
    path("resumen/", Resumen.as_view()),
    path("reservas/", Reservas.as_view()),
    path("acuifero-cenotes/", AcuiferoCenotes.as_view()),
    path("especies/", Especies.as_view()),
]
