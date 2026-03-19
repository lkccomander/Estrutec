from collections import deque
from dataclasses import dataclass, field
from threading import Lock
from time import monotonic

from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


@dataclass
class RateLimitRule:
    path: str
    methods: tuple[str, ...]
    max_requests: int
    window_seconds: int


@dataclass
class _Bucket:
    entries: deque[float] = field(default_factory=deque)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, rules: list[RateLimitRule], trust_proxy_headers: bool = True):
        super().__init__(app)
        self._rules = rules
        self._trust_proxy_headers = trust_proxy_headers
        self._storage: dict[tuple[str, str, str], _Bucket] = {}
        self._lock = Lock()

    def _get_client_ip(self, request: Request) -> str:
        if self._trust_proxy_headers:
            forwarded_for = request.headers.get("x-forwarded-for", "")
            if forwarded_for:
                return forwarded_for.split(",")[0].strip()

        if request.client:
            return request.client.host

        return "unknown"

    def _match_rule(self, request: Request) -> RateLimitRule | None:
        for rule in self._rules:
            if request.url.path == rule.path and request.method in rule.methods:
                return rule
        return None

    async def dispatch(self, request: Request, call_next):
        rule = self._match_rule(request)
        if not rule:
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        now = monotonic()
        key = (client_ip, request.method, request.url.path)

        with self._lock:
            bucket = self._storage.setdefault(key, _Bucket())
            while bucket.entries and now - bucket.entries[0] >= rule.window_seconds:
                bucket.entries.popleft()

            if len(bucket.entries) >= rule.max_requests:
                retry_after = max(1, int(rule.window_seconds - (now - bucket.entries[0])))
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too Many Requests"},
                    headers={"Retry-After": str(retry_after)},
                )

            bucket.entries.append(now)

        return await call_next(request)
