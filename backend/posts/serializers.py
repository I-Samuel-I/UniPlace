from django.utils import timezone
from django.db.models import Q
from rest_framework import serializers

from posts.models import Campus, Category, PickupLocation, Post, PostImage


class CategorySerializer(serializers.ModelSerializer):
    parent = serializers.SlugRelatedField(slug_field="id", read_only=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "parent", "children")

    def get_children(self, obj):
        return [
            {"id": str(child.id), "name": child.name, "slug": child.slug}
            for child in obj.children.all()
        ]


class CampusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campus
        fields = ("id", "name", "city", "state")


class PickupLocationSerializer(serializers.ModelSerializer):
    campus = serializers.SlugRelatedField(slug_field="id", read_only=True)

    class Meta:
        model = PickupLocation
        fields = ("id", "name", "campus")


class PostImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostImage
        fields = ("id", "image", "position", "is_cover")
        read_only_fields = ("id",)

    def validate_image(self, image):
        if image.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Cada foto deve ter no máximo 5 MB.")
        if image.image.format not in {"JPEG", "PNG", "WEBP"}:
            raise serializers.ValidationError("Envie uma imagem JPEG, PNG ou WebP.")
        extension = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}[image.image.format]
        image.name = f"photo.{extension}"
        return image


class PostImageUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostImage
        fields = ("position", "is_cover")


def validate_publication(data, instance=None):
    def value(field):
        return data.get(field, getattr(instance, field, None))

    errors = {}
    for field in ("title", "content", "category", "price", "campus", "pickup_location"):
        if value(field) is None or value(field) == "":
            errors[field] = "Este campo é obrigatório para publicar."
    if value("kind") != Post.Kind.SERVICE and not value("condition"):
        errors["condition"] = "Informe a condição do produto."
    if instance is None or not instance.pk or not instance.images.exists():
        errors["images"] = "Adicione pelo menos uma foto antes de publicar."
    category, campus, pickup = value("category"), value("campus"), value("pickup_location")
    if category and (not category.is_active or (category.parent and not category.parent.is_active)):
        errors["category"] = "Selecione uma categoria ativa."
    if campus and not campus.is_active:
        errors["campus"] = "Selecione um campus ativo."
    if pickup and (not pickup.is_active or not pickup.campus.is_active):
        errors["pickup_location"] = "Selecione um local de retirada ativo."
    if pickup and campus and pickup.campus_id != campus.pk:
        errors["pickup_location"] = "O local de retirada deve pertencer ao campus selecionado."
    if errors:
        raise serializers.ValidationError(errors)


class PostSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source="author.name")
    seller = serializers.SerializerMethodField()
    category = serializers.SlugRelatedField(slug_field="id", queryset=Category.objects.filter(Q(parent__isnull=True) | Q(parent__is_active=True)), required=False, allow_null=True)
    campus = serializers.SlugRelatedField(slug_field="id", queryset=Campus.objects.all(), required=False, allow_null=True)
    pickup_location = serializers.SlugRelatedField(slug_field="id", queryset=PickupLocation.objects.filter(campus__is_active=True), required=False, allow_null=True)
    category_name = serializers.ReadOnlyField(source="category.name", default=None)
    campus_name = serializers.ReadOnlyField(source="campus.name", default=None)
    pickup_location_name = serializers.ReadOnlyField(source="pickup_location.name", default=None)
    images = PostImageSerializer(many=True, read_only=True)
    cover = serializers.SerializerMethodField()
    status = serializers.ChoiceField(choices=Post.Status.choices, required=False)

    class Meta:
        model = Post
        fields = (
            "id", "author", "seller", "category", "category_name", "title", "content",
            "price", "kind", "condition", "status", "campus", "campus_name",
            "pickup_location", "pickup_location_name", "accepts_negotiation", "accepts_trade",
            "attributes", "tags", "is_featured", "images", "cover", "published_at",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "is_featured", "published_at", "created_at", "updated_at")

    def get_seller(self, obj):
        return {"id": obj.author_id, "name": obj.author.name, "member_since": obj.author.date_joined}

    def get_cover(self, obj):
        images = list(obj.images.all())
        cover = next((image for image in images if image.is_cover), images[0] if images else None)
        return PostImageSerializer(cover, context=self.context).data if cover else None

    def validate_attributes(self, value):
        if not isinstance(value, dict) or len(value) > 30:
            raise serializers.ValidationError("Envie um objeto com até 30 características.")
        if any(not isinstance(key, str) or not key.strip() or len(key) > 80 or not isinstance(item, str) or len(item) > 500 for key, item in value.items()):
            raise serializers.ValidationError("Use nomes de até 80 caracteres e valores de texto de até 500 caracteres.")
        return value

    def validate_tags(self, value):
        if not isinstance(value, list) or len(value) > 20 or any(not isinstance(tag, str) or not tag.strip() or len(tag) > 50 for tag in value):
            raise serializers.ValidationError("Envie uma lista com até 20 tags de até 50 caracteres.")
        return list(dict.fromkeys(tag.strip() for tag in value))

    def validate(self, attrs):
        if "status" in attrs:
            if self.instance and attrs["status"] != self.instance.status:
                raise serializers.ValidationError({"status": "Use a rota /status/ para alterar o estado do anúncio."})
            if not self.instance and attrs["status"] != Post.Status.DRAFT:
                raise serializers.ValidationError({"status": "Crie um rascunho, envie fotos e depois publique pela rota /status/."})
        campus = attrs.get("campus", getattr(self.instance, "campus", None))
        pickup = attrs.get("pickup_location", getattr(self.instance, "pickup_location", None))
        if pickup and (campus is None or pickup.campus_id != campus.pk):
            raise serializers.ValidationError({"pickup_location": "O local de retirada deve pertencer ao campus selecionado."})
        if self.instance and self.instance.status == Post.Status.ACTIVE:
            validate_publication(attrs, self.instance)
        return attrs


class PostStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Post.Status.choices)

    def validate_status(self, value):
        instance = self.instance
        allowed = {
            Post.Status.DRAFT: {Post.Status.ACTIVE},
            Post.Status.ACTIVE: {Post.Status.PAUSED, Post.Status.SOLD, Post.Status.EXPIRED},
            Post.Status.PAUSED: {Post.Status.ACTIVE, Post.Status.SOLD, Post.Status.EXPIRED},
            Post.Status.SOLD: {Post.Status.ACTIVE},
            Post.Status.EXPIRED: {Post.Status.ACTIVE},
        }
        if value != instance.status and value not in allowed[instance.status]:
            raise serializers.ValidationError("Transição de status não permitida.")
        return value

    def validate(self, attrs):
        if attrs["status"] == Post.Status.ACTIVE:
            validate_publication({}, self.instance)
        return attrs

    def update(self, instance, validated_data):
        instance.status = validated_data["status"]
        if instance.status == Post.Status.ACTIVE and instance.published_at is None:
            instance.published_at = timezone.now()
        instance.updated_by = self.context["request"].user
        instance.save(update_fields=("status", "published_at", "updated_by", "updated_at"))
        return instance
