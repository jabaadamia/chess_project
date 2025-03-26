import chess
import chess.pgn
import io
from datetime import datetime
import json

from django.urls import reverse
from django.shortcuts import get_object_or_404, render, redirect
from django.http.response import JsonResponse
from django.views.generic import DetailView, TemplateView

from .models import Game


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
