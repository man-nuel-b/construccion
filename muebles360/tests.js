const assert=require('node:assert/strict');
const C=require('./furnitureCore.js');
function test(name,fn){try{fn();console.log('OK',name)}catch(e){console.error('FAIL',name);throw e}}
test('Presets y dimensiones enteras',()=>{for(const key of Object.keys(C.PRESETS)){const p=C.normalize({category:key});assert.ok(p.width>=600&&p.height>=500);assert.equal(p.moduleTypes.length,p.modules);assert.equal(Number.isInteger(p.width),true)}});
test('Despiece: tablero costado orientado largo × ancho × espesor',()=>{const x=C.generate({category:'cocina'});const s=x.parts.find(p=>p.name==='Costado izquierdo');assert.equal(s.thickness,18);assert.equal(s.length,770);assert.equal(s.width,579)});
test('Hojas pequeñas no tienen medidas negativas',()=>{const x=C.generate({category:'cocina',width:600,modules:6,height:500,depth:350});for(const p of x.parts)assert.ok(p.length>0&&p.width>0&&p.thickness>0);assert.ok(x.params.modules<=2)});
test('Módulo cajonera cuenta correderas y piezas',()=>{const m=C.generate({category:'cocina'});assert.equal(m.hardware.runners,3);assert.ok(m.parts.some(p=>p.name==='Fondo de cajón'))});
test('Cambio de número de módulos recalcula geometría',()=>{const a=C.generate({category:'closet',modules:2}),b=C.generate({category:'closet',modules:3});assert.ok(b.parts.length>a.parts.length)});
test('Presupuesto aumenta si sube precio de la plancha',()=>{const low=C.estimate({}, {sheet18:10000}),hi=C.estimate({}, {sheet18:100000});assert.ok(hi.total>low.total)});
test('IVA 19% sobre venta',()=>{const a=C.estimate({}, {includeVat:false}),b=C.estimate({}, {includeVat:true});assert.ok(Math.abs(b.vat-a.total*.19)<.01);assert.ok(b.total>a.total)});
test('Despiece consolidado conserva cantidad',()=>{const m=C.generate({category:'cocina'});assert.equal(C.consolidate(m.parts).reduce((n,x)=>n+x.qty,0),m.parts.length)});
console.log('8 pruebas del motor completadas.');
// Nuevas verificaciones V2: distribución, medidas y costos a partir de módulos.
test('Anchos modulares suman espacio útil exacto',()=>{
 for(const cat of Object.keys(C.PRESETS))for(let w=600;w<=3600;w+=150){const p=C.normalize({category:cat,width:w,modules:6});
  assert.equal(p.moduleWidths.reduce((a,b)=>a+b,0)+2*p.thickness+(p.modules-1)*p.thickness,p.width);
  assert.ok(p.moduleWidths.every(v=>v>=260));
 }
});
test('Cambiar ancho de un módulo conserva ancho del casco',()=>{const p=C.resizeModule({category:'cocina',modules:3},1,850);assert.ok(Math.abs(p.moduleWidths[1]-850)<=1);assert.equal(p.moduleWidths.reduce((a,b)=>a+b,0)+2*p.thickness+(p.modules-1)*p.thickness,p.width)});
test('Número de cajones por módulo modifica correderas',()=>{
 const a=C.generate({moduleTypes:['puerta','puerta','cajones'],moduleDrawers:[3,3,2]});
 const b=C.generate({moduleTypes:['puerta','puerta','cajones'],moduleDrawers:[3,3,5]});
 assert.equal(a.hardware.runners,2);assert.equal(b.hardware.runners,5);
});
test('Planchas sin solapamientos y todas las piezas ubicadas para presets',()=>{
 for(const key of Object.keys(C.PRESETS)){
  const m=C.generate({category:key}),layout=C.layoutCutSheets(m.parts,{kerfMm:4,trimMm:8});
  assert.equal(layout.unplaced.length,0,`No caben piezas de ${key}: ${JSON.stringify(layout.unplaced.map(x=>x.name))}`);
  const nParts=m.parts.filter(x=>x.kind!=='countertop').length;
  assert.equal(layout.sheets.reduce((n,s)=>n+s.items.length,0),nParts);
  for(const sheet of layout.sheets){for(const p of sheet.items){assert.ok(p.x>=8&&p.y>=8);assert.ok(p.x+p.w<=2432&&p.y+p.h<=1822)}
   for(let i=0;i<sheet.items.length;i++)for(let j=i+1;j<sheet.items.length;j++){
    const a=sheet.items[i],b=sheet.items[j];assert.ok(a.x+a.w+4<=b.x||b.x+b.w+4<=a.x||a.y+a.h+4<=b.y||b.y+b.h+4<=a.y,`Solapamiento ${key} en plancha ${sheet.index}: ${a.name} con ${b.name}`)
   }
  }
 }
});
test('La cantidad de planchas responde al ancho, sin ser estimación solo por superficie',()=>{
 const small=C.estimate({category:'cocina',width:900,modules:1});
 const big=C.estimate({category:'cocina',width:3200,modules:5});
 assert.ok(big.nesting.sheets.length>=small.nesting.sheets.length);
 assert.ok(big.directCost>=small.directCost);
});
test('Reporta piezas fuera de plancha sin ocultar la falta de costeo',()=>{
 const model=C.generate({category:'closet',height:2600});
 const layout=C.layoutCutSheets(model.parts,{allowRotation:false});
 assert.ok(layout.unplaced.length>0);
 const est=C.estimate({category:'closet',height:2600});assert.equal(est.validForQuote,false);
});
console.log('Pruebas V2 completadas.');

// Pruebas V3: nuevas reglas, presupuesto comercial y controles.
const Q=require('./quoteEngine.js');
test('Permite exactamente un cajón por cuerpo',()=>{const m=C.generate({category:'cocina',moduleTypes:['puerta','puerta','cajones'],moduleDrawers:[1,1,1]});assert.equal(m.hardware.runners,1)});
test('Instalación y despacho se contabilizan de forma independiente',()=>{const a=C.estimate({},{installationHours:0,deliveryFee:0}),b=C.estimate({},{installationHours:5,deliveryFee:35000});assert.equal(b.costs.installation,5*b.prices.laborHour);assert.equal(b.costs.delivery,35000);assert.ok(b.directCost>a.directCost)});
test('Contingencia se añade antes del margen de venta',()=>{const a=C.estimate({},{contingencyPct:0}),b=C.estimate({},{contingencyPct:10});assert.ok(Math.abs(b.contingency-b.directCost*.10)<.01);assert.ok(b.subtotal>a.subtotal)});
test('Advertencia de puerta demasiado ancha',()=>{const m=C.generate({category:'cocina',modules:1,width:1500,moduleTypes:['puerta']});assert.ok(m.alerts.some(v=>v.includes('puerta de ancho útil')))});
test('Presupuesto HTML escapa contenido del cliente y evita inyección',()=>{const html=Q.makeQuoteHTML(C.estimate({}),{client:'<script>alert(1)</script>',notes:'A & B'});assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('A &amp; B'))});
test('Presupuesto indica explícitamente piezas fuera de tablero',()=>{const html=Q.makeQuoteHTML(C.estimate({category:'closet',height:2600}),{});assert.ok(html.includes('NO debe entregarse'))});
console.log('Pruebas V3 completadas.');
