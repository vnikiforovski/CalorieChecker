from django.test import TestCase


class HealthCheckTest(TestCase):
    """The /api/health/ endpoint is unauthenticated and used by Docker."""

    def test_returns_200(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)

    def test_returns_healthy_status(self):
        response = self.client.get('/api/health/')
        data = response.json()
        self.assertEqual(data['status'], 'healthy')


class AnalyzeEndpointAuthTest(TestCase):
    """Meal analysis requires authentication — no anonymous access."""

    def test_analyze_requires_authentication(self):
        response = self.client.post(
            '/api/meals/analyze/',
            data={'input_text': 'chicken and rice'},
            content_type='application/json',
        )
        # DRF returns 401 for unauthenticated requests when
        # DEFAULT_PERMISSION_CLASSES is IsAuthenticated
        self.assertEqual(response.status_code, 401)


class HistoryEndpointAuthTest(TestCase):
    """Meal history requires authentication — no anonymous access."""

    def test_history_requires_authentication(self):
        response = self.client.get('/api/meals/history/')
        self.assertEqual(response.status_code, 401)
