from io import BytesIO
from tempfile import TemporaryDirectory

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from posts.models import Campus, Category, PickupLocation, Post, PostImage

User = get_user_model()


def photo(format="PNG", padding=0):
    data = BytesIO()
    Image.new("RGB", (8, 8), color="orange").save(data, format=format)
    return SimpleUploadedFile("photo.png", data.getvalue() + b"x" * padding, content_type="image/png")


class MarketplaceTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(email="samuel@ads.fiponline.edu.br", name="Samuel", password="UmaSenha-Forte-2026!")
        cls.other_user = User.objects.create_user(email="outra@ads.fiponline.edu.br", name="Outra Pessoa", password="UmaSenha-Forte-2026!")
        cls.category = Category.objects.create(name="Eletrônicos", slug="eletronicos")
        cls.subcategory = Category.objects.create(name="Notebooks", slug="notebooks", parent=cls.category)
        cls.campus = Campus.objects.create(name="Campus Patos", city="Patos", state="PB")
        cls.other_campus = Campus.objects.create(name="Campus 2", city="Patos", state="PB")
        cls.pickup = PickupLocation.objects.create(campus=cls.campus, name="Biblioteca")
        cls.other_pickup = PickupLocation.objects.create(campus=cls.other_campus, name="Bloco Central")

    def setUp(self):
        directory = TemporaryDirectory(prefix="uniplace-tests-")
        self.addCleanup(directory.cleanup)
        media_settings = override_settings(MEDIA_ROOT=directory.name)
        media_settings.enable()
        self.addCleanup(media_settings.disable)
        self.client.force_authenticate(user=self.user)

    def post_data(self, **overrides):
        data = {
            "title": "Notebook", "content": "Notebook em bom estado", "price": "2800.00",
            "category": str(self.subcategory.id), "campus": str(self.campus.id),
            "pickup_location": str(self.pickup.id), "condition": "like_new",
        }
        data.update(overrides)
        return data

    def make_post(self, author=None, **overrides):
        data = {
            "author": author or self.user, "title": "Notebook", "content": "Notebook em bom estado",
            "price": "2800.00", "category": self.subcategory, "campus": self.campus,
            "pickup_location": self.pickup, "condition": "like_new",
        }
        data.update(overrides)
        return Post.objects.create(**data)

    def upload(self, post, **data):
        return self.client.post(f"/api/posts/{post.id}/images/", {"image": photo(), **data}, format="multipart")

    def publish(self, post):
        return self.client.patch(f"/api/posts/{post.id}/status/", {"status": "active"}, format="json")

    def test_all_marketplace_endpoints_require_authentication(self):
        self.client.force_authenticate(user=None)
        for path in ("/api/posts/", "/api/me/posts/", "/api/me/posts/summary/", "/api/posts/categories/", "/api/campuses/", "/api/pickup-locations/"):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 401)

    def test_empty_draft_can_be_created_without_publishing(self):
        response = self.client.post("/api/posts/", {}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["status"], "draft")
        post = Post.objects.get(id=response.data["id"])
        self.assertEqual(post.author, self.user)
        self.assertEqual(post.created_by, self.user)
        self.assertEqual(self.client.get("/api/posts/").data["count"], 0)
        self.assertEqual(self.client.get("/api/me/posts/").data["count"], 1)

    def test_relationships_and_details_use_uuid(self):
        response = self.client.post("/api/posts/", self.post_data(), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(str(response.data["category"]), str(self.subcategory.id))
        detail = self.client.get(f'/api/posts/{response.data["id"]}/')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(self.client.get("/api/posts/1/").status_code, 404)
        self.assertEqual(self.client.patch("/api/posts/------------------------------------/", {}).status_code, 404)
        response = self.client.post("/api/posts/", self.post_data(category=self.subcategory.pkid), format="json")
        self.assertEqual(response.status_code, 400)

    def test_catalogue_shares_active_posts_and_hides_other_states(self):
        active = self.make_post(author=self.other_user, status="active")
        for state in ("draft", "paused", "sold", "expired"):
            post = self.make_post(author=self.other_user, status=state)
            self.assertEqual(self.client.get(f"/api/posts/{post.id}/").status_code, 404)
        own_draft = self.make_post()
        response = self.client.get("/api/posts/")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(str(response.data["results"][0]["id"]), str(active.id))
        self.assertEqual(self.client.get(f"/api/posts/{own_draft.id}/").status_code, 200)

    def test_other_users_cannot_mutate_posts_or_photos(self):
        post = self.make_post(author=self.other_user, status="active")
        image = PostImage.objects.create(post=post, image="posts/test.png", is_cover=True)
        base = f"/api/posts/{post.id}/"
        self.assertEqual(self.client.get(base).status_code, 200)
        self.assertEqual(self.client.patch(base, {"title": "Invadido"}).status_code, 404)
        self.assertEqual(self.client.delete(base).status_code, 404)
        self.assertEqual(self.client.patch(base + "status/", {"status": "paused"}).status_code, 404)
        self.assertEqual(self.upload(post).status_code, 404)
        self.assertEqual(self.client.patch(base + f"images/{image.id}/", {"position": 3}).status_code, 404)
        self.assertEqual(self.client.delete(base + f"images/{image.id}/").status_code, 404)

    def test_my_posts_status_filter_and_summary_are_private(self):
        for state in ("draft", "active", "paused", "sold", "expired"):
            self.make_post(status=state)
        self.make_post(author=self.other_user, status="active")
        self.assertEqual(self.client.get("/api/me/posts/").data["count"], 5)
        response = self.client.get("/api/me/posts/?status=paused")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["status"], "paused")
        summary = self.client.get("/api/me/posts/summary/?status=paused").data
        self.assertEqual(summary, {"total": 5, "draft": 1, "active": 1, "paused": 1, "sold": 1, "expired": 1})

    def test_search_category_parent_price_and_ordering(self):
        self.make_post(status="active", price="500.00", tags=["estudo"])
        self.make_post(status="active", price="1000.00")
        self.make_post(status="active", title="Cadeira", content="Escritório", price="200.00")
        response = self.client.get(f"/api/posts/?search=Notebook&category={self.category.id}&price_min=400&price_max=1200&ordering=price&page_size=1")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["count"], 2)
        self.assertIsNotNone(response.data["next"])
        self.assertEqual(response.data["results"][0]["price"], "500.00")
        self.assertEqual(self.client.get("/api/posts/?search=estudo").data["count"], 1)

    def test_repeated_location_condition_and_boolean_filters(self):
        self.make_post(status="active", condition="new", accepts_trade=True)
        self.make_post(status="active", condition="used", campus=self.other_campus, pickup_location=self.other_pickup, accepts_trade=True)
        self.make_post(status="active", condition="like_new")
        query = f"campus={self.campus.id}&campus={self.other_campus.id}&condition=new&condition=used&accepts_trade=true"
        response = self.client.get(f"/api/posts/?{query}")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["count"], 2)

    def test_featured_photo_and_seller_filters(self):
        post = self.make_post(status="active", is_featured=True, author=self.other_user)
        self.make_post(status="active")
        PostImage.objects.create(post=post, image="posts/example.png", is_cover=True)
        response = self.client.get(f"/api/posts/?featured=true&has_photos=true&seller={self.other_user.pk}")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["seller"]["name"], self.other_user.name)
        self.assertNotIn("email", response.data["results"][0]["seller"])

    def test_photo_filters_do_not_duplicate_posts_or_summary_counts(self):
        post = self.make_post(status="active")
        self.upload(post)
        self.upload(post)
        self.assertEqual(self.client.get("/api/posts/?has_photos=true").data["count"], 1)
        summary = self.client.get("/api/me/posts/summary/?has_photos=true").data
        self.assertEqual(summary["total"], 1)
        self.assertEqual(summary["active"], 1)

    def test_invalid_filters_are_client_errors(self):
        for query in ("category=invalid", "campus=invalid", "price_min=-1", "price_min=abc", "price_min=100&price_max=10", "condition=broken", "accepts_trade=maybe", "seller=abc"):
            with self.subTest(query=query):
                self.assertEqual(self.client.get(f"/api/posts/?{query}").status_code, 400)

    def test_draft_photo_and_publication_workflow(self):
        response = self.client.post("/api/posts/", self.post_data(), format="json")
        post = Post.objects.get(id=response.data["id"])
        self.assertEqual(self.publish(post).status_code, 400)
        upload = self.upload(post)
        self.assertEqual(upload.status_code, 201, upload.data)
        self.assertTrue(upload.data["is_cover"])
        response = self.publish(post)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["status"], "active")
        post.refresh_from_db()
        published_at = post.published_at
        for state in ("paused", "active", "sold", "active", "expired", "active"):
            response = self.client.patch(f"/api/posts/{post.id}/status/", {"status": state}, format="json")
            self.assertEqual(response.status_code, 200, response.data)
        post.refresh_from_db()
        self.assertEqual(post.published_at, published_at)
        self.assertEqual(post.updated_by, self.user)

    def test_incomplete_draft_cannot_be_published(self):
        post = self.make_post(title="", content="", category=None, price=None, campus=None, pickup_location=None, condition="")
        response = self.publish(post)
        self.assertEqual(response.status_code, 400)
        for field in ("title", "content", "category", "price", "campus", "pickup_location", "condition", "images"):
            self.assertIn(field, response.data)

    def test_status_cannot_bypass_publication_validation(self):
        response = self.client.post("/api/posts/", self.post_data(status="active"), format="json")
        self.assertEqual(response.status_code, 400)
        post = self.make_post()
        self.assertEqual(self.client.patch(f"/api/posts/{post.id}/", {"status": "active"}).status_code, 400)
        self.assertEqual(self.client.patch(f"/api/posts/{post.id}/status/", {"status": "sold"}).status_code, 400)

    def test_active_post_cannot_be_edited_into_invalid_state(self):
        post = self.make_post()
        self.upload(post)
        self.assertEqual(self.publish(post).status_code, 200)
        for patch in ({"title": ""}, {"price": None}, {"category": None}, {"condition": ""}):
            self.assertEqual(self.client.patch(f"/api/posts/{post.id}/", patch, format="json").status_code, 400)
        response = self.client.patch(f"/api/posts/{post.id}/", {"title": "Título atualizado"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)

    def test_service_can_be_free_and_have_no_item_condition(self):
        post = self.make_post(kind="service", price=0, condition="")
        self.upload(post)
        self.assertEqual(self.publish(post).status_code, 200)

    def test_pickup_must_belong_to_selected_campus(self):
        for data in (self.post_data(pickup_location=str(self.other_pickup.id)), self.post_data(campus=None)):
            response = self.client.post("/api/posts/", data, format="json")
            self.assertEqual(response.status_code, 400)
            self.assertIn("pickup_location", response.data)

    def test_price_attributes_and_tags_are_validated(self):
        for patch in ({"price": "-0.01"}, {"attributes": []}, {"attributes": {"RAM": {"value": 8}}}, {"tags": "notebook"}, {"tags": [""]}):
            self.assertEqual(self.client.post("/api/posts/", self.post_data(**patch), format="json").status_code, 400)
        response = self.client.post("/api/posts/", self.post_data(attributes={"RAM": "8 GB"}, tags=[" Apple ", "Apple"]), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["tags"], ["Apple"])

    def test_owner_and_featured_fields_cannot_be_forged(self):
        response = self.client.post("/api/posts/", self.post_data(author=self.other_user.pk, seller={"id": self.other_user.pk}, is_featured=True), format="json")
        self.assertEqual(response.status_code, 201)
        post = Post.objects.get(id=response.data["id"])
        self.assertEqual(post.author_id, self.user.pk)
        self.assertFalse(post.is_featured)

    def test_image_validation_rejects_fake_unsupported_and_oversize_files(self):
        post = self.make_post()
        for upload in (SimpleUploadedFile("fake.png", b"not an image", content_type="image/png"), photo("BMP"), photo(padding=5 * 1024 * 1024)):
            response = self.client.post(f"/api/posts/{post.id}/images/", {"image": upload}, format="multipart")
            self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(post.images.count(), 0)

    def test_image_cover_order_and_delete_replacement(self):
        post = self.make_post()
        first = self.upload(post, position=2).data
        second = self.upload(post, position=1).data
        self.assertTrue(first["is_cover"])
        self.assertFalse(second["is_cover"])
        image_url = f'/api/posts/{post.id}/images/{second["id"]}/'
        response = self.client.patch(image_url, {"is_cover": True, "position": 0}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        detail = self.client.get(f"/api/posts/{post.id}/").data
        self.assertEqual(detail["cover"]["id"], second["id"])
        self.assertEqual(detail["images"][0]["id"], second["id"])
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.client.delete(image_url).status_code, 204)
        detail = self.client.get(f"/api/posts/{post.id}/").data
        self.assertEqual(detail["cover"]["id"], first["id"])

    def test_last_active_image_cannot_be_removed(self):
        post = self.make_post()
        image = self.upload(post).data
        self.publish(post)
        self.assertEqual(self.client.delete(f'/api/posts/{post.id}/images/{image["id"]}/').status_code, 400)
        self.assertEqual(post.images.count(), 1)

    def test_images_are_scoped_to_their_post_and_limit_is_enforced(self):
        post = self.make_post()
        other_post = self.make_post()
        image = PostImage.objects.create(post=other_post, image="posts/other.png")
        self.assertEqual(self.client.patch(f"/api/posts/{post.id}/images/{image.id}/", {"is_cover": True}).status_code, 404)
        for position in range(12):
            PostImage.objects.create(post=post, image="posts/example.png", position=position)
        self.assertEqual(self.upload(post).status_code, 400)

    def test_soft_delete_hides_post_and_preserves_audit(self):
        post = self.make_post(status="active")
        self.assertEqual(self.client.delete(f"/api/posts/{post.id}/").status_code, 204)
        self.assertFalse(Post.objects.filter(pk=post.pk).exists())
        deleted = Post.all_objects.get(pk=post.pk)
        self.assertFalse(deleted.is_active)
        self.assertEqual(deleted.deleted_by, self.user)
        self.assertIsNotNone(deleted.deleted_at)
        self.assertEqual(self.client.get(f"/api/posts/{post.id}/").status_code, 404)
        self.assertEqual(self.client.get("/api/me/posts/summary/").data["total"], 0)

    def test_category_tree_and_location_endpoints(self):
        response = self.client.get("/api/posts/categories/")
        row = next(row for row in response.data if str(row["id"]) == str(self.category.id))
        self.assertEqual(row["children"][0]["id"], str(self.subcategory.id))
        self.assertEqual(len(self.client.get(f"/api/posts/categories/?parent={self.category.id}").data), 1)
        self.assertEqual(self.client.get(f"/api/posts/categories/{self.subcategory.id}/").status_code, 200)
        self.assertEqual(len(self.client.get("/api/campuses/").data), 2)
        self.assertEqual(len(self.client.get(f"/api/pickup-locations/?campus={self.campus.id}").data), 1)
        self.assertEqual(self.client.get("/api/pickup-locations/?campus=bad").status_code, 400)

    def test_inactive_reference_data_cannot_be_used_or_published(self):
        self.campus.delete()
        response = self.client.post("/api/posts/", self.post_data(), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(len(self.client.get("/api/campuses/").data), 1)
        self.assertEqual(len(self.client.get(f"/api/pickup-locations/?campus={self.campus.id}").data), 0)
        post = self.make_post()
        self.upload(post)
        self.assertEqual(self.publish(post).status_code, 400)

    def test_category_hierarchy_rejects_cycles_and_third_level(self):
        self.category.parent = self.category
        with self.assertRaises(ValidationError):
            self.category.full_clean()
        third = Category(name="Ultrabooks", slug="ultrabooks", parent=self.subcategory)
        with self.assertRaises(ValidationError):
            third.full_clean()

    def test_admin_cannot_publish_a_new_post_without_photos(self):
        from posts.admin import PostAdminForm

        data = self.post_data(status="active", kind="product", author=self.user.pk)
        data.update(category=self.subcategory.pkid, campus=self.campus.pkid, pickup_location=self.pickup.pkid)
        form = PostAdminForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn("__all__", form.errors)
