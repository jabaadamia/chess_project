from django import forms
from .models import Tag

class PuzzleFilterForm(forms.Form):
    themes = forms.ModelMultipleChoiceField(
        queryset=Tag.objects.all(),
        widget=forms.SelectMultiple,
        required=False
    )

    number_of_puzzles = forms.IntegerField(min_value=0, max_value=50, required=True)
    min_rating = forms.IntegerField(min_value=0, max_value=3000, required=False)
    max_rating = forms.IntegerField(min_value=0, max_value=3000, required=False)
    