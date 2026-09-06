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
