import chess
import chess.pgn
import io
from datetime import datetime
import json

from django.urls import reverse
from django.shortcuts import get_object_or_404, render, redirect
from django.http.response import JsonResponse
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import DetailView, TemplateView, ListView
from django.views.decorators.http import require_POST
from django.utils.decorators import method_decorator

from .models import Game, Category, Endgame


class AnalyzeBoard(TemplateView):
    template_name = 'studies/analyze.html'

    def _create_from_to_array(self, game):
        # Parse the PGN string into a chess game object
        #game = chess.pgn.read_game(io.StringIO(pgn))

        from_to = []

        # Iterate through the game moves
        board = game.board()
        for move in game.mainline_moves():
            # For each move, extract the "from" and "to" squares
            from_square = 10*(move.from_square % 8 + 1)+move.from_square // 8 + 1
            to_square = 10*(move.to_square % 8 + 1)+move.to_square // 8 + 1

            # Append the move as a tuple (from, to)
            from_to.append([from_square, to_square])

            # Make the move on the board
            board.push(move)

        return from_to

    def get(self, request, *args, **kwargs):
        """Reset the session FEN to the starting position or set up opened game """
        
        game_id = kwargs.get('game_id')  
        if game_id:
            game = get_object_or_404(Game, id=game_id)

            if game.user != request.user:
                return JsonResponse({"error": "You are not authorized to access this game"}, status=403)

            request.session['fen'] = chess.STARTING_FEN
            request.session['game_pgn'] = game.pgn
            game = chess.pgn.read_game(io.StringIO(game.pgn))
            game.headers.clear()
            return render(request, 'studies/analyze.html', {'fen': chess.STARTING_FEN, 'pgn': game, 'from_to':json.dumps(self._create_from_to_array(game))})
        else:
            request.session['fen'] = chess.STARTING_FEN
            request.session['game_pgn'] = False
        return render(request, 'studies/analyze.html', {'fen': chess.STARTING_FEN, 'pgn': '', 'from_to':[]})

    def post(self, request, *args, **kwargs):
        """Process a move and save game."""
        
        try:
            data = json.loads(request.body)

            save_game_flag = data.get('save_game', False)
            fen = request.session.get('fen', chess.STARTING_FEN)
            board = chess.Board(fen)

            if save_game_flag:
                if not request.user.is_authenticated:
                    # Redirect the user to the login page (OAuth login flow)
                    return redirect(reverse('account_login') + f'?next={request.path}')
                
                # Get the title and result from the request
                title = data.get('title', 'untitled').strip()
                result = data.get('result', '*')
                pgn = data.get('pgn', '')

                if result not in ["1-0", "0-1", "1/2-1/2"]:
                    return JsonResponse({"error": "Invalid result format"}, status=400)

                # Save the game with the provided title and result
                Game.objects.create(
                    user=request.user,
                    pgn=pgn,
                    result=result,
                    title=title,
                )
                return JsonResponse({"message": "Game saved successfully"})
            

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON payload"}, status=400)
        except ValueError as e:
            return JsonResponse({"error": f"Invalid move: {str(e)}"}, status=400)
        except Exception as e:
            return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)

@method_decorator(require_POST, name='dispatch')
class DeleteGame(DetailView):
    model = Game
    
    def post(self, request, *args, **kwargs):
        game = self.get_object()
        if game.user != request.user:
            return JsonResponse({"error": "You are not authorized to delete this game"}, status=403)
        game.delete()
        return JsonResponse({"message": "Game deleted successfully"})


class EndgameHome(ListView):
    model = Category
    context_object_name = 'categories'
    template_name = 'studies/endgame_home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        categories = Category.objects.all()
        endgames_per_category = {}

        for category in categories:
            cat_endgames = Endgame.objects.filter(category=category)
            count = cat_endgames.count()
            first = cat_endgames.first()

            if first:
                endgames_per_category[category.name] = {
                    'count': count,
                    'user_solved_count': None,
                    'url': reverse('category_endgame_list', kwargs={'category_name': category.name, 'endgame_id': first.pk})
                }
            else:
                endgames_per_category[category.name] = {
                    'count': count,
                    'user_solved_count': None,
                    'url': reverse('endgame_home')
                }

            if self.request.user.is_authenticated:
                endgames_per_category[category.name]['user_solved_count'] = self.request.user.solved_endgames.filter(category=category).count()

        context["endgames_per_category"] = endgames_per_category
        return context


class EndgamesByCategoryView(LoginRequiredMixin, TemplateView):
    template_name = 'studies/endgames_by_category.html'

    def get_queryset(self):
        category_name = self.kwargs['category_name']
        return Endgame.objects.filter(category__name=category_name)

    def get_next_endgame_id(self):
        current_user = self.request.user
        current_id = self.kwargs['endgame_id']

        unsolved = self.get_queryset().exclude(id__in=current_user.solved_endgames.all()).exclude(id=current_id).order_by('id').first()

        if not unsolved:
            unsolved = self.get_queryset().order_by('id').first()

        return unsolved.pk if unsolved else None

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        category_name = self.kwargs['category_name']
        endgame_id = self.kwargs['endgame_id']

        context['category'] = get_object_or_404(Category, name=category_name)
        context['detail_endgame'] = get_object_or_404(Endgame, pk=endgame_id)
        context['next_endgame_id'] = self.get_next_endgame_id()
        context['endgames'] = self.get_queryset()

        return context

    def post(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Unauthorized'}, status=401)

        endgame = get_object_or_404(Endgame, id=self.kwargs['endgame_id'])
        request.user.solved_endgames.add(endgame)
        return JsonResponse({'solved': True, 'next_endgame_id': self.get_next_endgame_id()})