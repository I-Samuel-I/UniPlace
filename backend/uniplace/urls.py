from django.contrib import admin
from django.urls import include, path

from accounts.views import LoginView, PasswordChangeView, RegisterView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/login/", LoginView.as_view(), name="login"),
    path("api/auth/password/", PasswordChangeView.as_view(), name="password-change"),
    path("api/posts/", include("posts.urls")),
]
