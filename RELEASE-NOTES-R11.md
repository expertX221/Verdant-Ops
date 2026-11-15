# Verdant Ops r11 — Green farm grounds

**User issue:** Animals, farmhouse, barn, storage and equipment looked like they were placed on white surfaces rather than green land.

**Fix:** The r10 web layout applied light-tan `stone` parking / courtyard pads, and the original scene contained several large pale stone slabs. r11 replaces the 10 added pads with grass (`grass2`), and recolors only large, low, flat pre-existing stone/mud slabs. The grassy working clearings keep the already-arranged objects off crop beds. **Stone-coloured sheep bodies and small architectural details are deliberately unchanged.** The original Blender file and renderer have not been edited.

- Versioned scripts & offline app cache advanced to `20261115-r11` so older stone patches do not persist.
- No new AI dependencies or services; previous AI retry and diagnostics remain in place.
- `node tests/farm-layout.test.mjs` checks the 10 added ground meshes are turf, the old slabs are no longer pale, the three sheep retain their mesh colours, and greenhouse + 6 field crop zones still exist.
- `node tests/smoke.mjs` validates original scene hashes and integrations.
- **Limitations:** Script/geometry tests do not certify final WebGL screenshots on every device. The original `.blend` still contains its source object arrangement; the green-ground changes are applied at web render time.
