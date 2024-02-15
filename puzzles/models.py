from django.db import models

class Tag(models.Model):
    name = models.CharField(max_length=63, unique=True)

    def __str__(self):
        return self.name
    
class Puzzle(models.Model):
    fen = models.CharField(max_length=100)
    solution = models.CharField(max_length=255)
    elo_rating = models.IntegerField(default=1000)
    description = models.CharField(max_length=255)
    tags = models.ManyToManyField(Tag, related_name='puzzles')

    def __str__(self):
        return self.description