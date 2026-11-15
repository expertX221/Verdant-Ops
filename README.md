# Verdant Ops

An interactive 3D control room for small hydroponic greenhouses. Built for VibeX Codes Track 5B, Smart Farming & Climate.

## Run locally

Open index.html directly for a quick look. To mirror hosted behavior and keep a stable browser-local activity log, open a terminal in this folder and run:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000/ in a browser. It has no package-install step, external runtime dependencies, or API keys.

## Demo loop

1. Start in **pH drift**. DWC-02 Mixed lettuce has a 6.34 pH reading and a visible warning.
2. Use **Exterior**, **Aisle**, and **Plan**. Select a bed from a numbered marker or the bed list.
3. Select any sensor and compare the 1-hour, 24-hour, or 7-day charts.
4. Return to Mixed lettuce and choose **Simulate pH correction**. Confirm the action, inspect the 5.82 reading, and open **Activity**.
5. Switch to **Heat spike** to test a second simulated response in DWC-04. Use **Normal operation** to inspect the in-range state.
6. Choose **Export telemetry CSV** to download 64 simulated samples for each of the ten sensors across all eight beds in the selected time window.

## Architecture

- `Verdant-Ops.blend` is the editable Blender scene. It includes a glazed structure, eight beds for lettuce, basil, pak choi, cherry tomatoes and mini cucumbers, luminaires, sensors, reservoirs, and exterior and aisle cameras.
- `build_scene.py` rebuilds the Blender scene and exports the browser mesh plus a still render. Run it with `blender -b --python build_scene.py` from this folder.
- `assets/geometry.js` is generated. The browser projects the Blender mesh and draws it to a Canvas 2D context.
- `app.js` owns the camera, linked bed selection, telemetry, simulated responses, local activity storage, and CSV export.
- Scenario readings and demo thresholds are fixtures. Confirmations change simulated state only. Activity stays in browser-local storage. The prototype has no hardware connection.

## Publish on GitHub Pages

1. Create a public repository named `verdant-ops`.
2. Push the contents of this directory to `main`, with `index.html` at the repository root. Include `assets/`.
3. Open **Settings → Pages**. Choose **Deploy from a branch**, then **main** and **/ (root)**.
4. Wait for Pages to report a deployed URL. Open it in a private browser window and run the demo loop before submitting the URL.

The source files and art in this directory were created for this prototype. The supplied reference screenshots and judging guide are separate and should not be included in the repository.


## Deploy on Vercel

Import the GitHub repository in Vercel and select the project root. The included configuration uses the Other preset and serves the static files directly. Alternatively, upload the extracted static deploy folder to https://vercel.com/drop. No environment variables, database, or backend server are required.

[Pollo AI crop and equipment concept image](https://pollo.ai/v/cmwhr488bd4gklnuuvyy0dxtt). The interactive crop and equipment meshes were modeled in Blender.
