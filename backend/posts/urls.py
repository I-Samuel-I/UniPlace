from django.urls import path
from rest_framework.routers import SimpleRouter

from posts.views import (
    CampusViewSet, CategoryViewSet, MyPostViewSet, PickupLocationViewSet,
    PostImageDetailView, PostImageListView, PostViewSet,
)

router = SimpleRouter()
router.register("posts/categories", CategoryViewSet, basename="category")
router.register("posts", PostViewSet, basename="post")
router.register("me/posts", MyPostViewSet, basename="my-post")
router.register("campuses", CampusViewSet, basename="campus")
router.register("pickup-locations", PickupLocationViewSet, basename="pickup-location")

urlpatterns = [
    path("posts/<uuid:post_id>/images/", PostImageListView.as_view(), name="post-image-list"),
    path("posts/<uuid:post_id>/images/<uuid:image_id>/", PostImageDetailView.as_view(), name="post-image-detail"),
    *router.urls,
]
