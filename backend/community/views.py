from django.db import connection, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from community.models import Conversation, Favorite, Message, Notification, Ticket
from community.serializers import ConversationSerializer, MessageInputSerializer, MessageSerializer, NotificationSerializer, TicketSerializer
from posts.models import Post


def conversations_for(user):
    return Conversation.objects.filter(Q(buyer=user) | Q(seller=user)).select_related('buyer', 'seller', 'post').prefetch_related('messages')


class HealthView(APIView):
    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        return Response({'status': 'ok'})


class FavoritesView(APIView):
    def get(self, request):
        ids = Favorite.objects.filter(user=request.user, post__is_active=True).filter(Q(post__status='active') | Q(post__author=request.user)).values_list('post__id', flat=True)
        return Response([str(value) for value in ids])


class FavoriteDetailView(APIView):
    def put(self, request, post_id):
        post = get_object_or_404(Post.objects.filter(Q(status='active') | Q(author=request.user)), id=post_id)
        Favorite.objects.get_or_create(user=request.user, post=post)
        return Response({'favorite': True})

    def delete(self, request, post_id):
        Favorite.objects.filter(user=request.user, post__id=post_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConversationListView(APIView):
    def get(self, request):
        return Response(ConversationSerializer(conversations_for(request.user), many=True, context={'request': request}).data)

    @transaction.atomic
    def post(self, request):
        post_id = serializers.UUIDField().run_validation(request.data.get('post_id'))
        post = get_object_or_404(Post.objects.select_for_update(), id=post_id, status='active')
        if post.author_id == request.user.id:
            raise serializers.ValidationError('Você não pode iniciar uma conversa consigo mesmo.')
        conversation, created = Conversation.objects.get_or_create(post=post, buyer=request.user, defaults={'seller': post.author})
        return Response(ConversationSerializer(conversation, context={'request': request}).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ConversationMessagesView(APIView):
    @transaction.atomic
    def post(self, request, conversation_id):
        conversation = get_object_or_404(Conversation.objects.select_for_update().filter(Q(buyer=request.user) | Q(seller=request.user)), id=conversation_id)
        if not conversation.buyer.is_active or not conversation.seller.is_active:
            raise serializers.ValidationError('Esta conversa foi encerrada porque uma das contas foi excluída.')
        serializer = MessageInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = Message.objects.create(conversation=conversation, sender=request.user, **serializer.validated_data)
        conversation.save(update_fields=('updated_at',))
        recipient = conversation.seller_id if conversation.buyer_id == request.user.id else conversation.buyer_id
        Notification.objects.create(user_id=recipient, text=f'{request.user.name} enviou uma mensagem.', url=f'/chat/{conversation.id}')
        return Response(MessageSerializer(message, context={'request': request}).data, status=status.HTTP_201_CREATED)


class ConversationReadView(APIView):
    def post(self, request, conversation_id):
        conversation = get_object_or_404(conversations_for(request.user), id=conversation_id)
        conversation.messages.exclude(sender=request.user).filter(read_at__isnull=True).update(read_at=timezone.now())
        Notification.objects.filter(user=request.user, url=f'/chat/{conversation_id}', read_at__isnull=True).update(read_at=timezone.now())
        return Response({'read': True})


class ConversationFavoriteView(APIView):
    def patch(self, request, conversation_id):
        serializer = serializers.BooleanField()
        value = serializer.run_validation(request.data.get('favorite'))
        conversation = get_object_or_404(conversations_for(request.user), id=conversation_id)
        field = 'buyer_favorite' if conversation.buyer_id == request.user.id else 'seller_favorite'
        setattr(conversation, field, value)
        conversation.save(update_fields=(field,))
        return Response({'favorite': value})


class NotificationsView(APIView):
    def get(self, request):
        entries = Notification.objects.filter(user=request.user)
        return Response({'unread': entries.filter(read_at__isnull=True).count(), 'results': NotificationSerializer(entries[:100], many=True).data})

    def post(self, request):
        Notification.objects.filter(user=request.user, read_at__isnull=True).update(read_at=timezone.now())
        return Response({'read': True})


class TicketsView(APIView):
    def get(self, request):
        return Response(TicketSerializer(Ticket.objects.filter(user=request.user)[:100], many=True).data)

    def post(self, request):
        serializer = TicketSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        post_id, conversation_id = data.pop('post_id', None), data.pop('conversation_id', None)
        if post_id:
            data['post'] = get_object_or_404(Post.objects.filter(Q(status='active') | Q(author=request.user)), id=post_id)
        if conversation_id:
            data['conversation'] = get_object_or_404(conversations_for(request.user), id=conversation_id)
        ticket = Ticket.objects.create(user=request.user, **data)
        return Response(TicketSerializer(ticket).data, status=status.HTTP_201_CREATED)
