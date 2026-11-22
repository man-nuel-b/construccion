'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');
const C=require('./furnitureCore.js'),V=require('./vision.js');let n=0;
function test(name,run){run();n++;console.log('OK',name)}
test('Módulo mixto se normaliza y conserva porcentaje de cajones',()=>{
 const v=C.normalize({category:'closet',moduleTypes:['mixto','puerta','abierto'],moduleMixPct:[45,120,2]});
 assert.equal(v.moduleTypes[0],'mixto');assert.deepEqual(v.moduleMixPct,[45,75,25]);
});
test('Módulo mixto genera piezas superiores e inferiores con correderas',()=>{
 const s=C.normalize({category:'closet',modules:2,moduleTypes:['mixto','puerta'],moduleDrawers:[3,1],moduleShelves:[2,0],moduleMixPct:[45,45]});
 const m=C.generate(s);assert.equal(m.hardware.runners,3);
 assert(m.parts.some(p=>p.name==='Entrepaño separador mixto'));
 assert(m.parts.some(p=>p.name==='Repisa interior'&&p.moduleIndex===0));
 assert.equal(m.parts.filter(p=>p.name==='Frente de cajón'&&p.moduleIndex===0).length,3);
 for(const p of m.parts)assert(Math.min(p.length,p.width,p.thickness)>0);
 const e=C.estimate(s);assert(Number.isFinite(e.total)&&e.total>0);
});
test('Motor de imagen analiza píxeles sin usar nombres de archivo',()=>{
 const width=300,height=200,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;let v=165;
  if(Math.abs(x-100)<2||Math.abs(x-200)<2)v=25;
  if(x<95&&[24,48,72,117,134,151,168].some(y0=>Math.abs(y-y0)<2))v=30;
  data[i]=v;data[i+1]=v*.82;data[i+2]=v*.62;data[i+3]=255;
 }
 const a=V.analyzeRaster({width,height,data});assert(a.modules>=2&&a.modules<=6);
 assert.equal(a.regions.length,a.modules);assert(a.regions.every(r=>['puerta','cajones','abierto','mixto'].includes(r.type)));
 assert(a.regions.every(r=>r.x0>=0&&r.x1<=1&&r.x1>r.x0));
});
test('El adaptador de IA restringe clases y cantidades absurdas',()=>{
 const r=V.normalizeAI({category:'inexistente',modules:49,moduleTypes:['mal','mixto'],regions:[{type:'abierto',shelves:900,drawers:-12,mixPct:300}]},{category:'closet'});
 assert.equal(r.modules,6);assert.equal(r.category,'closet');assert.equal(r.regions[0].shelves,5);assert.equal(r.regions[0].mixPct,75);
 assert(r.regions.every(x=>x.drawers>=1&&x.drawers<=5));
});
test('Revisión de imagen requiere aceptación expresa, diseño sigue editable',()=>{
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 for(const id of ['visionReviewPanel','visionResults','visionOverlay','visionCategory','applyVision','discardVision','moduleMixPct','roiLeft','roiBottom'])assert(html.includes('id="'+id+'"'));
 const app=fs.readFileSync(__dirname+'/app.js','utf8');assert(app.includes("id('applyVision').addEventListener"));assert(app.includes('reviewVision(result)'));
 assert(!app.includes('state={...state,modules:r.modules,moduleTypes:Array.from'));
});

test('Rectificación de cuadrilátero entero conserva la imagen y sus medidas',()=>{
 const w=160,h=100,data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;data[i]=x;data[i+1]=y;data[i+2]=40;data[i+3]=255}
 const rect=V.rectifyRaster({width:w,height:h,data},[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]);
 assert.equal(rect.width,160);assert.equal(rect.height,100);
 const center=(50*rect.width+80)*4;assert(Math.abs(rect.data[center]-80)<3);assert(Math.abs(rect.data[center+1]-50)<3);
});
test('Delimitación perspectiva aísla un mueble de dos objetos vecinos',()=>{
 const w=360,h=210,data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;
  const isWardrobe=x>85+y*.15&&x<262-y*.1&&y>12&&y<195;
  data[i]=isWardrobe?102:220;data[i+1]=isWardrobe?82:24;data[i+2]=isWardrobe?52:24;data[i+3]=255;
 }
 const rect=V.rectifyRaster({width:w,height:h,data},[{x:.245,y:.085},{x:.725,y:.085},{x:.675,y:.91},{x:.325,y:.91}]);
 let inside=0;for(let y=15;y<rect.height-15;y++)for(let x=15;x<rect.width-15;x++){const i=(y*rect.width+x)*4;if(rect.data[i+1]>rect.data[i+2])inside++}
 assert(inside>0);const middle=((rect.height>>1)*rect.width+(rect.width>>1))*4;assert(rect.data[middle+1]>60);
});
test('Rechaza rectángulos auto-cruzados o degenerados',()=>{
 const data=new Uint8ClampedArray(100*100*4),im={width:100,height:100,data};
 assert.throws(()=>V.rectifyRaster(im,[{x:0,y:0},{x:1,y:1},{x:1,y:0},{x:0,y:1}]),/cruzan|orden|esquinas/i);
 assert.throws(()=>V.rectifyRaster(im,[{x:0,y:0},{x:.01,y:0},{x:.01,y:.01},{x:0,y:.01}]),/pequeño|separado/i);
});
test('El editor V3.3 incorpora revisión de cuatro esquinas, proporciones y privacidad',()=>{
 const html=fs.readFileSync(__dirname+'/index.html','utf8'),app=fs.readFileSync(__dirname+'/app.js','utf8');
 for(const id of ['chooseCorners','cornerCanvas','cornerPicker','cornerStatus','undoCorner','resetCorners','visionResults'])assert(html.includes(`id="${id}"`));
 assert(app.includes("photoCorners.length===4?photoCorners:undefined"));
 assert(app.includes('normalizeRegionWeights()'));
 assert(app.includes('Ancho relativo visual'));
 assert(html.includes('aiEndpoint: (location.hostname')); 
});
console.log(`${n} pruebas adicionales V3.3 superadas.`);
