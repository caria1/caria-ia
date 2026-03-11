# Mocking slowapi Limiter to avoid import errors
# from slowapi import Limiter
# from slowapi.util import get_remote_address

class MockLimiter:
    def limit(self, limit_value: str):
        def decorator(func):
            return func
        return decorator

limiter = MockLimiter()
