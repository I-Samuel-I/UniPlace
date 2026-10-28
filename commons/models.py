import uuid
from django.utils import timezone

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import QuerySet
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

class BaseModelQuerySet(QuerySet):
    """QuerySet customizado para BaseModel.

    Fornece métodos adicionais para trabalhar com soft delete e filtragem
    de registros ativos/inativos.
    """

    def delete(self):
        """Soft delete em todos os objetos do queryset."""
        [x.delete() for x in self]

    def hard_delete(self):
        """Delete permanente em todos os objetos do queryset."""
        [x.hard_delete() for x in self]

    def active(self):
        """Filtra apenas registros ativos (is_active=True)."""
        return self.filter(is_active=True)

    def inactive(self):
        """Filtra apenas registros inativos (is_active=False)."""
        return self.filter(is_active=False)


class BaseModelManager(models.Manager):
    """Manager customizado para BaseModel.

    Este manager implementa funcionalidades específicas para trabalhar com
    soft delete, fornecendo métodos para filtrar apenas registros ativos
    por padrão e permitir acesso a todos os registros quando necessário.

    Características:
    - Por padrão, filtra apenas registros ativos (is_active=True)
    - Fornece método all_objects() para acessar todos os registros
    - Implementa hard_delete() para remoção permanente
    """

    use_for_related_fields = True

    def __init__(self, *args, **kwargs):
 
        self.active_only = kwargs.pop("active_only", True)
        super(BaseModelManager, self).__init__(*args, **kwargs)

    def all_objects(self):
        """Retorna um queryset com todos os objetos, incluindo inativos."""
        return BaseModelQuerySet(self.model)

    def get_queryset(self):
        """Override do método get_queryset para implementar soft delete."""
        if self.active_only:
            return BaseModelQuerySet(self.model).filter(is_active=True)
        return BaseModelQuerySet(self.model)

    def hard_delete(self):
        """Remove permanentemente todos os registros do queryset."""
        self.get_queryset().hard_delete()


class BaseModel(models.Model):
    """Modelo base com soft delete e rastreabilidade completa.

    Este modelo fornece funcionalidades comuns a todos os modelos do sistema:
    - Soft delete: registros são marcados como inativos em vez de removidos
    - Rastreabilidade: tracking de criação, atualização e remoção
    - UUID: identificador único além da chave primária sequencial
    - Timestamps automáticos

    """

    class Meta:
        """Configuração do modelo base."""

        ordering = ("-created_at",)
        abstract = True

    # Chave primária sequencial para performance
    pkid = models.BigAutoField(primary_key=True, editable=False)

    # UUID para identificação externa
    id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    # Campos de rastreabilidade de criação
    created_at = models.DateTimeField(
        _("Criado em"), auto_now_add=True, null=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_("Criado por"),
        on_delete=models.DO_NOTHING,
        related_name="%(class)s_creator",
        null=True,
    )

    # Campos de rastreabilidade de atualização
    updated_at = models.DateTimeField(_("Atualizado em"), auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_("Atualizado por"),
        on_delete=models.DO_NOTHING,
        related_name="%(class)s_updator",
        blank=True,
        null=True,
    )

    # Campos de rastreabilidade de remoção (soft delete)
    deleted_at = models.DateTimeField(_("Deletado em"), blank=True, null=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name=_("Deletado por"),
        on_delete=models.DO_NOTHING,
        related_name="%(class)s_remover",
        blank=True,
        null=True,
    )

    # Flag de soft delete
    is_active = models.BooleanField(
        editable=False, default=True, verbose_name=_("Está ativo?")
    )

    # Managers para controle de soft delete
    objects = BaseModelManager()  # Apenas registros ativos
    all_objects = BaseModelManager(active_only=False)  # Todos os registros

    def delete(self, **kwargs):
        """Implementa soft delete em vez de remoção física.

        Marca o registro como inativo (is_active=False) e registra
        informações de rastreabilidade da remoção.

        Args:
            **kwargs: Argumentos nomeados incluindo:
                deleted_by: Usuário que solicitou a remoção
                deleted_at: Timestamp da remoção

        """
        self.is_active = False
        if "deleted_by" in kwargs:
            self.deleted_by = kwargs["deleted_by"]
        if "deleted_at" in kwargs:
            self.deleted_at = kwargs["deleted_at"]
        self.save()

