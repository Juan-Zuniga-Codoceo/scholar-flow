import os
from contextlib import contextmanager
import psycopg2
import psycopg2.extras
from psycopg2.pool import ThreadedConnectionPool
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "postgresql://postgres@localhost:5432/scholarflow_dev"

# Initialize connection pool
try:
    # ThreadedConnectionPool is thread-safe for concurrent FastAPI requests
    db_pool = ThreadedConnectionPool(1, 20, dsn=DATABASE_URL)
    print("✅ PostgreSQL Connection Pool Initialized")
except Exception as e:
    print(f"❌ Failed to initialize PostgreSQL Connection Pool: {e}")
    db_pool = None

@contextmanager
def get_db_connection():
    if not db_pool:
        raise Exception("Database connection pool is not initialized")
    conn = db_pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        db_pool.putconn(conn)

def execute_query(query, params=None, fetch=False):
    """
    Helper function to run queries with dictionary cursor
    """
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            if fetch:
                return [dict(row) for row in cur.fetchall()]
            return None

def execute_query_one(query, params=None):
    """
    Helper function to query a single record
    """
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            row = cur.fetchone()
            return dict(row) if row else None
