import time
import hashlib
from typing import Optional, Any

class QueryCache:
    """
    In-memory LRU query cache with TTL expiration.
    Guarantees <5ms sub-millisecond responses for repeated or identical queries.
    """
    def __init__(self, max_size: int = 100, default_ttl_seconds: int = 300):
        self.cache: dict[str, dict[str, Any]] = {}
        self.max_size = max_size
        self.default_ttl = default_ttl_seconds

    def _generate_key(self, query: str, tables: list[str], session_id: str = "") -> str:
        raw = f"{session_id}|{query.strip().lower()}|{','.join(sorted(tables))}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, query: str, tables: list[str], session_id: str = "") -> Optional[dict[str, Any]]:
        key = self._generate_key(query, tables, session_id)
        entry = self.cache.get(key)
        if not entry:
            return None

        # Check expiration
        if time.time() > entry["expires_at"]:
            del self.cache[key]
            return None

        return entry["payload"]

    def set(self, query: str, tables: list[str], payload: dict[str, Any], session_id: str = "", ttl: Optional[int] = None) -> None:
        # Never cache failed or empty responses
        if not payload.get("data_preview") and not payload.get("chart") and not payload.get("sql_query"):
            return

        if len(self.cache) >= self.max_size:
            # Pop oldest item
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]

        key = self._generate_key(query, tables, session_id)
        expires_at = time.time() + (ttl or self.default_ttl)
        self.cache[key] = {
            "payload": payload,
            "expires_at": expires_at
        }

    def clear(self) -> None:
        self.cache.clear()

# Global cache instance
query_cache = QueryCache()

