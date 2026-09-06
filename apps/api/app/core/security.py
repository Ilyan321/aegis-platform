import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

security_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with 100,000 iterations and a random salt."""
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"pbkdf2:sha256:100000${salt.hex()}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored PBKDF2-HMAC-SHA256 hash in constant time."""
    try:
        parts = hashed_password.split("$")
        if len(parts) != 3:
            return False
        algo_iterations, salt_hex, key_hex = parts
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        computed_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100_000)
        return hmac.compare_digest(expected_key, computed_key)
    except Exception:
        return False


def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def base64url_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data.encode("ascii"))


def create_access_token(user_id: str, email: str, expires_delta: Optional[timedelta] = None) -> str:
    """Creates an RFC 7519 standard HMAC-SHA256 signed JWT access token (default 15m)."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=15))
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(user_id),
        "email": email,
        "type": "access",
        "exp": int(expire.timestamp()),
        "iat": round(now.timestamp(), 4),
    }

    header_b64 = base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")

    secret_key = settings.SECRET_KEY.encode("utf-8")
    signature = hmac.new(secret_key, signing_input, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def create_refresh_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Creates an RFC 7519 HMAC-SHA256 signed refresh token (default 7 days) with unique jti."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(days=7))
    header = {"alg": "HS256", "typ": "JWT"}
    jti = secrets.token_hex(16)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "jti": jti,
        "exp": int(expire.timestamp()),
        "iat": round(now.timestamp(), 4),
    }

    header_b64 = base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")

    secret_key = settings.SECRET_KEY.encode("utf-8")
    signature = hmac.new(secret_key, signing_input, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


class SessionTokenManager:
    """Manages refresh token invalidation, reuse detection, and global session revocation."""
    _revoked_jtis: set = set()
    _revoked_before: dict = {}

    @classmethod
    async def is_revoked(cls, jti: str) -> bool:
        if settings.REDIS_URL:
            try:
                import redis.asyncio as aioredis
                r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=0.2, socket_timeout=0.2)
                val = await r.get(f"revoked_token:{jti}")
                await r.aclose()
                return val is not None
            except Exception:
                pass
        return jti in cls._revoked_jtis

    @classmethod
    async def revoke_token(cls, jti: str, ttl_seconds: int = 604800) -> None:
        cls._revoked_jtis.add(jti)
        if settings.REDIS_URL:
            try:
                import redis.asyncio as aioredis
                r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=0.2, socket_timeout=0.2)
                await r.set(f"revoked_token:{jti}", "1", ex=ttl_seconds)
                await r.aclose()
            except Exception:
                pass

    @classmethod
    async def revoke_user_sessions(cls, user_id: Any) -> None:
        import time
        uid = str(user_id)
        now = time.time()
        cls._revoked_before[uid] = now
        if settings.REDIS_URL:
            try:
                import redis.asyncio as aioredis
                r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=0.2, socket_timeout=0.2)
                await r.set(f"revoked_before:{uid}", str(now), ex=604800)
                await r.aclose()
            except Exception:
                pass

    @classmethod
    async def is_user_session_revoked(cls, user_id: Any, iat: Optional[float]) -> bool:
        if iat is None:
            return False
        uid = str(user_id)
        if settings.REDIS_URL:
            try:
                import redis.asyncio as aioredis
                r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=0.2, socket_timeout=0.2)
                val = await r.get(f"revoked_before:{uid}")
                await r.aclose()
                if val:
                    cutoff = float(val.decode("utf-8") if isinstance(val, bytes) else val)
                    return iat < cutoff
            except Exception:
                pass
        cutoff = cls._revoked_before.get(uid)
        if cutoff is not None:
            return iat < cutoff
        return False


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and validates an RFC 7519 HMAC-SHA256 JWT token."""
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed authorization token")

    header_b64, payload_b64, signature_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")

    secret_key = settings.SECRET_KEY.encode("utf-8")
    expected_sig = hmac.new(secret_key, signing_input, hashlib.sha256).digest()
    actual_sig = base64url_decode(signature_b64)

    if not hmac.compare_digest(expected_sig, actual_sig):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")

    try:
        payload = json.loads(base64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    exp = payload.get("exp")
    if exp and datetime.now(timezone.utc).timestamp() > exp:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")

    return payload


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Extracts the authenticated User from the Bearer token."""
    if not auth or not auth.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication credentials required")

    payload = decode_access_token(auth.credentials)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject identifier")

    try:
        user_uuid = UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user identifier format")

    if await SessionTokenManager.is_user_session_revoked(user_uuid, payload.get("iat")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session has been revoked. Please sign in again.")

    stmt = select(User).where(User.id == user_uuid, User.is_active == True)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found or disabled")

    return user


async def get_optional_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Extracts User if Bearer token present, else returns None without raising 401."""
    if not auth or not auth.credentials:
        return None
    try:
        payload = decode_access_token(auth.credentials)
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
        user_uuid = UUID(user_id_str)
        stmt = select(User).where(User.id == user_uuid, User.is_active == True)
        result = await db.execute(stmt)
        return result.scalars().first()
    except Exception:
        return None
