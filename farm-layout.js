/* Verdant Ops scene layout adjustment, r11.
 * Repositions the non-interactive utility shed and separates the existing crops,
 * livestock and buildings at render time. The bundled original geometry is kept
 * lossless for restoration and the greenhouse crop zones (0-7) are unchanged.
 * This runs once AFTER geometry-bootstrap.js and BEFORE farm-renderer.js.
 */
(function applyFarmLayout(){
  'use strict';
  if (typeof geometry === 'undefined' || !Array.isArray(geometry.parts)) return;
  const parts=geometry.parts;
  const near=(a,b,tolerance=.025)=>Math.abs(a-b)<=tolerance;
  function bounds(part){
    const vertices=part[2],lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
    for(const v of vertices) for(let j=0;j<3;j++){
      if(v[j]<lo[j])lo[j]=v[j]; if(v[j]>hi[j])hi[j]=v[j];
    }
    return {center:lo.map((n,j)=>(n+hi[j])*.5),size:hi.map((n,j)=>n-lo[j])};
  }
  function translate(part,dx,dy){
    for(const v of part[2]){v[0]=Math.round((v[0]+dx)*1000)/1000;v[1]=Math.round((v[1]+dy)*1000)/1000;}
  }
  function moveExact(material,center,size,delta){
    const matches=parts.filter(p=>p[1]===null&&p[0]===material).filter(p=>{
      const bb=bounds(p);
      return center.every((v,j)=>near(bb.center[j],v))&&size.every((v,j)=>near(bb.size[j],v,.035));
    });
    if(matches.length!==1)throw new Error('Farm layout: expected one '+material+' mesh at '+center.join(','));
    translate(matches[0],...delta);
  }

  // Storage compound on the east side: no longer wedged between the red barn
  // and the cultivated field. Keep the complete existing shed mesh and crates.
  const storageOffset=[15,6];
  moveExact('wood',[8,17,1.2],[5,4,3],storageOffset);
  moveExact('steel',[8,17,2.79],[5.5,4.5,.25],storageOffset);
  moveExact('edge',[8,14.97,.94],[2.3,.13,2.3],storageOffset);
  for(const x of [5.8,10.2])moveExact('wood',[x,14.2,-.04],[.72,.65,.67],storageOffset);

  // Move three sheep from the crowded greenhouse entrance into separated spots
  // of the fenced western pasture. Each sheep has one fleece, head and 4 legs.
  const sheep=[
    {from:[-9,15],to:[-14.5,19.6]},
    {from:[-7.5,15.7],to:[-14.1,21.5]},
    {from:[-8,17],to:[-10.7,15.1]},
  ];
  for(const {from,to} of sheep){
    const ix=parts.findIndex(p=>{
      if(p[0]!=='stone'||p[1]!==null)return false;
      const bb=bounds(p);
      return near(bb.center[0],from[0])&&near(bb.center[1],from[1])&&near(bb.center[2],.31) && near(bb.size[0],.64,.035)&&near(bb.size[1],1.06,.035);
    });
    if(ix<0)throw new Error('Farm layout: missing original sheep at '+from.join(','));
    for(let j=0;j<6;j++)translate(parts[ix+j],to[0]-from[0],to[1]-from[1]);
  }

  // These areas are *working land*, not planting tiles. Reserve a buffer
  // around building foundations, feed stations, pens, and an access lane.
  const clearings=[
    [-13.0,-3.0,-29.4,-21.0], // farmhouse, porch and yard
    [-16.6,-3.8,13.2,24.0],  // livestock + chicken enclosure
    [3.0,17.0,18.8,28.0],    // barn, silo and delivery courtyard
    [19.5,27.0,18.4,27.0],  // relocated separate storage shed
    [22.0,29.0,8.5,15.0],    // combine and machinery turning pad
    [14.2,17.4,-20.8,-11.0], // tractor access strip
    [10.2,18.5,-20.2,-11.0], // tractor + trailer parking
    [16.0,30.0,-30.5,-23.5], // pigs, shelter and fence
    [-30.0,-17.0,24.0,30.5]  // existing orchard / duck pond
  ];
  const tile=c=>-28+3*Math.round((c+28)/3);
  let excluded=0,fieldsBefore=0;
  geometry.parts=parts.filter(part=>{
    if(part[1]===null||part[1]<8)return true;
    fieldsBefore++;
    const bb=bounds(part),x=tile(bb.center[0]),y=tile(bb.center[1]);
    const occupied=clearings.some(([x0,x1,y0,y1])=>x>=x0-1.35&&x<=x1+1.35&&y>=y0-1.4&&y<=y1+1.4);
    if(occupied)excluded++;
    return !occupied;
  });

  // Restore natural green grass wherever the imported scene used broad, pale
  // stone / mud ground slabs. This is intentionally restricted to low, flat,
  // ground-level meshes: NEVER recolor stone sheep, retaining walls, building
  // features or light-colored animal details.
  const restoredGround=[];
  for(const [i,part] of geometry.parts.entries()){
    if(part[1]!==null || !['stone','mud'].includes(part[0]))continue;
    const bb=bounds(part);
    const isFlat=bb.center[2]<-.14 && bb.size[2]<.32;
    const hasFloorFootprint=(bb.size[0]>1.25 && bb.size[1]>.9);
    if(isFlat && hasFloorFootprint){
      restoredGround.push([i,part[0],bb.center.slice(0,2)]);
      part[0]='grass2';
    }
  }

  // Thin grassy clearings rest slightly above the meadow, keeping green
  // land under every building / animal without adding white parking slabs.
  // The greenhouse floor and all crop geometry are left untouched.
  const cubeFaces=[[0,2,3,1],[4,5,7,6],[0,1,5,4],[2,6,7,3],[0,4,6,2],[1,3,7,5]];
  function ground(name,x,y,w,h,material,top=-.38){
    const base=-.425,height=top-base,vertices=[];
    for(const zz of [-1,1])for(const yy of [-1,1])for(const xx of [-1,1])
      vertices.push([x+xx*w/2,y+yy*h/2,(top+base)/2+zz*height/2]);
    geometry.parts.push([material,null,vertices,cubeFaces]);
    return name;
  }
  ground('Western livestock pasture',-10.2,19,12.4,10.4,'grass2',-.408);
  ground('Farmhouse lawn',-8.1,-24.9,9.7,8.5,'grass2',-.406);
  ground('Barn service lawn',10,23.1,13.5,8.5,'grass2',-.392);
  ground('East storage grass',23.25,23,7.6,8.5,'grass2',-.389);
  ground('Machinery lawn',25.2,12,7.6,7,'grass2',-.392);
  ground('Tractor grass',14.2,-16,8.6,9,'grass2',-.394);
  ground('Pig pasture',23.9,-27,13,6.5,'grass2',-.388);
  ground('Greenhouse-to-barn lawn',0,14.2,2.2,9,'grass2',-.39);
  ground('Barn-to-storage grass lane',17.5,22,7,2.2,'grass2',-.379);
  ground('Farmhouse grassy path',-8,-20,2.3,3.8,'grass2',-.385);
  // Report is also exercised by the no-network layout regression test.
  window.__verdantLayoutReport={version:'r11',restoredStoneGround:restoredGround.length,cropPartsBefore:fieldsBefore,cropPartsRemoved:excluded,
    cropPartsAfter:fieldsBefore-excluded,storageCenter:[23,23],livestockRepositioned:sheep.length};
})();
