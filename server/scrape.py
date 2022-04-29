import json
from urllib.request import urlopen
from bs4 import BeautifulSoup

def company(slug):
    try:
        url = f'https://www.ycombinator.com/companies/{slug}'
        with urlopen(url) as page:
            soup = BeautifulSoup(page, 'html.parser')
            jsonElement = soup.select_one('[type="application/json"][data-component-name="CompaniesShowPage"]')
            jsonText = jsonElement.text
            companyData = json.loads(jsonText)
            return companyData
    except Exception as e:
        print('Error while scraping (may indicate out-of-date scraping logic):', e)
        return None

