from django.apps import AppConfig


class LicensesConfig(AppConfig):
    name = 'licenses'

    def ready(self):
        import licenses.signals
