'use strict';
const assert=require('node:assert/strict');
const {processImage,normalizeGemini,server}=require('./server.js');
const V=require('./vision.js');
const tinyPNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
const tests=[];const test=(name,fn)=>tests.push({name,fn});
test('Recupera proporciones distintas devueltas por la IA',()=>{
 const v=V.normalizeAI({category:'closet',modules:3,regions:[{type:'abierto',x0:0,x1:.22,shelves:4},{type:'mixto',x0:.22,x1:.6,drawers:4},{type:'puerta',x0:.6,x1:1}]});
 assert.equal(v.regions.length,3);assert(Math.abs(v.regions[0].x1-.22)<.001);assert(Math.abs(v.regions[1].x1-.6)<.001);
 assert.equal(v.regions[1].type,'mixto');assert.equal(v.regions[1].drawers,4);
});
test('Repara geometrías solapadas, NaN y extremos erróneos',()=>{
 const v=V.normalizeAI({modules:2,regions:[{x0:0,x1:3,type:'invalid',drawers:-400},{x0:.3,x1:.75,type:'abierto',shelves:99}]});
 assert.equal(v.regions[0].x0,0);assert.equal(v.regions[1].x1,1);assert(v.regions[0].x1<v.regions[1].x1);
 assert.equal(v.regions[0].type,'puerta');assert.equal(v.regions[0].drawers,1);assert.equal(v.regions[1].shelves,5);
});
test('No se usa Gemini cuando falta GEMINI_API_KEY',async()=>{
 await assert.rejects(processImage({mimeType:'image/png',data:tinyPNG},{apiKey:''}),e=>e.status===503);
});
test('Rechaza base64 y MIME inválido antes de enviar una solicitud externa',async()=>{
 await assert.rejects(processImage({mimeType:'image/png',data:Buffer.from('fake').toString('base64')},{apiKey:'fake'}),e=>e.status===400);
});
test('Simulación de proveedor multimodal produce modelo revisable sin medidas',async()=>{
 let called=0;const result=await processImage({mimeType:'image/png',data:tinyPNG},{apiKey:'fake',fetchImpl:async(url,opts)=>{
  called++;assert(url.includes('generateContent'));const req=JSON.parse(opts.body);assert(req.contents[0].parts[1].inline_data.data===tinyPNG);
  return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({category:'closet',modules:2,regions:[{type:'mixto',x0:0,x1:.3,drawers:4,shelves:3,confidence:.62},{type:'puerta',x0:.3,x1:1,confidence:.7}],confidence:.65,notes:'frentes visibles'})}]}}]})};
 }});
 assert.equal(called,1);assert.equal(result.modules,2);assert(result.regions[0].x1<.4);assert.equal(result.regions[0].type,'mixto');assert(!('width' in result));
});
test('Servidor local publica capacidades, sin exponer clave secreta',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const url=`http://127.0.0.1:${server.address().port}/api/capabilities`,resp=await fetch(url);assert(resp.ok);
 const info=await resp.json();assert.equal(info.requiresExplicitConsent,true);assert.equal(typeof info.aiAvailable,'boolean');assert(!JSON.stringify(info).includes('GEMINI_API_KEY'));
 }finally{await new Promise(resolve=>server.close(resolve))}
});
(async()=>{for(const t of tests){await t.fn();console.log('OK',t.name)}console.log(`${tests.length} pruebas V3.4 IA superadas`);})().catch(e=>{console.error(e);process.exitCode=1});
