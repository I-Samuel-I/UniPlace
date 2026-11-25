import base64
from collections import Counter
from datetime import timedelta
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from uuid import UUID, uuid5

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.files import File
from django.core.files.base import ContentFile
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont

from community.models import Conversation, Favorite, Message, Notification, Ticket
from community.serializers import MessageInputSerializer
from posts.demo_data import DEMO_PASSWORD, DEMO_POSTS, DEMO_USERS
from posts.models import Campus, Category, PickupLocation, Post, PostImage
from posts.serializers import validate_publication

NAMESPACE = UUID("f4d305d3-61e1-4c16-9767-19df8b124d53")
ASSETS = Path(__file__).resolve().parents[2] / "demo_assets"


def demo_id(key):
    return uuid5(NAMESPACE, key)


class Command(BaseCommand):
    help = "Adiciona um marketplace fictício à conta indicada, sem apagar registros ou alterar senhas existentes."

    def add_arguments(self, parser):
        parser.add_argument("--owner-email", required=True, help="Conta existente que receberá anúncios, contatos e conversas de teste.")
        parser.add_argument("--assets-dir", default=str(ASSETS), help="Pasta com as fotos locais de demonstração.")

    def handle(self, *args, **options):
        User = get_user_model()
        try:
            self.owner = User.objects.get(email__iexact=options["owner_email"].strip(), is_active=True)
        except User.DoesNotExist as exc:
            raise CommandError("A conta informada não existe ou está inativa. Nenhum dado foi criado.") from exc
        self.assets = Path(options["assets_dir"])
        for filename in {name for spec in DEMO_POSTS for name in (spec.photo, *spec.gallery)}:
            path = self.assets / filename
            try:
                with Image.open(path) as image:
                    image.verify()
            except (OSError, ValueError) as exc:
                raise CommandError(f"Foto de demonstração ausente ou inválida: {path}") from exc

        self.now = timezone.now()
        self.prefix = f"owner:{self.owner.pk}:"
        self.stats = Counter()
        self.written_files = []
        try:
            with transaction.atomic():
                call_command("seed_reference_data", stdout=self.stdout)
                self.seed_users()
                self.seed_posts()
                self.seed_conversations()
                self.seed_favorites()
                self.seed_tickets()
                self.seed_activity()
        except Exception:
            # Only remove files created by this failed run; database writes roll back.
            for storage, name in reversed(self.written_files):
                storage.delete(name)
            raise

        self.stdout.write(self.style.SUCCESS(f"Demonstração pronta para {self.owner.email}."))
        for label, model in [("usuários", get_user_model()), ("anúncios", Post), ("fotos", PostImage), ("conversas", Conversation), ("mensagens", Message), ("favoritos", Favorite), ("notificações", Notification), ("chamados", Ticket)]:
            self.stdout.write(f"  {label}: {self.stats[model.__name__]} novos")
        self.stdout.write(f"Contas fictícias: demo.*@<curso>.fiponline.edu.br | Senha: {DEMO_PASSWORD}")
        self.stdout.write("O acesso da conta principal permanece com a senha que ela já utiliza.")

    def identity(self, key):
        return demo_id(self.prefix + key)

    def save_file(self, field, filename, content):
        field.save(filename, content, save=False)
        self.written_files.append((field.storage, field.name))

    def seed_users(self):
        User = get_user_model()
        self.users = []
        for index, (name, email, color) in enumerate(DEMO_USERS):
            user = User.objects.filter(email=email).first()
            if user is None:
                user = User.objects.create(email=email, name=name, password=make_password(DEMO_PASSWORD), date_joined=self.now - timedelta(days=70 + index * 19))
                avatar = Image.new("RGB", (256, 256), color)
                drawing = ImageDraw.Draw(avatar)
                initials = "".join(part[0] for part in name.split()[:2])
                drawing.text((128, 128), initials, font=ImageFont.load_default(size=83), fill="white", anchor="mm")
                output = BytesIO()
                avatar.save(output, format="WEBP", quality=88)
                self.save_file(user.avatar, f"demo-{index + 1}.webp", ContentFile(output.getvalue()))
                user.save(update_fields=("avatar",))
                self.stats[User.__name__] += 1
            self.users.append(user)

    def seed_posts(self):
        categories = {category.slug: category for category in Category.objects.select_related("parent")}
        campuses = list(Campus.objects.order_by("name"))
        locations = {campus.pk: list(PickupLocation.objects.filter(campus=campus).order_by("name")) for campus in campuses}
        if not campuses or any(not values for values in locations.values()):
            raise CommandError("São necessários campi ativos com locais de retirada.")
        self.posts = {}
        for index, spec in enumerate(DEMO_POSTS):
            author = self.owner if spec.seller is None else self.users[spec.seller]
            campus = campuses[index % len(campuses)]
            options = locations[campus.pk]
            timestamp = self.now - timedelta(days=index % 13, hours=(index * 3) % 20, minutes=30)
            if spec.status == "expired":
                timestamp = self.now - timedelta(days=45)
            post, created = Post.all_objects.get_or_create(id=self.identity(f"post:{spec.key}"), defaults={
                "author": author, "created_by": author, "updated_by": author,
                "category": categories[spec.category], "title": spec.title,
                "content": spec.description + "\n\nAnúncio fictício para testes do UniPlace. Fotos ilustrativas.",
                "price": Decimal(spec.price), "kind": spec.kind, "condition": spec.condition,
                "status": spec.status, "campus": campus, "pickup_location": options[index % len(options)],
                "accepts_negotiation": spec.negotiable, "accepts_trade": spec.trade,
                "attributes": spec.attributes, "tags": [categories[spec.category].name, "Campus", "Demonstração"],
                "is_featured": spec.featured, "published_at": None if spec.status == "draft" else timestamp,
            })
            self.posts[spec.key] = post
            if not created:
                continue
            for position, filename in enumerate((spec.photo, *spec.gallery)):
                photo = PostImage(id=self.identity(f"photo:{spec.key}:{position}"), post=post, position=position, is_cover=position == 0)
                with (self.assets / filename).open("rb") as source:
                    self.save_file(photo.image, filename, File(source))
                photo.save()
                self.stats["PostImage"] += 1
            post.full_clean()
            if post.status != "draft":
                validate_publication({}, post)
            Post.all_objects.filter(pk=post.pk).update(created_at=timestamp, updated_at=timestamp + timedelta(minutes=25))
            self.stats["Post"] += 1

    def notification(self, key, user, kind, text, url, timestamp, read_at=None):
        entry, created = Notification.objects.get_or_create(id=self.identity(f"notice:{key}"), defaults={"user": user, "kind": kind, "text": text, "url": url, "read_at": read_at})
        if created:
            Notification.objects.filter(pk=entry.pk).update(created_at=timestamp)
            self.stats["Notification"] += 1

    def conversation(self, post, buyer, index, last_at):
        conversation, created = Conversation.objects.get_or_create(post=post, buyer=buyer, defaults={
            "id": self.identity(f"conversation:{post.id}:{buyer.pk}"), "seller": post.author,
            "buyer_favorite": index % 4 == 0, "seller_favorite": index % 5 == 0,
        })
        if not created:
            return conversation
        buyer_name, seller_name = buyer.name.split()[0], post.author.name.split()[0]
        price = f"{post.price * Decimal('0.95'):,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
        lines = [
            f"Oi, {seller_name}! Vi seu anúncio de {post.title}. Ainda está disponível?",
            f"Oi, {buyer_name}! Está disponível sim. Posso levar ao campus para você conferir.",
            "Que bom! Você consegue negociar um pouco o valor?",
            f"Consigo fazer por R$ {price} para retirar no campus. Está bem conservado.",
            f"Fechado! Podemos nos encontrar na {post.pickup_location.name.lower()}?",
            "Podemos sim! Vou estar por lá depois da aula. Pode conferir tudo antes de fechar.",
            "Ótimo, combinado. Me avisa quando estiver chegando!",
            "Pode deixar! Se precisar de mais alguma informação, é só me chamar por aqui.",
        ]
        if post.author_id == self.owner.pk:
            lines = lines[:-1]
        latest_by_recipient = {}
        for number, text in enumerate(lines):
            sender = buyer if number % 2 == 0 else post.author
            recipient = post.author if number % 2 == 0 else buyer
            sent_at = last_at - timedelta(minutes=(len(lines) - number - 1) * (3 + index % 4))
            unread = number >= len(lines) - 2 and index % 3 != 2
            read_at = None if unread else sent_at + timedelta(minutes=1)
            attachment = None
            if number == 3 and index % 7 == 0:
                with post.images.first().image.open("rb") as source:
                    encoded = base64.b64encode(source.read()).decode("ascii")
                attachment = {"name": "foto-do-anuncio.jpg", "type": "image/jpeg", "url": "data:image/jpeg;base64," + encoded}
                MessageInputSerializer().validate_attachment(attachment)
                text += "\nEnviei uma foto para você conferir."
            message = Message.objects.create(id=self.identity(f"message:{conversation.pk}:{number}"), conversation=conversation, sender=sender, text=text, attachment=attachment, read_at=read_at)
            Message.objects.filter(pk=message.pk).update(created_at=sent_at)
            latest_by_recipient[recipient.pk] = (recipient, sender, sent_at, read_at)
            self.stats["Message"] += 1
        Conversation.objects.filter(pk=conversation.pk).update(created_at=last_at - timedelta(hours=2), updated_at=last_at)
        for recipient, sender, timestamp, read_at in latest_by_recipient.values():
            self.notification(f"chat:{conversation.pk}:{recipient.pk}", recipient, "message", f"{sender.name} enviou uma mensagem sobre {post.title}.", f"/chat/{conversation.pk}", timestamp, read_at)
        self.stats["Conversation"] += 1
        return conversation

    def seed_conversations(self):
        active_external = [(spec, self.posts[spec.key]) for spec in DEMO_POSTS if spec.seller is not None and spec.status == "active"]
        active_own = [self.posts[spec.key] for spec in DEMO_POSTS if spec.seller is None and spec.status == "active"]
        ages = [8, 23, 48, 90, 150, 240, 720, 1500, 1800, 2900, 4300, 7200]
        self.owner_conversations = []
        for index, user in enumerate(self.users):
            post = next(post for spec, post in active_external if spec.seller == index)
            thread = self.conversation(post, self.owner, index, self.now - timedelta(minutes=ages[index]))
            self.owner_conversations.append(thread)
            self.conversation(active_own[index % len(active_own)], user, index + 12, self.now - timedelta(minutes=ages[index] + 12))
        for index in range(6):
            spec, post = active_external[index]
            buyer = self.users[(spec.seller + 3) % len(self.users)]
            self.conversation(post, buyer, index + 24, self.now - timedelta(days=2, hours=index))

    def seed_favorites(self):
        if not self.stats["Post"]:
            return
        active = [post for post in self.posts.values() if post.status == "active" and post.is_active]
        for user in [self.owner, *self.users]:
            choices = [post for post in active if post.author_id != user.pk]
            limit = 10 if user.pk == self.owner.pk else 3
            offset = user.pk % len(choices)
            for index in range(limit):
                _, created = Favorite.objects.get_or_create(user=user, post=choices[(offset + index * 2) % len(choices)])
                self.stats["Favorite"] += int(created)

    def seed_tickets(self):
        examples = [
            ("support", "Dúvida sobre o envio de fotos", "Consigo enviar mais de uma foto no anúncio? Queria mostrar os detalhes do meu notebook.", "resolved", "Sim! Cada anúncio aceita até 12 fotos. Você pode escolher a capa e ajustar a ordem na edição.", None),
            ("report", "Anúncio com informações divergentes", "Encontrei diferenças entre o título e a descrição de um anúncio. Gostaria que a equipe verificasse.", "open", "", self.posts["iphone"]),
            ("support", "Como reativar meu anúncio?", "Meu material de anatomia está com status expirado. Gostaria de colocar o anúncio no ar novamente.", "resolved", "Abra Meus anúncios, encontre o item na aba Expirados e use a opção de reativar. Confira os dados antes de publicar novamente.", self.posts["meu-expirado"]),
        ]
        for index, (kind, subject, message, status, reply, post) in enumerate(examples):
            ticket, created = Ticket.objects.get_or_create(id=self.identity(f"ticket:{index}"), defaults={"user": self.owner, "kind": kind, "subject": subject, "message": message, "status": status, "reply": reply, "post": post})
            timestamp = self.now - timedelta(days=3 + index)
            if created:
                Ticket.objects.filter(pk=ticket.pk).update(created_at=timestamp)
                self.stats["Ticket"] += 1
            self.notification(f"ticket:{index}", self.owner, "support", f"{'Resposta ao chamado' if reply else 'Chamado registrado'}: {subject}", "/suporte", timestamp + timedelta(hours=2), timestamp + timedelta(hours=3) if index == 2 else None)

    def seed_activity(self):
        for index, post in enumerate(self.posts.values()):
            if post.status == "draft":
                continue
            state = {"active": "Anúncio publicado", "paused": "Anúncio pausado", "sold": "Venda concluída", "expired": "Anúncio expirado"}[post.status]
            timestamp = self.now - timedelta(days=index % 10, hours=3)
            self.notification(f"post:{post.id}", post.author, "post", f"{state}: {post.title}", f"/anuncios/{post.id}", timestamp, timestamp + timedelta(minutes=20) if index % 2 else None)
        for user in [self.owner, *self.users]:
            self.notification(f"welcome:{user.pk}", user, "system", "Boas-vindas ao UniPlace! Encontre seus próximos achados e combine a retirada com estudantes do campus.", "/explorar", self.now - timedelta(days=12), self.now - timedelta(days=11))
            self.notification(f"profile:{user.pk}", user, "system", "Confira seu perfil e personalize como você aparece na comunidade.", "/perfil", self.now - timedelta(days=7), None)
