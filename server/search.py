import json
from scipy.spatial.distance import cosine
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')

yc_companies = []
with open('data/yc-embedded.json', 'r') as embeddings_file:
    yc_companies = [co for co in json.load(embeddings_file) if co.get('description_embedding')]
    # make top companies appear first by default, then sort by batch
    yc_companies.sort(key=lambda co: co['batch'], reverse=True)
    yc_companies.sort(key=lambda co: 0 if co['top_company'] else 1)

all_yc_batches = list(set(co['batch'] for co in yc_companies))
all_yc_batches.sort(
    # place "Unspecified" at end of list
    key=lambda batch: '\x00' if batch == 'Unspecified' else batch,
    reverse=True,
)

all_yc_names_and_desc = [[co['name'], co['one_liner'] or co['long_description']] for co in yc_companies]

def all_batches():
    return all_yc_batches

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
    results = [co.copy() for co in results]
    for co in results:
        co.pop('description_embedding')
    return results

