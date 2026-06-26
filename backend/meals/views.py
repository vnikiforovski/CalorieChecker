import base64
from datetime import date, timedelta

from django.shortcuts import get_object_or_404
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from ai_service.analyzer import analyze_meal
from .models import Meal, FoodItem, DailyLog
from .serializers import MealSerializer, DailyLogSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check_view(request):
    return Response({'status': 'healthy', 'service': 'calorie-checker-backend'})


def _sync_daily_log(user, log_date):
    log, _ = DailyLog.objects.get_or_create(user=user, date=log_date)
    meals = Meal.objects.filter(user=user, created_at__date=log_date)
    log.total_calories = round(sum(m.total_calories for m in meals), 2)
    log.total_protein = round(sum(m.total_protein for m in meals), 2)
    log.total_carbs = round(sum(m.total_carbs for m in meals), 2)
    log.total_fat = round(sum(m.total_fat for m in meals), 2)
    log.save()
    return log


def _update_streak(user):
    profile = getattr(user, 'profile', None)
    if not profile:
        return
    today = date.today()
    if profile.last_logged_date == today:
        return
    if profile.last_logged_date == today - timedelta(days=1):
        profile.streak_days += 1
    else:
        profile.streak_days = 1
    profile.last_logged_date = today
    profile.save(update_fields=['streak_days', 'last_logged_date'])


# ─── Meals ───────────────────────────────────────────────────────────────────

class AnalyzeMealView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        input_text = request.data.get('input_text', '').strip()
        meal_type = request.data.get('meal_type', 'snack')
        image_file = request.FILES.get('image')

        if not input_text and not image_file:
            return Response(
                {'error': 'Provide either input_text or an image file.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        image_data = image_media_type = None
        if image_file:
            image_data = base64.b64encode(image_file.read()).decode('utf-8')
            image_media_type = image_file.content_type

        ai_result = analyze_meal(
            text=input_text or None,
            image_data=image_data,
            image_media_type=image_media_type,
        )

        if 'error' in ai_result:
            return Response(ai_result, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        meal = Meal.objects.create(
            user=request.user,
            meal_type=meal_type,
            input_text=input_text or None,
            total_calories=ai_result.get('total_calories', 0),
            total_protein=ai_result.get('total_protein', 0),
            total_carbs=ai_result.get('total_carbs', 0),
            total_fat=ai_result.get('total_fat', 0),
        )

        if image_file:
            image_file.seek(0)
            meal.image = image_file
            meal.save(update_fields=['image'])

        FoodItem.objects.bulk_create([
            FoodItem(
                meal=meal,
                name=item.get('name', ''),
                quantity=item.get('quantity', 0),
                unit=item.get('unit', 'g'),
                calories=item.get('calories', 0),
                protein=item.get('protein', 0),
                carbs=item.get('carbs', 0),
                fat=item.get('fat', 0),
                ai_confidence=item.get('ai_confidence', 1.0),
            )
            for item in ai_result.get('items', [])
        ])

        _sync_daily_log(request.user, date.today())
        _update_streak(request.user)

        data = MealSerializer(meal, context={'request': request}).data
        data['healthy_alternatives'] = ai_result.get('healthy_alternatives', [])
        data['uncertainty_note'] = ai_result.get('uncertainty_note', '')
        return Response(data, status=status.HTTP_201_CREATED)


class CorrectMealView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        meal = get_object_or_404(Meal, pk=pk, user=request.user)
        corrections = request.data.get('corrections', [])

        for correction in corrections:
            item_id = correction.get('food_item_id')
            new_qty = correction.get('quantity')
            if item_id is None or new_qty is None:
                continue
            try:
                item = meal.food_items.get(pk=item_id)
                if item.quantity > 0:
                    ratio = float(new_qty) / item.quantity
                    item.calories = round(item.calories * ratio, 2)
                    item.protein = round(item.protein * ratio, 2)
                    item.carbs = round(item.carbs * ratio, 2)
                    item.fat = round(item.fat * ratio, 2)
                item.quantity = float(new_qty)
                item.save()
            except FoodItem.DoesNotExist:
                pass

        meal.recalculate_totals()
        _sync_daily_log(request.user, meal.created_at.date())
        return Response(MealSerializer(meal, context={'request': request}).data)


class MealHistoryView(generics.ListAPIView):
    serializer_class = MealSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Meal.objects.filter(user=self.request.user)
        date_str = self.request.query_params.get('date')
        meal_type = self.request.query_params.get('meal_type')
        if date_str:
            qs = qs.filter(created_at__date=date_str)
        if meal_type:
            qs = qs.filter(meal_type=meal_type)
        return qs


class MealDetailView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Meal.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        log_date = instance.created_at.date()
        instance.delete()
        _sync_daily_log(self.request.user, log_date)


class FavoriteMealView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        meal = get_object_or_404(Meal, pk=pk, user=request.user)
        favorite_name = request.data.get('favorite_name', '').strip()
        if not favorite_name:
            return Response(
                {'error': 'favorite_name is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        meal.is_favorite = True
        meal.favorite_name = favorite_name
        meal.save(update_fields=['is_favorite', 'favorite_name'])
        return Response(MealSerializer(meal, context={'request': request}).data)


class FavoritesListView(generics.ListAPIView):
    serializer_class = MealSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Meal.objects.filter(user=self.request.user, is_favorite=True)


class RelogMealView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        original = get_object_or_404(Meal, pk=pk, user=request.user, is_favorite=True)
        meal_type = request.data.get('meal_type', original.meal_type)

        new_meal = Meal.objects.create(
            user=request.user,
            meal_type=meal_type,
            input_text=original.input_text,
            total_calories=original.total_calories,
            total_protein=original.total_protein,
            total_carbs=original.total_carbs,
            total_fat=original.total_fat,
        )

        FoodItem.objects.bulk_create([
            FoodItem(
                meal=new_meal,
                name=item.name,
                quantity=item.quantity,
                unit=item.unit,
                calories=item.calories,
                protein=item.protein,
                carbs=item.carbs,
                fat=item.fat,
                ai_confidence=item.ai_confidence,
            )
            for item in original.food_items.all()
        ])

        _sync_daily_log(request.user, date.today())
        _update_streak(request.user)
        return Response(MealSerializer(new_meal, context={'request': request}).data, status=status.HTTP_201_CREATED)


# ─── Dashboard ───────────────────────────────────────────────────────────────

class TodayDashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        meals = Meal.objects.filter(user=request.user, created_at__date=today).prefetch_related('food_items')
        log, _ = DailyLog.objects.get_or_create(user=request.user, date=today)
        profile = getattr(request.user, 'profile', None)

        calorie_goal = profile.daily_calorie_goal if profile else None
        water_goal = profile.daily_water_goal if profile else 2.0

        return Response({
            'date': today,
            'meals': MealSerializer(meals, many=True, context={'request': request}).data,
            'totals': {
                'calories': log.total_calories,
                'protein': log.total_protein,
                'carbs': log.total_carbs,
                'fat': log.total_fat,
            },
            'water_intake': log.water_intake,
            'goals': {
                'calories': calorie_goal,
                'water': water_goal,
            },
            'progress': {
                'calories_percent': round(log.total_calories / calorie_goal * 100, 1) if calorie_goal else None,
                'water_percent': round(log.water_intake / water_goal * 100, 1) if water_goal else None,
            },
            'streak_days': profile.streak_days if profile else 0,
        })


class WeeklyDashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        week_start = today - timedelta(days=6)

        logs = DailyLog.objects.filter(user=request.user, date__gte=week_start, date__lte=today)
        log_map = {log.date: log for log in logs}

        days = []
        weekly_totals = {'calories': 0.0, 'protein': 0.0, 'carbs': 0.0, 'fat': 0.0}

        for offset in range(7):
            day = week_start + timedelta(days=offset)
            log = log_map.get(day)
            entry = {
                'date': day,
                'calories': log.total_calories if log else 0,
                'protein': log.total_protein if log else 0,
                'carbs': log.total_carbs if log else 0,
                'fat': log.total_fat if log else 0,
                'water_intake': log.water_intake if log else 0,
            }
            days.append(entry)
            for key in ['calories', 'protein', 'carbs', 'fat']:
                weekly_totals[key] += entry[key]

        return Response({
            'days': days,
            'weekly_totals': weekly_totals,
            'weekly_averages': {k: round(v / 7, 1) for k, v in weekly_totals.items()},
        })


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def water_intake_view(request):
    amount = request.data.get('water_intake')
    if amount is None:
        return Response({'error': 'water_intake is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        amount = float(amount)
        if amount < 0:
            raise ValueError
    except (ValueError, TypeError):
        return Response({'error': 'water_intake must be a non-negative number.'}, status=status.HTTP_400_BAD_REQUEST)

    log, _ = DailyLog.objects.get_or_create(user=request.user, date=date.today())
    log.water_intake = amount
    log.save(update_fields=['water_intake'])
    return Response(DailyLogSerializer(log).data)
