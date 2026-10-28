import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from commons.models import BaseModel


class Category(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT,
        related_name="children",
    )

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        if self.parent_id and (self.parent_id == self.pk or self.parent.parent_id):
            raise ValidationError({"parent": "Use uma categoria principal como pai."})
        if self.parent_id and self.pk and self.children.exists():
            raise ValidationError({"parent": "Uma categoria com subcategorias deve ser principal."})


class Campus(BaseModel):
    name = models.CharField(max_length=120, unique=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class PickupLocation(BaseModel):
    campus = models.ForeignKey(Campus, on_delete=models.PROTECT, related_name="pickup_locations")
    name = models.CharField(max_length=120)

    class Meta:
        ordering = ("name",)
        constraints = [models.UniqueConstraint(fields=("campus", "name"), name="unique_campus_pickup_name")]

    def __str__(self):
        return f"{self.campus} — {self.name}"


class Post(BaseModel):
    class Kind(models.TextChoices):
        PRODUCT = "product", "Produto"
        SERVICE = "service", "Serviço"

    class Condition(models.TextChoices):
        NEW = "new", "Novo / lacrado"
        LIKE_NEW = "like_new", "Usado — como novo"
        USED = "used", "Com marcas de uso"

    class Status(models.TextChoices):
        DRAFT = "draft", "Rascunho"
        ACTIVE = "active", "Ativo"
        PAUSED = "paused", "Pausado"
        SOLD = "sold", "Vendido"
        EXPIRED = "expired", "Expirado"

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="posts",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="posts",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=200, blank=True)
    content = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.PRODUCT)
    condition = models.CharField(max_length=10, choices=Condition.choices, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT, db_index=True)
    campus = models.ForeignKey(Campus, null=True, blank=True, on_delete=models.PROTECT, related_name="posts")
    pickup_location = models.ForeignKey(PickupLocation, null=True, blank=True, on_delete=models.PROTECT, related_name="posts")
    accepts_negotiation = models.BooleanField(default=False)
    accepts_trade = models.BooleanField(default=False)
    attributes = models.JSONField(default=dict, blank=True)
    tags = models.JSONField(default=list, blank=True)
    is_featured = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at", "-pkid")
        constraints = [models.CheckConstraint(condition=models.Q(price__gte=0) | models.Q(price__isnull=True), name="post_nonnegative_price")]

    def __str__(self):
        return self.title or "Rascunho"


def post_image_path(instance, filename):
    # Do not expose the original filename in public media URLs.
    extension = filename.rsplit(".", 1)[-1].lower()
    return f"posts/{instance.post.id}/{uuid.uuid4()}.{extension}"


class PostImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to=post_image_path)
    position = models.PositiveIntegerField(default=0)
    is_cover = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("position", "created_at", "id")
        constraints = [models.UniqueConstraint(fields=("post",), condition=models.Q(is_cover=True), name="one_cover_per_post")]
