/* Verdant Ops farmer tools. Additive UI; deliberately does not edit the Blender scene or renderer. */
(()=>{
'use strict';
const root=document.getElementById('hub-panels');
if(!root)return;
const E=id=>document.getElementById(id);
const now=()=>new Date().toISOString();
const cropName=()=>zones[activeCrop]?.name||'Crop';
const money=n=>'₹'+Number(n).toFixed(2);
const safeNumber=(x,fallback=0)=>Number.isFinite(Number(x))?Number(x):fallback;
let activeCrop=1,currentPhoto=null,currentScan=null,profile={language:'en-IN',farmSize:1,district:'',state:'Tamil Nadu',crop:'Mixed lettuce',cropStage:'vegetative',consentLocation:false,consentSync:false},coords=null;
const voices={'en-IN':'English','ta-IN':'தமிழ்','hi-IN':'हिन्दी'};
const phrases={
 'en-IN':{retake:'Photo may be too dark or blurry. Retake in daylight, hold steady, and fill the frame with one leaf.',clear:'Photo quality check passed. Disease identification is not available: no validated offline model is bundled.',wait:'A qualified agriculture officer should confirm the cause before treatment.'},
 'ta-IN':{retake:'படம் தெளிவாக இல்லை. நல்ல வெளிச்சத்தில் இலையை மீண்டும் படம் எடுக்கவும்.',clear:'படத் தரம் சரியாக உள்ளது. நோயைக் கண்டறிய சரிபார்க்கப்பட்ட AI மாதிரி நிறுவப்படவில்லை.',wait:'சிகிச்சைக்கு முன் வேளாண் அலுவலரின் ஆலோசனை பெறவும்.'},
 'hi-IN':{retake:'फ़ोटो धुंधली या अंधेरी है। दिन के उजाले में एक पत्ती की साफ़ तस्वीर दोबारा लें।',clear:'फ़ोटो की गुणवत्ता ठीक है। प्रमाणित ऑफ़लाइन रोग पहचान मॉडल अभी उपलब्ध नहीं है।',wait:'उपचार करने से पहले कृषि अधिकारी से पुष्टि करवाएँ।'}
};
const diseases=[
 {id:'healthy',name:'Healthy appearance',type:'healthy',symptoms:'No visible lesions or significant insect damage',action:'Keep monitoring leaf undersides and new growth.',organic:'Maintain airflow, correct watering, and clean tools.',chemical:'None advised without a confirmed pest or disease.',prevent:'Monitor weekly; follow crop rotation and sanitation.'},
 {id:'powdery',name:'Powdery mildew / mould',type:'diseased',symptoms:'White powder-like patches that spread on foliage',action:'Separate suspect foliage, reduce crowding, improve ventilation; ask an adviser to distinguish mildew from residue.',organic:'Remove heavily affected leaves where agronomically appropriate; improve airflow and avoid wetting foliage.',chemical:'Only a locally registered fungicide explicitly labelled for this crop and confirmed disease, at the label rate and timing.',prevent:'Select tolerant varieties; limit overhead watering and dense canopies.'},
 {id:'blight',name:'Early or late blight',type:'diseased',symptoms:'Dark spreading lesions on leaves, often after damp conditions',action:'Photograph multiple leaves, keep foliage dry, and have the specific pathogen confirmed.',organic:'Remove infected residues with clean tools and improve field drainage.',chemical:'Ask an officer for a crop-specific registered fungicide and label directions; early and late blight can need different controls.',prevent:'Rotate away from susceptible hosts; use healthy planting material.'},
 {id:'rust',name:'Rust',type:'diseased',symptoms:'Orange, yellow or brown pustules, often on leaf undersides',action:'Check multiple leaves and request confirmation, since nutrient injury can be confused with rust.',organic:'Remove infected debris and reduce leaf wetness.',chemical:'Only registered crop-specific fungicides after confirmation and PHI review.',prevent:'Resistant varieties and rotation where available.'},
 {id:'spot',name:'Leaf spot',type:'diseased',symptoms:'Distinct dark spots with yellow halos or merging lesions',action:'Check irrigation and nutrition; request lab or officer review for fungal vs bacterial cause.',organic:'Remove contaminated debris and sanitize tools; improve spacing.',chemical:'Avoid blanket pesticides until an agent is identified and the crop label permits treatment.',prevent:'Use clean seed and monitor humidity.'},
 {id:'wilt',name:'Bacterial or vascular wilt',type:'diseased',symptoms:'Sudden wilt, sometimes despite moist soil',action:'Check roots and soil moisture first; keep suspect material separate and obtain diagnostic confirmation.',organic:'Do not move infected soil or tools to clean beds.',chemical:'Do not assume fungicides cure bacterial or vascular wilt; seek official guidance.',prevent:'Plant resistant varieties and rotate susceptible crops.'},
 {id:'pests',name:'Pest damage',type:'pest-damaged',symptoms:'Holes, webs, chewing, honeydew or visible insects',action:'Photograph both sides of leaves and identify the pest before control.',organic:'Scout leaves, remove pests manually when practical, and protect beneficial insects.',chemical:'Use only labelled, crop- and pest-specific products when warranted; follow all safety and waiting periods.',prevent:'Frequent scouting and integrated pest management.'}
];
// Examples are ingredient names for professional discussion, not application instructions.
// India: choose only currently CIB&RC-registered formulations whose label covers
// the exact crop + diagnosed problem; the formulation label sets dose, PHI and PPE.
const chemicalReference={
 healthy: {examples:[],caution:'Do not apply a pesticide to a healthy crop.'},
 powdery:{examples:['Wettable sulfur / sulphur (fungicide)','Potassium bicarbonate (contact fungicide, if registered)','Azoxystrobin (systemic fungicide, only on crops with a valid local label)'],caution:'Sulfur can injure foliage in hot conditions or when used near oils; never mix products or use adjacent sprays unless approved labels permit.'},
 blight: {examples:['Copper hydroxide or copper oxychloride (protectant fungicide)','Other disease-specific fungicides approved for confirmed early or late blight on this crop'],caution:'Early blight, late blight and bacterial blight require different control choices. Copper products can damage sensitive leaves; check crop and disease label.'},
 rust: {examples:['Azoxystrobin (fungicide)','Tebuconazole (fungicide, only on crops with an approved local label)'],caution:'Rotate approved fungicide modes of action where the local label permits; not all rust species or crop combinations have the same registered products.'},
 spot: {examples:['Copper hydroxide / copper oxychloride (only for labelled crop and pathogen)','Azoxystrobin (only where a fungal leaf-spot label covers the crop)'],caution:'Leaf spots can be bacterial, fungal or noninfectious. Do not select fungicide until the cause is diagnosed.'},
 wilt: {examples:[],caution:'No routine foliar chemical spray cures bacterial or vascular wilt. Seek crop-specific diagnosis and focus on sanitation and resistant varieties.'},
 pests: {examples:['Azadirachtin / neem-derived registered pest product','Insecticidal soap (if registered for the identified crop and pest)','Spinosad (only for specifically identified and labelled insect pests)'],caution:'Aphids, caterpillars, mites and fungal lesions need different approaches. Avoid spraying pollinators; observe beneficial-insect precautions and all label restrictions.'}
};
function chemicalAdvice(id,near){
 const ref=chemicalReference[id]||chemicalReference.healthy;
 const options=ref.examples.length?'Active-ingredient examples to discuss with a qualified adviser (NOT an instruction to spray): '+ref.examples.join('; ')+'.':'No chemical spray suggested for this condition.';
 return options+'\nSpecific warning: '+ref.caution+'\n'+(near?'⚠ NEAR HARVEST: Do not apply any product until its exact crop-specific pre-harvest interval (PHI) can be satisfied.':'Apply a product only after checking its registered crop/pest label, waiting period and re-entry interval.')+'\nNever improvise dosages, tank mixtures or spray timing. Use the label and professional/local extension guidance.';
}
const fromId=id=>diseases.find(d=>d.id===id)||diseases[0];
const renderDiseaseChoices=(includeHealthy=true)=>diseases.filter(d=>includeHealthy||d.id!=='healthy').map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
let dbPromise;
function db(){
 if(!('indexedDB' in window))return Promise.reject(new Error('IndexedDB unavailable'));
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  const req=indexedDB.open('verdant-farmer-v1',1);
  req.onupgradeneeded=()=>{const d=req.result;for(const name of ['scans','quotes','feedback','sync','cache'])if(!d.objectStoreNames.contains(name))d.createObjectStore(name,{keyPath:'id'});};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });return dbPromise;
}
async function record(store,data){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(store,'readwrite'),r=tx.objectStore(store).put(data);tx.oncomplete=()=>resolve(data);tx.onerror=()=>reject(tx.error);});}
async function all(store){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(store,'readonly'),r=tx.objectStore(store).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});}
async function readCache(id){return (await all('cache')).find(x=>x.id===id)?.value||null;}
function notify(id,text,warning=false){const el=E(id);if(!el)return;el.textContent=text;el.classList.toggle('warn',!!warning);}
function updateConnection(){const on=navigator.onLine;E('offline-status').textContent=on?'ONLINE / cached for offline':'OFFLINE / local records';E('offline-status').classList.toggle('warn',!on);}
function speak(text){if(!('speechSynthesis' in window)){notify('scan-status','Voice output is not supported in this browser.',true);return;}window.speechSynthesis.cancel();const phrase=new SpeechSynthesisUtterance(text);phrase.lang=profile.language;phrase.rate=.91;window.speechSynthesis.speak(phrase);}
root.innerHTML=`
<section class="hub-panel" id="hub-diagnose" role="tabpanel">
 <div class="hub-card"><h3>1 · Offline leaf inspection</h3><p>Frame a <b>single leaf</b> in bright, indirect light; fill the frame, focus sharply and include both healthy and affected areas if possible.</p><span class="hub-chip warning" id="model-status">Disease AI: model not bundled</span><label for="scan-file">Capture / upload a leaf photo</label><input id="scan-file" accept="image/*" type="file" capture="environment"><img id="scan-preview" class="hub-leaf-preview" alt="Selected leaf photograph" hidden><button class="primary" id="scan-btn" type="button">Check photo &amp; save offline scan</button><div id="scan-status" class="hub-message" role="status">No scan yet. Quality checking runs on this phone; no diagnosis confidence is invented.</div><p class="source-note">A real offline ONNX/TFLite classifier requires trained crop-specific weights, evaluation and bundled runtime. This release does not include one. Photo analysis here checks quality, not disease.</p><div class="hub-voice"><button id="speak-scan" type="button">🔊 Read guidance</button><button id="open-scans" type="button">▤ Scan history</button></div></div>
 <div class="hub-card"><h3>2 · Offline treatment &amp; chemical options</h3><p>Use this only <b>after</b> the observed condition has been verified. A visual sign alone is not a confirmed diagnosis.</p><label>Suspected condition<select id="condition">${renderDiseaseChoices()}</select></label><label>Crop stage<select id="crop-stage"><option value="seedling">Seedling</option><option value="vegetative" selected>Vegetative</option><option value="flowering">Flowering</option><option value="harvest">Near harvest</option></select></label><button id="guide-btn" type="button">Show treatment &amp; chemical options</button><div class="hub-message" id="treatment-guide" role="status">Select a condition to review its locally saved knowledge guide.</div><label class="toggle-label"><input type="checkbox" id="correct-consent"> I confirmed the diagnosis with an agriculture officer or lab</label><button id="confirm-condition" type="button">Save diagnosis correction</button><div class="hub-message" id="condition-status">No confirmed result saved.</div><p class="source-note">Never infer chemical dosage or pre-harvest interval from a photo. Follow the locally approved product label for dose, PPE, mixing and the crop-specific PHI. Kisan Call Centre: <a href="tel:18001801551">1800-180-1551</a>.</p></div>
</section>
<section class="hub-panel" id="hub-markets" role="tabpanel" hidden>
 <div class="hub-card"><h3>3 · Mandi net-return calculator</h3><p>Compare offers by <b>net ₹/kg</b> after transport and commission. All manual prices remain available offline.</p><div class="hub-grid"><label>Market name<input id="quote-market" required maxlength="65" placeholder="Market name"></label><label>Crop<input id="quote-crop" placeholder="Selected crop"></label><label>Wholesale price (₹/kg)<input id="quote-price" type="number" min=".01" step=".01"></label><label>Distance (km)<input id="quote-distance" type="number" min="0" step=".1" value="0"></label><label>Transport cost (₹/kg)<input id="quote-transport" type="number" min="0" step=".01" value="0"></label><label>Commission (₹/kg)<input id="quote-commission" type="number" min="0" step=".01" value="0"></label><label>Nearby search radius (km)<input id="quote-radius" type="number" min="1" max="500" value="100"></label><label>Alert if price ≥ (₹/kg)<input id="price-alert" type="number" min="0" step=".01" placeholder="Optional"></label></div><button class="primary" id="save-quote" type="button">Save and compare offer</button><div class="hub-message" id="market-status">Price inputs are user supplied; no current government rates loaded.</div></div>
 <div class="hub-card"><h3>Government mandi feed</h3><p>AGMARKNET / data.gov.in modal wholesale prices. An API key must be configured on Vercel, never in the web page.</p><div class="hub-grid"><label>Commodity<input id="gov-commodity" placeholder="Tomato / Onion / Cabbage"></label><label>State<input id="gov-state" value="Tamil Nadu"></label><label>District (optional)<input id="gov-district" placeholder="Your district"></label><label>History window<select id="quote-window"><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label></div><button id="load-mandis" type="button">Fetch government prices (online)</button><div class="hub-message" id="gov-status">Not connected. Cached results are reused when available.</div><canvas class="hub-chart" id="market-chart" aria-label="Chart of locally recorded market quotes"></canvas><p class="source-note">An official quote may not be physically near your farm. Distance must be verified; dates, source and price units are shown.</p></div>
 <div class="hub-card hub-full"><h3>Offers ranked by net return</h3><div id="market-results" class="hub-scroll" aria-live="polite">No quotes yet.</div></div>
</section>
<section class="hub-panel" id="hub-weather" role="tabpanel" hidden>
 <div class="hub-card"><h3>4 · Local forecast & climate risk</h3><p>Enter coordinates or choose to share your location. Network forecasts use Open-Meteo and the last saved response remains available offline.</p><div class="hub-grid"><label>Latitude<input id="weather-lat" type="number" min="-90" max="90" step=".0001" placeholder="e.g. 11.12"></label><label>Longitude<input id="weather-lon" type="number" min="-180" max="180" step=".0001" placeholder="e.g. 78.16"></label></div><label class="toggle-label"><input type="checkbox" id="location-allow"> Include GPS coordinates in new offline scan records (optional)</label><div class="hub-inline"><button id="use-location" type="button">📍 Use location once</button><button id="fetch-weather" type="button">☁ Refresh forecast</button></div><p class="source-note">Never fetches location automatically. A cached forecast is not a live storm-warning service.</p><div class="hub-message" id="weather-status">Enter coordinates to load the forecast.</div></div>
 <div class="hub-card"><h3>Risk & fieldwork recommendations</h3><div id="weather-advice" class="hub-list" aria-live="polite">No forecast saved.</div><div class="hub-voice"><button id="speak-weather" type="button">🔊 Read weather advice</button><button id="show-cached" type="button">Show saved forecast</button></div><p class="source-note">Browser-only warnings: forecasts and risk advice appear here when the app is open. Saved forecasts remain viewable offline with a stale-data warning.</p></div>
</section>
<section class="hub-panel" id="hub-records" role="tabpanel" hidden>
 <div class="hub-card"><h3>5 · Your offline scan history</h3><p>Photos and scan records are stored in this browser using IndexedDB. They remain on your device unless you explicitly export or enable future sync.</p><div class="hub-inline"><button id="refresh-scans" type="button">Refresh records</button><button id="export-scans" type="button">Export records JSON</button></div><div id="scan-records" class="hub-list">No scans yet.</div></div>
 <div class="hub-card"><h3>Pending sync & feedback</h3><p>New scans are queued offline. Upload remains disabled until a private server and consent model are configured; no photographs are sent to a demo endpoint.</p><button id="try-sync" type="button">Check sync availability</button><div id="sync-status" class="hub-message">Local queue active · no remote sync destination configured.</div><h3>Did the advice help?</h3><label>Result<select id="feedback-choice"><option value="helped">Helpful</option><option value="not_helpful">Not helpful</option><option value="uncertain">Not sure</option></select></label><label>Notes (optional)<textarea id="feedback-note" rows="3" maxlength="500" placeholder="What happened afterward?"></textarea></label><button id="save-feedback" type="button">Save feedback privately</button><div id="feedback-status" class="hub-message">Your corrections never retrain an AI model automatically.</div></div>
</section>
<section class="hub-panel" id="hub-profile" role="tabpanel" hidden>
 <div class="hub-card"><h3>6 · Farmer profile</h3><p>Stored on this device and used only for local recommendations.</p><label>Preferred language<select id="farmer-language">${Object.entries(voices).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><div class="hub-grid"><label>Farm size (acres)<input id="farmer-acres" type="number" min="0.01" step=".01" value="1"></label><label>District<input id="farmer-district" placeholder="District"></label><label>State<input id="farmer-state" placeholder="State"></label><label>Main crop<input id="farmer-crop" placeholder="Crop type"></label></div><label class="toggle-label"><input type="checkbox" id="sync-consent"> I consent to sync my future scans if a private service is configured</label><button class="primary" id="save-profile" type="button">Save local profile</button><div class="hub-message" id="profile-status">No remote account required.</div></div>
 <div class="hub-card"><h3>7 · Safety, trust & help</h3><p>Automated analysis may be wrong. A photo, confidence score or visual symptom does not prove a diagnosis. In this release, model-based classification is not enabled.</p><details open><summary>Crop treatment safety</summary><p>Wear label-required PPE. Never mix products unless the approved label permits it. Follow restricted-entry intervals and pre-harvest waiting periods. Consult local registration and product labels for any dosage.</p></details><details><summary>Farmer support</summary><p>Government Kisan Call Centre: <a href="tel:18001801551">1800-180-1551</a>. Agricultural officers can confirm crop-specific advice in local languages.</p></details><details><summary>Voice and offline limitations</summary><p>Speech playback uses built-in voices when available. Voice dictation may need internet depending on Android/browser. SQLite is not included: IndexedDB is used for browser offline records.</p></details><details><summary>Privacy</summary><p>Geolocation is permission-based. No hidden tracking or automatic photo upload. Deleting browser site data deletes local records.</p></details><div class="hub-voice"><button id="say-help" type="button">🔊 Read safety advice</button><button id="voice-dictation" type="button">🎙 Dictate district</button></div></div>
</section>`;
function changeTab(tab){
 for(const b of E('hub-tabs').querySelectorAll('button'))b.setAttribute('aria-selected',String(b.dataset.hub===tab));
 for(const panel of root.querySelectorAll('.hub-panel'))panel.hidden=panel.id!=='hub-'+tab;
 if(tab==='records')renderScans();if(tab==='markets')renderMarkets();
}
E('hub-tabs').addEventListener('click',event=>{const b=event.target.closest('[data-hub]');if(b)changeTab(b.dataset.hub);});
E('open-scans').onclick=()=>{changeTab('records');E('farmer-tools').scrollIntoView({behavior:'smooth',block:'start'});};
function onCrop(event){activeCrop=event.detail.index;const name=cropName();E('quote-crop').value=name;E('gov-commodity').value=({8:'Onion',9:'Potato',10:'Cabbage',11:'Wheat',12:'Maize',13:'Tomato',6:'Tomato',7:'Cucumber'}[activeCrop]||name);profile.crop=name;E('farmer-crop').value=name;}
window.addEventListener('verdant:crop',onCrop);
window.VerdantIntel={selectCrop:i=>onCrop({detail:{index:i}}),open:changeTab};
window.VerdantIntel.selectCrop(activeCrop);
function setPhoto(file){if(currentPhoto?.url)URL.revokeObjectURL(currentPhoto.url);currentPhoto=file?{file,url:URL.createObjectURL(file)}:null;E('scan-preview').hidden=!file;if(file)E('scan-preview').src=currentPhoto.url;}
E('scan-file').addEventListener('change',e=>{const f=e.target.files?.[0];if(f && /^image\//.test(f.type)&&f.size<=10*1024*1024){setPhoto(f);notify('scan-status','Image selected. Check photo framing and quality before storing.');}else{setPhoto(null);notify('scan-status','Select one photo below 10 MB.',true);}});
async function qualityTest(file){
 const image=await createImageBitmap(file);const side=120,canvas=document.createElement('canvas');canvas.width=side;canvas.height=side;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,side,side);image.close?.();
 const {data}=ctx.getImageData(0,0,side,side);let sum=0,sumsq=0,edge=0,count=0;
 for(let y=0;y<side;y+=2)for(let x=0;x<side;x+=2){const k=4*(y*side+x),g=.21*data[k]+.72*data[k+1]+.07*data[k+2];sum+=g;sumsq+=g*g;count++;if(x<side-2){const j=k+8,other=.21*data[j]+.72*data[j+1]+.07*data[j+2];edge+=Math.abs(g-other);}}
 const mean=sum/count,variance=sumsq/count-mean*mean,detail=edge/count;
 return {mean,variance,detail,good:mean>45&&mean<226&&variance>140&&detail>3.8};
}
E('scan-btn').onclick=async()=>{
 if(!currentPhoto){notify('scan-status','Choose a clear leaf photograph first.',true);return;}
 try{
  const q=await qualityTest(currentPhoto.file);const id=(crypto.randomUUID?crypto.randomUUID():String(Date.now())),saved={id,createdAt:now(),crop:cropName(),cropIndex:activeCrop,quality:q,diagnosis:null,confidence:null,location:profile.consentLocation&&coords?{lat:coords.lat,lon:coords.lon}:null,photo:currentPhoto.file};
  await record('scans',saved);await record('sync',{id,createdAt:saved.createdAt,status:'pending-local-only'});currentScan=id;
  notify('scan-status',(q.good?phrases[profile.language].clear:phrases[profile.language].retake)+'\nScan recorded locally. No disease or confidence score assigned.',!q.good);
  E('condition-status').textContent='Unverified photo saved · diagnosis pending review.';
 }catch(error){notify('scan-status','Could not save photo locally: '+error.message,true);}
};
E('speak-scan').onclick=()=>speak(E('scan-status').textContent+' '+phrases[profile.language].wait);
E('guide-btn').onclick=()=>{
 const d=fromId(E('condition').value),near=E('crop-stage').value==='harvest';
 notify('treatment-guide',`${d.name} · ${d.type}\nSigns to confirm: ${d.symptoms}.\nNow: ${d.action}\nNon-chemical approach: ${d.organic}\nBrowser chemical reference: ${chemicalAdvice(d.id,near)}\nNext season: ${d.prevent}\n${near?'⚠ NEAR HARVEST: Do not spray without checking the exact crop/product pre-harvest interval (PHI).':'Observe all label-specified PPE, crop stage, application timing and PHI.'}\nNever mix chemicals without label instructions. This is a library lookup, not an AI diagnosis.`,near);
};
E('confirm-condition').onclick=async()=>{
 if(!E('correct-consent').checked){notify('condition-status','Confirm with an agricultural officer or lab first. No unverified diagnosis is marked confirmed.',true);return;}
 if(!currentScan){notify('condition-status','Save a photo scan before attaching a correction.',true);return;}
 const correction={id:crypto.randomUUID(),scanId:currentScan,condition:E('condition').value,crop:cropName(),at:now(),source:'Farmer reported professional confirmation'};
 await record('feedback',correction);notify('condition-status','Correction stored locally. This does not automatically retrain any model.');
};
// Offline price records; live government quotes are visibly tagged and not treated as verified proximity.
async function renderMarkets(){
 try{
 const rows=(await all('quotes')).filter(r=>r.crop.toLowerCase()===E('quote-crop').value.trim().toLowerCase());
 const limit=safeNumber(E('quote-radius').value,100),visible=rows.filter(r=>r.distance===null||r.distance<=limit).sort((a,b)=>b.net-a.net);
 const host=E('market-results');host.replaceChildren();
 if(!visible.length){host.textContent='No saved offers for this crop and radius. Add a manual quote, or configure the official source.';}
 else {
   const table=document.createElement('table');table.className='hub-table';
   table.innerHTML='<thead><tr><th>Market</th><th>Date / source</th><th>Price</th><th>Transport + fees</th><th>Net return</th><th>Distance</th></tr></thead>';
   const tbody=document.createElement('tbody');
   for(const [i,r] of visible.entries()){
     const tr=document.createElement('tr');const cols=[(i===0?'★ ':'')+r.market,r.date+' · '+r.source,money(r.price)+'/kg',money(r.transport+r.commission)+'/kg',money(r.net)+'/kg',r.distance===null?'Not checked':r.distance+' km'];
     for(const val of cols){const td=document.createElement('td');td.textContent=val;tr.append(td);}tbody.append(tr);
   }table.append(tbody);host.append(table);
 }
 drawPriceHistory(rows);
 }catch(err){notify('market-status','Local market database error: '+err.message,true);}
}
function drawPriceHistory(rows){
 const canvas=E('market-chart'),rect=canvas.getBoundingClientRect(),w=Math.max(250,Math.round(rect.width||350)),h=160;canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d'),days=safeNumber(E('quote-window').value,7),cutoff=Date.now()-days*86400000;
 const data=rows.filter(r=>new Date(r.createdAt).getTime()>=cutoff).sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
 ctx.fillStyle='#143632';ctx.fillRect(0,0,w,h);ctx.fillStyle='#c3dfd4';ctx.font='13px system-ui';
 if(data.length<2){ctx.fillText('Add at least 2 dated quotes for a '+days+'-day trend',12,80);return;}
 const prices=data.map(r=>r.net),lo=Math.min(...prices),hi=Math.max(...prices),span=Math.max(.5,hi-lo);ctx.strokeStyle='#66ffc0';ctx.lineWidth=2.5;ctx.beginPath();
 data.forEach((r,i)=>{const x=22+i*(w-44)/(data.length-1),y=h-25-(r.net-lo)/span*(h-48);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();ctx.fillText(money(hi),8,16);ctx.fillText(money(lo),8,h-7);
}
E('save-quote').onclick=async()=>{
 const market=E('quote-market').value.trim(),crop=E('quote-crop').value.trim(),price=+E('quote-price').value,transport=+E('quote-transport').value,commission=+E('quote-commission').value,distance=+E('quote-distance').value;
 if(!market||!crop||price<=0||[transport,commission,distance].some(v=>!Number.isFinite(v)||v<0)){notify('market-status','Enter a market, crop, valid price, distance, and nonnegative costs.',true);return;}
 const quote={id:crypto.randomUUID(),createdAt:now(),date:new Date().toLocaleDateString('en-IN'),source:'Manual / user-entered',market,crop,price,transport,commission,distance,net:price-transport-commission};
 await record('quotes',quote);const threshold=+E('price-alert').value;
 notify('market-status','Manual quote saved · net = price − transport − commission'+(E('price-alert').value!==''&&price>=threshold?' · ⚠ Your price threshold has been reached (while app is open).':''));renderMarkets();
};
E('quote-window').onchange=renderMarkets;E('quote-radius').oninput=renderMarkets;E('quote-crop').onchange=renderMarkets;
E('load-mandis').onclick=async()=>{
 const commodity=E('gov-commodity').value.trim(),state=E('gov-state').value.trim(),district=E('gov-district').value.trim();
 if(!commodity||!state){notify('gov-status','Enter commodity and state.',true);return;}
 if(!navigator.onLine){notify('gov-status','Offline: cannot refresh government quotes. Previously saved quotes remain on this device.',true);return;}
 notify('gov-status','Requesting official government prices…');
 try{
  const qs=new URLSearchParams({commodity,state,district});const response=await fetch('/api/mandi?'+qs,{cache:'no-store'}),body=await response.json();
  if(!response.ok)throw new Error(body.error||'Server unavailable');
  for(const r of body.rows||[]){const id='gov|'+[r.market,r.date,r.commodity].join('|');await record('quotes',{id,createdAt:now(),date:r.date,source:r.source,market:r.market, crop:commodity,price:r.priceKg,transport:0,commission:0,distance:null,net:r.priceKg});}
  notify('gov-status',`Saved ${body.rows.length} government quotes · ${new Date(body.receivedAt).toLocaleString('en-IN')}. Proximity and deductions NOT verified; enter local costs.`);
  E('quote-crop').value=commodity;renderMarkets();
 }catch(error){notify('gov-status','No live quote: '+error.message+' · Manual comparison still works.',true);}
};
// Weather observations never fabricate live data; one user-initiated Open-Meteo request.
function forecastRisks(data){
 const hr=data.hourly||{},times=hr.time||[],temps=hr.temperature_2m||[],precip=hr.precipitation||[],gusts=hr.wind_gusts_10m||[],nowMs=Date.now(),next=[];
 for(let i=0;i<times.length;i++){const ms=new Date(times[i]+'Z').getTime();if(ms<nowMs-3600000||ms>nowMs+48*3600000)continue;next.push({when:times[i],temp:temps[i],rain:precip[i],wind:gusts[i]});}
 const maxTemp=Math.max(...next.map(x=>safeNumber(x.temp,-100))),minTemp=Math.min(...next.map(x=>safeNumber(x.temp,100)));
 const rain24=next.slice(0,24).reduce((s,x)=>s+safeNumber(x.rain),0),peakGust=Math.max(...next.map(x=>safeNumber(x.wind)));
 const advice=[];
 if(rain24>=2)advice.push({level:'warning',title:`Rain expected · ${rain24.toFixed(1)} mm over ~24 h`,detail:'Avoid planning field spraying immediately before rain. Follow the product label rainfastness interval and local adviser guidance.'});
 if(maxTemp>=35)advice.push({level:'warning',title:`Heat stress risk · up to ${maxTemp.toFixed(1)} °C`,detail:'Monitor hydration, shade, reservoir temperature and harvest windows; minimize extreme midday fieldwork.'});
 if(minTemp<=3)advice.push({level:'warning',title:`Frost/cold risk · down to ${minTemp.toFixed(1)} °C`,detail:'Inspect sensitive seedlings and consider locally appropriate protected cultivation.'});
 if(peakGust>=55)advice.push({level:'warning',title:`Strong wind risk · gusts ${peakGust.toFixed(0)} km/h`,detail:'Secure loose covers and postpone risky spraying or exposed work.'});
 if(!advice.length)advice.push({level:'normal',title:'No high-threshold event in current 48 h forecast',detail:'Forecasts can change. Check local weather warnings and field conditions before decisions.'});
 return {next,advice};
}
function renderWeather(data,stale){
 const risks=forecastRisks(data),host=E('weather-advice');host.replaceChildren();
 for(const item of risks.advice){const div=document.createElement('div');div.className='hub-result';const strong=document.createElement('strong');strong.textContent=(item.level==='warning'?'⚠ ':'✓ ')+item.title;const p=document.createElement('p');p.textContent=item.detail;div.append(strong,p);host.append(div);}
 const fetched=data.fetchedAt||now();notify('weather-status',(stale?'CACHED / may be outdated · ':'Forecast fetched · ')+new Date(fetched).toLocaleString('en-IN')+(stale?' · do not use for current severe weather':' · Open-Meteo / model forecast'),stale);
}
E('fetch-weather').onclick=async()=>{
 const lat=+E('weather-lat').value,lon=+E('weather-lon').value;
 if(!E('weather-lat').value||!E('weather-lon').value||Math.abs(lat)>90||Math.abs(lon)>180){notify('weather-status','Enter valid latitude and longitude, or use the location button.',true);return;}
 if(!navigator.onLine){notify('weather-status','Offline. Showing last cached forecast if available.',true);return E('show-cached').click();}
 const qs=new URLSearchParams({latitude:String(lat),longitude:String(lon),hourly:'temperature_2m,precipitation,wind_gusts_10m',forecast_days:'3',timezone:'GMT'});
 notify('weather-status','Loading Open-Meteo forecast…');
 try{
  const res=await fetch('https://api.open-meteo.com/v1/forecast?'+qs);if(!res.ok)throw new Error('Forecast HTTP '+res.status);
  const data=await res.json();data.fetchedAt=now();await record('cache',{id:'weather',value:data});renderWeather(data,false);
 }catch(error){notify('weather-status','Could not retrieve live weather: '+error.message,true);}
};
E('show-cached').onclick=async()=>{const cached=await readCache('weather');if(cached)renderWeather(cached,true);else notify('weather-status','No forecast cached yet.',true);};
E('use-location').onclick=()=>{
 if(!navigator.geolocation){notify('weather-status','Device geolocation unavailable.',true);return;}
 navigator.geolocation.getCurrentPosition(pos=>{coords={lat:pos.coords.latitude,lon:pos.coords.longitude};E('weather-lat').value=coords.lat.toFixed(5);E('weather-lon').value=coords.lon.toFixed(5);notify('weather-status','Location filled for this session. GPS is not saved unless opted in.');},err=>notify('weather-status','Location request denied or unavailable: '+err.message,true),{enableHighAccuracy:false,timeout:9000});
};
E('location-allow').onchange=e=>profile.consentLocation=e.target.checked;
E('speak-weather').onclick=()=>speak(E('weather-advice').textContent);
// Records, queue, export and feedback.
async function renderScans(){
 const host=E('scan-records');host.replaceChildren();try{
  const scans=(await all('scans')).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  if(!scans.length){host.textContent='No saved scans. Take a photo under Leaf scan.';return;}
  for(const scan of scans.slice(0,50)){
   const row=document.createElement('div');row.className='hub-result';
   const title=document.createElement('strong');title.textContent=scan.crop+' · '+new Date(scan.createdAt).toLocaleString('en-IN');
   const p=document.createElement('small');p.textContent='Photo quality: '+(scan.quality.good?'checked':'retake suggested')+' · Diagnosis: not assigned · '+(scan.location?'GPS shared':'No location');
   const btn=document.createElement('button');btn.textContent='View this photo';btn.onclick=()=>{const url=URL.createObjectURL(scan.photo),img=new Image();img.src=url;img.alt='Saved '+scan.crop+' leaf';img.style.cssText='max-width:100%;max-height:230px;object-fit:contain;';img.onload=()=>URL.revokeObjectURL(url);row.append(img);btn.disabled=true;};
   row.append(title,p,btn);host.append(row);
  }
 }catch(err){host.textContent='Could not load offline records: '+err.message;}
}
E('refresh-scans').onclick=renderScans;
E('export-scans').onclick=async()=>{
 try{const scans=(await all('scans')).map(({photo,...item})=>({...item,photo:{name:photo?.name||'leaf.jpg',size:photo?.size||0}})),feedback=await all('feedback');const blob=new Blob([JSON.stringify({scans,feedback,exportedAt:now()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='verdant-private-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}catch(error){notify('sync-status',error.message,true);}
};
E('try-sync').onclick=async()=>{const items=await all('sync');notify('sync-status',`${items.length} pending local record(s). No remote sync is configured; nothing uploaded. Contact app administrator to enable a secure server before sharing photographs.`,items.length>0);};
E('save-feedback').onclick=async()=>{const entry={id:crypto.randomUUID(),scanId:currentScan||null,crop:cropName(),outcome:E('feedback-choice').value,note:E('feedback-note').value.trim(),createdAt:now()};await record('feedback',entry);E('feedback-note').value='';notify('feedback-status','Private feedback saved on this device. No AI retraining has occurred.');};
E('save-profile').onclick=async()=>{
 profile={...profile,language:E('farmer-language').value,farmSize:Math.max(.01,+E('farmer-acres').value||1),district:E('farmer-district').value.trim(),state:E('farmer-state').value.trim(),crop:E('farmer-crop').value.trim(),cropStage:E('crop-stage').value,consentSync:E('sync-consent').checked};
 try{await record('cache',{id:'profile',value:profile});notify('profile-status','Farmer profile saved offline. Location and photo sharing remain opt-in.');}catch(err){notify('profile-status','Cannot save local profile: '+err.message,true);}
};
E('say-help').onclick=()=>speak('Before treatment, contact an agricultural officer. Follow the registered product label, wear protective equipment and observe pre-harvest intervals. Kisan Call Centre 1800 180 1551.');
E('voice-dictation').onclick=()=>{
 const API=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!API){notify('profile-status','Voice dictation unavailable on this browser; type the district instead.',true);return;}
 const recog=new API();recog.lang=profile.language;recog.interimResults=false;recog.onresult=event=>{E('farmer-district').value=event.results[0][0].transcript;notify('profile-status','District transcribed. Review spelling before saving.');};recog.onerror=()=>notify('profile-status','Dictation not available, possibly offline. Use typing.',true);recog.start();
};
async function startup(){
 updateConnection();
 try{const saved=await readCache('profile');if(saved)profile={...profile,...saved};}catch(err){console.warn('Offline record store unavailable:',err);}
 E('farmer-language').value=profile.language;E('farmer-acres').value=profile.farmSize;E('farmer-district').value=profile.district;E('farmer-state').value=profile.state;E('farmer-crop').value=profile.crop;E('gov-state').value=profile.state||'Tamil Nadu';E('gov-district').value=profile.district;E('sync-consent').checked=profile.consentSync;E('location-allow').checked=profile.consentLocation;E('crop-stage').value=profile.cropStage;
 try{const cached=await readCache('weather');if(cached)renderWeather(cached,true);}catch{}
 if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  try{await navigator.serviceWorker.register('./sw.js');}catch(err){console.warn('Offline cache worker could not be installed',err);}
 }
}
window.addEventListener('online',updateConnection);window.addEventListener('offline',updateConnection);startup();
})();
