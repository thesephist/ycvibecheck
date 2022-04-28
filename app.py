from flask import Flask, request, jsonify, send_from_directory
from server.search import search, all as all_companies

app = Flask(__name__, static_url_path='/', static_folder='static')
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

    if text == '':
        companies = all_companies()
    else:
        companies = search(text)

    if not show_inactive or show_inactive == 'false':
        companies = [co for co in companies if co['status'] != 'Inactive']
    if batch:
        companies = [co for co in companies if co['batch'] == batch]

    return jsonify(companies[:n])

@app.route('/', methods=['GET'])
def index():
    print('fuck')
    return app.send_static_file('index.html')

