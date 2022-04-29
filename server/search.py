import json
from scipy.spatial.distance import cosine
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('sentence-transformers/all-roberta-large-v1')

yc_companies = []
with open('data/yc-embedded.json', 'r') as embeddings_file:
    yc_companies = [co for co in json.load(embeddings_file) if co.get('description_embedding')]

all_yc_names_and_desc = [[co['name'], co['one_liner'] or co['long_description']] for co in yc_companies]

def all_names_desc():
    return all_yc_names_and_desc

def similarity(x, y):
    return cosine(x, y)

def search(query):
    query_embedding = model.encode(query)
    by_similarity = yc_companies[:]
    by_similarity.sort(key=lambda co: similarity(co['description_embedding'], query_embedding))

    results = [co.copy() for co in by_similarity]
    for co in results:
        co.pop('description_embedding')
    return results

def all():
    results = yc_companies[:]
    results.sort(key=lambda co: co['batch'], reverse=True)

    results = [co.copy() for co in results]
    for co in results:
        co.pop('description_embedding')
    return results

