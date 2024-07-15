from django.views.generic import DetailView
from django.shortcuts import get_object_or_404
from django.contrib.auth.mixins import LoginRequiredMixin

from .models import CustomUser


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

