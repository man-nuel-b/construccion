/* INGEBAM Muebles360 V2 — visor opcional con Three.js (solo si hay conexión).
   Importa un único CDN vía importmap, sin credenciales. El visor local es fallback. */
(function(root){'use strict';
function withTimeout(promise,ms){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('No se pudo cargar Three.js a tiempo. Sigue disponible el visor local.')),ms))]);}
async function createThreeViewer(host,onSelect){
 const [{default:unused,...THREE},controlsModule]=await withTimeout(Promise.all([import('three'),import('three/addons/controls/OrbitControls.js')]),12000);
 const {OrbitControls}=controlsModule;
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
 renderer.setSize(host.clientWidth,host.clientHeight);
 renderer.setClearColor(0x15202d,1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.domElement.className='webgl-canvas';renderer.domElement.setAttribute('aria-label','Visor Three.js: arrastrar para girar, clic para seleccionar');
 host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#172231');
 const camera=new THREE.PerspectiveCamera(38,Math.max(1,host.clientWidth)/Math.max(1,host.clientHeight),.015,100);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=.65;controls.maxDistance=13;controls.maxPolarAngle=Math.PI*.94;
 const ambient=new THREE.HemisphereLight(0xdceafd,0x655345,1.8);scene.add(ambient);
 function directional(color,intensity,x,y,z,shadow=false){const d=new THREE.DirectionalLight(color,intensity);d.position.set(x,y,z);d.castShadow=shadow;if(shadow){d.shadow.mapSize.set(2048,2048);d.shadow.camera.left=-5;d.shadow.camera.right=5;d.shadow.camera.top=5;d.shadow.camera.bottom=-5;d.shadow.camera.near=.1;d.shadow.camera.far=25;d.shadow.bias=-.00015;d.shadow.normalBias=.035;d.shadow.radius=3;}scene.add(d)}
 directional(0xffe5c6,3.0,-3,6,4,true);directional(0xc3d9ff,1.55,3,3,-3);directional(0xffffff,.8,0,4,6);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshStandardMaterial({color:0x1d2b38,roughness:.93}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.006;scene.add(floor);
 const grid=new THREE.GridHelper(8,24,0x506475,0x324252);grid.position.y=0.001;grid.material.transparent=true;grid.material.opacity=.42;scene.add(grid);
 const modelGroup=new THREE.Group();scene.add(modelGroup);
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let model=null,isOpen=false,selectedId=null,meshById=new Map(),animationObjects=[],modelMaterials=[];
 let raf=0,dragX=0,dragY=0;
 function finishTexture(color){
  const cvs=document.createElement('canvas');cvs.width=256;cvs.height=256;const ctx=cvs.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,256,256);
  // Veta sutil reproducible, solo efecto visual; no representa textura de proveedor.
  const wood=['roble','nogal'].some(key=>root.MueblesCore.FINISHES[key].color===color);
  if(wood){for(let i=0;i<350;i++){const x=(i*127.7)%256,amp=(i*13.9)%17;ctx.strokeStyle=i%5?'#ffffff0b':'#160b0830';ctx.lineWidth=.3+(i%4)*.14;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+amp,85,x-amp,175,x+Math.sin(i)*4,256);ctx.stroke();}}
  const tex=new THREE.CanvasTexture(cvs);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return tex;
 }
 function clearMeshes(){modelGroup.traverse(o=>{if(o.geometry)o.geometry.dispose()});while(modelGroup.children.length)modelGroup.remove(modelGroup.children[0]);for(const mat of modelMaterials){if(mat.map)mat.map.dispose();mat.dispose()}modelMaterials=[];meshById.clear();animationObjects=[];}
 function setModel(newModel){clearMeshes();model=newModel;const finish=root.MueblesCore.FINISHES[model.params.finish]||root.MueblesCore.FINISHES.roble;
  const woodMat=new THREE.MeshStandardMaterial({color:0xffffff,map:finishTexture(finish.color),roughness:.63,metalness:0});
  const interiorMat=new THREE.MeshStandardMaterial({color:0xe1dcd2,roughness:.74});
  const backMat=new THREE.MeshStandardMaterial({color:0xb9b9b4,roughness:.87});
  const stoneMat=new THREE.MeshStandardMaterial({color:0x515d69,roughness:.27,metalness:.02});
  const metalMat=new THREE.MeshStandardMaterial({color:0xc5b99c,roughness:.26,metalness:.65});
  const panelMat=new THREE.MeshStandardMaterial({color:0xeee9df,map:finishTexture(finish.color),roughness:.66,metalness:0});
  modelMaterials.push(woodMat,interiorMat,backMat,stoneMat,metalMat,panelMat);
  for(const part of newModel.parts){const mat=part.kind==='front'||part.kind==='body'?woodMat:part.kind==='countertop'?stoneMat:part.kind==='back'?backMat:interiorMat;
   const geo=new THREE.BoxGeometry(part.dx/1000,part.dy/1000,part.dz/1000);
   const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.part=part;mesh.position.set(part.x/1000,part.y/1000,part.z/1000);
   if(part.motion==='door'){
    const hinge=part.hingeSide==='left'?-1:1;
    const pivot=new THREE.Group();pivot.position.set((part.x+hinge*part.dx/2)/1000,part.y/1000,part.z/1000);
    mesh.position.set(-hinge*part.dx/2000,0,0);pivot.add(mesh);modelGroup.add(pivot);
    animationObjects.push({type:'door',obj:pivot,side:hinge});
   }else {modelGroup.add(mesh);if(part.motion==='drawer')animationObjects.push({type:'drawer',obj:mesh,baseZ:part.z/1000})}
   if(part.kind==='front'){
    if(model.params.frontStyle==='marco'&&part.motion==='door'){
     const panelWidth=Math.max(.04,part.dx/1000-.12),panelHeight=Math.max(.04,part.dy/1000-.14);
     const decorativePanel=new THREE.Mesh(new THREE.BoxGeometry(panelWidth,panelHeight,.005),panelMat);
     decorativePanel.position.set(0,0,part.dz/2000+.003);decorativePanel.castShadow=true;
     mesh.add(decorativePanel);
    }
    const isDrawer=part.motion==='drawer';const handle=new THREE.Mesh(new THREE.BoxGeometry(isDrawer?Math.min(.145,part.dx/3000):.014,isDrawer?.015:.138,.018),metalMat);
    handle.position.set(isDrawer?0:(part.hingeSide==='left'?.35:-.35)*part.dx/1000,isDrawer?0:-Math.min(.16,part.dy/5000),part.dz/2000+.017);
    handle.castShadow=true;mesh.add(handle);
   }
   meshById.set(part.id,mesh);
  }
  const v=Math.max(model.params.width,model.params.height,model.params.depth)/1000;
  controls.target.set(0,model.params.height/2000,0);camera.position.set(v*1.38,v*.95,v*1.65);camera.near=.02;camera.far=100;camera.updateProjectionMatrix();controls.minDistance=Math.max(.5,v*.32);controls.maxDistance=15;
  controls.update();selectedId=null;applyDoorsState();
 }
 function applyDoorsState(){for(const a of animationObjects){if(a.type==='door')a.obj.rotation.y=isOpen*(a.side===-1?-1.07:1.07);else a.obj.position.z=a.baseZ+(isOpen?.18:0)}}
 function toggle(){isOpen=!isOpen;applyDoorsState();return isOpen}
 function setView(which){if(!model)return;const v=Math.max(model.params.width,model.params.height,model.params.depth)/1000*1.8;const y=model.params.height/2000;controls.target.set(0,y,0);if(which==='front')camera.position.set(0,y,v);else if(which==='side')camera.position.set(v,y,0);else if(which==='top')camera.position.set(.001,y+v,.001);else camera.position.set(v*.86,y+v*.4,v);controls.update()}
 function reset(){setView('perspective')}
 function selectModule(i){for(const mesh of meshById.values()){const part=mesh.userData.part;mesh.scale.setScalar(part.moduleIndex===i?1.003:1);}}
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}
 const ro=new ResizeObserver(resize);ro.observe(host);
 const onDown=e=>{dragX=e.clientX;dragY=e.clientY};
 const onUp=e=>{if(Math.abs(e.clientX-dragX)+Math.abs(e.clientY-dragY)>6)return;const rect=renderer.domElement.getBoundingClientRect();pointer.x=(e.clientX-rect.left)/rect.width*2-1;pointer.y=-(e.clientY-rect.top)/rect.height*2+1;raycaster.setFromCamera(pointer,camera);const targets=[...meshById.values()];const hits=raycaster.intersectObjects(targets,true);const hit=hits.find(x=>x.object.userData.part||x.object.parent?.userData.part);const part=hit?.object.userData.part||hit?.object.parent?.userData.part||null;selectedId=part?.id||null;onSelect?.(part)};
 renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointerup',onUp);
 function tick(){raf=requestAnimationFrame(tick);controls.update();renderer.render(scene,camera)}tick();
 return{setModel,toggle,reset,setView,resize,selectModule,get isOpen(){return isOpen},set isOpen(v){isOpen=Boolean(v);applyDoorsState()},dispose(){cancelAnimationFrame(raf);ro.disconnect();controls.dispose();clearMeshes();renderer.dispose();renderer.domElement.remove();}};
}
root.INGEBAMThree={createThreeViewer};
})(window);
