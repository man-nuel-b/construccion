/* INGEBAM Muebles360 v2 — Núcleo paramétrico, cubicación y nesting preliminar.
   Unidades internas: milímetros ENTEROS. Independiente de vista y de API externa.
   ADVERTENCIA: requiere revisión técnica de taller antes de fabricar. */
(function(root){'use strict';
const PRESETS={
 cocina:{label:'Mueble base de cocina',width:1800,height:900,depth:600,modules:3,shelves:1,drawers:3,baseType:'zocalo',moduleTypes:['puerta','puerta','cajones']},
 closet:{label:'Clóset a medida',width:2400,height:2200,depth:600,modules:3,shelves:3,drawers:3,baseType:'zocalo',moduleTypes:['puerta','abierto','cajones']},
 vanitorio:{label:'Vanitorio',width:1200,height:750,depth:500,modules:2,shelves:0,drawers:2,baseType:'suspendido',moduleTypes:['puerta','cajones']}
};
const FINISHES={roble:{label:'Roble natural',color:'#b99264'},nogal:{label:'Nogal oscuro',color:'#60432d'},blanco:{label:'Blanco mate',color:'#e9e9e6'},grafito:{label:'Grafito',color:'#424b58'}};
const DEFAULT_PRICES={hardwareProfile:'estandar',softCloseHinge:6900,softCloseRunnerPair:27500,sheet18:52000,sheet15:46000,back3:17000,edgeMeter:1500,hinge:3200,runnerPair:14500,handle:2800,leg:3800,countertopMeter:75000,laborHour:9500,installationHours:0,deliveryFee:0,contingencyPct:0,overheadPct:12,marginPct:25,includeVat:false,kerfMm:4,trimMm:8,allowRotation:false};
const BOARD_W=2440,BOARD_H=1830,MIN_CLEAR=260;
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const int=(v,f)=>Math.round(n(v,f));
function allocateWidths(total,weights,min=MIN_CLEAR){
 const count=weights.length;if(!count)return[];
 const rest=Math.max(0,Math.round(total-count*min));
 const realWidths=weights.every(x=>n(x,0)>=min);
 const w=weights.map(x=>Math.max(.00001,realWidths?n(x,min)-min:n(x,1)));
 const sum=w.reduce((a,b)=>a+b,0),raw=w.map(x=>rest*x/sum);
 const alloc=raw.map(x=>Math.floor(x));let remaining=rest-alloc.reduce((a,b)=>a+b,0);
 const order=raw.map((x,i)=>({i,frac:x-Math.floor(x)})).sort((a,b)=>b.frac-a.frac||a.i-b.i);
 for(let k=0;k<remaining;k++)alloc[order[k%count].i]++;
 return alloc.map(x=>x+min);
}
function normalize(raw={}){
 const category=Object.hasOwn(PRESETS,raw.category)?raw.category:'cocina',preset=PRESETS[category];
 const width=int(clamp(n(raw.width,preset.width),600,3600),preset.width),height=int(clamp(n(raw.height,preset.height),500,2600),preset.height),depth=int(clamp(n(raw.depth,preset.depth),350,750),preset.depth);
 const thickness=n(raw.thickness,18)===15?15:18;
 const maxModules=Math.max(1,Math.min(6,Math.floor((width-thickness)/(MIN_CLEAR+thickness))));
 const modules=int(clamp(n(raw.modules,preset.modules),1,maxModules),preset.modules);
 const moduleTypes=Array.from({length:modules},(_,i)=>['puerta','cajones','abierto','mixto'].includes(raw.moduleTypes?.[i])?raw.moduleTypes[i]:(preset.moduleTypes[i]||'puerta'));
 const moduleWidths=allocateWidths(width-2*thickness-(modules-1)*thickness,Array.from({length:modules},(_,i)=>n(raw.moduleWidths?.[i],1)));
 const shelves=int(clamp(n(raw.shelves,preset.shelves),0,5),preset.shelves),drawers=int(clamp(n(raw.drawers,preset.drawers),1,5),preset.drawers);
 const moduleShelves=Array.from({length:modules},(_,i)=>int(clamp(n(raw.moduleShelves?.[i],shelves),0,5),shelves));
 const moduleDrawers=Array.from({length:modules},(_,i)=>int(clamp(n(raw.moduleDrawers?.[i],drawers),1,5),drawers));
 const moduleMixPct=Array.from({length:modules},(_,i)=>int(clamp(n(raw.moduleMixPct?.[i],45),25,75),45));
 const moduleHingeSides=Array.from({length:modules},(_,i)=>['left','right'].includes(raw.moduleHingeSides?.[i])?raw.moduleHingeSides[i]:(i%2===0?'left':'right'));
 const baseType=['zocalo','patas','suspendido'].includes(raw.baseType)?raw.baseType:preset.baseType;
 const frontStyle=raw.frontStyle==='marco'?'marco':'liso';
 return {category,width,height,depth,thickness,modules,moduleTypes,moduleWidths,moduleShelves,moduleDrawers,moduleMixPct,moduleHingeSides,baseType,shelves,drawers,frontStyle,finish:Object.hasOwn(FINISHES,raw.finish)?raw.finish:'roble'};
}
function resizeModule(raw,index,newWidth){
 const p=normalize(raw);if(!Number.isInteger(index)||index<0||index>=p.modules)return p;
 if(p.modules===1)return p;
 const sum=p.moduleWidths.reduce((a,b)=>a+b,0);
 const target=int(clamp(n(newWidth,p.moduleWidths[index]),MIN_CLEAR,sum-MIN_CLEAR*(p.modules-1)),p.moduleWidths[index]);
 const weights=p.moduleWidths.filter((_,i)=>i!==index);
 const others=allocateWidths(sum-target,weights);
 let j=0;const next=p.moduleWidths.map((w,i)=>i===index?target:others[j++]);
 return normalize({...p,moduleWidths:next});
}
function generate(raw){
 const p=normalize(raw),parts=[],hardware={hinges:0,runners:0,handles:0,legs:0};
 const T=p.thickness,W=p.width,H=p.height,D=p.depth;
 const baseH=p.baseType==='zocalo'?100:p.baseType==='patas'?120:0;
 const hasTop=p.category!=='closet',topT=hasTop?30:0,carcassH=H-baseH-topT;
 const depthInside=D-T-3,innerHeight=carcassH-2*T,doorGap=3,baseY=baseH;
 const add=(name,kind,dx,dy,dz,x,y,z,edges=0,opts={})=>{
  if(Math.min(dx,dy,dz)<=0)return null;
  let length,width,thickness;
  // Espesor real explícito para planos, sin inferir por orientación de la pieza en 3D.
  if(kind==='countertop'){thickness=topT;length=dx;width=dz;}
  else if(kind==='back'){thickness=3;length=Math.max(dx,dy,dz);width=[dx,dy,dz].sort((a,b)=>b-a)[1];}
  else {thickness=T;const lengths=[dx,dy,dz].sort((a,b)=>b-a);length=lengths[0];width=lengths[1];}
  const part={id:`P${parts.length+1}`,name,kind,dx,dy,dz,x,y,z,length:Math.round(length),width:Math.round(width),thickness:Math.round(thickness),edges,material:kind==='back'?'MDF 3 mm':kind==='countertop'?'Cubierta':`Melamina ${T} mm`,...opts};
  parts.push(part);return part;
 };
 if(p.baseType==='zocalo'){
  add('Zócalo frontal','body',W-2*T,100,T,0,50,D/2-50,1);
  add('Zócalo trasero','body',W-2*T,100,T,0,50,-D/2+50,0);
 }else if(p.baseType==='patas')hardware.legs=(p.modules+1)*2;
 add('Costado izquierdo','body',T,carcassH,depthInside,-W/2+T/2,baseY+carcassH/2,-T/2,1);
 add('Costado derecho','body',T,carcassH,depthInside,W/2-T/2,baseY+carcassH/2,-T/2,1);
 add('Piso de casco','interior',W-2*T,T,depthInside,0,baseY+T/2,-T/2,1);
 add('Techo de casco','interior',W-2*T,T,depthInside,0,baseY+carcassH-T/2,-T/2,1);
 const dividers=[],moduleCenters=[];let offset=-W/2+T;
 for(let i=0;i<p.modules;i++){
  const cw=p.moduleWidths[i],x=offset+cw/2;moduleCenters.push(x);
  // Trasera se divide por módulo para caber en las planchas estándar; uniones requieren validar apoyo.
  add('Trasera MDF módulo','back',Math.max(20,cw-2),Math.max(20,innerHeight-2),3,x,baseY+carcassH/2,-D/2+T+1.5,0,{moduleIndex:i});
  offset+=cw;
  if(i<p.modules-1){dividers.push(offset+T/2);offset+=T;}
 }
 for(const x of dividers)add('División vertical','interior',T,innerHeight,depthInside-5,x,baseY+carcassH/2,-T/2,1);
 if(hasTop)add('Cubierta superior','countertop',W+20,topT,D+20,0,H-topT/2,0,0);
 const frontZ=D/2-T/2;
 for(let i=0;i<p.modules;i++){
  const x=moduleCenters[i],cw=p.moduleWidths[i],type=p.moduleTypes[i];
  const lowerH=type==='mixto'?Math.round(carcassH*p.moduleMixPct[i]/100):carcassH;
  if(type==='mixto'){
   const separatorY=baseY+lowerH;
   add('Entrepaño separador mixto','interior',cw-4,T,Math.max(80,depthInside-35),x,separatorY,-T/2-12,1,{moduleIndex:i});
  }
  if(type!=='cajones')for(let j=1;j<=p.moduleShelves[i];j++){
    const usable=type==='mixto'?Math.max(80,innerHeight-lowerH):innerHeight;
    const y=(type==='mixto'?baseY+lowerH+T:baseY+T)+j*usable/(p.moduleShelves[i]+1);
    add('Repisa interior','interior',cw-4,T,Math.max(80,depthInside-35),x,y,-T/2-12,1,{moduleIndex:i});
  }
  if(type==='puerta'){
   const doorW=cw+T-doorGap,doorH=carcassH-2*doorGap;
   const part=add('Puerta abatible','front',doorW,doorH,T,x,baseY+carcassH/2,frontZ,4,{moduleIndex:i,motion:'door',hingeSide:p.moduleHingeSides[i]});
   if(part){hardware.hinges+=doorH>1900?4:doorH>950?3:2;hardware.handles++;}
  }else if(type==='cajones'||type==='mixto'){
   const count=p.moduleDrawers[i],frontH=type==='mixto'?lowerH:carcassH,frH=(frontH-(count+1)*doorGap)/count;
   for(let j=0;j<count;j++){
    const y=baseY+doorGap+frH/2+j*(frH+doorGap);
    add('Frente de cajón','front',cw+T-doorGap,frH,T,x,y,frontZ,4,{moduleIndex:i,motion:'drawer'});
    const boxH=Math.min(135,frH-45),boxD=Math.min(depthInside-80,450);
    if(boxH>35&&boxD>120){
     add('Lateral cajón','interior',T,boxH,boxD,x-cw/2+T+6,y,0,0,{moduleIndex:i,motion:'drawer'});
     add('Lateral cajón','interior',T,boxH,boxD,x+cw/2-T-6,y,0,0,{moduleIndex:i,motion:'drawer'});
     add('Frente/trasera caja','interior',Math.max(120,cw-4*T-24),boxH,T,x,y,boxD/2-12,0,{moduleIndex:i,motion:'drawer'});
     add('Frente/trasera caja','interior',Math.max(120,cw-4*T-24),boxH,T,x,y,-boxD/2+12,0,{moduleIndex:i,motion:'drawer'});
     add('Fondo de cajón','back',Math.max(120,cw-4*T-24),3,boxD-10,x,y-boxH/2,0,0,{moduleIndex:i,motion:'drawer'});
    }
    hardware.runners++;hardware.handles++;
   }
  }
 }
 const alerts=[];
 for(const part of parts){if(part.kind==='countertop')continue;
  if(part.length>BOARD_W||part.width>BOARD_H)alerts.push(`La pieza «${part.name}» (${part.length} × ${part.width} mm) supera el tablero estándar si no se reorienta o divide.`);
 }
 if(p.moduleWidths.some(w=>w<280))alerts.push('Hay módulos estrechos: validar funcionamiento de puertas, cajones y herrajes.');
 for(let i=0;i<p.modules;i++){if(p.moduleTypes[i]==='puerta'&&p.moduleWidths[i]>650)alerts.push(`Módulo ${i+1}: puerta de ancho útil ${p.moduleWidths[i]} mm. Revisar peso, cantidad de bisagras y posible división del frente.`);if(['cajones','mixto'].includes(p.moduleTypes[i])&&p.moduleWidths[i]>1000)alerts.push(`Módulo ${i+1}: cajonera ancha; validar correderas, cargas admisibles y refuerzos.`)}
 if(p.baseType==='suspendido')alerts.push('Montaje suspendido: verificar anclajes, soporte y carga real del muro.');
 if(hasTop)alerts.push('Cubierta: no se modelan perforaciones, cantos especiales ni unión a muros.');
 if(p.frontStyle==='marco')alerts.push('El frente moldurado es SOLO una representación visual: NO se incluyen molduras, mecanizados ni horas adicionales en el despiece o precio.');
 alerts.push('El despiece es preliminar: revisar veta, tolerancias, uniones, anclajes, cajones y medida en terreno antes de cortar.');
 return{params:p,parts,hardware,alerts:[...new Set(alerts)],dimensions:{carcassH,moduleWidths:p.moduleWidths,moduleCenters,innerHeight}};
}
function consolidate(parts){const map=new Map();for(const a of parts){const key=[a.name,a.length,a.width,a.thickness,a.material,a.edges].join('|');if(!map.has(key))map.set(key,{...a,qty:0});map.get(key).qty++}return[...map.values()]}
// Algoritmo de colocación MaxRects simplificado, determinista; NO genera instrucciones CNC.
function rectanglesIntersect(a,b){return !(a.x>=b.x+b.w||a.x+a.w<=b.x||a.y>=b.y+b.h||a.y+a.h<=b.y)}
function contains(a,b){return b.x>=a.x&&b.y>=a.y&&b.x+b.w<=a.x+a.w&&b.y+b.h<=a.y+a.h}
function placeRect(board,w,h,rotateAllowed){
 let best=null;
 for(const r of board.free){for(const rotated of rotateAllowed?[false,true]:[false]){
  const rw=rotated?h:w,rh=rotated?w:h;
  if(rw<=r.w&&rh<=r.h){const short=Math.min(r.w-rw,r.h-rh),long=Math.max(r.w-rw,r.h-rh),score=short*100000+long;
   if(!best||score<best.score)best={x:r.x,y:r.y,w:rw,h:rh,score,rotated};
  }
 }}
 if(!best)return null;
 const next=[];for(const r of board.free){if(!rectanglesIntersect(r,best)){next.push(r);continue;}
  if(best.x>r.x)next.push({x:r.x,y:r.y,w:best.x-r.x,h:r.h});
  if(best.x+best.w<r.x+r.w)next.push({x:best.x+best.w,y:r.y,w:r.x+r.w-best.x-best.w,h:r.h});
  if(best.y>r.y)next.push({x:r.x,y:r.y,w:r.w,h:best.y-r.y});
  if(best.y+best.h<r.y+r.h)next.push({x:r.x,y:best.y+best.h,w:r.w,h:r.y+r.h-best.y-best.h});
 }
 board.free=next.filter((r,i,a)=>r.w>0&&r.h>0&&!a.some((other,j)=>i!==j&&contains(other,r)&&(other.w*other.h>r.w*r.h||j<i)));
 return best;
}
function layoutCutSheets(parts,options={}){
 const kerf=int(clamp(n(options.kerfMm,4),0,10),4),trim=int(clamp(n(options.trimMm,8),0,30),8),allowRotation=Boolean(options.allowRotation),W=BOARD_W-2*trim,H=BOARD_H-2*trim;
 const groups=new Map(),unplaced=[];
 for(const p of parts){if(p.kind==='countertop')continue;const key=p.kind==='back'?'back3':p.thickness===15?'sheet15':'sheet18';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p)}
 const sheets=[];
 for(const [material,pieces] of groups){
  const groupBoards=[];
  const sorted=[...pieces].sort((a,b)=>Math.max(b.length,b.width)-Math.max(a.length,a.width)||b.length*b.width-a.length*a.width||a.id.localeCompare(b.id));
  for(const p of sorted){
   const rw=p.length+kerf,rh=p.width+kerf;
   if(Math.min(rw,rh)>Math.min(W,H)&&Math.max(rw,rh)>Math.max(W,H)){unplaced.push({...p,reason:'La pieza supera la plancha disponible'});continue;}
   let chosen=null,board=null;
   for(const b of groupBoards){chosen=placeRect(b,rw,rh,allowRotation);if(chosen){board=b;break}}
   if(!chosen){board={material,index:groupBoards.length+1,width:BOARD_W,height:BOARD_H,trim,items:[],free:[{x:trim,y:trim,w:W,h:H}]};chosen=placeRect(board,rw,rh,allowRotation);if(!chosen){unplaced.push({...p,reason:'No cabe en la plancha con margen y orientación seleccionados'});continue;}groupBoards.push(board)}
   board.items.push({id:p.id,name:p.name,material:p.material,length:p.length,width:p.width,x:chosen.x,y:chosen.y,w:chosen.rotated?p.width:p.length,h:chosen.rotated?p.length:p.width,rotated:chosen.rotated,moduleIndex:p.moduleIndex});
  }
  sheets.push(...groupBoards);
 }
 const usedArea=sheets.reduce((acc,b)=>acc+b.items.reduce((a,p)=>a+p.length*p.width,0),0);
 const availableArea=sheets.length*W*H;
 return {sheets,unplaced,kerf,trim,usedArea,availableArea,wastePct:availableArea>0?Math.max(0,100*(1-usedArea/availableArea)):0,counts:{sheet18:sheets.filter(s=>s.material==='sheet18').length,sheet15:sheets.filter(s=>s.material==='sheet15').length,back3:sheets.filter(s=>s.material==='back3').length}};
}
function estimate(raw,rawPrices={}){
 const model=generate(raw),pr={...DEFAULT_PRICES,...rawPrices};
 pr.hardwareProfile=pr.hardwareProfile==='cierre_suave'?'cierre_suave':'estandar';
 const nesting=layoutCutSheets(model.parts,pr),boards={sheets18:nesting.counts.sheet18,sheets15:nesting.counts.sheet15,sheets3:nesting.counts.back3};
 let edgeMm=0;for(const p of model.parts){if(p.kind==='countertop'||p.kind==='back')continue;edgeMm+=p.edges===4?2*(p.length+p.width):p.edges*p.length}
 const costs={
  boards:boards.sheets18*pr.sheet18+boards.sheets15*pr.sheet15+boards.sheets3*pr.back3,
  edgeband:edgeMm/1000*pr.edgeMeter,
  hardware:model.hardware.hinges*(pr.hardwareProfile==='cierre_suave'?clamp(n(pr.softCloseHinge,DEFAULT_PRICES.softCloseHinge),0,1000000):pr.hinge)+model.hardware.runners*(pr.hardwareProfile==='cierre_suave'?clamp(n(pr.softCloseRunnerPair,DEFAULT_PRICES.softCloseRunnerPair),0,1000000):pr.runnerPair)+model.hardware.handles*pr.handle+model.hardware.legs*pr.leg,
  countertop:model.params.category==='closet'?0:model.params.width/1000*pr.countertopMeter,
  labor:(4+2.5*model.params.modules+1.2*model.hardware.runners)*pr.laborHour,
  installation:clamp(n(pr.installationHours,0),0,500)*pr.laborHour,
  delivery:clamp(n(pr.deliveryFee,0),0,10000000)
 };
 const directCost=Object.values(costs).reduce((a,b)=>a+b,0),overhead=directCost*clamp(n(pr.overheadPct),0,100)/100,contingency=directCost*clamp(n(pr.contingencyPct),0,100)/100,margin=clamp(n(pr.marginPct),0,75)/100;
 const subtotal=(directCost+overhead+contingency)/(1-margin),vat=pr.includeVat?subtotal*.19:0;
 if(nesting.unplaced.length)model.alerts.unshift(`Atención: ${nesting.unplaced.length} pieza(s) no caben en la plancha configurada. El costo puede estar SUBESTIMADO.`);
 if(pr.hardwareProfile==='cierre_suave')model.alerts.unshift('Cierre suave seleccionado: comprobar modelos de bisagras/correderas, compatibilidad, carga y perforaciones con proveedor.');
 if(pr.allowRotation)model.alerts.unshift('Orientación de veta: se permitieron giros en distribución de corte; revisar cada pieza con el taller.');
 return {model,prices:pr,boards,nesting,edgeMeters:edgeMm/1000,costs,directCost,overhead,contingency,subtotal,vat,total:subtotal+vat,margin,validForQuote:nesting.unplaced.length===0};
}
// Lista para compras orientativa, derivada de los mismos costos del motor.
// No incorpora tornillería, adhesivos, desperdicios adicionales ni códigos de proveedor.
function purchaseList(estimateResult){
 const e=estimateResult,pr=e.prices,h=e.model.hardware;
 const rows=[];
 function push(code,description,unit,qty,unitCost){
  if(!Number.isFinite(qty)||qty<=0)return;
  const q=Math.round(qty*1000)/1000,c=Math.max(0,Number(unitCost)||0);
  rows.push({code,description,unit,qty:q,unitCost:c,total:Math.round(q*c)});
 }
 push('TAB-18','Tablero melamina 18 mm (2440 × 1830)','plancha',e.nesting.counts.sheet18,pr.sheet18);
 push('TAB-15','Tablero melamina 15 mm (2440 × 1830)','plancha',e.nesting.counts.sheet15,pr.sheet15);
 push('MDF-03','Trasera MDF 3 mm (2440 × 1830)','plancha',e.nesting.counts.back3,pr.back3);
 push('CANTO','Tapacanto PVC estimado','m',e.edgeMeters,pr.edgeMeter);
 const soft=pr.hardwareProfile==='cierre_suave';
 push(soft?'BIS-SU':'BIS-STD',soft?'Bisagra cierre suave':'Bisagra estándar','unidad',h.hinges,soft?pr.softCloseHinge:pr.hinge);
 push(soft?'COR-SU':'COR-STD',soft?'Corredera cierre suave (par)':'Corredera estándar (par)','par',h.runners,soft?pr.softCloseRunnerPair:pr.runnerPair);
 push('TIR','Tirador','unidad',h.handles,pr.handle);
 push('PAT','Pata regulable','unidad',h.legs,pr.leg);
 if(e.model.params.category!=='closet')push('CUB','Cubierta estimada','m lineal',e.model.params.width/1000,pr.countertopMeter);
 return {rows,total:rows.reduce((a,r)=>a+r.total,0),hardwareProfile:pr.hardwareProfile,incomplete:e.nesting.unplaced.length>0,unplaced:e.nesting.unplaced.length};
}
root.MueblesCore={PRESETS,FINISHES,DEFAULT_PRICES,BOARD_W,BOARD_H,normalize,resizeModule,generate,consolidate,layoutCutSheets,estimate,purchaseList};
if(typeof module!=='undefined'&&module.exports)module.exports=root.MueblesCore;
})(typeof window!=='undefined'?window:globalThis);
