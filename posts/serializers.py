from rest_framework import serializers

from posts.models import Category, Post


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug")
        read_only_fields = ("id",)


class PostSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source="author.name")
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())

    class Meta:
        model = Post
        fields = (
            "id",
            "author",
            "category",
            "title",
            "content",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "author", "created_at", "updated_at")
