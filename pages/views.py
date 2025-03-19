from django.views.generic import TemplateView

from users.models import CustomUser

class HomePageView(TemplateView):
    template_name = 'home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["top10"] = CustomUser.objects.order_by("-puzzle_rating")[:10]
        return context