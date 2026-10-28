from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class RegistrationTests(APITestCase):
    def test_registers_institutional_email_and_hashes_password(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "name": "Samuel Gomes",
                "email": "SAMUEL@ads.fiponline.edu.br",
                "password": "UmaSenha-Forte-2026!",
                "password_confirmation": "UmaSenha-Forte-2026!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["email"], "samuel@ads.fiponline.edu.br")
        self.assertNotIn("password", response.data)
        user = User.objects.get(email="samuel@ads.fiponline.edu.br")
        self.assertTrue(user.check_password("UmaSenha-Forte-2026!"))

    def test_rejects_non_institutional_email(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "name": "Samuel Gomes",
                "email": "samuel@gmail.com",
                "password": "UmaSenha-Forte-2026!",
                "password_confirmation": "UmaSenha-Forte-2026!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.exists())

    def test_rejects_root_domain_without_course_subdomain(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "name": "Samuel Gomes",
                "email": "samuel@fiponline.edu.br",
                "password": "UmaSenha-Forte-2026!",
                "password_confirmation": "UmaSenha-Forte-2026!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_domain_with_more_than_one_course_subdomain(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "name": "Samuel Gomes",
                "email": "samuel@ads.extra.fiponline.edu.br",
                "password": "UmaSenha-Forte-2026!",
                "password_confirmation": "UmaSenha-Forte-2026!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_mismatched_password_confirmation(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "name": "Samuel Gomes",
                "email": "samuel@ads.fiponline.edu.br",
                "password": "UmaSenha-Forte-2026!",
                "password_confirmation": "OutraSenha-Forte-2026!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.exists())


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="samuel@ads.fiponline.edu.br",
            name="Samuel Gomes",
            password="UmaSenha-Forte-2026!",
        )

    def test_login_returns_tokens_and_user(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": self.user.email, "password": "UmaSenha-Forte-2026!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], self.user.email)

    def test_password_change_requires_authentication(self):
        response = self.client.post(
            "/api/auth/password/",
            {
                "current_password": "UmaSenha-Forte-2026!",
                "new_password": "OutraSenha-Forte-2026!",
                "new_password_confirmation": "OutraSenha-Forte-2026!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token_returns_access_for_marketplace(self):
        login = self.client.post(
            "/api/auth/login/",
            {"email": self.user.email, "password": "UmaSenha-Forte-2026!"},
            format="json",
        )
        response = self.client.post(
            "/api/auth/refresh/", {"refresh": login.data["refresh"]}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')
        self.assertEqual(self.client.get("/api/posts/").status_code, status.HTTP_200_OK)

    def test_authenticated_user_can_change_password(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/auth/password/",
            {
                "current_password": "UmaSenha-Forte-2026!",
                "new_password": "OutraSenha-Forte-2026!",
                "new_password_confirmation": "OutraSenha-Forte-2026!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OutraSenha-Forte-2026!"))


class AdminTests(APITestCase):
    def test_admin_can_open_custom_user_creation_form(self):
        admin = User.objects.create_superuser(
            email="admin@ads.fiponline.edu.br",
            name="Admin",
            password="UmaSenha-Forte-2026!",
        )
        self.client.force_login(admin)

        response = self.client.get("/admin/accounts/user/add/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
