from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from posts.models import Post

User = get_user_model()


class PostCrudTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="samuel@ads.fiponline.edu.br",
            name="Samuel Gomes",
            password="UmaSenha-Forte-2026!",
        )
        self.other_user = User.objects.create_user(
            email="outra@ads.fiponline.edu.br",
            name="Outra Pessoa",
            password="UmaSenha-Forte-2026!",
        )

    def test_authenticated_user_can_create_and_read_own_posts(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/posts/",
            {"title": "Primeiro post", "content": "Conteúdo"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Post.objects.get().author, self.user)
        self.assertEqual(len(self.client.get("/api/posts/").data), 1)

    def test_user_cannot_read_another_users_posts(self):
        Post.objects.create(
            author=self.other_user,
            title="Post privado",
            content="Conteúdo",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/api/posts/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
