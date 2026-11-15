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
