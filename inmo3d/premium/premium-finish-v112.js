/* INGEBAM Inmo3D Premium V11.2: architectural microdetail and material maps.
   Independent of the commercial viewer; does not fetch remote models. */
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function addArchitecturalFinish({THREE,scene,renderer,materials}) {
 const result={version:'11.2',objects:0,maps:0,roundedFurniture:0};
 const choose=(a,b,t)=>a+(b-a)*t;
 const tone=(v)=>Math.min(255,Math.max(0,Math.round(v)));
 function multiMap(kind,scale=1) {
   const n=256, canvas=document.createElement('canvas');
   canvas.width=canvas.height=n;const ctx=canvas.getContext('2d');
   const img=ctx.createImageData(n,n);let seed=kind==='stone'?2049:kind==='wood'?2063:2099;
   const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   const heights=new Float32Array(n*n);
   for(let y=0;y<n;y++)for(let x=0;x<n;x++){
     const wave=kind==='wood'
       ? .5+.24*Math.sin(y*.31+Math.sin(x*.032)*5)+.07*Math.sin(y*.81+x*.013)
       : kind==='stone'
       ? .5+.11*Math.sin(x*.095+y*.053)+.1*Math.sin(y*.15-x*.13)
       : .5;
     heights[y*n+x]=Math.max(0,Math.min(1,wave+(rand()-.5)*(kind==='wood'?.16:.3)));
   }
   function texFrom(data,type) {
     const c=document.createElement('canvas');c.width=c.height=n;
     c.getContext('2d').putImageData(data,0,0);
     const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;
     t.repeat.set(scale,scale);
     t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
     if(type==='color')t.colorSpace=THREE.SRGBColorSpace;
     result.maps++;return t;
   }
   const rough=ctx.createImageData(n,n),norm=ctx.createImageData(n,n);
   const pix=(x,y)=>heights[((y+n)%n)*n+((x+n)%n)];
   for(let y=0;y<n;y++)for(let x=0;x<n;x++){
     const i=(y*n+x)*4, v=heights[y*n+x];
     const r=kind==='wood'?choose(166,228,v):kind==='stone'?choose(165,232,v):choose(187,232,v);
     const dx=(pix(x+1,y)-pix(x-1,y))*1.3;
     const dy=(pix(x,y+1)-pix(x,y-1))*1.3;
     const nz=1/Math.sqrt(dx*dx+dy*dy+1);
     norm.data[i]=tone(((-dx*nz)*.5+.5)*255);
     norm.data[i+1]=tone(((-dy*nz)*.5+.5)*255);
     norm.data[i+2]=tone((nz*.5+.5)*255);norm.data[i+3]=255;
     rough.data[i]=rough.data[i+1]=rough.data[i+2]=tone(r);rough.data[i+3]=255;
   }
   return {normal:texFrom(norm,'data'),roughness:texFrom(rough,'data')};
 }
 for(const [key,kind,scale,normalScale] of [
   ['wood','wood',3,.18],['stone','stone',4,.25],['white','plaster',7,.095]
 ]) {
   const material=materials[key];if(!material)continue;
   const maps=multiMap(kind,scale);
   material.normalMap=maps.normal;
   material.normalScale=new THREE.Vector2(normalScale,normalScale);
   material.roughnessMap=maps.roughness;
   material.needsUpdate=true;
 }
 // Prefer physically curved meshes to over-sharp rectangular furniture edges.
 const cloth=new THREE.MeshStandardMaterial({color:'#d5c8b2',roughness:.97,metalness:0});
 const sofaPiping=new THREE.MeshStandardMaterial({color:'#aa9e8e',roughness:.92});
 const timber=new THREE.MeshStandardMaterial({color:'#8e6747',roughness:.54});
 const ceramic=new THREE.MeshPhysicalMaterial({color:'#e9e3d6',roughness:.21,clearcoat:.35,clearcoatRoughness:.15});
 const charcoal=new THREE.MeshStandardMaterial({color:'#262b2b',roughness:.43,metalness:.21});
 const fabricDetail=new THREE.MeshStandardMaterial({color:'#bcae9f',roughness:1});
 const add=(geo,mat,x,y,z,rotation=0)=>{
   const obj=new THREE.Mesh(geo,mat);obj.position.set(x,y,z);obj.rotation.y=rotation;
   obj.castShadow=true;obj.receiveShadow=true;scene.add(obj);result.objects++;return obj;
 };
 const rounded=(w,h,d,r,mat,x,y,z,rotation=0)=>{
   result.roundedFurniture++;
   return add(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/4,h/4,d/4)),mat,x,y,z,rotation);
 };
 // Exterior designer lounge: cushions + wood/metal structural components.
 rounded(1.95,.23,.75,.095,cloth,3.55,.84,6.7);
 rounded(1.9,.60,.18,.085,cloth,3.55,1.11,6.34);
 for(const x of [2.77,3.55,4.32]){
   rounded(.55,.14,.60,.06,fabricDetail,x,.99,6.78);
   rounded(.55,.36,.14,.065,cloth,x,1.14,6.32);
 }
 for(const x of [2.6,4.48]){
   rounded(.13,.53,.75,.045,charcoal,x,.91,6.7);
   for(const z of [6.37,7.04])
     rounded(.075,.44,.075,.019,timber,x,.41,z);
 }
 // Ceramic decorative arrangement: sphere and minimalist tableware.
 const vase=add(new THREE.LatheGeometry([
   new THREE.Vector2(.12,0),new THREE.Vector2(.17,.03),
   new THREE.Vector2(.19,.16),new THREE.Vector2(.13,.28),
   new THREE.Vector2(.09,.37),new THREE.Vector2(.10,.41)
 ],20),ceramic,-1.42,.79,6.37);
 vase.castShadow=true;
 rounded(.34,.025,.22,.01,ceramic,-.98,.75,6.53);
 // Steel columns get real base plates and fastening detail.
 for(const x of [-5.65,5.68]){
   rounded(.26,.025,.26,.016,charcoal,x,.59,3.83);
   add(new THREE.CylinderGeometry(.045,.045,.026,12),charcoal,x,.615,3.83);
 }
 // Refined roof edge: metal drip profile casting thin contact shadows.
 rounded(12.7,.065,.07,.019,charcoal,0,4.54,4.04);
 rounded(12.7,.075,.04,.012,charcoal,0,4.43,4.065);
 // Warming backlit interior artwork through glass.
 const art=new THREE.MeshStandardMaterial({color:'#a28c72',roughness:.77});
 rounded(1.12,.71,.038,.017,art,3.2,2.05,-3.83);
 rounded(1.19,.78,.025,.012,timber,3.2,2.05,-3.86);
 // Distant simple pavers with irregular but restrained spacing.
 for(let i=0;i<10;i++) {
   const x=-7.1+i*1.5;
   rounded(.94,.045,.82,.025,materials.stone,x,.103,11.55+(i%3)*.14);
 }
 return result;
}