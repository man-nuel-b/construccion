/* Detección local experimental de cambios de contraste verticales.
   No es IA semántica, no obtiene medidas reales ni identifica piezas ocultas. */
(function(root){'use strict';
 async function suggestFromImage(file){
  if(!file||!file.type.startsWith('image/'))throw new Error('Selecciona un archivo de imagen JPG, PNG o WebP.');
  if(file.size>12*1024*1024)throw new Error('La imagen supera el límite de 12 MB.');
  const img=await createImageBitmap(file);const w=420,h=280,cv=document.createElement('canvas');cv.width=w;cv.height=h;const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);img.close?.();
  const rgb=ctx.getImageData(0,0,w,h).data;let scores=[];
  for(let x=2;x<w-2;x++){let score=0;for(let y=45;y<245;y+=3){const i=(y*w+x)*4,j=(y*w+x-2)*4;const a=rgb[i]*.299+rgb[i+1]*.587+rgb[i+2]*.114,b=rgb[j]*.299+rgb[j+1]*.587+rgb[j+2]*.114;score+=Math.abs(a-b);}scores[x]=score;}
  const smooth=scores.map((_,x)=>{let t=0,c=0;for(let j=x-4;j<=x+4;j++)if(Number.isFinite(scores[j])){t+=scores[j];c++;}return t/Math.max(1,c)});
  const mean=smooth.slice(30,w-30).reduce((a,b)=>a+b,0)/(w-60);
  const peaks=[];
  for(let x=45;x<w-45;x++){if(smooth[x]>mean*1.55&&smooth[x]>(smooth[x-8]||0)&&smooth[x]>=(smooth[x+8]||0))peaks.push({x,score:smooth[x]});}
  peaks.sort((a,b)=>b.score-a.score);
  const chosen=[];for(const peak of peaks){if(chosen.every(k=>Math.abs(k-peak.x)>55)){chosen.push(peak.x);if(chosen.length===5)break;}}
  const count=Math.max(1,Math.min(6,chosen.length+1));
  return {modules:count,edges:chosen.sort((a,b)=>a-b),confidence:'experimental',detail:`Detecté ${chosen.length} posibles divisiones por contraste. Confirma visualmente: pueden ser sombras o texturas.`};
 }
 root.MueblesVision={suggestFromImage};
})(window);
