import json
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlencode, urlparse, parse_qs
from urllib.request import urlopen

RESOURCE = '9ef84268-d588-465a-a308-a864a43d0070'


def market_rows(records):
    rows = {}
    for row in records:
        try:
            date = datetime.strptime(row['arrival_date'], '%d/%m/%Y').date().isoformat()
            price = float(row['modal_price'])
            if not 0 < price < 1e8:
                continue
            key = (row['market'], row.get('variety', ''), row.get('grade', ''))
        except (KeyError, TypeError, ValueError):
            continue
        if key not in rows or rows[key]['date'] < date:
            rows[key] = {'market': key[0], 'variety': key[1], 'grade': key[2],
                         'date': date, 'price': round(price/100, 2)}
    if not rows:
        return []
    latest = max(row['date'] for row in rows.values())
    return sorted((row for row in rows.values() if row['date'] == latest),
                  key=lambda row: row['price'], reverse=True)[:12]


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        values = parse_qs(urlparse(self.path).query)
        fields = {name: values.get(name, [''])[0].strip() for name in ('state', 'district', 'commodity')}
        if any(not value or len(value) > 70 for value in fields.values()):
            return self.send_json(400, {'error': 'Enter a state, district, and commodity.'})
        key = os.getenv('AGMARKNET_API_KEY')
        if not key:
            return self.send_json(503, {'error': 'Live market prices are unavailable. You can compare quotes below.'})
        params = {'api-key': key, 'format': 'json', 'limit': 100,
                  **{f'filters[{name}]': value for name, value in fields.items()}}
        try:
            with urlopen(f'https://api.data.gov.in/resource/{RESOURCE}?'+urlencode(params), timeout=12) as response:
                data = json.load(response)
            self.send_json(200, {'rows': market_rows(data['records']), 'source': 'AGMARKNET'})
        except (OSError, ValueError, TypeError, KeyError):
            self.send_json(502, {'error': 'Market prices could not be loaded. Try again later.'})

    def send_json(self, status, body):
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json')
        self.send_header('Content-Length',str(len(payload)))
        self.send_header('Cache-Control','no-store')
        self.end_headers()
        self.wfile.write(payload)
