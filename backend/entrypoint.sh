#!/bin/sh
echo "Running migrations..."
python manage.py migrate --noinput

echo "Starting gunicorn..."
exec gunicorn calorie_checker.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120 \
    --worker-tmp-dir /dev/shm
# --workers 3: one master process + 3 worker processes.
#   Formula: (2 × CPU cores) + 1. DigitalOcean nodes typically have 1-2 vCPUs.
#   3 workers allows parallel request handling without over-committing memory.
#
# --timeout 120: kill and restart a worker that takes >120s on a single request.
#   Default is 30s, which can trip on slow Anthropic API calls (AI meal analysis).
#   Must be less than the Ingress proxy-read-timeout (300s) to avoid silent hangs.
#
# --worker-tmp-dir /dev/shm: Gunicorn heartbeat files go into /dev/shm (RAM).
#   /dev/shm is a tmpfs volume — always available in Linux containers (default 64MB).
#   Avoids issues with containers that have restricted /tmp or read-only filesystems.