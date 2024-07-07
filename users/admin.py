from django.contrib import admin

from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin
from .forms import CustomUserCreationForm, CustomUserChangeForm

CustomUser = get_user_model()

class CustomUserAdmin(UserAdmin):
    
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = CustomUser
    list_display = ['email', 'username', 'rating', 'puzzle_rating', 'get_solved_puzzles_count',]

    def get_solved_puzzles_count(self, obj):
        return obj.solved_puzzles.count()
    get_solved_puzzles_count.short_description = 'Solved Puzzles Count'

admin.site.register(CustomUser, CustomUserAdmin)