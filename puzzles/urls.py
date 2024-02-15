from django.urls import path

from .views import PuzzleHome, TagPuzzleListView


urlpatterns = [
    path('', PuzzleHome.as_view(), name='puzzle_home'),
    path('/<str:tag>/', TagPuzzleListView.as_view(), name='tag_puzzle_list'),
]