import pandas as pd
from ast import literal_eval

from sklearn.metrics.pairwise import linear_kernel
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import CountVectorizer

def eval_features(data: pd.DataFrame, *args):
    for feature in args:
        data[feature] = data[feature].fillna("[]").apply(literal_eval)

def prepare_strings(x):
    if isinstance(x, list):
        return [str.lower(s.replace(" ", "")) for s in x]
    elif isinstance(x, str):
        return str.lower(x.replace(" ", ""))
    else:
        return ""

def create_vector_string(data) -> str:
    result = ""
    for col in ["flavors", "menu", "name", "price", "service_style"]:
        if len(result) > 0:
            result += ' '
        if isinstance(data[col], str):
            result += data[col]
        else:
            result += ' '.join(data[col])

    return result

def to_ints(content: pd.DataFrame, *args: str):
    for feature in args:
        content[feature] = content[feature].astype(int)

def find_next(content: pd.DataFrame, userdata: pd.DataFrame, source_row=0):
    to_ints(userdata, "item_id", "like_level")
    userdata.sort_values("like_level", ascending=False, inplace=True, ignore_index=True)

    original = content.copy()
    
    for col in ("flavors", "menu", "name", "price", "service_style"):
        content[col] = content[col].apply(prepare_strings)
    
    eval_features(content, "flavors", "menu")
    print(content.to_string())
    print(userdata.to_string())
    
    selected: pd.DataFrame = content.loc[[id for id in userdata["item_id"]]]
    contentvectors = content.apply(create_vector_string, axis=1)
    uservectors = selected.apply(create_vector_string, axis=1)

    contentcount = CountVectorizer(stop_words="english")
    contentmatrix = contentcount.fit_transform(contentvectors)
    usercount = CountVectorizer(stop_words="english", vocabulary=contentcount.get_feature_names_out())
    usermatrix = usercount.fit_transform(uservectors)
    sim_matrix = cosine_similarity(usermatrix, contentmatrix)

    print(sim_matrix)

    print(f"Because you liked {original["name"][userdata["item_id"][source_row]]}:")
    indexed_scores = [pair for pair in enumerate(sim_matrix[source_row]) if pair[0] != source_row]
    indexed_scores = sorted(indexed_scores, key=lambda pair: pair[1], reverse=True)
    best_item_row = indexed_scores[0][0]
    print(f"Try {original["name"][best_item_row]}")

    pass