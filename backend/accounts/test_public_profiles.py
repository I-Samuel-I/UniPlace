from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from posts.models import Campus, Category, PickupLocation, Post


class PublicProfileTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.viewer = User.objects.create_user("viewer@ads.fiponline.edu.br", "Visitante", "UmaSenha-Forte-2026!")
        cls.seller = User.objects.create_user("seller@ads.fiponline.edu.br", "Pessoa vendedora", "UmaSenha-Forte-2026!")
        cls.empty = User.objects.create_user("empty@ads.fiponline.edu.br", "Sem anúncios", "UmaSenha-Forte-2026!")
        cls.deleted = User.objects.create_user("deleted@ads.fiponline.edu.br", "Conta excluída", "UmaSenha-Forte-2026!", is_active=False)
        cls.campus = Campus.objects.create(name="Campus de teste", city="Patos", state="PB")
        cls.hidden_campus = Campus.objects.create(name="Campus de um rascunho", city="João Pessoa", state="PB")
        cls.pickup = PickupLocation.objects.create(campus=cls.campus, name="Biblioteca")
        cls.category = Category.objects.create(name="Livros do perfil", slug="livros-do-perfil")
        for index, status in enumerate(["active", "active", "draft", "paused", "sold", "expired"]):
            Post.objects.create(author=cls.seller, title=f"Anúncio {index}", status=status, category=cls.category, campus=cls.campus if status == "active" else cls.hidden_campus)
        removed = Post.objects.create(author=cls.seller, title="Anúncio removido", status="active", campus=cls.hidden_campus)
        removed.delete()
        Post.objects.create(author=cls.viewer, title="De outra pessoa", status="active", campus=cls.campus)

    def path(self, user):
        return f"/api/profiles/{user.pk}/"

    def test_profile_requires_authentication(self):
        self.assertEqual(self.client.get(self.path(self.seller)).status_code, 401)

    def test_only_public_fields_and_active_listings_are_exposed(self):
        self.client.force_authenticate(self.viewer)
        response = self.client.get(self.path(self.seller))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.data), {"id", "name", "avatar", "member_since", "active_posts", "campuses"})
        self.assertEqual(response.data["id"], self.seller.pk)
        self.assertEqual(response.data["active_posts"], 2)
        self.assertEqual(response.data["campuses"], [{"id": str(self.campus.id), "name": self.campus.name, "city": "Patos", "state": "PB"}])
        self.assertNotIn(self.seller.email, str(response.data))
        self.assertNotIn(self.hidden_campus.name, str(response.data))

    def test_existing_user_without_listings_has_a_profile(self):
        self.client.force_authenticate(self.viewer)
        response = self.client.get(self.path(self.empty))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["active_posts"], 0)
        self.assertEqual(response.data["campuses"], [])

    def test_inactive_and_missing_accounts_are_not_found(self):
        self.client.force_authenticate(self.viewer)
        self.assertEqual(self.client.get(self.path(self.deleted)).status_code, 404)
        self.assertEqual(self.client.get("/api/profiles/999999999/").status_code, 404)

    def test_public_profile_cannot_change_another_account(self):
        self.client.force_authenticate(self.viewer)
        for method in ("patch", "post", "delete"):
            response = getattr(self.client, method)(self.path(self.seller), {"name": "Alterado"}, format="json")
            self.assertEqual(response.status_code, 405)
        self.seller.refresh_from_db()
        self.assertEqual(self.seller.name, "Pessoa vendedora")
