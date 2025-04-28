from users.models import CustomUser
from django.utils.timezone import now

from django.db import models

class Game(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="games")
    title = models.CharField(max_length=255, blank=True, null=True)
    pgn = models.TextField()  # Store the game in PGN format
    result = models.CharField(max_length=10, choices=[('1-0', 'White Wins'), ('0-1', 'Black Wins'), ('1/2-1/2', 'Draw'), ('*', 'Ongoing')], blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save_game(self, pgn, result='*', user=None):
        """
        Save the game with the provided PGN and result.

        """
        self.pgn = pgn
        self.result = result
        if user:
            self.user = user
        self.updated_at = now()
        self.save()


class Category(models.Model):
    name = models.CharField(max_length=63, unique=True)

    def __str__(self):
        return self.name
    
class Endgame(models.Model):
    fen = models.CharField(max_length=100)
    is_win = models.BooleanField(default=True) # false for draw
    category = models.ForeignKey(
        Category,
        related_name='endgames',
        on_delete=models.CASCADE
    )
    solved_by_users = models.ManyToManyField(
        CustomUser,
        related_name='solved_endgames',
        blank=True
    )

    def __str__(self):
        return self.fen