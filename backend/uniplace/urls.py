from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import LoginView, PasswordChangeView, RegisterView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/login/", LoginView.as_view(), name="login"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/auth/password/", PasswordChangeView.as_view(), name="password-change"),
    path("api/", include("posts.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
