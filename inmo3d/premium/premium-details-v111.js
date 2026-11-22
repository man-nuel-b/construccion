/* INGEBAM Premium V11.1 — physical detailing without changing commercial systems.
   Geometry is local to the independent visual laboratory. */
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function enhancePremiumScene({THREE, scene, renderer, materials}) {
  const report={version:'11.1', details:0, textures:0, reflections:false};
  const add=(geo,mat,x,y,z,rotation=0)=>{
    const obj=new THREE.Mesh(geo,mat);
    obj.position.set(x,y,z);obj.rotation.y=rotation;
    obj.castShadow=true;obj.receiveShadow=true;scene.add(obj);report.details++;return obj;
  };
  const box=(w,h,d,mat,x,y,z,rotation=0)=>
    add(new THREE.BoxGeometry(w,h,d),mat,x,y,z,rotation);
  const cylinder=(top,bottom,height,mat,x,y,z,segments=20)=>
    add(new THREE.CylinderGeometry(top,bottom,height,segments),mat,x,y,z);
  const sphere=(r,mat,x,y,z)=>
    add(new THREE.SphereGeometry(r,18,12),mat,x,y,z);
  function texture(kind, base, amp=16) {
    const canvas=document.createElement('canvas');
    const n=256;canvas.width=canvas.height=n;
    const c=canvas.getContext('2d');
    let seed=kind==='plaster'?17:kind==='stone'?43:81;
    const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const image=c.createImageData(n,n);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
      const i=(y*n+x)*4;
      const grain=kind==='wood'?Math.sin(y*.36+Math.sin(x*.035)*3)*.42+
        Math.sin(y*.095+Math.cos(x*.06)*7)*.2:rnd()-.5;
      const noise=Math.round(grain*amp+(rnd()-.5)*amp*.55);
      const value=Math.max(0,Math.min(255,base+noise));
      image.data[i]=image.data[i+1]=image.data[i+2]=value;
      image.data[i+3]=255;
    }
    c.putImageData(image,0,0);
    const t=new THREE.CanvasTexture(canvas);
    t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.repeat.set(kind==='wood'?2:5,kind==='wood'?2:5);
    t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
    report.textures++;return t;
  }
  // Independent procedural surface relief: no external images, no licensing problems.
  const reliefWood=texture('wood',128,32);
  const reliefStone=texture('stone',130,44);
  const reliefPlaster=texture('plaster',128,14);
  if(materials.wood){materials.wood.bumpMap=reliefWood;materials.wood.bumpScale=.013;materials.wood.needsUpdate=true;}
  if(materials.stone){materials.stone.bumpMap=reliefStone;materials.stone.bumpScale=.022;materials.stone.needsUpdate=true;}
  if(materials.white){materials.white.bumpMap=reliefPlaster;materials.white.bumpScale=.005;materials.white.needsUpdate=true;}
  if(materials.glass){materials.glass.roughness=.035;materials.glass.ior=1.5;materials.glass.thickness=.08;materials.glass.needsUpdate=true;}
  // Neutral image-based lighting gives metal/glass believable reflection gradients.
  try {
    const pmrem=new THREE.PMREMGenerator(renderer);
    const env=new RoomEnvironment(renderer);
    const target=pmrem.fromScene(env,.05);
    scene.environment=target.texture;
    env.dispose();pmrem.dispose();report.reflections=true;
    // Keep render target alive for duration of viewer.
    window.addEventListener('pagehide',()=>target.dispose(),{once:true});
  } catch(e){report.environmentError=String(e);}
  const accent=new THREE.MeshStandardMaterial({color:'#ad774e',roughness:.48,metalness:.02});
  const champagne=new THREE.MeshStandardMaterial({color:'#b1a08b',roughness:.36,metalness:.62});
  const offwhite=new THREE.MeshStandardMaterial({color:'#ded4c3',roughness:.91,metalness:0});
  const charcoal=new THREE.MeshStandardMaterial({color:'#30343a',roughness:.49,metalness:.28});
  const textile=new THREE.MeshStandardMaterial({color:'#a7a59b',roughness:.98});
  const green=new THREE.MeshStandardMaterial({color:'#42633b',roughness:1,side:THREE.DoubleSide});
  const terracotta=new THREE.MeshStandardMaterial({color:'#8a6153',roughness:.9});
  // Volumetric patio lounge: furniture with separate frame, cushions and backrest.
  function lounge(x,z,rotation=0) {
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;scene.add(g);
    const child=(mesh,x,y,z)=>{mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);report.details++;};
    const mbox=(w,h,d,m,x,y,z)=>child(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m),x,y,z);
    mbox(2.2,.13,.91,materials.wood,0,.66,0);
    mbox(2.04,.21,.78,offwhite,0,.83,.03);
    mbox(2.17,.85,.12,charcoal,0,.90,-.49);
    mbox(.13,.47,.91,charcoal,-1.09,.88,0);
    mbox(.13,.47,.91,charcoal,1.09,.88,0);
    for(const i of [-.65,0,.65]){
      mbox(.59,.37,.14,textile,i,1.06,-.36);
      mbox(.61,.06,.72,offwhite,i,.96,.05);
    }
    for(const i of [-.91,.91])for(const j of [-.32,.32])
      mbox(.07,.40,.07,charcoal,i,.39,j);
    return g;
  }
  lounge(-3.7,6.6,.15);
  lounge(1.3,6.6,-.08);
  // Coffee table, metal frame, beveled-like layered walnut top.
  box(1.6,.10,.72,materials.wood,-1.15,.66,6.43);
  box(1.4,.035,.6,accent,-1.15,.723,6.43);
  for(const x of [-1.82,-.48])for(const z of [6.15,6.71])
    cylinder(.025,.025,.61,charcoal,x,.34,z,10);
  cylinder(.12,.14,.035,offwhite,-1.1,.76,6.42);
  // Layered facade stone with real depth/shadow discontinuities.
  for(let row=0;row<6;row++)for(let col=0;col<10;col++){
    const offset=(row%2)*.16;
    const x=-5.96+col*.37+offset;
    if(x>-2.25)continue;
    const depth=.025+(col*7+row*3)%4*.008;
    box(.35,.42,depth,materials.stone,x,1.03+row*.45,3.898+depth*.5);
  }
  // Small recessed entrance light fittings.
  for(const x of [-5.4,-2.7,2.85,5.42]){
    cylinder(.06,.075,.035,charcoal,x,4.12,3.86,14);
    const down=new THREE.SpotLight('#ffe0ac',13,6,Math.PI/5,.65,2);
    down.position.set(x,4.08,3.72);down.target.position.set(x,0.2,3.8);
    scene.add(down,down.target);
  }
  // Planters with actual leaves, instead of flat green blobs.
  function planter(x,z,scale=1){
    cylinder(.35*scale,.27*scale,.47*scale,terracotta,x,.47*scale,z);
    cylinder(.30*scale,.30*scale,.03,materials.stone,x,.7*scale,z);
    cylinder(.035*scale,.045*scale,.75*scale,materials.wood,x,1.05*scale,z,9);
    for(let i=0;i<11;i++){
      const a=i*Math.PI*2/11;
      const y=(1.0+(i%3)*.15)*scale;
      const leaf=add(new THREE.SphereGeometry(.20*scale,9,6),green,
        x+Math.cos(a)*(.23*scale),y,z+Math.sin(a)*(.23*scale));
      leaf.scale.set(.45,1.3,.7);leaf.rotation.z=Math.cos(a)*.5;
    }
  }
  planter(-5.45,7.9,.95);
  planter(5.5,8.0,.9);
  // Window frames: dimensional depth, side gaskets, real rail division.
  for(const x of [-2.34,.12,2.22,4.23]){
    box(.045,2.93,.10,charcoal,x,2.25,4.064);
    box(.018,2.89,.055,champagne,x+.046,2.25,4.045);
  }
  // Path bollards introduce pool lighting across landscaping at dusk.
  for(const x of [-7.5,7.5]){
    box(.15,.43,.15,charcoal,x,.36,9.3);
    box(.14,.07,.14,materials.glow,x,.61,9.3);
    const l=new THREE.PointLight('#ffcc91',3,3.4,2);
    l.position.set(x,.65,9.3);scene.add(l);
  }
  return report;
}
