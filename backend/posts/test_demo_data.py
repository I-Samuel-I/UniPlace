from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.models import Q
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from community.models import Conversation, Favorite, Message, Notification, Ticket
from posts.demo_data import DEMO_PASSWORD, DEMO_USERS
from posts.models import Category, Post, PostImage
from posts.serializers import validate_publication


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class DemoDataTests(TestCase):
    def setUp(self):
        self.media = TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        settings = override_settings(MEDIA_ROOT=self.media.name)
        settings.enable()
        self.addCleanup(settings.disable)
        self.owner = get_user_model().objects.create_user("owner@ads.fiponline.edu.br", "Conta existente", "SenhaOriginal#2026")

    def seed(self, **options):
        call_command("seed_demo_data", owner_email=self.owner.email, stdout=StringIO(), **options)

    def counts(self):
        return [model.objects.count() for model in [get_user_model(), Post, PostImage, Conversation, Message, Favorite, Notification, Ticket]]

    def test_complete_marketplace_is_valid_and_visible_to_the_owner(self):
        self.seed()
        self.assertEqual(get_user_model().objects.count(), 13)
        self.assertEqual(Post.objects.count(), 40)
        self.assertEqual(PostImage.objects.count(), 45)
        self.assertEqual(Conversation.objects.count(), 30)
        self.assertEqual(Message.objects.count(), 228)
        self.assertEqual(Ticket.objects.filter(user=self.owner).count(), 3)
        self.assertEqual(Conversation.objects.filter(Q(buyer=self.owner) | Q(seller=self.owner)).count(), 24)
        self.assertEqual(set(Post.objects.filter(author=self.owner).values_list("status", flat=True)), {"active", "paused", "sold", "draft", "expired"})
        for post in Post.objects.exclude(status="draft"):
            validate_publication({}, post)
            self.assertEqual(post.images.filter(is_cover=True).count(), 1)
            self.assertTrue(post.images.first().image.storage.exists(post.images.first().image.name))
            self.assertLessEqual(post.updated_at, timezone.now())
        for conversation in Conversation.objects.select_related("post"):
            self.assertNotEqual(conversation.buyer_id, conversation.seller_id)
            self.assertEqual(conversation.seller_id, conversation.post.author_id)
            self.assertFalse(conversation.messages.exclude(sender_id__in=[conversation.buyer_id, conversation.seller_id]).exists())
        self.assertTrue(Message.objects.filter(attachment__isnull=False).exists())
        self.assertTrue(Message.objects.filter(read_at__isnull=True).exists())
        self.assertTrue(Message.objects.filter(read_at__isnull=False).exists())
        client = APIClient()
        client.force_authenticate(self.owner)
        self.assertEqual(client.get("/api/posts/").data["count"], 34)
        self.assertEqual(client.get("/api/me/posts/").data["count"], 8)
        self.assertEqual(len(client.get("/api/conversations/").data), 24)
        self.assertEqual(len(client.get("/api/me/favorites/").data), 10)
        notices = client.get("/api/me/notifications/").data
        self.assertTrue(notices["has_next"])
        self.assertTrue(all(notices["kinds"].values()))
        self.assertGreater(notices["unread"], 0)
        self.assertLess(notices["unread"], notices["total"])
        client.force_authenticate(None)
        login = client.post("/api/auth/login/", {"email": DEMO_USERS[0][1], "password": DEMO_PASSWORD})
        self.assertEqual(login.status_code, 200)

    def test_repeat_run_preserves_records_edits_read_receipts_and_passwords(self):
        original_hash = self.owner.password
        self.seed()
        expected_counts = self.counts()
        expected_files = sorted(str(path) for path in Path(self.media.name).rglob("*") if path.is_file())
        post = Post.objects.filter(author=self.owner, status="active").first()
        post.title = "Título alterado durante o teste"
        post.status = "paused"
        post.save()
        message = Message.objects.filter(read_at__isnull=True).first()
        message.read_at = timezone.now()
        message.save()
        self.seed()
        post.refresh_from_db()
        message.refresh_from_db()
        self.owner.refresh_from_db()
        self.assertEqual(self.counts(), expected_counts)
        self.assertEqual(post.title, "Título alterado durante o teste")
        self.assertEqual(post.status, "paused")
        self.assertIsNotNone(message.read_at)
        self.assertEqual(self.owner.password, original_hash)
        self.assertEqual(sorted(str(path) for path in Path(self.media.name).rglob("*") if path.is_file()), expected_files)

    def test_missing_owner_or_missing_photos_does_not_write_data(self):
        with self.assertRaises(CommandError):
            call_command("seed_demo_data", owner_email="missing@ads.fiponline.edu.br", stdout=StringIO())
        with self.assertRaises(CommandError):
            self.seed(assets_dir=self.media.name)
        self.assertEqual(self.counts(), [1, 0, 0, 0, 0, 0, 0, 0])

    def test_failure_rolls_back_database_and_removes_only_new_files(self):
        original_categories = Category.objects.count()
        kept = Path(self.media.name) / "existing.txt"
        kept.write_text("Arquivo anterior", encoding="utf-8")
        with patch("posts.management.commands.seed_demo_data.Command.seed_posts", side_effect=RuntimeError("Falha simulada")):
            with self.assertRaises(RuntimeError):
                self.seed()
        self.assertEqual(self.counts(), [1, 0, 0, 0, 0, 0, 0, 0])
        self.assertEqual(Category.objects.count(), original_categories)
        self.assertEqual([path for path in Path(self.media.name).rglob("*") if path.is_file()], [kept])
