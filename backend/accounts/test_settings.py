from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from community.models import Conversation, Favorite, Message, Notification, Ticket
from posts.models import Post, PostImage

User = get_user_model()
PASSWORD = "UmaSenha-Forte-2026!"


def image_file(format="PNG", size=(800, 600)):
    output = BytesIO()
    image = Image.new("RGB", size, "orange")
    exif = Image.Exif()
    exif[270] = "private image description"
    image.save(output, format=format, **({"exif": exif} if format == "JPEG" else {}))
    return SimpleUploadedFile(f"original-private-name.{format.lower()}", output.getvalue(), content_type=f"image/{format.lower()}")


class AccountSettingsTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user("settings@ads.fiponline.edu.br", "Minha Conta", PASSWORD)
        cls.other = User.objects.create_user("other@ads.fiponline.edu.br", "Outra Conta", PASSWORD)
        cls.post = Post.objects.create(author=cls.user, title="Meu livro", content="Minha descrição", status="active")
        cls.other_post = Post.objects.create(author=cls.other, title="Outro livro", status="active")
        cls.conversation = Conversation.objects.create(post=cls.post, buyer=cls.other, seller=cls.user)

    def setUp(self):
        self.media = TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        override = override_settings(MEDIA_ROOT=self.media.name)
        override.enable()
        self.addCleanup(override.disable)
        self.client.force_authenticate(self.user)

    def login(self, user=None):
        self.client.force_authenticate(None)
        response = self.client.post("/api/auth/login/", {"email": (user or self.user).email, "password": PASSWORD}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def bearer(self, token):
        self.client.force_authenticate(None)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_all_account_operations_require_authentication(self):
        self.client.force_authenticate(None)
        for method, path, data in [
            ("get", "/api/me/export/", None),
            ("delete", "/api/me/", {"current_password": PASSWORD, "confirmation": "EXCLUIR"}),
            ("delete", "/api/me/avatar/", None),
            ("post", "/api/me/sessions/revoke/", {"current_password": PASSWORD}),
        ]:
            with self.subTest(path=path, method=method):
                response = getattr(self.client, method)(path, data, format="json")
                self.assertEqual(response.status_code, 401)

    def test_profile_cannot_change_email_permissions_or_session_version(self):
        response = self.client.patch("/api/me/", {"name": " Nome atualizado ", "email": self.other.email, "avatar": "/arbitrary-file", "session_version": 100, "is_staff": True}, format="json")
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.name, "Nome atualizado")
        self.assertEqual(self.user.email, "settings@ads.fiponline.edu.br")
        self.assertEqual(self.user.session_version, 0)
        self.assertFalse(self.user.is_staff)
        self.assertFalse(self.user.avatar)
        self.assertEqual(response.data["avatar"], None)

    def test_avatar_is_resized_metadata_is_removed_and_url_is_shared_with_profile(self):
        response = self.client.put("/api/me/avatar/", {"avatar": image_file("JPEG")}, format="multipart")
        self.assertEqual(response.status_code, 200, response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.avatar.name.startswith("avatars/"))
        self.assertTrue(self.user.avatar.name.endswith(".webp"))
        self.assertNotIn("private", self.user.avatar.name)
        with Image.open(self.user.avatar.path) as image:
            self.assertEqual(image.format, "WEBP")
            self.assertLessEqual(max(image.size), 512)
            self.assertFalse(image.getexif())
        self.assertEqual(self.client.get("/api/me/").data["avatar"], response.data["avatar"])
        post = self.client.get(f"/api/posts/{self.post.id}/")
        self.assertEqual(post.data["seller"]["avatar"], response.data["avatar"])
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get("/api/conversations/").data[0]["contact"]["avatar"], response.data["avatar"])

    def test_replacing_and_removing_avatar_removes_old_files_after_commit(self):
        self.client.put("/api/me/avatar/", {"avatar": image_file()}, format="multipart")
        self.user.refresh_from_db()
        old = Path(self.user.avatar.path)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.put("/api/me/avatar/", {"avatar": image_file()}, format="multipart")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(old.exists())
        self.user.refresh_from_db()
        current = Path(self.user.avatar.path)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.delete("/api/me/avatar/")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["avatar"])
        self.assertFalse(current.exists())

    def test_avatar_rejects_unsupported_corrupt_oversized_and_high_resolution_files(self):
        cases = [
            image_file("GIF"),
            SimpleUploadedFile("fake.png", b"not an image", content_type="image/png"),
            SimpleUploadedFile("big.png", image_file().read() + b"x" * (5 * 1024 * 1024), content_type="image/png"),
            image_file(size=(4001, 4000)),
        ]
        for file in cases:
            with self.subTest(file=file.name):
                response = self.client.put("/api/me/avatar/", {"avatar": file}, format="multipart")
                self.assertEqual(response.status_code, 400, response.data)
        self.user.refresh_from_db()
        self.assertFalse(self.user.avatar)

    def test_photo_changes_only_the_authenticated_account(self):
        self.client.put("/api/me/avatar/", {"avatar": image_file(), "user_id": self.other.id}, format="multipart")
        self.user.refresh_from_db()
        self.other.refresh_from_db()
        self.assertTrue(self.user.avatar)
        self.assertFalse(self.other.avatar)

    def test_export_contains_only_own_data_and_no_password_or_tokens(self):
        Message.objects.create(conversation=self.conversation, sender=self.user, text="Minha mensagem")
        Message.objects.create(conversation=self.conversation, sender=self.other, text="Mensagem de outra pessoa")
        Ticket.objects.create(user=self.user, kind="support", subject="Meu chamado", message="Meu texto")
        Ticket.objects.create(user=self.other, kind="support", subject="Privado", message="Outro texto")
        Favorite.objects.create(user=self.user, post=self.other_post)
        response = self.client.get("/api/me/export/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile"]["id"], self.user.id)
        self.assertEqual([post["title"] for post in response.data["posts"]], ["Meu livro"])
        self.assertEqual([message["text"] for message in response.data["messages"]], ["Minha mensagem"])
        self.assertEqual([ticket["subject"] for ticket in response.data["tickets"]], ["Meu chamado"])
        self.assertNotIn(self.other.email, response.content.decode())
        self.assertNotIn(self.user.password, response.content.decode())
        self.assertNotIn("password", response.content.decode())
        self.assertNotIn("refresh", response.data)

    def test_revoke_sessions_rejects_wrong_password(self):
        response = self.client.post("/api/me/sessions/revoke/", {"current_password": "wrong"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.session_version, 0)

    def test_revoke_invalidates_old_access_and_refresh_but_preserves_new_session(self):
        first = self.login()
        second = self.login()
        self.bearer(first["access"])
        response = self.client.post("/api/me/sessions/revoke/", {"current_password": PASSWORD}, format="json")
        self.assertEqual(response.status_code, 200)
        new = response.data
        for tokens in (first, second):
            self.bearer(tokens["access"])
            self.assertEqual(self.client.get("/api/me/").status_code, 401)
            self.assertEqual(self.client.post("/api/auth/refresh/", {"refresh": tokens["refresh"]}, format="json").status_code, 401)
        self.bearer(new["access"])
        self.assertEqual(self.client.get("/api/me/").status_code, 200)
        self.assertEqual(self.client.post("/api/auth/refresh/", {"refresh": new["refresh"]}, format="json").status_code, 200)

    def test_changing_password_invalidates_previous_sessions(self):
        old = self.login()
        self.bearer(old["access"])
        response = self.client.post("/api/auth/password/", {"current_password": PASSWORD, "new_password": "UmaSenha-Nova-Segura-2026!", "new_password_confirmation": "UmaSenha-Nova-Segura-2026!"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        new = response.data
        self.bearer(old["access"])
        self.assertEqual(self.client.get("/api/me/").status_code, 401)
        self.assertEqual(self.client.post("/api/auth/refresh/", {"refresh": old["refresh"]}, format="json").status_code, 401)
        self.bearer(new["access"])
        self.assertEqual(self.client.get("/api/me/").status_code, 200)

    def test_delete_requires_correct_password_and_explicit_confirmation(self):
        for data in ({}, {"current_password": "wrong", "confirmation": "EXCLUIR"}, {"current_password": PASSWORD, "confirmation": "excluir"}):
            self.assertEqual(self.client.delete("/api/me/", data, format="json").status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)
        self.assertTrue(Post.objects.filter(pk=self.post.pk).exists())

    def test_delete_erases_own_data_and_files_preserving_other_participants_history(self):
        self.client.put("/api/me/avatar/", {"avatar": image_file()}, format="multipart")
        self.user.refresh_from_db()
        avatar_path = Path(self.user.avatar.path)
        photo = PostImage.objects.create(post=self.post, image=image_file())
        photo_path = Path(photo.image.path)
        own_message = Message.objects.create(conversation=self.conversation, sender=self.user, text="Minha mensagem privada")
        other_message = Message.objects.create(conversation=self.conversation, sender=self.other, text="Mensagem preservada")
        Favorite.objects.create(user=self.user, post=self.other_post)
        Favorite.objects.create(user=self.other, post=self.post)
        Notification.objects.create(user=self.user, text="Minha notificação")
        other_notice = Notification.objects.create(user=self.other, text="Minha Conta enviou uma mensagem", url=f"/chat/{self.conversation.id}")
        Ticket.objects.create(user=self.user, kind="support", subject="Meu chamado", message="Meu texto")
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.delete("/api/me/", {"current_password": PASSWORD, "confirmation": "EXCLUIR"}, format="json")
        self.assertEqual(response.status_code, 204)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertFalse(self.user.has_usable_password())
        self.assertEqual(self.user.name, "Conta excluída")
        self.assertNotEqual(self.user.email, "settings@ads.fiponline.edu.br")
        self.assertFalse(avatar_path.exists())
        self.assertFalse(photo_path.exists())
        self.assertFalse(Post.objects.filter(author=self.user).exists())
        self.assertEqual(Post.all_objects.get(pk=self.post.pk).content, "")
        self.assertFalse(Message.objects.filter(pk=own_message.pk).exists())
        self.assertTrue(Message.objects.filter(pk=other_message.pk).exists())
        self.assertFalse(Ticket.objects.filter(user=self.user).exists())
        self.assertFalse(Favorite.objects.filter(user=self.user).exists())
        self.assertFalse(Notification.objects.filter(user=self.user).exists())
        other_notice.refresh_from_db()
        self.assertNotIn("Minha Conta", other_notice.text)
        self.other.refresh_from_db()
        self.assertTrue(self.other.is_active)
        self.assertTrue(Post.objects.filter(pk=self.other_post.pk).exists())
        self.client.force_authenticate(self.other)
        conversation = self.client.get("/api/conversations/").data[0]
        self.assertEqual(conversation["contact"]["name"], "Conta excluída")
        self.assertEqual([message["text"] for message in conversation["messages"]], ["Mensagem preservada"])
        self.assertFalse(conversation["contact"]["is_active"])
        self.assertEqual(self.client.post(f"/api/conversations/{self.conversation.id}/messages/", {"text": "Nova mensagem"}, format="json").status_code, 400)

    def test_deleted_account_cannot_use_previous_tokens_or_login(self):
        tokens = self.login()
        self.bearer(tokens["access"])
        response = self.client.delete("/api/me/", {"current_password": PASSWORD, "confirmation": "EXCLUIR"}, format="json")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.client.get("/api/me/").status_code, 401)
        self.assertEqual(self.client.post("/api/auth/refresh/", {"refresh": tokens["refresh"]}, format="json").status_code, 401)
        self.assertEqual(self.client.post("/api/auth/login/", {"email": "settings@ads.fiponline.edu.br", "password": PASSWORD}, format="json").status_code, 401)
