from django.urls import path

from .views import ProfileView


urlpatterns = [
    path('<str:username>/', ProfileView.as_view(), name='profile'),
]

