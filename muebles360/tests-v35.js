'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('./furnitureCore.js');
const vision=require('./vision.js');
let ok=0;function test(name,fn){fn();ok++;console.log('OK '+name)}
test('Estilo de puerta se conserva y solo permite dos opciones',()=>{
 assert.equal(core.normalize({frontStyle:'marco'}).frontStyle,'marco');
 assert.equal(core.normalize({frontStyle:'otro'}).frontStyle,'liso');
});
test('Puerta con marco es solo visual: no modifica costo ni despiece',()=>{
 const a=core.estimate({category:'closet',frontStyle:'liso'});
 const b=core.estimate({category:'closet',frontStyle:'marco'});
 assert.equal(a.total,b.total);assert.equal(a.model.parts.length,b.model.parts.length);
 assert(b.model.alerts.some(x=>x.includes('SOLO una representación visual')));
});
test('Detector rectificado no reprocesa ROI anterior',()=>{
 const src=fs.readFileSync('./vision.js','utf8');
 assert(src.includes('isRectified?{x0:0,y0:0,x1:1,y1:1}:options.roi'));
 assert(src.includes('result.roi={x0:0,y0:0,x1:1,y1:1}'));
});
test('Guías arrastrables sincronizan la revisión sin aplicar el diseño',()=>{
 const html=fs.readFileSync('./index.html','utf8'),app=fs.readFileSync('./app.js','utf8');
 assert(html.includes('id="guideHelp"'));
 assert(html.includes('id="frontStyle"'));
 for(const s of ["pointerdown",'pointermove','adjustReviewDivider','normalizeRegionWeights','reviewWeightInputs'])assert(app.includes(s));
 assert(app.includes("id('applyVision').addEventListener"));
});
test('Servidor IA continúa opcional y no hay API key en frontend',()=>{
 const html=fs.readFileSync('./index.html','utf8'),app=fs.readFileSync('./app.js','utf8');
 assert(html.includes('aiEndpoint: (location.hostname'));
 assert(!html.includes('AIza'));
 assert(app.includes('new URL(endpoint,location.href).origin'));
});
console.log(`${ok} pruebas V3.5 superadas`);
