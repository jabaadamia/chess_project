from django.views.generic import ListView, DetailView, TemplateView
from django.urls import reverse
from django.shortcuts import get_object_or_404, redirect
from django.contrib.auth.mixins import LoginRequiredMixin

from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
import json

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
                    'user_solved_count': None,
                    'url': reverse('tag_puzzle_list', kwargs={'tag': tag.name, 'pk': first.pk})
                }
            else:
                puzzles_per_tag_count[tag.name] = {
                    'count': count,
                    'user_solved_count': None,
                    'url': reverse('puzzle_home')
                }
            # Calculate user solved count per tag
            if self.request.user.is_authenticated:
                puzzles_per_tag_count[tag.name]['user_solved_count'] = self.request.user.solved_puzzles.filter(tags=tag).count()
        
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

        
    @method_decorator(csrf_protect)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)


    def post(self, request, *args, **kwargs):
        puzzle = get_object_or_404(Puzzle, id=self.kwargs['pk'])
        data = json.loads(request.body)
        current_solution = data.get('current_solution', '').strip()
        return self.validate_solution(request, puzzle, current_solution)

    def validate_solution(self, request, puzzle, current_solution):
        is_correct = puzzle.solution.lower().startswith(current_solution.lower())
        is_complete = puzzle.solution.lower() == current_solution.lower()
        
        if is_correct:
            next_move = None
            if not is_complete:
                # Get the next move in the solution
                solution_moves = puzzle.solution.split()
                current_moves = current_solution.split()
                if len(solution_moves) > len(current_moves):
                    next_move = solution_moves[len(current_moves)]

            if is_complete and not request.user.solved_puzzles.filter(id=puzzle.id).exists():
                request.user.solved_puzzles.add(puzzle)
                request.user.incorrectly_solved_puzzles.remove(puzzle)
                new_user_rating, _, rating_change, _ = self._update_ratings(
                    request.user.puzzle_rating, puzzle.elo_rating, 1)
                request.user.puzzle_rating = new_user_rating
                request.user.save(update_fields=['puzzle_rating'])
            else:
                rating_change = 0
            
            next_puzzle_id = self.get_next_puzzle_id() if is_complete else None
            return JsonResponse({
                'correct': True,
                'complete': is_complete,
                'next_puzzle_id': next_puzzle_id,
                'rating_change': rating_change,
                'next_move': next_move
            })
        else:
            # Check if the puzzle is not already solved and not in incorrectly solved puzzles
            if not request.user.solved_puzzles.filter(id=puzzle.id).exists() and \
               not request.user.incorrectly_solved_puzzles.filter(id=puzzle.id).exists():
                request.user.incorrectly_solved_puzzles.add(puzzle)
                # Only update rating for the first incorrect attempt
                new_user_rating, _, rating_change, _ = self._update_ratings(
                    request.user.puzzle_rating, puzzle.elo_rating, 0)
                request.user.puzzle_rating = new_user_rating
                request.user.save(update_fields=['puzzle_rating'])
            else:
                rating_change = 0
                
            return JsonResponse({
                'correct': False,
                'complete': False,
                'rating_change': rating_change
            })


    def _calculate_rating_change(self, player_rating, opponent_rating, result, k_factor=32):
        """
        Calculate rating change for a chess game.

        player_rating: Current rating of the player
        opponent_rating: Current rating of the opponent
        result: Game result (1 for win, 0.5 for draw, 0 for loss)
        k_factor: K-factor for the player (default 32)
        return: Rating change for the player
        """
        # Calculate expected score
        expected_score = 1 / (1 + 10 ** ((opponent_rating - player_rating) / 400))

        # Calculate rating change
        rating_change = k_factor * (result - expected_score)

        return round(rating_change, 2)

    def _update_ratings(self, player_a_rating, player_b_rating, result_a, k_factor_a=32, k_factor_b=32):
        """
        ratings for both players after a game.

        player_a_rating: Current rating of Player A
        player_b_rating: Current rating of Player B
        result_a: Result for Player A (1 for win, 0.5 for draw, 0 for loss)
        k_factor_a: K-factor for Player A (default 32)
        k_factor_b: K-factor for Player B (default 32)
        :return: Tuple of (new_rating_a, new_rating_b, change_a, change_b)
        """
        change_a = self._calculate_rating_change(player_a_rating, player_b_rating, result_a, k_factor_a)
        change_b = self._calculate_rating_change(player_b_rating, player_a_rating, 1 - result_a, k_factor_b)

        new_rating_a = player_a_rating + change_a
        new_rating_b = player_b_rating + change_b

        return round(new_rating_a, 2), round(new_rating_b, 2), change_a, change_b           

class PuzzleDetailView(DetailView):
    model = Puzzle
    context_object_name = 'puzzle'
    template_name = 'puzzles/puzzle_detail.html'