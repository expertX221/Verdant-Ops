# Verdant Ops

Verdant Ops is a one-acre interactive farm and hydroponic greenhouse prototype for VibeX Codes Track 5B, Smart Farming & Climate.

[Open the live farm](https://verdant-ops-farm.vercel.app/)

Use **Visit farm** to tour the greenhouse, barnyard, pasture, and six outdoor crop plots. Select a crop to see its profile, upload or capture a leaf photo, review symptom guidance, and compare mandi quotes after transport costs. The greenhouse dashboard shows simulated readings and lets you try pH and ventilation responses.

The live demo has the expanded farm. This GitHub branch contains the earlier greenhouse source.

## Task board

| Status | Work |
| --- | --- |
| Shipped to Vercel | One-acre farm tour, greenhouse and field crop inspection, camera and upload controls, weather simulation, and manual mandi comparison |
| Open | [Validate photo-based crop diagnosis and treatment guidance](https://github.com/expertX221/Verdant-Ops/issues/1) |
| Open | [Connect verified mandi prices](https://github.com/expertX221/Verdant-Ops/issues/2) |

## Run locally

Run `python -m http.server 8000 --bind 127.0.0.1` from the project directory and open `http://127.0.0.1:8000/`. The project runs as a static site with no API keys. The editable Blender scene and generator are `Verdant-Ops.blend` and `build_scene.py`.

The live prototype previews photos locally and provides rule-based symptom guidance. The market comparison uses quotes you enter.
