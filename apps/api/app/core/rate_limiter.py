import logging
import time
from typing import Dict, List
from fastapi import HTTPException, Request, status
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("aegis.rate_limiter")


class RateLimiter:
    """
    Asynchronous rate limiter supporting Redis (distributed) with an in-memory fallback.
    Includes circuit-breaker backoff for Redis to eliminate latency when Redis is unreachable.
    """
    _redis_backoff_until: float = 0.0

    def __init__(self, times: int, seconds: int):
        self.times = times
        self.seconds = seconds
        self._memory_store: Dict[str, List[float]] = {}

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        cf_ip = request.headers.get("cf-connecting-ip")
        if cf_ip:
            return cf_ip.strip()
        if request.client:
            return request.client.host
        return "127.0.0.1"

    async def __call__(self, request: Request):
        client_ip = self._get_client_ip(request)
        path = request.url.path
        key = f"rate_limit:{path}:{client_ip}"
        now = time.time()

        # Try Redis first if REDIS_URL is configured and circuit breaker is closed
        if settings.REDIS_URL and now >= RateLimiter._redis_backoff_until:
            r = None
            try:
                r = aioredis.from_url(
                    settings.REDIS_URL,
                    socket_connect_timeout=0.2,
                    socket_timeout=0.2,
                )
                pipe = r.pipeline()
                pipe.incr(key)
                pipe.expire(key, self.seconds, nx=True)
                res = await pipe.execute()
                count = res[0]
                if count > self.times:
                    ttl = await r.ttl(key)
                    retry_after = max(1, ttl) if ttl > 0 else self.seconds
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Rate limit exceeded. Please try again later.",
                        headers={"Retry-After": str(retry_after)},
                    )
                return
            except HTTPException:
                raise
            except Exception as e:
                # Trip circuit breaker for 30 seconds on Redis failure
                RateLimiter._redis_backoff_until = now + 30.0
                logger.debug(f"Redis rate limiter tripped circuit breaker ({e}), falling back to memory store")
            finally:
                if r:
                    await r.aclose()

        # In-memory sliding window fallback
        timestamps = self._memory_store.get(key, [])
        cutoff = now - self.seconds
        valid_timestamps = [t for t in timestamps if t > cutoff]

        if len(valid_timestamps) >= self.times:
            retry_after = int(self.seconds - (now - valid_timestamps[0]))
            retry_after = max(1, retry_after)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )

        valid_timestamps.append(now)
        self._memory_store[key] = valid_timestamps


class AccountLockoutManager:
    """
    Tracks consecutive failed authentication attempts and enforces temporary account lockouts
    to eliminate automated credential-stuffing and distributed brute-force attacks.
    """
    _memory_failed_attempts: Dict[str, List[float]] = {}
    _memory_lockouts: Dict[str, float] = {}

    @classmethod
    def _email_key(cls, email: str) -> str:
        import hashlib
        return hashlib.sha256(email.lower().strip().encode("utf-8")).hexdigest()[:16]

    @classmethod
    async def check_lockout(cls, email: str) -> None:
        key = cls._email_key(email)
        now = time.time()

        # Redis check
        if settings.REDIS_URL and now >= RateLimiter._redis_backoff_until:
            r = None
            try:
                r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=0.2, socket_timeout=0.2)
                ttl = await r.ttl(f"lockout:{key}")
                if ttl > 0:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Account is temporarily locked due to multiple consecutive failed login attempts. Please try again in 15 minutes.",
                        headers={"Retry-After": str(ttl)},
                    )
                return
            except HTTPException:
                raise
            except Exception:
                pass
            finally:
                if r:
                    await r.aclose()

        # In-memory check
        lockout_until = cls._memory_lockouts.get(key, 0.0)
        if now < lockout_until:
            remaining = int(lockout_until - now)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Account is temporarily locked due to multiple consecutive failed login attempts. Please try again in 15 minutes.",
                headers={"Retry-After": str(max(1, remaining))},
            )

    @classmethod
    async def record_failure(cls, email: str) -> None:
        key = cls._email_key(email)
        now = time.time()
        max_failures = 5
        lockout_duration = 900  # 15 minutes
        window = 600  # 10 minutes

        # Try Redis first
        if settings.REDIS_URL and now >= RateLimiter._redis_backoff_until:
            r = None
            try:
                r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=0.2, socket_timeout=0.2)
                fail_key = f"failed_login:{key}"
                pipe = r.pipeline()
                pipe.incr(fail_key)
                pipe.expire(fail_key, window, nx=True)
                res = await pipe.execute()
                count = res[0]
                if count >= max_failures:
                    await r.set(f"lockout:{key}", "1", ex=lockout_duration)
                    await r.delete(fail_key)
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Too many failed login attempts. Account temporarily locked for 15 minutes for your protection.",
                        headers={"Retry-After": str(lockout_duration)},
                    )
                return
            except HTTPException:
                raise
            except Exception:
                pass
            finally:
                if r:
                    await r.aclose()

        # In-memory fallback
        failures = cls._memory_failed_attempts.get(key, [])
        failures = [t for t in failures if t > (now - window)]
        failures.append(now)
        cls._memory_failed_attempts[key] = failures

        if len(failures) >= max_failures:
            cls._memory_lockouts[key] = now + lockout_duration
            cls._memory_failed_attempts[key] = []
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed login attempts. Account temporarily locked for 15 minutes for your protection.",
                headers={"Retry-After": str(lockout_duration)},
            )

    @classmethod
    async def record_success(cls, email: str) -> None:
        key = cls._email_key(email)
        # Redis
        if settings.REDIS_URL and time.time() >= RateLimiter._redis_backoff_until:
            r = None
            try:
                r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=0.2, socket_timeout=0.2)
                await r.delete(f"failed_login:{key}", f"lockout:{key}")
            except Exception:
                pass
            finally:
                if r:
                    await r.aclose()

        # In-memory
        cls._memory_failed_attempts.pop(key, None)
        cls._memory_lockouts.pop(key, None)
