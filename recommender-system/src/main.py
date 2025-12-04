# recommender-system/src/main.py

import json
import sys
import os
import psycopg2
import pandas as pd
from contentbasedsystem import find_next

# Connect to the PostgreSQL database
def connect_database():
    conn_string = os.getenv('DATABASE_URL')
    if not conn_string:
        conn_string = 'postgresql://youchews_db_xoi5_user:zptvD9AU0HjAEbhKJEirMxV7IvOovRWn@dpg-d4d7euf5r7bs73aqdnf0-a:5432/youchews_db_xoi5'
        print("WARNING: Using fallback DATABASE_URL", file=sys.stderr)

    try:
        conn = psycopg2.connect(conn_string)
        print("Connected to DB", file=sys.stderr)
        return conn
    except Exception as e:
        print(f"DB connection failed: {e}", file=sys.stderr)
        sys.exit(1)

# Execute recommendation based on command-line arguments (normal operation)
def execute_from_args():
    if len(sys.argv) != 4:
        print("ERROR: Expected 3 args", file=sys.stderr)
        sys.exit(1)

    try:
        restaurant_ids = json.loads(sys.argv[1])
        user_id = int(sys.argv[2])
        item_count = int(sys.argv[3])
    except Exception as e:
        print(f"Arg parse error: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Processing {len(restaurant_ids)} candidates for user {user_id}", file=sys.stderr)

    conn = connect_database()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, name, restaurant_info 
                FROM restaurants 
                WHERE id = ANY(%s)
            """, (restaurant_ids,))
            rows = cur.fetchall()

        if not rows:
            print("No restaurants found", file=sys.stderr)
            return []

        # Build DataFrame directly from JSONB
        df = pd.DataFrame([
            {
                "id": row[0],
                "name": row[1],
                **row[2]  # Unpack all keys from restaurant_info
            }
            for row in rows
        ])

        print(f"Fetched {len(df)} restaurants", file=sys.stderr)

        # Extract user preferences
        with conn.cursor() as cur:
            cur.execute("SELECT user_preferences FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            user_prefs = row[0] if row and row[0] else []

        if not user_prefs:
            print("No preferences → returning top by proximity", file=sys.stderr)
            return [int(x) for x in restaurant_ids[:item_count]]

        userdata = pd.DataFrame(user_prefs)
        print(f"User has {len(userdata)} liked items", file=sys.stderr)

        # Run recommender
        recommended_ids = find_next(df, userdata, item_count)
        print(f"Recommended: {recommended_ids}", file=sys.stderr)
        return recommended_ids

    except Exception as e:
        print(f"Recommendation error: {e}", file=sys.stderr)
        raise
    finally:
        conn.close()

# FINAL OUTPUT: ONLY JSON ON STDOUT
if __name__ == "__main__":
    try:
        result = execute_from_args()
        print(json.dumps(result))
        sys.stdout.flush()
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)