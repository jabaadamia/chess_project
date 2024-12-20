import chess
import chess.pgn
import io
import uuid
from datetime import datetime
import json

from django.shortcuts import get_object_or_404, render
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

            game_pgn = request.session.get('game_pgn')

            if not game_pgn:
                # If no game is found in session, start a new game
                game = chess.pgn.Game()
            else:
                # Reconstruct the game from the stored PGN string in the session
                game = chess.pgn.read_game(io.StringIO(game_pgn))
                board = game.board()

            save_game_flag = data.get('save_game', False)
            fen = request.session.get('fen', chess.STARTING_FEN)
            board = chess.Board(fen)

            if save_game_flag :
                # Save the game to the database
                Game.objects.create(
                    user=request.user,
                    pgn=game_pgn,
                    result='*',  # Set this based on the game outcome
                )
                return JsonResponse({"message": "Game saved successfully"})
            
            # Parse the move from the request
            move_uci = data.get('move')  # Get the move in UCI format
            if not move_uci:
                return JsonResponse({"error": "Move data is missing"}, status=400)

            # Convert the UCI move string to a chess.Move object
            move = chess.Move.from_uci(move_uci)

            # Check if the move is legal
            if board.is_legal(move):
                board.push(move)  # Apply the move to the board
                request.session['fen'] = board.fen()  # Update the board state in the session
                
                if not game.is_end():
                    node = game.end()
                else:
                    node = game
                node = node.add_main_variation(move)
                
                game_pgn = game.accept(chess.pgn.StringExporter())
                request.session['game_pgn'] = game_pgn

                # Return the updated FEN and the legal moves from the current position
                return JsonResponse({
                    "fen": board.fen(),
                    "legal_moves": [move.uci() for move in board.legal_moves],  # List of legal moves
                })
            else:
                return JsonResponse({"error": "Illegal move"}, status=400)

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON payload"}, status=400)
        except ValueError as e:
            return JsonResponse({"error": f"Invalid move: {str(e)}"}, status=400)
        except Exception as e:
            return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)
