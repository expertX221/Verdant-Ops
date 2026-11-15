import bpy, random, math, json
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(47)
parts = []
field_meshes = {}
palette = {
    'base':'#293a42','floor':'#425258','frame':'#7b9aab','edge':'#283a46',
    'bed':'#96aeb8','soil':'#141c20','mint':'#59ffbc','pink':'#fa7ed5',
    'cyan':'#4febff','amber':'#ffba6c','leaf1':'#48a85c','leaf2':'#99ca53',
    'leaf3':'#25674d','leaf4':'#974e70','glass':'#67b7d6','water':'#336b87','fruit':'#ef5443','stem':'#386642','cucumber':'#4c981f','steel':'#354b56','grass':'#65933c','grass2':'#749e49','bark':'#76634b','stone':'#c3bfaa','lavender':'#9c87da','petal':'#eeaac0','wood':'#a38a65','tractor':'#d9232e','rubber':'#17221b','grain':'#cbb05a','cream':'#eddbb1','barn':'#a83531','blue':'#326da0','mud':'#775b3c','pig':'#e3a298'
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
        node.inputs['Alpha'].default_value = .035
        node.inputs['Roughness'].default_value = .09
    surface_scales={'soil':22,'mud':11,'wood':8,'bark':12,'stone':27,'grass':40,'grass2':35,'barn':20,'cream':26,'rubber':30,'grain':16,'steel':42,'tractor':42}
    if key in surface_scales:
        nodes=mat.node_tree.nodes
        links=mat.node_tree.links
        noise=nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value=surface_scales[key]
        noise.inputs['Detail'].default_value=3
        ramp=nodes.new('ShaderNodeValToRGB')
        for index,factor in enumerate((.73,1.18)):
            ramp.color_ramp.elements[index].color=(*(min(1,c*factor) for c in rgb),1)
        links.new(noise.outputs['Fac'],ramp.inputs[0])
        links.new(ramp.outputs['Color'],node.inputs['Base Color'])
        bump=nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value=.25
        bump.inputs['Distance'].default_value=.085 if key in ('stone','soil','mud','bark') else .025
        links.new(noise.outputs['Fac'],bump.inputs['Height'])
        links.new(bump.outputs['Normal'],node.inputs['Normal'])
        if key in ('tractor','steel'):
            node.inputs['Metallic'].default_value=.43
            node.inputs['Roughness'].default_value=.39
        elif key=='mud':
            node.inputs['Roughness'].default_value=.39
        else:
            node.inputs['Roughness'].default_value=.76
    materials[key] = mat

def add(name, mat, verts, faces, zone=None):
    if zone is not None and zone>=8:
        field_vertices,field_faces=field_meshes.setdefault((zone,mat),([],[]))
        offset=len(field_vertices)
        field_vertices.extend(verts)
        field_faces.extend(tuple(i+offset for i in face) for face in faces)
        parts.append([mat,zone,[[round(q,3) for q in v] for v in verts],faces])
        return
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

def curved_leaf(name,origin,angle,length,width,rise,material,zone):
    x,y,z=origin
    dx,dy=math.cos(angle),math.sin(angle)
    verts=[]
    for row in range(5):
        t=row/4
        spread=width*max(.022,math.sin(math.pi*t))*(1-.25*t)
        for edge in (-1,0,1):
            rib=width*.24*math.sin(math.pi*t)*(1-abs(edge))
            curl=width*.10*math.sin(t*math.pi*5+edge)*abs(edge)
            verts.append((x+dx*length*t-dy*edge*spread,y+dy*length*t+dx*edge*spread,z+rise*math.sin(t*2.1)+rib+curl))
    faces=[]
    for row in range(4):
        k=3*row
        faces.extend(((k,k+3,k+4,k+1),(k+1,k+4,k+5,k+2)))
    obj=add(name,material,verts,faces,zone)
    if obj:
        for polygon in obj.data.polygons:
            polygon.use_smooth=True

def cabbage(x,y,angle,zone):
    ellipsoid('Tight lime cabbage heart',(x,y,.055),(.235,.235,.225),'leaf2',zone)
    for number in range(7):
        a=angle+number*math.tau/7
        dx,dy=math.cos(a),math.sin(a)
        inner=number%2
        vertices=[]
        for row in range(5):
            t=row/4
            radius=.09+.24*math.sin(math.pi*t*.94)
            if inner:
                radius*=.83
            width=.19*math.sin(math.pi*t)**.72+.016
            for edge in (-1,0,1):
                flare=.016*math.sin(number+row*2.3)*abs(edge)
                z=-.15+t*(.44 if inner else .34)+flare+.030*(1-abs(edge))*math.sin(math.pi*t)
                vertices.append((x+dx*radius-dy*width*edge,y+dy*radius+dx*width*edge,z))
        faces=[]
        for row in range(4):
            k=row*3
            faces.extend(((k,k+3,k+4,k+1),(k+1,k+4,k+5,k+2)))
        add('Overlapping cabbage wrapper','leaf1' if inner else 'leaf3',vertices,faces,zone)
        if number%2==0:
            for row in (1,2,3):
                start=Vector(vertices[row*3+1])
                end=Vector(vertices[(row+1)*3+1])
                start.z+=.004
                end.z+=.004
                beam('Raised cabbage midrib',start,end,.012,'leaf2',zone)

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
                    curved_leaf('Crop foliage',verts[0],a,l,w,rise,mat,zone)
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


# Flat lawn and cultivated garden borders around the greenhouse.
box('Flat meadow',(0,0,-.57),(100,100,.28),'grass')
# One acre = 4046.8564 square metres. Square field side is 63.6149 m.
side=math.sqrt(4046.8564224)
for axis in (-1,1):
    beam('One-acre boundary',(-side/2,axis*side/2,-.25),(side/2,axis*side/2,-.25),.10,'wood')
    beam('One-acre boundary',(axis*side/2,-side/2,-.25),(axis*side/2,side/2,-.25),.10,'wood')
grass_zones = (
    (-11,11,-12,12),       # Greenhouse and access
    (-17,-3,13,24),        # Pasture, coop and walking routes
    (-30,-17,23,31),      # Orchard and pond
    (-12,-4,-30,-20),     # Farmhouse, porch, well and pets
    (-2,7,-30,-17),       # Entrance and pickup
    (4,17,13,28),         # Storage, barn, silo and loading yard
    (11,17,-18,-10),      # Tractor and trailer
    (15,31,-31,-23),      # Pig enclosure
    (22,28,8,15),         # Combine and cutting header
)
for x in range(-28,29,3):
    for y in range(-28,29,3):
        if any(left-1.35 < x < right+1.35 and front-1.4 < y < back+1.4
               for left,right,front,back in grass_zones):
            continue
        field_zone=(8 if y<-9 else 9 if y<10 else 10) if x<0 else (11 if y>10 else 12 if y>-10 else 13)
        box('Cultivated crop plot',(x,y,-.38),(2.7,2.8,.1),'soil',field_zone)
        for dx in (-.75,0,.75):
            for dy in (-.8,0,.8):
                px,py=x+dx,y+dy
                height={8:.42,9:.46,10:.32,11:.85,12:1.65,13:1.25}[field_zone]
                if field_zone!=10:
                    beam('Mature crop stalk',(px,py,-.3),(px,py,height),.025,'stem',field_zone)
                angle=random.uniform(0,math.tau)
                if field_zone==10:
                    cabbage(px,py,angle,field_zone)
                elif field_zone==9:
                    for leaf in range(5):
                        curved_leaf('Field rosette leaf',(px,py,-.04),angle+leaf*math.tau/5,.33 if field_zone==10 else .25,.15,.15,'leaf2' if leaf%2 else 'leaf1',field_zone)
                else:
                    for leaf,z in enumerate((height*.23,height*.59)):
                        curved_leaf('Field blade',(px,py,z),angle+leaf*2.4,.47 if field_zone==12 else .26,.095 if field_zone==12 else .045,.16,'leaf2' if leaf else 'leaf1',field_zone)
                if field_zone==11:
                    ellipsoid('Wheat head',(px,py,height+.14),(.065,.065,.2),'grain',field_zone)
                elif field_zone==12:
                    ellipsoid('Corn cob',(px+.1,py,height*.6),(.09,.09,.24),'grain',field_zone)
                elif field_zone==8:
                    ellipsoid('Onion bulb',(px,py,-.17),(.14,.14,.15),'wood',field_zone)
                elif field_zone==13:
                    for berry in range(3):
                        ellipsoid('Field tomato cluster',(px+.09+berry*.06,py+.022*berry,.73-.056*berry),(.062,.064,.064),'fruit',field_zone)
                elif field_zone==9:
                    ellipsoid('Potato foliage',(px,py,.17),(.28,.28,.29),'leaf1',field_zone)
box('Farm storage shed',(8,17,1.2),(5,4,3),'wood')
box('Storage roof',(8,17,2.79),(5.5,4.5,.25),'steel')
box('Storage sliding door',(8,14.97,.94),(2.3,.13,2.3),'edge')
for x in (5.8,10.2):
    box('Produce crate',(x,14.2,-.04),(.72,.65,.67),'wood')
for x,y in ((-16,-11),(19,13)):
    beam('Scarecrow post',(x,y,-.4),(x,y,2.65),.09,'wood')
    beam('Scarecrow arms',(x-.75,y,1.8),(x+.75,y,1.8),.15,'wood')
    box('Scarecrow coat',(x,y,1.49),(.54,.29,.65),'tractor')
    ellipsoid('Scarecrow head',(x,y,2.07),(.21,.21,.25),'wood')
    box('Straw hat',(x,y,2.29),(.61,.53,.1),'grain')
for x,y in ((-9,15),(-7.5,15.7),(-8,17)):
    ellipsoid('Farm sheep fleece',(x,y,.31),(.37,.61,.36),'stone')
    ellipsoid('Sheep head',(x,y-.53,.33),(.19,.22,.25),'rubber')
    for dx in (-.21,.21):
        for dy in (-.35,.35):
            beam('Sheep leg',(x+dx,y+dy,-.35),(x+dx,y+dy,.21),.065,'rubber')
# Red Mahindra-inspired utility tractor, original model without official branding assets.
tx,ty=14,-15
box('Tractor chassis',(tx,ty,.57),(1.45,3.3,.25),'edge')
box('Red tractor bonnet',(tx,ty-.78,1.08),(1.24,1.55,.8),'tractor')
box('Front radiator grille',(tx,ty-1.57,1.03),(1.1,.04,.48),'steel')
for x in (-.44,.44):
    box('Tractor headlight',(tx+x,ty-1.6,1.29),(.22,.05,.15),'amber')
for y,r in ((.95,.73),(-1.06,.49)):
    for sign in (-1,1):
        ellipsoid('Tractor tire',(tx+sign*.92,ty+y,r-.3),(.27,r,r),'rubber')
        ellipsoid('Wheel hub',(tx+sign*1.19,ty+y,r-.3),(.045,r*.46,r*.46),'frame')
box('Operator seat',(tx,ty+.45,1.04),(.67,.66,.16),'rubber')
box('Seat back',(tx,ty+.74,1.32),(.67,.13,.58),'rubber')
for sign in (-1,1):
    box('Rear fender',(tx+sign*.87,ty+.9,1.23),(.6,1.6,.12),'tractor')
    beam('Canopy support',(tx+sign*.65,ty+.9,.8),(tx+sign*.65,ty+.9,2.45),.07,'edge')
box('Tractor sun canopy',(tx,ty+.3,2.47),(1.8,2.2,.12),'tractor')
beam('Exhaust',(tx+.48,ty-.6,1.5),(tx+.48,ty-.6,2.13),.075,'steel')
box('Grass entrance apron',(0,-10.7,-.416),(15,3,.020),'grass2')
for y in (-13.5,-15,-16.5,-18):
    box('Garden stepping stone',(0,y,-.37),(1.8,1.03,.12),'stone')
for side in (-1,1):
    x=side*8.3
    box('Flower border soil',(x,-3,-.25),(1.25,17,.25),'soil')
    for i in range(24):
        px=x+random.uniform(-.48,.48)
        py=-10.5+i*.64
        ellipsoid('Border foliage',(px,py,.03),(.32,.32,.43),'leaf3')
        for j in range(3):
            fx=px+random.uniform(-.18,.18)
            fy=py+random.uniform(-.18,.18)
            beam('Flower stem',(fx,fy,0),(fx,fy,.51),.018,'stem')
            ellipsoid('Border flowers',(fx,fy,.54),(.09,.09,.15),'lavender' if i%3 else 'petal')
for x,y in [(-14,8),(-17,16),(-9,21),(2,24),(13,20),(18,10),(20,-2),(-19,-5)]:
    height=random.uniform(4.7,7.3)
    beam('Tree trunk',(x,y,-.4),(x,y,height*.72),.24,'bark')
    for i in range(8):
        a=i*2.399
        dx,dy=math.cos(a)*1.3,math.sin(a)*1.3
        ellipsoid('Tree canopy',(x+dx,y+dy,height-1+random.random()*1.7),(1.65,1.55,1.85),random.choice(['leaf1','leaf2','leaf3']))
# Gutters, downpipes, roof vent framing and a potting bench.
for x in (-6.12,6.12):
    beam('Rain gutter',(x,-9,3.85),(x,9,3.85),.17,'edge')
    beam('Rainwater downpipe',(x,8.8,3.85),(x,8.8,.2),.095,'edge')
for y in (-4,4):
    for a,b in [((.18,y,6.2),(2,y,5.53)),((.18,y+1.5,6.2),(2,y+1.5,5.53)),((2,y,5.53),(2,y+1.5,5.53))]:
        beam('Roof ventilation frame',a,b,.07,'edge')
box('Potting worktop',(-3,-10.5,.79),(2.6,.65,.13),'wood')
for x in (-4.1,-1.9):
    for y in (-10.74,-10.26):
        beam('Potting bench leg',(x,y,-.1),(x,y,.74),.08,'edge')
for x in (-3.8,-3.2,-2.6):
    ellipsoid('Terracotta pot',(x,-10.5,.98),(.18,.18,.22),'wood')
    ellipsoid('Potted herb',(x,-10.5,1.25),(.25,.25,.25),'leaf1')

# Farmyard buildings, livestock pens and tools.
def building(name,x,y,w,d,h,wall):
    box(name,(x,y,h/2-.4),(w,d,h),wall)
    z=h-.4
    for sign in (-1,1):
        a=x+sign*(w/2+.25)
        add(name+' pitched roof','edge',[(a,y-d/2-.3,z),(a,y+d/2+.3,z),(x,y+d/2+.3,z+w*.28),(x,y-d/2-.3,z+w*.28)],[(0,1,2,3)])
    for front in (-1,1):
        yy=y+front*d/2
        add(name+' gable',wall,[(x-w/2,yy,z),(x+w/2,yy,z),(x,yy,z+w*.28)],[(0,1,2)])
    for dx in (-w*.32,w*.32):
        box(name+' window casing',(x+dx,y-d/2-.04,h*.55),(.95,.10,1.02),'cream')
        box(name+' window',(x+dx,y-d/2-.101,h*.55),(.69,.04,.79),'blue')
        for offset in (-.52,.52):
            box(name+' shutter',(x+dx+offset,y-d/2-.05,h*.55),(.26,.13,.99),'wood')

building('Red barn',8,23,8,6,4.5,'barn')
box('Barn sliding doors',(8,19.95,1.05),(3.1,.16,2.9),'cream')
for dx in (-.75,.75):
    beam('Sliding door diagonal',(8+dx-.6,19.84,.01),(8+dx+.6,19.84,2.15),.11,'barn')
box('Hayloft door',(8,19.94,3.5),(1.2,.13,1.1),'wood')
beam('Weathervane mast',(8,23,6.3),(8,23,7.05),.06,'steel')
beam('Weathervane arrow',(7.55,23,6.93),(8.55,23,6.93),.06,'steel')
building('Farmhouse',-8,-24,6,4,3.1,'cream')
box('Chimney',(-6.7,-23.1,4.18),(.61,.7,1.8),'barn')
box('Porch',(-8,-26.8,-.15),(5,1.7,.32),'wood')
box('Porch awning',(-8,-26.7,2.05),(5,1.65,.14),'edge')
for x in (-10.3,-5.7):
    beam('Porch post',(x,-27.3,0),(x,-27.3,2.05),.12,'wood')
box('House door',(-8,-26.07,.57),(.88,.14,1.9),'wood')
building('Chicken coop',-7,20,2.55,2,1.45,'wood')
beam('Coop ramp',(-7,17.85,-.32),(-7,19.1,.31),.32,'cream')
box('Coop nesting boxes',(-8.35,20,.39),(.62,1.4,.54),'cream')
def round_prop(name,x,y,z,radius,height,material):
    ring=[(x+radius*math.cos(i*math.tau/20),y+radius*math.sin(i*math.tau/20),z) for i in range(20)]
    vertices=ring+[(a,b,c+height) for a,b,c in ring]
    faces=[(i,(i+1)%20,(i+1)%20+20,i+20) for i in range(20)]+[tuple(range(20,40))]
    add(name,material,vertices,faces)
round_prop('Corrugated grain silo',14,23,-.39,1.28,5.4,'frame')
ellipsoid('Silo dome',(14,23,5.02),(1.3,1.3,.91),'steel')
for offset in (-.21,.21):
    beam('Silo ladder',(14+offset,21.69,-.36),(14+offset,21.69,5),.04,'edge')
for z in range(1,15):
    beam('Ladder rung',(13.79,21.65,z*.33),(14.21,21.65,z*.33),.047,'edge')
def fence(x1,y1,x2,y2):
    n=max(1,round(math.hypot(x2-x1,y2-y1)/1.7))
    for i in range(n+1):
        x,y=x1+(x2-x1)*i/n,y1+(y2-y1)*i/n
        beam('Fence post',(x,y,-.4),(x,y,.87),.125,'wood')
    for z in (.18,.61):
        beam('Fence rail',(x1,y1,z),(x2,y2,z),.095,'wood')
for x1,y1,x2,y2 in [(-16,14,-4,14),(-16,14,-16,23),(-16,23,-4,23),(-4,16,-4,23),(16,-30,30,-30),(16,-24,30,-24),(16,-30,16,-24),(30,-30,30,-24)]:
    fence(x1,y1,x2,y2)
beam('Gate diagonal',(-4,14,.1),(-4,16,.69),.10,'wood')
for z in (.16,.65):
    beam('Gate frame',(-4,14,z),(-4,16,z),.10,'wood')
box('Pig field shelter',(26,-28,.28),(3,2,1.2),'wood')
box('Pig shelter roof',(26,-28,.94),(3.4,2.5,.22),'barn')
ellipsoid('Mud wallow',(23,-27,-.39),(1.6,1.08,.05),'mud')
ellipsoid('Duck pond',(-26,27,-.38),(3.1,2.5,.06),'water')
def animal(name,x,y,scale,fur,stance=1):
    cow='cow' in name.lower()
    horse=name=='Horse'
    pig=name=='Pig'
    h=.80*scale*stance-.29
    def anatomy(label,point,size,material=fur):
        px,py,pz=point
        obj=ellipsoid(name+' '+label,(x+px*scale,y+py*scale,h+pz*scale),tuple(v*scale for v in size),material)
        if obj:
            for polygon in obj.data.polygons:
                polygon.use_smooth=True
    anatomy('ribcage',(0,0,0),(.47,.78,.44))
    anatomy('hip',(0,.55,.03),(.41,.43,.42))
    anatomy('shoulder',(0,-.48,.02),(.40,.38,.39))
    neck=.39 if horse else .18 if cow else .10
    anatomy('neck',(0,-.62,neck*.53),(.27,.38,.32 if horse or cow else .19))
    anatomy('head',(0,-.84,neck),(.245,.30,.27))
    anatomy('muzzle',(0,-1.06,neck-.10),(.23,.22,.14),'pig' if cow else 'cream' if pig else 'rubber')
    for sign in (-1,1):
        anatomy('ear',(sign*.25,-.75,neck+.20),(.17,.12,.075))
        anatomy('eye',(sign*.211,-.94,neck+.061),(.039,.048,.039),'rubber')
        anatomy('nostril',(sign*.092,-1.24,neck-.077),(.028,.021,.025),'rubber')
        if cow:
            anatomy('horn',(sign*.17,-.74,neck+.28),(.061,.074,.11),'cream')
            if fur=='cream':
                anatomy('coat patch',(sign*.416,.19,.07),(.073,.285,.23),'bark')
        for dy in (-.45,.51):
            anatomy('upper leg',(sign*.26,dy,-.19),(.15,.19,.34 if stance>.8 else .17))
            if stance>.8:
                beam(name+' lower leg',(x+sign*.26*scale,y+dy*scale,-.29),(x+sign*.26*scale,y+dy*scale,h-.23*scale),.10*scale,fur)
            ellipsoid(name+' hoof',(x+sign*.26*scale,y+dy*scale,-.31),(.086*scale,.12*scale,.075*scale),'rubber')
    if horse:
        anatomy('mane',(0,-.53,.40),(.115,.31,.23),'rubber')
    beam(name+' tail',(x,y+.70*scale,h+.20*scale),(x+.10*scale,y+.89*scale,h-.26*scale),.052*scale,fur)
    anatomy('tail tuft',(.10,.90,-.26),(.08,.08,.14),'rubber')
animal('Grazing cow',-13,17,1.2,'cream')
animal('Resting cow',-12,21,1.2,'bark',.43)
animal('Horse',-7,16,1.27,'bark',1.24)
box('Horse saddle',(-7,16,.98),(.73,.61,.17),'steel')
animal('Pig',23,-27,.7,'pig',.5)
animal('Pig',25,-26,.7,'pig',.72)
animal('Farm dog',-5,-27,.42,'bark')
animal('Porch cat',-9,-27,.26,'steel')
for name,x,y,mat in [('Hen',-7,18,'cream'),('Hen',-6,18.3,'cream'),('Rooster',-8,18,'barn'),('Duck',-26,27,'cream'),('Duck',-25,26,'cream')]:
    ellipsoid(name+' body',(x,y,-.10),(.17,.27,.19),mat)
    ellipsoid(name+' head',(x,y-.21,.10),(.095,.12,.11),mat)
    ellipsoid(name+' beak',(x,y-.33,.07),(.06,.10,.045),'grain')
box('Dirt entrance road',(0,-24,-.402),(3.4,11.5,.04),'mud')
for x in (-.83,.83):
    box('Tire track',(x,-24,-.379),(.24,11.4,.014),'bark')
box('Grass farmyard',(-5,-23,-.416),(5,5,.020),'grass2')
box('Water trough',(-11,14.8,-.05),(2.1,.72,.62),'steel')
box('Trough water',(-11,14.8,.274),(1.83,.51,.022),'water')
beam('Hand pump',(-12,14.8,-.32),(-12,14.8,1),.12,'frame')
beam('Pump handle',(-12,14.8,.93),(-12,15.34,1.08),.08,'edge')
for x,y in [(10,19),(6,18),(16,18),(12,18)]:
    box('Square hay bale',(x,y,-.02),(1.08,.68,.70),'grain')
    for dx in (-.24,.24): box('Baling twine',(x+dx,y,.335),(.035,.69,.024),'wood')
box('Blue combine chassis',(25,12,.84),(2.8,3.6,1.4),'blue')
box('Combine glazed cab',(24.4,11.55,2.02),(1.25,1.35,1.15),'glass')
box('Combine cab roof',(24.4,11.55,2.65),(1.5,1.5,.14),'blue')
box('Combine cutting header',(25,9.55,.22),(4.4,.78,.49),'blue')
beam('Combine reel',(22.8,9.25,.61),(27.2,9.25,.61),.17,'steel')
box('Pickup chassis',(5.3,-27,.22),(1.65,3.25,.48),'steel')
box('Pickup cab',(5.3,-27.5,.8),(1.49,1.24,.85),'blue')
box('Pickup windshield',(5.3,-28.15,.98),(1.25,.055,.38),'glass')
box('Pickup bed',(5.3,-26,.53),(1.6,1.35,.22),'blue')
box('Tractor trailer',(14,-12.3,.35),(1.55,2.05,.36),'wood')
for x,y in [(25,12),(5.3,-27),(14,-12.3)]:
    for dx in (-.83,.83):
        for dy in (-.81,.81): ellipsoid('Equipment wheel',(x+dx,y+dy,-.02),(.19,.39,.40),'rubber')
for x in (-24,-22,-20):
    for y in (26,29):
        beam('Orchard trunk',(x,y,-.4),(x,y,1.55),.16,'bark')
        ellipsoid('Apple tree crown',(x,y,1.95),(.95,.85,.9),'leaf1')
        for dx in (-.48,.06,.42):
            ellipsoid('Orchard fruit',(x+dx,y-.6,1.77),(.12,.12,.12),'fruit')
for x in range(-31,32,2):
    ellipsoid('Boundary stone',(x,31,-.14),(.95,.30,.3),'stone')
for x in range(-30,31,2):
    ellipsoid('Hedge',(x,-31,.04),(.97,.44,.49),'leaf3')
for i in range(30):
    x=random.uniform(-7,-3); y=random.uniform(-25,-22)
    ellipsoid('Entrance gravel',(x,y,-.351),(.075,.11,.022),'stone')
for x in (-11,-8):
    beam('Clothesline pole',(x,-28.8,-.37),(x,-28.8,1.4),.11,'wood')
beam('Clothesline',(-11,-28.8,1.34),(-8,-28.8,1.34),.025,'cream')
for i,mat in enumerate(('cream','blue','barn')):
    box('Laundry',(-10.5+i*.8,-28.8,.99),(.45,.035,.67),mat)
round_prop('Stone well',-4.7,-24,-.4,.62,.6,'stone')
for x in (-5.29,-4.11):
    beam('Well post',(x,-24,-.4),(x,-24,1.2),.07,'wood')
beam('Well crossbar',(-5.29,-24,1.14),(-4.11,-24,1.14),.08,'wood')
beam('Well rope',(-4.7,-24,1.14),(-4.7,-24,.5),.022,'wood')
round_prop('Well bucket',-4.7,-24,.28,.14,.23,'steel')
beam('Mailbox post',(2.1,-29,-.4),(2.1,-29,.68),.09,'wood')
box('Roadside mailbox',(2.1,-29,.75),(.49,.27,.28),'barn')
for i,name in enumerate(('Pitchfork','Shovel','Rake','Hoe')):
    x=5.8+i*.43
    beam(name+' handle',(x,19.5,-.32),(x+.21,19.93,.95),.032,'wood')
    box(name+' head',(x,19.51,-.20),(.18,.065,.19),'steel')
for i in range(3):
    round_prop('Milk can',10.65+i*.32,19.5,-.37,.115,.36,'frame')
    ellipsoid('Feed sack',(5.5+i*.43,19.35,-.15),(.23,.15,.28),'cream')
box('Wheelbarrow basin',(-1.3,-11,.1),(.66,.87,.30),'blue')
ellipsoid('Wheelbarrow wheel',(-1.3,-11.6,-.17),(.085,.18,.18),'rubber')
# Roof ventilation flaps, drainage grates and perimeter planting.
for y in (-4,4):
    add('Raised roof vent','glass',[(.2,y,6.19),(2,y,5.88),(2,y+1.5,5.88),(.2,y+1.5,6.19)],[(0,1,2,3)])
    beam('Vent actuator',(1.73,y+.75,5.56),(1.91,y+.75,5.83),.06,'steel')
for x in (-6.9,6.9):
    box('Exterior drain channel',(x,0,-.273),(.22,17,.12),'edge')
    for y in range(-8,9):
        beam('Drain grate',(x-.105,y,-.2),(x+.105,y,-.2),.035,'steel')
for x,y in ((-32,-18),(-35,8),(-36,20),(-30,34),(-15,35),(0,37),(14,36),(29,34),(35,18),(36,2),(34,-20)):
    beam('Perimeter tree trunk',(x,y,-.4),(x,y,4),.32,'bark')
    for dx,dy,z in ((0,0,5.6),(-1.1,.4,4.75),(1.1,-.4,4.95)):
        ellipsoid('Perimeter foliage',(x+dx,y+dy,z),(1.7,1.6,1.85),'leaf3' if dx<0 else 'leaf1')
for x,y in ((-8,-22),(-12,-24),(-9,-28)):
    ellipsoid('Dry lawn patch',(x,y,-.392),(1.1,.7,.015),'grain')
for x,y in ((6,20),(10,20),(-11,14)):
    ellipsoid('Shallow puddle',(x,y,-.355),(.81,.49,.026),'water')
for z in (.02,.37,.72):
    beam('Crop wire strand',(-30,9,z),(-18,9,z),.016,'steel')
for x in range(-30,-17,3):
    beam('Wire fence stake',(x,9,-.38),(x,9,.86),.066,'wood')
box('Workshop bench',(6.4,17,.52),(1.35,.5,.12),'wood')
for x in (5.9,6.9):
    beam('Workbench leg',(x,17,-.38),(x,17,.49),.078,'edge')
for x in (6.9,7.3):
    round_prop('Workshop barrel',x,15,-.38,.18,.59,'wood')
for j in range(4):
    box('Pallet slat',(4.6+j*.17,19.1,-.31),(.13,.75,.09),'wood')
ellipsoid('Loose straw pile',(4.4,20,-.27),(.75,.46,.21),'grain')
for x,y in ((16,18),(17.4,18.5)):
    ellipsoid('Round hay roll',(x,y,.08),(.61,.52,.54),'grain')

# Storage loading bay and machinery details.
box('Shed loading awning',(8,14.15,2.17),(4.95,1.5,.10),'steel')
for x in (5.72,10.28):
    beam('Awning upright',(x,13.48,-.39),(x,13.48,2.21),.10,'edge')
    beam('Awning brace',(x,13.48,1.63),(x,14.22,2.12),.065,'wood')
box('Loading pallet',(8.9,14.14,-.30),(1,.68,.14),'wood')
for x in (7.68,8.32):
    beam('Storage door pull',(x,14.87,.74),(x,14.87,1.08),.06,'steel')
for x in (6.35,6.65,6.95,7.25,7.55):
    beam('Shed upper vent fin',(x,14.96,2.27),(x+.19,14.96,2.27),.04,'steel')
for x in (13.32,14.68):
    beam('Trailer side rail',(x,-13.20,.63),(x,-11.35,.63),.058,'tractor')
    for y in (-13.2,-12.25,-11.35):
        beam('Trailer side stake',(x,y,.34),(x,y,.65),.064,'wood')
for x in (13.42,14.58):
    box('Tractor rear reflector',(x,-14.02,.71),(.14,.045,.11),'amber')

for (zone,mat),(verts,faces) in field_meshes.items():
    name=f'Field {zone-7:02d} {mat}'
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(materials[mat])

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


area('Moon key',(4,-8,16),(0,0,0),4100,(.68,.82,1),11)
area('Teal rim',(-11,4,8),(0,0,2),3800,(.17,1,.75),8)
area('Violet fill',(10,9,9),(0,0,2),3200,(.75,.38,1),10)
for x in (-4.28,-1.99,1.99,4.28):
    for y in (-4,4):
        area('Canopy illumination',(x,y,2.8),(x,y,0),100,(.72,.83,1),4)
scene=bpy.context.scene
scene.world=bpy.data.worlds.new('Blue hour')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.40,.65,.85,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
def camera(name,position,target,lens):
    data=bpy.data.cameras.new(name)
    data.lens=lens
    obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    obj.location=position
    orient(obj,target)
    return obj
sun_data=bpy.data.lights.new('Afternoon sun','SUN')
sun_data.energy=2.4
sun_data.angle=.10
sun=bpy.data.objects.new('Afternoon sun',sun_data)
bpy.context.collection.objects.link(sun)
sun.rotation_euler=(.55,-.4,-.4)
scene.camera=camera('Exterior',(22,-27,17),(0,0,1.7),46)
camera('Aisle',(0,-8.8,1.84),(0,5,1.65),22)
scene.render.engine='CYCLES'
scene.cycles.samples=12
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
if '--skip-render' in __import__('sys').argv:
    raise SystemExit(0)
bpy.ops.render.render(write_still=True)
scene.camera=camera('Cabbage detail',(-21.02,18.5,.96),(-22,20,.055),46)
scene.render.resolution_x=840
scene.render.resolution_y=520
scene.render.filepath=str(root/'assets'/'crop-10.jpg')
bpy.ops.render.render(write_still=True)


