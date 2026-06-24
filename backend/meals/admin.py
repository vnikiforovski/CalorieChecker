from django.contrib import admin
from .models import Meal, FoodItem, DailyLog


class FoodItemInline(admin.TabularInline):
    model = FoodItem
    extra = 0
    readonly_fields = ['ai_confidence']


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ['user', 'meal_type', 'total_calories', 'is_favorite', 'created_at']
    list_filter = ['meal_type', 'is_favorite']
    search_fields = ['user__username', 'input_text', 'favorite_name']
    inlines = [FoodItemInline]


@admin.register(DailyLog)
class DailyLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'total_calories', 'water_intake']
    list_filter = ['date']
    search_fields = ['user__username']
