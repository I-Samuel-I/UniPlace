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
            Notification.objects.create(user=obj.user, text=f'Atualização do chamado: {obj.subject}', url='/suporte')


admin.site.register((Conversation, Message, Favorite, Notification))
