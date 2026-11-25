import base64
from io import BytesIO

from django.contrib.auth import get_user_model
from PIL import Image
from rest_framework.test import APITestCase

from community.models import Conversation, Message, Notification, Ticket
from posts.models import Post

User = get_user_model()


class CommunityTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.seller = User.objects.create_user('seller@ads.fiponline.edu.br', 'Vendedor', 'UmaSenha-Forte-2026!')
        cls.buyer = User.objects.create_user('buyer@ads.fiponline.edu.br', 'Comprador', 'UmaSenha-Forte-2026!')
        cls.outsider = User.objects.create_user('other@ads.fiponline.edu.br', 'Outra', 'UmaSenha-Forte-2026!')
        cls.post = Post.objects.create(author=cls.seller, title='Livro', status='active')
        cls.conversation = Conversation.objects.create(post=cls.post, buyer=cls.buyer, seller=cls.seller)

    def setUp(self):
        self.client.force_authenticate(self.buyer)

    def test_new_endpoints_require_authentication(self):
        self.client.force_authenticate(None)
        for path in ('/api/me/', '/api/me/favorites/', '/api/conversations/', '/api/me/notifications/', '/api/me/tickets/'):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 401)
        self.assertEqual(self.client.get('/api/health/').status_code, 200)

    def test_favorites_persist_per_account_and_are_idempotent(self):
        path = f'/api/me/favorites/{self.post.id}/'
        self.assertEqual(self.client.put(path).status_code, 200)
        self.assertEqual(self.client.put(path).status_code, 200)
        self.assertEqual(self.client.get('/api/me/favorites/').data, [str(self.post.id)])
        self.client.force_authenticate(self.seller)
        self.assertEqual(self.client.get('/api/me/favorites/').data, [])
        self.client.force_authenticate(self.buyer)
        self.assertEqual(self.client.delete(path).status_code, 204)
        self.assertEqual(self.client.get('/api/me/favorites/').data, [])

    def test_private_or_deleted_posts_cannot_be_favorited_by_others(self):
        draft = Post.objects.create(author=self.seller)
        self.assertEqual(self.client.put(f'/api/me/favorites/{draft.id}/').status_code, 404)
        self.client.put(f'/api/me/favorites/{self.post.id}/')
        self.post.delete()
        self.assertEqual(self.client.get('/api/me/favorites/').data, [])

    def test_conversation_creation_reuses_thread_and_requires_available_post(self):
        path = '/api/conversations/'
        for _ in range(2):
            response = self.client.post(path, {'post_id': str(self.post.id)}, format='json')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(str(response.data['id']), str(self.conversation.id))
        self.client.force_authenticate(self.seller)
        self.assertEqual(self.client.post(path, {'post_id': str(self.post.id)}, format='json').status_code, 400)
        self.client.force_authenticate(self.buyer)
        self.assertEqual(self.client.post(path, {'post_id': 'bad'}, format='json').status_code, 400)

    def test_messages_persist_for_both_participants_and_read_receipts(self):
        path = f'/api/conversations/{self.conversation.id}'
        response = self.client.post(path + '/messages/', {'text': 'Posso buscar na biblioteca?'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.client.get('/api/conversations/').data[0]['messages'][0]['sender'], 'me')
        self.client.force_authenticate(self.seller)
        conversation = self.client.get('/api/conversations/').data[0]
        self.assertEqual(conversation['unread'], 1)
        self.assertEqual(conversation['messages'][0]['sender'], 'contact')
        self.assertEqual(self.client.get('/api/me/notifications/').data['unread'], 1)
        self.assertEqual(self.client.post(path + '/read/').status_code, 200)
        self.assertIsNotNone(Message.objects.get().read_at)
        self.assertEqual(self.client.get('/api/me/notifications/').data['unread'], 0)
        self.assertEqual(self.client.post(path + '/messages/', {'text': 'Sim!'}, format='json').status_code, 201)
        self.assertEqual(Message.objects.count(), 2)

    def test_outsiders_cannot_read_send_mark_or_favorite_conversations(self):
        self.client.force_authenticate(self.outsider)
        self.assertEqual(self.client.get('/api/conversations/').data, [])
        path = f'/api/conversations/{self.conversation.id}'
        self.assertEqual(self.client.post(path + '/messages/', {'text': 'Intrusão'}, format='json').status_code, 404)
        self.assertEqual(self.client.post(path + '/read/').status_code, 404)
        self.assertEqual(self.client.patch(path + '/favorite/', {'favorite': True}, format='json').status_code, 404)

    def test_chat_attachments_validate_content_and_remain_private(self):
        data = BytesIO()
        Image.new('RGB', (8, 8), color='orange').save(data, format='PNG')
        attachment = {'name': 'foto.png', 'type': 'image/png', 'url': 'data:image/png;base64,' + base64.b64encode(data.getvalue()).decode()}
        path = f'/api/conversations/{self.conversation.id}/messages/'
        response = self.client.post(path, {'attachment': attachment}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['attachment'], attachment)
        for invalid in ({'url': 'https://bad.test'}, {**attachment, 'url': 'data:image/png;base64,YmFk'}, {**attachment, 'type': ['wrong']}):
            self.assertEqual(self.client.post(path, {'attachment': invalid}, format='json').status_code, 400)
        self.assertEqual(self.client.post(path, {}, format='json').status_code, 400)
        self.assertEqual(self.client.post(path, {'text': 'x' * 5001}, format='json').status_code, 400)

    def test_conversation_favorites_are_private_and_do_not_change_other_participant(self):
        path = f'/api/conversations/{self.conversation.id}/favorite/'
        self.assertEqual(self.client.patch(path, {'favorite': True}, format='json').status_code, 200)
        self.assertTrue(self.client.get('/api/conversations/').data[0]['favorite'])
        self.client.force_authenticate(self.seller)
        self.assertFalse(self.client.get('/api/conversations/').data[0]['favorite'])

    def test_support_reports_and_notifications_are_account_scoped(self):
        response = self.client.post('/api/me/tickets/', {'kind': 'report', 'subject': 'Oferta suspeita', 'message': 'Verificar descrição.', 'post_id': str(self.post.id)}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Ticket.objects.get().post, self.post)
        Notification.objects.create(user=self.buyer, text='Minha notificação')
        Notification.objects.create(user=self.seller, text='De outra conta')
        self.client.post('/api/me/notifications/')
        self.assertEqual(self.client.get('/api/me/notifications/').data['unread'], 0)
        self.client.force_authenticate(self.seller)
        self.assertEqual(self.client.get('/api/me/tickets/').data, [])
        self.assertEqual(self.client.get('/api/me/notifications/').data['unread'], 1)
        self.client.force_authenticate(self.outsider)
        response = self.client.post('/api/me/tickets/', {'kind': 'report', 'subject': 'Chat', 'message': 'Privado', 'conversation_id': str(self.conversation.id)}, format='json')
        self.assertEqual(response.status_code, 404)

    def test_profile_update_is_own_only_and_email_is_read_only(self):
        response = self.client.patch('/api/me/', {'name': ' Novo Nome ', 'email': self.seller.email, 'is_staff': True}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['name'], 'Novo Nome')
        self.assertEqual(response.data['email'], self.buyer.email)
        self.buyer.refresh_from_db()
        self.assertFalse(self.buyer.is_staff)
        self.assertEqual(self.client.patch('/api/me/', {'name': ' '}, format='json').status_code, 400)

    def test_auth_normalizes_email_before_uniqueness_and_login(self):
        self.client.force_authenticate(None)
        duplicate = self.client.post('/api/auth/register/', {'name': 'Duplicado', 'email': self.buyer.email.upper(), 'password': 'UmaSenha-Forte-2026!', 'password_confirmation': 'UmaSenha-Forte-2026!'}, format='json')
        self.assertEqual(duplicate.status_code, 400)
        malformed = self.client.post('/api/auth/register/', [], format='json')
        self.assertEqual(malformed.status_code, 400)
        login = self.client.post('/api/auth/login/', {'email': self.buyer.email.upper(), 'password': 'UmaSenha-Forte-2026!'}, format='json')
        self.assertEqual(login.status_code, 200, login.data)
