# Verdant Ops

Verdant Ops is an interactive one-acre farm and hydroponic greenhouse prototype for **Track 5B · Smart Farming & Climate (AgriTech)**. It brings crop inspection, simulated climate conditions, and mandi quote comparison into a farm tour.

[Open the live Vercel demo](https://verdant-ops-farm.vercel.app/)

## Demo

1. Select **Visit farm → Cabbage** to open a crop image, readings, and the plant-health panel.
2. Use **Take a photo** or **Upload a leaf photo**. The image stays in the browser. Choose a symptom to see rule-based inspection guidance.
3. Enter two mandi quotes and their transport costs to compare the net price per kilogram.
4. Switch between **Sunny**, **Overcast**, and **Rain**. In the greenhouse, try the simulated pH drift and heat-spike responses.
5. Drag to orbit or scroll to zoom. WebGL draws the scene on supported browsers, with a Canvas fallback.

## Alignment with Track 5B

| Requirement | Status |
| --- | --- |
| Capture or upload a leaf photo offline | Local image capture and preview work once the page is loaded. Opening the hosted app from a cold start offline is pending. |
| AI identifies the disease | Pending. The current assistant uses the symptom selected by the user. The image is for inspection. |
| Recommend an exact treatment | Pending. The prototype gives general inspection steps. Crop-specific treatment recommendations need validation. |
| Identify the best-paying nearby mandi | Partial. The tool ranks quotes entered by the user after transport costs. Automatic nearby market discovery and live prices are pending. |
| Alert on sudden changes in weather | Partial. Weather views and greenhouse climate events are simulated. Live forecasts and alerts are pending. |

## Source status

The live Vercel demo is the current build. The GitHub branch is awaiting the full source sync. The VS Code workspace instructions apply to the latest project ZIP.

## Run in VS Code

Extract the project ZIP and open the folder that contains `index.html`, or open `Verdant-Ops.code-workspace`. Run **Tasks → Run Task → Serve Verdant Ops** and open [localhost:8000](http://localhost:8000/). Python is required for the local server. The browser app has no package installation or API key requirements.

The editable Blender scene is `Verdant-Ops.blend`. The generator `build_scene.py` exports the browser geometry and selected renders. `farm-renderer.js` draws the 3D farm, and `app.js` handles the tour, crop panels, simulated readings, records, and weather controls.

## Task status

- Shipped to Vercel — farm tour, greenhouse simulator, WebGL renderer, local photo preview, rule-based triage, weather presets, and manual mandi quote comparison.
- [Validate photo-based crop diagnosis and treatment guidance](https://github.com/expertX221/Verdant-Ops/issues/1)
- [Connect verified mandi prices](https://github.com/expertX221/Verdant-Ops/issues/2)