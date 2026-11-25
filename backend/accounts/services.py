import uuid

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from accounts.models import User
from accounts.serializers import LoginSerializer, UserSerializer
from community.models import Conversation, Favorite, Message, Notification, Ticket
from posts.models import Post, PostImage


def session_response(user):
    refresh = LoginSerializer.get_token(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh), "user": UserSerializer(user).data}


def remove_files_after_commit(files):
    def remove():
        for storage, name in files:
            if name:
                storage.delete(name)
    transaction.on_commit(remove)


@transaction.atomic
def erase_account(user):
    user = User.objects.select_for_update().get(pk=user.pk)
    posts = Post.all_objects.filter(author=user)
    photos = PostImage.objects.filter(post__author=user)
    files = [(photo.image.storage, photo.image.name) for photo in photos]
    if user.avatar:
        files.append((user.avatar.storage, user.avatar.name))
    photos.delete()
    Favorite.objects.filter(post__author=user).delete()
    Favorite.objects.filter(user=user).delete()
    Notification.objects.filter(user=user).delete()
    Ticket.objects.filter(user=user).delete()
    Message.objects.filter(sender=user).delete()
    conversation_ids = Conversation.objects.filter(Q(buyer=user) | Q(seller=user)).values_list("id", flat=True)
    Notification.objects.filter(url__in=[f"/chat/{identifier}" for identifier in conversation_ids]).update(
        text="Uma conversa com uma conta excluída foi atualizada.",
    )
    Conversation.objects.filter(buyer=user).update(buyer_favorite=False)
    Conversation.objects.filter(seller=user).update(seller_favorite=False)
    # Keep anonymous references so other participants retain their own messages.
    posts.update(
        title="Anúncio indisponível", content="", price=None,
        category=None, campus=None, pickup_location=None, attributes={}, tags=[],
        is_active=False, status=Post.Status.EXPIRED, deleted_at=timezone.now(),
    )
    user.name = "Conta excluída"
    user.email = f"deleted-{uuid.uuid4().hex}@uniplace.invalid"
    user.first_name = user.last_name = ""
    user.last_login = None
    user.avatar = ""
    user.is_active = user.is_staff = user.is_superuser = False
    user.session_version += 1
    user.set_unusable_password()
    user.save()
    user.groups.clear()
    user.user_permissions.clear()
    remove_files_after_commit(files)
