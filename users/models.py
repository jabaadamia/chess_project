from django.contrib.auth.models import AbstractUser
from django.db import models

from puzzles.models import Puzzle

class CustomUser(AbstractUser):
    rating = models.IntegerField(default=1000)
    puzzle_rating = models.IntegerField(default=1000)
    solved_puzzles = models.ManyToManyField(Puzzle, blank=True)
    
    # game related ...
    # games_played = models.IntegerField(default=0)