# Verdant Ops — Track 5B · Smart Farming & Climate

**Original downloadable Blender and source-geometry assets remain unmodified.** The browser scene applies the new `farm-layout.js` placement changes on top of the original geometry; the `Verdant-Ops.blend`, `build_scene.py`, `farm-renderer.js`, and `assets/geometry.js` are byte-for-byte identical to the uploaded source. The web-rendered farm now arranges buildings, livestock and crop clearings more neatly; the original `.blend` remains the pre-layout source and would need rebuilding in Blender for its viewport to match the updated web scene.

## Demo features (implemented)

- **3D exploration:** one-acre farm and greenhouse scene, orbit/pan, weather visual presets, object selection across 14 crop zones. Each crop opens its image, simulated measurements, scenario alerts and trends. Existing 3D meshes and lighting are untouched.
- **First-person aisle walk:** select **Aisle**, use **W / ↑** forward, **S / ↓** backward, **A / D** to sidestep (limited to central aisle), **Q / E** to look left/right. On mobile use **Walk** and **Back** buttons; scroll advances on desktop. **Go to crop** smoothly moves down the aisle near selected greenhouse rows. Camera stays within walkway bounds.
- **Mould flags:** Red oakleaf and Mini cucumber are flagged **MOULD SUSPECTED · demo inspection** on selection. This is an illustrative farm inspection observation, not a computer vision diagnosis or change to any vegetable mesh. All other plants say no mould flag.
- **Offline app shell:** installable PWA. After the first successful online load, the service worker caches the entire farm scene and 14 crop images for later offline visits (supported browser and available storage required).
- **On-device AI photos/records:** upload a crop-leaf photograph, run quality checks and optional 38-class model-based identification, display top-3 estimates and conservative guidance; save image, analysis and timestamp in IndexedDB. First-time model download needs internet; subsequent offline use depends on browser caching. GPS is included only when the user explicitly enables it.
- **Free manual symptom checker:** farmer selects observed leaf/plant signs and where they appear, then receives possible causes and conservative next steps offline. This is NOT disease classification and has no confidence score.
- **Portable offline backup:** Records tab can export an optional private JSON backup containing leaf photos, scans, manual market quotes and feedback, then restore it locally on another browser. Backups are never uploaded. The smaller metadata-only export remains available.
- **Mandi rank integrity:** only quotes with user-supplied verified distances and costs compete for the nearby top-return marker; government quotes missing transport/distance are separated as unverified gross prices.
- **Offline disease and chemical guide:** embedded references for healthy appearance, mildew, blight, rust, leaf spot, wilt and pests; browser-visible example active ingredients (e.g. sulphur, copper, azoxystrobin, azadirachtin, spinosad where appropriate), crop-stage/near-harvest warnings, nonchemical steps, registration/label checks, precautions and government agriculture contacts. These are research examples, never automatic chemical prescriptions or dosages. Chemical suggestions are a supervised reference, not an automatic product prescription.
- **Mandi net-price calculator:** manual nearby market quotes, commission + transport deductions, distance-radius filtering, best net return, locally recorded 7/30-day trends, and in-app price threshold checks. Optional `api/mandi.js` fetches official government modal prices (₹/quintal converted to ₹/kg) when Vercel environment `DATA_GOV_IN_API_KEY` is set. Live government quotes have **unknown distance and transport cost** until the farmer checks these. See <https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi>.
- **Weather:** permission-based GPS or manual coordinates, Open-Meteo 3-day forecast, rain/heat/frost/wind advice, saved forecast accessible offline with an explicit **stale** label. This is not a government severe-weather alert service.
- **Farmer-friendly:** large touch buttons, 3 local languages for scan responses (English/Tamil/Hindi), available browser speech synthesis, limited browser dictation, locally saved farm profile, correction/outcome feedback. Browser voice input may not function offline.
- **Privacy:** no automatic uploads; no embedded credentials. Farmer location is opt-in, and scan sync endpoint deliberately replies `501` until a consent-aware secure backend is configured.

## Crop identification precision update (2026-11-15, r8)

- **Crop-first scoring from the existing disease classifier.** The image classifier now returns all its labels (`top_k: 0`), then groups their evidence by vegetable/crop before choosing a disease class. The older implementation looked at only the top three disease labels and assumed the first label identified the crop; that could miss multiple classes of the correct crop.
- **Farmer crop confirmation.** Choose the known vegetable from the crop selector, or use auto mode to see possible crop candidates. Switching the crop re-ranks the previous scan locally without another download; press Identify again to save the corrected selection. User-supplied crop names are displayed as user-supplied, not as verified AI recognition.
- **Do not force unsupported diagnoses.** Lettuce, cucumber, onion, basil, pak choi, cabbage, carrot and brinjal/eggplant are NOT covered by this disease model. Choosing them produces an explicit unsupported message rather than mislabelling the leaf tomato or potato.
- **Stricter uncertainty handling.** Crops or conditions with weak scores, strong crop conflicts, ambiguous competing conditions or poor photo quality do not receive automatic treatment suggestions. The model output is not calibrated crop-identification certainty. No claim of improved measured accuracy is made without independent labelled test images.
- **No additional paid API or separate large crop model.** This is a conservative reranking / crop-check improvement using existing local ONNX inference. No 3D assets were changed.

## AI runtime compatibility fix (2026-11-15)

- The browser previously selected `dtype: q8`, which triggered `ConvInteger(10)` ONNX Runtime Web session errors on some devices. It now explicitly uses `device: wasm, dtype: fp32` to load the unquantized `onnx/model.onnx` graph. This increases initial download size but avoids that unsupported quantized operator.
- The user-facing scan panel hides the training dataset/provider information and raw runtime stack traces. Full technical attribution remains in source and documentation.
- Service worker cache version bumped to `r6` to update deployed JavaScript; a second reload or hard refresh may be required on devices with an older offline cache.
- Tests verify the fp32 selection, absence of the q8 graph, an interactive prediction flow with mocked inference and unchanged 3D model hashes. **Real remote model inference still requires live-browser testing.**

## AI leaf recognition added (free, browser-side)

The **Identify disease with AI** button now lazily loads a 38-class PlantVillage MobileNetV2 ONNX image classifier from Hugging Face using free Transformers.js v3.8.1 on the visitor's device. It returns a likely **crop + condition**, top-3 model scores, and safe nonchemical next steps. It also updates the existing disease guide. **No paid API key is required, and the photo is processed locally by the browser** (the runtime/model files are downloaded first). The farmer may preload the model from the **Prepare AI for offline use** button; full offline use depends on the browser retaining Transformers.js/ONNX caches and should be tested per browser.

**Serious limitations:** the source model reports 95.41% evaluation accuracy on its curated PlantVillage dataset; that is **not** accuracy for arbitrary Google images or real fields. A separate study of another PlantVillage model measured only 16% on a tiny real-world set, illustrating domain shift. The app rejects low scores (<60%), near ties (<10 percentage points), selected-crop mismatches, and poor image quality, but these checks **cannot reliably detect non-leaves or unknown diseases**. Predictions are not diagnoses or treatment prescriptions. Only the trained 38 conditions are eligible; not every crop, especially the original hydroponic lettuce/basil crops, is supported. External model availability, licenses and network access may change. Confirm findings before use. The model is referenced remotely rather than redistributed; check its source license before commercial reuse.

Model source: https://huggingface.co/onnx-community/mobilenet_v2_1.0_224-plant-disease-identification-ONNX · runtime: https://huggingface.co/docs/transformers.js/v3.8.1/installation

## Not yet implemented / do not claim in a demo

1. **Reliable general-purpose disease diagnosis:** a third-party 38-class PlantVillage model now loads on demand, but there is no locally validated field model or calibrated uncertainty for all crops, and no guaranteed non-leaf detection. The displayed score is a model score, not proven accuracy on your own photos.
2. **Exact chemical dosages / crop-specific PHIs:** need independent validation against locally registered labels and crop-stage restrictions. No fabricated pesticide quantities are offered.
3. **Automatic nearby mandi discovery:** govt data does not include user-to-market coordinates here. Prices refresh only when the server-side government API key is configured; proximity, transport, and commission must be verified by users.
4. **SMS delivery:** intentionally excluded at the user’s request; all warnings are visible in the browser. Offline cached forecasts are labelled stale.
5. **Remote farmer scan sync or model retraining:** local queuing and feedback are implemented, but private backend and scientifically evaluated training pipeline are not. No remote scans leave the device.
6. **Native SQLite:** this web edition uses IndexedDB, the browser-standard offline record store, rather than shipping SQLite WASM.

## Run locally / VS Code

Open the folder containing `index.html`. Start an HTTP server via VS Code task **Serve Verdant Ops**, or run `python -m http.server 8000`, then visit `http://localhost:8000` (HTTPS on deployment). WebGL2 uses `farm-renderer.js`; Canvas is the existing fallback. No `npm install` or user-facing API key is necessary for the offline features.

## Vercel configuration (optional real mandi feed)

In Vercel project settings add `DATA_GOV_IN_API_KEY` as a protected server-side environment variable and redeploy. `/api/mandi` then makes a server request to the AGMARKNET dataset; it returns `503` until configured. Never publish that key in JS or GitHub. Weather uses Open-Meteo without a key subject to its licensing and conditions.

## Validation checklist

- Review the manual visual symptom guide (white powder, rust, dark lesions, wilt, pest damage, yellowing), including uncertainty and nonchemical next steps.
- Export and restore a backup including local photos; avoid sharing the resulting private JSON file. Large backups may be rejected in the browser.
- Check that unknown-distance government quotes are never awarded the nearest/best net-return star.

- Compare SHA-256 for four preserved model/renderer files; they must match original.
- Switch Aisle and walk from entrance into greenhouse without flying through crop beds; test mobile buttons and WASD.
- Click each of the 14 3D crop regions or inventory buttons; each must show correct `crop-N.jpg`, stats and condition badge.
- Test 0/1/2+ offline local mandi quotes, sorting and commission deductions; check local weather cache and stale warning.
- Save photo scan, revisit after offline reload, check IndexedDB history, optional GPS, feedback and export.
- Check mobile widths 390/768/1440 for overlap. Note: actual runtime/browser QA is required beyond syntax checks.

**Reference sources:** [Kisan Call Centre](https://dackkms.gov.in/account/aboutus.aspx) · [data.gov.in AGMARKNET](https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi) · [Open-Meteo](https://open-meteo.com/en/docs).

## Browser chemical reference: source and safety

Active-ingredient names are examples to discuss with an agricultural officer; **not treatment instructions or proof of approval** for every Indian crop. India's official pesticide rules require using a registered product with approved crop/disease label, dosage, protective equipment, re-entry time and pre-harvest interval. Before any spray, confirm the actual disease and the *current* product label. The app intentionally does not calculate a chemical dosage or silently prescribe a formulation. Source: [Ministry of Agriculture, 22 July 2025](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2146917).

## GitHub lossless model packaging

The connected GitHub transport cannot accept the single 7.6 MB geometry or 4.7 MB Blender object as one blob. **The model data is not changed**: the site executes the same exact geometry JSON from ordered scripts in `assets/geometry-parts`, and `model-parts` contains the original Blender binary split into lossless pieces. A local checkout can run `python restore_models.py` to reconstruct `assets/geometry.js` and `Verdant-Ops.blend` byte-for-byte, checked against `model-integrity.json`. The distributed VS Code ZIP also includes the unmodified originals. The app itself loads the split geometry scripts with zero API keys and works offline after the service worker precaches them.

## Refreshing a previously installed app (November 15 cache repair)

When an older browser tab displays `ConvInteger(10)` even though the deployed code loads `dtype: 'fp32'`, the tab is executing **stale JavaScript**. The old error string is not in the current release.

Open `https://verdant-ops-farm.vercel.app/repair.html` to automatically unregister only this site's offline service worker and delete `verdant-ops-*` app-shell caches, then reload the latest version using versioned script URLs. This **does not delete** IndexedDB scans, quotes, private photographs or model weights in the model cache. A private browser window is another way to avoid old cached code.

The image model still requires first-time network access, and compatible code does not prove prediction accuracy. Real-image inference should be tested on the actual target device before claiming working diagnosis.


## Image analysis reliability patch — r9

- Retry browser module loading with an alternate ESM source, retaining full-precision ONNX throughout.
- Try single-threaded WASM first and WebGPU if available when the browser engine cannot initialize.
- Retry the normal top-five model response if all-category inference fails. This can reduce the crop-first ranking evidence and is reported through conservative confidence gating.
- Show user-safe error categories (NETWORK, RUNTIME, INFERENCE); a collapsed diagnostic report contains the underlying error, but never the leaf photo or farm records.
- This improves failure recovery, **not** independently verified prediction accuracy. Actual model inference requires a browser with access to remote downloads.


## Farmyard spatial layout refinement — r10

The **web-rendered** 3D farm now separates cultivated beds from farm work and living areas. The **farmhouse** occupies a cleared southern lawn; the **barn and grain silo** have a gravelled north service yard; the **storage shed with produce crates** is repositioned to a separate eastern work apron; and the **western livestock pasture** is kept clear of vegetable plots. Three sheep have been redistributed within the existing fenced pasture. Machinery, pigs and an orchard retain dedicated clearings, with short gravel paths connecting work areas. All eight greenhouse crop beds and their internal walkthrough remain unchanged.

The layout transform in `farm-layout.js` is applied after the original split geometry loads, but before the WebGL renderer compiles geometry. This avoids republishing multi-megabyte original model blobs. The original binary `.blend` and `assets/geometry.js` remain byte-for-byte intact for reversibility. **The `.blend` itself has not been regenerated** in this environment; the improved arrangement is in the running website and included in the VS Code source as a separate layer.

**QA:** `node tests/farm-layout.test.mjs` checks 6 surviving field zones, removed crop-bed overlaps at house, barn, storage and pens, new shed center, 3 moved sheep and intact greenhouse geometry. `node tests/smoke.mjs` checks script order and cache. Desktop and mobile screenshots of this new 3D scene could not be rendered because the local Chromium browser refused navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`; do not claim visual QA passed.

## Image-analysis r9 recovery (included in r10)

The classifier retries its module import using an alternative free ESM host, retries the ONNX runtime using an available browser backend where supported, and retries five-label inference if full-label enumeration fails. Failure messages now distinguish network, runtime and inference faults and provide a copyable diagnostic message without sharing the leaf image. This is a retry path, not proof of higher image recognition accuracy. Live download and real-photo inference require verification on a browser that permits external model fetches.

## r11 green-ground correction

The r10 white stone pads beneath farm objects are replaced by green turf, and broad pre-existing pale ground slabs become grass; animals keep their existing body colours. Farmhouse, livestock, barn, storage and machinery remain on crop-free sites. See `RELEASE-NOTES-R11.md`. The original `Verdant-Ops.blend` is unchanged.
