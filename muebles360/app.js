/* INGEBAM Muebles360 V3 — App y exportadores. Ninguna foto se sube sin activar IA. */
(()=>{'use strict';
 const C=window.MueblesCore,Money=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
 const id=x=>document.getElementById(x),money=x=>Money.format(x),ehtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let state=C.normalize({category:'cocina'}),current=null,selectedModule=0,selectedPhoto=null,photoURL=null,advanced=null;
 const metaIds=['clientName','clientContact','quoteRef','projectStage','projectNotes'];
 const history={past:[],future:[],last:null,restoring:false};
 function snapshot(){return JSON.stringify({params:state,prices:getPrices(),projectName:id('projectName').value,meta:getMeta()})}
 function remember(){const next=snapshot();if(history.last!==null&&history.last!==next&&!history.restoring){history.past.push(history.last);if(history.past.length>50)history.past.shift();history.future=[];}history.last=next;id('undoChange').disabled=!history.past.length;id('redoChange').disabled=!history.future.length}
 function getMeta(){return {client:id('clientName').value.slice(0,120),contact:id('clientContact').value.slice(0,140),quoteRef:id('quoteRef').value.slice(0,60),stage:id('projectStage').value,notes:id('projectNotes').value.slice(0,1200)}}
 function setMeta(meta={}){id('clientName').value=meta.client||'';id('clientContact').value=meta.contact||'';id('quoteRef').value=meta.quoteRef||'ING-0001';id('projectStage').value=['Borrador','Enviado','Aprobado','Fabricación','Instalado'].includes(meta.stage)?meta.stage:'Borrador';id('projectNotes').value=meta.notes||''}
 function restoreHistory(value){history.restoring=true;try{const v=JSON.parse(value);state=C.normalize(v.params);selectedModule=Math.min(selectedModule,state.modules-1);setPriceFields(v.prices||{});id('projectName').value=v.projectName||'';setMeta(v.meta||{});update()}finally{history.restoring=false;history.last=snapshot();id('undoChange').disabled=!history.past.length;id('redoChange').disabled=!history.future.length}}
 const localViewer=new window.FurnitureViewer(id('viewer'),onSelectPart);let viewer=localViewer;
 const controls=['category','width','height','depth','thickness','modules','baseType','shelves','drawers'];
 function onSelectPart(part){
  const box=id('selected');if(!part){box.hidden=true;return;}
  box.hidden=false;box.replaceChildren();const strong=document.createElement('strong');strong.textContent=part.name;box.append(strong);
  const div=document.createElement('div');div.textContent=`${part.length} × ${part.width} × ${part.thickness} mm`;
  box.append(div);if(Number.isInteger(part.moduleIndex)){selectedModule=part.moduleIndex;syncFields();viewer.selectModule?.(selectedModule)}
 }
 const unitPriceIds=['sheet15','back3','edgeMeter','hinge','runnerPair','handle','countertopMeter','laborHour','overheadPct','leg','installationHours','deliveryFee','contingencyPct'];
 function getPrices(){const pr={...C.DEFAULT_PRICES,sheet18:Math.max(0,Number(id('sheetPrice').value)||0),marginPct:Math.max(0,Number(id('margin').value)||0),includeVat:id('vat').checked,kerfMm:Number(id('kerf').value),trimMm:Number(id('trim').value),allowRotation:id('allowRotation').checked};for(const k of unitPriceIds)pr[k]=Math.max(0,Number(id(k).value)||0);return pr}
 function setPriceFields(pr){for(const k of unitPriceIds)id(k).value=pr[k]??C.DEFAULT_PRICES[k];id('sheetPrice').value=pr.sheet18??C.DEFAULT_PRICES.sheet18;id('margin').value=pr.marginPct??C.DEFAULT_PRICES.marginPct;id('vat').checked=Boolean(pr.includeVat);id('kerf').value=pr.kerfMm??4;id('trim').value=pr.trimMm??8;id('allowRotation').checked=Boolean(pr.allowRotation)}
 function syncFields(){
  for(const k of controls)id(k).value=state[k];
  id('moduleType').value=state.moduleTypes[selectedModule]||'puerta';
  id('moduleWidth').value=state.moduleWidths[selectedModule]||'';
  id('moduleWidth').disabled=state.modules===1;
  id('moduleDrawers').value=state.moduleDrawers[selectedModule]??state.drawers;
  id('moduleShelves').value=state.moduleShelves[selectedModule]??state.shelves;
  id('moduleDrawers').disabled=state.moduleTypes[selectedModule]!=='cajones';
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
 function update(){
  state=C.normalize(state);selectedModule=Math.min(selectedModule,state.modules-1);syncFields();
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
  id('quoteStatus').textContent=e.validForQuote?'Estimación de materiales sin piezas fuera de plancha. Requiere validación técnica.':`${e.nesting.unplaced.length} pieza(s) sin ubicar: precio incompleto; revisar dimensiones y orientación.`;
  id('quoteStatus').style.borderColor=e.validForQuote?'#38546b':'#be794f';
  const cut=C.consolidate(m.parts),tb=id('cutlist');tb.replaceChildren();for(const part of cut){if(part.kind==='countertop')continue;
   const tr=document.createElement('tr');for(const v of [part.name,part.qty,`${part.length} × ${part.width} × ${part.thickness}`]){const td=document.createElement('td');td.textContent=v;tr.append(td)}tb.append(tr)
  }
  id('alerts').replaceChildren();for(const a of m.alerts){const p=document.createElement('p');p.textContent='• '+a;id('alerts').append(p)}
  renderSheets(e.nesting);remember();try{localStorage.setItem('ingebam-muebles360-v3',JSON.stringify({projectName:id('projectName').value,params:state,prices:e.prices,meta:getMeta()}))}catch{}
 }
 for(const k of controls)id(k).addEventListener('change',e=>{
  if(k==='category'){state=C.normalize({category:e.target.value,finish:state.finish,thickness:state.thickness});selectedModule=0;viewer.reset()}
  else if(k==='modules'){const len=Math.round(Number(e.target.value));state={...state,modules:len,moduleTypes:Array.from({length:Math.max(1,len)},(_,i)=>state.moduleTypes[i]||'puerta'),moduleWidths:undefined,moduleShelves:undefined,moduleDrawers:undefined}}
  else if(['width','height','depth','thickness','shelves','drawers'].includes(k)){state={...state,[k]:Number(e.target.value)};
   if(k==='shelves')state.moduleShelves=Array(state.modules).fill(Number(e.target.value));
   if(k==='drawers')state.moduleDrawers=Array(state.modules).fill(Number(e.target.value));
  }else state={...state,[k]:e.target.value};update();
 });
 id('moduleType').addEventListener('change',e=>{const moduleTypes=[...state.moduleTypes];moduleTypes[selectedModule]=e.target.value;state={...state,moduleTypes};update()});
 id('moduleWidth').addEventListener('change',e=>{state=C.resizeModule(state,selectedModule,Number(e.target.value));update()});
 for(const [control,step] of [['moduleMoveLeft',-1],['moduleMoveRight',1]])id(control).addEventListener('click',()=>{const j=selectedModule+step;if(j<0||j>=state.modules)return;const next={...state};for(const key of ['moduleTypes','moduleWidths','moduleShelves','moduleDrawers']){const list=[...state[key]];[list[selectedModule],list[j]]=[list[j],list[selectedModule]];next[key]=list}state=next;selectedModule=j;update()});
 for(const key of ['moduleDrawers','moduleShelves'])id(key).addEventListener('change',e=>{const p=key==='moduleDrawers'?'moduleDrawers':'moduleShelves';const arr=[...state[p]];arr[selectedModule]=Number(e.target.value);state={...state,[p]:arr};update()});
 for(const k of ['sheetPrice','margin','vat','kerf','trim','allowRotation',...unitPriceIds])id(k).addEventListener('change',update);
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
 function clearPhoto(){id('comparePhoto').disabled=true;if(photoURL)URL.revokeObjectURL(photoURL);photoURL=null;selectedPhoto=null;id('photo').value='';id('preview').removeAttribute('src');id('drop').classList.remove('loaded');id('filename').textContent='Seleccionar foto o croquis'}
 id('newProject').addEventListener('click',()=>{state=C.normalize({category:'cocina'});selectedModule=0;viewer.isOpen=false;setPriceFields(C.DEFAULT_PRICES);id('projectName').value='Nuevo proyecto';setMeta({});clearPhoto();id('status').textContent='Nuevo proyecto iniciado.';update()});
 function setPhoto(file){if(!file)return;const valid=['image/png','image/jpeg','image/webp'].includes(file.type);if(!valid||file.size>12*1024*1024){id('status').textContent='Selecciona JPG, PNG o WebP de hasta 12 MB.';return}selectedPhoto=file;if(photoURL)URL.revokeObjectURL(photoURL);photoURL=URL.createObjectURL(file);id('preview').src=photoURL;id('drop').classList.add('loaded');id('filename').textContent=file.name;id('comparePhoto').disabled=false;id('status').textContent='Imagen cargada. Confirma medidas y pulsa Comparar foto y diseño.'}
 id('photo').addEventListener('change',e=>setPhoto(e.target.files[0]));
 id('comparePhoto').addEventListener('click',()=>{if(!selectedPhoto||!photoURL)return;id('compareOriginal').src=photoURL;id('compareGenerated').innerHTML=svgFront();id('photoCompareModal').showModal()});
 id('closeCompare').addEventListener('click',()=>id('photoCompareModal').close());
 id('analyze').addEventListener('click',async()=>{if(!selectedPhoto){id('status').textContent='Primero sube una imagen.';return}const btn=id('analyze');btn.disabled=true;id('status').textContent='Buscando contrastes verticales (sin IA)…';try{const r=await window.MueblesVision.suggestFromImage(selectedPhoto);state={...state,modules:r.modules,moduleTypes:Array.from({length:r.modules},(_,i)=>state.moduleTypes[i]||'puerta'),moduleWidths:undefined,moduleShelves:undefined,moduleDrawers:undefined};update();id('status').textContent=r.detail+' No se deducen medidas reales.'}catch(e){id('status').textContent=e.message}finally{btn.disabled=false}});
 id('analyzeAI').addEventListener('click',async()=>{if(!selectedPhoto){id('status').textContent='Primero sube una fotografía.';return}const btn=id('analyzeAI');btn.disabled=true;id('status').textContent='Consultando análisis semántico en el servicio configurado…';
  try{const data=await new Promise((resolve,reject)=>{const rd=new FileReader();rd.onload=()=>resolve(String(rd.result).split(',')[1]);rd.onerror=()=>reject(new Error('No se pudo leer la imagen'));rd.readAsDataURL(selectedPhoto)});
   const endpoint=window.Muebles360Config?.aiEndpoint;
   if(!endpoint)throw new Error('No hay servicio de IA configurado.');
   const resp=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,mimeType:selectedPhoto.type})});let answer=await resp.json();if(!resp.ok)throw new Error(answer.error||`Error ${resp.status}`);
   state={...state,category:answer.category||state.category,modules:answer.modules||state.modules,moduleTypes:answer.moduleTypes||state.moduleTypes,finish:answer.finish||state.finish,moduleWidths:undefined,moduleDrawers:undefined,moduleShelves:undefined};update();id('status').textContent=(answer.notes||'Análisis completado.')+' Corrige medidas y módulos manualmente.';
  }catch(e){id('status').textContent=e instanceof TypeError?'No fue posible conectar con el servicio de IA configurado.':String(e.message||e)}finally{btn.disabled=false}
 });
 function download(filename,content,mime){const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
 function svgFront(){
  const m=current.model,p=m.params,scale=Math.min(900/p.width,650/p.height),pad=95,w=p.width*scale+2*pad,h=p.height*scale+2*pad,x=pad,y=pad;
  const f=v=>Number(v.toFixed(1));let out=`<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}" height="${f(h)}" viewBox="0 0 ${f(w)} ${f(h)}"><rect width="100%" height="100%" fill="white"/><text x="30" y="28" font-family="Arial,sans-serif" font-size="15">INGEBAM Muebles360 V3 · Alzado frontal preliminar</text><rect x="${x}" y="${y}" width="${f(p.width*scale)}" height="${f(p.height*scale)}" fill="none" stroke="#1e293b" stroke-width="3"/>`;
  const bodyH=m.dimensions.carcassH*scale,baseH=(p.baseType==='zocalo'?100:p.baseType==='patas'?120:0)*scale,topH=(p.category==='closet'?0:30)*scale;
  if(baseH)out+=`<rect x="${x}" y="${f(y+p.height*scale-baseH)}" width="${f(p.width*scale)}" height="${f(baseH)}" fill="#ece5db" stroke="#1e293b"/>`;
  if(topH)out+=`<rect x="${x}" y="${y}" width="${f(p.width*scale)}" height="${f(topH)}" fill="#d4dce5" stroke="#1e293b"/>`;
  let consumed=p.thickness;const bodyY=y+topH;
  p.moduleTypes.forEach((t,i)=>{const xx=x+consumed*scale,cw=p.moduleWidths[i]*scale;out+=`<rect x="${f(xx)}" y="${f(bodyY)}" width="${f(cw)}" height="${f(bodyH)}" fill="#f4efe6" stroke="#334155"/>`;
   if(t==='cajones')for(let j=1;j<p.moduleDrawers[i];j++){const yy=bodyY+j*bodyH/p.moduleDrawers[i];out+=`<line x1="${f(xx)}" y1="${f(yy)}" x2="${f(xx+cw)}" y2="${f(yy)}" stroke="#334155"/>`}
   else if(t==='abierto')for(let j=1;j<=p.moduleShelves[i];j++){const yy=bodyY+j*bodyH/(p.moduleShelves[i]+1);out+=`<line x1="${f(xx)}" y1="${f(yy)}" x2="${f(xx+cw)}" y2="${f(yy)}" stroke="#334155"/>`}
   out+=`<text x="${f(xx+cw/2)}" y="${f(y+p.height*scale+17)}" text-anchor="middle" font-size="10" font-family="Arial">${p.moduleWidths[i]} mm</text>`;consumed+=p.moduleWidths[i]+p.thickness;
  });
  out+=`<text x="${f(x+p.width*scale/2)}" y="${f(y+p.height*scale+39)}" text-anchor="middle" font-size="14" font-family="Arial">ANCHO TOTAL ${p.width} mm</text><text x="${x-28}" y="${f(y+p.height*scale/2)}" font-size="14" text-anchor="middle" transform="rotate(-90 ${x-28} ${f(y+p.height*scale/2)})" font-family="Arial">${p.height} mm</text><text x="${x}" y="${f(h-11)}" font-size="11" font-family="Arial" fill="#ab5331">CROQUIS NO APTO PARA CORTE SIN VALIDACIÓN TÉCNICA</text></svg>`;
  return out;
 }
 function csv(){const rows=[['Pieza','Cantidad','Largo_mm','Ancho_mm','Espesor_mm','Material','N_Cantos_estimados'],...C.consolidate(current.model.parts).filter(p=>p.kind!=='countertop').map(p=>[p.name,p.qty,p.length,p.width,p.thickness,p.material,p.edges])];download('INGEBAM_Muebles360_V3_Despiece.csv','\ufeff'+rows.map(row=>row.join(';')).join('\r\n'),'text/csv;charset=utf-8')}
 function exportCutSVG(){const sheets=current.nesting.sheets,cols=2,W=2440,H=1830,pad=210,cellW=W+pad,cellH=H+pad+100,rows=Math.ceil(sheets.length/cols);
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${cols*cellW}" height="${rows*cellH+130}" viewBox="0 0 ${cols*cellW} ${rows*cellH+130}"><rect width="100%" height="100%" fill="white"/><text x="30" y="70" font-size="52" font-family="Arial" fill="#203247">INGEBAM · distribución preliminar de cortes (NO CNC)</text>`;
  sheets.forEach((board,i)=>{const x=(i%cols)*cellW+50,y=Math.floor(i/cols)*cellH+140;s+=`<g transform="translate(${x} ${y})"><text x="0" y="-26" font-family="Arial" font-size="37" fill="#243647">Plancha ${i+1}: ${board.material}</text><rect width="2440" height="1830" fill="#f6f7f8" stroke="#34485c" stroke-width="5"/>`;
   for(const it of board.items){s+=`<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" stroke="#495467" stroke-width="3" fill="${cutColors[board.material]||'#ddd'}"/><text x="${it.x+it.w/2}" y="${it.y+Math.min(90,it.h/2)}" text-anchor="middle" font-size="${Math.min(28,Math.max(13,it.w/14))}" font-family="Arial" fill="#243647">${ehtml(it.name)}</text><text x="${it.x+it.w/2}" y="${it.y+Math.min(125,it.h*.75)}" text-anchor="middle" font-size="${Math.min(24,Math.max(13,it.w/15))}" font-family="Arial">${it.length}×${it.width}</text>`}
   s+='</g>'});s+='</svg>';download('INGEBAM_Muebles360_V3_Planchas.svg',s,'image/svg+xml');
 }
 function jsonProject(){const project={title:'INGEBAM Muebles360 - Proyecto editable',version:'3.0',createdAt:new Date().toISOString(),projectName:id('projectName').value||'Sin nombre',meta:getMeta(),params:state,prices:current.prices,estimate:{total:current.total,directCost:current.directCost,boards:current.boards,edgeMeters:current.edgeMeters,unplaced:current.nesting.unplaced.length},note:'No apto para fabricación sin revisión profesional. No incluye fotografía cargada.'};download('INGEBAM_Muebles360_V3_Proyecto.json',JSON.stringify(project,null,2),'application/json')}
 id('loadProject').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw new Error('El proyecto excede 1 MB.');const obj=JSON.parse(await file.text());if(!obj.params||typeof obj.params!=='object'||Array.isArray(obj.params))throw new Error('JSON no contiene parámetros válidos.');state=C.normalize(obj.params);selectedModule=0;if(obj.prices)setPriceFields(obj.prices);id('projectName').value=String(obj.projectName||'Proyecto importado').slice(0,80);setMeta(obj.meta||{});clearPhoto();update();id('status').textContent='Proyecto cargado y recalculado con el motor V3.'}catch(err){id('status').textContent='No se pudo abrir el proyecto: '+err.message}finally{id('loadProject').value=''}});
 id('exportCSV').addEventListener('click',csv);id('exportSVG').addEventListener('click',()=>download('INGEBAM_Muebles360_V3_Alzado.svg',svgFront(),'image/svg+xml'));
 id('exportCutSVG').addEventListener('click',exportCutSVG);
 id('exportJSON').addEventListener('click',jsonProject);id('saveProject').addEventListener('click',jsonProject);id('print').addEventListener('click',()=>window.print());
 id('exportQuote').addEventListener('click',()=>{const meta={...getMeta(),projectName:id('projectName').value,date:new Date().toISOString().slice(0,10)},html=window.MueblesQuote.makeQuoteHTML(current,meta);download('INGEBAM_Presupuesto_'+(meta.quoteRef||'preliminar').replace(/[^a-z0-9_-]/gi,'_')+'.html',html,'text/html;charset=utf-8');id('status').textContent=current.validForQuote?'Presupuesto preliminar descargado. Ábrelo para imprimir o guardar en PDF.':'Presupuesto descargado CON ADVERTENCIA: piezas sin distribuir. No entregar como cotización definitiva.';});
 // Recuperación automática de trabajo local; sin enviar datos a terceros.
 try{const saved=JSON.parse(localStorage.getItem('ingebam-muebles360-v3')||localStorage.getItem('ingebam-muebles360-v2')||'null');if(saved?.params){state=C.normalize(saved.params);setPriceFields(saved.prices||{});id('projectName').value=String(saved.projectName||'Proyecto recuperado').slice(0,80);setMeta(saved.meta||{});id('status').textContent='Se recuperó tu último diseño local.'}}catch{}
 update();
})();
