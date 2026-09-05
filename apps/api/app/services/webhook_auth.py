import hashlib
import hmac
from typing import Optional


def verify_github_signature(
    raw_body: bytes,
    secret: str,
    signature_header: Optional[str],
) -> bool:
    """
    Validates GitHub webhook payload signature against the repository secret.
    Uses constant-time comparison to prevent timing attacks.
    """
    if not signature_header or not secret:
        return False

    parts = signature_header.split("=", 1)
    if len(parts) != 2 or parts[0].strip().lower() != "sha256":
        return False

    received_sig = parts[1].strip().lower()
    expected_sig = hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected_sig, received_sig)
