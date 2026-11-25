from datetime import timedelta
from types import SimpleNamespace
from uuid import UUID

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from community.admin import TicketAdmin
from community.models import Conversation, Notification, Ticket
from posts.models import Campus, Category, PickupLocation, Post, PostImage


class NotificationTests(APITestCase):
    path = '/api/me/notifications/'

    @classmethod
    def setUpTestData(cls):
        users = get_user_model().objects
        cls.user = users.create_user('notice@ads.fiponline.edu.br', 'Aluno', 'UmaSenha-Forte-2026!')
        cls.other = users.create_user('other-notice@ads.fiponline.edu.br', 'Contato', 'UmaSenha-Forte-2026!')

    def setUp(self):
        self.client.force_authenticate(self.user)

    def notice(self, **kwargs):
        return Notification.objects.create(user=self.user, text='Atualização', **kwargs)

    def test_authentication_required_for_listing_and_all_mutations(self):
        notice = self.notice()
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.path).status_code, 401)
        self.assertEqual(self.client.post(self.path).status_code, 401)
        self.assertEqual(self.client.patch(f'{self.path}{notice.id}/', {'read': True}).status_code, 401)
        self.assertEqual(self.client.delete(f'{self.path}{notice.id}/').status_code, 401)

    def test_paginated_filters_keep_global_counts_private_and_order_stable(self):
        timestamp = timezone.now()
        notices = [self.notice(id=UUID(int=index), kind='message') for index in range(1, 5)]
        Notification.objects.filter(id__in=[entry.id for entry in notices]).update(created_at=timestamp)
        self.notice(kind='post', read_at=timestamp)
        Notification.objects.create(user=self.other, text='Privada', kind='message')
        first = self.client.get(self.path, {'kind': 'message', 'status': 'unread', 'page_size': 2}).data
        second = self.client.get(self.path, {'kind': 'message', 'status': 'unread', 'page_size': 2, 'page': 2}).data
        self.assertEqual(first['total'], 5)
        self.assertEqual(first['unread'], 4)
        self.assertEqual(first['count'], 4)
        self.assertEqual(first['kinds'], {'message': 4, 'post': 1, 'support': 0, 'system': 0})
        self.assertTrue(first['has_next'])
        self.assertFalse(second['has_next'])
        ids = [entry['id'] for entry in first['results'] + second['results']]
        self.assertEqual(ids, [str(UUID(int=index)) for index in (4, 3, 2, 1)])
        read = self.client.get(self.path, {'kind': 'post', 'status': 'read'}).data
        self.assertEqual(read['count'], 1)
        self.assertEqual(read['unread'], 4)
        self.assertEqual(read['results'][0]['kind'], 'post')
        self.assertEqual(self.client.get(self.path, {'page': 99}).data['results'], [])

    def test_invalid_filters_and_pagination_are_rejected(self):
        for query in ({'status': 'bad'}, {'kind': 'bad'}, {'page': 0}, {'page': 'bad'}, {'page': 1_000_001}, {'page_size': 0}, {'page_size': 101}):
            with self.subTest(query=query):
                self.assertEqual(self.client.get(self.path, query).status_code, 400)

    def test_individual_read_unread_is_idempotent_and_only_changes_read_state(self):
        notice = self.notice(kind='support', url='/suporte')
        path = f'{self.path}{notice.id}/'
        response = self.client.patch(path, {'read': True, 'user': self.other.id, 'text': 'Alterado', 'kind': 'post', 'url': '//bad.test'}, format='json')
        self.assertEqual(response.status_code, 200)
        timestamp = response.data['read_at']
        self.assertIsNotNone(timestamp)
        self.assertEqual(self.client.patch(path, {'read': True}, format='json').data['read_at'], timestamp)
        notice.refresh_from_db()
        self.assertEqual((notice.user_id, notice.text, notice.kind, notice.url), (self.user.id, 'Atualização', 'support', '/suporte'))
        self.assertIsNone(self.client.patch(path, {'read': False}, format='json').data['read_at'])
        self.assertEqual(self.client.get(self.path).data['unread'], 1)
        for payload in ({}, {'read': None}, {'read': 'bad'}):
            self.assertEqual(self.client.patch(path, payload, format='json').status_code, 400)

    def test_other_accounts_cannot_read_modify_or_delete_notifications(self):
        notice = Notification.objects.create(user=self.other, text='Privada')
        path = f'{self.path}{notice.id}/'
        self.assertEqual(self.client.get(self.path).data['results'], [])
        self.assertEqual(self.client.patch(path, {'read': True}, format='json').status_code, 404)
        self.assertEqual(self.client.delete(path).status_code, 404)
        self.client.post(self.path)
        notice.refresh_from_db()
        self.assertIsNone(notice.read_at)

    def test_mark_all_preserves_existing_read_times_and_delete_only_removes_notice(self):
        old = timezone.now() - timedelta(days=3)
        read = self.notice(read_at=old)
        unread = self.notice()
        self.assertEqual(self.client.post(self.path).data['updated'], 1)
        self.assertEqual(self.client.post(self.path).data['updated'], 0)
        read.refresh_from_db()
        unread.refresh_from_db()
        self.assertEqual(read.read_at, old)
        self.assertIsNotNone(unread.read_at)
        post = Post.objects.create(author=self.user, title='Livro')
        entry = self.notice(kind='post', url=f'/anuncios/{post.id}')
        self.assertEqual(self.client.delete(f'{self.path}{entry.id}/').status_code, 204)
        self.assertTrue(Post.objects.filter(id=post.id).exists())
        self.assertEqual(self.client.get(self.path).data['total'], 2)
        self.assertEqual(self.client.delete(f'{self.path}{entry.id}/').status_code, 404)

    def test_message_event_creates_typed_notice_for_recipient_and_chat_marks_it_read(self):
        post = Post.objects.create(author=self.other, title='Livro', status='active')
        conversation = Conversation.objects.create(post=post, buyer=self.user, seller=self.other)
        response = self.client.post(f'/api/conversations/{conversation.id}/messages/', {'text': 'Está disponível?'}, format='json')
        self.assertEqual(response.status_code, 201)
        entry = Notification.objects.get()
        self.assertEqual((entry.user_id, entry.kind, entry.url), (self.other.id, 'message', f'/chat/{conversation.id}'))
        self.client.force_authenticate(self.other)
        self.client.post(f'/api/conversations/{conversation.id}/read/')
        self.assertEqual(self.client.get(self.path).data['unread'], 0)

    def test_publication_creates_one_typed_notice_per_transition(self):
        category = Category.objects.create(name='Livros', slug='livros')
        campus = Campus.objects.create(name='Campus', city='Patos', state='PB')
        pickup = PickupLocation.objects.create(campus=campus, name='Biblioteca')
        post = Post.objects.create(author=self.user, title='Livro', content='Livro em ótimo estado', category=category, campus=campus, pickup_location=pickup, price='50', condition='used')
        PostImage.objects.create(post=post, image='posts/example.png')
        path = f'/api/posts/{post.id}/status/'
        for _ in range(2):
            self.assertEqual(self.client.patch(path, {'status': 'active'}, format='json').status_code, 200)
        entry = Notification.objects.get()
        self.assertEqual((entry.user_id, entry.kind, entry.url), (self.user.id, 'post', f'/anuncios/{post.id}'))
        self.client.patch(path, {'status': 'paused'}, format='json')
        self.client.patch(path, {'status': 'active'}, format='json')
        self.assertEqual(Notification.objects.count(), 2)

    def test_support_admin_response_creates_typed_notice(self):
        ticket = Ticket.objects.create(user=self.user, kind='support', subject='Dúvida', message='Como publicar?')
        ticket.reply = 'Adicione uma foto e publique seu anúncio.'
        TicketAdmin(Ticket, admin.site).save_model(SimpleNamespace(user=self.other), ticket, SimpleNamespace(changed_data=['reply']), True)
        entry = Notification.objects.get()
        self.assertEqual((entry.user_id, entry.kind, entry.url), (self.user.id, 'support', '/suporte'))
