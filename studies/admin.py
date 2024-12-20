from django.contrib import admin
from .models import Game


class GameAdmin(admin.ModelAdmin):
    list_display = ('user', 'result', 'pgn', 'created_at', 'updated_at')
    search_fields = ('user__username', 'result', 'created_at')

admin.site.register(Game, GameAdmin)

