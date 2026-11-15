import base64
import binascii
import json
import os
import tempfile
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

MAX_BODY = 3_000_000
LABELS = {'mold', 'mould', 'rot', 'rotten'}
CROPS = {'lettuce', 'basil', 'pak choi', 'tomato', 'cucumber', 'onion', 'potato', 'cabbage', 'wheat', 'corn'}
DEFAULT_MODEL = 'manojs-workspace-youcz/food-spoilage-segmentation-2-yolo26n-seg-t1'


CARE = {
    'tomato_early_blight': ('Possible tomato early blight', 'Check for concentric rings on lower leaves. When dry, remove affected leaves, clean tools, mulch, and water at soil level. Confirm the diagnosis before choosing a spray.', 'https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/early-blight-in-tomato-and-potato'),
    'potato_early_blight': ('Possible potato early blight', 'Check older leaves for concentric lesions. Reduce leaf wetness, remove infected debris, and confirm the diagnosis before treatment.', 'https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/early-blight-in-tomato-and-potato'),
    'tomato_gray_mold': ('Possible tomato gray mould', 'Increase ventilation, avoid overhead watering, and remove infected leaves, stems and fruit while plants are dry.', 'https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/gray-mold-of-tomatoes')
}


def disease_care(result, crop=''):
    findings = []
    for prediction in result.get('predictions', []):
        label = '_'.join(str(prediction.get('class', '')).lower().replace('_', ' ').replace('-', ' ').split())
        confidence = float(prediction.get('confidence', 0))
        if label in CARE and (not crop or label.startswith(crop + '_')) and .75 <= confidence <= 1:
            name, steps, source = CARE[label]
            findings.append(dict(name=name, confidence=round(confidence,3), steps=steps, source=source))
    return max(findings, key=lambda item: item['confidence'], default=None)


def infer(path, weights, key, model, labels=None):
    if weights:
        try:
            return local_yolo(weights, path, labels), 'Local YOLO'
        except Exception as error:
            if not (key and model):
                raise
            print('Local screening failed:', type(error).__name__)
    if key and model:
        return hosted_inference(key, model, path), 'Roboflow'
    return {'predictions': []}, ''


def scan(image_bytes, crop=''):
    weights = os.getenv('YOLO_MOULD_WEIGHTS')
    key = os.getenv('ROBOFLOW_API_KEY')
    vegetable_weights = os.getenv('YOLO_VEGETABLE_WEIGHTS')
    vegetable_model = os.getenv('ROBOFLOW_VEGETABLE_MODEL_ID')
    disease_weights = os.getenv('YOLO_DISEASE_WEIGHTS')
    disease_model = os.getenv('ROBOFLOW_DISEASE_MODEL_ID')
    if not (weights or key or vegetable_weights or disease_weights):
        raise RuntimeError('Configure ROBOFLOW_API_KEY or YOLO_MOULD_WEIGHTS on the server.')
    from PIL import Image, ImageOps
    from io import BytesIO
    with Image.open(BytesIO(image_bytes)) as original:
        if original.width * original.height > 20_000_000:
            raise ValueError('Use an image smaller than 20 megapixels.')
        image = ImageOps.exif_transpose(original).convert('RGB')
        image.thumbnail((1280, 1280))
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / 'photo.jpg'
        image.save(path, quality=90)
        result = {'predictions': []}
        source = ''
        try:
            result, source = infer(path, weights, key, os.getenv('ROBOFLOW_MODEL_ID', DEFAULT_MODEL), LABELS)
            if not isinstance(result, dict) or not isinstance(result.get('predictions'), list):
                raise RuntimeError('Unexpected mould model response.')
        except Exception as error:
            result = {'predictions': []}
            source = ''
            print('Mould inference failed:', type(error).__name__)
        disease = None
        try:
            disease_result, _ = infer(path, disease_weights, key, disease_model, set(CARE))
            disease = disease_care(disease_result, crop)
        except Exception as error:
            print('Disease inference failed:', type(error).__name__)
        vegetables = []
        vegetable_message = 'Vegetable identification unavailable.'
        try:
            vegetable_result, vegetable_source = infer(path, vegetable_weights, key, vegetable_model) if not crop else ({'predictions': []}, '')
            vegetables = sorted(
                ({'label': str(row['class']), 'confidence': round(float(row['confidence']), 3)}
                 for row in vegetable_result['predictions'] if .60 <= float(row['confidence']) <= 1),
                key=lambda row: row['confidence'], reverse=True)[:3]
            if vegetable_source:
                vegetable_message = 'No confident vegetable match. Try one clearly framed vegetable.'
        except Exception as error:
            print('Vegetable inference failed:', type(error).__name__)
    if not isinstance(result, dict) or not isinstance(result.get('predictions'), list):
        raise RuntimeError('The inference service returned an unexpected response.')
    regions = []
    for prediction in result['predictions']:
        label = str(prediction.get('class', '')).lower().strip()
        score = float(prediction.get('confidence', 0))
        if label in LABELS and .55 <= score <= 1:
            regions.append({'label': label, 'confidence': round(score, 3)})
    return {'source': source, 'regions': regions, 'vegetables': vegetables, 'vegetableMessage': vegetable_message, 'disease': disease,
            'status': 'unavailable' if not source else 'possible_mould' if any(p['label'] in {'mold', 'mould'} for p in regions)
            else 'possible_rot' if regions else 'inconclusive'}


def hosted_inference(key, model, path):
    endpoint = 'https://serverless.roboflow.com/' + quote(model, safe='/')
    query = urlencode({'api_key': key})
    request = Request(f'{endpoint}?{query}', data=base64.b64encode(Path(path).read_bytes()),
                      headers={'Content-Type': 'application/x-www-form-urlencoded'})
    with urlopen(request, timeout=20) as response:
        return json.load(response)


def local_yolo(weights, path, required_labels=None):
    from ultralytics import YOLO
    if not Path(weights).is_file():
        raise RuntimeError('The local YOLO weights file is missing.')
    model = YOLO(weights)
    if required_labels and not required_labels.intersection(str(name).lower().strip() for name in model.names.values()):
        raise RuntimeError('The YOLO weights need mould or rot labels.')
    result = model.predict(str(path), conf=.55, verbose=False)[0]
    if result.boxes is None:
        raise RuntimeError('Use a YOLO detection or segmentation model.')
    return {'predictions': [{'class': result.names[int(label)], 'confidence': float(score)}
                            for label, score in zip(result.boxes.cls.tolist(), result.boxes.conf.tolist())]}


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= MAX_BODY:
                return self.send_json(413, {'error': 'Choose a smaller image.'})
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError('Expected a JSON object.')
            crop = payload.get('crop', '')
            if not isinstance(crop, str) or (crop and crop not in CROPS):
                return self.send_json(400, {'error': 'Choose Auto-detect or a crop from the menu.'})
            raw = base64.b64decode(payload['image'], validate=True)
            if not raw.startswith((b'\xff\xd8\xff', b'\x89PNG\r\n\x1a\n', b'RIFF')):
                raise ValueError('Unsupported image.')
        except (KeyError, TypeError, ValueError, binascii.Error):
            return self.send_json(400, {'error': 'Choose a valid JPEG, PNG, or WebP image.'})
        if not (os.getenv('ROBOFLOW_API_KEY') or os.getenv('YOLO_MOULD_WEIGHTS') or os.getenv('YOLO_VEGETABLE_WEIGHTS') or os.getenv('YOLO_DISEASE_WEIGHTS')):
            return self.send_json(503, {'error': 'Photo screening is unavailable right now.'})
        try:
            return self.send_json(200, scan(raw, crop))
        except (ValueError, OSError):
            return self.send_json(422, {'error': 'The image could not be read. Try another photo.'})
        except Exception as error:
            # Do not log an SDK exception that may contain the URL or API key.
            print('Mould inference failed:', type(error).__name__)
            return self.send_json(502, {'error': 'The model could not complete the scan. Check server configuration and model access.'})

    def send_json(self, status, body):
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
