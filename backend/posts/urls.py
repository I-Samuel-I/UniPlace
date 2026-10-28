from django.urls import path
from rest_framework.routers import DefaultRouter

from posts.views import CategoryViewSet, PostViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("", PostViewSet, basename="post")

urlpatterns = router.urls
