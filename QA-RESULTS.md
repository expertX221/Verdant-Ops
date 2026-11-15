## r8 crop-precision QA (November 15, 2026)

- `node tests/crop-intelligence.test.mjs`: PASS for supported crop extraction (including bell pepper and maize), single-crop high scores, grouped crop evidence, farmer-selected tomato, strong potato/tomato mismatch, unsupported cucumber/lettuce, ambiguous scores, and poor-quality photo rejection.
- `node tests/smoke.mjs`: PASS with original 3D asset hashes unchanged, all crop images present, valid JS, and crop-first script/version/offline-cache inclusion.
- **Chromium desktop 1440px and mobile 390px DOM tests: PASS with mocked model outputs.** The test loads the actual crop and farmer-tool JavaScript, uploads a synthetic tomato-leaf image, validates probable tomato / early-blight display, nonchemical suggestions, strong mismatch rejection for selected potato, unsupported lettuce warning, crop-change reanalysis without another model call, and no page JavaScript errors or horizontal overflow. Screenshots were inspected.
- **Not measured:** Real photo classification accuracy, separate vegetable-species recognition, and inference runtime/model download in the user's browser. This remains a disease/healthy label model limited to its supported crops. The tests do NOT establish better percentage accuracy across unrelated Google images or cucumber/lettuce leaves.

# Verdant Ops — AI disease feature test report

## Runtime hotfix

- Switched model loading from `dtype: q8` to `dtype: fp32` to bypass the unsupported ONNX `ConvInteger` runtime error reported in the live app. Application code now uses network-first loading with offline cache fallback to prevent old JavaScript persisting after a redeploy. The unquantized `model.onnx` is publicly available.
- Removed publicly visible model-source details and raw runtime errors from the leaf-scan panel; technical provenance stays in the README.
- Real model inference on a live browser **not yet verified**; passing desktop and mobile interaction tests use mock classifier output.


## Verified in this release

- `node tests/smoke.mjs` passes. The original Blender binary, renderer, geometry data, and scene builder match their recorded SHA-256 hashes.
- All 14 crop image assets and key interface elements are present.
- Python/Playwright Chromium DOM interaction tests pass on **1440 px desktop** and **390 px mobile** using **mocked ONNX output** (no paid API). Tests cover photo input, predicted crop/disease label, top-three model scores, next-step recommendations, crop-mismatch rejection, low-confidence rejection, layout width, and uncaught JavaScript exceptions.
- Actual model repository confirmed publicly listed with ONNX `model_quantized.onnx` weights, configuration and 38 plant-disease/healthy class labels.

## What is not certified by these tests

- **Real on-device ONNX inference against a downloaded image/model** was not completed in the browser test environment. Browser external network access was restricted. Simulated prediction tests verify UI behavior, not the model's accuracy or runtime download.
- Offline browser reloading with cached runtime/model is browser- and cache-dependent and has not been independently tested.
- Real-field accuracy for crops outside PlantVillage, including cucumber, lettuce and many greenhouse crops, is **not established**. The 38-class model cannot classify every plant/disease or arbitrary Google image reliably.
- Responsive screenshot checks verify horizontal overflow and JavaScript exceptions for test dimensions, but not every visual overlay or full 3D WebGL interaction.

## Quick manual verification on live Vercel

1. Open the site online and expand **Leaf scan** in Farmer Tools.
2. Click **Prepare AI for offline use** and confirm **AI model loaded** (first download may take some time).
3. Upload a clear **tomato** or **potato** leaf photo from one of the model's supported categories; click **Identify disease with AI**.
4. Confirm that the result gives a **crop**, **likely condition**, **model score** and **nonchemical first steps**, or that it explicitly reports uncertainty. Select the wrong crop and check the mismatch warning.
5. If the model fails to download due to browser/network restrictions, use the manual **Guided visual symptom check**. Never treat a prediction as a professional disease diagnosis.
6. Confirm the original 3D farm remains selectable, orbitable and walkable; check mobile width and browser console.

## Guardrails

No fabricated predictions, no chemical dosages or automatic pesticide application advice. Explicitly verify the crop, disease, local registration and PHI before any real treatment.

## r7 stale service-worker recovery
- Added `repair.html` to recover from old tab/cached JavaScript with `ConvInteger` errors without deleting IndexedDB farmer records.
- Versioned `app.js`/`intelligence.js` URLs and no-cache service-worker registration.
- Real ONNX inference remains unverified until the externally hosted model can be fetched and run in the intended browser.
