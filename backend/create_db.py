import psycopg2
import urllib.parse
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

password = urllib.parse.quote_plus('Anji@521')
conn = psycopg2.connect(f"postgresql://postgres:{password}@localhost:5432/postgres")
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()

try:
    cur.execute("CREATE DATABASE gst_fraud")
    print("Database created successfully")
except psycopg2.errors.DuplicateDatabase:
    print("Database already exists")

cur.close()
conn.close()
