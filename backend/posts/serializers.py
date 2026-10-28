from rest_framework import serializers

from posts.models import Post


class PostSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source="author.name")

    class Meta:
        model = Post
        fields = ("id", "author", "title", "content", "created_at", "updated_at")
        read_only_fields = ("id", "author", "created_at", "updated_at")
