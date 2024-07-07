from django.views.generic import ListView, DetailView, TemplateView
from django.urls import reverse
from django.shortcuts import get_object_or_404, redirect
from django.contrib.auth.mixins import LoginRequiredMixin

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
            tag_puzzles = Puzzle.objects.filter(tags=tag)
            count = tag_puzzles.count()
            first = tag_puzzles.first()
            if first:
                puzzles_per_tag_count[tag.name] = {
                    'count': count,
                    'url': reverse('tag_puzzle_list', kwargs={'tag': tag.name, 'pk': first.pk})
                }
            else:
                puzzles_per_tag_count[tag.name] = {
                    'count': count,
                    'url': reverse('puzzle_home')
                }
        
        context["puzzles_per_tag_count"] = puzzles_per_tag_count
        
        return context
    
# view for list of puzzles by tag
class TagPuzzleListView(LoginRequiredMixin, ListView):
    
    model = Puzzle
    context_object_name = 'puzzles'
    template_name = 'puzzles/puzzles_by_tag.html'

    def get_queryset(self):
        tag = self.kwargs['tag']
        return Puzzle.objects.filter(tags__name=tag)
    
    def get_next_puzzle_id(self):
        next_puzzle = (self.get_queryset()
                       .exclude(id__in=self.request.user.solved_puzzles.all())
                       .exclude(id=self.kwargs['pk'])
                       .order_by('id')
                       .first())

        # If there's no next puzzle, get the first puzzle
        if not next_puzzle:
            next_puzzle = (self.get_queryset()
                           .order_by('id')
                           .first())
            
        return next_puzzle.pk if next_puzzle else None

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['tag'] = self.kwargs['tag']
        context['detail_puzzle'] = get_object_or_404(Puzzle, id=self.kwargs['pk'])

        context['next_puzzle_id'] = self.get_next_puzzle_id()
        return context

    def post(self, request, *args, **kwargs):
        puzzle = Puzzle.objects.get(id=self.kwargs['pk'])
        user_solution = request.POST.get('solution', '').strip() 

        if user_solution.lower() == puzzle.solution.lower():
            request.user.solved_puzzles.add(puzzle)
            return redirect('tag_puzzle_list', tag=self.kwargs['tag'], pk=self.get_next_puzzle_id())  
        else:
            return self.get(request, *args, **kwargs)
    

class PuzzleDetailView(DetailView):
    model = Puzzle
    context_object_name = 'puzzle'
    template_name = 'puzzles/puzzle_detail.html'