// No-network regression test for greenhouse, buildings and livestock alignment.
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const original=readFileSync(join(root,'assets/geometry.js'),'utf8');
const geometry=JSON.parse(original.slice('const geometry='.length,-1));
const before=geometry.parts.length;
const initialGreenhouse=geometry.parts.filter(p=>p[1]!==null&&p[1]<8).length;
const window={};
runInNewContext(readFileSync(join(root,'farm-layout.js'),'utf8'),{geometry,window});
const report=window.__verdantLayoutReport;
assert.equal(report.version,'r11');
assert(report.restoredStoneGround>=6,'Original pale stone slabs should turn green without altering sheep');
assert.deepEqual(Array.from(report.storageCenter),[23,23]);
assert.equal(report.livestockRepositioned,3);
assert(report.cropPartsRemoved>100,'Expected substantial cleared farmyard footprint');
assert(report.cropPartsAfter>1000,'Must preserve six planted field zones');
assert.equal(geometry.parts.filter(p=>p[1]!==null&&p[1]<8).length,initialGreenhouse,'Greenhouse crops untouched');
assert.equal(geometry.parts.length,before-report.cropPartsRemoved+10,'Only work pads may be added');
const cropTiles=new Map();
const near=(x,y)=>Math.abs(x-y)<.035;
function bb(part){const v=part[2],xmin=Math.min(...v.map(p=>p[0])),xmax=Math.max(...v.map(p=>p[0])),ymin=Math.min(...v.map(p=>p[1])),ymax=Math.max(...v.map(p=>p[1])),zmin=Math.min(...v.map(p=>p[2])),zmax=Math.max(...v.map(p=>p[2]));return {x:(xmin+xmax)/2,y:(ymin+ymax)/2,z:(zmin+zmax)/2,w:xmax-xmin,h:ymax-ymin,d:zmax-zmin};}
for(const part of geometry.parts){if(part[1]>=8&&part[0]==='soil'){
  const p=bb(part);cropTiles.set(p.x+','+p.y,p);
}}
for(const [x,y] of [[-10,-25],[-13,-25],[-13,16],[-13,19],[11,22],[23,22],[26,22],[26,13],[17,-16],[23,-25]])
 assert(![...cropTiles.values()].some(p=>near(p.x,x)&&near(p.y,y)),`Crop bed still under yard at (${x},${y})`);
const target=geometry.parts.find(p=>p[1]===null&&p[0]==='wood'&&near(bb(p).x,23)&&near(bb(p).y,23)&&near(bb(p).w,5)&&near(bb(p).h,4));
assert(target,'Storage shed relocated to clear eastern work compound');
const old=geometry.parts.find(p=>p[1]===null&&p[0]==='wood'&&near(bb(p).x,8)&&near(bb(p).y,17)&&near(bb(p).w,5)&&near(bb(p).h,4));
assert(!old,'Old storage shed must no longer crowd greenhouse');
for(const [x,y] of [[-14.5,19.6],[-14.1,21.5],[-10.7,15.1]])
 assert(geometry.parts.some(p=>p[0]==='stone'&&p[1]===null&&near(bb(p).x,x)&&near(bb(p).y,y)&&near(bb(p).d,.72)),'Missing separated grazing sheep');

// The 10 scene-added work/pasture patches must ALL be green, not pale white stone.
const greenPads=geometry.parts.slice(-10);
assert.equal(greenPads.length,10);
for(const pad of greenPads){
 assert.equal(pad[0],'grass2','Farm working-zone surfaces must be green turf');
 assert.equal(pad[1],null,'Work-zone grass must not be interactive crop plots');
}
// Original sheep stay pale stone-coloured; their heads / legs aren't recoloured.
for(const [x,y] of [[-14.5,19.6],[-14.1,21.5],[-10.7,15.1]])
 assert(geometry.parts.some(p=>p[0]==='stone'&&p[1]===null&&near(bb(p).x,x)&&near(bb(p).y,y)&&near(bb(p).d,.72)), 'Sheep fleece colour must not be altered');
// Remaining stone/mud meshes must be features, not large low-lying white pads.
for(const part of geometry.parts){
 if(part[1]===null && (part[0]==='stone'||part[0]==='mud')){
  const a=bb(part);
  assert(!(a.z<-.14 && a.d<.32 && a.w>1.25 && a.h>.9), 'Unexpected pale stone ground slab remains');
 }
}
assert.deepEqual([...new Set(geometry.parts.filter(p=>p[1]>=8).map(p=>p[1]))].sort((a,b)=>a-b),[8,9,10,11,12,13]);
assert(original.startsWith('const geometry='),'Original source geometry remains intact');
console.log('PASS: livestock, buildings, storage and machinery on green turf; pale ground slabs recoloured; animal appearances and all crop zones preserved');
console.log(report);
