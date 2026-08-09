"""Lightweight security event logger.

Events are emitted through a dedicated ``shega.security`` logger (configured in
``backend.settings``) so they land in ``logs/security.log`` as well as on the
console, which is what a single Render log stream captures. Each call also
records a structured payload that is friendly for log aggregation.
"""

import logging

logger = logging.getLogger("shega.security")


def log_security_event(event: str, *, level: str = "warning", **payload) -> None:
    """Record a security-relevant event.

    ``event`` is a short, stable code (e.g. ``"login_locked_out"``). The rest
    of the kwargs are attached as a structured suffix for downstream parsing.
    Sensitive values (passwords, tokens) must never be passed here.
    """
    message = event
    if payload:
        parts = []
        for key, value in payload.items():
            parts.append(f"{key}={value}")
        message = f"{event} | {' '.join(parts)}"
    getattr(logger, level, logger.warning)(message)
