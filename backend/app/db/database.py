import datetime
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, event, func, inspect
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 30}

engine = create_engine(DATABASE_URL, **engine_kwargs)


# ─── SQLite Compatibility Listeners ───────────────────────────────────────────
@event.listens_for(Engine, "connect")
def register_sqlite_compatibility(dbapi_connection, connection_record):
    """
    1. Register 'now()' function in SQLite for PostgreSQL default compatibility.
    2. Enable Foreign Key constraints and WAL mode in SQLite.
    """
    if hasattr(dbapi_connection, "create_function"):
        dbapi_connection.create_function(
            "now",
            0,
            lambda: datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        )

    if hasattr(dbapi_connection, "execute"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()


@event.listens_for(Session, "before_flush")
def auto_assign_sqlite_primary_keys(session, flush_context, instances):
    """
    Auto-assign missing integer primary keys for SQLite inserts.
    Fixes 'NOT NULL constraint failed' on BIGINT primary key columns in SQLite.
    """
    if session.bind and session.bind.dialect.name == "sqlite":
        assigned_max = {}
        for obj in list(session.new):
            mapper = inspect(obj.__class__)
            for pk_col in mapper.primary_key:
                try:
                    is_int = issubclass(pk_col.type.python_type, int)
                except (AttributeError, NotImplementedError, TypeError):
                    is_int = False

                if is_int:
                    prop = mapper.get_property_by_column(pk_col)
                    attr_name = prop.key
                    if getattr(obj, attr_name) is None:
                        col_key = (mapper.mapped_table.name, pk_col.name)
                        if col_key not in assigned_max:
                            max_val = session.query(func.max(pk_col)).scalar() or 0
                            assigned_max[col_key] = max_val
                        assigned_max[col_key] += 1
                        setattr(obj, attr_name, assigned_max[col_key])


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for FastAPI endpoints to get a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()