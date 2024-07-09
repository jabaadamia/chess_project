from django.urls import path

from .views import PuzzleHome, TagPuzzleListView, PuzzleDetailView


urlpatterns = [
    path('', PuzzleHome.as_view(), name='puzzle_home'),
    path('<str:tag>/<int:pk>', TagPuzzleListView.as_view(), name='tag_puzzle_list'),
    path('<int:pk>', PuzzleDetailView.as_view(), name='puzzle_detail'),
]