# Verdant Ops

Verdant Ops is an interactive one-acre farm and hydroponic greenhouse prototype for **Track 5B · Smart Farming & Climate (AgriTech)**. It brings crop inspection, simulated climate conditions, and mandi quote comparison into a farm tour.

[Open the live Vercel demo](https://verdant-ops-farm.vercel.app/)

## Demo

1. Choose a stop from **Visit farm**. Select **Walk**, then use **W / S** or the on-screen arrows to move. Drag to look around.
2. Select a crop in the scene or inventory to view its image, scientific name, nutrients, uses, and readings.
3. In **Farm tools** below the scene, choose **Auto-detect from photo** or select your crop. Use **Open camera** or **Upload a leaf photo**. The app stores the photo on this device and submits a resized image only when you select **Screen photo**. Choose **Run hackathon sample** for a preset leaf disease case and illustrative mandi comparison.
4. Compare mandi quotes by net price per kilogram after transport. District lookup requires a configured market data source.
5. Switch between **Sunny**, **Overcast**, and **Rain**. Select **pH drift** or **Heat spike** to run a simulated operator response. The pH simulation does not calculate a real chemical dose. Use the Chemical reference menu for source-linked crop guidance and product label checks.

## Alignment with Track 5B

| Requirement | Status |
| --- | --- |
| Capture or upload a leaf photo offline | Photos are stored on-device. After one successful online load, a service worker caches the app for offline use. |
| AI identifies the disease | Auto-detect and manual crop selection are available. Live diagnosis requires a configured model and remains unverified. Symptom review provides rule-based guidance. |
| Recommend an exact treatment | Pending. The prototype gives general inspection steps. Crop-specific treatment recommendations need validation. |
| Identify the best-paying nearby mandi | Partial. The tool ranks quotes entered by the user after transport costs. Automatic nearby market discovery and live prices are pending. |
| Alert on sudden changes in weather | Partial. Weather views and greenhouse climate events are simulated. Live forecasts and alerts are pending. |

## Run in VS Code

Extract the project ZIP and open the folder that contains `index.html`, or open `Verdant-Ops.code-workspace`. Run **Tasks → Run Task → Serve Verdant Ops** and open [localhost:8000](http://localhost:8000/). The local server requires Python. The farm tour runs without a model key. Photo screening requires one of the model configurations below.

The editable Blender scene is `Verdant-Ops.blend`. The generator `build_scene.py` exports the browser geometry and selected renders. `farm-renderer.js` draws the 3D farm, and `app.js` handles the tour, crop panels, simulated readings, records, and weather controls.

## Task status

- Shipped to Vercel — farm tour, greenhouse simulator, WebGL renderer, local photo preview, rule-based triage, weather presets, and manual mandi quote comparison.
- [Validate photo-based crop diagnosis and treatment guidance](https://github.com/expertX221/Verdant-Ops/issues/1)
- [Connect verified mandi prices](https://github.com/expertX221/Verdant-Ops/issues/2)

## Visible mould screening

Run `python serve.py` from this directory. Install the cloud dependencies with `python -m pip install -r requirements.txt`. Set `ROBOFLOW_API_KEY` in the server environment and `ROBOFLOW_MODEL_ID` if your authorized model differs from the HarvestLens model identifier. Keep keys in server environment variables, including on Vercel. The online scan sends a resized JPEG only when the user clicks Scan photo.

For offline inference on your computer, install Ultralytics and set `YOLO_MOULD_WEIGHTS` to a trusted local YOLO detection or segmentation checkpoint with mould or rot classes. This takes precedence over the cloud option. The two supplied source archives do not include trained weights. This feature screens for visible mould-like or rot-like regions.

For vegetable recognition, configure `YOLO_VEGETABLE_WEIGHTS` with a trusted checkpoint, or set `ROBOFLOW_VEGETABLE_MODEL_ID` to an authorized hosted vegetable detector. The supplied vegetable ZIP contains a detector at `best.pt` and named test photos. Its vegetable labels are distinct from mould labels. The YOLOv5 paper reports results on its own dataset. Those figures are not accuracy measurements for Verdant Ops.

Camera capture works over HTTPS or localhost with browser camera permission. Use Upload a leaf photo if the camera is unavailable.


### Leaf disease guidance and mandi lookup

Set `ROBOFLOW_DISEASE_MODEL_ID` with an authorized model, or configure `YOLO_DISEASE_WEIGHTS` with trusted local detection weights. The supported treatment labels are `tomato_early_blight`, `potato_early_blight`, and `tomato_gray_mold`. The app shows Extension management steps only for supported model results above the confidence threshold. Validate that threshold and treatment coverage on local crop photos before field use.

Set `AGMARKNET_API_KEY` on the server for district-based mandi lookup. The page shows the latest returned date and ranks reported modal prices by rupees per kilogram. Manual quotes remain available for transport-adjusted comparisons.

After the first successful online load, the browser caches the farm page and saves one selected photo per crop on the device. Hosted model and market requests require connectivity. Offline inference requires the local server, runtime, and compatible weights.

### Hackathon sample

Choose **Run hackathon sample** in Farm tools. It opens a preset tomato early blight case and ranks illustrative mandi quotes after transport. This demonstration needs no model or market credentials and does not analyze the selected photo. After the first successful online load, it can run offline with the cached app.
