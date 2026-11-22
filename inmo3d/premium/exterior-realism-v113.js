/* INGEBAM Inmo3D Premium V11.3 — exterior realism layer.
 * Independent scene additions only; all new geometry and textures are procedural.
 */
export function createExteriorRealism({THREE,scene,renderer,camera,sun}) {
 const stats={version:'11.3',trees:0,shrubs:0,grassBlades:0,contactShadows:0,features:[]};
 const assets=[];
 const add=(obj)=>{scene.add(obj);assets.push(obj);return obj};
 const rand=(()=>{let s=11032026;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;}})();
 const clamp=(v,a,b)=>Math.max(a,Math.min(v,b));
 // Soft radial shadow cards imitate small-scale ambient occlusion without a costly screen-space pass.
 const shadowCanvas=document.createElement('canvas');
 shadowCanvas.width=shadowCanvas.height=128;
 const ctx=shadowCanvas.getContext('2d');
 const grad=ctx.createRadialGradient(64,64,2,64,64,63);
 grad.addColorStop(0,'rgba(16,20,18,.46)');
 grad.addColorStop(.28,'rgba(16,20,18,.31)');
 grad.addColorStop(.65,'rgba(16,20,18,.12)');
 grad.addColorStop(1,'rgba(16,20,18,0)');
 ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
 const shadowTex=new THREE.CanvasTexture(shadowCanvas);
 const shadowMat=new THREE.MeshBasicMaterial({
   map:shadowTex,transparent:true,opacity:.8,depthWrite:false,
   polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide
 });
 function contact(x,z,w,d,y=.085) {
   const o=new THREE.Mesh(new THREE.PlaneGeometry(w,d),shadowMat);
   o.rotation.x=-Math.PI/2;o.position.set(x,y,z);o.renderOrder=2;
   add(o);stats.contactShadows++;
 }
 [
  [-3.7,6.6,3.4,2.0,.443],[1.3,6.6,3.4,2.0,.443],
  [3.55,6.7,2.7,1.6,.443],[-1.15,6.43,2,.95,.443],
  [-5.45,7.9,1.15,1.15,.445],[5.5,8,1.15,1.15,.445]
 ].forEach(a=>contact(...a));
 // Sculpted tree silhouettes with hundreds of leaves kept in a few InstancedMesh draw calls.
 const trunkMat=new THREE.MeshStandardMaterial({color:'#69513a',roughness:1});
 const foliageMats=['#3d6744','#527b4b','#668950'].map(c=>
   new THREE.MeshStandardMaterial({color:c,roughness:.94,side:THREE.DoubleSide}));
 const trunkGeo=new THREE.CylinderGeometry(.13,.23,1.6,7);
 const crownGeo=new THREE.IcosahedronGeometry(.34,1);
 const trees=[[-12,-4,2.5],[-15,6,3.7],[13,-3,3.0],[15,11,3.8],[-13,13,2.7],[14,17,2.6]];
 const trunkMeshes=[];
 const leaves=[];
 const tmp=new THREE.Object3D();
 for(const [x,z,scale] of trees){
   const trunk=new THREE.Mesh(trunkGeo,trunkMat);
   trunk.position.set(x,.8*scale,z);
   trunk.scale.set(scale*.46,scale,scale*.46);
   trunk.castShadow=true;trunk.receiveShadow=true;add(trunk);trunkMeshes.push(trunk);
   for(let i=0;i<105;i++){
     const u=rand()*2-1,theta=rand()*Math.PI*2;
     const rr=Math.sqrt(1-u*u);
     const spread=.62+rand()*.43;
     const px=x+Math.cos(theta)*rr*spread*scale*.78;
     const pz=z+Math.sin(theta)*rr*spread*scale*.65;
     const py=1.65*scale+u*scale*.70;
     leaves.push([px,py,pz,(.2+rand()*.19)*scale*.48,Math.floor(rand()*3)]);
   }
   stats.trees++;
 }
 const leafMeshes=foliageMats.map((mat,index)=>{
   const batch=leaves.filter(e=>e[4]===index);
   const inst=new THREE.InstancedMesh(crownGeo,mat,batch.length);
   inst.castShadow=false;inst.receiveShadow=true;
   batch.forEach(([x,y,z,r],i)=>{
     tmp.position.set(x,y,z);tmp.rotation.set(rand()*Math.PI,rand()*Math.PI,rand()*Math.PI);
     tmp.scale.set(r*1.15,r*.66,r);tmp.updateMatrix();inst.setMatrixAt(i,tmp.matrix);
   });
   inst.instanceMatrix.needsUpdate=true;add(inst);return inst;
 });
 // Groundcover with InstancedMesh: irregular clumps, varied angles, controlled counts.
 const grassMat=new THREE.MeshStandardMaterial({color:'#658553',roughness:1,side:THREE.DoubleSide});
 const grassGeo=new THREE.ConeGeometry(.055,.28,3);
 const grassCount=1400;
 const grass=new THREE.InstancedMesh(grassGeo,grassMat,grassCount);
 const color=new THREE.Color();
 for(let i=0;i<grassCount;i++){
   let x,z,attempts=0;
   do{x=-18+rand()*36;z=-17+rand()*38;attempts++}
   while(x>-9&&x<9&&z>-9&&z<13&&attempts<20);
   tmp.position.set(x,.14,z);
   tmp.rotation.set((rand()-.5)*.3,rand()*Math.PI*2,(rand()-.5)*.4);
   const s=.55+rand()*1.5;tmp.scale.set(s,s,s);tmp.updateMatrix();
   grass.setMatrixAt(i,tmp.matrix);
   color.setHSL(.25+rand()*.055,.22+rand()*.16,.24+rand()*.17);
   grass.setColorAt(i,color);
 }
 grass.instanceMatrix.needsUpdate=true;
 if(grass.instanceColor)grass.instanceColor.needsUpdate=true;
 grass.castShadow=false;add(grass);stats.grassBlades=grassCount;
 // Layer additional low shrubs near the building with individual leaf clusters.
 const bushGeo=new THREE.IcosahedronGeometry(.23,1);
 const bushCount=250;
 const bushes=new THREE.InstancedMesh(bushGeo,foliageMats[1],bushCount);
 for(let i=0;i<bushCount;i++){
   const side=i%2?-1:1;
   const x=side*(8.5+rand()*3),z=-5+rand()*17;
   tmp.position.set(x,.28+rand()*.28,z);
   tmp.rotation.set(rand()*.5,rand()*Math.PI*2,rand()*.5);
   const scale=.45+rand()*.85;tmp.scale.set(scale*1.3,scale,scale);tmp.updateMatrix();
   bushes.setMatrixAt(i,tmp.matrix);
 }
 bushes.instanceMatrix.needsUpdate=true;add(bushes);stats.shrubs=bushCount;
 // Sky dome has a physical-looking vertical color gradient rather than a single flat color.
 const uniforms={zenith:{value:new THREE.Color('#6e9ac3')},
   horizon:{value:new THREE.Color('#e6d7c6')},
   ground:{value:new THREE.Color('#b7b6ad')}};
 const skyMat=new THREE.ShaderMaterial({
   side:THREE.BackSide,depthWrite:false,fog:false,uniforms,
   vertexShader:`varying vec3 vDir; void main() {
     vec4 worldPosition=modelMatrix*vec4(position,1.0);
     vDir=normalize(worldPosition.xyz-cameraPosition);
     gl_Position=projectionMatrix*viewMatrix*worldPosition;
   }`,
   fragmentShader:`varying vec3 vDir;
    uniform vec3 zenith;uniform vec3 horizon;uniform vec3 ground;
    void main(){
      float h=normalize(vDir).y;
      vec3 upper=mix(horizon,zenith,smoothstep(0.0,0.80,max(h,0.0)));
      vec3 c=mix(ground,upper,smoothstep(-0.18,0.075,h));
      gl_FragColor=vec4(c,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
 });
 const sky=new THREE.Mesh(new THREE.SphereGeometry(85,24,16),skyMat);
 sky.frustumCulled=false;sky.renderOrder=-1000;add(sky);
 const originalFog=scene.fog?.color?.clone();
 function setTimeOfDay(sunset){
   uniforms.zenith.value.set(sunset?'#585b88':'#6e9ac3');
   uniforms.horizon.value.set(sunset?'#f5b38e':'#e6d7c6');
   uniforms.ground.value.set(sunset?'#a68c80':'#b7b6ad');
   // Environment map from RoomEnvironment stays fixed; sky changes visual backdrop only.
   if(scene.fog && originalFog)scene.fog.color.set(sunset?'#a58b95':'#c4d4db');
 }
 stats.features=['procedural sky','instanced foliage','contact shadow cards','groundcover'];
 return {stats,setTimeOfDay,dispose(){
   for(const obj of assets){scene.remove(obj);obj.geometry?.dispose();}
   for(const m of [shadowMat,grassMat,trunkMat,...foliageMats,skyMat])m.dispose();
   shadowTex.dispose();
 }};
}