from django.urls import path

from .views import  AnalyzeBoard, DeleteGame, EndgameHome, EndgamesByCategoryView

urlpatterns = [
    path('analyze', AnalyzeBoard.as_view(), name='analyze'),
    path('analyze/<int:game_id>/', AnalyzeBoard.as_view(), name='analyze_game'),
    path('delete/<int:pk>/', DeleteGame.as_view(), name='delete_game'),
    path('endgames/', EndgameHome.as_view(), name='endgame_home'),
    path('endgames/<str:category_name>/<int:endgame_id>/', EndgamesByCategoryView.as_view(), name='category_endgame_list')
]