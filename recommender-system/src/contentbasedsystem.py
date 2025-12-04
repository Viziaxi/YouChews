# recommender-system/src/contentbasedsystem.py

import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Prepare strings for vectorization
def prepare_strings(x):
    if isinstance(x, list):
        return ' '.join([str.lower(str(item)).replace(" ", "") for item in x])
    elif isinstance(x, str):
        return str.lower(x.replace(" ", ""))
    else:
        return ""

# Create a combined vector string for each field in a row
def create_vector_string(row):
    parts = []
    for field in ["flavors", "menu", "name", "price", "service_style", "cuisine"]:
        value = row.get(field)
        if pd.isna(value):
            continue
        if isinstance(value, list):
            parts.append(' '.join([str.lower(str(item)).replace(" ", "") for item in value]))
        elif isinstance(value, str):
            parts.append(str.lower(value.replace(" ", "")))
        else:
            parts.append(str(value))
    return ' '.join(parts)

# Main function to find next recommended items using content-based filtering
def find_next(content: pd.DataFrame, userdata: pd.DataFrame, num: int = 1) -> list[int]:
    if userdata.empty:
        return content["id"].head(num).tolist()

    userdata = userdata.copy()
    userdata["item_id"] = userdata["item_id"].astype(int)
    if "like_level" in userdata.columns:
        userdata["like_level"] = pd.to_numeric(userdata["like_level"], errors='coerce').fillna(5)
    userdata = userdata.sort_values("like_level", ascending=False).reset_index(drop=True)

    # Clean content fields
    content = content.copy()
    for col in ["flavors", "menu", "cuisine", "service_style"]:
        if col in content.columns:
            content[col] = content[col].apply(prepare_strings)

    # Create text vectors
    content["vector_text"] = content.apply(create_vector_string, axis=1)
    liked_items = content[content["id"].isin(userdata["item_id"])]

    if liked_items.empty:
        return content["id"].head(num).tolist()

    liked_items["vector_text"] = liked_items.apply(create_vector_string, axis=1)

    # Vectorization and similarity computation, excluding stop words
    vectorizer = CountVectorizer(stop_words="english")
    content_matrix = vectorizer.fit_transform(content["vector_text"])
    user_matrix = vectorizer.transform(liked_items["vector_text"])

    sim_matrix = cosine_similarity(user_matrix, content_matrix)
    sim_scores = sim_matrix.mean(axis=0)

    # Remove already liked items
    content_indices = content.index
    scored = pd.DataFrame({
        "id": content["id"],
        "score": sim_scores,
        "index": content_indices
    })
    scored = scored[~scored["id"].isin(userdata["item_id"])]

    top = scored.sort_values("score", ascending=False).head(num)
    return top["id"].astype(int).tolist()