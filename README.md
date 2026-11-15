# Verdant Ops — Track 5B · Smart Farming & Climate

**No 3D models were changed in this release.** The original `Verdant-Ops.blend`, `build_scene.py`, `farm-renderer.js`, and `assets/geometry.js` are byte-for-byte identical to the uploaded source. Only camera/UI logic and additive web tools were changed.

## Demo features (implemented)

- **3D exploration:** one-acre farm and greenhouse scene, orbit/pan, weather visual presets, object selection across 14 crop zones. Each crop opens its image, simulated measurements, scenario alerts and trends. Existing 3D meshes and lighting are untouched.
- **First-person aisle walk:** select **Aisle**, use **W / ↑** forward, **S / ↓** backward, **A / D** to sidestep (limited to central aisle), **Q / E** to look left/right. On mobile use **Walk** and **Back** buttons; scroll advances on desktop. **Go to crop** smoothly moves down the aisle near selected greenhouse rows. Camera stays within walkway bounds.
- **Mould flags:** Red oakleaf and Mini cucumber are flagged **MOULD SUSPECTED · demo inspection** on selection. This is an illustrative farm inspection observation, not a computer vision diagnosis or change to any vegetable mesh. All other plants say no mould flag.
- **Offline app shell:** installable PWA. After the first successful online load, the service worker caches the entire farm scene and 14 crop images for later offline visits (supported browser and available storage required).
- **Offline photos/records:** take/upload a leaf photograph, run a local image-brightness/detail quality check, store photo + timestamp + crop in IndexedDB, view/export scan history and feedback, queue for later **configured** sync. GPS is included only when the user explicitly enables it.
- **Free manual symptom checker:** farmer selects observed leaf/plant signs and where they appear, then receives possible causes and conservative next steps offline. This is NOT disease classification and has no confidence score.
- **Portable offline backup:** Records tab can export an optional private JSON backup containing leaf photos, scans, manual market quotes and feedback, then restore it locally on another browser. Backups are never uploaded. The smaller metadata-only export remains available.
- **Mandi rank integrity:** only quotes with user-supplied verified distances and costs compete for the nearby top-return marker; government quotes missing transport/distance are separated as unverified gross prices.
- **Offline disease and chemical guide:** embedded references for healthy appearance, mildew, blight, rust, leaf spot, wilt and pests; browser-visible example active ingredients (e.g. sulphur, copper, azoxystrobin, azadirachtin, spinosad where appropriate), crop-stage/near-harvest warnings, nonchemical steps, registration/label checks, precautions and government agriculture contacts. These are research examples, never automatic chemical prescriptions or dosages. This is a knowledge lookup, not automatic AI diagnosis.
- **Mandi net-price calculator:** manual nearby market quotes, commission + transport deductions, distance-radius filtering, best net return, locally recorded 7/30-day trends, and in-app price threshold checks. Optional `api/mandi.js` fetches official government modal prices (₹/quintal converted to ₹/kg) when Vercel environment `DATA_GOV_IN_API_KEY` is set. Live government quotes have **unknown distance and transport cost** until the farmer checks these. See <https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi>.
- **Weather:** permission-based GPS or manual coordinates, Open-Meteo 3-day forecast, rain/heat/frost/wind advice, saved forecast accessible offline with an explicit **stale** label. This is not a government severe-weather alert service.
- **Farmer-friendly:** large touch buttons, 3 local languages for scan responses (English/Tamil/Hindi), available browser speech synthesis, limited browser dictation, locally saved farm profile, correction/outcome feedback. Browser voice input may not function offline.
- **Privacy:** no automatic uploads; no embedded credentials. Farmer location is opt-in, and scan sync endpoint deliberately replies `501` until a consent-aware secure backend is configured.

## Not yet implemented / do not claim in a demo

1. **Trained on-device disease classifier / confidence:** no evaluated ONNX/TFLite weights or browser runtime are bundled. The leaf photo is checked for *image quality only*; it cannot detect plant disease or assign diagnostic confidence. `models.json` documents what must be added to make ML claims.
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
