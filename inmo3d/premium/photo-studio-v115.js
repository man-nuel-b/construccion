/* INGEBAM Inmo3D Premium V11.5 — architectural photo studio.
 * Works only on the independent Premium prototype.
 * Requires preserveDrawingBuffer WebGL context for reliable screenshot export.
 */
export function createPhotoStudio({camera,renderer,controls,cinematic,THREE}) {
  const state={version:'11.5',focalLength:35,framing:false,grid:false,lastCapture:null,errors:[]};
  let gridOverlay=null;
  const initialFov=camera.fov;
  const defaultTarget=controls.target.clone();
  const buttons=[...document.querySelectorAll('[data-lens]')];
  const captureButton=document.getElementById('snapshot');
  const frameButton=document.getElementById('framing');
  const gridButton=document.getElementById('composition');
  function updateLabels(){
    buttons.forEach(btn=>btn.setAttribute('aria-pressed',String(Number(btn.dataset.lens)===state.focalLength)));
    if(frameButton)frameButton.setAttribute('aria-pressed',String(state.framing));
    if(gridButton)gridButton.setAttribute('aria-pressed',String(state.grid));
  }
  function setFocalLength(mm) {
    const n=Number(mm);
    if (![24,35,50].includes(n))return false;
    camera.setFocalLength(n);
    camera.updateProjectionMatrix();
    state.focalLength=n;
    updateLabels();
    return true;
  }
  function toggleFraming(){
    state.framing=!state.framing;
    if(state.framing){
      // Keep a photographic lens without distorting subject scale.
      const distance=camera.position.distanceTo(controls.target);
      controls.minDistance=Math.max(3,distance*.34);
      controls.maxDistance=65;
    }else{
      controls.minDistance=7;controls.maxDistance=52;
    }
    updateLabels();
  }
  function toggleGrid(){
    state.grid=!state.grid;
    if(gridOverlay)gridOverlay.hidden=!state.grid;
    updateLabels();
  }
  function mountGrid(){
    if(gridOverlay)return;
    gridOverlay=document.createElement('div');
    gridOverlay.id='ingebam-photo-grid';
    gridOverlay.hidden=true;
    gridOverlay.setAttribute('aria-hidden','true');
    gridOverlay.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2;background:linear-gradient(to right,transparent 33.25%,#fff6 33.33%,transparent 33.42%,transparent 66.58%,#fff6 66.67%,transparent 66.75%),linear-gradient(to bottom,transparent 33.25%,#fff6 33.33%,transparent 33.42%,transparent 66.58%,#fff6 66.67%,transparent 66.75%);';
    document.body.appendChild(gridOverlay);
  }
  async function capture(){
    if(!captureButton)return false;
    const oldText=captureButton.textContent;
    captureButton.disabled=true;captureButton.textContent='Preparando imagen…';
    try{
      // Let camera easing settle before capture; user may still orbit while recording.
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      // Hide overlay and controls from image by capturing only the WebGL canvas.
      const canvas=renderer.domElement;
      if(canvas.width<=0||canvas.height<=0)throw Error('Lienzo WebGL inválido');
      const blob=await new Promise((resolve,reject)=>{
        canvas.toBlob(b=>b?resolve(b):reject(Error('El navegador no pudo generar el PNG')),'image/png');
      });
      const url=URL.createObjectURL(blob);
      const date=new Date();
      const stamp=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('');
      const link=document.createElement('a');
      link.href=url;link.download='INGEBAM-Inmo3D-Premium-'+stamp+'-'+state.focalLength+'mm.png';
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),4500);
      state.lastCapture=date.toISOString();
      captureButton.textContent='PNG generado ✓';
      setTimeout(()=>{captureButton.textContent=oldText;captureButton.disabled=false;},1400);
      return true;
    }catch(error){
      state.errors.push(String(error));
      captureButton.textContent='Error al capturar';
      setTimeout(()=>{captureButton.textContent=oldText;captureButton.disabled=false;},2000);
      return false;
    }
  }
  function install(){
    mountGrid();
    buttons.forEach(btn=>btn.addEventListener('click',()=>setFocalLength(btn.dataset.lens)));
    frameButton?.addEventListener('click',toggleFraming);
    gridButton?.addEventListener('click',toggleGrid);
    captureButton?.addEventListener('click',()=>{void capture();});
    setFocalLength(35);
  }
  install();
  return Object.freeze({capture,setFocalLength,getStatus:()=>({...state}),reset(){
    camera.fov=initialFov;camera.updateProjectionMatrix();controls.target.copy(defaultTarget);
    state.framing=false;state.grid=false;if(gridOverlay)gridOverlay.hidden=true;updateLabels();
  }});
}