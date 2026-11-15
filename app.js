const $ = id => document.getElementById(id);
const zones = [
  {name:'Butterhead', id:'DWC-01', x:-4.28},
  {name:'Mixed lettuce', id:'DWC-02', x:-1.99},
  {name:'Green romaine', id:'DWC-03', x:1.99},
  {name:'Red oakleaf', id:'DWC-04', x:4.28},
  {name:'Basil', id:'DWC-05', x:-4.28},
  {name:'Pak choi', id:'DWC-06', x:-1.99},
  {name:'Cherry tomato', id:'DWC-07', x:1.99},
  {name:'Mini cucumber', id:'DWC-08', x:4.28}
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
  b.textContent='0'+(index+1);
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
  $('summary').textContent=activeIssue&&!corrected?'8 crop beds · 1 needs attention':'8 crop beds · all within demo ranges';
  $('needs-attention').textContent=activeIssue&&!corrected?'1':'0';
  $('bay-temp').textContent=(zones.reduce((sum,_,i)=>sum+current('temp',i),0)/zones.length).toFixed(1)+' °C';
  $('bay-water').textContent=Math.round(zones.reduce((sum,_,i)=>sum+current('level',i),0)/zones.length)+'%';
  $('zone-id').textContent=zone.id+' / BAY 07';
  $('zone-name').textContent=zone.name;
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
      button.classList.toggle('warn',hasIssue(i));
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

const canvas=$('scene');
let mesh, view='orbit', yaw=.67, pitch=.54, zoom=1, drag, frame=0;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const minus=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function resetCamera(next=view){
  view=next; yaw=next==='plan'?0:.67; pitch=next==='plan'?1.55:.54;zoom=1;
  for(const button of $('views').children) button.setAttribute('aria-pressed',button.dataset.view===view);
  $('scene-help').textContent=view==='aisle'?'Drag to look · Scroll to zoom':'Drag to orbit · Scroll to zoom';
  requestScene();
}
function requestScene(){
  if(!frame) frame=requestAnimationFrame(()=>{frame=0;drawScene();});
}
function renderCamera(w,h){
  const distance=35/zoom, target=[0,0,1.8];
  const eye=view==='aisle'?[0,-8.65,1.72]:[distance*Math.cos(pitch)*Math.sin(yaw),-distance*Math.cos(pitch)*Math.cos(yaw),1.8+distance*Math.sin(pitch)];
  const aim=view==='aisle'?[Math.sin(yaw-.67)*8,8,1.55+(pitch-.54)*5]:target;
  const forward=norm(minus(aim,eye)),right=norm(cross(forward,[0,0,1])),up=cross(right,forward);
  const focal=view==='aisle'?Math.max(w*.65,h*.85)*zoom:Math.min(w*.9,h*1.30);
  const convert=p=>{const d=minus(p,eye);return [dot(d,right),dot(d,up),dot(d,forward)];};
  const project=([x,y,z])=>[w/2+x*focal/z,h*.53-y*focal/z];
  return {convert,project};
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
function drawScene(){
  const {ctx,w,h}=surface(canvas);
  if(!mesh||!w||!h){pins.forEach(b=>b.hidden=true);return;}
  const {convert,project}=renderCamera(w,h), polygons=[];
  ctx.strokeStyle='#83d7e016';ctx.lineWidth=1;
  for(let x=-22;x<=22;x+=2) grid([x,-25,-.49],[x,25,-.49]);
  for(let y=-24;y<=24;y+=2) grid([-22,y,-.49],[22,y,-.49]);
  function grid(a,b){
    const line=clip([convert(a),convert(b)]);
    if(line.length<2) return;
    ctx.beginPath();ctx.moveTo(...project(line[0]));ctx.lineTo(...project(line[1]));ctx.stroke();
  }
  for(const {type,zone,verts,faces} of mesh){
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
  polygons.sort((a,b)=>b.depth-a.depth);
  for(const {visible,color,type,zone} of polygons){
    ctx.beginPath();ctx.moveTo(...visible[0]);visible.slice(1).forEach(p=>ctx.lineTo(...p));ctx.closePath();
    ctx.fillStyle=color;
    if(type==='glass'){ctx.fillStyle='#8adfff12';ctx.strokeStyle='#b9f6ff22';ctx.lineWidth=.7;ctx.stroke();}
    if(['mint','pink','cyan','amber'].includes(type)){
      ctx.shadowColor=color;ctx.shadowBlur=zone===selected?10:4;
    }
    ctx.fill();ctx.shadowBlur=0;
  }
  const markers=zones.map((zone,i)=>{
    const p=convert([zone.x,(i<4?-4:4)+(view==='aisle'?1.25:0),view==='plan'?1.2:(i>=6?2.76:1.65)+(i%2)*.3]);
    return p[2]>near?project(p):null;
  });
  markers.forEach((p,i)=>{
    const button=pins[i];
    const show=p&&p[0]>22&&p[0]<w-22&&p[1]>65&&p[1]<h-47;
    button.hidden=!show;
    if(show){button.style.left=p[0]+'px';button.style.top=p[1]+'px';}
  });
}
$('views').onclick=event=>{if(event.target.dataset.view)resetCamera(event.target.dataset.view);};
$('home').onclick=()=>resetCamera();
function turn(dx,dy=0){yaw+=dx;pitch=clamp(pitch+dy,view==='aisle'?.15:.12,view==='aisle'?.95:1.55);requestScene();}
function magnify(factor){zoom=clamp(zoom*factor,.65,1.9);requestScene();}
$('left').onclick=()=>turn(-.22);
$('right').onclick=()=>turn(.22);
$('zoomout').onclick=()=>magnify(.85);
$('zoomin').onclick=()=>magnify(1.18);
canvas.onpointerdown=event=>{if(event.button!==0)return;drag={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);};
canvas.onpointermove=event=>{
  if(!drag) return;
  turn((drag.x-event.clientX)*.008,(event.clientY-drag.y)*.007);
  drag={x:event.clientX,y:event.clientY};
};
canvas.onlostpointercapture=()=>{drag=null;};
canvas.onwheel=event=>{if(!mesh)return;event.preventDefault();magnify(Math.exp(-event.deltaY*.001));};
new ResizeObserver(()=>{drawChart();requestScene();}).observe(document.querySelector('.workspace'));
refresh();
try {
  const glow=new Set(['mint','amber','pink','cyan','glass']);
  mesh=geometry.parts.map(([type,zone,verts,polys])=>{
    const rgb=geometry.palette[type].match(/[a-f\d]{2}/gi).map(h=>parseInt(h,16));
    const faces=polys.map(indices=>{
      const [a,b,c]=indices.map(i=>verts[i]);
      const normal=norm(cross(minus(b,a),minus(c,a)));
      const light=glow.has(type)?1:.53+.44*Math.abs(dot(normal,[.33,-.39,.85]));
      return {indices,tone:'rgb('+rgb.map(v=>Math.round(v*light)).join(',')+')'};
    });
    return {type,zone,verts,faces};
  });
  document.querySelector('.viewport').classList.add('interactive');
  requestScene();
} catch {
  $('scene-help').textContent='Static Blender preview · Select beds below';
  document.querySelector('.viewport').classList.add('fallback');
  for(const button of document.querySelectorAll('#views button,.camera-buttons button')) button.disabled=true;
}

