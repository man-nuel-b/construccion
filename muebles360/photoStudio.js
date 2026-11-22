/* Muebles360 V3.6 — helpers puros para zonas y guías fotográficas.
   NO infiere medidas físicas ni garantiza reconocimiento semántico. */
(function(root){'use strict';
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function normalizeLines(lines,max=5){
 const arr=(Array.isArray(lines)?lines:[]).map(Number).filter(v=>Number.isFinite(v)&&v>=.055&&v<=.945).sort((a,b)=>a-b);
 const out=[];for(const y of arr){if(out.every(v=>Math.abs(y-v)>=.055)){out.push(y);if(out.length>=max)break}}
 return out;
}
function moveLine(lines,index,y){
 const arr=normalizeLines(lines);
 if(index<0||index>=arr.length)return arr;
 const lo=index?arr[index-1]+.055:.055,hi=index<arr.length-1?arr[index+1]-.055:.945;
 if(lo>hi)return arr;
 arr[index]=clamp(Number(y)||arr[index],lo,hi);
 return arr;
}
function addLine(lines,y){return normalizeLines([...(Array.isArray(lines)?lines:[]),Number(y)]);}
function deriveCounts(type,lines,mixPct=45){
 const ys=normalizeLines(lines);
 if(type==='abierto')return {shelves:ys.length,drawers:1};
 if(type==='cajones')return {shelves:0,drawers:clamp(ys.length+1,1,5)};
 if(type==='mixto'){
   const cut=1-clamp(Number(mixPct)||45,25,75)/100;
   const upper=ys.filter(y=>y<cut-.035).length,lower=ys.filter(y=>y>cut+.035).length;
   return {shelves:clamp(upper,0,5),drawers:clamp(lower+1,1,5)};
 }
 return {shelves:0,drawers:1};
}
function validateZone(spec){
 if(!spec||typeof spec!=='object')throw Error('Zona inválida');
 const corners=spec.corners;
 if(Array.isArray(corners)&&corners.length){
  if(corners.length!==4||corners.some(p=>!p||!Number.isFinite(Number(p.x))||!Number.isFinite(Number(p.y))||p.x<0||p.x>1||p.y<0||p.y>1))throw Error('Se requieren cuatro esquinas válidas');
  return {corners:corners.map(p=>({x:Number(p.x),y:Number(p.y)})),roi:null};
 }
 const roi=spec.roi||{};const x0=Number(roi.x0),y0=Number(roi.y0),x1=Number(roi.x1),y1=Number(roi.y1);
 if(![x0,y0,x1,y1].every(Number.isFinite)||x0<0||y0<0||x1>1||y1>1||x1-x0<.2||y1-y0<.2)throw Error('Región demasiado pequeña o inválida');
 return {corners:[],roi:{x0,y0,x1,y1}};
}
function layoutSummary(zones){
 const withDesign=(zones||[]).filter(z=>z?.params && Number.isFinite(z?.estimatedTotal));
 return {count:withDesign.length,estimate:withDesign.reduce((s,z)=>s+z.estimatedTotal,0),requiresSeparateCutPlan:true};
}
root.MueblesPhotoStudio={normalizeLines,moveLine,addLine,deriveCounts,validateZone,layoutSummary};
if(typeof module!=='undefined'&&module.exports)module.exports=root.MueblesPhotoStudio;
})(typeof window!=='undefined'?window:globalThis);
