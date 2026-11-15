"""Regenerate the original unmodified geometry JS and Blender project from Git split assets."""
from pathlib import Path
import json,hashlib
root=Path(__file__).parent
man=json.loads((root/'model-integrity.json').read_text())
def restore(path, parts, binary):
 if binary: value=b''.join((root/p).read_bytes() for p in parts)
 else:
  import re
  value=''.join(json.loads(re.match(r'^window\.__verdantGeometryParts\.push\((.*)\);$',(root/p).read_text().strip()).group(1)) for p in parts).encode()
 assert hashlib.sha256(value).hexdigest()==man['sha256'][path],path+' hash mismatch'
 (root/path).parent.mkdir(parents=True,exist_ok=True)
 (root/path).write_bytes(value)
 print('Restored identical original:',path)
restore('assets/geometry.js',man['geometry_parts'],False)
restore('Verdant-Ops.blend',man['blender_parts'],True)
