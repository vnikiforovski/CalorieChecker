from django.urls import path
from . import views

urlpatterns = [
    # Static meal paths first
    path('meals/analyze/', views.AnalyzeMealView.as_view(), name='meal-analyze'),
    path('meals/history/', views.MealHistoryView.as_view(), name='meal-history'),
    path('meals/favorites/', views.FavoritesListView.as_view(), name='meal-favorites'),
    # Dynamic meal paths
    path('meals/<int:pk>/', views.MealDetailView.as_view(), name='meal-detail'),
    path('meals/<int:pk>/correct/', views.CorrectMealView.as_view(), name='meal-correct'),
    path('meals/<int:pk>/favorite/', views.FavoriteMealView.as_view(), name='meal-favorite'),
    path('meals/<int:pk>/relog/', views.RelogMealView.as_view(), name='meal-relog'),
    # Dashboard
    path('dashboard/today/', views.TodayDashboardView.as_view(), name='dashboard-today'),
    path('dashboard/weekly/', views.WeeklyDashboardView.as_view(), name='dashboard-weekly'),
    path('dashboard/water/', views.water_intake_view, name='dashboard-water'),
]
