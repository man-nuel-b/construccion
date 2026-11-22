/* INGEBAM Muebles360 V3.5 — Lectura geométrica local de píxeles, sin envío de imágenes.
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
// Rectificación proyectiva guiada: 4 puntos en orden SI, SD, ID, II.
// Las esquinas son porcentajes del fotograma, nunca medidas métricas.
function rectifyRaster(image,corners,maxSize=750){
 const {data,width,height}=image;
 if(!data||data.length<width*height*4||!Array.isArray(corners)||corners.length!==4)throw Error('Marca las cuatro esquinas del mueble antes de rectificar.');
 const points=corners.map(p=>({x:Number(p.x)*width,y:Number(p.y)*height}));
 if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>width||p.y>height))throw Error('Las esquinas deben estar dentro de la foto.');
 let sign=0;
 for(let i=0;i<4;i++){
  const a=points[i],b=points[(i+1)%4],c=points[(i+2)%4];const cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
  if(Math.abs(cross)<10)throw Error('Selecciona un contorno de cuatro esquinas bien separado.');
  if(sign&&Math.sign(cross)!==sign)throw Error('Las esquinas se cruzan o tienen un orden incorrecto. Usa superior izquierda, superior derecha, inferior derecha, inferior izquierda.');
  sign=Math.sign(cross);
 }
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),[p0,p1,p2,p3]=points;
 let w=Math.round(Math.max(dist(p0,p1),dist(p3,p2))),h=Math.round(Math.max(dist(p0,p3),dist(p1,p2)));
 if(w<50||h<50)throw Error('El mueble delimitado es demasiado pequeño. Selecciona una zona mayor.');
 const factor=Math.min(1,maxSize/Math.max(w,h));w=Math.max(80,Math.round(w*factor));h=Math.max(60,Math.round(h*factor));
 // Homografía inversa: rectángulo (u,v) → cuadrilátero en la fotografía.
 const dx1=p1.x-p2.x,dx2=p3.x-p2.x,dx3=p0.x-p1.x+p2.x-p3.x;
 const dy1=p1.y-p2.y,dy2=p3.y-p2.y,dy3=p0.y-p1.y+p2.y-p3.y;
 const det=dx1*dy2-dx2*dy1;
 let g=0,k=0;
 if(Math.abs(dx3)+Math.abs(dy3)>1e-6){if(Math.abs(det)<1e-6)throw Error('Perspectiva demasiado deformada. Revisa las esquinas.');g=(dx3*dy2-dx2*dy3)/det;k=(dx1*dy3-dx3*dy1)/det}
 const a=p1.x-p0.x+g*p1.x,b=p3.x-p0.x+k*p3.x,c=p0.x;
 const d=p1.y-p0.y+g*p1.y,e=p3.y-p0.y+k*p3.y,f=p0.y;
 const out=new Uint8ClampedArray(w*h*4);
 for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
  const u=(xx+.5)/w,v=(yy+.5)/h,q=g*u+k*v+1;
  if(Math.abs(q)<1e-9)continue;
  const srcX=clamp((a*u+b*v+c)/q,0,width-1),srcY=clamp((d*u+e*v+f)/q,0,height-1);
  const x0=Math.floor(srcX),y0=Math.floor(srcY),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),fx=srcX-x0,fy=srcY-y0;
  const base=(yy*w+xx)*4;
  for(let channel=0;channel<3;channel++){
   const A=data[(y0*width+x0)*4+channel],B=data[(y0*width+x1)*4+channel],C=data[(y1*width+x0)*4+channel],D=data[(y1*width+x1)*4+channel];
   out[base+channel]=(A*(1-fx)+B*fx)*(1-fy)+(C*(1-fx)+D*fx)*fy;
  }
  out[base+3]=255;
 }
 return {width:w,height:h,data:out};
}
async function suggestFromImage(file,options={}){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Selecciona imagen JPG, PNG o WebP.');
 if(file.size>12*1024*1024)throw Error('Imagen superior a 12 MB.');
 const bmp=await createImageBitmap(file),max=750,scale=Math.min(1,max/Math.max(bmp.width,bmp.height));
 const w=Math.max(80,Math.round(bmp.width*scale)),h=Math.max(60,Math.round(bmp.height*scale));
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;const ctx=cv.getContext('2d',{willReadFrequently:true});
 if(!ctx){bmp.close?.();throw Error('No fue posible analizar píxeles de la imagen.');}
 ctx.drawImage(bmp,0,0,w,h);bmp.close?.();
 const original=ctx.getImageData(0,0,w,h);
 const rectified=options.corners?.length===4?rectifyRaster(original,options.corners):original;
 const isRectified=options.corners?.length===4;
 const result=analyzeRaster(rectified,{roi:isRectified?{x0:0,y0:0,x1:1,y1:1}:options.roi});
 if(isRectified){result.roi={x0:0,y0:0,x1:1,y1:1};const out=document.createElement('canvas');out.width=rectified.width;out.height=rectified.height;out.getContext('2d').putImageData(new ImageData(rectified.data,rectified.width,rectified.height),0,0);result.previewURL=out.toDataURL('image/png');result.rectified=true}
 return result;
}
function normalizeAI(data,existing={}){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('La IA no devolvió un objeto válido.');
 const types=['puerta','cajones','abierto','mixto'];const ct=Number(data.modules);
 const modules=clamp(Number.isFinite(ct)?Math.round(ct):Array.isArray(data.regions)?data.regions.length:existing.modules||3,1,6);
 const fromAI=Array.isArray(data.regions)?data.regions:[];
 // Conservar la proporción de anchos propuesta por IA, pero NO interpretarla como mm.
 // La respuesta externa no es fiable: recomponer siempre límites contiguos y válidos.
 const widths=Array.from({length:modules},(_,i)=>{
  const r=fromAI[i]||{},x0=Number(r.x0),x1=Number(r.x1);
  return Number.isFinite(x0)&&Number.isFinite(x1)&&x1>x0&&x0>=0&&x1<=1?clamp(x1-x0,.04,1):1/modules;
 });
 const total=widths.reduce((a,b)=>a+b,0);let cursor=0;
 const regions=Array.from({length:modules},(_,i)=>{
  const item=fromAI[i]||{},type=types.includes(item.type)?item.type:types.includes(data.moduleTypes?.[i])?data.moduleTypes[i]:'puerta';
  const x0=cursor;cursor+=widths[i]/total;const x1=i===modules-1?1:cursor;
  const num=(v,backup)=>Number.isFinite(Number(v))?Number(v):backup;
  return {index:i,type,drawers:clamp(Math.round(num(item.drawers,3)),1,5),shelves:clamp(Math.round(num(item.shelves,1)),0,5),
   mixPct:clamp(Math.round(num(item.mixPct,45)),25,75),confidence:clamp(num(item.confidence,.35),.05,.95),
   detail:String(item.detail||'Hipótesis de IA; verificar visualmente.').slice(0,150),x0,x1,lines:[]};
 });
 return {source:'ia-multimodal',category:['cocina','closet','vanitorio'].includes(data.category)?data.category:existing.category||'closet',modules,regions,
  confidence:clamp(Number(data.confidence)||.4,.05,.95),edges:regions.slice(0,-1).map(r=>r.x1),
  detail:String(data.notes||'Propuesta aproximada: solo elementos visibles, sin medidas reales.').slice(0,400),
  warnings:Array.isArray(data.warnings)?data.warnings.slice(0,5).map(x=>String(x).slice(0,130)):[]};
}
// Prepara únicamente la zona señalada, ya sea el ROI rectangular o las 4 esquinas.
// La fotografía NO sale del navegador hasta que el usuario pulse expresamente IA real.
async function prepareImageForAI(file,options={}){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error('Imagen JPG/PNG/WebP inválida o superior a 12 MB.');
 const bmp=await createImageBitmap(file);const s=Math.min(1,1250/Math.max(bmp.width,bmp.height));
 const c=document.createElement('canvas');c.width=Math.max(80,Math.round(bmp.width*s));c.height=Math.max(60,Math.round(bmp.height*s));
 const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx){bmp.close?.();throw Error('Canvas no disponible');}
 ctx.drawImage(bmp,0,0,c.width,c.height);bmp.close?.();
 let output=c;
 if(Array.isArray(options.corners)&&options.corners.length===4){
  const rect=rectifyRaster(ctx.getImageData(0,0,c.width,c.height),options.corners,1050);
  output=document.createElement('canvas');output.width=rect.width;output.height=rect.height;
  output.getContext('2d').putImageData(new ImageData(rect.data,rect.width,rect.height),0,0);
 }else if(options.roi){
  const r=options.roi,x0=clamp(Number(r.x0)||0,0,1),y0=clamp(Number(r.y0)||0,0,1),x1=clamp(Number(r.x1)||1,0,1),y1=clamp(Number(r.y1)||1,0,1);
  if(x1-x0<.25||y1-y0<.25)throw Error('La selección debe abarcar al menos 25% de la imagen.');
  const sx=Math.round(x0*c.width),sy=Math.round(y0*c.height),sw=Math.max(50,Math.round((x1-x0)*c.width)),sh=Math.max(50,Math.round((y1-y0)*c.height));
  output=document.createElement('canvas');output.width=sw;output.height=sh;output.getContext('2d').drawImage(c,sx,sy,sw,sh,0,0,sw,sh);
 }
 const previewURL=output.toDataURL('image/jpeg',.85);
 return {data:previewURL.slice(previewURL.indexOf(',')+1),mimeType:'image/jpeg',previewURL,width:output.width,height:output.height};
}

root.MueblesVision={suggestFromImage,analyzeRaster,normalizeAI,rectifyRaster,prepareImageForAI};
if(typeof module!=='undefined'&&module.exports)module.exports=root.MueblesVision;
})(typeof window!=='undefined'?window:globalThis);
