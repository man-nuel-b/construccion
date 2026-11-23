/* INGEBAM Muebles360 V3.8 — App, cotizador y revisión fotográfica. Ninguna foto se sube sin activar IA. */
(()=>{'use strict';
 const C=window.MueblesCore,Money=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
 const id=x=>document.getElementById(x),money=x=>Money.format(x),ehtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let state=C.normalize({category:'cocina'}),current=null,selectedModule=0,selectedPhoto=null,photoURL=null,advanced=null,pendingVision=null,photoCorners=[],cornerPickerOpen=false,dragGuideIndex=-1;
 let dragHorizontalRegion=-1,dragHorizontalLine=-1,photoZones=[],activePhotoZone=-1;
 const S=window.MueblesPhotoStudio, M=window.MueblesManufacturing;
 let qaChecks={}, technicalFingerprint=null;
 let reviewWeightInputs=[],reviewDrawersInputs=[],reviewShelvesInputs=[];
 const metaIds=['clientName','clientContact','quoteRef','projectStage','projectNotes'];
 const history={past:[],future:[],last:null,restoring:false};
 function snapshot(){return JSON.stringify({params:state,prices:getPrices(),projectName:id('projectName').value,meta:getMeta(),qaChecks})}
 function remember(){const next=snapshot();if(history.last!==null&&history.last!==next&&!history.restoring){history.past.push(history.last);if(history.past.length>50)history.past.shift();history.future=[];}history.last=next;id('undoChange').disabled=!history.past.length;id('redoChange').disabled=!history.future.length}
 function getMeta(){return {client:id('clientName').value.slice(0,120),contact:id('clientContact').value.slice(0,140),quoteRef:id('quoteRef').value.slice(0,60),stage:id('projectStage').value,notes:id('projectNotes').value.slice(0,1200)}}
 function setMeta(meta={}){id('clientName').value=meta.client||'';id('clientContact').value=meta.contact||'';id('quoteRef').value=meta.quoteRef||'ING-0001';id('projectStage').value=['Borrador','Enviado','Aprobado','Fabricación','Instalado'].includes(meta.stage)?meta.stage:'Borrador';id('projectNotes').value=meta.notes||''}
 function restoreHistory(value){history.restoring=true;try{const v=JSON.parse(value);state=C.normalize(v.params);selectedModule=Math.min(selectedModule,state.modules-1);setPriceFields(v.prices||{});id('projectName').value=v.projectName||'';setMeta(v.meta||{});qaChecks={...(v.qaChecks||{})};technicalFingerprint=JSON.stringify({params:C.normalize(state),prices:getPrices()});update()}finally{history.restoring=false;history.last=snapshot();id('undoChange').disabled=!history.past.length;id('redoChange').disabled=!history.future.length}}
 const localViewer=new window.FurnitureViewer(id('viewer'),onSelectPart);let viewer=localViewer;
 const controls=['category','width','height','depth','thickness','modules','baseType','shelves','drawers','frontStyle'];
 function onSelectPart(part){
  const box=id('selected');if(!part){box.hidden=true;return;}
  box.hidden=false;box.replaceChildren();const strong=document.createElement('strong');strong.textContent=part.name;box.append(strong);
  const div=document.createElement('div');div.textContent=`${part.length} × ${part.width} × ${part.thickness} mm`;
  box.append(div);const detail=document.createElement('div');detail.textContent=`${part.id} · ${part.material} · módulo ${Number.isInteger(part.moduleIndex)?part.moduleIndex+1:'general'}`;box.append(detail);if(Number.isInteger(part.moduleIndex)){selectedModule=part.moduleIndex;syncFields();viewer.selectModule?.(selectedModule)}
 }
 const unitPriceIds=['softCloseHinge','softCloseRunnerPair','sheet15','back3','edgeMeter','hinge','runnerPair','handle','countertopMeter','laborHour','overheadPct','leg','installationHours','deliveryFee','contingencyPct'];
 function getPrices(){const pr={...C.DEFAULT_PRICES,hardwareProfile:id('hardwareProfile').value,sheet18:Math.max(0,Number(id('sheetPrice').value)||0),marginPct:Math.max(0,Number(id('margin').value)||0),includeVat:id('vat').checked,kerfMm:Number(id('kerf').value),trimMm:Number(id('trim').value),allowRotation:id('allowRotation').checked};for(const k of unitPriceIds)pr[k]=Math.max(0,Number(id(k).value)||0);return pr}
 function setPriceFields(pr){id('hardwareProfile').value=pr.hardwareProfile==='cierre_suave'?'cierre_suave':'estandar';for(const k of unitPriceIds)id(k).value=pr[k]??C.DEFAULT_PRICES[k];id('sheetPrice').value=pr.sheet18??C.DEFAULT_PRICES.sheet18;id('margin').value=pr.marginPct??C.DEFAULT_PRICES.marginPct;id('vat').checked=Boolean(pr.includeVat);id('kerf').value=pr.kerfMm??4;id('trim').value=pr.trimMm??8;id('allowRotation').checked=Boolean(pr.allowRotation)}
 function syncFields(){
  for(const k of controls)id(k).value=state[k];
  id('moduleType').value=state.moduleTypes[selectedModule]||'puerta';
  id('moduleHingeSide').value=state.moduleHingeSides[selectedModule]||'left';
  id('moduleHingeSide').disabled=state.moduleTypes[selectedModule]!=='puerta';
  id('moduleWidth').value=state.moduleWidths[selectedModule]||'';
  id('moduleWidth').disabled=state.modules===1;
  id('moduleDrawers').value=state.moduleDrawers[selectedModule]??state.drawers;
  id('moduleShelves').value=state.moduleShelves[selectedModule]??state.shelves;
  id('moduleMixPct').value=state.moduleMixPct[selectedModule]??45;
  id('moduleMixPct').disabled=state.moduleTypes[selectedModule]!=='mixto';
  id('moduleDrawers').disabled=!['cajones','mixto'].includes(state.moduleTypes[selectedModule]);
  id('moduleShelves').disabled=state.moduleTypes[selectedModule]==='cajones';
  id('moduleMoveLeft').disabled=selectedModule===0;id('moduleMoveRight').disabled=selectedModule===state.modules-1;
  id('hud').textContent=`${C.PRESETS[state.category].label} · ${state.width} × ${state.height} × ${state.depth} mm · ${state.modules} módulos`;
  const host=id('moduleButtons');host.replaceChildren();for(let i=0;i<state.modules;i++){
   const btn=document.createElement('button');btn.className='module-pill'+(i===selectedModule?' active':'');
   btn.textContent=String(i+1).padStart(2,'0')+` · ${state.moduleWidths[i]} mm`;
   btn.title=`Módulo ${i+1}: ${state.moduleTypes[i]}`;
   btn.onclick=()=>{selectedModule=i;syncFields();viewer.selectModule?.(i)};host.append(btn);
  }
  id('swatches').replaceChildren();for(const [key,f] of Object.entries(C.FINISHES)){
   const btn=document.createElement('button');btn.className='swatch'+(state.finish===key?' on':'');
   btn.style.background=f.color;btn.title=f.label;btn.setAttribute('aria-label',f.label);
   btn.onclick=()=>{state={...state,finish:key};update()};id('swatches').append(btn)
  }
 }
 const cutColors={sheet18:'#caa67c',sheet15:'#9bb7c8',back3:'#a9c4a5'};
 function sheetSVG(sheet,scale=1,label=true){
  let output=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2440 1830" role="img" aria-label="Plancha ${sheet.index}, ${sheet.material}"><rect width="2440" height="1830" fill="#f1f4f7" stroke="#657384" stroke-width="8"/>`;
  for(const item of sheet.items){
   const color=cutColors[sheet.material]||'#b8bdbb';const font=Math.max(16,Math.min(34,item.w/13));
   output+=`<rect x="${item.x}" y="${item.y}" width="${item.w}" height="${item.h}" fill="${color}" stroke="#485669" stroke-width="4"/>`;
   if(label&&item.w>125&&item.h>70)output+=`<text x="${item.x+item.w/2}" y="${item.y+Math.min(item.h*.44,75)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${font}" fill="#293543">${ehtml(item.name.slice(0,22))}</text><text x="${item.x+item.w/2}" y="${item.y+Math.min(item.h*.67,116)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.max(17,font*.85)}" fill="#293543">${item.length}×${item.width}</text>`;
  }
  output+='</svg>';return output;
 }
 function renderSheets(nest){
  const host=id('sheetPreviews');host.replaceChildren();id('sheetSummary').textContent=`${nest.sheets.length} planchas · aprovechamiento ${(100-nest.wastePct).toFixed(1)}% · ${nest.unplaced.length} piezas sin ubicar`;
  if(!nest.sheets.length){const note=document.createElement('p');note.className='muted';note.textContent='No hay piezas planas para distribuir.';host.append(note);return}
  nest.sheets.forEach((sheet,i)=>{
   const button=document.createElement('button');button.className='sheet-preview';button.type='button';
   const title=document.createElement('strong');title.textContent=`${i+1}. ${sheet.material==='back3'?'MDF 3 mm':sheet.material==='sheet15'?'Melamina 15 mm':'Melamina 18 mm'}`;
   const meta=document.createElement('em');meta.textContent=` · ${sheet.items.length} piezas`;button.append(title,meta);
   const picture=document.createElement('div');picture.innerHTML=sheetSVG(sheet);button.append(picture);
   button.addEventListener('click',()=>download(`INGEBAM_Plancha_${i+1}.svg`,sheetSVG(sheet),'image/svg+xml'));
   button.title='Clic para descargar el croquis de esta plancha';host.append(button);
  });
 }

 function saveLocal(){try{localStorage.setItem('ingebam-muebles360-v3',JSON.stringify({projectName:id('projectName').value,params:state,prices:getPrices(),meta:getMeta(),qaChecks}))}catch{}}
 function renderManufacturingQA(){
  const host=id('qaItems');host.replaceChildren();
  for(const task of M.CHECKS){
   const label=document.createElement('label');label.className='qa-item';
   const input=document.createElement('input');input.type='checkbox';input.checked=qaChecks[task.id]===true;
   const txt=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');
   strong.textContent=task.label;small.textContent=task.help;txt.append(strong,small);label.append(input,txt);
   input.addEventListener('change',()=>{qaChecks[task.id]=input.checked;renderManufacturingQA();remember();saveLocal()});host.append(label);
  }
  const report=M.assessment(current,qaChecks);
  id('qaStatus').textContent=`${report.status} · ${report.checksCompleted}/${M.CHECKS.length} comprobaciones · ${report.blocks.length} correcciones`;
  id('qaStatus').classList.toggle('qa-risk',report.blocks.length>0);
 }
 function renderPurchaseList(e){
  const buy=C.purchaseList(e),host=id('purchaseRows');host.replaceChildren();
  for(const item of buy.rows){const tr=document.createElement('tr');
   for(const value of [item.description,`${item.qty.toLocaleString('es-CL')} ${item.unit}`,money(item.unitCost),money(item.total)]){
    const td=document.createElement('td');td.textContent=value;tr.append(td);
   }host.append(tr);
  }
  id('purchaseTotal').textContent=money(buy.total);
  id('purchaseWarning').textContent=buy.incomplete?`ATENCIÓN: ${buy.unplaced} piezas sin ubicar. Las planchas y el costo de compras están incompletos.`:'Cantidades orientativas. No contempla tornillería, adhesivos, embalaje ni mecanizados.';
 }
 function update(){
  state=C.normalize(state);selectedModule=Math.min(selectedModule,state.modules-1);syncFields();
  const nextFingerprint=JSON.stringify({params:state,prices:getPrices()});
  if(technicalFingerprint!==null&&nextFingerprint!==technicalFingerprint)qaChecks={};
  technicalFingerprint=nextFingerprint;
  current=C.estimate(state,getPrices());const e=current,m=e.model;viewer.setModel(m);viewer.selectModule?.(selectedModule);
  id('boards').textContent=`${e.boards.sheets18+e.boards.sheets15} planchas`;
  id('backs').textContent=`${e.boards.sheets3} planchas`;
  id('edge').textContent=`${e.edgeMeters.toFixed(1)} m (aprox.)`;
  id('hardware').textContent=`${m.hardware.hinges} / ${m.hardware.runners}`;
  id('yieldPct').textContent=`${(100-e.nesting.wastePct).toFixed(1)}%`;
  for(const [el,key] of [['costBoards','boards'],['costEdge','edgeband'],['costHardware','hardware'],['costTop','countertop'],['costLabor','labor'],['costInstallation','installation'],['costDelivery','delivery']])id(el).textContent=money(e.costs[key]);
  id('directCost').textContent=money(e.directCost);id('overhead').textContent=money(e.overhead);id('contingency').textContent=money(e.contingency);
  id('subtotal').textContent=money(e.subtotal);id('vatValue').textContent=money(e.vat);
  id('vatRow').hidden=!e.prices.includeVat;id('total').textContent=money(e.total);
  id('partsCount').textContent=m.parts.length;
  renderManufacturingQA();
  id('quoteStatus').textContent=e.validForQuote?'Estimación de materiales sin piezas fuera de plancha. Requiere validación técnica.':`${e.nesting.unplaced.length} pieza(s) sin ubicar: precio incompleto; revisar dimensiones y orientación.`;
  id('quoteStatus').style.borderColor=e.validForQuote?'#38546b':'#be794f';
  const cut=C.consolidate(m.parts),tb=id('cutlist');tb.replaceChildren();for(const part of cut){if(part.kind==='countertop')continue;
   const tr=document.createElement('tr');for(const v of [part.name,part.qty,`${part.length} × ${part.width} × ${part.thickness}`]){const td=document.createElement('td');td.textContent=v;tr.append(td)}tb.append(tr)
  }
  id('alerts').replaceChildren();for(const a of m.alerts){const p=document.createElement('p');p.textContent='• '+a;id('alerts').append(p)}
  renderSheets(e.nesting);renderPurchaseList(e);remember();saveLocal()
 }
 for(const k of controls)id(k).addEventListener('change',e=>{
  if(k==='category'){state=C.normalize({category:e.target.value,finish:state.finish,thickness:state.thickness});selectedModule=0;viewer.reset()}
  else if(k==='modules'){const len=Math.round(Number(e.target.value));state={...state,modules:len,moduleTypes:Array.from({length:Math.max(1,len)},(_,i)=>state.moduleTypes[i]||'puerta'),moduleWidths:undefined,moduleShelves:undefined,moduleDrawers:undefined,moduleMixPct:undefined,moduleHingeSides:undefined}}
  else if(['width','height','depth','thickness','shelves','drawers'].includes(k)){state={...state,[k]:Number(e.target.value)};
   if(k==='shelves')state.moduleShelves=Array(state.modules).fill(Number(e.target.value));
   if(k==='drawers')state.moduleDrawers=Array(state.modules).fill(Number(e.target.value));
  }else state={...state,[k]:e.target.value};update();
 });
 id('moduleHingeSide').addEventListener('change',e=>{const arr=[...state.moduleHingeSides];arr[selectedModule]=e.target.value==='right'?'right':'left';state={...state,moduleHingeSides:arr};update()});
 id('moduleType').addEventListener('change',e=>{const moduleTypes=[...state.moduleTypes];moduleTypes[selectedModule]=e.target.value;state={...state,moduleTypes};update()});
 id('moduleMixPct').addEventListener('change',e=>{const arr=[...state.moduleMixPct];arr[selectedModule]=Math.max(25,Math.min(75,Math.round(Number(e.target.value)||45)));state={...state,moduleMixPct:arr};update()});
 id('moduleWidth').addEventListener('change',e=>{state=C.resizeModule(state,selectedModule,Number(e.target.value));update()});
 for(const [control,step] of [['moduleMoveLeft',-1],['moduleMoveRight',1]])id(control).addEventListener('click',()=>{const j=selectedModule+step;if(j<0||j>=state.modules)return;const next={...state};for(const key of ['moduleTypes','moduleWidths','moduleShelves','moduleDrawers','moduleMixPct','moduleHingeSides']){const list=[...state[key]];[list[selectedModule],list[j]]=[list[j],list[selectedModule]];next[key]=list}state=next;selectedModule=j;update()});
 for(const key of ['moduleDrawers','moduleShelves'])id(key).addEventListener('change',e=>{const p=key==='moduleDrawers'?'moduleDrawers':'moduleShelves';const arr=[...state[p]];arr[selectedModule]=Number(e.target.value);state={...state,[p]:arr};update()});
 for(const k of ['sheetPrice','margin','vat','kerf','trim','allowRotation','hardwareProfile',...unitPriceIds])id(k).addEventListener('change',update);
 id('projectName').addEventListener('change',update);for(const k of metaIds)id(k).addEventListener('change',update);
 id('undoChange').addEventListener('click',()=>{if(!history.past.length)return;history.future.push(snapshot());restoreHistory(history.past.pop())});
 id('redoChange').addEventListener('click',()=>{if(!history.future.length)return;history.past.push(snapshot());restoreHistory(history.future.pop())});
 id('toggleDoors').addEventListener('click',()=>{const open=viewer.toggle();id('toggleDoors').textContent=open?'Cerrar frentes':'Abrir frentes'});
 id('resetView').addEventListener('click',()=>viewer.reset());
 for(const [k,which] of [['viewFront','front'],['viewSide','side'],['viewTop','top']])id(k).addEventListener('click',()=>viewer.setView?.(which));
 id('enable3D').addEventListener('click',async()=>{
  const btn=id('enable3D');if(advanced){advanced.dispose();advanced=null;viewer=localViewer;id('viewport').dataset.mode='local';localViewer.setModel(current.model);localViewer.selectModule(selectedModule);btn.textContent='3D avanzado ↗';id('status').textContent='Volviste al visor offline.';return}
  btn.disabled=true;btn.textContent='Cargando Three.js…';id('status').textContent='Intentando cargar el visor 3D con internet…';
  try{advanced=await window.INGEBAMThree.createThreeViewer(id('viewport'),onSelectPart);viewer=advanced;id('viewport').dataset.mode='3d';viewer.setModel(current.model);viewer.selectModule(selectedModule);btn.textContent='Visor local';id('status').textContent='Visor WebGL avanzado activo. Usa el mouse para girar y seleccionar piezas.'}
  catch(e){btn.textContent='3D avanzado ↗';id('status').textContent='No fue posible activar WebGL: '+String(e?.message||e).slice(0,160)}finally{btn.disabled=false}
 });
 function clearVision(){pendingVision=null;dragGuideIndex=-1;dragHorizontalRegion=-1;dragHorizontalLine=-1;reviewWeightInputs=[];reviewDrawersInputs=[];reviewShelvesInputs=[];id('visionReviewPanel').hidden=true;id('visionResults').replaceChildren()}
 function field(parent,label,tag,settings={}){
  const wrap=document.createElement('label');wrap.textContent=label;
  const element=document.createElement(tag);Object.entries(settings).forEach(([k,v])=>{if(k==='options')for(const [value,text] of v){const option=document.createElement('option');option.value=value;option.textContent=text;element.append(option)}else element[k]=v});wrap.append(element);parent.append(wrap);return element;
 }
 async function paintVisionOverlay(){
  const cv=id('visionOverlay'),context=cv.getContext('2d');if(!context||!photoURL||!pendingVision)return;
  const img=new Image();img.src=pendingVision.previewURL||photoURL;try{await img.decode()}catch{return}
  if(!pendingVision)return;const W=640,H=Math.max(230,Math.round(640*img.height/img.width));cv.width=W;cv.height=H;
  context.drawImage(img,0,0,W,H);context.fillStyle='rgba(16,27,38,.18)';context.fillRect(0,0,W,H);
  const roi=pendingVision.roi||{x0:0,y0:0,x1:1,y1:1};
  context.lineWidth=2;context.strokeStyle='#fbdf9c';context.strokeRect(roi.x0*W,roi.y0*H,(roi.x1-roi.x0)*W,(roi.y1-roi.y0)*H);
  for(const r of pendingVision.regions){
   const x=(roi.x0+(roi.x1-roi.x0)*r.x0)*W, w=(roi.x1-roi.x0)*(r.x1-r.x0)*W;
   context.strokeStyle='rgba(67,230,184,.92)';context.strokeRect(x,roi.y0*H,w,(roi.y1-roi.y0)*H);
   context.fillStyle='rgba(7,19,30,.85)';context.fillRect(x,roi.y0*H,Math.min(w,150),23);
   context.fillStyle='#fff';context.font='bold 14px sans-serif';context.fillText(`${r.index+1} · ${r.type}`,x+5,roi.y0*H+16);
   context.strokeStyle='rgba(255,214,115,.82)';context.setLineDash([6,6]);
   for(let k=0;k<(r.lines||[]).length;k++){
    const y=r.lines[k],yy=(roi.y0+(roi.y1-roi.y0)*y)*H;
    context.beginPath();context.moveTo(x,yy);context.lineTo(x+w,yy);context.stroke();
    context.beginPath();context.arc(x+w*.55,yy,6.7,0,2*Math.PI);context.fillStyle='#79edff';context.fill();
   }
   context.setLineDash([]);
  }
  // Guides: draggable front divisions. These represent proportions, not real measurements.
  const yGuide=roi.y0*H+(roi.y1-roi.y0)*H*.82;
  for(let j=0;j<pendingVision.regions.length-1;j++){
   const guideX=(roi.x0+(roi.x1-roi.x0)*pendingVision.regions[j].x1)*W;
   context.beginPath();context.moveTo(guideX,roi.y0*H);context.lineTo(guideX,(roi.y1)*H);
   context.strokeStyle='#ffcf70';context.lineWidth=j===dragGuideIndex?5:3;context.stroke();
   context.beginPath();context.arc(guideX,yGuide,9,0,Math.PI*2);context.fillStyle='#ffe2a6';context.fill();
   context.fillStyle='#122132';context.font='bold 12px sans-serif';context.textAlign='center';context.fillText('↔',guideX,yGuide+4);
   context.textAlign='left';
  }
 }
 function normalizeRegionWeights(){
  if(!pendingVision)return;
  const rs=pendingVision.regions,values=rs.map(r=>Math.max(1,Number(r.weight)||1)),total=values.reduce((a,b)=>a+b,0);
  let pos=0;for(let i=0;i<rs.length;i++){rs[i].x0=pos;pos+=values[i]/total;rs[i].x1=i===rs.length-1?1:pos}
 }
 // Constrain adjacent boundaries to ensure neither candidate region disappears.
 function adjustReviewDivider(index,relativeX){
  if(!pendingVision||index<0||index>=pendingVision.regions.length-1)return;
  normalizeRegionWeights();
  const left=pendingVision.regions[index],right=pendingVision.regions[index+1];
  const lo=left.x0,hi=right.x1,minimum=.055;
  if(hi-lo<minimum*2)return;
  const next=Math.max(lo+minimum,Math.min(hi-minimum,relativeX));
  const weightSum=left.weight+right.weight;
  left.weight=Math.max(1,weightSum*(next-lo)/(hi-lo));
  right.weight=Math.max(1,weightSum-left.weight);
  normalizeRegionWeights();
  reviewWeightInputs.forEach((input,j)=>{if(input)input.value=String(Math.round(pendingVision.regions[j].weight));});
  paintVisionOverlay();
 }
 function reviewPointerFraction(event){
  const cv=id('visionOverlay'),rect=cv.getBoundingClientRect();
  const roi=pendingVision?.roi||{x0:0,x1:1};
  return (Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width))-roi.x0)/(roi.x1-roi.x0);
 }
 const guideCanvas=id('visionOverlay');
 function photoPointer(event){
  const bounds=guideCanvas.getBoundingClientRect(),roi=pendingVision?.roi||{x0:0,x1:1,y0:0,y1:1};
  const x=(event.clientX-bounds.left)/Math.max(1,bounds.width),y=(event.clientY-bounds.top)/Math.max(1,bounds.height);
  return {x:(x-roi.x0)/Math.max(.01,roi.x1-roi.x0),y:(y-roi.y0)/Math.max(.01,roi.y1-roi.y0)};
 }
 function updateGuideCounts(region){
  const counts=S.deriveCounts(region.type,region.lines,region.mixPct);
  region.drawers=counts.drawers;region.shelves=counts.shelves;
  if(reviewDrawersInputs[region.index])reviewDrawersInputs[region.index].value=region.drawers;
  if(reviewShelvesInputs[region.index])reviewShelvesInputs[region.index].value=region.shelves;
 }
 guideCanvas.addEventListener('pointerdown',event=>{
  if(!pendingVision)return;
  normalizeRegionWeights();const p=photoPointer(event);
  // Prefer a nearby horizontal guide when the pointer is inside its module.
  let bestY={region:-1,line:-1,d:.042};
  pendingVision.regions.forEach((r,ri)=>{
   if(p.x<r.x0+.012||p.x>r.x1-.012)return;
   (r.lines||[]).forEach((y,li)=>{const d=Math.abs(y-p.y);if(d<bestY.d)bestY={region:ri,line:li,d}});
  });
  if(bestY.region>=0){dragHorizontalRegion=bestY.region;dragHorizontalLine=bestY.line;
   guideCanvas.setPointerCapture(event.pointerId);event.preventDefault();return;}
  let best=-1,dist=.05;pendingVision.regions.slice(0,-1).forEach((r,i)=>{const d=Math.abs(r.x1-p.x);if(d<dist){dist=d;best=i;}});
  if(best<0)return;dragGuideIndex=best;guideCanvas.setPointerCapture(event.pointerId);event.preventDefault();adjustReviewDivider(best,p.x);
 });
 guideCanvas.addEventListener('pointermove',event=>{
  if(!pendingVision)return;const p=photoPointer(event);
  if(dragHorizontalRegion>=0){const region=pendingVision.regions[dragHorizontalRegion];
   region.lines=S.moveLine(region.lines,dragHorizontalLine,p.y);updateGuideCounts(region);paintVisionOverlay();return;}
  if(dragGuideIndex>=0)adjustReviewDivider(dragGuideIndex,p.x);
 });
 const endGuideDrag=()=>{dragGuideIndex=-1;dragHorizontalRegion=-1;dragHorizontalLine=-1;if(pendingVision)paintVisionOverlay()};
 guideCanvas.addEventListener('pointerup',endGuideDrag);
 guideCanvas.addEventListener('pointercancel',endGuideDrag);
 function reviewVision(suggestion){
  const regions=(suggestion.regions||[]).slice(0,6).map((r,i)=>({index:i,x0:r.x0??i/suggestion.modules,x1:r.x1??(i+1)/suggestion.modules,type:r.type||'puerta',drawers:r.drawers||3,shelves:r.shelves??1,mixPct:r.mixPct||45,confidence:r.confidence||.3,lines:r.lines||[],detail:r.detail||'',weight:Math.max(1,Math.round(100*(r.x1-r.x0||1/suggestion.modules)))}));
  if(!regions.length)throw Error('No se encontraron elementos editables.');
  pendingVision={...suggestion,regions};id('visionReviewPanel').hidden=false;id('visionDescription').textContent=suggestion.detail||'Revisa las propuestas antes de aplicarlas.';
  id('visionCategory').value=suggestion.category||state.category;const host=id('visionResults');host.replaceChildren();reviewWeightInputs=[];reviewDrawersInputs=[];reviewShelvesInputs=[];normalizeRegionWeights();
  for(const r of regions){
   const block=document.createElement('div');block.className='vision-result';
   const heading=document.createElement('strong');heading.textContent=`Cuerpo ${r.index+1}`;const detail=document.createElement('small');detail.textContent=` · Confianza orientativa ${Math.round(r.confidence*100)}% — ${r.detail}`;block.append(heading,detail);
   const grid=document.createElement('div');grid.className='two';
   const type=field(grid,'Frente','select',{options:[['puerta','Puerta'],['cajones','Cajones'],['abierto','Repisas'],['mixto','Mixto']]});type.value=r.type;type.addEventListener('change',()=>{r.type=type.value;paintVisionOverlay()});
   r.lines=S.normalizeLines(r.lines);const drawers=field(grid,'Cajones','input',{type:'number',min:1,max:5,step:1,value:r.drawers});reviewDrawersInputs[r.index]=drawers;
   drawers.addEventListener('change',()=>{r.drawers=Math.max(1,Math.min(5,Number(drawers.value)||3))});
   const shelves=field(grid,'Repisas','input',{type:'number',min:0,max:5,step:1,value:r.shelves});reviewShelvesInputs[r.index]=shelves;
   shelves.addEventListener('change',()=>{r.shelves=Math.max(0,Math.min(5,Number(shelves.value)||0))});
   const mix=field(grid,'Cajones abajo (%)','input',{type:'number',min:25,max:75,step:1,value:r.mixPct});mix.addEventListener('change',()=>{r.mixPct=Math.max(25,Math.min(75,Number(mix.value)||45))});
   const ratio=field(block,'Ancho relativo visual (peso, no mm)','input',{type:'number',min:1,max:100,step:1,value:Math.round(r.weight)});ratio.className='ratio';reviewWeightInputs[r.index]=ratio;
   ratio.addEventListener('change',()=>{r.weight=Math.max(1,Math.min(100,Math.round(Number(ratio.value)||r.weight)));normalizeRegionWeights();paintVisionOverlay()});
   const horiz=document.createElement('div');horiz.className='horiz-actions';
   const addLine=document.createElement('button');addLine.type='button';addLine.textContent='+ Línea horizontal';addLine.onclick=()=>{
    const existing=S.normalizeLines(r.lines);if(existing.length>=5)return;
    let y=.5;for(let i=1;i<=12;i++){const candidate=i/13;if(existing.every(v=>Math.abs(candidate-v)>.085)){y=candidate;break}}
    r.lines=S.addLine(existing,y);updateGuideCounts(r);paintVisionOverlay();
   };
   const removeLine=document.createElement('button');removeLine.type='button';removeLine.textContent='− Última línea';removeLine.onclick=()=>{r.lines=S.normalizeLines(r.lines).slice(0,-1);updateGuideCounts(r);paintVisionOverlay()};
   horiz.append(addLine,removeLine);block.append(grid,horiz);host.append(block);
  }
  paintVisionOverlay();
  id('status').textContent='Se generaron sugerencias. Revisa la clasificación; nada se aplicará sin tu aprobación.';
 }
 id('discardVision').addEventListener('click',()=>{clearVision();id('status').textContent='Sugerencias descartadas; diseño anterior intacto.'});
 id('applyVision').addEventListener('click',()=>{
  if(!pendingVision)return;
  normalizeRegionWeights();const r=pendingVision.regions;
  const suggested={...state,category:id('visionCategory').value,modules:r.length,
   moduleTypes:r.map(x=>x.type),moduleDrawers:r.map(x=>x.drawers),moduleShelves:r.map(x=>x.shelves),moduleMixPct:r.map(x=>x.mixPct),
   moduleWidths:r.map(x=>Math.max(1,Math.round((x.x1-x.x0)*(state.width-state.thickness*(r.length+1)))))};
  const approved=C.normalize(suggested);
  // Si un mueble estrecho no puede admitir todas las divisiones, el motor reduce módulos.
  if(approved.modules!==r.length)id('status').textContent=`Solo caben ${approved.modules} cuerpos con el ancho actual. Ajusta ancho y revisa.`;
  else id('status').textContent='Diseño aplicado para revisión: mide el mueble real antes de presupuestar o fabricar.';
  state=approved;selectedModule=0;update();if(activePhotoZone>=0){photoZones[activePhotoZone].params=structuredClone(state);photoZones[activePhotoZone].estimatedTotal=current.total;renderPhotoZones()}clearVision();
 });
 const cornerLabels=['superior izquierda','superior derecha','inferior derecha','inferior izquierda'];
 async function paintCornerPicker(){
  const cv=id('cornerCanvas'),ctx=cv.getContext('2d');if(!ctx||!photoURL)return;
  const img=new Image();img.src=photoURL;try{await img.decode()}catch{return}
  const W=640,H=Math.max(180,Math.round(640*img.height/img.width));cv.width=W;cv.height=H;
  ctx.drawImage(img,0,0,W,H);
  if(photoCorners.length){ctx.strokeStyle='#ffe4a3';ctx.lineWidth=3;ctx.beginPath();photoCorners.forEach((p,i)=>i?ctx.lineTo(p.x*W,p.y*H):ctx.moveTo(p.x*W,p.y*H));if(photoCorners.length===4)ctx.closePath();ctx.stroke();
   photoCorners.forEach((p,i)=>{ctx.beginPath();ctx.fillStyle='#12b895';ctx.arc(p.x*W,p.y*H,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#07151b';ctx.font='bold 12px sans-serif';ctx.fillText(String(i+1),p.x*W+8,p.y*H-8)})}
  id('cornerStatus').textContent=photoCorners.length===4?'4 esquinas seleccionadas. Pulsa Reconocer divisiones para rectificar y analizar.':`Esquina ${photoCorners.length+1} de 4: ${cornerLabels[photoCorners.length]}.`;
 }
 id('chooseCorners').addEventListener('click',()=>{
  if(!selectedPhoto){id('status').textContent='Primero carga una fotografía.';return}
  cornerPickerOpen=!cornerPickerOpen;id('cornerPicker').hidden=!cornerPickerOpen;if(cornerPickerOpen)paintCornerPicker();
 });
 id('cornerCanvas').addEventListener('pointerdown',e=>{
  if(!selectedPhoto||photoCorners.length>=4)return;
  const cv=id('cornerCanvas'),b=cv.getBoundingClientRect();if(b.width<=0||b.height<=0)return;
  photoCorners.push({x:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))});
  clearVision();paintCornerPicker();
 });
 id('undoCorner').addEventListener('click',()=>{photoCorners.pop();clearVision();paintCornerPicker()});
 id('resetCorners').addEventListener('click',()=>{photoCorners=[];clearVision();paintCornerPicker()});
 function visionROI(){const l=Number(id('roiLeft').value)/100,r=Number(id('roiRight').value)/100,t=Number(id('roiTop').value)/100,b=Number(id('roiBottom').value)/100;
  if(!(r-l>=.25&&b-t>=.25))throw Error('La región de fotografía debe ocupar al menos 25% del ancho y alto.');
  return{x0:l,y0:t,x1:r,y1:b};
 }
 function renderPhotoZones(){
  const host=id('photoZoneList');host.replaceChildren();
  photoZones.forEach((z,i)=>{
   const row=document.createElement('div');row.className='zone-entry'+(i===activePhotoZone?' active':'');
   const select=document.createElement('button');select.type='button';select.textContent=`${i+1}. ${z.label} ${z.params?'✓ diseño':'· pendiente'}`;
   select.onclick=()=>{activePhotoZone=i;photoCorners=z.corners.map(p=>({...p}));if(z.roi){for(const [key,v] of [['roiLeft',z.roi.x0],['roiRight',z.roi.x1],['roiTop',z.roi.y0],['roiBottom',z.roi.y1]])id(key).value=Math.round(v*100)}
    else for(const [key,v] of [['roiLeft',0],['roiRight',1],['roiTop',0],['roiBottom',1]])id(key).value=Math.round(v*100);
    clearVision();if(z.params){state=C.normalize(z.params);selectedModule=0;update()}if(z.corners.length){cornerPickerOpen=true;id('cornerPicker').hidden=false;paintCornerPicker()}
    id('status').textContent=`Zona ${i+1} activada; puedes analizar y modificar su diseño.`;renderPhotoZones();};
   const del=document.createElement('button');del.type='button';del.className='remove';del.textContent='✕';del.title='Quitar zona';del.onclick=()=>{photoZones.splice(i,1);activePhotoZone=activePhotoZone===i?-1:activePhotoZone>i?activePhotoZone-1:activePhotoZone;renderPhotoZones()};
   row.append(select,del);host.append(row);
  });
  const summary=S.layoutSummary(photoZones);id('zoneSummary').textContent=summary.count?
   `${summary.count} diseños guardados · suma de cotizaciones individuales ${money(summary.estimate)} (NO contempla optimización conjunta de planchas ni descuentos compartidos).`:
   `${photoZones.length} zonas · aún no hay diseños guardados en ellas.`;
 }
 id('addPhotoZone').addEventListener('click',()=>{
  if(!selectedPhoto){id('status').textContent='Primero sube una fotografía.';return}
  if(photoZones.length>=5){id('status').textContent='Límite de cinco zonas independientes por foto.';return}
  try{if(photoCorners.length&&photoCorners.length!==4)throw Error('Completa las cuatro esquinas para guardar la zona.');
   const spec=S.validateZone({corners:photoCorners,roi:photoCorners.length?null:visionROI()});
   const label=id('zoneLabel').value.trim().slice(0,45)||`Mueble ${photoZones.length+1}`;
   photoZones.push({label,...spec,params:null,estimatedTotal:null});activePhotoZone=photoZones.length-1;
   id('zoneLabel').value='';renderPhotoZones();id('status').textContent=`Zona «${label}» guardada; configura el siguiente mueble o analiza esta zona.`;
  }catch(e){id('status').textContent=e.message}
 });
 id('saveZoneDesign').addEventListener('click',()=>{
  if(activePhotoZone<0){id('status').textContent='Guarda y selecciona una zona antes de asociar el diseño.';return}
  photoZones[activePhotoZone].params=structuredClone(state);photoZones[activePhotoZone].estimatedTotal=current.total;
  renderPhotoZones();id('status').textContent='Diseño y cotización provisional guardados en la zona. No incluye la fotografía.';
 });
 id('exportZoneSet').addEventListener('click',()=>{
  if(!photoZones.length){id('status').textContent='Todavía no hay zonas para exportar.';return}
  const payload={product:'INGEBAM Muebles360',version:'3.6',type:'conjunto-referencial',notes:'Zonas relativas a una foto que NO se incluye. No representa un plano constructivo ni nesting conjunto.',zones:photoZones.map(z=>({label:z.label,corners:z.corners,roi:z.roi,params:z.params,estimatedTotal:z.estimatedTotal}))};
  download('INGEBAM_Muebles360_Conjunto_V36.json',JSON.stringify(payload,null,2),'application/json');
 });
 function clearPhoto(){photoZones=[];activePhotoZone=-1;renderPhotoZones();photoCorners=[];cornerPickerOpen=false;id('cornerPicker').hidden=true;clearVision();id('comparePhoto').disabled=true;if(photoURL)URL.revokeObjectURL(photoURL);photoURL=null;selectedPhoto=null;id('photo').value='';id('preview').removeAttribute('src');id('drop').classList.remove('loaded');id('filename').textContent='Seleccionar foto o croquis'}
 id('newProject').addEventListener('click',()=>{state=C.normalize({category:'cocina'});selectedModule=0;viewer.isOpen=false;setPriceFields(C.DEFAULT_PRICES);id('projectName').value='Nuevo proyecto';setMeta({});qaChecks={};technicalFingerprint=null;clearPhoto();id('status').textContent='Nuevo proyecto iniciado.';update()});
 function setPhoto(file){if(!file)return;photoZones=[];activePhotoZone=-1;renderPhotoZones();const valid=['image/png','image/jpeg','image/webp'].includes(file.type);if(!valid||file.size>12*1024*1024){id('status').textContent='Selecciona JPG, PNG o WebP de hasta 12 MB.';return}clearVision();photoCorners=[];cornerPickerOpen=false;id('cornerPicker').hidden=true;selectedPhoto=file;if(photoURL)URL.revokeObjectURL(photoURL);photoURL=URL.createObjectURL(file);id('preview').src=photoURL;id('drop').classList.add('loaded');id('filename').textContent=file.name;id('comparePhoto').disabled=false;id('status').textContent='Imagen cargada. Confirma medidas y pulsa Comparar foto y diseño.'}
 id('photo').addEventListener('change',e=>setPhoto(e.target.files[0]));
 function frontOverlaySVG(){
  const p=state,th=p.thickness,inner=p.width-2*th,bodyH=state.category==='closet'?p.height-(p.baseType==='zocalo'?100:p.baseType==='patas'?120:0):p.height-(p.baseType==='zocalo'?100:p.baseType==='patas'?120:0)-30;
  let out=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="none"><g stroke="#00efff" fill="none" stroke-width="3">`;
  const ratio=v=>v/p.width*1000;let x=ratio(th),h=Math.max(100,bodyH/p.height*1000),y=p.category==='closet'?0:30/p.height*1000;
  out+=`<rect x="0" y="0" width="1000" height="1000" stroke-width="6"/>`;
  for(let i=0;i<p.modules;i++){
   const w=ratio(p.moduleWidths[i]),type=p.moduleTypes[i];out+=`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}"/>`;
   if(type==='mixto'){
    const split=y+h*(1-p.moduleMixPct[i]/100);out+=`<line x1="${x}" x2="${x+w}" y1="${split}" y2="${split}"/>`;
   }
   const split=type==='mixto'?y+h*(1-p.moduleMixPct[i]/100):y;
   if(type==='cajones'||type==='mixto'){const parts=p.moduleDrawers[i];const a=type==='mixto'?split:y;for(let j=1;j<parts;j++){const yy=a+(y+h-a)*j/parts;out+=`<line x1="${x}" x2="${x+w}" y1="${yy}" y2="${yy}"/>`}}
   if(type==='abierto'||type==='mixto')for(let j=1;j<=p.moduleShelves[i];j++){const bottom=type==='mixto'?split:y+h,yy=y+(bottom-y)*j/(p.moduleShelves[i]+1);out+=`<line x1="${x}" x2="${x+w}" y1="${yy}" y2="${yy}"/>`}
   x+=w+ratio(th);
  }
  return out+'</g></svg>';
 }
 id('comparePhoto').addEventListener('click',async()=>{
  if(!selectedPhoto||!photoURL)return;id('compareOriginal').src=photoURL;id('compareGenerated').innerHTML=svgFront();
  id('compareOverlayDrawing').innerHTML=frontOverlaySVG();id('compareOverlayPhoto').src=photoURL;
  try{if(photoCorners.length===4){const prep=await window.MueblesVision.prepareImageForAI(selectedPhoto,{corners:photoCorners});id('compareOverlayPhoto').src=prep.previewURL}
   else{const prep=await window.MueblesVision.prepareImageForAI(selectedPhoto,{roi:visionROI()});id('compareOverlayPhoto').src=prep.previewURL}}
  catch(e){id('status').textContent='Comparación con foto completa: '+e.message}
  id('photoCompareModal').showModal();
 });
 id('compareOpacity').addEventListener('input',e=>{id('opacityValue').textContent=`${e.target.value}%`;id('compareOverlayDrawing').style.opacity=String(Number(e.target.value)/100)});
 id('compareOverlayDrawing').style.opacity='.65';
 id('closeCompare').addEventListener('click',()=>id('photoCompareModal').close());
 id('analyze').addEventListener('click',async()=>{
  if(!selectedPhoto){id('status').textContent='Primero sube una imagen.';return}
  const btn=id('analyze');btn.disabled=true;id('status').textContent='Analizando bordes verticales y horizontales en el dispositivo…';
  try{if(photoCorners.length>0&&photoCorners.length!==4)throw Error('Completa las cuatro esquinas o limpia la selección.');const result=await window.MueblesVision.suggestFromImage(selectedPhoto,{roi:visionROI(),corners:photoCorners.length===4?photoCorners:undefined});result.category=state.category;reviewVision(result)}
  catch(e){id('status').textContent='Análisis no disponible: '+e.message}finally{btn.disabled=false}
 });
 function btnUnavailable(){return id('analyzeAI').dataset.ready!=='true'}
 id('analyzeAI').addEventListener('click',async()=>{
  if(!selectedPhoto){id('status').textContent='Primero sube una fotografía.';return}
  const endpoint=window.Muebles360Config?.aiEndpoint;if(!endpoint||btnUnavailable()){ id('status').textContent='Falta configurar el servidor de IA privado.';return}
  const btn=id('analyzeAI');btn.disabled=true;id('status').textContent='Analizando fotografía mediante IA de servidor privado…';
  try{if(photoCorners.length>0&&photoCorners.length!==4)throw Error('Completa las cuatro esquinas o restablece la selección.');
   const prepared=await window.MueblesVision.prepareImageForAI(selectedPhoto,{roi:visionROI(),corners:photoCorners.length===4?photoCorners:undefined});
   const resp=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:prepared.data,mimeType:prepared.mimeType})});
   const answer=await resp.json();if(!resp.ok)throw Error(answer.error||`Error ${resp.status}`);
   const suggested=window.MueblesVision.normalizeAI(answer,state);suggested.previewURL=prepared.previewURL;suggested.roi={x0:0,y0:0,x1:1,y1:1};reviewVision(suggested);
   id('status').textContent='IA multimodal analizó únicamente la zona seleccionada. Revisa cada módulo antes de aplicar el diseño; no se estimaron medidas reales.';
  }catch(e){id('status').textContent=e instanceof TypeError?'No se pudo conectar con el servicio de IA.':String(e.message||e)}finally{btn.disabled=false}
 });
 function download(filename,content,mime){const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
 function svgFront(){
  const m=current.model,p=m.params,scale=Math.min(900/p.width,650/p.height),pad=95,w=p.width*scale+2*pad,h=p.height*scale+2*pad,x=pad,y=pad;
  const f=v=>Number(v.toFixed(1));let out=`<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}" height="${f(h)}" viewBox="0 0 ${f(w)} ${f(h)}"><rect width="100%" height="100%" fill="white"/><text x="30" y="28" font-family="Arial,sans-serif" font-size="15">INGEBAM Muebles360 V3.7 · Alzado frontal preliminar</text><rect x="${x}" y="${y}" width="${f(p.width*scale)}" height="${f(p.height*scale)}" fill="none" stroke="#1e293b" stroke-width="3"/>`;
  const bodyH=m.dimensions.carcassH*scale,baseH=(p.baseType==='zocalo'?100:p.baseType==='patas'?120:0)*scale,topH=(p.category==='closet'?0:30)*scale;
  if(baseH)out+=`<rect x="${x}" y="${f(y+p.height*scale-baseH)}" width="${f(p.width*scale)}" height="${f(baseH)}" fill="#ece5db" stroke="#1e293b"/>`;
  if(topH)out+=`<rect x="${x}" y="${y}" width="${f(p.width*scale)}" height="${f(topH)}" fill="#d4dce5" stroke="#1e293b"/>`;
  let consumed=p.thickness;const bodyY=y+topH;
  p.moduleTypes.forEach((t,i)=>{const xx=x+consumed*scale,cw=p.moduleWidths[i]*scale;out+=`<rect x="${f(xx)}" y="${f(bodyY)}" width="${f(cw)}" height="${f(bodyH)}" fill="#f4efe6" stroke="#334155"/>`;
   const dividerY=t==='mixto'?bodyY+bodyH*(1-p.moduleMixPct[i]/100):bodyY;
   if(t==='mixto')out+=`<line x1="${f(xx)}" y1="${f(dividerY)}" x2="${f(xx+cw)}" y2="${f(dividerY)}" stroke="#334155" stroke-width="2"/>`;
   if(t==='cajones'||t==='mixto')for(let j=1;j<p.moduleDrawers[i];j++){const yy=t==='mixto'?dividerY+j*(bodyY+bodyH-dividerY)/p.moduleDrawers[i]:bodyY+j*bodyH/p.moduleDrawers[i];out+=`<line x1="${f(xx)}" y1="${f(yy)}" x2="${f(xx+cw)}" y2="${f(yy)}" stroke="#334155"/>`}
   if(t==='abierto'||t==='mixto')for(let j=1;j<=p.moduleShelves[i];j++){const yy=t==='mixto'?bodyY+j*(dividerY-bodyY)/(p.moduleShelves[i]+1):bodyY+j*bodyH/(p.moduleShelves[i]+1);out+=`<line x1="${f(xx)}" y1="${f(yy)}" x2="${f(xx+cw)}" y2="${f(yy)}" stroke="#334155"/>`} 
   out+=`<text x="${f(xx+cw/2)}" y="${f(y+p.height*scale+17)}" text-anchor="middle" font-size="10" font-family="Arial">${p.moduleWidths[i]} mm</text>`;consumed+=p.moduleWidths[i]+p.thickness;
  });
  out+=`<text x="${f(x+p.width*scale/2)}" y="${f(y+p.height*scale+39)}" text-anchor="middle" font-size="14" font-family="Arial">ANCHO TOTAL ${p.width} mm</text><text x="${x-28}" y="${f(y+p.height*scale/2)}" font-size="14" text-anchor="middle" transform="rotate(-90 ${x-28} ${f(y+p.height*scale/2)})" font-family="Arial">${p.height} mm</text><text x="${x}" y="${f(h-11)}" font-size="11" font-family="Arial" fill="#ab5331">CROQUIS NO APTO PARA CORTE SIN VALIDACIÓN TÉCNICA</text></svg>`;
  return out;
 }
 function csv(){const rows=[['ID','Modulo','Pieza','Cantidad','Largo_mm','Ancho_mm','Espesor_mm','Material','Cantos_estimados','Tapacanto_mm'],...current.model.parts.filter(p=>p.kind!=='countertop').map(p=>[p.id,p.moduleIndex===undefined?'General':p.moduleIndex+1,p.name,1,p.length,p.width,p.thickness,p.material,p.edges,M.edgeMm(p)])];download('INGEBAM_Muebles360_V3_7_Despiece.csv','\ufeff'+rows.map(row=>row.join(';')).join('\r\n'),'text/csv;charset=utf-8')}
 function exportCutSVG(){const sheets=current.nesting.sheets,cols=2,W=2440,H=1830,pad=210,cellW=W+pad,cellH=H+pad+100,rows=Math.ceil(sheets.length/cols);
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${cols*cellW}" height="${rows*cellH+130}" viewBox="0 0 ${cols*cellW} ${rows*cellH+130}"><rect width="100%" height="100%" fill="white"/><text x="30" y="70" font-size="52" font-family="Arial" fill="#203247">INGEBAM · distribución preliminar de cortes (NO CNC)</text>`;
  sheets.forEach((board,i)=>{const x=(i%cols)*cellW+50,y=Math.floor(i/cols)*cellH+140;s+=`<g transform="translate(${x} ${y})"><text x="0" y="-26" font-family="Arial" font-size="37" fill="#243647">Plancha ${i+1}: ${board.material}</text><rect width="2440" height="1830" fill="#f6f7f8" stroke="#34485c" stroke-width="5"/>`;
   for(const it of board.items){s+=`<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" stroke="#495467" stroke-width="3" fill="${cutColors[board.material]||'#ddd'}"/><text x="${it.x+it.w/2}" y="${it.y+Math.min(90,it.h/2)}" text-anchor="middle" font-size="${Math.min(28,Math.max(13,it.w/14))}" font-family="Arial" fill="#243647">${ehtml(it.name)}</text><text x="${it.x+it.w/2}" y="${it.y+Math.min(125,it.h*.75)}" text-anchor="middle" font-size="${Math.min(24,Math.max(13,it.w/15))}" font-family="Arial">${it.length}×${it.width}</text>`}
   s+='</g>'});s+='</svg>';download('INGEBAM_Muebles360_V3_Planchas.svg',s,'image/svg+xml');
 }
 id('exportTech').addEventListener('click',()=>{
  const meta={...getMeta(),projectName:id('projectName').value};
  const documentHTML=M.technicalHTML(current,meta,qaChecks,svgFront());
  const safeRef=(meta.quoteRef||'BORRADOR').replace(/[^a-z0-9_-]/gi,'_');
  download(`INGEBAM_FichaTecnica_${safeRef}.html`,documentHTML,'text/html;charset=utf-8');
  id('status').textContent='Ficha técnica de revisión descargada. No es orden de corte ni plano certificado.';
 });
 function jsonProject(){const project={title:'INGEBAM Muebles360 - Proyecto editable',version:'3.8',qaChecks,createdAt:new Date().toISOString(),projectName:id('projectName').value||'Sin nombre',meta:getMeta(),params:state,prices:current.prices,estimate:{total:current.total,directCost:current.directCost,boards:current.boards,edgeMeters:current.edgeMeters,unplaced:current.nesting.unplaced.length},note:'No apto para fabricación sin revisión profesional. No incluye fotografía cargada.'};download('INGEBAM_Muebles360_V3_7_Proyecto.json',JSON.stringify(project,null,2),'application/json')}
 id('loadProject').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw new Error('El proyecto excede 1 MB.');const obj=JSON.parse(await file.text());if(!obj.params||typeof obj.params!=='object'||Array.isArray(obj.params))throw new Error('JSON no contiene parámetros válidos.');state=C.normalize(obj.params);selectedModule=0;if(obj.prices)setPriceFields(obj.prices);id('projectName').value=String(obj.projectName||'Proyecto importado').slice(0,80);setMeta(obj.meta||{});qaChecks={...(obj.qaChecks||{})};technicalFingerprint=JSON.stringify({params:state,prices:getPrices()});clearPhoto();update();id('status').textContent='Proyecto cargado y recalculado con el motor V3.7.'}catch(err){id('status').textContent='No se pudo abrir el proyecto: '+err.message}finally{id('loadProject').value=''}});
 id('exportPurchase').addEventListener('click',()=>{
  const buy=C.purchaseList(current);
  const rows=[['Código','Insumo','Unidad','Cantidad','Precio_unitario_CLP','Total_CLP'],...buy.rows.map(i=>[i.code,i.description,i.unit,i.qty,i.unitCost,i.total])];
  rows.push(['','TOTAL','','','',buy.total]);
  // No se exportan datos arbitrarios de clientes en este CSV.
  const cell=v=>`"${String(v).replace(/"/g,'""')}"`;
  download('INGEBAM_Muebles360_V3_8_Compras_PRELIMINAR.csv','\ufeff'+rows.map(row=>row.map(cell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
  id('status').textContent=buy.incomplete?'Lista descargada con piezas sin ubicar: no usar como orden de compra.':'Lista de compras PRELIMINAR descargada; verificar proveedor y especificaciones.';
 });
 id('exportCSV').addEventListener('click',csv);id('exportSVG').addEventListener('click',()=>download('INGEBAM_Muebles360_V3_Alzado.svg',svgFront(),'image/svg+xml'));
 id('exportCutSVG').addEventListener('click',exportCutSVG);
 id('exportJSON').addEventListener('click',jsonProject);id('saveProject').addEventListener('click',jsonProject);id('print').addEventListener('click',()=>window.print());
 id('exportQuote').addEventListener('click',()=>{const meta={...getMeta(),projectName:id('projectName').value,date:new Date().toISOString().slice(0,10)},html=window.MueblesQuote.makeQuoteHTML(current,meta);download('INGEBAM_Presupuesto_'+(meta.quoteRef||'preliminar').replace(/[^a-z0-9_-]/gi,'_')+'.html',html,'text/html;charset=utf-8');id('status').textContent=current.validForQuote?'Presupuesto preliminar descargado. Ábrelo para imprimir o guardar en PDF.':'Presupuesto descargado CON ADVERTENCIA: piezas sin distribuir. No entregar como cotización definitiva.';});
 // La API es privada y opcional. Github Pages no aloja backend ni credenciales.
 async function detectAICapability(){
  const endpoint=window.Muebles360Config?.aiEndpoint;if(!endpoint)return;
  const btn=id('analyzeAI');btn.disabled=true;btn.dataset.ready='false';
  try{const capabilitiesURL=new URL('/api/capabilities',new URL(endpoint,location.href).origin);
   const resp=await fetch(capabilitiesURL,{cache:'no-store',signal:AbortSignal.timeout(2500)});
   if(!resp.ok)return;const config=await resp.json();if(config.aiAvailable===true){btn.disabled=false;btn.dataset.ready='true';btn.textContent='Analizar zona seleccionada con IA real';btn.title='Envía solo la zona elegida al servicio de IA al hacer clic.';}
   else{btn.textContent='IA real: configurar clave en servidor local';btn.title='Para activar, define GEMINI_API_KEY en un servidor privado.';}
  }catch{btn.textContent='IA real: servidor no disponible';}
 }
 detectAICapability();
 // Recuperación automática de trabajo local; sin enviar datos a terceros.
 renderPhotoZones();try{const saved=JSON.parse(localStorage.getItem('ingebam-muebles360-v3')||localStorage.getItem('ingebam-muebles360-v2')||'null');if(saved?.params){state=C.normalize(saved.params);setPriceFields(saved.prices||{});id('projectName').value=String(saved.projectName||'Proyecto recuperado').slice(0,80);setMeta(saved.meta||{});qaChecks={...(saved.qaChecks||{})};technicalFingerprint=JSON.stringify({params:state,prices:getPrices()});id('status').textContent='Se recuperó tu último diseño local.'}}catch{}
 update();
})();
