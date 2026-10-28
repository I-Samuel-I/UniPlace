from django.db.models import Q
from rest_framework import filters, serializers
from rest_framework.pagination import PageNumberPagination

from posts.models import Post


class MarketplacePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class PostQuerySerializer(serializers.Serializer):
    category = serializers.UUIDField(required=False)
    campus = serializers.ListField(child=serializers.UUIDField(), required=False)
    pickup_location = serializers.ListField(child=serializers.UUIDField(), required=False)
    seller = serializers.IntegerField(required=False, min_value=1)
    price_min = serializers.DecimalField(required=False, max_digits=12, decimal_places=2, min_value=0)
    price_max = serializers.DecimalField(required=False, max_digits=12, decimal_places=2, min_value=0)
    kind = serializers.ChoiceField(required=False, choices=Post.Kind.choices)
    condition = serializers.ListField(child=serializers.ChoiceField(choices=Post.Condition.choices), required=False)
    status = serializers.ChoiceField(required=False, choices=Post.Status.choices)
    accepts_negotiation = serializers.BooleanField(required=False)
    accepts_trade = serializers.BooleanField(required=False)
    has_photos = serializers.BooleanField(required=False)
    featured = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if attrs.get("price_min", 0) > attrs.get("price_max", float("inf")):
            raise serializers.ValidationError({"price_max": "O máximo deve ser maior ou igual ao mínimo."})
        return attrs


class MarketplaceFilter(filters.BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        serializer = PostQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data
        if "category" in params:
            category = params["category"]
            queryset = queryset.filter(Q(category__id=category) | Q(category__parent__id=category))
        for param, field in {
            "campus": "campus__id__in", "pickup_location": "pickup_location__id__in",
            "seller": "author_id", "price_min": "price__gte", "price_max": "price__lte",
            "kind": "kind", "condition": "condition__in", "accepts_negotiation": "accepts_negotiation",
            "accepts_trade": "accepts_trade", "featured": "is_featured",
        }.items():
            if param in params:
                queryset = queryset.filter(**{field: params[param]})
        if "has_photos" in params:
            queryset = queryset.filter(images__isnull=not params["has_photos"]).distinct()
        if getattr(view, "owner_listing", False) and view.action == "list" and "status" in params:
            queryset = queryset.filter(status=params["status"])
        return queryset
