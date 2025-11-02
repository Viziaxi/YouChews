import pandas as pd
import configparser
import pathlib

import contentbasedsystem

CONFIG_PATH = pathlib.Path(__file__).parent / "config.ini"
TEST_PATH = pathlib.Path(__file__).parent.parent / "testdata"

def use_testdata():
    restaurants = pd.read_csv((TEST_PATH / "restaurants.csv").resolve(), quotechar='"', index_col=False)
    userdata = pd.read_csv((TEST_PATH / "userdata.csv").resolve(), quotechar='"', index_col=False)
    contentbasedsystem.find_next(restaurants, userdata, 0)

def main():    
    use_testdata()

if __name__ == "__main__":
    main()
