/* INGEBAM Muebles360 V3.8 — Ficha de revisión y documentación PRELIMINAR.
   No reemplaza planos aprobados, medición en terreno ni certificación de taller. */
(function(root){'use strict';
const CHECKS=[
 {id:'medicion',label:'Medidas contrastadas en terreno',help:'Ancho, altura, profundidad, escuadra, desniveles y holguras'},
 {id:'apoyos',label:'Uniones, apoyos y anclajes revisados',help:'Muros, cargas, zócalos, soporte y condiciones de montaje'},
 {id:'herrajes',label:'Herrajes y cajones comprobados',help:'Holguras, carga admisible, perforaciones, apertura y recorrido'},
 {id:'material',label:'Tableros, vetas y cantos revisados',help:'Formato comercial, orientación de veta, espesor, mermas y tapacanto'},
 {id:'precios',label:'Precios y alcances comerciales revisados',help:'Proveedores, instalación, despacho, impuestos y trabajos especiales'},
 {id:'taller',label:'Despiece validado por responsable técnico',help:'Cada pieza, dimensión de corte, mecanizado y secuencia antes de fabricar'}
];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clp=x=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(x||0);
function edgeMm(part){if(part.kind==='countertop'||part.kind==='back')return 0;if(part.edges===4)return 2*(part.length+part.width);return Math.max(0,part.edges||0)*part.length}
function assessment(estimate,checks={}){
 const pending=CHECKS.filter(c=>checks[c.id]!==true);
 const blocks=[];
 if(estimate.nesting.unplaced.length)blocks.push(`${estimate.nesting.unplaced.length} pieza(s) sin ubicar en planchas`);
 const p=estimate.model.params;
 if(p.frontStyle==='marco')blocks.push('Molduras de puertas simuladas: sin despiece ni costo real');
 const warnings=[...estimate.model.alerts];
 if(estimate.prices.allowRotation)warnings.unshift('Giro de piezas habilitado: verificar orientación de veta con el taller');
 return {pending,blocks,warnings,checksCompleted:CHECKS.length-pending.length,reviewRecorded:pending.length===0&&blocks.length===0,
         status:blocks.length?'Requiere correcciones':pending.length?'Revisión pendiente':'Lista de revisión completada — NO certificado'};
}
function technicalHTML(estimate,meta={},checks={},elevationSVG=''){
 const p=estimate.model.params,qa=assessment(estimate,checks);
 const headers='<th>ID</th><th>Módulo</th><th>Pieza</th><th>L × A × E (mm)</th><th>Material</th><th>Canto estimado (m)</th>';
 const rows=estimate.model.parts.map(part=>`<tr><td>${esc(part.id)}</td><td>${part.moduleIndex===undefined?'General':part.moduleIndex+1}</td><td>${esc(part.name)}</td><td>${part.length} × ${part.width} × ${part.thickness}</td><td>${esc(part.material)}</td><td>${(edgeMm(part)/1000).toFixed(2)}</td></tr>`).join('');
 const moduleRows=p.moduleWidths.map((w,i)=>`<tr><td>${i+1}</td><td>${esc(p.moduleTypes[i])}</td><td>${w}</td><td>${p.moduleShelves[i]}</td><td>${p.moduleDrawers[i]}</td></tr>`).join('');
 const qaRows=CHECKS.map(c=>`<tr><td>${checks[c.id]===true?'Registrado':'Pendiente'}</td><td>${esc(c.label)}</td><td>${esc(c.help)}</td></tr>`).join('');
 const warns=[...qa.blocks,...qa.warnings].map(x=>`<li>${esc(x)}</li>`).join('');
 const purchases=root.MueblesCore.purchaseList(estimate);
 const purchaseRows=purchases.rows.map(r=>`<tr><td>${esc(r.code)}</td><td>${esc(r.description)}</td><td>${r.qty} ${esc(r.unit)}</td><td>${clp(r.total)}</td></tr>`).join('');
 const n=estimate.nesting;
 const countBy={sheet18:n.counts.sheet18,sheet15:n.counts.sheet15,back3:n.counts.back3};
 const byMat=`Melamina 18 mm: ${countBy.sheet18}; melamina 15 mm: ${countBy.sheet15}; MDF 3 mm: ${countBy.back3}`;
 const quoteRef=String(meta.quoteRef||'SIN-REFERENCIA').slice(0,60);
 const safeSVG=String(elevationSVG||'').startsWith('<svg')&&String(elevationSVG).length<150000?elevationSVG:'';
 return `<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>INGEBAM Ficha técnica ${esc(quoteRef)}</title><style>
 body{font:13px/1.55 Arial,sans-serif;color:#1e293b;max-width:1100px;margin:24px auto;padding:0 22px}h1{font-size:25px;margin:0}h2{font-size:17px;margin-top:26px;border-bottom:2px solid #c7a173;padding-bottom:6px}header{display:flex;justify-content:space-between;border-bottom:3px solid #b48a52;padding-bottom:16px}small{color:#64748b}.logo{font-weight:bold;color:#9a713b;letter-spacing:.14em}.status{border:1px solid #ba8349;background:#fff7e8;padding:12px;margin:18px 0;border-radius:8px}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #cfd6dd;padding:6px;vertical-align:top}th{background:#ecf0f4;text-align:left}tr{break-inside:avoid}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.grid>div{background:#f1f5f9;padding:10px;border-radius:6px}.alzado svg{width:100%;max-height:440px}.note{color:#475569}.no-print{padding:9px 12px}footer{border-top:1px solid #b6c1cd;color:#586777;margin:32px 0 12px;padding-top:12px}@media print{body{margin:5px auto}.no-print{display:none}.alzado{break-inside:avoid}h2{break-after:avoid}}
 </style></head><body><header><div><div class="logo">INGEBAM / MUEBLES360 V3.7</div><h1>Ficha técnica para revisión</h1><small>No constituye plano aprobado ni orden de corte CNC</small></div><button class="no-print" onclick="print()">Imprimir / Guardar PDF</button></header>
 <div class="status"><strong>Estado: ${esc(qa.status)}</strong><div>${qa.checksCompleted} de ${CHECKS.length} verificaciones declaradas · ${qa.blocks.length} condiciones pendientes de corrección</div></div>
 <div class="grid"><div><b>Proyecto</b><div>${esc(meta.projectName||'Sin nombre')}</div><b>Referencia</b><div>${esc(quoteRef)}</div></div><div><b>Cliente</b><div>${esc(meta.client||'Sin confirmar')}</div><b>Fecha</b><div>${new Date().toISOString().slice(0,10)}</div></div></div>
 <h2>Dimensiones generales y materiales</h2><p><b>Tipo:</b> ${esc(p.category)} · <b>Medidas:</b> ${p.width} × ${p.height} × ${p.depth} mm · <b>Espesor tablero principal:</b> ${p.thickness} mm · <b>Acabado:</b> ${esc(p.finish)} · <b>Apoyo:</b> ${esc(p.baseType)}</p>
 <p><b>Planchas preliminares:</b> ${esc(byMat)} · <b>Aprovechamiento simulado:</b> ${(100-n.wastePct).toFixed(1)}% · <b>Sin ubicar:</b> ${n.unplaced.length}</p>
 <h2>Distribución modular</h2><table><thead><tr><th>Módulo</th><th>Frente</th><th>Ancho útil (mm)</th><th>Repisas</th><th>Cajones</th></tr></thead><tbody>${moduleRows}</tbody></table>
 ${safeSVG?`<h2>Alzado ilustrativo</h2><div class="alzado">${safeSVG}</div>`:''}
 <h2>Despiece individual PRELIMINAR (${estimate.model.parts.length} piezas)</h2><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
 <p class="note">Cantidades y tapacantos son orientativos; no incluye orientación confirmada de veta, perforaciones, molduras ni tolerancias específicas de proveedor.</p>
 <h2>Presupuesto interno de referencia</h2><p>Tableros ${clp(estimate.costs.boards)} · Herrajes ${clp(estimate.costs.hardware)} · Tapacanto ${clp(estimate.costs.edgeband)} · Mano de obra ${clp(estimate.costs.labor)} · Instalación ${clp(estimate.costs.installation)} · Despacho ${clp(estimate.costs.delivery)}</p><p><b>Costo directo:</b> ${clp(estimate.directCost)} · <b>Precio estimado:</b> ${clp(estimate.total)} ${estimate.prices.includeVat?'(IVA simulado incluido)':'(sin IVA simulado)'}</p>
 <h2>Lista de materiales y herrajes para revisión</h2><p>Perfil: ${estimate.prices.hardwareProfile==='cierre_suave'?'Cierre suave':'Estándar'} · Total de insumos ${clp(purchases.total)} (excluye mano de obra y gastos indirectos).</p><table><thead><tr><th>Código</th><th>Insumo</th><th>Cantidad</th><th>Costo estimado</th></tr></thead><tbody>${purchaseRows}</tbody></table><h2>Registro de comprobaciones</h2><table><thead><tr><th>Estado declarado</th><th>Comprobación</th><th>Contenido</th></tr></thead><tbody>${qaRows}</tbody></table>
 <h2>Riesgos y pendientes de fabricación</h2><ul>${warns||'<li>Requiere revisión técnica general antes de fabricar.</li>'}</ul>
 <footer>INGEBAM Muebles360 V3.7 · Documento de estudio generado localmente. La marca comercial del posible cliente no implica su aprobación. Se debe validar físicamente la medición, las tolerancias, los anclajes, la veta, el sistema de montaje y el despiece antes de fabricar. Ninguna casilla constituye certificación automática.</footer>
 </body></html>`;
}
root.MueblesManufacturing={CHECKS,edgeMm,assessment,technicalHTML};
if(typeof module!=='undefined'&&module.exports)module.exports=root.MueblesManufacturing;
})(typeof window!=='undefined'?window:globalThis);
