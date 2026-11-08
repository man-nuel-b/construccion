(function(){
"use strict";
const $=id=>document.getElementById(id),form=$("quoteForm"),type=$("type"),model=$("model");
if(!form||!form.querySelector(".form-grid"))return;
let step=0;
const titles=["¿Qué servicio necesitas?","Cuéntanos tu proyecto","¿Dónde lo necesitas?","Revisa tu solicitud"];
const hints=["Elige qué necesitas. Si todavía no estás seguro, también podemos orientarte.","Cuéntanos las características que te gustaría incorporar. Puedes dejar campos sin definir.","Indícanos tus datos básicos para preparar la conversación comercial.","Confirma los datos antes de continuar con WhatsApp."];
const types={tiny:"Tiny House o vivienda modular",oficina:"Oficina modular",banos:"Batería de baños modular",comercial:"Módulo comercial nuevo",habilitacion:"Habilitación de local comercial existente",personalizado:"Otro proyecto / Por definir"};
const extras={tiny:["Ventana adicional","Baño","Cocina","Terraza"],oficina:["Ventana adicional","Baño","Climatización","Divisiones interiores"],banos:["Más baños","Duchas","Accesibilidad","Lavamanos"],comercial:["Vitrinas","Baño","Climatización","Bodega"],habilitacion:["Redistribución del local","Pintura y revestimientos","Iluminación","Instalaciones por evaluar"],personalizado:["Ventanas","Baño","Cocina","Otra adaptación"]};
const original={};
["type","model","details","name","phone","location","timeframe"].forEach(k=>{original[k]=$(k)?.closest(".field")});
if(Object.values(original).some(v=>!v))return;
const oldGrid=form.querySelector(".form-grid");
const wizard=document.createElement("div");wizard.className="quote-wizard";
wizard.innerHTML=[
'<div class="wizard-progress-wrap"><p class="wizard-counter" id="wizardCounter" aria-live="polite">Paso 1 de 4</p><ol class="wizard-progress" aria-label="Pasos de cotización">',
'<li><button type="button" data-step-index="0"><span>1</span><strong>Tu idea</strong></button></li>',
'<li><button type="button" data-step-index="1"><span>2</span><strong>Detalles</strong></button></li>',
'<li><button type="button" data-step-index="2"><span>3</span><strong>Contacto</strong></button></li>',
'<li><button type="button" data-step-index="3"><span>4</span><strong>Revisar</strong></button></li></ol></div>',
'<section class="wizard-panel" data-panel="0" aria-labelledby="wizardTitle0"><h3 id="wizardTitle0" tabindex="-1"></h3><p class="wizard-hint"></p>',
'<div class="wizard-type-grid" role="group" aria-label="Qué quieres construir">',
'<button type="button" data-wizard-type="tiny"><span aria-hidden="true">⌂</span>Tiny House</button>',
'<button type="button" data-wizard-type="oficina"><span aria-hidden="true">▣</span>Oficina</button>',
'<button type="button" data-wizard-type="banos"><span aria-hidden="true">▤</span>Baños</button>',
'<button type="button" data-wizard-type="comercial"><span aria-hidden="true">▦</span>Módulo comercial</button>',
'<button type="button" class="wizard-fitout-choice" data-wizard-type="habilitacion"><span aria-hidden="true">▤</span>Habilitar local existente</button>',
'<button type="button" data-wizard-type="personalizado"><span aria-hidden="true">✧</span>Aún no lo sé</button>',
'</div><div class="form-grid wizard-fields"></div></section>',
'<section class="wizard-panel" data-panel="1" aria-labelledby="wizardTitle1" hidden><h3 id="wizardTitle1" tabindex="-1"></h3><p class="wizard-hint"></p><div class="form-grid wizard-fields"></div>',
'<fieldset class="wizard-extras"><legend>¿Qué te gustaría agregar? <small>(opcional)</small></legend><div id="wizardExtras" class="wizard-extra-grid"></div></fieldset></section>',
'<section class="wizard-panel" data-panel="2" aria-labelledby="wizardTitle2" hidden><h3 id="wizardTitle2" tabindex="-1"></h3><p class="wizard-hint"></p><div class="form-grid wizard-fields"></div>',
'<p class="wizard-privacy">Tus datos se usan para preparar la consulta que tú decidas enviar. Esta página no guarda formularios en una base de datos.</p></section>',
'<section class="wizard-panel" data-panel="3" aria-labelledby="wizardTitle3" hidden><h3 id="wizardTitle3" tabindex="-1"></h3><p class="wizard-hint"></p>',
'<div id="wizardSummary" class="wizard-summary" role="group" aria-label="Resumen de tu solicitud"></div>',
'<p class="wizard-privacy">Podrás revisar el mensaje preparado antes de enviarlo desde WhatsApp.</p>',
'<div id="wizardFinalControls"></div></section>',
'<div class="wizard-actions"><button class="btn btn-ghost" type="button" id="wizardBack" hidden>← Volver</button>',
'<button class="btn btn-primary" type="button" id="wizardNext">Continuar →</button></div>',
'<div id="wizardLive" class="wizard-live" role="status" aria-live="polite"></div>'
].join("");
oldGrid.replaceWith(wizard);
const panels=[...wizard.querySelectorAll(".wizard-panel")];
panels.forEach((p,i)=>{p.querySelector("h3").textContent=titles[i];p.querySelector(".wizard-hint").textContent=hints[i]});
panels[0].querySelector(".wizard-fields").append(original.type);
panels[1].querySelector(".wizard-fields").append(original.model);
const grid=panels[1].querySelector(".wizard-fields");
const use=document.createElement("div");use.className="field";
use.innerHTML='<label for="wizardUsage">Uso del espacio (opcional)</label><select id="wizardUsage"><option value="">Por definir</option><option>Vivienda o descanso</option><option>Trabajo u oficina</option><option>Negocio o emprendimiento</option><option>Arriendo o inversión</option><option>Otro uso</option></select>';
const measure=document.createElement("div");measure.className="field";
measure.innerHTML='<label for="wizardSize">Medidas aproximadas (opcional)</label><input id="wizardSize" type="text" maxlength="70" placeholder="Ej.: 6 × 3 metros, o aún no lo sé">';
grid.append(use,measure);
const fitoutFields=document.createElement("div");fitoutFields.id="wizardFitoutFields";fitoutFields.className="wizard-fitout-fields";fitoutFields.hidden=true;
fitoutFields.innerHTML=[
'<div class="field"><label for="fitoutRubro">Rubro del negocio</label><select id="fitoutRubro"><option value="">Por definir</option><option>Tienda o retail</option><option>Cafetería</option><option>Restaurante o gastronomía</option><option>Oficina</option><option>Atención de público</option><option>Otro</option></select></div>',
'<div class="field"><label for="fitoutEstado">Estado actual del local</label><select id="fitoutEstado"><option value="">Por definir</option><option>Local vacío u obra gruesa</option><option>Local funcionando</option><option>Necesita remodelación</option><option>Aún no tengo un local</option></select></div>',
'<div class="field"><label for="fitoutSuperficie">Superficie aproximada (m²)</label><input id="fitoutSuperficie" type="text" maxlength="50" placeholder="Ej.: 60 m², o aún no lo sé"></div>',
'<div class="field"><label for="fitoutApertura">Fecha objetivo de apertura</label><select id="fitoutApertura"><option value="">Por definir</option><option>Lo antes posible</option><option>1 a 3 meses</option><option>3 a 6 meses</option><option>Sin fecha definida</option></select></div>'
].join("");
const fitoutTip=document.createElement("p");fitoutTip.id="wizardFitoutTip";fitoutTip.className="wizard-fitout-tip";fitoutTip.textContent="Descríbenos el local actual. Obras, instalaciones, permisos y factibilidad se evaluarán después.";
grid.append(fitoutTip,fitoutFields,original.details);
panels[2].querySelector(".wizard-fields").append(original.name,original.phone,original.location,original.timeframe);
const finalControls=$("wizardFinalControls");
for(const el of [form.querySelector(".form-note"),$("whatsappWarning"),form.querySelector('[type="submit"]'),$("success"),$("copyRequest")])if(el)finalControls.append(el);
finalControls.querySelector('[type="submit"]')?.classList.add("wizard-submit");
const next=$("wizardNext"),back=$("wizardBack");
function sync(){
 const fitout=type.value==="habilitacion";
 original.model.hidden=fitout;
 use.hidden=fitout;
 measure.hidden=fitout;
 fitoutFields.hidden=!fitout;
 fitoutTip.hidden=!fitout;
 panels[1].querySelector(".wizard-hint").textContent=fitout
  ?"Cuéntanos el rubro, estado y tamaño de tu local. Puedes dejar lo que aún no sabes sin completar."
  :"Personaliza tu construcción modular con un modelo, uso, medidas y equipamiento.";
 wizard.querySelectorAll("[data-wizard-type]").forEach(b=>{const yes=type.value===b.dataset.wizardType;b.classList.toggle("selected",yes);b.setAttribute("aria-pressed",String(yes))});
}
function renderExtras(){
 const root=$("wizardExtras"),checked=new Set([...root.querySelectorAll('input:checked')].map(x=>x.value));root.replaceChildren();
 (extras[type.value]||extras.personalizado).forEach(s=>{
  const label=document.createElement("label");label.className="wizard-extra";
  const check=document.createElement("input");check.type="checkbox";check.name="wizardExtra";check.value=s;check.checked=checked.has(s);
  const name=document.createElement("span");name.textContent=s;label.append(check,name);root.append(label);
 });
}
function getExtras(){return [...wizard.querySelectorAll('input[name="wizardExtra"]:checked')].map(x=>x.value)}
function row(dl,label,value){
 const item=document.createElement("div"),term=document.createElement("dt"),val=document.createElement("dd");
 term.textContent=label;val.textContent=value||"Por definir";item.append(term,val);dl.append(item);
}
function summary(){
 const dl=document.createElement("dl");dl.className="wizard-summary-grid";
 row(dl,"Tipo",types[type.value]);
 if(type.value==="habilitacion"){
  row(dl,"Rubro",$("#fitoutRubro").value);
  row(dl,"Estado actual",$("#fitoutEstado").value);
  row(dl,"Superficie",$("#fitoutSuperficie").value.trim());
  row(dl,"Apertura objetivo",$("#fitoutApertura").value);
  row(dl,"Trabajos solicitados",getExtras().join(", "));
 }else{
  row(dl,"Modelo",model.value||"Por definir");
  row(dl,"Uso",$("#wizardUsage").value);
  row(dl,"Medidas",$("#wizardSize").value.trim());
  row(dl,"Equipamiento",getExtras().join(", "));
 }
 row(dl,"Detalles",$("details").value.trim()||"Sin detalles adicionales");
 row(dl,"Comuna o sector",$("location").value.trim());
 row(dl,"Plazo",$("timeframe").value);
 row(dl,"Nombre",$("name").value.trim());
 row(dl,"Teléfono",$("phone").value.trim()||"No indicado");
 $("wizardSummary").replaceChildren(dl);
}
function showStep(i,focus=false){
 step=Math.max(0,Math.min(3,i));
 panels.forEach((p,n)=>p.hidden=n!==step);
 wizard.querySelectorAll("[data-step-index]").forEach(b=>{
  const idx=Number(b.dataset.stepIndex);b.disabled=idx>step;b.setAttribute("aria-current",idx===step?"step":"false");b.classList.toggle("completed",idx<step);
 });
 $("wizardCounter").textContent="Paso "+(step+1)+" de 4";
 back.hidden=step===0;next.hidden=step===3;
 if(step===3)summary();
 $("wizardLive").textContent=titles[step];
 if(focus)panels[step].querySelector("h3")?.focus({preventScroll:true});
}
function validate(){
 if(step===0&&!type.value){type.setCustomValidity("Selecciona qué necesitas construir.");type.reportValidity();type.setCustomValidity("");return false;}
 if(step===2)for(const field of [$("name"),$("location")])if(!field.checkValidity()){field.reportValidity();return false;}
 return true;
}
next.addEventListener("click",()=>{if(validate())showStep(step+1,true)});
back.addEventListener("click",()=>showStep(step-1,true));
wizard.querySelectorAll("[data-step-index]").forEach(b=>b.addEventListener("click",()=>{const idx=Number(b.dataset.stepIndex);if(idx<step)showStep(idx,true)}));
wizard.querySelectorAll("[data-wizard-type]").forEach(b=>b.addEventListener("click",()=>{
 type.value=b.dataset.wizardType;type.dispatchEvent(new Event("change",{bubbles:true}));
 sync();renderExtras();showStep(1,true);
}));
type.addEventListener("change",()=>{sync();renderExtras()});
document.querySelectorAll("[data-business-line]").forEach(link=>{
 link.addEventListener("click",()=>{
  if(link.dataset.businessLine==="habilitacion"){
   type.value="habilitacion";type.dispatchEvent(new Event("change",{bubbles:false}));model.value="";showStep(1,false);
  }else if(link.dataset.businessLine==="modular"&&type.value==="habilitacion"){
   type.value="";type.dispatchEvent(new Event("change",{bubbles:false}));showStep(0,false);
  }
 });
});
wizard.addEventListener("input",()=>{if(step===3)summary()});
form.addEventListener("submit",e=>{
 if(step!==3){e.preventDefault();e.stopImmediatePropagation();return}
 if(!type.value){e.preventDefault();e.stopImmediatePropagation();showStep(0,true);validate();return}
 if(!$("name").checkValidity()||!$("location").checkValidity()){e.preventDefault();e.stopImmediatePropagation();showStep(2,true);validate()}
},true);
document.querySelector("#proyectos .projects")?.addEventListener("click",e=>{
 if(e.target.closest("[data-select-model]"))setTimeout(()=>{sync();showStep(1,false)},0);
});
document.querySelectorAll("[data-quick-type]").forEach(b=>b.addEventListener("click",()=>{
 sync();renderExtras();
 if(type.value&&!document.querySelector('#proyectos .filter[data-filter="'+type.value+'"]'))showStep(1,false);
}));
if(new URLSearchParams(window.location.search).get("servicio")==="habilitacion"){
 type.value="habilitacion";
 type.dispatchEvent(new Event("change",{bubbles:false}));
 model.value="";
}
sync();renderExtras();showStep(type.value?1:0);
})();