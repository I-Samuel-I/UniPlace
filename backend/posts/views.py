from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import filters, mixins, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from posts.filters import MarketplaceFilter, MarketplacePagination
from posts.models import Campus, Category, PickupLocation, Post, PostImage
from posts.permissions import IsPostOwnerOrReadOnly
from posts.serializers import (
    CampusSerializer, CategorySerializer, PickupLocationSerializer,
    PostImageSerializer, PostImageUpdateSerializer, PostSerializer, PostStatusSerializer,
)

UUID_REGEX = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"


def related_posts():
    return Post.objects.select_related(
        "author", "category", "category__parent", "campus", "pickup_location__campus",
    ).prefetch_related("images")


def owned_post(request, post_id):
    # Lock the parent for all writes, including photo and status changes.
    return get_object_or_404(
        Post.objects.select_for_update(), id=post_id, author=request.user,
    )


class UUIDReadOnlyViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = "id"
    lookup_value_regex = UUID_REGEX


class CategoryViewSet(UUIDReadOnlyViewSet):
    serializer_class = CategorySerializer

    def get_queryset(self):
        queryset = Category.objects.filter(
            Q(parent__isnull=True) | Q(parent__is_active=True),
        ).select_related("parent").prefetch_related("children")
        if self.action == "list":
            parent = self.request.query_params.get("parent")
            if parent:
                parent_id = serializers.UUIDField().run_validation(parent)
                return queryset.filter(parent__id=parent_id)
            return queryset.filter(parent__isnull=True)
        return queryset


class CampusViewSet(UUIDReadOnlyViewSet):
    queryset = Campus.objects.all()
    serializer_class = CampusSerializer


class PickupLocationViewSet(UUIDReadOnlyViewSet):
    serializer_class = PickupLocationSerializer

    def get_queryset(self):
        queryset = PickupLocation.objects.filter(campus__is_active=True).select_related("campus")
        campus = self.request.query_params.get("campus") if self.action == "list" else None
        if campus:
            queryset = queryset.filter(campus__id=serializers.UUIDField().run_validation(campus))
        return queryset


class PostListingMixin:
    serializer_class = PostSerializer
    pagination_class = MarketplacePagination
    filter_backends = (MarketplaceFilter, filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("title", "content", "category__name", "category__parent__name", "tags")
    ordering_fields = ("created_at", "published_at", "price", "title")
    ordering = ("-created_at", "-pkid")

    def filter_queryset(self, queryset):
        # Filters apply to collections, never to detail/update/delete lookups.
        if self.action in {"list", "summary"}:
            return super().filter_queryset(queryset)
        return queryset


class PostViewSet(PostListingMixin, viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated, IsPostOwnerOrReadOnly)
    lookup_field = "id"
    lookup_value_regex = UUID_REGEX
    http_method_names = ("get", "post", "put", "patch", "delete", "head", "options")

    def get_queryset(self):
        queryset = related_posts()
        if self.action == "list":
            return queryset.filter(status=Post.Status.ACTIVE)
        return queryset.filter(Q(status=Post.Status.ACTIVE) | Q(author=self.request.user))

    def perform_create(self, serializer):
        serializer.save(author=self.request.user, created_by=self.request.user)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        post = owned_post(request, kwargs["id"])
        serializer = self.get_serializer(post, data=request.data, partial=kwargs.pop("partial", False))
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return Response(serializer.data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        post = owned_post(request, kwargs["id"])
        post.delete(deleted_by=request.user, deleted_at=timezone.now())
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=("patch",), url_path="status")
    @transaction.atomic
    def change_status(self, request, id=None):
        post = owned_post(request, id)
        serializer = PostStatusSerializer(post, data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(self.get_serializer(post).data)


class MyPostViewSet(PostListingMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    owner_listing = True

    def get_queryset(self):
        return related_posts().filter(author=self.request.user)

    @action(detail=False, methods=("get",))
    def summary(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        counts = {value: 0 for value in Post.Status.values}
        counts.update({
            row["status"]: row["count"]
            for row in queryset.order_by().values("status").annotate(count=Count("pkid", distinct=True))
        })
        return Response({"total": sum(counts.values()), **counts})


class PostImageListView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    @transaction.atomic
    def post(self, request, post_id):
        post = owned_post(request, post_id)
        if post.images.count() >= 12:
            raise serializers.ValidationError({"image": "Cada anúncio pode ter no máximo 12 fotos."})
        serializer = PostImageSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        is_cover = serializer.validated_data.get("is_cover", False) or not post.images.exists()
        if is_cover:
            post.images.filter(is_cover=True).update(is_cover=False)
        serializer.save(post=post, is_cover=is_cover)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PostImageDetailView(APIView):
    @transaction.atomic
    def patch(self, request, post_id, image_id):
        post = owned_post(request, post_id)
        image = get_object_or_404(PostImage, id=image_id, post=post)
        serializer = PostImageUpdateSerializer(image, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get("is_cover"):
            post.images.exclude(pk=image.pk).filter(is_cover=True).update(is_cover=False)
        elif image.is_cover and serializer.validated_data.get("is_cover") is False:
            raise serializers.ValidationError({"is_cover": "Defina outra foto como capa para substituir esta."})
        serializer.save()
        return Response(PostImageSerializer(image, context={"request": request}).data)

    @transaction.atomic
    def delete(self, request, post_id, image_id):
        post = owned_post(request, post_id)
        image = get_object_or_404(PostImage, id=image_id, post=post)
        if post.status == Post.Status.ACTIVE and post.images.count() == 1:
            raise serializers.ValidationError({"image": "Um anúncio ativo deve ter ao menos uma foto. Pause-o antes de remover a última."})
        storage, name, was_cover = image.image.storage, image.image.name, image.is_cover
        image.delete()
        if was_cover:
            replacement = post.images.first()
            if replacement:
                replacement.is_cover = True
                replacement.save(update_fields=("is_cover",))
        transaction.on_commit(lambda: storage.delete(name))
        return Response(status=status.HTTP_204_NO_CONTENT)
