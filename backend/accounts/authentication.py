from django.contrib.auth import get_user_model
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings


class SessionJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if validated_token.get("session_version", 0) != user.session_version:
            raise InvalidToken("Sua sessão foi encerrada. Entre novamente.")
        return user


class SessionRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        token = self.token_class(attrs["refresh"])
        user = get_user_model().objects.filter(
            **{api_settings.USER_ID_FIELD: token.get(api_settings.USER_ID_CLAIM)},
            is_active=True,
        ).first()
        if user is None or token.get("session_version", 0) != user.session_version:
            raise InvalidToken("Sua sessão foi encerrada. Entre novamente.")
        return super().validate(attrs)
