import uuid

from django.conf import settings
from django.db import models


class Favorite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    post = models.ForeignKey('posts.Post', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=('user', 'post'), name='unique_user_favorite')]


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey('posts.Post', on_delete=models.CASCADE)
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='buying_conversations')
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='selling_conversations')
    buyer_favorite = models.BooleanField(default=False)
    seller_favorite = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at', '-id')
        constraints = [models.UniqueConstraint(fields=('post', 'buyer'), name='unique_post_buyer_conversation')]


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.TextField(blank=True)
    # Private attachments are returned only through participant-authorized APIs,
    # never exposed by the public media server. Maximum decoded size is 2 MB.
    attachment = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ('created_at', 'id')


class Notification(models.Model):
    class Kind(models.TextChoices):
        MESSAGE = 'message', 'Mensagens'
        POST = 'post', 'Anúncios'
        SUPPORT = 'support', 'Suporte'
        SYSTEM = 'system', 'UniPlace'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.SYSTEM)
    text = models.CharField(max_length=500)
    url = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ('-created_at', '-id')
        indexes = [models.Index(fields=('user', '-created_at', '-id'), name='notice_user_created_idx')]


class Ticket(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    kind = models.CharField(max_length=10, choices=(('report', 'Denúncia'), ('support', 'Suporte')))
    post = models.ForeignKey('posts.Post', null=True, blank=True, on_delete=models.SET_NULL)
    conversation = models.ForeignKey(Conversation, null=True, blank=True, on_delete=models.SET_NULL)
    subject = models.CharField(max_length=150)
    message = models.TextField()
    status = models.CharField(max_length=12, choices=(('open', 'Aberto'), ('resolved', 'Resolvido')), default='open')
    reply = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at', '-id')
