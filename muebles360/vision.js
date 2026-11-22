/* INGEBAM Muebles360 V3.2 — Lectura geométrica local de píxeles, sin envío de imágenes.
   Detecta bordes candidatos; no es un clasificador semántico entrenado ni garantiza
   medidas, número de módulos, tipo de frente ni detalles ocultos. Revisión obligatoria. */
(function(root){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function smooth(v,r=2){return v.map((_,i)=>{let a=0,n=0;for(let j=Math.max(0,i-r);j<=Math.min(v.length-1,i+r);j++){a+=v[j];n++;}return a/n})}
function peaks(profile,{first=0,last=profile.length,spacing=20,maxCount=5,threshold=0.8}={}){
 const series=smooth(profile,2),candidate=series.slice(first,last).filter(Number.isFinite);
 const mean=candidate.reduce((a,b)=>a+b,0)/Math.max(1,candidate.length);
 const std=Math.sqrt(candidate.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,candidate.length));
 const minScore=mean+threshold*std;
 const points=[];
 for(let i=Math.max(3,first);i<Math.min(series.length-3,last);i++){
  if(series[i]>=minScore&&series[i]>=series[i-3]&&series[i]>series[i+3])points.push({at:i,score:series[i],prominence:(series[i]-mean)/(std+1e-6)});
 }
 points.sort((a,b)=>b.score-a.score);
 const selected=[];
 for(const p of points){if(selected.every(v=>Math.abs(v.at-p.at)>=spacing)){selected.push(p);if(selected.length>=maxCount)break}}
 return selected.sort((a,b)=>a.at-b.at);
}
function analyzeRaster({data,width,height},{roi={x0:0.025,y0:0.025,x1:0.975,y1:0.975},minConf=0.38}={}){
 if(!data||width<80||height<60||data.length<width*height*4)throw Error('Imagen demasiado pequeña o ilegible para analizar.');
 const x0=Math.floor(width*clamp(Number(roi.x0)||0,0,.8)),x1=Math.ceil(width*clamp(Number(roi.x1)||1,.2,1));
 const y0=Math.floor(height*clamp(Number(roi.y0)||0,0,.8)),y1=Math.ceil(height*clamp(Number(roi.y1)||1,.2,1));
 const w=x1-x0,h=y1-y0;
 if(w<70||h<50)throw Error('Selecciona una región mayor para analizar.');
 const gray=new Float32Array(w*h);let total=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const idx=((y+y0)*width+x+x0)*4;
  const g=data[idx]*.299+data[idx+1]*.587+data[idx+2]*.114;
  gray[y*w+x]=g;total+=g;
 }
 const xProfile=new Array(w).fill(0);
 for(let x=3;x<w-3;x++){
  let s=0,n=0;
  for(let y=Math.floor(h*.12);y<Math.floor(h*.9);y+=2){
   s+=Math.abs(gray[y*w+x+2]-gray[y*w+x-2]);n++;
  }
  xProfile[x]=s/Math.max(1,n);
 }
 const vertical=peaks(xProfile,{first:Math.round(w*.13),last:Math.round(w*.87),spacing:Math.round(w*.155),maxCount:5,threshold:0.95});
 const boundaries=[0,...vertical.map(p=>p.at),w];
 const regions=[];
 for(let i=0;i<boundaries.length-1;i++){
  const a=boundaries[i],b=boundaries[i+1],partW=b-a;
  const hx0=Math.floor(a+partW*.13),hx1=Math.ceil(b-partW*.13);
  const yProfile=new Array(h).fill(0);
  for(let y=3;y<h-3;y++){
   let s=0,n=0;
   for(let x=hx0;x<hx1;x+=2){s+=Math.abs(gray[(y+2)*w+x]-gray[(y-2)*w+x]);n++}
   yProfile[y]=s/Math.max(1,n);
  }
  // Se evalúan por separado la zona de repisas y la inferior. Los cajones
  // generan varios cantos cercanos entre sí, mientras una puerta suele tener
  // solo marco superior/inferior o uno o dos travesaños decorativos.
  const upper=peaks(yProfile,{first:Math.round(h*.07),last:Math.round(h*.53),spacing:Math.round(h*.067),maxCount:5,threshold:.58});
  const lower=peaks(yProfile,{first:Math.round(h*.54),last:Math.round(h*.91),spacing:Math.round(h*.067),maxCount:6,threshold:.65});
  const horizontal=[...upper,...lower].sort((a,b)=>a.at-b.at);
  let type='puerta',shelves=0,drawers=1;
  if(upper.length>=3&&lower.length>=3){type='mixto';shelves=clamp(upper.length-1,1,5);drawers=clamp(lower.length,1,5)}
  else if(lower.length>=3){type='cajones';drawers=clamp(lower.length,1,5)}
  else if(upper.length>=3){type='abierto';shelves=clamp(upper.length-1,1,5)}
  const conf=clamp(.22+(type==='mixto'?.34:type==='puerta'?.08:.25)+Math.min(.1,vertical.length*.02),.23,.7);
  regions.push({index:i,x0:a/w,x1:b/w,type,shelves,drawers,mixPct:45,lines:horizontal.map(p=>p.at/h),confidence:Number(conf.toFixed(2)),detail:
   `${upper.length} bordes superiores y ${lower.length} inferiores candidatos`});
 }
 const confidence=vertical.length?Math.min(.75,.3+vertical.length*.08):.18;
 return {source:'local-geometria',modules:regions.length,edges:vertical.map(p=>p.at/w),regions,
  confidence:Number(confidence.toFixed(2)),roi,detail:`Análisis geométrico preliminar: ${regions.length} zonas frontales y ${regions.reduce((a,r)=>a+r.lines.length,0)} líneas horizontales candidatas. Clasificaciones no verificadas.`};
}
async function suggestFromImage(file,options={}){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Selecciona imagen JPG, PNG o WebP.');
 if(file.size>12*1024*1024)throw Error('Imagen superior a 12 MB.');
 const bmp=await createImageBitmap(file),max=750,scale=Math.min(1,max/Math.max(bmp.width,bmp.height));
 const w=Math.max(80,Math.round(bmp.width*scale)),h=Math.max(60,Math.round(bmp.height*scale));
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;const ctx=cv.getContext('2d',{willReadFrequently:true});
 if(!ctx){bmp.close?.();throw Error('No fue posible analizar píxeles de la imagen.');}
 ctx.drawImage(bmp,0,0,w,h);bmp.close?.();
 return analyzeRaster(ctx.getImageData(0,0,w,h),options);
}
function normalizeAI(data,existing={}){
 if(!data||typeof data!=='object')throw Error('La IA no devolvió un objeto válido.');
 const types=['puerta','cajones','abierto','mixto'];const ct=Number(data.modules);
 const modules=clamp(Number.isFinite(ct)?Math.round(ct):Array.isArray(data.moduleTypes)?data.moduleTypes.length:existing.modules||3,1,6);
 const regions=Array.from({length:modules},(_,i)=>{
  const item=Array.isArray(data.regions)?data.regions[i]||{}:{};
  const type=types.includes(item.type)?item.type:types.includes(data.moduleTypes?.[i])?data.moduleTypes[i]:'puerta';
  return {index:i,type,drawers:clamp(Math.round(Number(item.drawers||data.moduleDrawers?.[i]||3)),1,5),shelves:clamp(Math.round(Number(item.shelves??data.moduleShelves?.[i]??1)),0,5),mixPct:clamp(Math.round(Number(item.mixPct)||45),25,75),confidence:clamp(Number(item.confidence)||.35,.05,.95),detail:String(item.detail||'Sugerencia de IA; verificar.').slice(0,150),x0:i/modules,x1:(i+1)/modules,lines:[]};
 });
 return {source:'ia-remota',category:['cocina','closet','vanitorio'].includes(data.category)?data.category:existing.category||'closet',modules,regions,confidence:clamp(Number(data.confidence)||.4,.05,.95),edges:regions.slice(0,-1).map(r=>r.x1),detail:String(data.notes||'Elementos propuestos mediante IA. No se conocen dimensiones reales.').slice(0,400)};
}
root.MueblesVision={suggestFromImage,analyzeRaster,normalizeAI};
if(typeof module!=='undefined'&&module.exports)module.exports=root.MueblesVision;
})(typeof window!=='undefined'?window:globalThis);
