// No-install release smoke test: node tests/smoke.mjs
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const text=(name)=>readFileSync(join(root,name),'utf8');
const modelHashes={
 'Verdant-Ops.blend':'c1eefb4fba8a982dce3803e7ccd73c2ca8e733fd2847ff2f7652e25249a57a64',
 'build_scene.py':'5b371e72a68143daef23d3ad978c07e0a2537b4ddb9b9e074a476c75ef2ec43a',
 'farm-renderer.js':'a2829c4df8684b7d6de2a434243c0d2b042a578bb7a9abafff87f95fd8b0f147',
 'assets/geometry.js':'fcb90dfa23f6ab5240b0ee972e3b3b2638815fd8c0d319e2649d1bad83c8c7e3'
};
for(const [name,expected] of Object.entries(modelHashes)){
 const hash=createHash('sha256').update(readFileSync(join(root,name))).digest('hex');
 assert.equal(hash,expected,`Original 3D scene asset changed: ${name}`);
}
for(const name of ['app.js','farm-renderer.js','crop-intelligence.js','intelligence.js','sw.js','api/mandi.js','api/sync.js']){
 execFileSync('node',['--check',join(root,name)],{stdio:'pipe'});
}
for(let i=0;i<14;i++)assert(existsSync(join(root,`assets/crop-${i}.jpg`)));
for(const id of ['crop-dashboard','crop-image','crop-health-label','walk-controls','hub-panels','farmer-tools']){
 assert(text('index.html').includes(`id="${id}"`),`Missing ${id}`);
}
const intelligence=text('intelligence.js');
for(const key of ['chemicalReference','azoxystrobin','Potassium bicarbonate','near harvest','indexedDB','/api/mandi','api.open-meteo.com','review-signs','manualSigns','backup-scans','import-backup','verified.length','Forecast data unavailable']){
 assert(intelligence.toLowerCase().includes(key.toLowerCase()),`Expected feature: ${key}`);
}
assert(!intelligence.includes('SMS alerts require'), 'SMS feature should be excluded');
assert(text('sw.js').includes('assets/geometry-parts/part-01.js'));
assert(text('sw.js').includes('verdant-ops-v5b-ai-20261115-r8'));
assert(text('index.html').includes('intelligence.js?v=20261115-r8'), 'App must request fresh image analysis');
assert(text('index.html').includes('crop-intelligence.js?v=20261115-r8'), 'Crop-first helper must load before disease image script');
assert(text('sw.js').includes('crop-intelligence.js'), 'Crop-first logic must be cached for offline use');
assert(intelligence.includes('CropAI.assess'), 'Image results must use crop-first assessment');
assert(text('index.html').includes('app.js?v=20261115-r8'), 'App must request fresh dashboard code');
assert(intelligence.includes('Fix image analysis / refresh app'), 'Stale-cache recovery link missing');
assert(intelligence.includes('updateViaCache'), 'Service worker updates must bypass HTTP cache');
assert(existsSync(join(root,'repair.html')), 'Repair page for users with stale JS required');
const repair=text('repair.html');
assert(repair.includes('verdant-ops-') && repair.includes('reg.unregister()'), 'Repair must clear old app cache');
assert(!/indexedDB\.deleteDatabase|caches\.delete\(.*transformers/i.test(repair),'Repair must preserve farm data and cached AI weights');
assert(intelligence.includes("dtype:'fp32'"), 'Require full-precision ONNX to avoid unsupported ConvInteger in q8 model');
assert(!intelligence.includes("dtype:'q8'"), 'Do not load quantized ConvInteger graph');
assert(!intelligence.includes('Free 38-class PlantVillage model runs in your browser'), 'Do not expose model source in scan panel');
assert(!intelligence.includes('AI could not run: '), 'Do not show raw runtime errors to farmers');
assert(intelligence.includes('No automated confidence'), 'Manual symptom guide must not pretend to classify images');
assert(intelligence.includes('NOT ranked as best nearby returns'), 'Unknown transport costs must not be ranked as confirmed net prices');
assert(text('index.html').includes('geometry-bootstrap.js'));
assert(text('index.html').includes('geometry-parts/part-09.js'));
JSON.parse(text('manifest.webmanifest'));JSON.parse(text('models.json'));
for (const key of ['onnx-community/mobilenet_v2_1.0_224-plant-disease-identification-ONNX','Identify disease with AI','MODEL_THRESHOLD','renderPredictions','top_k:0']) assert(text('intelligence.js').includes(key),`AI classifier missing: ${key}`);
assert.equal(JSON.parse(text('models.json')).status,'remote_onnx_browser_classifier_enabled');
assert(intelligence.includes('transformers@3.8.1/+esm'), 'ESM CDN endpoint is needed for browser import');
assert(intelligence.includes('Tomato with Early Blight') && intelligence.includes('Cedar Apple Rust'), 'Real model label parsing examples required');
assert(existsSync(join(root,'QA-RESULTS.md')), 'QA results must ship with release');
execFileSync('node',[join(root,'tests/crop-intelligence.test.mjs')],{stdio:'pipe'});
console.log('PASS: original 3D assets unchanged; 14 crops; scripts; free symptom triage, backup restore and honest net rankings');
