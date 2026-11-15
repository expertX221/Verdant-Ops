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
for(const name of ['app.js','farm-renderer.js','intelligence.js','sw.js','api/mandi.js','api/sync.js']){
 execFileSync('node',['--check',join(root,name)],{stdio:'pipe'});
}
for(let i=0;i<14;i++)assert(existsSync(join(root,`assets/crop-${i}.jpg`)));
for(const id of ['crop-dashboard','crop-image','crop-health-label','walk-controls','hub-panels','farmer-tools']){
 assert(text('index.html').includes(`id="${id}"`),`Missing ${id}`);
}
const intelligence=text('intelligence.js');
for(const key of ['chemicalReference','azoxystrobin','Potassium bicarbonate','near harvest','indexedDB','/api/mandi','api.open-meteo.com']){
 assert(intelligence.toLowerCase().includes(key.toLowerCase()),`Expected feature: ${key}`);
}
assert(!intelligence.includes('SMS alerts require'), 'SMS feature should be excluded');
assert(text('sw.js').includes('assets/geometry-parts/part-01.js'));
assert(text('index.html').includes('geometry-bootstrap.js'));
assert(text('index.html').includes('geometry-parts/part-09.js'));
JSON.parse(text('manifest.webmanifest'));JSON.parse(text('models.json'));
console.log('PASS: original 3D assets unchanged, 14 crop images, camera and dashboard, offline/chemical/weather/market features, valid scripts');
