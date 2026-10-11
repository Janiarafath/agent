import os
import socket
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Connects to a Cloud PostgreSQL database (e.g., Supabase, Neon, AWS RDS)
# Defaults to a local SQLite for immediate demo testing if no URL is provided.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./growthpilot_demo.db")

# Postgres requires a specific connection string format in SQLAlchemy
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

_connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
if "postgresql" in DATABASE_URL:
    # Fail fast (10s) instead of hanging minutes on dead routes — the UI
    # shows Retry instead of spinning forever.
    _connect_args["connect_timeout"] = 10

if "neon.tech" in DATABASE_URL:
    # Resilience: some ISP DNS returns IPv6-only answers for the pooler while
    # this machine has no IPv6 route. Pin a working IPv4 via DNS-over-HTTPS
    # (hostaddr keeps TLS/SNI on the real hostname).
    import re as _re
    _host = (_re.search(r"@([^/:?#]+)", DATABASE_URL) or [None, ""])[1]
    _FALLBACK_IPS = ["52.14.39.200", "52.95.251.153", "77.112.100.143"]
    _ip = ""
    try:
        import json as _json
        import urllib.request as _url
        with _url.urlopen(
            f"https://dns.google/resolve?name={_host}&type=A",
            timeout=10,
        ) as _r:
            for _a in _json.loads(_r.read().decode()).get("Answer", []):
                _d = _a.get("data", "")
                if _d and _d[0].isdigit():
                    _ip = _d
                    break
    except Exception as _e:
        print(f"[DB] DoH resolve fail: {_e}")
    for _cand in ([_ip] if _ip else []) + _FALLBACK_IPS:
        try:
            _s = socket.create_connection((_cand, 5432), timeout=8)
            _s.close()
            _connect_args["hostaddr"] = _cand
            print(f"[DB] Neon via pinned IPv4 {_cand}")
            break
        except Exception as _e:
            print(f"[DB] IPv4 {_cand} unreachable: {_e}")
            continue

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=_connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
