from django.db import models
from django.contrib.auth.models import User


class Meal(models.Model):
    MEAL_TYPE_CHOICES = [
        ('breakfast', 'Breakfast'),
        ('lunch', 'Lunch'),
        ('dinner', 'Dinner'),
        ('snack', 'Snack'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meals')
    meal_type = models.CharField(max_length=10, choices=MEAL_TYPE_CHOICES, default='snack')
    input_text = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='meals/%Y/%m/%d/', blank=True, null=True)
    total_calories = models.FloatField(default=0)
    total_protein = models.FloatField(default=0)
    total_carbs = models.FloatField(default=0)
    total_fat = models.FloatField(default=0)
    is_favorite = models.BooleanField(default=False)
    favorite_name = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def recalculate_totals(self):
        items = self.food_items.all()
        self.total_calories = round(sum(i.calories for i in items), 2)
        self.total_protein = round(sum(i.protein for i in items), 2)
        self.total_carbs = round(sum(i.carbs for i in items), 2)
        self.total_fat = round(sum(i.fat for i in items), 2)
        self.save()

    def __str__(self):
        return f"{self.user.username} - {self.meal_type} ({self.created_at.date()})"


class FoodItem(models.Model):
    meal = models.ForeignKey(Meal, on_delete=models.CASCADE, related_name='food_items')
    name = models.CharField(max_length=200)
    quantity = models.FloatField()
    unit = models.CharField(max_length=50)
    calories = models.FloatField()
    protein = models.FloatField()
    carbs = models.FloatField()
    fat = models.FloatField()
    ai_confidence = models.FloatField(default=1.0)

    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit})"


class DailyLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_logs')
    date = models.DateField()
    total_calories = models.FloatField(default=0)
    total_protein = models.FloatField(default=0)
    total_carbs = models.FloatField(default=0)
    total_fat = models.FloatField(default=0)
    water_intake = models.FloatField(default=0.0)

    class Meta:
        unique_together = ['user', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.username} - {self.date}"
