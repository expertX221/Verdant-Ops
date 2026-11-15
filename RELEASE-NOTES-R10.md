# Verdant Ops — r10: Organized Farm Layout + AI Retry Diagnostics

## Farm scene (web view)
- South farmhouse and entrance lawn cleared of field planting tiles.
- North barnyard, grain silo and dedicated east storage courtyard separated.
- Existing storage shed and its produce crates moved to east compound.
- Livestock meadow and chicken pen kept off crop plots; three sheep repositioned.
- Machinery stand, tractor parking, pig pen and orchard cleared of cultivated tiles.
- Gravelled visitor/service paths link working areas.
- Crop beds inside the greenhouse and source 3D geometry are preserved.

The new placements are applied in `farm-layout.js` at runtime, after `assets/geometry-bootstrap.js`. The bundled `Verdant-Ops.blend` is the original Blender scene; **it has not been resaved with the new positions**. This distinction matters if editing the model in Blender instead of viewing it on the deployed website.

## Leaf analysis
- Free browser model import fallbacks and web-assembly/GPU backend retries (when supported).
- Diagnostic error codes with a copyable explanation, instead of a generic failure.
- If the all-category output fails, retries with the five highest-scoring classes.
- Any prediction remains tentative: crop identity and disease require confirmation, and the live downloaded model was not independently validated in this environment.

## Verification
```
node tests/farm-layout.test.mjs
node tests/crop-intelligence.test.mjs
node tests/smoke.mjs
```
All passed locally. Graphic Chromium browser navigation and real remote model download/inference were **not** verified here. This release does not guarantee a specific disease-recognition accuracy.

## Operation
Open the deployed site at `https://verdant-ops-farm.vercel.app/?v=20261115-r10`.
If it shows an older view, visit `/repair.html` to refresh only the app shell; farmer IndexedDB records are not deliberately cleared.
