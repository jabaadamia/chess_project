from django.contrib import admin
from .models import Game, Category, Endgame


class GameAdmin(admin.ModelAdmin):
    list_display = ('user', 'result', 'pgn', 'created_at', 'updated_at')
    search_fields = ('user__username', 'result', 'created_at')

admin.site.register(Game, GameAdmin)

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)

@admin.register(Endgame)
class EndgameAdmin(admin.ModelAdmin):
    list_display = ('fen', 'is_win', 'category')
    list_filter = ('is_win', 'category')
