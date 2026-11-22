/* INGEBAM Inmo3D V10.7 — Runtime bridge + rendering diagnostics.
 * Observes global THREE without altering the 3D bundle. Safe to disable.
 * All modifications are isolated to /inmo3d/.
 */
(() => {
  'use strict';
  if (window.Inmo3DRuntimeBridge) return;
  const state = {version:'10.7', engineDetected:false, hookInstalled:false,
    renderCalls:0, scenesSeen:0, upgradeCalls:0, upgradeErrors:0,
    webglCanvasCount:0, lastError:null};
  const observedScenes = new WeakSet();
  const originalRender = new WeakMap();
  const usesMobileQuality = () => matchMedia('(max-width:700px)').matches;
  let lastRenderSample = 0;
  let frames = 0;
  let fps = null;
  let badge = null;
  function onFrame(scene, renderer, lib) {
    state.renderCalls++;
    if (scene?.isScene && !observedScenes.has(scene)) {
      observedScenes.add(scene); state.scenesSeen++;
    }
    if (scene?.isScene && window.Inmo3DPhysicalUpgrade?.apply && lib) {
      // Only check once per renderer/scene pair during a normal render loop.
      const stamp = scene.userData && scene.userData.__inmo3dBridgeLast;
      const now = performance.now();
      if (!stamp || now-stamp > 7000) {
        if (scene.userData) scene.userData.__inmo3dBridgeLast=now;
        const outcome=window.Inmo3DPhysicalUpgrade.apply(scene, renderer, lib);
        state.upgradeCalls++;
        if (!outcome?.applied) state.upgradeErrors++;
      }
    }
    frames++;
    const time=performance.now();
    if (!lastRenderSample) lastRenderSample=time;
    if (time-lastRenderSample>=1500) {
      fps=Math.round(frames*1000/(time-lastRenderSample));
      frames=0;lastRenderSample=time;
      refresh();
    }
  }
  function attach() {
    const lib=window.THREE;
    if (!lib?.WebGLRenderer?.prototype || typeof lib.WebGLRenderer.prototype.render!=='function') return false;
    state.engineDetected=true;
    const proto=lib.WebGLRenderer.prototype;
    if (originalRender.has(proto)) return true;
    const render=proto.render;
    // Replace only this method; preserve original context, parameters and return.
    function renderWithUpgrade(scene,camera,...args){
      try { onFrame(scene,this,lib); }
      catch(error){state.lastError=String(error);}
      return render.call(this,scene,camera,...args);
    }
    originalRender.set(proto,render);
    proto.render=renderWithUpgrade;
    state.hookInstalled=true;
    refresh();
    return true;
  }
  function status(){
    const materialStatus=window.Inmo3DPhysicalUpgrade?.status?.() || {};
    const textureStatus=window.__inmo3dQualityV104 || {};
    return {...state, fps, materialStatus, qualityStatus:{
      configuredRenderers:textureStatus.configuredRenderers || 0,
      configuredScenes:textureStatus.configuredScenes || 0
    }};
  }
  function refresh(){
    state.webglCanvasCount=[...document.querySelectorAll('canvas')].filter(c=>{
      const rect=c.getBoundingClientRect();
      return rect.width>=200&&rect.height>=150;
    }).length;
    if (!badge) return;
    const materials=window.Inmo3DPhysicalUpgrade?.status?.() || {};
    const active=materials.materials>0;
    const text=active
      ? 'Materiales físicos ajustados: '+materials.materials
      : state.hookInstalled
        ? 'Motor conectado; esperando materiales compatibles'
        : 'Motor encapsulado: ajuste físico aún no confirmado';
    badge.querySelector('[data-diagnostic-state]').textContent=text;
    badge.querySelector('[data-diagnostic-fps]').textContent=fps===null?'FPS: sin medición':'FPS: '+fps;
    badge.querySelector('[data-diagnostic-scenes]').textContent='Escenas: '+state.scenesSeen+' · lienzos: '+state.webglCanvasCount;
  }
  function mount(){
    if (!document.body || badge) return;
    badge=document.createElement('details');
    badge.id='inmo3d-runtime-v107';
    badge.style.cssText='position:fixed;left:12px;bottom:12px;z-index:2147479900;max-width:min(310px,calc(100vw - 24px));color:#f1e9df;background:#111a25ee;border:1px solid #8c795a;border-radius:10px;padding:7px 11px;font:12px/1.5 system-ui,sans-serif;box-shadow:0 4px 25px #0009';
    badge.innerHTML='<summary style="cursor:pointer;color:#edc786;font-weight:650">Motor gráfico · diagnóstico</summary>'
      +'<div style="padding-top:7px"><div data-diagnostic-state></div><div data-diagnostic-fps></div>'
      +'<div data-diagnostic-scenes></div><small style="color:#b7c0cb">La configuración PBR solo se confirma si el motor expone su escena Three.js. Esta lectura no demuestra calidad fotorrealista.</small></div>';
    document.body.appendChild(badge);
    refresh();
  }
  function inspect(){
    try {attach();mount();refresh();}
    catch(error){state.lastError=String(error);}
  }
  window.Inmo3DRuntimeBridge=Object.freeze({status,inspect});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inspect,{once:true});else inspect();
  let scans=0;
  const timer=setInterval(()=>{inspect();if(++scans>=80)clearInterval(timer);},1000);
})();