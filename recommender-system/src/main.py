import pandas as pd
import numpy as np
import sys
import json
import configparser
import pathlib
import psycopg2
from io import StringIO

import contentbasedsystem

CONFIG_PATH = pathlib.Path(__file__).parent / "config.ini"
TEST_PATH = pathlib.Path(__file__).parent.parent / "testdata"

def connect_database():
    try:
        return psycopg2.connect(
            database="postgres",
            user="postgres",
            password="12345678",
            host="localhost",
            port=5432
        )
    except:
        return False

def use_testdata(count: int) -> list[int]:
    restaurants = pd.read_csv((TEST_PATH / "restaurants.csv").resolve(), quotechar='"', index_col=False)
    userdata = pd.read_csv((TEST_PATH / "userdata.csv").resolve(), quotechar='"', index_col=False)
    return contentbasedsystem.find_next(restaurants, userdata, count)

def execute_from_args(connection) -> list[int]:
    restaurant_ids = pd.read_json(StringIO(sys.argv[1]))
    user_id = int(sys.argv[2])
    item_count = int(sys.argv[3])

    content: pd.DataFrame
    userdata: pd.DataFrame

    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM restaurants WHERE id = $1", restaurant_ids)
        content = pd.DataFrame(cursor.fetchall())
        cursor.execute("SELECT prefs FROM users WHERE id = $1", user_id)
        userdata = pd.DataFrame(cursor.fetchall())
    
    return contentbasedsystem.find_next(content, userdata, item_count)

class NpEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, np.integer):
            return int(o)
        if isinstance(o, np.floating):
            return float(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        return super(NpEncoder, self).default(o)

def main():
    if not CONFIG_PATH.resolve().exists():
        config = configparser.ConfigParser()
        config["Debug"] = {
            "use_test_csv": "False",
            "test_return_count": "2",
        }

        with open(CONFIG_PATH.resolve(), 'w') as configfile:
            config.write(configfile)
    
    config = configparser.ConfigParser()
    config.read(CONFIG_PATH.resolve())
    id_list = None

    connection = connect_database()
    if not connection:
        print("Unable to connect to database")

    if config["Debug"]["use_test_csv"] == "True":
        id_list = use_testdata(int(config["Debug"]["test_return_count"]))
    elif connection:
        id_list = execute_from_args(connection)
        connection.close()
    
    print(json.dumps(id_list, cls=NpEncoder))
    sys.stdout.flush()
    sys.exit(0)

if __name__ == "__main__":
    main()
