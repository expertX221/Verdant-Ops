const $ = id => document.getElementById(id);
const mouldDemo = new Map([[3, 'MOULD SUSPECTED · demo inspection'], [7, 'MOULD SUSPECTED · demo inspection']]);
const zones = [
  {name:'Butterhead', id:'DWC-01', x:-4.28},
  {name:'Mixed lettuce', id:'DWC-02', x:-1.99},
  {name:'Green romaine', id:'DWC-03', x:1.99},
  {name:'Red oakleaf', id:'DWC-04', x:4.28},
  {name:'Basil', id:'DWC-05', x:-4.28},
  {name:'Pak choi', id:'DWC-06', x:-1.99},
  {name:'Cherry tomato', id:'DWC-07', x:1.99},
  {name:'Mini cucumber', id:'DWC-08', x:4.28},
  {name:'Onions',id:'FIELD-01',x:-21,y:-18},
  {name:'Potatoes',id:'FIELD-02',x:-21,y:0},
  {name:'Cabbage',id:'FIELD-03',x:-21,y:21},
  {name:'Wheat',id:'FIELD-04',x:21,y:21},
  {name:'Corn',id:'FIELD-05',x:23,y:0},
  {name:'Field tomatoes',id:'FIELD-06',x:25,y:-21}
];
const metrics = [
  ['ph','Water pH','pH','#ff91de',2,5.8],
  ['temp','Air temperature','°C','#ffbf78',1,22.2],
  ['humidity','Humidity','%','#74e6fc',0,70],
  ['ec','Conductivity','mS/cm','#c0aaff',2,1.58],
  ['oxygen','Dissolved oxygen','mg/L','#67ffc1',1,8.5],
  ['light','Light (PPFD)','µmol/m²/s','#ebf28a',0,396],
  ['co2','Air CO₂','ppm','#a4afff',0,910],
  ['water','Water temperature','°C','#87d8ff',1,20.4],
  ['level','Reservoir level','%','#67ffc1',0,84],
  ['vpd','Vapor pressure deficit','kPa','#f3aee3',2,.80]
];
const scenarios = {
  drift:{zone:1,key:'ph',baseline:6.34,target:5.82,title:'pH above target', action:'Simulate pH correction', detail:'Water pH has risen above the demo threshold in Mixed lettuce. Run a simulated correction to see the reading recover.'},
  heat:{zone:3,key:'temp',baseline:31.4,target:24.5,title:'Heat spike detected',action:'Simulate ventilation',detail:'Air temperature is above the demo threshold in Red oakleaf. Run simulated ventilation to see the temperature fall.'},
  normal:null
};
let leafPhotoUrl=null;
const offers=new Map();
let selected=1, scenario='drift', metric='ph', corrected=false, range=24, result='', events=[];
try { events=JSON.parse(localStorage.getItem('verdant-ops-events') || '[]'); if(!Array.isArray(events)) events=[]; } catch {}
function append(message){
  events.unshift({message,at:new Date().toISOString()});
  events=events.slice(0,100);
  try { localStorage.setItem('verdant-ops-events',JSON.stringify(events)); } catch {}
}
const issue = () => scenarios[scenario];
const hasIssue = index => !corrected && issue()?.zone===index;
const spec = key => metrics.find(item=>item[0]===key);
function current(key,index){
  if(issue()?.zone===index && issue().key===key) return corrected?issue().target:issue().baseline;
  const item=spec(key);
  const variation=[.018,.24,.8,.03,.12,6,10,.12,1.2,.026][metrics.indexOf(item)];
  return item[5]+((index%4)-1)*variation+(index>=4?variation*.45:0);
}
function samples(key,index,hours){
  const v=current(key,index);
  const swing={ph:.09,temp:.9,humidity:3,ec:.09,oxygen:.24,light:23,co2:42,water:.48,level:4,vpd:.06}[key];
  return Array.from({length:64},(_,i)=>{
    const t=i/63;
    const prior=corrected && issue()?.zone===index && issue().key===key ? (issue().baseline-issue().target)*Math.min(1,(1-t)*7) : 0;
    const ramp=hasIssue(index) && issue().key===key ? (issue().baseline-spec(key)[5])*(t-1)*.86 : 0;
    return v+prior+ramp+(1-t)*swing*(Math.sin(i*.34*(hours===1?.65:hours===24?1.35:2.65))+Math.cos(i*.85)*.42);
  });
}
function selectBed(index){
  selected=index;
  $('feature-panel').hidden=true;
  $('health-title').textContent=zones[index].name+' health';
  $('health-advice').textContent='';
  $('leaf-photo').value='';
  $('camera-photo').value='';
  $('leaf-preview').hidden=true;
  if(leafPhotoUrl){URL.revokeObjectURL(leafPhotoUrl);leafPhotoUrl=null;}
  $('crop-dashboard').hidden=false;
  $('crop-trends').hidden=false;
  $('crop-health-label').textContent=mouldDemo.get(index)||'NO MOULD FLAG · demo inspection';
  $('crop-health-label').classList.toggle('mould-flag',mouldDemo.has(index));
  $('crop-health-note').textContent=mouldDemo.has(index)?'Demo-only suspect label; not a model diagnosis. Verify with a real leaf scan.':'Simulated plant status; not confirmed from the 3D model.';
  $('walk-to-crop').hidden=index>=8;
  window.dispatchEvent(new CustomEvent('verdant:crop',{detail:{index,zone:zones[index]}}));
  document.querySelector('.workspace').classList.add('inspecting');
  if(index>=8) resetCamera('plot');
  else if(view==='plot') resetCamera('aisle');
  if(hasIssue(index)) metric=issue().key;
  result='';
  refresh();
}
const bedButtons=zones.map((zone,index)=>{
  const b=document.createElement('button');
  b.className='bed-button';
  b.innerHTML='<strong>'+zone.id+'</strong><small>'+zone.name+'</small><span aria-hidden="true" class="dots">'+'<i></i>'.repeat(24)+'</span>';
  b.onclick=()=>selectBed(index);
  $('bed-list').append(b);
  return b;
});
const pins=zones.map((zone,index)=>{
  const b=document.createElement('button');
  b.className='pin';
  b.textContent=zone.name;
  b.setAttribute('aria-label','Select '+zone.name);
  b.onclick=()=>selectBed(index);
  $('pins').append(b);
  return b;
});
const readingButtons=metrics.map(([key,label,unit,color])=>{
  const b=document.createElement('button');
  b.className='reading';
  b.style.setProperty('--reading',color);
  b.innerHTML='<span class="orb"></span><span>'+label+'</span><span class="value"></span><small>'+unit+'</small>';
  b.onclick=()=>{metric=key;refresh();};
  $('readings').append(b);
  return b;
});
function refresh(){
  const zone=zones[selected];
  const alert=hasIssue(selected);
  const activeIssue=issue();
  $('summary').textContent=activeIssue&&!corrected?'8 greenhouse beds · 6 field crops · 1 demo alert':'8 greenhouse beds · 6 field crops';
  $('needs-attention').textContent=activeIssue&&!corrected?'1':'0';
  $('bay-temp').textContent=(zones.reduce((sum,_,i)=>sum+current('temp',i),0)/zones.length).toFixed(1)+' °C';
  $('bay-water').textContent=Math.round(zones.reduce((sum,_,i)=>sum+current('level',i),0)/zones.length)+'%';
  $('zone-id').textContent=zone.id+' / BAY 07';
  $('zone-name').textContent=zone.name;
  $('crop-image').src='assets/crop-'+selected+'.jpg';
  $('crop-image').alt=zone.name+' growing in the Blender farm';
  $('offer-crop').textContent='Offers for '+zone.name;
  renderOffers();
  const profiles=[
    'Butterhead · soft green rosettes · 33 planting sites',
    'Mixed lettuce · green and red leaves · 33 planting sites',
    'Romaine · upright leaves · 33 planting sites',
    'Red oakleaf · burgundy foliage · 33 planting sites',
    'Basil · compact herb canopy · 33 planting sites',
    'Pak choi · broad green leaves · 33 planting sites',
    'Cherry tomato · fruiting vines on trellises · 16 planting sites',
    'Mini cucumber · climbing vines on trellises · 16 planting sites',
    'Onions · upright green tops and bulbs · outdoor field plot',
    'Potatoes · leafy canopy with underground tubers · outdoor field plot',
    'Cabbage · dense leafy heads · outdoor field plot',
    'Wheat · mature grain heads · outdoor field plot',
    'Corn · tall stalks and broad leaves · outdoor field plot',
    'Tomatoes · fruiting vines · outdoor field plot'
  ];
  $('crop-description').textContent=profiles[selected];

  $('zone-state').textContent=alert?'Needs attention':'In range';
  $('zone-state').classList.toggle('warn',alert);
  $('count').textContent=events.length;
  readingButtons.forEach((button,i)=>{
    const [key,,,,digits]=metrics[i];
    button.querySelector('.value').textContent=current(key,selected).toFixed(digits);
    button.classList.toggle('warn',alert&&activeIssue.key===key);
    button.setAttribute('aria-pressed',metric===key);
  });
  zones.forEach((_,i)=>{
    for(const button of [pins[i],bedButtons[i]]){
      button.setAttribute('aria-pressed',selected===i);
      button.classList.toggle('warn',hasIssue(i) || mouldDemo.has(i));
      if(button===pins[i])button.title=mouldDemo.get(i)||('Inspect '+zones[i].name);
    }
  });
  $('action-title').textContent=alert?activeIssue.title:corrected&&activeIssue?.zone===selected?'Response complete':'No action needed';
  $('action-copy').textContent=alert?activeIssue.detail:corrected&&activeIssue?.zone===selected?'The simulated reading returned to range. Open Activity to review the event.':'Readings for this bed are within the simulation thresholds.';
  $('respond').hidden=!alert;
  $('respond').textContent=alert?activeIssue.action:'';
  $('result').textContent=result;
  $('trend-title').textContent=(metric==='ph'?'pH':spec(metric)[1])+' trend';
  $('trend-legend').textContent=zone.id+' / SENSOR HISTORY';
  $('range-label').textContent=range===1?'1 HOUR AGO':range===24?'24 HOURS AGO':'7 DAYS AGO';
  drawChart();
  requestScene();
}
$('scenario').onchange=event=>{
  scenario=event.target.value; corrected=false;
  const next=issue();
  if(next) metric=next.key;
  append('Scenario loaded · '+event.target.selectedOptions[0].textContent);
  selectBed(next?.zone??0);
};
$('ranges').onclick=event=>{
  if(!event.target.dataset.range) return;
  range=Number(event.target.dataset.range);
  for(const b of $('ranges').children) b.setAttribute('aria-pressed',Number(b.dataset.range)===range);
  refresh();
};
$('respond').onclick=()=>{
  if(!hasIssue(selected)) return;
  $('confirm-title').textContent=issue().action;
  $('confirm-copy').textContent='Run the response for '+zones[selected].id+' in the simulator. This changes the demo telemetry and records the action in Activity.';
  $('confirm').showModal();
};
$('cancel').onclick=()=>$('confirm').close();
$('apply').onclick=()=>{
  if(!hasIssue(selected)) return $('confirm').close();
  const item=issue(), definition=spec(item.key), digits=definition[4];
  corrected=true;
  result=definition[1]+' · '+item.baseline.toFixed(digits)+' → '+item.target.toFixed(digits);
  append(zones[selected].id+' · '+result);
  $('confirm').close();
  refresh();
  $('result').setAttribute('tabindex','-1');
  $('result').focus();
};
$('activity').onclick=()=>{
  $('entries').replaceChildren();
  for(const event of events){
    const li=document.createElement('li'), time=document.createElement('time');
    time.dateTime=event.at;
    time.textContent=new Date(event.at).toLocaleString();
    li.append(time,document.createTextNode(event.message));
    $('entries').append(li);
  }
  if(!events.length) $('entries').append(Object.assign(document.createElement('li'),{textContent:'No operator events yet.'}));
  $('log').showModal();
};
$('close-log').onclick=()=>$('log').close();
$('download').onclick=()=>{
  const rows=['sample_time_utc,bed,metric,value,unit'];
  const now=Date.now();
  for(const index of zones.keys()) for(const [key,,unit,,digits] of metrics){
    for(const [i,v] of samples(key,index,range).entries()){
      const date=new Date(now-(63-i)/63*range*3600000).toISOString();
      rows.push([date,zones[index].id,key,v.toFixed(digits),unit].join(','));
    }
  }
  const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='verdant-ops-'+range+'h.csv';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};

function surface(canvas){
  const w=canvas.clientWidth,h=canvas.clientHeight,d=Math.min(window.devicePixelRatio||1,2);
  const ctx=canvas.getContext('2d');
  if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){
    canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);
  }
  ctx.setTransform(d,0,0,d,0,0);
  ctx.clearRect(0,0,w,h);
  return {ctx,w,h};
}
function drawChart(){
  const {ctx,w,h}=surface($('chart'));
  if(w<45||h<25) return;
  const values=samples(metric,selected,range), definition=spec(metric), color=definition[3], digits=definition[4];
  const min=Math.min(...values), max=Math.max(...values), span=Math.max(10**(-digits),max-min);
  const x=i=>39+i*(w-48)/63, y=v=>h-14-(v-min)*(h-29)/span;
  const points=values.map((v,i)=>[x(i),y(v)]);
  ctx.font='9px monospace';ctx.fillStyle='#9db6c3';ctx.strokeStyle='#273844';ctx.lineWidth=1;
  for(const f of [0,.5,1]){
    const v=min+span*f, py=y(v);
    ctx.fillText(v.toFixed(digits),0,py+3);ctx.beginPath();ctx.moveTo(38,py);ctx.lineTo(w,py);ctx.stroke();
  }
  const fill=ctx.createLinearGradient(0,0,0,h);
  fill.addColorStop(0,color+'50');fill.addColorStop(1,color+'00');
  ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));
  ctx.lineTo(x(63),h);ctx.lineTo(x(0),h);ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));
  ctx.lineWidth=2;ctx.strokeStyle=color;ctx.stroke();
  ctx.beginPath();ctx.arc(...points.at(-1),3.2,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
  $('chart').setAttribute('aria-label',definition[1]+', '+range+' hour history. Current '+values.at(-1).toFixed(digits)+' '+definition[2]+'.');
}

$('close-crop').onclick=()=>{
  $('crop-dashboard').hidden=true;
  $('crop-trends').hidden=true;
  document.querySelector('.workspace').classList.remove('inspecting');
  requestScene();
};
function previewLeaf(event){
  const file=event.target.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){ $('health-advice').textContent='Choose an image file.';return; }
  if(leafPhotoUrl) URL.revokeObjectURL(leafPhotoUrl);
  leafPhotoUrl=URL.createObjectURL(file);
  $('leaf-preview').src=leafPhotoUrl;
  $('leaf-preview').hidden=false;
};
$('leaf-photo').onchange=previewLeaf;
$('camera-photo').onchange=previewLeaf;
$('inspect-plant').onclick=()=>{
  const messages={
    spots:'Check both leaf surfaces and compare affected and unaffected plants. Record whether spots are spreading and request an agronomist review before choosing a treatment.',
    yellow:'Record which leaves are yellowing, then check the root zone, water level, and pH/EC trend. Several causes can look similar.',
    wilt:'Check water delivery and root condition, and compare air temperature with the recent trend. Record whether the whole bed or individual plants are affected.',
    pests:'Inspect leaf undersides and stems. Photograph the organism clearly and obtain identification before selecting a pest treatment.'
  };
  $('health-advice').textContent=zones[selected].name+' · '+messages[$('symptom').value]+' Sensor values shown here are simulated.';
  append(zones[selected].id+' · Plant-health inspection · '+$('symptom').selectedOptions[0].textContent);
  $('count').textContent=events.length;
};
$('crop-image').onerror=()=>{
  $('crop-image').onerror=null;
  $('crop-image').src='assets/greenhouse.jpg';
  $('crop-image').alt='Verdant Ops farm overview';
};
function renderOffers(){
  const rows=[...(offers.get(selected)?.values()??[])].sort((a,b)=>b.net-a.net);
  $('offer-list').replaceChildren(...rows.map((offer,index)=>{
    const row=document.createElement('li');
    row.textContent=(index===0?'Best net offer · ':'')+offer.name+' · ₹'+offer.net.toFixed(2)+'/kg';
    return row;
  }));
}
$('offer-form').onsubmit=event=>{
  event.preventDefault();
  const name=$('market').value.trim();
  if(!name) return;
  const net=Number($('price').value)-Number($('transport').value);
  if(!offers.has(selected)) offers.set(selected,new Map());
  offers.get(selected).set(name.toLowerCase(),{name,net});
  event.target.reset();
  renderOffers();
};
const canvas=$('scene');
let hitFaces=[];
let gpu=null;
let mesh, view='orbit', yaw=.67, pitch=.54, zoom=1, drag, frame=0;
let walkY=-8.65, walkX=0, walkAnimation=0;
const AISLE_MIN=-8.65, AISLE_MAX=8.35;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const minus=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const visitNames = {farm:'One-acre farm',orbit:'Greenhouse exterior',aisle:'Inside greenhouse',yard:'Barnyard',pasture:'Animal pasture',plan:'Greenhouse floor plan'};
zones.forEach((zone,index)=>{
  if(zone.y === undefined) return;
  const option = new Option(zone.name,'plot-'+index);
  $('visit-plots').append(option);
});
$('visit-go').onclick=()=>{
  const stop=$('visit-stop').value;
  if(stop.startsWith('plot-')) selectBed(Number(stop.slice(5)));
  else resetCamera(stop);
};
$('visit-stop').onchange=$('visit-go').onclick;

function resetCamera(next=view){
  $('scene-title').textContent=next==='plot'?zones[selected].name+' plot':visitNames[next];
  $('visit-stop').value=next==='plot'?'plot-'+selected:next;
  view=next; yaw=next==='plan'?0:next==='plot'?-.72:.67; pitch=next==='plan'?1.55:next==='plot'?.78:.54;zoom=1;
  if(next==='aisle'){walkY=AISLE_MIN;walkX=0;}
  if(walkAnimation){cancelAnimationFrame(walkAnimation);walkAnimation=0;}
  $('walk-controls').hidden=next!=='aisle';
  $('walk-to-crop').hidden=next!=='aisle'||selected>=8;
  updateWalkDistance();
  for(const button of $('views').children) button.setAttribute('aria-pressed',button.dataset.view===view);
  $('scene-help').textContent=view==='aisle'?'W / ↑ walk · S / ↓ back · drag to look · scroll to walk':'Drag to orbit · Scroll to zoom';
  requestScene();
}
function requestScene(){
  if(!frame) frame=requestAnimationFrame(()=>{frame=0;drawScene();});
}
function renderCamera(w,h){
  const focus = {yard:[8,21,2],pasture:[-10,18,1.1]};
  const target = view==='plot'?[zones[selected].x,zones[selected].y,.6]:(focus[view] ?? [0,0,1.8]);
  const distance = (view === 'farm' ? 95 : view==='plot' ? 15 : focus[view] ? 25 : 35) / zoom;
  const eye=view==='aisle'?[walkX,walkY,1.72]:[target[0]+distance*Math.cos(pitch)*Math.sin(yaw),target[1]-distance*Math.cos(pitch)*Math.cos(yaw),target[2]+distance*Math.sin(pitch)];
  const aim=view==='aisle'?[walkX+Math.sin(yaw-.67)*8,walkY+Math.cos(yaw-.67)*8,1.72+(pitch-.54)*5]:target;
  const forward=norm(minus(aim,eye)),right=norm(cross(forward,[0,0,1])),up=cross(right,forward);
  const focal=view==='aisle'?Math.max(w*.65,h*.85)*zoom:Math.min(w*.9,h*1.30);
  const convert=p=>{const d=minus(p,eye);return [dot(d,right),dot(d,up),dot(d,forward)];};
  const project=([x,y,z])=>[w/2+x*focal/z,h*.53-y*focal/z];
  return {convert,project,eye,right,up,forward,focal};
}
const near=.18;
function clip(points){
  const next=[];
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];
    if(a[2]>=near) next.push(a);
    if((a[2]<near)!==(b[2]<near)){
      const t=(near-a[2])/(b[2]-a[2]);
      next.push(a.map((v,j)=>v+(b[j]-v)*t));
    }
  }
  return next;
}
const features = [
  {name:'Greenhouse', image:'greenhouse.jpg', location:[0,0,6.8], views:['farm','orbit'], detail:'Glasshouse with eight hydroponic beds, roof vents, drainage and ten simulated sensor readings per bed.'},
  {name:'Red barn', image:'barn.jpg', location:[8,23,6.7], views:['farm','yard'], detail:'Farm storage with a hayloft, sliding doors and a work area for tools and produce.'},
  {name:'Grain silo', image:'silo.jpg', location:[14,23,6.3], views:['farm','yard'], detail:'Corrugated grain storage with a domed roof and an exterior access ladder.'},
  {name:'Tractor', image:'tractor.jpg', location:[14,-15,2.9], views:['farm','orbit'], detail:'Utility tractor with treaded wheels, an operator canopy, exhaust and a produce trailer.'}
];
const featurePins=features.map(feature=>{
  const button=document.createElement('button');
  button.className='pin feature-pin';
  button.textContent=feature.name;
  button.hidden=true;
  button.onclick=()=>{
    $('crop-dashboard').hidden=true;
    $('crop-trends').hidden=true;
    $('feature-panel').hidden=false;
    $('feature-name').textContent=feature.name;
    $('feature-description').textContent=feature.detail;
    $('feature-image').src='assets/'+feature.image;
    $('feature-image').alt=feature.name+' in the Verdant Ops farm';
    document.querySelector('.workspace').classList.add('inspecting');
    requestScene();
  };
  $('pins').append(button);
  return button;
});
$('close-feature').onclick=()=>{
  $('feature-panel').hidden=true;
  document.querySelector('.workspace').classList.remove('inspecting');
  requestScene();
};
function drawScene(){
  const w=canvas.clientWidth,h=canvas.clientHeight;
  if((!gpu&&!mesh)||!w||!h){pins.forEach(b=>b.hidden=true);return;}
  const camera=renderCamera(w,h);
  const {convert,project}=camera;
  if(gpu) gpu(camera,w,h,view,corrected?0:(issue()?.zone??-1)+1,wetness);
  else drawSoftwareScene(camera);
  positionMarkers(convert,project,w,h);
}
function drawSoftwareScene({convert,project}){
  const {ctx,w,h}=surface(canvas);
  const polygons=[];
  const moving = drag?.moved || performance.now() < wheelUntil;
  ctx.lineWidth=1;
  for(const {type,zone,verts,faces,center,radius,detail,sample} of (moving ? motionMesh : mesh)){
    if(detail){
      const position=convert(center);
      const depth=position[2];
      if(depth<near-radius) continue;
      if(depth>radius){
        const [x,y]=project(position);
        const margin=radius*(project([1,0,depth-radius])[0]-w/2)*1.4;
        if(x < -margin || x > w+margin || y < -margin || y > h+margin) continue;
      }
      if(!moving && depth>36 && sample%3!==0) continue;
    }
    if(type==='glass'&&view!=='orbit') continue;
    if(view==='plan'&&verts.some(v=>v[2]>2.15)) continue;
    const space=verts.map(convert);
    for(const {indices,tone} of faces){
      const points=clip(indices.map(i=>space[i]));
      if(points.length<3) continue;
      const visible=points.map(project);
      if(visible.every(p=>p[0]<0)||visible.every(p=>p[0]>w)||visible.every(p=>p[1]<0)||visible.every(p=>p[1]>h)) continue;
      const depth=points.reduce((sum,p)=>sum+p[2],0)/points.length;
      let color=tone;
      if(type==='amber'&&zone!==null&&!hasIssue(zone)) color='#67ffc1';
      if(type==='mint'&&zone!==null&&hasIssue(zone)) color='#ffbb70';
      polygons.push({depth,visible,color,type,zone});
    }
  }
  const ground = type => type === 'grass' || type === 'grass2';
  hitFaces=[];
  polygons.sort((a,b)=>Number(ground(b.type))-Number(ground(a.type)) || b.depth-a.depth);
  for(const {visible,color,type,zone} of polygons){
    ctx.beginPath();ctx.moveTo(...visible[0]);visible.slice(1).forEach(p=>ctx.lineTo(...p));ctx.closePath();
    ctx.fillStyle=color;
    if(type==='glass'){
      const [top,bottom]=visible.reduce(([a,b],point)=>[Math.min(a,point[1]),Math.max(b,point[1])],[h,0]);
      const reflection=ctx.createLinearGradient(0,top,0,Math.max(top+1,bottom));
      reflection.addColorStop(0,'#e5f6ff36');
      reflection.addColorStop(.55,'#bde9ff0a');
      reflection.addColorStop(1,'#a7def224');
      ctx.fillStyle=reflection;
      ctx.strokeStyle='#d9f0ff47';
      ctx.lineWidth=.7;
      ctx.stroke();
    }
    if(!moving && zone===selected && ['mint','pink','cyan','amber'].includes(type)){
      ctx.shadowColor=color;ctx.shadowBlur=zone===selected?10:4;
    }
    ctx.fill();ctx.shadowBlur=0;
    if(!moving && zone!==null && zone!==undefined) hitFaces.push({points:visible,zone});
  }
}
function positionMarkers(convert,project,w,h){
  const markers=zones.map((zone,i)=>{
    const p=convert([zone.x,(zone.y??(i<4?-4:4))+(view==='aisle'?1.25:0),view==='plan'?1.2:(i>=6?2.76:1.65)+(i%2)*.3]);
    return p[2]>near?project(p):null;
  });
  markers.forEach((p,i)=>{
    const button=pins[i];
    const show=p&&p[0]>22&&p[0]<w-22&&p[1]>65&&p[1]<h-47;
    button.hidden=!show;
    if(show){button.style.left=p[0]+'px';button.style.top=p[1]+'px';}
  });
  features.forEach((feature,i)=>{
    const button=featurePins[i];
    const position=convert(feature.location);
    const [x,y]=position[2]>near?project(position):[-1,-1];
    const show=feature.views.includes(view) && x>35 && x<w-35 && y>75 && y<h-48;
    button.hidden=!show;
    if(show){button.style.left=x+'px';button.style.top=y+'px';}
  });

}
$('views').onclick=event=>{if(event.target.dataset.view)resetCamera(event.target.dataset.view);};
$('home').onclick=()=>resetCamera();
function turn(dx,dy=0){yaw+=dx;pitch=clamp(pitch+dy,view==='aisle'?.15:.12,view==='aisle'?.95:1.55);requestScene();}
function magnify(factor){zoom=clamp(zoom*factor,.65,1.9);requestScene();}
function updateWalkDistance(){
  const el=$('walk-distance');
  if(el) el.textContent=(walkY-AISLE_MIN).toFixed(1)+' m inside';
}
function moveAisle(direction){
  if(view!=='aisle')resetCamera('aisle');
  if(walkAnimation){cancelAnimationFrame(walkAnimation);walkAnimation=0;}
  walkY=clamp(walkY+direction,AISLE_MIN,AISLE_MAX);
  updateWalkDistance();requestScene();
}
function walkToSelectedCrop(){
  if(selected>=8) return;
  if(view!=='aisle')resetCamera('aisle');
  if(walkAnimation){cancelAnimationFrame(walkAnimation);walkAnimation=0;}
  const start=walkY, dest=clamp((selected<4?-4:4)-1.1,AISLE_MIN,AISLE_MAX);
  const startAt=performance.now(), ms=Math.min(1800,Math.max(450,Math.abs(dest-start)*175));
  function step(now){
    const t=clamp((now-startAt)/ms,0,1);const smooth=t*t*(3-2*t);
    walkY=start+(dest-start)*smooth;
    updateWalkDistance();requestScene();
    walkAnimation=t<1?requestAnimationFrame(step):0;
  }
  walkAnimation=requestAnimationFrame(step);
}
$('walk-forward').onclick=()=>moveAisle(.82);
$('walk-back').onclick=()=>moveAisle(-.82);
$('walk-near').onclick=walkToSelectedCrop;
$('walk-to-crop').onclick=walkToSelectedCrop;
// Holding a touch button keeps walking, but every step remains inside the central aisle.
for(const [id,sign] of [['walk-forward',1],['walk-back',-1]]){
  const el=$(id);let timer=0;
  el.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse')return;
    timer=setInterval(()=>moveAisle(sign*.20),95);
  });
  const stop=()=>{clearInterval(timer);timer=0;};
  el.addEventListener('pointerup',stop);el.addEventListener('pointercancel',stop);el.addEventListener('pointerleave',stop);
}
window.addEventListener('keydown',event=>{
  if(view!=='aisle'||event.altKey||event.ctrlKey||event.metaKey) return;
  const tag=event.target?.tagName;
  if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(tag)||event.target?.isContentEditable)return;
  const key=event.key.toLowerCase();
  if(['w','arrowup','s','arrowdown','a','d','q','e'].includes(key)){event.preventDefault();}
  if(key==='w'||key==='arrowup') moveAisle(.60);
  if(key==='s'||key==='arrowdown')moveAisle(-.60);
  if(key==='a') {walkX=clamp(walkX-.17,-.65,.65);requestScene();}
  if(key==='d') {walkX=clamp(walkX+.17,-.65,.65);requestScene();}
  if(key==='q')turn(-.09);
  if(key==='e')turn(.09);
});
$('left').onclick=()=>turn(-.22);
$('right').onclick=()=>turn(.22);
$('zoomout').onclick=()=>magnify(.85);
$('zoomin').onclick=()=>magnify(1.18);
canvas.onpointerdown=event=>{if(event.button!==0)return;drag={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY};canvas.setPointerCapture(event.pointerId);};
canvas.onpointermove=event=>{
  if(!drag) return;
  const moved=drag.moved || Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>5;
  if(!moved) return;
  turn((drag.x-event.clientX)*.008,(event.clientY-drag.y)*.007);
  drag={...drag,moved,x:event.clientX,y:event.clientY};
};
canvas.onpointerup=event=>{
  if(!drag || drag.moved || Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>5) return;
  const bounds=canvas.getBoundingClientRect(), x=event.clientX-bounds.left, y=event.clientY-bounds.top;
  if(gpu){
    const w=canvas.clientWidth,h=canvas.clientHeight;
    const index=gpu(renderCamera(w,h),w,h,view,0,wetness,[x,y]);
    if(index>=0&&index<zones.length) selectBed(index);
    requestScene();
    return;
  }
  for(let f=hitFaces.length-1;f>=0;f--){
    const {points,zone}=hitFaces[f];
    let inside=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const [xi,yi]=points[i], [xj,yj]=points[j];
      if((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
    }
    if(inside){selectBed(zone);break;}
  }
};
canvas.onlostpointercapture=()=>{drag=null;requestScene();};
let wheelUntil=0, wheelTimer;
canvas.onwheel=event=>{
  if(!mesh&&!gpu)return;
  event.preventDefault();
  wheelUntil=performance.now()+130;
  clearTimeout(wheelTimer);
  wheelTimer=setTimeout(requestScene,150);
  if(view==='aisle')moveAisle(-event.deltaY*.007);
  else magnify(Math.exp(-event.deltaY*.001));
};
new ResizeObserver(()=>{drawChart();requestScene();}).observe(document.querySelector('.workspace'));
refresh();
let motionMesh=[];
function initSoftware(){
try {
  const glow=new Set(['mint','amber','pink','cyan','glass']);
  mesh=geometry.parts.map(([type,zone,verts,polys], sample)=>{
    const rgb=geometry.palette[type].match(/[a-f\d]{2}/gi).map(h=>parseInt(h,16));
    const faces=polys.map(indices=>{
      const [a,b,c]=indices.map(i=>verts[i]);
      const normal=norm(cross(minus(b,a),minus(c,a)));
      const light=glow.has(type)?1:.56+.44*Math.abs(dot(normal,[.45,-.48,.75]));
      return {indices,tone:'rgb('+rgb.map(v=>Math.round(v*light)).join(',')+')'};
    });
    const foliage=/^leaf[1-4]$/.test(type);
    const detail=zone!==null && (foliage || (zone>=8 && type!=='soil'));
    const center=verts[0];
    const radius=detail?Math.max(...verts.map(v=>Math.hypot(v[0]-center[0],v[1]-center[1],v[2]-center[2]))):0;
    return {type,zone,verts,faces,center,radius,detail,sample};
  });
  motionMesh=mesh.filter(part=>!part.detail || part.sample%16===0);
  document.querySelector('.viewport').classList.add('interactive');
  requestScene();
} catch {
  $('scene-help').textContent='Static Blender preview · Select beds below';
  document.querySelector('.viewport').classList.add('fallback');
  for(const button of document.querySelectorAll('#views button,.camera-buttons button')) button.disabled=true;
}




}

function initRenderer(){
  const layer=$('farm-gl');
  try {
    gpu=createFarmRenderer(layer,geometry);
  } catch(error){
    console.warn('WebGL unavailable, using Canvas',error);
  }
  if(!gpu){initSoftware();return;}
  layer.hidden=false;
  document.querySelector('.viewport').classList.add('interactive');
  layer.addEventListener('webglcontextlost',event=>{
    event.preventDefault();
    gpu=null;
    layer.hidden=true;
    if(!mesh) initSoftware();
    requestScene();
  });
  layer.addEventListener('webglcontextrestored',()=>{
    try {gpu=createFarmRenderer(layer,geometry);}
    catch(error){console.warn('Unable to restore WebGL',error);}
    layer.hidden=!gpu;
    requestScene();
  });
  requestScene();
}

const weatherViewport = document.querySelector('.viewport');
$('scene-weather').onchange = event => weatherViewport.dataset.weather = event.target.value;
const birdCanvas = $('bird-flight');
const birdMotion = matchMedia('(prefers-reduced-motion: reduce)');
let nextBirdFrame = 0;
let wetness = 0;
let lastWeatherFrame = 0;
const puddles = [[-.8,-25,1.45,.27],[.9,-23,1.15,.28],[.82,-28,1.05,.24],[-11,14,.78,.58],[6,20,1.04,.52],[10,20,.81,.48]];
function drawWeather(ctx,w,h,now,convert,project){
  const raining = weatherViewport.dataset.weather === 'rain';
  const elapsed = Math.min(200,now-(lastWeatherFrame||now));
  lastWeatherFrame = now;
  wetness = clamp(wetness + elapsed * (raining ? .00025 : -.00010),0,1);
  if (wetness > 0 && view !== 'aisle') {
    for (const [index,[x,y,rx,ry]] of puddles.entries()) {
      const scale = .22+.78*wetness;
      const outline = Array.from({length:18},(_,i)=>{
        const angle=i*Math.PI/9;
        const edge=scale*(1+.18*Math.sin(angle*3+index));
        return convert([x+Math.cos(angle)*ry*edge,y+Math.sin(angle)*rx*edge,-.34]);
      });
      if(outline.some(p=>p[2]<near)) continue;
      const points=outline.map(project);
      const [cx,cy]=project(convert([x,y,-.34]));
      ctx.save();
      ctx.globalAlpha=wetness;
      ctx.beginPath();
      points.forEach((point,i)=>i?ctx.lineTo(...point):ctx.moveTo(...point));
      ctx.closePath();
      const shine=ctx.createLinearGradient(cx,cy-14,cx,cy+14);
      shine.addColorStop(0,'#655345');
      shine.addColorStop(.52,'#a6b8bf');
      shine.addColorStop(1,'#554335');
      ctx.fillStyle=shine;
      ctx.fill();
      ctx.clip();
      if(raining && !birdMotion.matches){
        for(let i=0;i<3;i++){
          const phase=((now/950)+i*.31+index*.11)%1;
          ctx.beginPath();
          ctx.ellipse(cx+(i-1)*5,cy+Math.sin(i)*2,2+phase*13,1+phase*4,0,0,Math.PI*2);
          ctx.strokeStyle='rgba(220,243,248,'+((1-phase)*.65)+')';
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  if(!raining || birdMotion.matches) return;
  for(let i=0;i<108;i++){
    const depth=(i%11)/10;
    const x=((i*103.73-now*(.06+depth*.12))%w+w)%w;
    const y=(i*52.69+now*(.41+depth*.64))%h;
    const length=7+depth*22;
    ctx.strokeStyle='rgba(221,239,248,'+(.035+depth*.20)+')';
    ctx.lineWidth=.55+depth*.9;
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x-length*.28,y+length);
    ctx.stroke();
  }
}
function drawBirds(now) {
  requestAnimationFrame(drawBirds);
  if (now < nextBirdFrame) return;
  nextBirdFrame = now + 40;
  const {ctx,w,h} = surface(birdCanvas);
  if (!w || !h || (!mesh&&!gpu)) return;
  const {convert,project} = renderCamera(w,h);
  drawWeather(ctx,w,h,now,convert,project);
  if (birdMotion.matches || view === 'plan') return;
  for (const [index, center] of [[-13,16],[29,15]].entries()) {
    const stride = now / 290 + index;
    const x = center[0]+Math.cos(now/5300+index)*1.5;
    const y = center[1]+Math.sin(now/5300+index)*1.1;
    const get = point => {
      const p = convert(point);
      return p[2] > near ? project(p) : null;
    };
    const body = get([x,y,.32]), head = get([x,y-.49,.45]), foot = get([x,y,-.36]);
    if (!body || !head || !foot) continue;
    const size = Math.hypot(body[0]-foot[0],body[1]-foot[1]);
    if (!size || size > 60) continue;
    ctx.fillStyle = '#e6dcc6';
    ctx.beginPath();
    ctx.ellipse(...body,size*.65,size*.46,0,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#443b32';
    ctx.beginPath();
    ctx.arc(...head,size*.22,0,Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#645144';
    ctx.lineWidth = Math.max(1,size*.09);
    for (const side of [-1,1]) {
      ctx.beginPath();
      ctx.moveTo(body[0]+side*size*.25,body[1]);
      ctx.lineTo(foot[0]+side*(size*.23+Math.sin(stride)*size*.12),foot[1]);
      ctx.stroke();
    }
  }
  for (let bird = 0; bird < 4; bird++) {
    const phase = (now / 15000 + bird * .052) % 1;
    const x = -44 + phase * 88;
    const y = 12 + bird * 1.3;
    const z = 7 + Math.sin(phase * Math.PI) * 3 + bird * .35;
    const wing = Math.sin(now / 87 + bird) * .49;
    const vertices = [[x+.32,y,z],[x-.29,y,z],[x-.12,y-.77,z+wing],[x-.12,y+.77,z+wing]].map(convert);
    if (vertices.some(point => point[2] < near)) continue;
    const pixels = vertices.map(project);
    ctx.fillStyle = '#223443';
    ctx.beginPath();
    for (const point of [pixels[0],pixels[2],pixels[1],pixels[3]]) ctx.lineTo(...point);
    ctx.closePath();
    ctx.fill();
  }
}
requestAnimationFrame(drawBirds);
initRenderer();

