from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    GOAL_CHOICES = [
        ('lose', 'Lose Weight'),
        ('maintain', 'Maintain Weight'),
        ('gain', 'Gain Weight'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    age = models.FloatField(null=True, blank=True)
    height_cm = models.FloatField(null=True, blank=True)
    weight_kg = models.FloatField(null=True, blank=True)
    goal = models.CharField(max_length=10, choices=GOAL_CHOICES, default='maintain')
    daily_calorie_goal = models.FloatField(null=True, blank=True)
    daily_water_goal = models.FloatField(default=2.0)
    streak_days = models.IntegerField(default=0)
    last_logged_date = models.DateField(null=True, blank=True)

    def calculate_bmr(self):
        if not all([self.weight_kg, self.height_cm, self.age]):
            return None
        # Mifflin-St Jeor (gender-neutral: average of male/female constants)
        bmr = 10 * self.weight_kg + 6.25 * self.height_cm - 5 * self.age - 78
        tdee = bmr * 1.375  # lightly active multiplier
        if self.goal == 'lose':
            return tdee - 500
        if self.goal == 'gain':
            return tdee + 500
        return tdee

    def save(self, *args, **kwargs):
        calculated = self.calculate_bmr()
        if calculated is not None:
            self.daily_calorie_goal = round(calculated, 0)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username}'s profile"
