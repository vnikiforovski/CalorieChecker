from rest_framework import serializers
from .models import Meal, FoodItem, DailyLog


class FoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodItem
        fields = ['id', 'name', 'quantity', 'unit', 'calories', 'protein', 'carbs', 'fat', 'ai_confidence']


class MealSerializer(serializers.ModelSerializer):
    food_items = FoodItemSerializer(many=True, read_only=True)
    image = serializers.ImageField(use_url=True, required=False, allow_null=True)

    class Meta:
        model = Meal
        fields = [
            'id', 'meal_type', 'input_text', 'image',
            'total_calories', 'total_protein', 'total_carbs', 'total_fat',
            'is_favorite', 'favorite_name', 'created_at', 'food_items',
        ]
        read_only_fields = ['total_calories', 'total_protein', 'total_carbs', 'total_fat', 'created_at']


class DailyLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyLog
        fields = ['id', 'date', 'total_calories', 'total_protein', 'total_carbs', 'total_fat', 'water_intake']
        read_only_fields = ['total_calories', 'total_protein', 'total_carbs', 'total_fat']
