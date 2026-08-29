import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from sqlalchemy import BigInteger, create_engine, event, func, inspect, select
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session, declarative_base, sessionmaker

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

_SQLITE_LEGACY_PK_TABLES: set[tuple[str, str]] = set()


def _sqlite_requires_explicit_primary_key(
    session: Session, table_name: str, column: str
) -> bool:
    """Detect old SQLite tables created with BIGINT rather than INTEGER IDs."""
    cache_key = (table_name, column)
    if cache_key in _SQLITE_LEGACY_PK_TABLES:
        return True
    rows = session.connection().exec_driver_sql(
        f'PRAGMA table_info("{table_name}")'
    ).mappings()
    legacy = any(
        row["name"] == column and row["type"].upper() != "INTEGER" for row in rows
    )
    if legacy:
        _SQLITE_LEGACY_PK_TABLES.add(cache_key)
    return legacy


@event.listens_for(Session, "before_flush")
def assign_legacy_sqlite_primary_keys(
    session: Session, _flush_context, _instances
) -> None:
    """Keep existing local SQLite files usable after BIGINT PK compatibility changes.

    SQLite auto-increments only an exact ``INTEGER PRIMARY KEY``. Fresh schemas
    compile BigInteger IDs correctly, but older local files need an explicit ID
    until they are recreated or migrated.
    """
    if session.get_bind().dialect.name != "sqlite":
        return

    next_ids: dict[tuple[str, str], int] = {}
    for instance in session.new:
        mapper = inspect(instance).mapper
        if len(mapper.primary_key) != 1:
            continue
        primary_key = mapper.primary_key[0]
        try:
            is_integer = issubclass(primary_key.type.python_type, int)
        except (AttributeError, NotImplementedError, TypeError):
            is_integer = False
        if not is_integer:
            continue
        attribute = mapper.get_property_by_column(primary_key).key
        if getattr(instance, attribute) is not None:
            continue
        table_name = mapper.local_table.name
        if not _sqlite_requires_explicit_primary_key(
            session, table_name, primary_key.name
        ):
            continue
        key = (table_name, primary_key.name)
        if key not in next_ids:
            next_ids[key] = (
                session.scalar(select(func.coalesce(func.max(primary_key), 0))) or 0
            )
        next_ids[key] += 1
        setattr(instance, attribute, next_ids[key])


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
