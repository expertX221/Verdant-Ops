function createFarmRenderer(canvas, geometry) {
  const gl = canvas.getContext('webgl2', {alpha:true, antialias:true});
  if (!gl) return null;

  const sunlight = `
    vec3 sunDirection(){return normalize(vec3(-.46,-.43,.78));}
    vec3 lightSpace(vec3 p){
      vec3 sun=sunDirection();
      vec3 horizontal=normalize(cross(sun,vec3(0,0,1)));
      return vec3(dot(p,horizontal)/49.,
        dot(p,cross(horizontal,sun))/49.,-dot(p,sun)/66.);
    }
  `;
  const vertexSource = `#version 300 es
    in vec3 position, normal, tint;
    in float zone, finish;
    uniform vec3 eye, right, up, forward;
    uniform vec2 scale;
    uniform float shadowPass;
    out vec3 world, vNormal, color;
    out float depth;
    flat out float bed, material;
    ${sunlight}
    void main() {
      vec3 delta=position-eye;
      depth=dot(delta,forward);
      gl_Position=vec4(dot(delta,right)*scale.x,
        dot(delta,up)*scale.y-depth*.06,
        depth*1.00180-.36032,depth);
      if(shadowPass>.5) gl_Position=vec4(lightSpace(position),1.);
      world=position;
      vNormal=normal;
      color=tint;
      bed=zone;
      material=finish;
    }`;
  const fragmentSource = `#version 300 es
    precision highp float;
    in vec3 world, vNormal, color;
    in float depth;
    flat in float bed, material;
    uniform vec3 eye;
    uniform float alertBed, picking, shadowPass, useShadows;
    uniform highp sampler2DShadow sunMap;
    out vec4 pixel;
    float grain(vec3 p) {
      return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);
    }
    ${sunlight}
    void main() {
      if(shadowPass>.5){pixel=vec4(0.);return;}
      if(picking>.5){pixel=vec4(bed/255.,0,0,1);return;}
      vec3 normal=normalize(gl_FrontFacing?vNormal:-vNormal);
      vec3 sight=normalize(eye-world);
      float edge=pow(1.-abs(dot(normal,sight)),3.);
      if(material==1.){
        vec3 reflection=mix(vec3(.42,.66,.72),vec3(.82,.93,1.),abs(normal.z));
        pixel=vec4(reflection,.08+.29*edge);return;
      }
      if(material==2.){
        pixel=vec4(bed>0.&&bed==alertBed?vec3(1.,.71,.38):color,1.);return;
      }
      vec3 sun=sunDirection();
      float diffuse=max(0.,dot(normal,sun));
      float sky=normal.z*.5+.5;
      float light=1.;
      if(useShadows>.5){
        vec3 shadow=lightSpace(world)*.5+.5;
        if(all(greaterThan(shadow,vec3(0.))) && all(lessThan(shadow,vec3(1.)))){
          shadow.z-=.0008+.002*(1.-diffuse);
          light=mix(.25,1.,texture(sunMap,shadow));
        }
      }
      vec3 shade=color*(.54+.47*diffuse*light+.13*sky);
      if(material==3.){
        float detail=grain(floor(world*56.));
        shade*=.90+.17*detail;
      }
      if(material==4. || material==5.){
        float gleam=pow(max(0.,dot(normal,normalize(sun+sight))),material==5.?22.:35.);
        shade+=vec3(.87,.91,.93)*gleam*light*(material==5.?.29:.14);
      }
      float haze=smoothstep(38.,145.,depth)*.20;
      pixel=vec4(mix(shade,vec3(.66,.76,.72),haze),1.);
    }`;
  function compile(type, source){
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const program=gl.createProgram();
  const vertex=compile(gl.VERTEX_SHADER,vertexSource);
  const fragment=compile(gl.FRAGMENT_SHADER,fragmentSource);
  gl.attachShader(program,vertex);
  gl.attachShader(program,fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));

  const attributes=['position','normal','tint','zone','finish'].map(name=>gl.getAttribLocation(program,name));
  const uniforms=Object.fromEntries(['eye','right','up','forward','scale','alertBed','picking','shadowPass','useShadows','sunMap']
    .map(name=>[name,gl.getUniformLocation(program,name)]));
  const palette=Object.fromEntries(Object.entries(geometry.palette).map(([key,hex])=>[
    key,hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255)
  ]));
  const finishType=type=>{
    if(type==='glass') return 1;
    if(['mint','pink','cyan','amber'].includes(type)) return 2;
    if(['grass','grass2','soil','mud','stone','wood','bark','grain'].includes(type)) return 3;
    if(type==='fruit' || type==='cucumber') return 5;
    return ['tractor','steel','frame','water','blue'].includes(type)?4:0;
  };
  // Static triangles are uploaded once. Each frame changes only camera uniforms.
  const groups=new Map();
  for(const [type,zone,vertices,faces] of geometry.parts){
    const kind=type==='glass'?2:vertices.some(v=>v[2]>2.15)?1:0;
    const field=zone>=8?zone:-1;
    const key=kind+':'+field;
    if(!groups.has(key)) groups.set(key,{kind,field,parts:[]});
    groups.get(key).parts.push({vertices,faces,color:palette[type],bed:zone===null?0:zone+1,finish:finishType(type)});
  }
  const batches=Array.from(groups.values(),({kind,field,parts})=>{
    const count=parts.reduce((sum,part)=>sum+part.faces.reduce((n,face)=>n+(face.length-2)*3,0),0);
    const data=new Float32Array(count*11);
    let offset=0;
    for(const {vertices,faces,color,bed,finish} of parts){
      for(const face of faces){
        const a=vertices[face[0]],b=vertices[face[1]],c=vertices[face[2]];
        const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
        const ex=c[0]-a[0],ey=c[1]-a[1],ez=c[2]-a[2];
        const nx=dy*ez-dz*ey,ny=dz*ex-dx*ez,nz=dx*ey-dy*ex;
        const length=Math.hypot(nx,ny,nz)||1;
        for(let i=1;i<face.length-1;i++){
          for(const index of [face[0],face[i],face[i+1]]){
            const point=vertices[index];
            data[offset++]=point[0];data[offset++]=point[1];data[offset++]=point[2];
            data[offset++]=nx/length;data[offset++]=ny/length;data[offset++]=nz/length;
            data[offset++]=color[0];data[offset++]=color[1];data[offset++]=color[2];
            data[offset++]=bed;data[offset++]=finish;
          }
        }
      }
    }
    const vao=gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    attributes.forEach((attribute,i)=>{
      gl.enableVertexAttribArray(attribute);
      gl.vertexAttribPointer(attribute,i<3?3:1,gl.FLOAT,false,44,[0,12,24,36,40][i]);
    });
    let bounds=null;
    if(field>=0){
      const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
      for(const part of parts) for(const point of part.vertices){
        for(let i=0;i<3;i++){
          low[i]=Math.min(low[i],point[i]);
          high[i]=Math.max(high[i],point[i]);
        }
      }
      bounds={center:low.map((v,i)=>(v+high[i])*.5),
        radius:Math.hypot(...high.map((v,i)=>(v-low[i])*.5))};
    }
    return {vao,count,kind,bounds};
  });
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.DITHER);
  gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  const shadowSize=1536;
  const depthTexture=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,depthTexture);
  gl.texStorage2D(gl.TEXTURE_2D,1,gl.DEPTH_COMPONENT24,shadowSize,shadowSize);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const shadowBuffer=gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER,shadowBuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,depthTexture,0);
  gl.drawBuffers([gl.NONE]);
  gl.readBuffer(gl.NONE);
  const shadows=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
  function draw({vao,count}){
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES,0,count);
  }
  if(shadows){
    // Sample from a separate, valid depth texture during the one-time shadow pass.
    const placeholder=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,placeholder);
    gl.texStorage2D(gl.TEXTURE_2D,1,gl.DEPTH_COMPONENT24,1,1);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.useProgram(program);
    gl.uniform1f(uniforms.shadowPass,1);
    gl.viewport(0,0,shadowSize,shadowSize);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    batches.filter(batch=>batch.kind!==2).forEach(draw);
    gl.uniform1f(uniforms.shadowPass,0);
    gl.deleteTexture(placeholder);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.bindTexture(gl.TEXTURE_2D,depthTexture);
  const sample=new Uint8Array(4);
  function render(camera,w,h,view,alert,point){
    const ratio=Math.min(window.devicePixelRatio||1,1.5,Math.sqrt(1600000/(w*h)));
    const width=Math.round(w*ratio),height=Math.round(h*ratio);
    if(canvas.width!==width || canvas.height!==height){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,width,height);
    const x=Math.min(width-1,Math.max(0,Math.floor((point?.[0]??0)*width/w)));
    const y=Math.min(height-1,Math.max(0,height-1-Math.floor((point?.[1]??0)*height/h)));
    if(point){gl.enable(gl.SCISSOR_TEST);gl.scissor(x,y,1,1);}
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    for(const name of ['eye','right','up','forward']) gl.uniform3fv(uniforms[name],camera[name]);
    gl.uniform2f(uniforms.scale,camera.focal*2/w,camera.focal*2/h);
    gl.uniform1f(uniforms.alertBed,alert);
    gl.uniform1f(uniforms.picking,point?1:0);
    gl.uniform1f(uniforms.useShadows,shadows&&!point&&view!=='plan'?1:0);
    for(const batch of batches){
      if(batch.kind===2 || (view==='plan' && batch.kind===1)) continue;
      if(batch.bounds){
        const {center,radius}=batch.bounds;
        const [vx,vy,vz]=camera.convert(center);
        if(vz+radius<.18) continue;
        if(Math.abs(vx)>w*(vz+radius)/(2*camera.focal)+radius) continue;
        if(Math.abs(vy)>h*.54*(vz+radius)/camera.focal+radius) continue;
      }
      draw(batch);
    }
    if(!point && view!=='plan' && view!=='aisle'){
      gl.enable(gl.BLEND);
      gl.depthMask(false);
      batches.filter(batch=>batch.kind===2).forEach(draw);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
    if(point){
      gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,sample);
      gl.disable(gl.SCISSOR_TEST);
      return sample[0]-1;
    }
  }
  return render;
}
