from django.contrib import admin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'age', 'weight_kg', 'goal', 'daily_calorie_goal', 'streak_days']
    list_filter = ['goal']
    search_fields = ['user__username', 'user__email']
