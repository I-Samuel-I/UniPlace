from django.urls import path

from community import views

urlpatterns = [
    path('health/', views.HealthView.as_view()),
    path('me/favorites/', views.FavoritesView.as_view()),
    path('me/favorites/<uuid:post_id>/', views.FavoriteDetailView.as_view()),
    path('conversations/', views.ConversationListView.as_view()),
    path('conversations/<uuid:conversation_id>/messages/', views.ConversationMessagesView.as_view()),
    path('conversations/<uuid:conversation_id>/read/', views.ConversationReadView.as_view()),
    path('conversations/<uuid:conversation_id>/favorite/', views.ConversationFavoriteView.as_view()),
    path('me/notifications/', views.NotificationsView.as_view()),
    path('me/tickets/', views.TicketsView.as_view()),
]
