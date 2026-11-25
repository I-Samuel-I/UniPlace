from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from accounts.views import (
    AvatarView, ExportAccountView, LoginView, PasswordChangeView, ProfileView,
    RegisterView, RevokeSessionsView, SessionRefreshView,
    PublicProfileView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/login/", LoginView.as_view(), name="login"),
    path("api/auth/refresh/", SessionRefreshView.as_view(), name="token-refresh"),
    path("api/auth/password/", PasswordChangeView.as_view(), name="password-change"),
    path("api/me/", ProfileView.as_view(), name="profile"),
    path("api/profiles/<int:user_id>/", PublicProfileView.as_view(), name="public-profile"),
    path("api/me/avatar/", AvatarView.as_view(), name="profile-avatar"),
    path("api/me/export/", ExportAccountView.as_view(), name="account-export"),
    path("api/me/sessions/revoke/", RevokeSessionsView.as_view(), name="revoke-sessions"),
    path("api/", include("community.urls")),
    path("api/", include("posts.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
