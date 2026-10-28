from django import forms
from django.contrib import admin
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from posts.models import Campus, Category, PickupLocation, Post
from posts.serializers import validate_publication


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "parent", "is_active")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


class PostAdminForm(forms.ModelForm):
    class Meta:
        model = Post
        fields = "__all__"

    def clean(self):
        data = super().clean()
        if data.get("status") == Post.Status.ACTIVE:
            try:
                validate_publication(data, self.instance)
            except ValidationError as exc:
                raise forms.ValidationError(str(exc.detail)) from exc
        return data


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    form = PostAdminForm
    list_display = ("title", "category", "author", "status", "price", "is_featured", "created_at")
    search_fields = ("title", "content", "author__email", "category__name")
    list_filter = ("status", "kind", "category", "campus", "is_featured", "created_at")
    readonly_fields = ("published_at",)

    def save_model(self, request, obj, form, change):
        if obj.status == Post.Status.ACTIVE and obj.published_at is None:
            obj.published_at = timezone.now()
        obj.updated_by = request.user
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Campus)
class CampusAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "state", "is_active")
    search_fields = ("name", "city")


@admin.register(PickupLocation)
class PickupLocationAdmin(admin.ModelAdmin):
    list_display = ("name", "campus", "is_active")
    list_filter = ("campus",)
