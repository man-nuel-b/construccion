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
console.log(`${n} pruebas adicionales V3.2 superadas.`);
