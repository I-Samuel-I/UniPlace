from collections.abc import Mapping
from io import BytesIO
import uuid
import warnings

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    def get_avatar(self, user):
        return user.avatar.url if user.avatar else None

    class Meta:
        model = User
        fields = ("id", "name", "email", "avatar")
        read_only_fields = fields


class PublicProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    member_since = serializers.DateTimeField(source="date_joined", read_only=True)
    active_posts = serializers.IntegerField(read_only=True)
    campuses = serializers.SerializerMethodField()

    def get_avatar(self, user):
        return user.avatar.url if user.avatar else None

    def get_campuses(self, user):
        locations = user.posts.filter(status="active", campus__is_active=True).values(
            "campus__id", "campus__name", "campus__city", "campus__state",
        ).order_by("campus__name").distinct()
        return [
            {"id": str(row["campus__id"]), "name": row["campus__name"], "city": row["campus__city"], "state": row["campus__state"]}
            for row in locations
        ]

    class Meta:
        model = User
        fields = ("id", "name", "avatar", "member_since", "active_posts", "campuses")
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirmation = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    class Meta:
        model = User
        fields = ("id", "name", "email", "password", "password_confirmation")
        read_only_fields = ("id",)

    def to_internal_value(self, data):
        if not isinstance(data, Mapping):
            return super().to_internal_value(data)
        data = data.copy()
        if isinstance(data.get('email'), str):
            data['email'] = data['email'].strip().lower()
        return super().to_internal_value(data)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("O nome é obrigatório.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        domain = value.rsplit("@", 1)[-1]
        suffix = ".fiponline.edu.br"
        course = domain[: -len(suffix)] if domain.endswith(suffix) else ""
        if not course or "." in course:
            raise serializers.ValidationError(
                "Use o e-mail institucional do curso, como nome@ads.fiponline.edu.br."
            )
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirmation"]:
            raise serializers.ValidationError(
                {"password_confirmation": "As senhas não coincidem."}
            )

        user = User(name=attrs["name"], email=attrs["email"])
        try:
            validate_password(attrs["password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirmation")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["session_version"] = user.session_version
        return token

    def validate(self, attrs):
        attrs[self.username_field] = attrs[self.username_field].strip().lower()
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class ProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    def get_avatar(self, user):
        return user.avatar.url if user.avatar else None

    class Meta:
        model = User
        fields = ('id', 'name', 'email', 'date_joined', 'avatar')
        read_only_fields = ('id', 'email', 'date_joined', 'avatar')

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('O nome é obrigatório.')
        return value


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password_confirmation = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError(
                {"current_password": "A senha atual está incorreta."}
            )
        if attrs["new_password"] != attrs["new_password_confirmation"]:
            raise serializers.ValidationError(
                {"new_password_confirmation": "As senhas não coincidem."}
            )
        try:
            validate_password(attrs["new_password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                {"new_password": list(exc.messages)}
            ) from exc
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.session_version += 1
        user.save(update_fields=["password", "session_version"])
        return user


class CurrentPasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("A senha atual está incorreta.")
        return value


class DeleteAccountSerializer(CurrentPasswordSerializer):
    confirmation = serializers.CharField(trim_whitespace=False)

    def validate_confirmation(self, value):
        if value != "EXCLUIR":
            raise serializers.ValidationError("Digite EXCLUIR para confirmar.")
        return value


class AvatarSerializer(serializers.Serializer):
    avatar = serializers.ImageField()

    def validate_avatar(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Envie uma foto de até 5 MB.")
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(value) as source:
                    if source.format not in {"JPEG", "PNG", "WEBP"}:
                        raise ValueError("format")
                    if source.width * source.height > 16_000_000:
                        raise ValueError("dimensions")
                    source.verify()
                value.seek(0)
                with Image.open(value) as source:
                    image = ImageOps.exif_transpose(source)
                    image = image.convert("RGBA")
                    image.thumbnail((512, 512))
                    output = BytesIO()
                    image.save(output, format="WEBP", quality=88)
            return ContentFile(output.getvalue(), name=f"{uuid.uuid4().hex}.webp")
        except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
            raise serializers.ValidationError("Use uma imagem JPG, PNG ou WebP válida, com até 16 megapixels.") from exc
