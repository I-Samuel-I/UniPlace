import base64
import binascii
from io import BytesIO

from PIL import Image, UnidentifiedImageError
from rest_framework import serializers

from community.models import Conversation, Message, Notification, Ticket


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ('id', 'sender', 'text', 'attachment', 'created_at', 'read_at')

    def get_sender(self, obj):
        return 'me' if obj.sender_id == self.context['request'].user.id else 'contact'


class MessageInputSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=5000, required=False, allow_blank=True, default='')
    attachment = serializers.JSONField(required=False, allow_null=True)

    def validate_attachment(self, value):
        if value is None:
            return None
        if not isinstance(value, dict) or set(value) != {'name', 'url', 'type'}:
            raise serializers.ValidationError('Anexo inválido.')
        name, url, mime = value['name'], value['url'], value['type']
        formats = {'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WEBP'}
        if not isinstance(mime, str) or mime not in (*formats, 'application/pdf') or not isinstance(name, str) or not 1 <= len(name) <= 200:
            raise serializers.ValidationError('Envie uma imagem JPG, PNG, WebP ou PDF.')
        prefix = f'data:{mime};base64,'
        if not isinstance(url, str) or not url.startswith(prefix) or len(url) > 2_800_000:
            raise serializers.ValidationError('O anexo deve ter até 2 MB.')
        try:
            data = base64.b64decode(url[len(prefix):], validate=True)
            if not data or len(data) > 2 * 1024 * 1024:
                raise ValueError('size')
            if mime == 'application/pdf':
                if not data.startswith(b'%PDF-'):
                    raise ValueError('pdf')
            else:
                with Image.open(BytesIO(data)) as image:
                    if image.format != formats[mime]:
                        raise ValueError('format')
                    image.verify()
        except (ValueError, binascii.Error, UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
            raise serializers.ValidationError('Arquivo inválido ou maior que 2 MB.') from exc
        return {'name': name, 'type': mime, 'url': prefix + base64.b64encode(data).decode()}

    def validate(self, attrs):
        if not attrs['text'].strip() and not attrs.get('attachment'):
            raise serializers.ValidationError('Escreva uma mensagem ou anexe um arquivo.')
        return attrs


class ConversationSerializer(serializers.ModelSerializer):
    contact = serializers.SerializerMethodField()
    product_id = serializers.UUIDField(source='post.id', read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    unread = serializers.SerializerMethodField()
    favorite = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ('id', 'contact', 'product_id', 'messages', 'unread', 'favorite', 'updated_at')

    def get_contact(self, obj):
        other = obj.seller if obj.buyer_id == self.context['request'].user.id else obj.buyer
        return {'id': str(other.id), 'name': other.name, 'member_since': other.date_joined.isoformat(), 'avatar': other.avatar.url if other.avatar else None, 'is_active': other.is_active}

    def get_unread(self, obj):
        user_id = self.context['request'].user.id
        return sum(message.sender_id != user_id and message.read_at is None for message in obj.messages.all())

    def get_favorite(self, obj):
        return obj.buyer_favorite if obj.buyer_id == self.context['request'].user.id else obj.seller_favorite


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'kind', 'text', 'url', 'created_at', 'read_at')


class NotificationQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=('all', 'unread', 'read'), default='all')
    kind = serializers.ChoiceField(choices=('all', *Notification.Kind.values), default='all')
    page = serializers.IntegerField(min_value=1, max_value=1_000_000, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=20)


class NotificationReadSerializer(serializers.Serializer):
    read = serializers.BooleanField()


class TicketSerializer(serializers.ModelSerializer):
    post_id = serializers.UUIDField(required=False, write_only=True)
    conversation_id = serializers.UUIDField(required=False, write_only=True)

    class Meta:
        model = Ticket
        fields = ('id', 'kind', 'subject', 'message', 'status', 'reply', 'created_at', 'post_id', 'conversation_id')
        read_only_fields = ('id', 'status', 'reply', 'created_at')
        extra_kwargs = {'subject': {'max_length': 150}, 'message': {'max_length': 5000}}
