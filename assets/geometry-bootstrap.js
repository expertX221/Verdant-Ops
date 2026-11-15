/* Exact original exported scene text is reassembled before rendering. */
const geometry=JSON.parse(window.__verdantGeometryParts.join('').trim().slice('const geometry='.length,-1));
delete window.__verdantGeometryParts;
