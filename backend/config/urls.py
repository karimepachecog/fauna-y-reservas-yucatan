import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

mimetypes.add_type("model/gltf-binary", ".glb")
mimetypes.add_type("application/javascript", ".js")


def frontend(request, ruta=""):
    raiz = Path(settings.FRONTEND_ROOT).resolve()
    objetivo = (raiz / ruta).resolve()
    if raiz not in objetivo.parents and objetivo != raiz:
        raise Http404
    if objetivo.is_dir():
        objetivo = objetivo / "index.html"
    if not objetivo.is_file():
        raise Http404
    return FileResponse(objetivo.open("rb"))


urlpatterns = [
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/schema/swagger-ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/", include("api.urls")),
    path("", frontend),
    re_path(r"^(?P<ruta>.*)$", frontend),
]
