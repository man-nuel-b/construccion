/* INGEBAM Inmo3D — V10.6 Physical materials, glass and shadows.
 * Scoped plugin: no geometry deletion, no material replacement or model mutation.
 * Expose internal scene with Inmo3DPhysicalUpgrade.apply(scene, renderer, THREE).
 * If the app uses a private bundled Three.js, it MUST explicitly call apply().
 */
(() => {
  'use strict';
  if (window.Inmo3DPhysicalUpgrade) return;
  const upgraded = new WeakSet();
  const stats = { version: '10.6', scenes: 0, renderers: 0, materials: 0, glass: 0, wood: 0, stone: 0, fabric: 0, lights: 0, meshes: 0, lastError: null };
  const clamp = (x,lo,hi) => Math.max(lo,Math.min(hi,x));
  const classify = (name, mat) => {
    const n = String(name || '').toLowerCase();
    if (/glass|vidrio|cristal|window.?pane|ventanal|glazing/.test(n)) return 'glass';
    if (/madera|wood|oak|walnut|timber|roble|nogal|deck|parquet/.test(n)) return 'wood';
    if (/piedra|stone|granite|granito|marble|marmol|concrete|hormig|cement|slate|pizarra/.test(n)) return 'stone';
    if (/sofa|sofá|couch|fabric|tela|uphol|textil|curtain|cortina/.test(n)) return 'fabric';
    if (mat && mat.transparent && mat.opacity < .7 && /window|pane/.test(n)) return 'glass';
    return null;
  };
  function refineMaterial(mat, label, renderer, THREE) {
    if (!mat || !mat.isMaterial || upgraded.has(mat)) return null;
    // Only physical/PBR materials have the expected lighting response.
    if (!mat.isMeshStandardMaterial && !mat.isMeshPhysicalMaterial) return null;
    const type = classify(label + ' ' + (mat.name || ''), mat);
    const maxAniso = renderer?.capabilities?.getMaxAnisotropy?.() || 4;
    for (const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','bumpMap']) {
      const tex = mat[key]; if (!tex) continue;
      if ('anisotropy' in tex) tex.anisotropy=Math.max(tex.anisotropy || 1,Math.min(8,maxAniso));
      if (key==='map' && THREE?.SRGBColorSpace && 'colorSpace' in tex) tex.colorSpace=THREE.SRGBColorSpace;
    }
    // Keep author-chosen maps and colors. Adjust only outlying numeric PBR values.
    if (type==='wood') {
      mat.metalness=clamp(mat.metalness,0,.08);
      mat.roughness=clamp(mat.roughness,.40,.85);
      stats.wood++;
    } else if (type==='stone') {
      mat.metalness=clamp(mat.metalness,0,.09);
      mat.roughness=clamp(mat.roughness,.55,.95);
      stats.stone++;
    } else if (type==='fabric') {
      mat.metalness=0;
      mat.roughness=clamp(mat.roughness,.78,1);
      stats.fabric++;
    } else if (type==='glass') {
      // Do not change basic transparent panes into physical glass: that would
      // require replacing the material, risking scene-specific shader behavior.
      if (mat.isMeshPhysicalMaterial) {
        mat.metalness=0;
        mat.roughness=clamp(mat.roughness,.025,.13);
        if ('ior' in mat) mat.ior=1.48;
        if ('thickness' in mat && mat.thickness === 0) mat.thickness=.012;
        if ('transmission' in mat && mat.transmission>0) mat.transmission=clamp(mat.transmission,.78,1);
      }
      stats.glass++;
    }
    if ('envMapIntensity' in mat && mat.envMap) mat.envMapIntensity=clamp(mat.envMapIntensity,.65,1.75);
    mat.needsUpdate=true;
    upgraded.add(mat); stats.materials++;
    return type;
  }
  function apply(scene, renderer, THREE) {
    if (!scene || !scene.isScene || !THREE) return {applied:false,reason:'requires Three.js scene and namespace'};
    try {
      if (renderer && !upgraded.has(renderer)) {
        if (renderer.shadowMap) {
          renderer.shadowMap.enabled=true;
          if (THREE.PCFSoftShadowMap!==undefined) renderer.shadowMap.type=THREE.PCFSoftShadowMap;
        }
        if (THREE.SRGBColorSpace && 'outputColorSpace' in renderer) renderer.outputColorSpace=THREE.SRGBColorSpace;
        if (THREE.ACESFilmicToneMapping!==undefined && 'toneMapping' in renderer) {
          renderer.toneMapping=THREE.ACESFilmicToneMapping;
          // Preserve an explicitly tuned exposure.
          if (!Number.isFinite(renderer.toneMappingExposure)) renderer.toneMappingExposure=1;
        }
        upgraded.add(renderer);stats.renderers++;
      }
      let sceneWasNew=!upgraded.has(scene);
      scene.traverse(obj => {
        if (obj.isMesh) {
          if (!upgraded.has(obj)) {
            const label=(obj.name||'') + ' ' + (obj.parent?.name||'');
            const mats=Array.isArray(obj.material)?obj.material:[obj.material];
            const classes=mats.map(mat=>refineMaterial(mat,label,renderer,THREE));
            // Receive contact shadows, but avoid applying shadows to glass.
            if (!classes.includes('glass') && obj.geometry) {
              obj.receiveShadow=true;
              const transparent=mats.some(m=>m?.transparent && m.opacity < .9);
              if (!transparent) obj.castShadow=obj.castShadow || /furniture|mueble|chair|silla|sofa|mesa|table|cabinet|armario|counter/.test(label.toLowerCase());
            }
            upgraded.add(obj); stats.meshes++;
          }
        }
        if (obj.isLight && obj.castShadow && obj.shadow && !upgraded.has(obj)) {
          const mobile=matchMedia('(max-width:700px)').matches;
          const size=mobile?1024:2048;
          if(obj.shadow.mapSize && obj.shadow.mapSize.x<size) {
            obj.shadow.mapSize.set(size,size);
            if(obj.shadow.map){obj.shadow.map.dispose();obj.shadow.map=null;}
          }
          if ('normalBias' in obj.shadow) obj.shadow.normalBias=0.016;
          upgraded.add(obj);stats.lights++;
        }
      });
      if (sceneWasNew){upgraded.add(scene);stats.scenes++;}
      return {applied:true,stats:{...stats}};
    } catch(error){stats.lastError=String(error);return {applied:false,error:String(error)};}
  }
  function discover() {
    const t=window.THREE;
    if(!t) return;
    for (const host of [window,window.app,window.viewer,window.engine,window.inmo3d]) {
      if(host?.scene?.isScene) apply(host.scene,host.renderer||host.webglRenderer,t);
    }
  }
  window.Inmo3DPhysicalUpgrade=Object.freeze({apply,status:()=>({...stats}),discover});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',discover,{once:true});
  else discover();
  // Detect delayed module initialization but avoid permanent animation overhead.
  let attempts=0;
  const timer=setInterval(()=>{discover();if(++attempts>=40)clearInterval(timer)},1500);
})();