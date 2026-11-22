/* INGEBAM Inmo3D Premium V11.4 — optional screen-space ambient occlusion.
 * Enhances actual contact shadowing using Three.js' maintained post-processing add-ons.
 * Fallbacks to vanilla renderer if SSAO unsupported or too expensive.
 */
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createCinematicPipeline({THREE,renderer,scene,camera}) {
  let composer=null,ssao=null,enabled=false, lastError=null, fps=60,poorFrames=0;
  const state={version:'11.4',passes:['RenderPass','SSAOPass','OutputPass'],mode:'standard'};
  const mobile=matchMedia('(max-width:700px)').matches;
  function setup() {
    if(composer)return true;
    try {
      const maxDim=mobile?1200:1920;
      const ratio=Math.min(1,maxDim/Math.max(innerWidth,innerHeight));
      const w=Math.max(1,Math.floor(innerWidth*ratio));
      const h=Math.max(1,Math.floor(innerHeight*ratio));
      composer=new EffectComposer(renderer);
      composer.setPixelRatio(Math.min(renderer.getPixelRatio(),mobile?1:1.25));
      composer.setSize(w,h);
      composer.addPass(new RenderPass(scene,camera));
      ssao=new SSAOPass(scene,camera,w,h,16);
      ssao.kernelRadius=9;
      ssao.minDistance=.002;
      ssao.maxDistance=.095;
      composer.addPass(ssao);
      composer.addPass(new OutputPass());
      return true;
    } catch(e) {
      lastError=String(e);dispose();return false;
    }
  }
  function dispose(){
    if(composer) {
      for(const pass of composer.passes){if(typeof pass.dispose==='function')pass.dispose();}
      composer.renderTarget1?.dispose();composer.renderTarget2?.dispose();
    }
    composer=null;ssao=null;enabled=false;state.mode='standard';
  }
  function resize(){
    if(composer) {
      const ratio=Math.min(1,(mobile?1200:1920)/Math.max(innerWidth,innerHeight));
      composer.setSize(Math.max(1,Math.floor(innerWidth*ratio)),Math.max(1,Math.floor(innerHeight*ratio)));
    }
  }
  function setEnabled(value){
    if(value && !setup()){enabled=false;return false;}
    enabled=Boolean(value);poorFrames=0;
    state.mode=enabled?'occlusion':'standard';
    return enabled;
  }
  function render(){
    if(!enabled){renderer.render(scene,camera);return;}
    try {composer.render();}
    catch(e){lastError=String(e);enabled=false;state.mode='fallback';renderer.render(scene,camera);}
  }
  function reportFPS(measuredFPS){
    fps=measuredFPS;
    if(!enabled)return;
    if(measuredFPS<23)poorFrames++;else poorFrames=Math.max(0,poorFrames-1);
    // Disable after sustained poor performance, never punish a transient loading hiccup.
    if(poorFrames>=4){enabled=false;state.mode='performance-fallback';}
  }
  return {render,resize,setEnabled,reportFPS,dispose,
    status:()=>({...state,enabled,fps,lastError})};
}