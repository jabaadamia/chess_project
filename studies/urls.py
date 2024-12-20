from django.urls import path

from .views import  AnalyzeBoard

urlpatterns = [
    path('analyze', AnalyzeBoard.as_view(), name='analyze'),
]