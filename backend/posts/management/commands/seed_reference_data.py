from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from posts.models import Campus, Category, PickupLocation

# Os slugs das categorias principais são os mesmos usados pelos atalhos e
# filtros do frontend (frontend/src/data/catalog.ts).
CATEGORIES = [
    ("Eletrônicos", "eletronicos", [
        ("Notebooks", "notebooks"),
        ("Monitores", "monitores"),
        ("Tablets", "tablets"),
        ("Fones de ouvido", "fones-de-ouvido"),
    ]),
    ("Celulares", "celulares", []),
    ("Eletrodomésticos", "eletrodomesticos", []),
    ("Livros", "livros", [
        ("Livros Universitários", "livros-universitarios"),
        ("Apostilas", "apostilas"),
    ]),
    ("Roupas", "roupas", []),
    ("Calçados", "calcados", []),
    ("Mochilas & Bolsas", "mochilas", []),
    ("Móveis", "moveis", []),
    ("Esportes", "esportes", []),
    ("Games & Consoles", "games", []),
    ("Beleza e Saúde", "beleza", []),
]

# Nomes de exemplo: ajuste pelo painel administrativo conforme a instituição.
CAMPUSES = [
    ("Campus 1", ["Bloco Central", "Biblioteca", "Entrada Principal"]),
    ("Campus 2", ["Bloco Central", "Biblioteca", "Entrada Principal"]),
]


class Command(BaseCommand):
    help = (
        "Cria categorias, campi e locais de retirada iniciais. "
        "Pode ser executado mais de uma vez: registros existentes são mantidos."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        created = 0

        def category(name, slug, parent=None):
            nonlocal created
            # Inclui registros inativos: nome e slug são únicos na tabela.
            found = Category.all_objects.filter(Q(slug=slug) | Q(name=name)).first()
            if found:
                return found
            created += 1
            return Category.objects.create(name=name, slug=slug, parent=parent)

        for name, slug, children in CATEGORIES:
            parent = category(name, slug)
            for child_name, child_slug in children:
                category(child_name, child_slug, parent)

        for name, locations in CAMPUSES:
            campus, was_created = Campus.all_objects.get_or_create(
                name=name, defaults={"city": "Patos", "state": "PB"},
            )
            created += was_created
            for location in locations:
                _, was_created = PickupLocation.all_objects.get_or_create(
                    campus=campus, name=location,
                )
                created += was_created

        self.stdout.write(self.style.SUCCESS(
            f"Dados de referência prontos ({created} registros criados)."
        ))
