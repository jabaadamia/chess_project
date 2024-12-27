from django.contrib import admin
from .models import Puzzle, Tag

class PuzzleAdmin(admin.ModelAdmin):
    list_display = ("id", "fen", "solution", "elo_rating", "description", "display_tags")

    def display_tags(self, obj):
        return ", ".join([tag.name for tag in obj.tags.all()])

class TagAdmin(admin.ModelAdmin):
    list_display = ("name",)

admin.site.register(Puzzle, PuzzleAdmin)
admin.site.register(Tag, TagAdmin)