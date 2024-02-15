from django.views.generic import ListView, TemplateView
from django.urls import reverse

from .models import Puzzle, Tag

# view for list of tags
class PuzzleHome(ListView):
    
    model = Tag
    context_object_name = 'tags'
    template_name = 'puzzles/puzzle_home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        tags = Tag.objects.all()
        puzzles_per_tag_count = {}

        for tag in tags:
            count = Puzzle.objects.filter(tags=tag).count()
            puzzles_per_tag_count[tag.name] = {
                'count': count,
                'url': reverse('tag_puzzle_list', kwargs={'tag': tag.name})
            }
        
        context["puzzles_per_tag_count"] = puzzles_per_tag_count
        
        return context
    
# view for list of puzzles by tag
class TagPuzzleListView(ListView):
    
    model = Puzzle
    context_object_name = 'puzzles'
    template_name = 'puzzles/puzzles_by_tag.html'

    def get_queryset(self):
        tag = self.kwargs['tag']
        return Puzzle.objects.filter(tags__name=tag)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['tag'] = self.kwargs['tag']
        return context
