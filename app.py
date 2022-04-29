import json
from flask import Flask, request, jsonify, send_from_directory
from server.search import search, all as all_companies, all_names_desc, all_batches
from server.scrape import company as scrape_company

app = Flask(__name__,
        static_url_path='/',
        static_folder='static',
        template_folder='static')
app.config['JSON_AS_ASCII'] = False

@app.route('/search', methods=['GET'])
def semantic_search():
    text = request.args.get('text')
    batch = request.args.get('batch')
    show_inactive = request.args.get('show_inactive')
    n = 25
    try:
        n = int(request.args.get('n'))
    except:
        pass

    if not text:
        companies = all_companies()
    else:
        companies = search(text)

    if not show_inactive or show_inactive == 'false':
        companies = [co for co in companies if co['status'] != 'Inactive']
    if batch:
        companies = [co for co in companies if co['batch'] == batch]

    return jsonify(companies[:n])

@app.route('/company', methods=['GET'])
def get_company():
    slug = request.args.get('slug')
    if not slug:
        return jsonify(None)

    return scrape_company(slug)

@app.route('/preloads.js', methods=['GET'])
def get_preloads_js():
    batches = f'const YC_BATCHES = {json.dumps(all_batches())};'
    names = f'const YC_NAMES_DESC = {json.dumps(all_names_desc())};'
    return '\n'.join([batches, names])

@app.route('/', methods=['GET'])
def index():
    return app.send_static_file('index.html')

