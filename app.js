const $ = id => document.getElementById(id);
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
const cropProfiles = [
  ['Lactuca sativa','Soft, tender rosette · 33 planting sites','Salads, sandwiches and lettuce wraps','Vitamin A, vitamin K, folate'],
  ['Lactuca sativa','Mixed green and red leaves · 33 planting sites','Mixed salads and sandwich greens','Vitamin A, vitamin K, folate'],
  ['Lactuca sativa','Upright heads with crisp ribs · 33 planting sites','Caesar salad, wraps and grilling','Vitamin A, vitamin K, folate'],
  ['Lactuca sativa','Lobed red leaves · 33 planting sites','Salads, garnishes and sandwiches','Vitamin A, vitamin K, folate'],
  ['Ocimum basilicum','Aromatic culinary herb · 33 planting sites','Pesto, pasta, tomato dishes and garnish','Vitamin K and provitamin A carotenoids'],
  ['Brassica rapa (Chinensis Group)','Leafy greens with pale stalks · 33 planting sites','Stir-fries, soups and steaming','Vitamins A, C and K'],
  ['Solanum lycopersicum','Small fruit on trellised vines · 16 planting sites','Salads, roasting and snacking','Vitamin C, potassium, lycopene'],
  ['Cucumis sativus','Small fruit on climbing vines · 16 planting sites','Salads, pickles and snacking','Vitamin K, potassium'],
  ['Allium cepa','Bulb crop · outdoor field plot','Curries, soups, roasting and raw salads','Vitamin C, vitamin B6, dietary fiber'],
  ['Solanum tuberosum','Underground tuber crop · outdoor field plot','Baking, mashing, roasting and stews','Vitamin C, vitamin B6, potassium'],
  ['Brassica oleracea (Capitata Group)','Tightly layered leaves · outdoor field plot','Slaw, stir-fries, soups and fermentation','Vitamin C, vitamin K, dietary fiber'],
  ['Triticum aestivum','Grain crop · outdoor field plot','Flour for bread, rotis and cereals','Whole grain provides fiber, B vitamins and magnesium'],
  ['Zea mays','Grain crop · outdoor field plot','Cooked kernels, cornmeal and flour','Thiamin, folate, dietary fiber'],
  ['Solanum lycopersicum','Fruiting vines · outdoor field plot','Sauces, soups, salads and roasting','Vitamin C, potassium, lycopene']
];
const scenarioNotes = {
  drift:'Tests a water pH alert in Mixed lettuce. The demo correction moves pH from 6.34 to 5.82.',
  heat:'Tests a heat alert in Red oakleaf. Simulated ventilation lowers air temperature from 31.4 to 24.5 °C.',
  normal:'Clears the injected alerts so you can explore baseline readings. No corrective action is required in this demo.'
};
const ratings={};
try { Object.assign(ratings,JSON.parse(localStorage.getItem('verdant-ratings')||'{}')); } catch {}
const stars=Array.from({length:5},(_,index)=>{
  const input=document.createElement('input');
  input.type='radio';
  input.name='crop-stars';
  input.value=String(index+1);
  input.setAttribute('aria-label',index+1+' stars');
  const label=document.createElement('label');
  label.append(input,document.createTextNode('★'));
  $('crop-rating').append(label);
  input.onchange=()=>{
    ratings[zones[selected].id]=index+1;
    try { localStorage.setItem('verdant-ratings',JSON.stringify(ratings)); } catch {}
    renderRating(zones[selected]);
  };
  return input;
});
function renderRating(zone){
  stars.forEach((input,index)=>{
    input.checked=ratings[zone.id]===index+1;
    input.parentElement.classList.toggle('rated',index+1<=(ratings[zone.id]||0));
  });
}
function renderCropProfile(zone){
  const [scientific,description,uses,nutrients]=cropProfiles[selected];
  $('profile-name').textContent=zone.name;
  $('scientific-name').textContent=scientific;
  $('crop-description').textContent=description;
  $('crop-uses').textContent=uses;
  $('crop-nutrients').textContent=nutrients;
  renderRating(zone);
}

const scenarios = {
  drift:{zone:1,key:'ph',baseline:6.34,target:5.82,title:'pH above target', action:'Simulate pH correction', detail:'The simulator applies a pH-down solution to the Mixed lettuce reservoir and shows the resulting pH. It does not calculate a real chemical dose.'},
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
function selectBed(index,restorePhoto=true,visit=false){
  const previous=renderCamera(canvas.clientWidth,canvas.clientHeight);
  selected=index;
  $('feature-panel').hidden=true;
  $('health-title').textContent=zones[index].name+' health';
  $('health-advice').textContent='';
  $('leaf-photo').value='';
  $('vegetable-result').hidden=true;
  $('care-card').hidden=true;
  $('market-results').replaceChildren();
  $('offline-photo-status').textContent='';
  $('leaf-preview').hidden=true;
  $('mould-result').textContent='Choose a photo to scan.';
  if(leafPhotoUrl){URL.revokeObjectURL(leafPhotoUrl);leafPhotoUrl=null;}
  $('crop-dashboard').hidden=false;
  $('crop-trends').hidden=false;
  document.querySelector('.workspace').classList.add('inspecting');
  if(visit){visitedPlot=index;resetCamera('plot',previous);}
  if(hasIssue(index)) metric=issue().key;
  result='';
  refresh();
  if(restorePhoto)restoreCropPhoto(index);
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
  b.title=zone.name;
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
  renderCropProfile(zone);
  $('scenario-info').textContent=scenarioNotes[scenario];

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
  $('tools-context').textContent='Selected crop · '+zone.name;
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
  showLeafPhoto(file);
}
function photoKey(index){return new URL('saved-leaf/'+zones[index].id,location.href);}
async function restoreCropPhoto(index){
  if(!('caches' in window))return;
  try{
    const photo=await (await caches.open('verdant-photos')).match(photoKey(index));
    if(photo && selected===index && $('leaf-preview').hidden){
      const blob=await photo.blob();
      if(selected===index && $('leaf-preview').hidden)showLeafPhoto(blob,false);
    }
  }catch{}
}
function showLeafPhoto(file,save=true){
  if(leafPhotoUrl) URL.revokeObjectURL(leafPhotoUrl);
  leafPhotoUrl=URL.createObjectURL(file);
  $('leaf-preview').src=leafPhotoUrl;
  $('leaf-preview').hidden=false;
  $('vegetable-result').hidden=true;
  $('care-card').hidden=true;
  $('mould-result').textContent='Ready to scan.';
  const index=selected;
  if(save&&file.size<=10_000_000&&'caches' in window){
    caches.open('verdant-photos').then(cache=>cache.put(photoKey(index),new Response(file,{headers:{'Content-Type':file.type}}))).then(()=>{
      if(selected===index)$('offline-photo-status').textContent='Photo saved on this device.';
    }).catch(()=>{});
  }
}
const sampleOffers = [
  {market:'Sample Mandi A',price:28,transport:4.50},
  {market:'Sample Mandi B',price:26,transport:1.25},
  {market:'Sample Mandi C',price:24,transport:.80}
];
$('demo-case').onclick=()=>{
  selectBed(zones.findIndex(zone=>zone.id==='FIELD-06'),false);
  const vegetable=$('vegetable-result');
  vegetable.hidden=false;
  vegetable.textContent='Sample crop · Tomato';
  $('mould-result').textContent='Hackathon sample · preset case. No photo was analyzed.';
  $('care-card').hidden=false;
  $('care-name').textContent='Sample case · Tomato early blight';
  $('care-steps').textContent='Check older leaves for concentric spots. If early blight is confirmed, remove affected leaves when dry, clean tools, mulch, and water at soil level.';
  $('care-source').href='https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/early-blight-in-tomato-and-potato';
  $('care-source').hidden=false;
  const title=document.createElement('strong');
  title.textContent='Sample mandi quotes · illustrative prices';
  const list=document.createElement('ol');
  const ranked=sampleOffers.map(row=>({...row,net:row.price-row.transport})).sort((a,b)=>b.net-a.net);
  ranked.forEach((row,index)=>{
    const item=document.createElement('li');
    item.textContent=(index===0?'Best sample net price · ':'')+row.market+' · ₹'+row.net.toFixed(2)+'/kg after transport';
    list.append(item);
  });
  $('market-results').replaceChildren(title,list);
};
const chemicalReferences={
  early:['Use mulch and water at soil level. Discuss a labeled early blight fungicide with an adviser if needed. Group 11 resistance can reduce control.','early-blight-in-tomato-and-potato'],
  leaf:['Improve airflow and reduce humidity. Copper hydroxide is one active ingredient discussed in the Extension guide for tomato leaf mold. Verify local registration and the specific product label.','tomato-leaf-mold'],
  gray:['Ventilate and remove affected tissue when dry. Discuss a locally labeled gray mold fungicide if cultural controls are insufficient. Use the crop guide to check resistance management.','gray-mold-of-tomatoes']
};
function renderChemicalReference(){
  const [guidance,source]=chemicalReferences[$('chemical-case').value];
  $('chemical-advice').textContent=guidance;
  $('chemical-source').href='https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/'+source;
}
$('chemical-case').onchange=renderChemicalReference;
renderChemicalReference();
const screeningCrop=$('screen-crop');
const screeningNames=['Lettuce','Basil','Pak choi','Tomato','Cucumber','Onion','Potato','Cabbage','Wheat','Corn'];
for(const crop of screeningNames)screeningCrop.add(new Option(crop,crop.toLowerCase()));
$('scan-mould').onclick=async()=>{
  const preview=$('leaf-preview');
  const status=$('mould-result');
  if(preview.hidden){status.textContent='Capture or upload a photo first.';return;}
  if(navigator.onLine===false){
    status.textContent='This browser can keep the photo offline. Reconnect to run photo screening, or try the offline hackathon sample.';
    return;
  }
  const photo=preview.src;
  const crop=screeningCrop.value;
  screeningCrop.disabled=true;
  const button=$('scan-mould');
  button.disabled=true;
  status.textContent='Scanning photo…';
  $('vegetable-result').hidden=true;
  $('care-card').hidden=true;
  try{
    await preview.decode();
    const scale=Math.min(1,1280/Math.max(preview.naturalWidth,preview.naturalHeight));
    const input=document.createElement('canvas');
    input.width=Math.max(1,Math.round(preview.naturalWidth*scale));
    input.height=Math.max(1,Math.round(preview.naturalHeight*scale));
    input.getContext('2d').drawImage(preview,0,0,input.width,input.height);
    const response=await fetch('/api/mould',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({image:input.toDataURL('image/jpeg',.85).split(',')[1],crop}),
      signal:AbortSignal.timeout(45000)});
    const result=await response.json();
    if(preview.hidden||preview.src!==photo)return;
    if(!response.ok)throw new Error(result.error||'Scan unavailable.');
    const labels={unavailable:'Mould scan unavailable',possible_mould:'Possible visible mould',possible_rot:'Possible rot; mould unconfirmed',inconclusive:'No confident visible finding. Hidden mould cannot be ruled out.'};
    const vegetable=$('vegetable-result');
    const best=result.vegetables?.[0];
    vegetable.hidden=false;
    vegetable.textContent=crop?'Selected crop · '+screeningCrop.selectedOptions[0].textContent:best?'Vegetable match · '+best.label+' · '+Math.round(best.confidence*100)+'%':((result.vegetableMessage||'Vegetable identification unavailable.')+' Choose the crop from the menu and screen again.');
    const scores=(result.regions??[]).map(region=>region.label+' '+Math.round(region.confidence*100)+'%');
    status.textContent=[labels[result.status],result.source,...scores].filter(Boolean).join(' · ');
    const diagnosis=result.disease;
    $('care-card').hidden=false;
    $('care-name').textContent=diagnosis?diagnosis.name+' · '+Math.round(diagnosis.confidence*100)+'%':'Treatment guidance';
    $('care-steps').textContent=diagnosis?.steps || 'The photo did not establish a supported leaf disease. Photograph another affected leaf and ask a crop adviser to confirm the cause before treating.';
    $('care-source').hidden=!diagnosis;
    if(diagnosis)$('care-source').href=diagnosis.source;
  }catch(error){
    if(!preview.hidden&&preview.src===photo)status.textContent=error instanceof SyntaxError?'Photo screening is unavailable right now.':error.message;
  }finally{button.disabled=false;screeningCrop.disabled=false;}
};
$('leaf-photo').onchange=previewLeaf;
const cameraDialog=$('photo-camera');
const cameraFeed=$('camera-feed');
let cameraStream=null;
let cameraRequest=0;
cameraDialog.addEventListener('close',()=>{
  cameraRequest++;
  cameraStream?.getTracks().forEach(track=>track.stop());
  cameraStream=null;
  cameraFeed.srcObject=null;
});
$('open-camera').onclick=async()=>{
  const request=++cameraRequest;
  $('capture-photo').disabled=true;
  $('camera-status').textContent='Starting camera…';
  cameraDialog.showModal();
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
    if(request!==cameraRequest||!cameraDialog.open){stream.getTracks().forEach(track=>track.stop());return;}
    cameraStream=stream;
    cameraFeed.srcObject=stream;
    await cameraFeed.play();
    if(request!==cameraRequest)return;
    $('camera-status').textContent='Place the vegetable in the frame.';
    $('capture-photo').disabled=false;
  }catch{
    if(request===cameraRequest) $('camera-status').textContent='Camera unavailable. Close this window and upload a photo.';
  }
};
$('close-camera').onclick=()=>cameraDialog.close();
$('capture-photo').onclick=()=>{
  if(!cameraFeed.videoWidth)return;
  const request=cameraRequest;
  const frame=document.createElement('canvas');
  const scale=Math.min(1,1280/Math.max(cameraFeed.videoWidth,cameraFeed.videoHeight));
  frame.width=Math.round(cameraFeed.videoWidth*scale);
  frame.height=Math.round(cameraFeed.videoHeight*scale);
  frame.getContext('2d').drawImage(cameraFeed,0,0,frame.width,frame.height);
  frame.toBlob(blob=>{
    if(!blob||request!==cameraRequest||!cameraDialog.open)return;
    showLeafPhoto(blob);
    cameraDialog.close();
  },'image/jpeg',.90);
};
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
const marketNames={8:'Onion',9:'Potato',10:'Cabbage',11:'Wheat',12:'Maize',13:'Tomato',6:'Tomato',7:'Cucumbar(Kheera)'};
$('market-lookup').onsubmit=async event=>{
  event.preventDefault();
  const index=selected;
  const panel=$('market-results');
  const query=new URLSearchParams({state:$('market-state').value.trim(),district:$('market-district').value.trim(),commodity:marketNames[index]||zones[index].name});
  panel.textContent='Looking up district prices…';
  try{
    const response=await fetch('/api/market?'+query,{signal:AbortSignal.timeout(15000)});
    const result=await response.json();
    if(selected!==index)return;
    if(!response.ok)throw new Error(result.error);
    if(!result.rows.length){panel.textContent='No prices found for this crop in the selected district.';return;}
    const title=document.createElement('strong');
    title.textContent='Highest published modal price in this district';
    const list=document.createElement('ol');
    for(const row of result.rows){
      const li=document.createElement('li');
      li.textContent=[row.market,row.variety,row.grade,'₹'+Number(row.price).toFixed(2)+'/kg',row.date].filter(Boolean).join(' · ');
      list.append(li);
    }
    panel.replaceChildren(title,list);
  }catch(error){
    if(selected===index)panel.textContent=error instanceof SyntaxError?'Live market prices are unavailable. Compare your quotes below.':error.message;
  }
};

const canvas=$('scene');
let hitFaces=[];
let cameraMove=null;
let gpu=null;
let walking=null, visitedPlot=8;
let mesh, view='orbit', yaw=.67, pitch=.54, zoom=1, drag, frame=0;
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
  if(stop.startsWith('plot-')) selectBed(Number(stop.slice(5)),true,true);
  else resetCamera(stop);
};
$('visit-stop').onchange=$('visit-go').onclick;

function resetCamera(next=view,previous=renderCamera(canvas.clientWidth,canvas.clientHeight)){
  $('scene-title').textContent=next==='plot'?zones[visitedPlot].name+' plot':visitNames[next];
  $('visit-stop').value=next==='plot'?'plot-'+visitedPlot:next;
  walking=null;
  $('walk-toggle').setAttribute('aria-pressed','false');
  view=next; yaw=next==='plan'?0:next==='plot'?-.72:.67; pitch=next==='plan'?1.55:next==='plot'?.78:.54;zoom=1;
  cameraMove=previous.focal>0&&!birdMotion.matches?{previous,start:performance.now()}:null;
  for(const button of $('views').children) button.setAttribute('aria-pressed',button.dataset.view===view);
  $('scene-help').textContent=view==='aisle'?'Drag to look · Scroll to zoom':'Drag to orbit · Scroll to zoom';
  requestScene();
}
function requestScene(){
  if(!frame) frame=requestAnimationFrame(()=>{frame=0;drawScene();if(cameraMove)requestScene();});
}
function renderCamera(w,h){
  const focus = {yard:[8,21,2],pasture:[-10,18,1.1]};
  const target = view==='plot'?[zones[visitedPlot].x,zones[visitedPlot].y,.6]:(focus[view] ?? [0,0,1.8]);
  const distance = (view === 'farm' ? 95 : view==='plot' ? 15 : focus[view] ? 25 : 35) / zoom;
  let eye=view==='aisle'?[0,-8.65,1.72]:[target[0]+distance*Math.cos(pitch)*Math.sin(yaw),target[1]-distance*Math.cos(pitch)*Math.cos(yaw),target[2]+distance*Math.sin(pitch)];
  let aim=view==='aisle'?[Math.sin(yaw-.67)*8,8,1.55+(pitch-.54)*5]:target;
  if(walking){
    eye=[walking.x,walking.y,1.35];
    aim=[eye[0]+Math.sin(yaw),eye[1]+Math.cos(yaw),eye[2]+Math.tan(pitch)];
  }
  if(cameraMove){
    const t=clamp((performance.now()-cameraMove.start)/(cameraMove.duration??460),0,1);
    if(t===1)cameraMove=null;
    else{
      const ease=t*t*(3-2*t);
      const mix=(from,to)=>to.map((v,i)=>from[i]+(v-from[i])*ease);
      eye=mix(cameraMove.previous.eye,eye);
      aim=mix(cameraMove.previous.aim,aim);
    }
  }
  const forward=norm(minus(aim,eye)),right=norm(cross(forward,[0,0,1])),up=cross(right,forward);
  const focal=walking||view==='aisle'?Math.max(w*.65,h*.85)*zoom:Math.min(w*.9,h*1.30);
  const convert=p=>{const d=minus(p,eye);return [dot(d,right),dot(d,up),dot(d,forward)];};
  const project=([x,y,z])=>[w/2+x*focal/z,h*.53-y*focal/z];
  return {convert,project,eye,aim,right,up,forward,focal};
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
  {name:'Equipment and produce storage', image:'storage.jpg', location:[8,16.8,3.3], views:['farm','yard'], detail:'Covered storage with sliding doors, produce crates, tool bench, and a sheltered loading area.'},
  {name:'Chicken coop', image:'coop.jpg', location:[-7,20,2], views:['farm','pasture'], detail:'Raised shelter with a ramp and nesting boxes for the hens.'},
  {name:'Farmhouse', image:'farmhouse.jpg', location:[-8,-24,4.6], views:['farm','orbit'], detail:'Farmhouse with a covered porch, chimney, shuttered windows and a nearby well.'},
  {name:'Orchard', image:'orchard.jpg', location:[-22,27,2.8], views:['farm','pasture'], detail:'Apple trees near the pond and perimeter stone wall.'},
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
  if(gpu) gpu(camera,w,h,walking?.inside?'aisle':view,corrected?0:(issue()?.zone??-1)+1);
  else drawSoftwareScene(camera);
  positionMarkers(convert,project,w,h);
}
function drawSoftwareScene({convert,project}){
  const {ctx,w,h}=surface(canvas);
  const polygons=[];
  const moving = cameraMove || drag?.moved || performance.now() < wheelUntil;
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
    if(!walking&&view==='plan'&&verts.some(v=>v[2]>2.15)) continue;
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
const roamingAnimals=[[-13.6,19,.32],[-28.6,25.5,.06],[-6.8,16.1,.08]];
function roamingPosition(index,now){
  const [x,y,z]=roamingAnimals[index];
  return [x+Math.cos(now/(5200+index*1200)+index)*(.85+index*.2),
    y+Math.sin(now/(5200+index*1200)+index)*.72,z];
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
const walkStarts={farm:[0,-24,0],orbit:[0,-13,0],aisle:[0,-7.8,0],yard:[4,17,1],pasture:[-10,14.8,0],plan:[0,-7.8,0]};
const walkObstacles=[[-7.2,7.2,-10.2,10.2],[-11.4,-4.5,-28,-21.5],[5.2,10.8,14.5,19.5],[3.7,12.3,19.6,26.5],[12.4,15.6,21.4,24.6],[-8.7,-5.3,18.7,21.3],[24,28,-30,-26]];
function startWalk(){
  const previous=renderCamera(canvas.clientWidth,canvas.clientHeight);
  const [x,y,heading]=view==='plot'?[zones[visitedPlot].x,zones[visitedPlot].y-3,0]:walkStarts[view];
  walking={x,y,inside:view==='aisle'||view==='plan'};
  yaw=heading;
  pitch=-.08;
  cameraMove=previous.focal>0&&!birdMotion.matches?{previous,start:performance.now()}:null;
  $('walk-toggle').setAttribute('aria-pressed','true');
  $('scene-help').textContent='Drag to look · ↑ / ↓ or W / S to walk';
  requestScene();
}
function walkStep(direction){
  if(!walking)startWalk();
  const stride=.48*direction;
  const x=walking.x+Math.sin(yaw)*stride, y=walking.y+Math.cos(yaw)*stride;
  if(walking.inside ? Math.abs(x)>.9 || y< -8.8 || y>8.4 :
     Math.abs(x)>31 || Math.abs(y)>31 || walkObstacles.some(([a,b,c,d])=>x>a&&x<b&&y>c&&y<d))return;
  const previous=renderCamera(canvas.clientWidth,canvas.clientHeight);
  walking.x=x;
  walking.y=y;
  if(!cameraMove&&!birdMotion.matches)cameraMove={previous,start:performance.now(),duration:160};
  requestScene();
}
$('walk-toggle').onclick=()=>walking?resetCamera():startWalk();
$('walk-forward').onclick=()=>walkStep(1);
$('walk-back').onclick=()=>walkStep(-1);
document.querySelector('.viewport').addEventListener('keydown',event=>{
  const direction={ArrowUp:1,ArrowDown:-1,w:1,s:-1}[event.key];
  if(!direction || event.target.matches('select,input,textarea'))return;
  event.preventDefault();
  walkStep(direction);
});
function turn(dx,dy=0){cameraMove=null;yaw+=dx;pitch=clamp(pitch+dy,walking?-1:view==='aisle'?.15:.12,walking?1:view==='aisle'?.95:1.55);requestScene();}
function magnify(factor){cameraMove=null;zoom=clamp(zoom*factor,.65,1.9);requestScene();}
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
    const index=gpu(renderCamera(w,h),w,h,walking?.inside?'aisle':view,0,[x,y]);
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
  magnify(Math.exp(-event.deltaY*.001));
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
function drawRain(ctx,w,h,now){
  const raining = weatherViewport.dataset.weather === 'rain';
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
const birdRoutes=[
  {period:20,offset:0,points:[[0,-40,-13,7],[6,-20,-11,3.6],[8,-16,-15,5.7],[13,5,-22,9],[18,41,-25,10]]},
  {period:25,offset:6,points:[[0,39,15,9],[6,22,12,3.8],[8,23,19,6.1],[14,8,24,9],[20,-39,32,10]]},
  {period:27,offset:3,perch:[8,13],points:[[0,-37,32,8],[6,-17,24,4],[8,-16,23,.91],[13,-16,23,.91],[16,-10,30,5],[22,35,37,9]]},
  {period:30,offset:11,perch:[10,16],points:[[0,42,31,8],[7,22,24,5],[10,8,23,6.9],[16,8,23,6.9],[19,-2,20,8],[25,-42,18,10]]}
];
function birdPose(route,now){
  const time=(now/1000+route.offset)%route.period;
  const next=route.points.findIndex(point=>point[0]>time);
  if(next<1)return null;
  const [start,x,y,z]=route.points[next-1], [end,tx,ty,tz]=route.points[next];
  const t=(time-start)/(end-start);
  const ease=t*t*(3-2*t);
  return {x:x+(tx-x)*ease,y:y+(ty-y)*ease,z:z+(tz-z)*ease,
    heading:Math.atan2(ty-y,tx-x),perched:route.perch&&time>=route.perch[0]&&time<route.perch[1]};
}
function drawBirds(now) {
  requestAnimationFrame(drawBirds);
  if (now < nextBirdFrame) return;
  nextBirdFrame = now + 40;
  const {ctx,w,h} = surface(birdCanvas);
  if (!w || !h || (!mesh&&!gpu)) return;
  const {convert,project} = renderCamera(w,h);
  drawRain(ctx,w,h,now);
  if (birdMotion.matches || view === 'plan') return;
  for (const [index] of roamingAnimals.entries()) {
    const stride = now / 290 + index;
    const [x,y,z]=roamingPosition(index,now);
    const get = point => {
      const p = convert(point);
      return p[2] > near ? project(p) : null;
    };
    const body = get([x,y,z]), head = get([x,y-(index===0?.49:.22),z+.13]), foot = get([x,y,-.36]);
    if (!body || !head || !foot) continue;
    const size = Math.hypot(body[0]-foot[0],body[1]-foot[1]);
    if (!size || size > 60) continue;
    ctx.fillStyle = index===2?'#b27b53':'#e6dcc6';
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
  for(const [index,route] of birdRoutes.entries()){
    const pose=birdPose(route,now);
    if(!pose)continue;
    const {x,y,z,heading,perched}=pose;
    const wing=perched?.08:Math.sin(now/82+index)*.51;
    const span=perched?.16:.73;
    const c=Math.cos(heading),d=Math.sin(heading);
    const vertices=[[.30,0,.06],[-.28,0,0],[-.10,-span,wing],[-.10,span,wing]]
      .map(([along,side,rise])=>convert([x+c*along-d*side,y+d*along+c*side,z+rise]));
    if(vertices.some(point=>point[2]<near))continue;
    const points=vertices.map(project);
    for(const [side,color] of [[2,'#263946'],[3,'#465563']]){
      ctx.beginPath();
      ctx.moveTo(...points[0]);
      ctx.lineTo(...points[side]);
      ctx.lineTo(...points[1]);
      ctx.closePath();
      ctx.fillStyle=color;
      ctx.fill();
    }
  }

}
requestAnimationFrame(drawBirds);
initRenderer();
if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});


