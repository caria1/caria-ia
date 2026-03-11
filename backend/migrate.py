import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'finance.db')

conn = sqlite3.connect(db_path)
c = conn.cursor()

try:
    c.execute("ALTER TABLE users ADD COLUMN balance FLOAT DEFAULT 0.0")
except sqlite3.OperationalError:
    pass

try:
    c.execute("ALTER TABLE users ADD COLUMN profile_picture VARCHAR")
except sqlite3.OperationalError:
    pass

try:
    c.execute("ALTER TABLE categories ADD COLUMN budget_limit FLOAT")
except sqlite3.OperationalError:
    pass

conn.commit()
conn.close()
print("Migration successful")
