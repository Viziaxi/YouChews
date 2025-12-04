# recommender-system/src/main.py

import json
import sys
import os
import psycopg2
import pandas as pd
from contentbasedsystem import find_next


# --------------------------------------------------------------
# Helper: Connect to Render PostgreSQL using DATABASE_URL
# --------------------------------------------------------------
def connect_database():
    conn_string = 'postgresql://youchews_db_xoi5_user:zptvD9AU0HjAEbhKJEirMxV7IvOovRWn@dpg-d4d7euf5r7bs73aqdnf0-a/youchews_db_xoi5'
    if not conn_string:
        print("ERROR: DATABASE_URL environment variable is missing!", file=sys.stderr)
        sys.exit(1)

    print(f"Connecting to database... ({conn_string.split('@')[1].split('/')[0]})")
    try:
        conn = psycopg2.connect(conn_string, sslmode='require')
        print("Successfully connected to PostgreSQL on Render")
        return conn
    except Exception as e:
        print(f"Failed to connect to database: {e}", file=sys.stderr)
        sys.exit(1)


# --------------------------------------------------------------
# Main recommendation logic
# --------------------------------------------------------------
def execute_from_args():
    print(f"Python process started. Args: {sys.argv}")

    if len(sys.argv) != 4:
        print("ERROR: Expected 3 arguments: candidate_ids, user_id, count", file=sys.stderr)
        sys.exit(1)

    try:
        restaurant_ids = json.loads(sys.argv[1])
        user_id = int(sys.argv[2])
        item_count = int(sys.argv[3])
    except Exception as e:
        print(f"ERROR parsing arguments: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Received {len(restaurant_ids)} candidate restaurant IDs")
    print(f"User ID: {user_id}, Requested recommendations: {item_count}")

    conn = connect_database()
    try:
        # 1. Fetch candidate restaurants
        with conn.cursor() as cur:
            print("Fetching restaurant data from DB...")
            cur.execute("""
                SELECT id, name, restaurant_info 
                FROM restaurants 
                WHERE id = ANY(%s)
            """, (restaurant_ids,))
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

        if not rows:
            print("No restaurants found for the given IDs")
            return []

        restaurant_df = pd.DataFrame(rows, columns=columns)
        content = pd.DataFrame(restaurant_df["restaurant_info"].to_list())
        content["id"] = restaurant_df["id"]
        content["name"] = restaurant_df["name"]

        print(f"Fetched {len(content)} restaurants for recommendation")

        # 2. Fetch user preferences
        with conn.cursor() as cur:
            print(f"Fetching preferences for user ID {user_id}...")
            cur.execute("SELECT user_preferences FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            user_prefs = row[0] if row and row[0] else []

        if not user_prefs:
            print("No user preferences found – returning top candidates by proximity")
            # Return first N IDs as fallback (or you can randomize/shuffle)
            return [int(x) for x in restaurant_ids[:item_count]]

        userdata = pd.DataFrame(user_prefs)
        print(f"User has {len(userdata)} preference entries")

        # 3. Run recommendation
        print("Running content-based recommendation engine...")
        recommended_ids = find_next(content, userdata, item_count)
        print(f"Recommendation complete. Recommended IDs: {recommended_ids}")

        return recommended_ids

    except Exception as e:
        print(f"ERROR during recommendation: {e}", file=sys.stderr)
        raise
    finally:
        conn.close()
        print("Database connection closed")


# --------------------------------------------------------------
# Entry point
# --------------------------------------------------------------
if __name__ == "__main__":
    print("=== YouChews Recommender System (Python) Started ===")
    try:
        result = execute_from_args()
        # Output must be valid JSON array of integers
        print(json.dumps(result))
        sys.stdout.flush()
    except Exception as e:
        error_response = {"error": str(e)}
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)

    print("=== Recommender Finished Successfully ===")