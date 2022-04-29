#!/bin/bash

# download the YC list from github.com/akshaybhalotia/yc_company_scraper
wget 'https://github.com/akshaybhalotia/yc_company_scraper/raw/main/data/yc_essential_data.json' -O data/yc.json

# virtualenv
source .venv/bin/activate

# re-generate embeddings
python server/generate.py

