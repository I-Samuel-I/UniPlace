from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from accounts.authentication import SessionRefreshSerializer
from accounts.models import User
from accounts.services import erase_account, remove_files_after_commit, session_response
from rest_framework_simplejwt.exceptions import InvalidToken

from accounts.serializers import (
    LoginSerializer,
    PasswordChangeSerializer,
    RegisterSerializer,
    UserSerializer,
    ProfileSerializer,
    AvatarSerializer,
    CurrentPasswordSerializer,
    DeleteAccountSerializer,
    PublicProfileSerializer,
)


def locked_user(request):
    user = User.objects.select_for_update().filter(pk=request.user.pk, is_active=True).first()
    if user is None or (request.auth is not None and request.auth.get("session_version", 0) != user.session_version):
        raise InvalidToken("Sua sessão foi encerrada. Entre novamente.")
    return user


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]


class SessionRefreshView(TokenRefreshView):
    serializer_class = SessionRefreshSerializer


class PasswordChangeView(generics.GenericAPIView):
    serializer_class = PasswordChangeSerializer

    def post(self, request, *args, **kwargs):
        with transaction.atomic():
            request.user = locked_user(request)
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            data = session_response(user)
        return Response({"detail": "Senha alterada com sucesso.", **data})


class PublicProfileView(generics.RetrieveAPIView):
    serializer_class = PublicProfileSerializer
    lookup_url_kwarg = "user_id"

    def get_queryset(self):
        return User.objects.filter(is_active=True).annotate(
            active_posts=Count("posts", filter=Q(posts__is_active=True, posts__status="active")),
        )


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    http_method_names = ('get', 'patch', 'delete', 'head', 'options')

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        with transaction.atomic():
            request.user = locked_user(request)
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        with transaction.atomic():
            request.user = locked_user(request)
            serializer = DeleteAccountSerializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            erase_account(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AvatarView(generics.GenericAPIView):
    serializer_class = AvatarSerializer
    parser_classes = (MultiPartParser, FormParser)

    def put(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            user = locked_user(request)
            old = (user.avatar.storage, user.avatar.name) if user.avatar else None
            user.avatar = serializer.validated_data["avatar"]
            user.save(update_fields=["avatar"])
            if old:
                remove_files_after_commit([old])
        return Response(ProfileSerializer(user).data)

    def delete(self, request):
        with transaction.atomic():
            user = locked_user(request)
            old = (user.avatar.storage, user.avatar.name) if user.avatar else None
            user.avatar = ""
            user.save(update_fields=["avatar"])
            if old:
                remove_files_after_commit([old])
        return Response(ProfileSerializer(user).data)


class RevokeSessionsView(generics.GenericAPIView):
    serializer_class = CurrentPasswordSerializer

    def post(self, request):
        with transaction.atomic():
            request.user = locked_user(request)
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            request.user.session_version += 1
            request.user.save(update_fields=["session_version"])
            data = session_response(request.user)
        return Response(data)


class ExportAccountView(APIView):
    def get(self, request):
        from community.models import Favorite, Message, Notification, Ticket
        from posts.models import Post, PostImage

        user = request.user
        return Response({
            "exported_at": timezone.now().isoformat(),
            "profile": ProfileSerializer(user).data,
            "posts": list(Post.all_objects.filter(author=user).values(
                "id", "title", "content", "price", "kind", "condition", "status",
                "attributes", "tags", "created_at", "updated_at",
            )),
            "images": [{"post_id": str(photo.post.id), "url": photo.image.url, "is_cover": photo.is_cover} for photo in PostImage.objects.filter(post__author=user).select_related("post")],
            "favorites": list(Favorite.objects.filter(user=user).values("post__id", "created_at")),
            "messages": list(Message.objects.filter(sender=user).values(
                "id", "conversation_id", "text", "attachment", "created_at", "read_at",
            )),
            "notifications": list(Notification.objects.filter(user=user).values("text", "url", "created_at", "read_at")),
            "tickets": list(Ticket.objects.filter(user=user).values("id", "kind", "subject", "message", "status", "reply", "created_at")),
        })
