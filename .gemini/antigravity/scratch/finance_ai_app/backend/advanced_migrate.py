import sqlite3

def run_migration():
    conn = sqlite3.connect("finance.db")
    cursor = conn.cursor()

    # 1. Update Users Table with new fields
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN health_score INTEGER DEFAULT 50;")
        cursor.execute("ALTER TABLE users ADD COLUMN financial_profile TEXT;")
        cursor.execute("ALTER TABLE users ADD COLUMN family_group_id TEXT;")
    except sqlite3.OperationalError:
        pass # Columns already exist

    # 2. Update Transactions Table
    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN card_id INTEGER REFERENCES credit_cards(id);")
        cursor.execute("ALTER TABLE transactions ADD COLUMN is_recurring BOOLEAN DEFAULT 0;")
        cursor.execute("ALTER TABLE transactions ADD COLUMN split_with TEXT;")
    except sqlite3.OperationalError:
        pass

    # Note: the other tables (credit_cards, investments, achievements, alerts) 
    # will be created automatically by SQLAlchemy via main.py metadata.create_all

    conn.commit()
    conn.close()
    print("Advanced Migration Complete.")

if __name__ == "__main__":
    run_migration()
