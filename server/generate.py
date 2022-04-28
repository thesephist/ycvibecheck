import json
from sentence_transformers import SentenceTransformer

# works with JSON sourced from https://github.com/akshaybhalotia/yc_company_scraper

model = SentenceTransformer('sentence-transformers/all-roberta-large-v1')

with open('data/yc.json', 'r') as yc_file:
    yc_companies = json.load(yc_file)
    for co in yc_companies:
        print(co['name'])
        description = co.get('long_description')
        if not description:
            print(f'{co["name"]} has no description')
            continue
        embedding = model.encode(description)
        co['description_embedding'] = embedding.tolist()

    with open('data/yc-embedded.json', 'w') as embeddings_file:
        json.dump(yc_companies, embeddings_file)

