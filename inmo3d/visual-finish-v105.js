/* Inmo3D V10.5: non-destructive visual finishing controls.
 * Presentation-only. No changes to geometry, BOM, quotation or source assets. */
(() => {
  'use strict';
  if (window.__inmo3dV105) return;
  const STORE='ingebam.inmo3d.visual.v105';
  const presets={
    natural: {brightness:1.01, contrast:1.055, saturate:1.07},
    cinematico:{brightness:.97, contrast:1.13, saturate:1.12},
    interior:{brightness:1.085, contrast:1.055, saturate:1.035}
  };
  let settings={preset:'natural',intensity:100,enabled:true};
  try {
    const s=JSON.parse(localStorage.getItem(STORE)||'null');
    if(s && presets[s.preset]) settings={...settings,...s};
  } catch(_){}
  const api={version:'10.5', status:'Inicializando', targets:0, getSettings:()=>({...settings})};
  window.__inmo3dV105=api;
  const css= document.createElement('style');
  css.id='inmo3d-v105-style';
  css.textContent=`
  #inmo3d-v105{position:fixed;right:16px;bottom:17px;z-index:2147480000;font:13px/1.4 system-ui,Arial,sans-serif;color:#f6f1e8}
  #inmo3d-v105 button,#inmo3d-v105 input{font:inherit}
  #inmo3d-v105 .v105-toggle{background:#191f28;color:#f4c77b;border:1px solid #9a7e50;border-radius:24px;padding:10px 15px;cursor:pointer;box-shadow:0 5px 24px #0008}
  #inmo3d-v105 .v105-panel{background:#151a22ee;border:1px solid #7c6a4d;border-radius:14px;padding:16px;margin-bottom:10px;width:235px;box-shadow:0 6px 30px #000a;backdrop-filter:blur(14px)}
  #inmo3d-v105 .v105-panel[hidden]{display:none}
  #inmo3d-v105 .v105-heading{font-weight:750;color:#f4c77b;margin:0 0 3px;font-size:15px}
  #inmo3d-v105 .v105-muted{font-size:11px;color:#b3bdc8;margin:0 0 11px}
  #inmo3d-v105 .v105-modes{display:grid;grid-template-columns:1fr;gap:6px;margin-bottom:10px}
  #inmo3d-v105 .v105-mode{background:#2b313a;color:white;border:1px solid #484d54;border-radius:7px;padding:7px;cursor:pointer;text-align:left}
  #inmo3d-v105 .v105-mode[aria-pressed=true]{border-color:#f4c77b;background:#443925}
  #inmo3d-v105 label{display:flex;gap:8px;align-items:center;margin:8px 0}
  #inmo3d-v105 input[type=range]{width:100%;accent-color:#f4c77b}
  #inmo3d-v105 .v105-help{font-size:11px;color:#b3bdc8}
  @media(max-width:600px){#inmo3d-v105{right:9px;bottom:10px}#inmo3d-v105 .v105-panel{width:210px;padding:12px}}
  `;
  const safeAppend=()=>{if(document.head && !document.getElementById(css.id)) document.head.appendChild(css)};
  const persist=()=>{try{localStorage.setItem(STORE,JSON.stringify(settings))}catch(_){}};
  const targets=new Set();
  function profileFilter(){
    if(!settings.enabled) return '';
    const p=presets[settings.preset], t=Math.max(0,Math.min(1.5,Number(settings.intensity)/100));
    const step=k=>Math.round((1+(p[k]-1)*t)*1000)/1000;
    return `brightness(${step('brightness')}) contrast(${step('contrast')}) saturate(${step('saturate')})`;
  }
  function findCanvases(){
    const candidates=[...document.querySelectorAll('canvas')].filter(c=>{
      const b=c.getBoundingClientRect();
      return b.width>180 && b.height>130 && !c.closest('#inmo3d-v105');
    });
    const maxArea=Math.max(0,...candidates.map(c=>c.getBoundingClientRect().width*c.getBoundingClientRect().height));
    const active=new Set(candidates.filter(c=>c.getBoundingClientRect().width*c.getBoundingClientRect().height>=maxArea*.35));
    targets.forEach(c=>{if(!active.has(c)){c.style.filter='';targets.delete(c)}});
    active.forEach(c=>{targets.add(c);c.style.filter=profileFilter()});
    api.targets=targets.size;
    api.status=targets.size?'Aplicado al visor':'Esperando lienzo 3D';
  }
  function update(){
    persist();findCanvases();
    document.querySelectorAll('#inmo3d-v105 [data-v105-mode]').forEach(b=>
      b.setAttribute('aria-pressed',String(b.dataset.v105Mode===settings.preset)));
    const status=document.getElementById('v105-state');
    if(status) status.textContent=api.status;
  }
  function init(){
    safeAppend();
    if(!document.body || document.getElementById('inmo3d-v105')) return;
    const root=document.createElement('aside');
    root.id='inmo3d-v105';
    root.setAttribute('aria-label','Ajustes de visualización Inmo3D');
    root.innerHTML=`<div class="v105-panel" hidden>
      <div class="v105-heading">Imagen arquitectónica · V10.5</div>
      <p class="v105-muted">Perfiles visuales reversibles para el recorrido</p>
      <div class="v105-modes">
        <button class="v105-mode" data-v105-mode="natural" type="button">Luz natural</button>
        <button class="v105-mode" data-v105-mode="cinematico" type="button">Atardecer cinematográfico</button>
        <button class="v105-mode" data-v105-mode="interior" type="button">Interior luminoso</button>
      </div>
      <label><input type="checkbox" id="v105-enable"> Activar corrección visual</label>
      <label for="v105-intensity">Intensidad <output id="v105-value"></output></label>
      <input type="range" min="0" max="150" step="5" id="v105-intensity">
      <p class="v105-help">Ajusta color, contraste y exposición percibida. No modifica geometría ni materiales originales.</p>
      <p class="v105-help" id="v105-state" role="status">Buscando visor…</p>
    </div><button type="button" class="v105-toggle" aria-expanded="false">◐ Calidad visual</button>`;
    document.body.appendChild(root);
    const toggle=root.querySelector('.v105-toggle'), panel=root.querySelector('.v105-panel');
    toggle.addEventListener('click',()=>{
      panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));
    });
    root.querySelectorAll('[data-v105-mode]').forEach(b=>b.addEventListener('click',()=>{
      settings.preset=b.dataset.v105Mode;update();
    }));
    const enable=root.querySelector('#v105-enable'), amount=root.querySelector('#v105-intensity'), output=root.querySelector('#v105-value');
    enable.checked=Boolean(settings.enabled);
    amount.value=String(settings.intensity);output.value=String(settings.intensity)+'%';
    enable.addEventListener('change',()=>{settings.enabled=enable.checked;update()});
    amount.addEventListener('input',()=>{settings.intensity=Number(amount.value);output.value=amount.value+'%';update()});
    update();
  }
  function boot(){
    init();
    const observer=new MutationObserver(()=>{if(!document.getElementById('inmo3d-v105'))init();findCanvases()});
    observer.observe(document.documentElement,{subtree:true,childList:true});
    setInterval(findCanvases,2400);
    window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();