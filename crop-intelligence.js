/* Verdant Ops crop-first analysis, no external dependencies. The disease model
 * supplies joint crop/disease scores, NOT a separately validated crop model.
 * Avoids turning an unsupported or conflicting crop guess into a diagnosis. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VerdantCropAI = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';
  const CROPS = [
    ['Bell Pepper', ['bell pepper', 'capsicum', 'sweet pepper', 'pepper']],
    ['Blueberry', ['blueberry']], ['Raspberry', ['raspberry']],
    ['Strawberry', ['strawberry']], ['Cherry', ['cherry']],
    ['Tomato', ['tomato']], ['Potato', ['potato']], ['Apple', ['apple']],
    ['Corn', ['corn', 'maize']], ['Grape', ['grape']], ['Orange', ['orange', 'citrus']],
    ['Peach', ['peach']], ['Soybean', ['soybean']], ['Squash', ['squash']]
  ];
  const SUPPORTED = CROPS.map(([name]) => name);
  const normalize = s => String(s || '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  function cropForLabel(label) {
    const clean = normalize(label).replace(/^label \d+\s*[:=-]?\s*/, '');
    for (const [crop, names] of CROPS) {
      if (names.some(alias => new RegExp('(^|[^a-z])' + alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)').test(clean))) return crop;
    }
    return null;
  }
  function normalizeCropSelection(selection) {
    const clean = normalize(selection);
    if (!clean || clean === 'auto') return 'auto';
    for (const [crop, names] of CROPS) {
      if (clean === normalize(crop) || names.includes(clean)) return crop;
    }
    return String(selection || '').trim(); // Deliberately unsupported crop: no forced guess
  }
  function assess(predictions, { selectedCrop = 'auto', qualityGood = true,
    minimumScore = .60, minimumConditionGap = .10, minimumCropGap = .08 } = {}) {
    const all = (Array.isArray(predictions) ? predictions : [])
      .filter(p => typeof p?.label === 'string' && Number.isFinite(p.score) && p.score >= 0 && p.score <= 1)
      .map(p => ({ label: p.label, score: Number(p.score), crop: cropForLabel(p.label) }))
      .sort((a, b) => b.score - a.score);
    const grouped = new Map();
    for (const result of all) {
      if (!result.crop) continue;
      if (!grouped.has(result.crop)) grouped.set(result.crop, { crop: result.crop, total: 0, max: 0, classes: [] });
      const group = grouped.get(result.crop);
      group.total += result.score;
      group.max = Math.max(group.max, result.score);
      group.classes.push(result);
    }
    // Individual-class max prevents a crop with more labelled diseases winning
    // solely because the dataset provides it more disease categories.
    // The small additional contribution rewards consistent same-crop evidence.
    const candidates = [...grouped.values()].map(group => ({
      ...group, rank: group.max + .15 * (group.total - group.max)
    })).sort((a, b) => b.rank - a.rank);
    const requestedCrop = normalizeCropSelection(selectedCrop);
    const provided = requestedCrop !== 'auto';
    const choice = provided ? candidates.find(c => c.crop === requestedCrop) : candidates[0];
    const bestOverall = all[0];
    const runner = candidates.find(c => c !== choice);
    const top = choice?.classes[0] || null;
    const next = choice?.classes[1] || null;
    const cropGap = candidates.length > 1 ? candidates[0].rank - candidates[1].rank : 1;
    const conflict = !!(provided && top && bestOverall && bestOverall.crop !== requestedCrop
      && bestOverall.score - top.score >= .15);
    const missingCrop = !choice;
    const accepted = !!(top && qualityGood && top.score >= minimumScore
      && (!next || top.score - next.score >= minimumConditionGap)
      && !conflict && (provided || cropGap >= minimumCropGap));
    let reason = 'Preliminary image-based match. Verify the vegetable and visible symptoms before acting.';
    if (!all.length) reason = 'The image model returned no usable prediction. Try a clearer leaf photo.';
    else if (missingCrop && provided) reason = `${requestedCrop} is not covered by this leaf-disease model. Do not use another vegetable's disease result for it.`;
    else if (missingCrop) reason = 'The image does not match a supported crop. Choose a known vegetable or retake a clear leaf photo.';
    else if (!qualityGood) reason = 'Photo quality is insufficient. Retake with one leaf in focus and daylight.';
    else if (conflict) reason = `You selected ${requestedCrop}, but the image strongly resembles ${bestOverall.crop} in the trained categories. Verify the vegetable before interpreting any disease.`;
    else if (!provided && cropGap < minimumCropGap) reason = 'The crop candidates are too similar to identify the vegetable reliably. Select the crop you know before reviewing a disease.';
    else if (top.score < minimumScore) reason = 'No disease class matches this crop strongly enough. Select the correct vegetable or take another leaf photo.';
    else if (next && top.score - next.score < minimumConditionGap) reason = 'This vegetable may match several conditions. A closer leaf image or professional inspection is needed.';
    return {
      requestedCrop, provided, crop: choice?.crop || (provided ? requestedCrop : null),
      cropSupported: !!choice, candidates: candidates.map(({crop, max, total, rank}) => ({crop, max, total, rank})),
      top, conditions: choice?.classes.slice(0, 3) || [],
      accepted, conflict, reason,
      // All scores are uncalibrated model outputs, never diagnostic certainty.
      modelScore: top?.score ?? null, runnerCrop: runner?.crop || null
    };
  }
  return Object.freeze({ CROPS: SUPPORTED, cropForLabel, normalizeCropSelection, assess });
});
