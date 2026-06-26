#!/bin/sh
echo "Running migrations..."
python manage.py migrate --noinput
echo "Starting gunicorn..."
exec gunicorn calorie_checker.wsgi:application --bind 0.0.0.0:8000