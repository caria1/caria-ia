# Mocking slowapi Limiter to avoid import errors
# Removendo referências ao limiter para evitar confusão futura.

class MockLimiter:
    def limit(self, limit_value: str):
        def decorator(func):
            return func
        return decorator
