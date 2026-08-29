import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from sqlalchemy import BigInteger, create_engine, event, func, select
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./societysync_local.db")

engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 30}

engine = create_engine(DATABASE_URL, **engine_kwargs)


@compiles(BigInteger, "sqlite")
def _compile_big_integer_for_sqlite(_type, _compiler, **_kwargs):
    """SQLite only auto-generates IDs for columns compiled as INTEGER."""
    return "INTEGER"


@event.listens_for(engine, "connect")
def register_sqlite_compatibility(dbapi_connection, _connection_record):
    """Enable SQLite foreign keys and a bounded wait for concurrent writers."""
    if engine.dialect.name != "sqlite":
        return
    cursor = dbapi_connection.cursor()
    dbapi_connection.create_function(
        "now", 0, lambda: datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
    )
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def is_postgresql(bind) -> bool:
    """Return whether a Session, Connection, or Engine is PostgreSQL-backed."""
    candidate = bind.get_bind() if hasattr(bind, "get_bind") else bind
    return getattr(getattr(candidate, "dialect", None), "name", None) == "postgresql"


def advisory_xact_lock(db, key: str) -> None:
    """Use PostgreSQL advisory locks when available; SQLite serializes writers itself."""
    if is_postgresql(db):
        db.execute(select(func.pg_advisory_xact_lock(func.hashtext(key))))


def get_db():
    """Dependency for FastAPI endpoints to get a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
