from django.urls import path

from .views import PuzzleHome, TagPuzzleListView, PuzzleTestView, PuzzleDetailView


urlpatterns = [
    path('', PuzzleHome.as_view(), name='puzzle_home'),
    path('test/<int:idx>', PuzzleTestView.as_view(), name='puzzle_test'),
    path('<str:tag>/<int:pk>', TagPuzzleListView.as_view(), name='tag_puzzle_list'),
    path('<int:pk>', PuzzleDetailView.as_view(), name='puzzle_detail'),
]