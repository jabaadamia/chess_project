from django.urls import path

from .views import  AnalyzeBoard

urlpatterns = [
    path('analyze', AnalyzeBoard.as_view(), name='analyze'),
    path('analyze/<int:game_id>/', AnalyzeBoard.as_view(), name='analyze_game'),
]