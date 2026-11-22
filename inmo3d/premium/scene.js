import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { enhancePremiumScene } from './premium-details-v111.js';
import { addArchitecturalFinish } from './premium-finish-v112.js';
import { createExteriorRealism } from './exterior-realism-v113.js';
import { createCinematicPipeline } from './cinematic-pipeline-v114.js';
import { createPhotoStudio } from './photo-studio-v115.js';

const status = document.querySelector('#status');
try {
const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance', alpha:false, preserveDrawingBuffer:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
document.body.prepend(renderer.domElement);

const scene=new THREE.Scene();
scene.background=new THREE.Color('#bfd1df');
scene.fog=new THREE.Fog('#c4d4db',42,110);
const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.08,180);
camera.position.set(17,10.3,19);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.065;
controls.target.set(0,1.8,0);controls.minDistance=7;controls.maxDistance=52;
controls.maxPolarAngle=Math.PI*.485;
controls.update();

function seededTexture(kind, size=512){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const c=canvas.getContext('2d');c.fillStyle=kind==='wood'?'#b28a61':kind==='stone'?'#aaa69d':'#e8e5df';
 c.fillRect(0,0,size,size);
 let seed=kind==='wood'?12:29;
 const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 if(kind==='wood'){
   for(let i=0;i<1900;i++){
     const x=rng()*size,y=rng()*size;
     c.strokeStyle='rgba(55,28,13,'+(rng()*.12)+')';
     c.lineWidth=.25+rng()*1.5;c.beginPath();
     c.moveTo(x,y);c.bezierCurveTo(x+15,y+rng()*4-2,x+110,y+rng()*6-3,x+size,y+rng()*9-4);c.stroke();
   }
 } else {
  for(let i=0;i<28000;i++){const x=rng()*size,y=rng()*size,v=Math.floor(rng()*90);
   c.fillStyle='rgba('+v+','+v+','+v+','+(rng()*.08)+')';c.fillRect(x,y,1+rng()*3,1+rng()*3);}
 }
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
 return t;
}
const woodTex=seededTexture('wood'), stoneTex=seededTexture('stone');
const mat={
  white:new THREE.MeshStandardMaterial({color:'#e9e7de',roughness:.84,metalness:0}),
  dark:new THREE.MeshStandardMaterial({color:'#292c2b',roughness:.43,metalness:.22}),
  black:new THREE.MeshStandardMaterial({color:'#1a2225',roughness:.35,metalness:.42}),
  warm:new THREE.MeshStandardMaterial({color:'#d9c5a9',roughness:.83}),
  wood:new THREE.MeshStandardMaterial({map:woodTex,roughness:.58,metalness:0}),
  stone:new THREE.MeshStandardMaterial({map:stoneTex,roughness:.91,metalness:0}),
  glass:new THREE.MeshPhysicalMaterial({color:'#e2edf2',roughness:.048,metalness:0,transmission:.82,thickness:.18,ior:1.49,transparent:true,opacity:.94,envMapIntensity:1.2,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#ffe0aa',emissive:'#ffc078',emissiveIntensity:2.1}),
  grass:new THREE.MeshStandardMaterial({color:'#637d4f',roughness:1}),
  bush:new THREE.MeshStandardMaterial({color:'#4b6940',roughness:1}),
  gravel:new THREE.MeshStandardMaterial({color:'#b6b0a1',roughness:.97}),
  upholstery:new THREE.MeshStandardMaterial({color:'#c7b9a3',roughness:.97}),
};
const ground=box(200,.15,200,0,-.12,0,mat.grass);ground.receiveShadow=true;
box(31,.12,20,0,.01,0,mat.gravel);
box(14,.30,9,0,.22,-.25,mat.stone);
box(12,.32,7,0,.52,-.65,mat.white);
box(12,3.5,.35,0,2.35,-4.05,mat.white);
box(.36,3.5,8.2,-6,2.35,-.3,mat.white);
box(.36,3.5,8.2,6,2.35,-.3,mat.white);
box(12,.42,8.3,0,4.35,-.35,mat.dark);
box(12.55,.11,8.65,0,4.64,-.35,mat.black);
box(12.25,.10,.17,0,4.46,3.88,mat.black);
box(4.1,3.2,.23,-3.95,2.24,3.75,mat.wood);
box(3.6,2.92,.14,3.98,2.18,3.76,mat.wood);
box(1.05,3.3,.2,-1.28,2.32,3.77,mat.white);
// Main curtain-wall panorama, with frames and mullions.
box(6.55,3.01,.075,1.0,2.22,3.91,mat.glass);
box(6.72,.09,.18,1.0,3.76,3.96,mat.black);
box(6.72,.09,.18,1.0,.69,3.96,mat.black);
for(let x of [-2.3,.15,2.25,4.25])box(.07,3.1,.17,x,2.22,3.96,mat.black);
// Recessed deck and terrace.
box(13,.23,4,0,.3,6.2,mat.wood);
for(let x=-6.3;x<6.4;x+=.48)box(.04,.035,4.0,x,.435,6.2,mat.dark);
// Timber slats — true volumetric battens with natural irregularity.
for(let i=0;i<23;i++){const x=-5.94+i*.171;box(.065,3.15,.12,x,2.22,3.89,mat.wood);}
for(let i=0;i<15;i++){const x=2.4+i*.23;box(.08,3.08,.11,x,2.18,3.87,mat.wood);}
// Entrance and steps.
for(let i=0;i<3;i++)box(2.3,.11,.6,-2.3,.33-i*.08,8.5+i*.65,mat.stone);
// Interior visible through glass: floor, dining table, couch and pendants.
box(11.5,.04,7.7,0,.72,-.2,mat.wood);
box(2.1,.13,.95,2.1,1.42,.1,mat.wood);
for(let x of [1.3,2.9])for(let z of [-.18,.4])box(.09,.65,.09,x,1.03,z,mat.black);
box(2.3,.44,.85,-1.2,1.02,.15,mat.upholstery);
box(2.3,.5,.23,-1.2,1.27,-.23,mat.upholstery);
box(.28,.42,.85,-2.25,1.28,.15,mat.upholstery);
box(.28,.42,.85,-.15,1.28,.15,mat.upholstery);
box(1.2,.11,.7,-1.18,.97,1.55,mat.wood);
for(let x of [-.8,1.7,3.1]){
 const globe=new THREE.Mesh(new THREE.SphereGeometry(.19,16,12),mat.glow);
 globe.position.set(x,2.95,-.15);scene.add(globe);
 const light=new THREE.PointLight('#ffbd75',7,5,2);light.position.set(x,2.85,-.15);scene.add(light);
}
// Architectural recessed under-eave ambient strip.
box(10.8,.025,.08,0,4.13,3.79,mat.glow);
const warmStrip=new THREE.PointLight('#ffe5b9',42,17,2);
warmStrip.position.set(0,3.85,5);scene.add(warmStrip);
// Landscaping clusters with trunk/crown depth.
function shrub(x,z,s=1){
 const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.55*s,1),mat.bush);
 crown.position.set(x,.42*s,z);crown.scale.set(1.25,.72,1);
 crown.castShadow=true;scene.add(crown);
}
for(const [x,z,s] of [[-8,5,.9],[-8.9,4,.7],[8,5,.9],[9,6,.78],[-5,10,.8],[7.7,9,.65],[11,2,1.15],[-10,-2,1.2]])shrub(x,z,s);
for(let i=0;i<60;i++){
 const x=-16+(i*7.31)%32,z=9+(i*3.79)%13;
 const r=.2+(i%7)*.035;
 const blade=new THREE.Mesh(new THREE.ConeGeometry(r,.42+(i%5)*.07,5),mat.bush);
 blade.position.set(x,.18,z);blade.rotation.z=(i%5)*.11;blade.castShadow=false;scene.add(blade);
}
for(let j=0;j<7;j++)box(.42,.09,2.6,-5+j*1.85,.13,10.7,mat.stone);
function box(w,h,d,x,y,z,m){
 const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);
 o.castShadow=true;o.receiveShadow=true;scene.add(o);return o;
}
// Real shadow-casting solar light and sky fill.
const hemi=new THREE.HemisphereLight('#eaf4ff','#6b6658',2.1);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff0d7',4.1);
sun.position.set(-12,19,9);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;
sun.shadow.camera.near=.5;sun.shadow.camera.far=85;
sun.shadow.bias=-.00008;sun.shadow.normalBias=.024;sun.shadow.radius=3;
scene.add(sun);sun.target.position.set(0,0,0);scene.add(sun.target);
const premiumReport = enhancePremiumScene({THREE,scene,renderer,materials:mat});
console.info('INGEBAM Inmo3D Premium',premiumReport);
const finishingReport=addArchitecturalFinish({THREE,scene,renderer,materials:mat});
console.info('INGEBAM Inmo3D Finishes',finishingReport);
const exteriorRealism=createExteriorRealism({THREE,scene,renderer,camera,sun});
console.info('INGEBAM Exterior Realism',exteriorRealism.stats);
const cinematic=createCinematicPipeline({THREE,renderer,scene,camera});
const photoStudio=createPhotoStudio({camera,renderer,controls,cinematic,THREE});
window.Inmo3DPremiumPhoto=photoStudio;
// Camera tours retain real-time OrbitControls.
const views={
 front:{p:[17,10.3,19],t:[0,2,0]},
 garden:{p:[-12,5,17],t:[0,2.1,1]},
 detail:{p:[6.4,3.3,10.5],t:[2.6,2.25,3.6]},
 aerial:{p:[18,24,18],t:[0,1.2,0]}
};
let desired=null;
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed','false'));
 b.setAttribute('aria-pressed','true');desired=views[b.dataset.view];
}));
let sunset=false;
document.querySelector('#timeofday').addEventListener('click',e=>{
 sunset=!sunset;e.currentTarget.setAttribute('aria-pressed',String(sunset));
 sun.position.set(sunset?-19:-12,sunset?7:19,sunset?13:9);
 sun.intensity=sunset?3.2:4.1;sun.color.set(sunset?'#ffbd88':'#fff0d7');
 hemi.intensity=sunset?1.2:2.1;
 renderer.toneMappingExposure=sunset?.84:1.05;
 exteriorRealism.setTimeOfDay(sunset);
 scene.background.set(sunset?'#8d8198':'#bfd1df');
 scene.fog.color.set(sunset?'#95889d':'#c4d4db');
});
let highQuality=false;
const aoButton=document.querySelector('#ambient');
if(aoButton)aoButton.addEventListener('click',()=>{
 const active=cinematic.setEnabled(!cinematic.status().enabled);
 aoButton.setAttribute('aria-pressed',String(active));
 aoButton.textContent=active?'Oclusión ambiental ✓':'Oclusión ambiental';
});
document.querySelector('#quality').addEventListener('click',e=>{
 highQuality=!highQuality;e.currentTarget.setAttribute('aria-pressed',String(highQuality));
 renderer.setPixelRatio(Math.min(devicePixelRatio,highQuality?2:1.5));
 cinematic.resize();
 sun.shadow.mapSize.set(highQuality?4096:2048,highQuality?4096:2048);
 if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
 sun.shadow.needsUpdate=true;
});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);cinematic.resize();});
const timer=new THREE.Clock();let times=0,frames=0;
function animate(){
 requestAnimationFrame(animate);
 if(desired){
  camera.position.lerp(new THREE.Vector3(...desired.p),.065);
  controls.target.lerp(new THREE.Vector3(...desired.t),.065);
  if(camera.position.distanceTo(new THREE.Vector3(...desired.p))<.035)desired=null;
 }
 controls.update();cinematic.render();
 frames++;times+=timer.getDelta();
 if(times>1.5){const fps=Math.round(frames/times);cinematic.reportFPS(fps);
 const state=cinematic.status();if(aoButton && !state.enabled && aoButton.getAttribute('aria-pressed')==='true'){aoButton.setAttribute('aria-pressed','false');aoButton.textContent=state.mode==='performance-fallback'?'Oclusión desactivada (FPS)':'Oclusión ambiental';}
 document.querySelector('#fps').textContent='Render en tiempo real · '+fps+' FPS · '+(state.enabled?'SSAO activo':'modo estándar');times=0;frames=0;}
}
status.hidden=true;animate();
} catch(e){
 status.hidden=false;
 status.textContent='No se pudo iniciar el visor WebGL: '+String(e?.message||e);
 console.error(e);
}