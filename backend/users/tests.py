from django.contrib.auth.models import User
from django.test import TestCase


class RegisterEndpointTest(TestCase):
    """Registration creates a new user and returns JWT tokens immediately."""

    def test_register_with_valid_data_returns_201(self):
        payload = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'StrongPassword123',
        }
        response = self.client.post(
            '/api/auth/register/',
            data=payload,
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)

    def test_register_response_contains_tokens(self):
        # RegisterView returns {user: ..., tokens: {access: ..., refresh: ...}}
        payload = {
            'username': 'tokenuser',
            'email': 'tokenuser@example.com',
            'password': 'StrongPassword123',
        }
        response = self.client.post(
            '/api/auth/register/',
            data=payload,
            content_type='application/json',
        )
        data = response.json()
        self.assertIn('tokens', data)
        self.assertIn('access', data['tokens'])
        self.assertIn('refresh', data['tokens'])


class LoginEndpointTest(TestCase):
    """Login authenticates with username+password and returns JWT tokens."""

    def setUp(self):
        # Create a user directly so we have known credentials to test against
        self.user = User.objects.create_user(
            username='loginuser',
            password='TestPassword123',
        )

    def test_login_with_correct_credentials_returns_200(self):
        response = self.client.post(
            '/api/auth/login/',
            data={'username': 'loginuser', 'password': 'TestPassword123'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

    def test_login_response_contains_jwt_tokens(self):
        # LoginView extends TokenObtainPairView — standard simplejwt fields
        response = self.client.post(
            '/api/auth/login/',
            data={'username': 'loginuser', 'password': 'TestPassword123'},
            content_type='application/json',
        )
        data = response.json()
        self.assertIn('access', data)
        self.assertIn('refresh', data)

    def test_login_with_wrong_password_returns_401(self):
        response = self.client.post(
            '/api/auth/login/',
            data={'username': 'loginuser', 'password': 'wrongpassword'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)
