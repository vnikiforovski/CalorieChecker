from calorie_checker.settings import *  # noqa: F401, F403

# Django's test client sends requests with Host: testserver by default.
# ALLOWED_HOSTS in settings.py is hardcoded and does not include it,
# which would cause every test request to return 400.
# Adding 'testserver' here keeps settings.py clean for production.
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'backend', 'testserver']
