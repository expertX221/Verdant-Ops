import bpy, random, math, json
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(47)
parts = []
palette = {
    'base':'#293a42','floor':'#425258','frame':'#7b9aab','edge':'#283a46',
    'bed':'#96aeb8','soil':'#141c20','mint':'#59ffbc','pink':'#fa7ed5',
    'cyan':'#4febff','amber':'#ffba6c','leaf1':'#48a85c','leaf2':'#99ca53',
    'leaf3':'#25674d','leaf4':'#974e70','glass':'#67b7d6','water':'#336b87','fruit':'#ef5443','stem':'#386642','cucumber':'#4c981f','steel':'#354b56'
}
materials = {}
for key, color in palette.items():
    rgb = [int(color[i:i+2],16)/255 for i in (1,3,5)]
    rgb = [x/12.92 if x < .04045 else ((x+.055)/1.055)**2.4 for x in rgb]
    mat = bpy.data.materials.new(key)
    mat.diffuse_color = (*rgb, .12 if key == 'glass' else 1)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = (*rgb,1)
    node.inputs['Roughness'].default_value = .33 if key in ('bed','frame','edge') else .55
    node.inputs['Metallic'].default_value = .38 if key in ('bed','frame','edge') else 0
    if key in ('mint','pink','cyan','amber'):
        node.inputs['Emission Color'].default_value = (*rgb,1)
        node.inputs['Emission Strength'].default_value = 2.6
    if key == 'glass':
        node.inputs['Alpha'].default_value = .09
    materials[key] = mat

def add(name, mat, verts, faces, zone=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(materials[mat])
    parts.append([mat, zone, [[round(q,3) for q in v] for v in verts], faces])
    return obj

cube_faces = [(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)]
def box(name, pos, size, mat, zone=None, rotation=None):
    center = Vector(pos)
    verts = []
    for z in (-1,1):
        for y in (-1,1):
            for x in (-1,1):
                point = Vector((x*size[0]/2,y*size[1]/2,z*size[2]/2))
                verts.append(tuple(center + (rotation @ point if rotation else point)))
    return add(name,mat,verts,cube_faces,zone)

def beam(name,a,b,width,mat,zone=None):
    a,b = Vector(a),Vector(b)
    d=b-a
    return box(name,(a+b)/2,(width,width,d.length),mat,zone,d.to_track_quat('Z','Y'))

box('Foundation',(0,0,-.24),(14,20,.45),'base')
box('Interior floor',(0,0,0),(12,18,.10),'floor')
for y in range(-8,9):
    box('Aisle tile',(0,y,.058),(2.5,.975,.027),'base')
for x in (-6.72,6.72):
    beam('Foundation perimeter',(x,-9.6,-.08),(x,9.6,-.08),.045,'cyan')
for y in (-9.6,9.6):
    beam('Foundation perimeter',(-6.72,y,-.08),(6.72,y,-.08),.045,'cyan')
for y in range(-9,10,3):
    for side in (-1,1):
        x=6*side
        beam('Upright',(x,y,0),(x,y,3.9),.11,'frame')
        beam('Rafter',(x,y,3.9),(0,y,6.15),.105,'frame')
        beam('Truss brace',(x*.57,y,4),(x*.31,y,5.45),.048,'frame')
        if y<9:
            add('Wall glazing','glass',[(x,y,.1),(x,y+3,.1),(x,y+3,3.9),(x,y,3.9)],[(0,1,2,3)])
            add('Roof glazing','glass',[(x,y,3.9),(x,y+3,3.9),(0,y+3,6.15),(0,y,6.15)],[(0,1,2,3)])
    beam('Tie beam',(-6,y,3.9),(6,y,3.9),.065,'frame')
for x,z in [(0,6.15),(-6,3.9),(6,3.9),(-3,5.025),(3,5.025),(-6,1.9),(6,1.9)]:
    beam('Longitudinal rail',(x,-9,z),(x,9,z),.08,'edge')
for y in (-9,9):
    for x in (-4,-2,-1.12,1.12,2,4):
        beam('End wall mullion',(x,y,0),(x,y,6.15-abs(x)*.375),.07,'frame')
    beam('Entry header',(-1.12,y,2.74),(1.12,y,2.74),.11,'mint')
def ellipsoid(name,pos,scale,material,zone=None):
    x,y,z=pos
    rx,ry,rz=scale
    vertices=[(x,y,z-rz),(x,y,z+rz)]
    for height in (-.5,.5):
        for i in range(8):
            t=i*math.tau/8
            vertices.append((x+rx*.866*math.cos(t),y+ry*.866*math.sin(t),z+height*rz))
    faces=[]
    for i in range(8):
        j=(i+1)%8
        faces.extend([(0,2+j,2+i),(2+i,2+j,10+j,10+i),(1,10+i,10+j)])
    return add(name,material,vertices,faces,zone)

crops=('Butterhead','Mixed lettuce','Green romaine','Red oakleaf','Basil','Pak choi','Cherry tomato','Mini cucumber')
for zone,crop in enumerate(crops):
    x=(-4.28,-1.99,1.99,4.28)[zone%4]
    y=-4.0 if zone<4 else 4.0
    vine=zone>=6
    box(crop+' bed',(x,y,.78),(1.82,7.25,.28),'bed',zone)
    box('Raft lid',(x,y,.94),(1.67,7.09,.07),'soil',zone)
    for dx in (-.89,.89):
        beam('Bed status rail',(x+dx,y-3.6,.87),(x+dx,y+3.6,.87),.032,'mint',zone)
        for dy in (-2.85,2.85):
            beam('Bed support',(x+dx*.75,y+dy,.06),(x+dx*.75,y+dy,.72),.11,'frame',zone)
    beam('Luminaire housing',(x,y-3.58,2.94),(x,y+3.58,2.94),.11,'edge',zone)
    beam('Grow light',(x,y-3.55,2.88),(x,y+3.55,2.88),.054,'pink' if zone%2 else 'cyan',zone)
    for dy in (-2.8,2.8):
        beam('Luminaire suspension',(x,y+dy,3),(x,y+dy,3.9),.023,'frame')
    if vine:
        for dx in (-.47,.47):
            for dy in (-3.48,0,3.48):
                beam('Trellis upright',(x+dx,y+dy,1),(x+dx,y+dy,2.65),.055,'steel',zone)
            for z in (1.45,1.95,2.62):
                beam('Trellis guide',(x+dx,y-3.5,z),(x+dx,y+3.5,z),.025,'frame',zone)
    for row in range(8 if vine else 11):
        for col in range(2 if vine else 3):
            px=x+((col-.5)*.88 if vine else (col-1)*.51)+random.uniform(-.045,.045)
            py=y+(row-3.5)*.87 if vine else y+(row-5)*.63
            py+=random.uniform(-.06,.06)
            levels=(1.08,1.43,1.83,2.21,2.48) if vine else (1.04,)
            if vine:
                beam('Vine stem',(px,py,1),(px+.04,py,2.59),.03,'stem',zone)
            for base in levels:
                for leaf in range(4 if vine else 7):
                    a=leaf*2.399+random.uniform(-.3,.3)
                    dx,dy=math.cos(a),math.sin(a)
                    l=random.uniform(.13,.25) if zone==4 else random.uniform(.19,.34)
                    w=random.uniform(.05,.1) if zone in (2,4,6) else random.uniform(.09,.15)
                    rise=.20 if zone in (2,4,5) else .09
                    verts=[(px,py,base),(px+dx*l*.49-dy*w,py+dy*l*.49+dx*w,base+rise*.55),
                           (px+dx*l,py+dy*l,base+rise),(px+dx*l*.49+dy*w,py+dy*l*.49-dx*w,base+rise*.55),
                           (px+dx*l*.53,py+dy*l*.53,base+rise+.035)]
                    mat=random.choice(['leaf1','leaf2','leaf3']+(['leaf4']*3 if zone in (1,3) else []))
                    add('Crop foliage',mat,verts,[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],zone)
                if vine and base in (1.43,2.21):
                    if zone==6:
                        for i in range(3):
                            ellipsoid('Cherry tomato',(px+.12+i*.065,py+i*.05,base-.1-i*.034),(.065,.065,.07),'fruit',zone)
                    else:
                        ellipsoid('Mini cucumber',(px+.16,py,base-.12),(.055,.065,.19),'cucumber',zone)
    sy=y-3.68
    box('Sensor pedestal',(x,sy,.54),(.35,.32,1.0),'edge',zone)
    box('Sensor face',(x,sy-.17,.92),(.24,.03,.13),'mint',zone)

# Rear service wall equipment, aisle cart and channel drains.
for x in (-3,3):
    for i in range(24):
        a=i*math.tau/24
        b=(i+1)*math.tau/24
        beam('Fan guard',(x+.58*math.cos(a),8.84,2.7+.58*math.sin(a)),(x+.58*math.cos(b),8.84,2.7+.58*math.sin(b)),.038,'frame')
    for i in range(5):
        a=i*math.tau/5
        beam('Fan blade',(x,8.82,2.7),(x+.46*math.cos(a),8.82,2.7+.46*math.sin(a)),.13,'steel')
    ellipsoid('Fan hub',(x,8.78,2.7),(.15,.1,.15),'frame')
for x in (-.82,.82):
    beam('Aisle drainage channel',(x,-8.4,.072),(x,8.4,.072),.055,'edge')
box('Service cart lower rack',(.64,7.45,.25),(.65,.95,.085),'steel')
box('Service cart work surface',(.64,7.45,.86),(.65,.95,.085),'frame')
for dx in (-.28,.28):
    for dy in (-.39,.39):
        beam('Cart leg',(.64+dx,7.45+dy,.15),(.64+dx,7.45+dy,.95),.05,'frame')
        ellipsoid('Cart caster',(.64+dx,7.45+dy,.11),(.075,.075,.075),'edge')
for x in (-5,5):
    box('Reservoir cabinet',(x,8.1,.55),(1.25,1.02,1.0),'base')
    box('Reservoir lid',(x,8.1,1.08),(1.32,1.08,.12),'water')
    beam('Supply pipe',(x,7.8,.28),(x,-7.6,.28),.12,'water')
    box('Cabinet light',(x,7.58,.83),(.6,.045,.10),'cyan')
for y in (-8,-4,0,4,8):
    box('Wayfinding strip',(0,y,.078),(.43,.06,.015),'mint')

(root/'assets'/'geometry.js').write_text('const geometry='+json.dumps({'palette':palette,'parts':parts},separators=(',',':'))+';',encoding='utf8')
# Merge foliage by material and zone to keep the Blender file responsive.
for mat in ('leaf1','leaf2','leaf3','leaf4'):
    objects=[o for o in bpy.context.scene.objects if o.name.startswith('Crop foliage') and o.active_material == materials[mat]]
    if objects:
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects: obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
        objects[0].name=mat+' canopy'

def orient(obj, target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

def area(name,location,target,energy,color,size):
    data=bpy.data.lights.new(name,'AREA')
    data.energy,data.color,data.shape,data.size=energy,color,'DISK',size
    obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    obj.location=location
    orient(obj,target)

box('Studio terrain',(0,0,-.55),(180,180,.22),'soil')
area('Moon key',(4,-8,16),(0,0,0),4100,(.68,.82,1),11)
area('Teal rim',(-11,4,8),(0,0,2),3800,(.17,1,.75),8)
area('Violet fill',(10,9,9),(0,0,2),3200,(.75,.38,1),10)
for x in (-4.28,-1.99,1.99,4.28):
    for y in (-4,4):
        area('Canopy illumination',(x,y,2.8),(x,y,0),100,(.72,.83,1),4)
scene=bpy.context.scene
scene.world=bpy.data.worlds.new('Blue hour')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.025,.055,.08,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
def camera(name,position,target,lens):
    data=bpy.data.cameras.new(name)
    data.lens=lens
    obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    obj.location=position
    orient(obj,target)
    return obj
scene.camera=camera('Exterior',(22,-27,17),(0,0,1.7),46)
camera('Aisle',(0,-8.8,1.84),(0,5,1.65),22)
scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.render.resolution_x,scene.render.resolution_y=1280,832
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='JPEG'
scene.render.image_settings.quality=90
scene.render.filepath=str(root/'assets'/'greenhouse.jpg')
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D': a.spaces.active.region_3d.view_perspective='CAMERA'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(root/'Verdant-Ops.blend'))
bpy.ops.render.render(write_still=True)

