import json
import logging
import secrets
import hashlib
import time
from typing import Dict, Optional
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("aegis.auth_tokens")


class EmailVerificationManager:
    """
    Manages 6-digit OTP codes for email verification with 10-minute expiration,
    60-second resend cooldowns, and in-memory fallback.
    """
    _memory_otps: Dict[str, dict] = {}
    _memory_cooldowns: Dict[str, float] = {}

    @classmethod
    def _otp_key(cls, email: str) -> str:
        clean = email.lower().strip()
        return f"aegis:otp:verify:{clean}"

    @classmethod
    def _cooldown_key(cls, email: str) -> str:
        clean = email.lower().strip()
        return f"aegis:otp:cooldown:{clean}"

    @classmethod
    async def get_cooldown_remaining(cls, email: str) -> int:
        clean = email.lower().strip()
        now = time.time()

        # Redis check
        if settings.REDIS_URL:
            r = None
            try:
                r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=0.2, socket_timeout=0.2)
                ttl = await r.ttl(cls._cooldown_key(clean))
                if ttl > 0:
                    return ttl
            except Exception:
                pass
            finally:
                if r:
                    await r.aclose()

        # In-memory check
        cooldown_until = cls._memory_cooldowns.get(clean, 0.0)
        if now < cooldown_until:
            return max(1, int(cooldown_until - now))
        return 0

    @classmethod
    async def generate_and_store_otp(cls, email: str) -> str:
        clean = email.lower().strip()
        otp = f"{secrets.randbelow(1000000):06d}"
        now = time.time()
        ttl = 600  # 10 minutes

        # Try Redis
        if settings.REDIS_URL:
            r = None
            try:
                r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=0.2, socket_timeout=0.2)
                pipe = r.pipeline()
                pipe.set(cls._otp_key(clean), otp, ex=ttl)
                pipe.set(cls._cooldown_key(clean), "1", ex=60)
                await pipe.execute()
                return otp
            except Exception:
                pass
            finally:
                if r:
                    await r.aclose()

        # In-memory fallback
        cls._memory_otps[clean] = {"otp": otp, "expires_at": now + ttl}
        cls._memory_cooldowns[clean] = now + 60
        return otp

    @classmethod
    async def verify_otp(cls, email: str, submitted_otp: str) -> bool:
        clean = email.lower().strip()
        now = time.time()

        # Try Redis
        if settings.REDIS_URL:
            r = None
            try:
                r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=0.2, socket_timeout=0.2)
                val = await r.get(cls._otp_key(clean))
                if val:
                    stored_otp = val.decode("utf-8") if isinstance(val, bytes) else str(val)
                    if secrets.compare_digest(stored_otp.strip(), submitted_otp.strip()):
                        await r.delete(cls._otp_key(clean))
                        return True
            except Exception:
                pass
            finally:
                if r:
                    await r.aclose()

        # In-memory check
        record = cls._memory_otps.get(clean)
        if record:
            if now <= record["expires_at"]:
                if secrets.compare_digest(record["otp"].strip(), submitted_otp.strip()):
                    cls._memory_otps.pop(clean, None)
                    return True
            else:
                cls._memory_otps.pop(clean, None)

        return False


class PasswordResetTokenManager:
    """
    Manages single-use, high-entropy password reset tokens with a 15-minute TTL,
    SHA-256 hash storage, and immediate invalidation upon consumption.
    """
    _memory_tokens: Dict[str, dict] = {}

    @classmethod
    def _hash_token(cls, raw_token: str) -> str:
        return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()

    @classmethod
    def _redis_key(cls, token_hash: str) -> str:
        return f"aegis:pwd_reset:{token_hash}"

    @classmethod
    async def create_reset_token(cls, user_id: str, email: str) -> str:
        raw_token = secrets.token_urlsafe(32)
        token_hash = cls._hash_token(raw_token)
        now = time.time()
        ttl = 900  # 15 minutes
        payload = {"user_id": str(user_id), "email": email.lower().strip(), "created_at": now}

        # Try Redis
        if settings.REDIS_URL:
            r = None
            try:
                r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=0.2, socket_timeout=0.2)
                await r.set(cls._redis_key(token_hash), json.dumps(payload), ex=ttl)
                return raw_token
            except Exception:
                pass
            finally:
                if r:
                    await r.aclose()

        # In-memory fallback
        cls._memory_tokens[token_hash] = {
            "payload": payload,
            "expires_at": now + ttl,
        }
        return raw_token

    @classmethod
    async def consume_reset_token(cls, raw_token: str) -> Optional[dict]:
        token_hash = cls._hash_token(raw_token)
        now = time.time()

        # Try Redis
        if settings.REDIS_URL:
            r = None
            try:
                r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=0.2, socket_timeout=0.2)
                key = cls._redis_key(token_hash)
                val = await r.get(key)
                if val:
                    # Single-use: delete immediately
                    await r.delete(key)
                    raw_str = val.decode("utf-8") if isinstance(val, bytes) else str(val)
                    return json.loads(raw_str)
            except Exception:
                pass
            finally:
                if r:
                    await r.aclose()

        # In-memory check
        record = cls._memory_tokens.pop(token_hash, None)
        if record:
            if now <= record["expires_at"]:
                return record["payload"]

        return None
