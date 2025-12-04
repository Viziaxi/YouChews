import pandas as pd
from ast import literal_eval

from sklearn.metrics.pairwise import linear_kernel
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import CountVectorizer


def eval_features(data: pd.DataFrame, *args):
    for feature in args:
        if data[feature].dtype == str:
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


def find_next(content: pd.DataFrame, userdata: pd.DataFrame, num: int = 1) -> list[int]:
    userdata["item_id"] = userdata["item_id"].astype(int)
    userdata["like_level"] = userdata["like_level"].astype(float)
    userdata.sort_values("like_level", ascending=False, inplace=True, ignore_index=True)

    for col in ("flavors", "menu", "name", "price", "service_style", "cuisine"):
        content[col] = content[col].apply(prepare_strings)

    eval_features(content, "flavors", "menu")

    # print(content["id"].dtype)
    # print(userdata["item_id"].dtype)
    # print(content.to_string())
    # print(userdata.to_string())

    selected: pd.DataFrame = content[content["id"].isin(userdata["item_id"])]
    contentvectors = content.apply(create_vector_string, axis=1)
    uservectors = selected.apply(create_vector_string, axis=1)
    # print(selected.to_string())

    contentcount = CountVectorizer(stop_words="english")
    contentmatrix = contentcount.fit_transform(contentvectors)
    usercount = CountVectorizer(stop_words="english", vocabulary=contentcount.get_feature_names_out())
    usermatrix = usercount.fit_transform(uservectors)
    sim_matrix = cosine_similarity(usermatrix, contentmatrix)

    # print(sim_matrix)

    source_id = userdata["item_id"][0]
    source_content_row = content.index[content["id"] == source_id][0]
    source_userdata_row = userdata.index[userdata["item_id"] == source_id][0]
    # print(f"Because you liked {original["name"][source_content_row]}:")
    indexed_scores = [pair for pair in enumerate(sim_matrix[source_userdata_row]) if pair[0] != source_content_row]
    indexed_scores = sorted(indexed_scores, key=lambda pair: pair[1], reverse=True)
    num = min(num, len(indexed_scores))
    best_rows = [pair[0] for pair in indexed_scores[:num]]

    # print([original["name"][row] for row in best_rows])
    return [content["id"][row] for row in best_rows]