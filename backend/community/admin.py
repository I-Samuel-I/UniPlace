from django.contrib import admin

from community.models import Conversation, Favorite, Message, Notification, Ticket


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('subject', 'user', 'kind', 'status', 'created_at')
    list_filter = ('kind', 'status')
    readonly_fields = ('user', 'kind', 'subject', 'message', 'post', 'conversation', 'created_at')

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if change and {'reply', 'status'} & set(form.changed_data):
            Notification.objects.create(user=obj.user, kind=Notification.Kind.SUPPORT, text=f'Atualização do chamado: {obj.subject}', url='/suporte')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('text', 'user', 'kind', 'read_at', 'created_at')
    list_filter = ('kind', 'read_at')
    search_fields = ('text', 'user__email')
    readonly_fields = ('created_at',)


admin.site.register((Conversation, Message, Favorite))
