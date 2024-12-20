from django.views.generic import DetailView
from django.shortcuts import get_object_or_404
from django.contrib.auth.mixins import LoginRequiredMixin

from .models import CustomUser
from studies.models import Game


# view for user profiles
class ProfileView(LoginRequiredMixin, DetailView):
    
    model = CustomUser
    context_object_name = 'user'
    template_name = 'account/profile.html'
    slug_field = 'username'
    slug_url_kwarg = 'username'

    def get_object(self, queryset=None):
        username = self.kwargs.get(self.slug_url_kwarg)
        return get_object_or_404(CustomUser, username=username)

    def get_context_data(self, **kwargs):
        context =  super().get_context_data(**kwargs)
        user = self.get_object()
        context["saved_games"] = Game.objects.filter(user=user).order_by('-updated_at')
        return context
    