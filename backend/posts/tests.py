from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from posts.models import Category, Post

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
        self.category = Category.objects.create(
            name="Eletrônicos", slug="eletronicos"
        )

    def test_authenticated_user_can_create_and_read_own_posts(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/posts/",
            {
                "category": self.category.pkid,
                "title": "Primeiro post",
                "content": "Conteúdo",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        post = Post.objects.get()
        self.assertEqual(post.author, self.user)
        self.assertEqual(post.category, self.category)
        self.assertEqual(len(self.client.get("/api/posts/").data), 1)

    def test_user_cannot_read_another_users_posts(self):
        Post.objects.create(
            author=self.other_user,
            category=self.category,
            title="Post privado",
            content="Conteúdo",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/api/posts/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_category_list_and_post_category_filter(self):
        other_category = Category.objects.create(name="Livros", slug="livros")
        Post.objects.create(
            author=self.user,
            category=self.category,
            title="Notebook",
            content="Notebook usado",
        )
        Post.objects.create(
            author=self.user,
            category=other_category,
            title="Livro",
            content="Livro usado",
        )
        self.client.force_authenticate(user=self.user)

        categories_response = self.client.get("/api/posts/categories/")
        posts_response = self.client.get(
            f"/api/posts/?category={self.category.pkid}"
        )

        self.assertEqual(categories_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(categories_response.data), 3)
        self.assertEqual(posts_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(posts_response.data), 1)
        self.assertEqual(posts_response.data[0]["title"], "Notebook")
