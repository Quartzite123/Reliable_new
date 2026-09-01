from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# pool_pre_ping (2026-09-02): Neon's serverless Postgres suspends its
# compute after DB inactivity and silently drops idle connections.
# Without pre_ping, SQLAlchemy hands out a pooled connection without
# checking it's alive first — the next query on it fails with
# `psycopg2.OperationalError: SSL connection has been closed unexpectedly`,
# an unhandled exception that surfaces to the client as a bare 500.
# Reproduced directly against the live DB (not inferred): after a period
# of no queries, the first request on the existing pool raised exactly
# that error; a fresh connection afterward worked fine. pre_ping issues a
# cheap liveness check before handing out a connection and transparently
# reconnects only if it's actually dead — the fix for the user-visible error.
#
# Deliberately NOT using pool_recycle. Measured directly (interleaved
# against live Neon, so the comparison isn't skewed by Neon's own
# swinging latency): pre_ping-only and pre_ping+recycle=280 cost the
# same when recycle isn't firing (280s is longer than any request gap in
# that test) — recycle added zero benefit there. But a *forced* recycle
# event measured a consistent ~1.2-1.4s extra — a full reconnect,
# unconditionally, regardless of whether the old connection was still
# healthy. For a ~12-user app with sporadic traffic, idle gaps between
# real requests plausibly exceed 280s often, meaning recycle would pay
# that full-reconnect cost on close to every request — strictly worse
# than pre_ping, which only pays it when a connection has actually gone
# bad. GET /health now queries the DB (see main.py) specifically so
# UptimeRobot's 5-minute ping keeps Neon's compute from suspending in
# the first place, which is what actually removes the underlying cause
# rather than just handling the symptom either of these options would.
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base — every SQLAlchemy model in app/models/ inherits from this."""

    pass


def get_db():
    """FastAPI dependency — yields a DB session, closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
