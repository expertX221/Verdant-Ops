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
 'en-IN':{retake:'Photo may be too dark or blurry. Retake in daylight, hold steady, and fill the frame with one leaf.',clear:'Photo quality passed. Running on-device disease assessment.',wait:'A qualified agriculture officer should confirm the cause before treatment.'},
 'ta-IN':{retake:'படம் தெளிவாக இல்லை. நல்ல வெளிச்சத்தில் இலையை மீண்டும் படம் எடுக்கவும்.',clear:'படத் தரம் சரியாக உள்ளது. AI மதிப்பீடு இயங்குகிறது.',wait:'சிகிச்சைக்கு முன் வேளாண் அலுவலரின் ஆலோசனை பெறவும்.'},
 'hi-IN':{retake:'फ़ोटो धुंधली या अंधेरी है। दिन के उजाले में एक पत्ती की साफ़ तस्वीर दोबारा लें।',clear:'Photo quality check completed.',wait:'उपचार करने से पहले कृषि अधिकारी से पुष्टि करवाएँ।'}
};
const diseases=[
 {id:'healthy',name:'Healthy appearance',type:'healthy',symptoms:'No visible lesions or significant insect damage',action:'Keep monitoring leaf undersides and new growth.',organic:'Maintain airflow, correct watering, and clean tools.',chemical:'None advised without a confirmed pest or disease.',prevent:'Monitor weekly; follow crop rotation and sanitation.'},
 {id:'powdery',name:'Powdery mildew / mould',type:'diseased',symptoms:'White powder-like patches that spread on foliage',action:'Separate suspect foliage, reduce crowding, improve ventilation; ask an adviser to distinguish mildew from residue.',organic:'Remove heavily affected leaves where agronomically appropriate; improve airflow and avoid wetting foliage.',chemical:'Only a locally registered fungicide explicitly labelled for this crop and confirmed disease, at the label rate and timing.',prevent:'Select tolerant varieties; limit overhead watering and dense canopies.'},
 {id:'blight',name:'Early or late blight',type:'diseased',symptoms:'Dark spreading lesions on leaves, often after damp conditions',action:'Photograph multiple leaves, keep foliage dry, and have the specific pathogen confirmed.',organic:'Remove infected residues with clean tools and improve field drainage.',chemical:'Ask an officer for a crop-specific registered fungicide and label directions; early and late blight can need different controls.',prevent:'Rotate away from susceptible hosts; use healthy planting material.'},
 {id:'rust',name:'Rust',type:'diseased',symptoms:'Orange, yellow or brown pustules, often on leaf undersides',action:'Check multiple leaves and request confirmation, since nutrient injury can be confused with rust.',organic:'Remove infected debris and reduce leaf wetness.',chemical:'Only registered crop-specific fungicides after confirmation and PHI review.',prevent:'Resistant varieties and rotation where available.'},
 {id:'spot',name:'Leaf spot',type:'diseased',symptoms:'Distinct dark spots with yellow halos or merging lesions',action:'Check irrigation and nutrition; request lab or officer review for fungal vs bacterial cause.',organic:'Remove contaminated debris and sanitize tools; improve spacing.',chemical:'Avoid blanket pesticides until an agent is identified and the crop label permits treatment.',prevent:'Use clean seed and monitor humidity.'},
 {id:'wilt',name:'Bacterial or vascular wilt',type:'diseased',symptoms:'Sudden wilt, sometimes despite moist soil',action:'Check roots and soil moisture first; keep suspect material separate and obtain diagnostic confirmation.',organic:'Do not move infected soil or tools to clean beds.',chemical:'Do not assume fungicides cure bacterial or vascular wilt; seek official guidance.',prevent:'Plant resistant varieties and rotate susceptible crops.'},
 {id:'virus',name:'Suspected viral disease',type:'diseased',symptoms:'Mosaic patterns, unusual curling, streaks or stunting; other causes can look similar',action:'Check for insect vectors and obtain professional confirmation; isolate symptomatic plants if advised.',organic:'Use certified clean planting stock, insect-vector prevention and clean tools. Viruses generally cannot be cured by a spray.',chemical:'No chemical cures a plant virus. Do not recommend fungicides for viral symptoms.',prevent:'Choose locally recommended resistant varieties and maintain sanitation.'},
 {id:'pests',name:'Pest damage',type:'pest-damaged',symptoms:'Holes, webs, chewing, honeydew or visible insects',action:'Photograph both sides of leaves and identify the pest before control.',organic:'Scout leaves, remove pests manually when practical, and protect beneficial insects.',chemical:'Use only labelled, crop- and pest-specific products when warranted; follow all safety and waiting periods.',prevent:'Frequent scouting and integrated pest management.'}
];
// Examples are ingredient names for professional discussion, not application instructions.
// India: choose only currently CIB&RC-registered formulations whose label covers
// the exact crop + diagnosed problem; the formulation label sets dose, PHI and PPE.
const chemicalReference={
 healthy: {examples:[],caution:'Do not apply a pesticide to a healthy crop.'},
 virus:{examples:[],caution:'No pesticide cures a viral infection. Identify the actual disease and any transmitting insect before action.'},
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
 <div class="hub-card"><h3>1 · Offline leaf inspection</h3><p>Frame a <b>single leaf</b> in bright, indirect light; fill the frame, focus sharply and include both healthy and affected areas if possible.</p><span class="hub-chip warning" id="model-status">Image analysis ready to set up · internet needed first time</span><label for="scan-crop">Crop in the uploaded photo (optional)<select id="scan-crop"><option value="auto">Auto-detect crop</option><option value="Apple">Apple</option><option value="Blueberry">Blueberry</option><option value="Cherry">Cherry</option><option value="Corn">Corn / maize</option><option value="Grape">Grape</option><option value="Orange">Orange / citrus</option><option value="Peach">Peach</option><option value="Pepper">Bell pepper</option><option value="Potato">Potato</option><option value="Raspberry">Raspberry</option><option value="Soybean">Soybean</option><option value="Squash">Squash</option><option value="Strawberry">Strawberry</option><option value="Tomato">Tomato</option></select></label><label for="scan-file">Capture / upload a leaf photo</label><input id="scan-file" accept="image/*" type="file" capture="environment"><img id="scan-preview" class="hub-leaf-preview" alt="Selected leaf photograph" hidden><div class="hub-inline"><button class="primary" id="scan-btn" type="button">🔎 Identify disease with AI</button><button id="prepare-ai" type="button">↓ Prepare AI for offline use</button></div><div class="hub-predictions" id="scan-predictions" aria-live="polite"></div><div id="scan-status" class="hub-message" role="status">Upload a leaf photo to identify a likely disease and see suggested next steps. Results are estimates, not confirmed diagnoses.</div><p class="source-note">Results are suggestions, not confirmed diagnoses. Check the crop and symptoms before following treatment advice. <a href="./repair.html">Fix image analysis / refresh app</a></p><details class="hub-selfcheck"><summary>Guided visual symptom check · works offline</summary><p>Choose what you observe on the plant. This is a <b>manual reference</b>, not a photo classifier or a confirmed diagnosis.</p><label>Visible sign<select id="visual-sign"><option value="">Choose an observation</option><option value="white">White powder on leaf</option><option value="rust">Orange or brown raised spots</option><option value="dark">Dark spreading spots / lesions</option><option value="wilting">Whole plant wilting</option><option value="pests">Holes, webs, insects or sticky residue</option><option value="yellow">Yellowing / pale leaves</option><option value="clear">No visible symptoms</option></select></label><label>Where is it seen?<select id="visual-area"><option value="unknown">Not checked</option><option value="older">Mostly older leaves</option><option value="new">Mostly new leaves</option><option value="whole">Whole plant / many leaves</option></select></label><button id="review-signs" type="button">Review possible causes and next steps</button><div id="visual-guidance" class="hub-message" role="status">Select an observed sign first. No automated confidence or pesticide dose will be generated.</div></details><div class="hub-voice"><button id="speak-scan" type="button">🔊 Read guidance</button><button id="open-scans" type="button">▤ Scan history</button></div></div>
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
 <div class="hub-card"><h3>5 · Your offline scan history</h3><p>Photos and scan records are stored in this browser using IndexedDB. They remain on your device unless you explicitly export or enable future sync.</p><div class="hub-inline"><button id="refresh-scans" type="button">Refresh records</button><button id="export-scans" type="button">Export records JSON</button><button id="backup-scans" type="button">Backup photos + records</button></div><label>Restore a previous local backup (JSON)<input id="import-backup" type="file" accept="application/json,.json"></label><div id="backup-status" class="hub-message" role="status">Backup files stay on your device. Import merges records by ID; no server upload.</div><div id="scan-records" class="hub-list">No scans yet.</div></div>
 <div class="hub-card"><h3>Pending sync & feedback</h3><p>New scans are queued offline. Upload remains disabled until a private server and consent model are configured; no photographs are sent to a demo endpoint.</p><button id="try-sync" type="button">Check sync availability</button><div id="sync-status" class="hub-message">Local queue active · no remote sync destination configured.</div><h3>Did the advice help?</h3><label>Result<select id="feedback-choice"><option value="helped">Helpful</option><option value="not_helpful">Not helpful</option><option value="uncertain">Not sure</option></select></label><label>Notes (optional)<textarea id="feedback-note" rows="3" maxlength="500" placeholder="What happened afterward?"></textarea></label><button id="save-feedback" type="button">Save feedback privately</button><div id="feedback-status" class="hub-message">Your corrections never retrain an AI model automatically.</div></div>
</section>
<section class="hub-panel" id="hub-profile" role="tabpanel" hidden>
 <div class="hub-card"><h3>6 · Farmer profile</h3><p>Stored on this device and used only for local recommendations.</p><label>Preferred language<select id="farmer-language">${Object.entries(voices).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><div class="hub-grid"><label>Farm size (acres)<input id="farmer-acres" type="number" min="0.01" step=".01" value="1"></label><label>District<input id="farmer-district" placeholder="District"></label><label>State<input id="farmer-state" placeholder="State"></label><label>Main crop<input id="farmer-crop" placeholder="Crop type"></label></div><label class="toggle-label"><input type="checkbox" id="sync-consent"> I consent to sync my future scans if a private service is configured</label><button class="primary" id="save-profile" type="button">Save local profile</button><div class="hub-message" id="profile-status">No remote account required.</div></div>
 <div class="hub-card"><h3>7 · Safety, trust & help</h3><p>Automated image classification may be wrong, especially for real field photographs or crops outside the trained classes. A model score is not proof of a diagnosis. Seek agronomic confirmation before using any chemical.</p><details open><summary>Crop treatment safety</summary><p>Wear label-required PPE. Never mix products unless the approved label permits it. Follow restricted-entry intervals and pre-harvest waiting periods. Consult local registration and product labels for any dosage.</p></details><details><summary>Farmer support</summary><p>Government Kisan Call Centre: <a href="tel:18001801551">1800-180-1551</a>. Agricultural officers can confirm crop-specific advice in local languages.</p></details><details><summary>Voice and offline limitations</summary><p>Speech playback uses built-in voices when available. Voice dictation may need internet depending on Android/browser. SQLite is not included: IndexedDB is used for browser offline records.</p></details><details><summary>Privacy</summary><p>Geolocation is permission-based. No hidden tracking or automatic photo upload. Deleting browser site data deletes local records.</p></details><div class="hub-voice"><button id="say-help" type="button">🔊 Read safety advice</button><button id="voice-dictation" type="button">🎙 Dictate district</button></div></div>
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
// Free, keyless on-device image classification. The open Hugging Face ONNX model is
// downloaded on first use. Browser cache may make later offline inference possible.
// Original 3D scene/camera/renderer are deliberately not touched.
const AI_MODEL='onnx-community/mobilenet_v2_1.0_224-plant-disease-identification-ONNX';
const AI_LIBRARY='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm';
const MODEL_THRESHOLD=.60, MODEL_MARGIN=.10;
let classifierPromise=null, analyzing=false;
const AI_INFO={
 healthy:['No obvious disease found in the predicted class','Maintain watering, nutrition, airflow and weekly scouting. Check both leaf surfaces.'],
 blight:['Blight-like leaf lesions','Separate badly affected residues, reduce prolonged leaf wetness, improve drainage and obtain crop-specific confirmation.'],
 powdery:['Possible powdery mildew or leaf mould','Improve air movement, prevent prolonged humidity and remove heavily affected tissue if locally advised.'],
 rust:['Possible rust-like leaf infection','Inspect both leaf surfaces for pustules, reduce leaf wetness and remove infected debris safely.'],
 spot:['Possible leaf spot or fungal/bacterial injury','Remove infected crop debris, avoid overhead irrigation where practical and sanitize tools.'],
 virus:['Possible viral infection','Use clean planting material, inspect vectors and ask an adviser about isolation; there is no curative pesticide for a plant virus.'],
 pests:['Possible pest or mite damage','Inspect leaf undersides for actual insects, protect beneficial insects and try locally recommended integrated pest management.'],
 wilt:['Possible vascular or bacterial disease','Check roots and soil moisture, avoid moving soil or tools between beds, and seek an accurate diagnosis.']
};
function interpretClass(label){
 const full=String(label||'').replace(/^LABEL_\d+\s*[:=-]?\s*/i,'').replace(/_/g,' ').replace(/\s+/g,' ').trim();
 // This model emits human-readable labels (e.g. "Tomato with Early Blight",
 // "Healthy Apple", "Cedar Apple Rust"), not just PlantVillage ___ codes.
 const crops=['Bell Pepper','Blueberry','Raspberry','Strawberry','Cherry','Tomato','Potato','Apple','Corn','Grape','Orange','Peach','Soybean','Squash'];
 const crop=crops.find(x=>full.toLowerCase().includes(x.toLowerCase()))||'Unknown crop';
 const lower=full.toLowerCase();
 let category='spot';
 if(/healthy/.test(lower))category='healthy';
 else if(/virus|mosaic|yellow leaf curl|greening/.test(lower))category='virus';
 else if(/mite|spider/.test(lower))category='pests';
 else if(/blight/.test(lower))category='blight';
 else if(/powdery|mildew|mold|mould/.test(lower))category='powdery';
 else if(/rust/.test(lower))category='rust';
 else if(/wilt/.test(lower))category='wilt';
 // Preserve the model's exact condition wording rather than asserting diagnosis.
 return {crop,condition:full,category,label:String(label)};
}
function renderPredictions(predictions,accepted,reason){
 const host=E('scan-predictions');host.replaceChildren();
 const heading=document.createElement('strong');heading.textContent=accepted?'AI likely match (not confirmed)':'AI result uncertain';host.append(heading);
 if(reason){const note=document.createElement('p');note.textContent=reason;host.append(note);}
 predictions.forEach((pred,i)=>{
  const info=interpretClass(pred.label),card=document.createElement('div');card.className='hub-result';
  const line=document.createElement('strong');line.textContent=`${i+1}. ${info.crop} — ${info.condition}`;
  const sub=document.createElement('small');sub.textContent=`Model score: ${(pred.score*100).toFixed(1)}% (not field-tested reliability)`;
  card.append(line,sub);host.append(card);
 });
 if(accepted){const info=interpretClass(predictions[0].label),steps=AI_INFO[info.category];
  const tip=document.createElement('div');tip.className='hub-result';
  const title=document.createElement('strong');title.textContent='Suggested methods · first steps';
  const summary=document.createElement('p');summary.textContent=steps[0]+'. '+steps[1]+' Avoid choosing a chemical from this photo alone. For registered crop-specific product options, consult an agriculture officer and the treatment guide below.';
  tip.append(title,summary);host.append(tip);
 }
}
async function loadClassifier(){
 if(!classifierPromise){
  classifierPromise=(async()=>{
   E('model-status').textContent='Starting image analysis · first use requires internet…';
   const {pipeline,env}=await import(AI_LIBRARY);
   env.useBrowserCache=true;
   env.useWasmCache=true;
   // Use the full-precision ONNX graph. The q8 version uses ConvInteger,
   // which is not implemented by the browser WASM backend on some devices.
   const engine=await pipeline('image-classification',AI_MODEL,{device:'wasm',dtype:'fp32'});
   E('model-status').textContent='Image analysis ready · updated';
   E('model-status').classList.remove('warning');
   return engine;
  })().catch(error=>{
   classifierPromise=null;
   E('model-status').textContent='Image analysis unavailable · retry while online';
   E('model-status').classList.add('warning');
   throw error;
  });
 }
 return classifierPromise;
}
E('prepare-ai').onclick=async()=>{
 E('prepare-ai').disabled=true;notify('scan-status','Preparing image analysis. Internet is required for first-time setup.');
 try{await loadClassifier();notify('scan-status','Image analysis is ready. You can now upload a clear leaf photo.');}
 catch(err){console.error('Image analysis setup failure:',err);notify('scan-status','Image analysis could not start. Reload the page while online and try again. You can still use the manual symptom guide.',true);}
 finally{E('prepare-ai').disabled=false;}
};
E('scan-btn').onclick=async()=>{
 if(analyzing)return;
 if(!currentPhoto){notify('scan-status','Choose a clear crop leaf photograph first.',true);return;}
 const chosen=currentPhoto;
 analyzing=true;E('scan-btn').disabled=true;E('scan-predictions').replaceChildren();
 let q=null,predictions=[],accepted=false,reason='',errorMessage='';
 try{
  q=await qualityTest(chosen.file);
  if(!q.good)notify('scan-status','Photo appears dark, flat or blurry; analyzing anyway, but results may be unreliable.',true);
  else notify('scan-status','Checking leaf image with on-device AI…');
  const classifier=await loadClassifier();
  const raw=await classifier(chosen.url,{topk:3});
  predictions=(Array.isArray(raw)?raw:[]).filter(x=>typeof x.label==='string'&&Number.isFinite(x.score)).sort((a,b)=>b.score-a.score).slice(0,3);
  if(!predictions.length)throw Error('The model returned no supported class labels');
  const top=interpretClass(predictions[0].label),expected=E('scan-crop').value;
  const low=predictions[0].score<MODEL_THRESHOLD,close=predictions.length>1&&predictions[0].score-predictions[1].score<MODEL_MARGIN;
  const cropMismatch=expected!=='auto'&&!top.crop.toLowerCase().includes(expected.toLowerCase());
  accepted=!low&&!close&&!cropMismatch&&q.good;
  reason=cropMismatch?`Crop mismatch: you selected ${expected}, but the model suggested ${top.crop}. Verify the crop or switch to auto-detect.`:
   low?'Low model score: the image is not confidently matched to the supported conditions. Try a closer, clearer leaf photo.':
   close?'Several conditions have similar scores. The result needs more evidence.':
   !q.good?'Photo-quality check failed. Retake in better lighting before trusting a prediction.':
   'Preliminary machine-learning prediction on this photo, not an agronomic diagnosis.';
  renderPredictions(predictions,accepted,reason);
  if(accepted){
   E('condition').value=top.category;E('guide-btn').click();
   notify('scan-status',`Possible match: ${top.crop} — ${top.condition} (${(predictions[0].score*100).toFixed(1)}% model score). Read the suggested nonchemical methods and the treatment guide. Confirm with an agricultural officer before applying products.`);
  } else notify('scan-status','No reliable disease identification from this photo. '+reason,true);
 }catch(err){errorMessage=String(err?.message||err);console.error('Leaf scan failure:',err);notify('scan-status','Image analysis could not start. Reload the page while online and retry. No diagnosis was produced; the manual symptom guide remains available.',true);}
 try{
  const id=(crypto.randomUUID?crypto.randomUUID():String(Date.now())),saved={id,createdAt:now(),crop:cropName(),cropIndex:activeCrop,quality:q||{good:false},diagnosis:accepted?interpretClass(predictions[0].label):null,confidence:accepted?predictions[0].score:null,model:predictions.length?AI_MODEL:null,predictions:predictions.map(x=>({label:x.label,score:x.score})),analysisStatus:errorMessage?'failed':accepted?'tentative':'uncertain',analysisNote:reason||errorMessage,location:profile.consentLocation&&coords?{lat:coords.lat,lon:coords.lon}:null,photo:chosen.file};
  await record('scans',saved);await record('sync',{id,createdAt:saved.createdAt,status:'pending-local-only'});currentScan=id;
  E('condition-status').textContent=(accepted?'AI result saved · requires professional confirmation.':'Photo saved · no reliable diagnosis confirmed.');
 }catch(err){notify('scan-status',E('scan-status').textContent+'\nLocal save failed: '+err.message,true);}
 finally{analyzing=false;E('scan-btn').disabled=false;}
};
E('speak-scan').onclick=()=>speak(E('scan-status').textContent+' '+phrases[profile.language].wait);
const manualSigns={
 white:{possible:'Powdery mildew, spray residue or dust',next:'Check whether the powder appears on several leaves; photograph both sides and review airflow. Do not assume a fungus without confirmation.'},
 rust:{possible:'Rust, insect activity or non-infectious leaf injury',next:'Look for raised pustules on leaf undersides and photograph affected and healthy leaves separately.'},
 dark:{possible:'Fungal or bacterial leaf spot, blight or sun/chemical injury',next:'Check whether spots expand after wet weather. Compare affected leaves and document watering before any treatment decision.'},
 wilting:{possible:'Underwatering, root issues, heat stress or vascular disease',next:'Check soil or growing-medium moisture and roots first. Sudden field-wide wilt warrants prompt professional assessment.'},
 pests:{possible:'Insect or mite feeding; disease cannot be inferred from holes',next:'Inspect leaf undersides for pests or eggs, record the species if visible, and prioritize scouting and non-chemical controls.'},
 yellow:{possible:'Nutrient deficiency, watering stress, age or disease',next:'Check fertilization, soil or nutrient-solution conditions and leaf age. Yellow leaves alone do not establish an infectious disease.'},
 clear:{possible:'No conspicuous symptom observed',next:'Monitor new growth and leaf undersides. A visually clean leaf is not proof that the entire crop is healthy.'}
};
E('review-signs').onclick=()=>{
 const sign=manualSigns[E('visual-sign').value];
 if(!sign){notify('visual-guidance','Choose an observed sign first. No diagnosis has been made.',true);return;}
 const place={older:'older leaves',new:'new growth',whole:'many leaves or the whole plant',unknown:'location not checked'}[E('visual-area').value];
 notify('visual-guidance',`Observed on ${place}.\nPossible explanations (NOT a diagnosis): ${sign.possible}.\nSafe next steps: ${sign.next}\nIf symptoms spread, wilt rapidly or threaten harvest, contact an agricultural officer. Never choose a chemical solely from this observation.`);
};
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
 const limit=safeNumber(E('quote-radius').value,100);
 const verified=rows.filter(r=>Number.isFinite(r.distance)&&r.distance>=0&&r.distance<=limit).sort((a,b)=>b.net-a.net);
 const unverified=rows.filter(r=>r.distance===null).sort((a,b)=>b.price-a.price);
 const visible=[...verified,...unverified];
 const host=E('market-results');host.replaceChildren();
 if(!visible.length){host.textContent='No verified nearby offers or unverified government quotes saved. Add a manual quote, or configure the official source.';}
 else {
   const info=document.createElement('p');info.className='source-note';info.textContent=`${verified.length} verified-distance offer(s) within ${limit} km. ${unverified.length} quote(s) have unknown distance / transport, and are NOT ranked as best nearby returns.`;host.append(info);
   const table=document.createElement('table');table.className='hub-table';
   table.innerHTML='<thead><tr><th>Market</th><th>Date / source</th><th>Price</th><th>Transport + fees</th><th>Net return</th><th>Distance</th></tr></thead>';
   const tbody=document.createElement('tbody');
   for(const [i,r] of visible.entries()){
     const tr=document.createElement('tr');const isUnknown=r.distance===null;
     const cols=[(i===0&&verified.length?'★ ':'')+r.market,r.date+' · '+r.source,money(r.price)+'/kg',isUnknown?'Not verified':money(r.transport+r.commission)+'/kg',isUnknown?'Unverified (gross '+money(r.price)+'/kg)':money(r.net)+'/kg',isUnknown?'Unknown / not nearby verified':r.distance+' km'];
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
 if(!next.length)return {next,advice:[{level:'warning',title:'Forecast data unavailable for this period',detail:'No usable hourly forecast was returned. Check the local forecast service rather than assuming that conditions are safe.'}]};
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
   const p=document.createElement('small');p.textContent='Photo quality: '+(scan.quality?.good?'checked':'retake suggested')+' · '+(scan.diagnosis?('AI possible match: '+scan.diagnosis.crop+' — '+scan.diagnosis.condition+' ('+(scan.confidence*100).toFixed(1)+'% model score; unconfirmed)'):'AI diagnosis: unknown / not confirmed')+' · '+(scan.location?'GPS shared':'No location');
   const btn=document.createElement('button');btn.textContent='View this photo';btn.onclick=()=>{const url=URL.createObjectURL(scan.photo),img=new Image();img.src=url;img.alt='Saved '+scan.crop+' leaf';img.style.cssText='max-width:100%;max-height:230px;object-fit:contain;';img.onload=()=>URL.revokeObjectURL(url);row.append(img);btn.disabled=true;};
   row.append(title,p,btn);host.append(row);
  }
 }catch(err){host.textContent='Could not load offline records: '+err.message;}
}
E('refresh-scans').onclick=renderScans;
E('export-scans').onclick=async()=>{
 try{const scans=(await all('scans')).map(({photo,...item})=>({...item,photo:{name:photo?.name||'leaf.jpg',size:photo?.size||0}})),feedback=await all('feedback');const blob=new Blob([JSON.stringify({scans,feedback,exportedAt:now()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='verdant-private-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}catch(error){notify('sync-status',error.message,true);}
};
// Portable local backup. The JSON contains private photos, so nothing is uploaded.
function saveOfflineJson(filename,payload){
 const blob=new Blob([JSON.stringify(payload)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),12000);
}
function photoAsDataUrl(photo){return new Promise((resolve,reject)=>{
 const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error||new Error('Cannot read photo'));reader.readAsDataURL(photo);
});}
function photoFromDataUrl(value,name){
 const match=/^data:(image\/(?:jpeg|png|webp|gif));base64,([a-zA-Z0-9+/=]+)$/.exec(value);
 if(!match)throw new Error('Backup contains an unsupported image format');
 const bytes=atob(match[2]);if(bytes.length>10*1024*1024)throw new Error('A photo exceeds the 10 MB limit');
 const data=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)data[i]=bytes.charCodeAt(i);
 return new File([data],String(name||'restored-leaf.jpg').slice(0,100),{type:match[1]});
}
E('backup-scans').onclick=async()=>{
 const button=E('backup-scans');button.disabled=true;
 try{
  const scans=await all('scans'),total=scans.reduce((sum,item)=>sum+(item.photo?.size||0),0);
  if(total>28*1024*1024)throw new Error('Photos total over 28 MB. Use the smaller metadata export or back up fewer photos at a time.');
  const items=[];
  for(const scan of scans){const {photo,...fields}=scan;items.push({...fields,photo:photo?{name:photo.name,type:photo.type,data:await photoAsDataUrl(photo)}:null});}
  saveOfflineJson('verdant-local-backup-'+new Date().toISOString().slice(0,10)+'.json',{app:'Verdant Ops',format:1,exportedAt:now(),scans:items,quotes:await all('quotes'),feedback:await all('feedback')});
  notify('backup-status',`Backup created with ${scans.length} scan(s), photos and saved market quotes / feedback. Store the JSON privately.`);
 }catch(err){notify('backup-status','Could not create backup: '+err.message,true);}finally{button.disabled=false;}
};
E('import-backup').onchange=async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{
  if(file.size>45*1024*1024)throw new Error('Backup exceeds 45 MB limit.');
  const data=JSON.parse(await file.text());
  if(data.app!=='Verdant Ops'||data.format!==1||!Array.isArray(data.scans)||!Array.isArray(data.quotes)||!Array.isArray(data.feedback))throw new Error('Unrecognized Verdant Ops backup');
  if([data.scans,data.quotes,data.feedback].some(items=>items.length>3000))throw new Error('Backup exceeds record-count limit');
  const scans=data.scans.map(s=>{
   if(typeof s.id!=='string'||!s.id||typeof s.createdAt!=='string'||typeof s.crop!=='string')throw new Error('Invalid scan record');
   const {photo,...fields}=s;return {...fields,photo:photo?.data?photoFromDataUrl(photo.data,photo.name):null};
  });
  for(const store of ['quotes','feedback'])for(const item of data[store])if(!item||typeof item.id!=='string'||!item.id)throw new Error('Invalid '+store+' record');
  for(const scan of scans)await record('scans',scan);
  for(const store of ['quotes','feedback'])for(const item of data[store])await record(store,item);
  notify('backup-status',`Restored ${scans.length} scan(s), ${data.quotes.length} market quote(s) and ${data.feedback.length} feedback entry/entries. Existing IDs were updated; nothing was uploaded.`);
  renderScans();
 }catch(err){notify('backup-status','Restore failed: '+err.message,true);}finally{event.target.value='';}
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
  try{await navigator.serviceWorker.register('./sw.js?v=20261115-r7',{updateViaCache:'none'});}catch(err){console.warn('Offline cache worker could not be installed',err);}
 }
}
window.addEventListener('online',updateConnection);window.addEventListener('offline',updateConnection);startup();
})();
