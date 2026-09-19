from rest_framework import serializers

from .verification import normalize_sub_tin, normalize_tin


class MorVerifyRequestSerializer(serializers.Serializer):
    """TIN verification request. Raises 400 on malformed input.

    ``force`` bypasses the backend cache so the user can explicitly
    "Refresh from MoR" rather than trusting a cached answer.
    """

    tin = serializers.CharField()
    sub_tin = serializers.CharField(required=False, allow_null=True, default=None)
    force = serializers.BooleanField(required=False, default=False)

    def validate_tin(self, value):
        return normalize_tin(value)

    def validate_sub_tin(self, value):
        return normalize_sub_tin(value)


class MorVerifyResponseSerializer(serializers.Serializer):
    """Canonical verification protocol shared with shega-shared clients."""

    status = serializers.CharField()
    tin = serializers.CharField()
    sub_tin = serializers.CharField(allow_null=True)
    taxpayer_name = serializers.CharField(allow_null=True)
    taxpayer_type = serializers.CharField(allow_null=True)
    registration = serializers.DictField(allow_null=True)
    reference = serializers.CharField(allow_null=True)
    verified_at = serializers.CharField(allow_null=True)
    source = serializers.CharField()
    reason = serializers.CharField(allow_null=True)