/* INGEBAM - experiencia guiada para visitantes (sin recopilar información personal) */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const form=$("quoteForm");
const type=$("type");
const model=$("model");
const notice=$("selectedProjectNotice");
const copy=$("copyRequest");
const ready=/^569[0-9]{8}$/.test(String(window.INGEBAM_CONFIG?.whatsappNumber||""));
function message(s){if(notice)notice.textContent=s}
function choose(kind){
  if(!type)return;
  type.value=kind;
  type.dispatchEvent(new Event("change",{bubbles:false}));
  if(model)model.value="";
  const names={tiny:"Tiny House o vivienda modular",oficina:"oficina modular",banos:"batería de baños",comercial:"local comercial"};
  message("Elegiste "+(names[kind]||"un proyecto personalizado")+". Puedes cambiar cualquier opción.");
  const filter=document.querySelector('#proyectos .filter[data-filter="'+kind+'"]');
  if(filter){
    filter.click();
    document.getElementById("proyectos")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
    // Cliente ve los modelos y tiene un CTA por modelo; el filtro ya está aplicado.
  }else{
    $("cotizador")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
  }
}
document.querySelectorAll("[data-quick-type]").forEach(button=>{
  button.addEventListener("click",()=>choose(button.dataset.quickType));
});
document.querySelectorAll('a[href="#cotizador"]').forEach(anchor=>{
  anchor.addEventListener("click",()=>{
    if(type&&!type.value)message("No necesitas elegir un modelo concreto para hacer una consulta.");
  });
});
if(!ready){
  const banner=$("whatsappWarning");
  if(banner){
    banner.hidden=false;
    banner.textContent="El WhatsApp comercial todavía no está conectado. Puedes preparar tu mensaje y copiarlo; el sitio no enviará tus datos automáticamente.";
  }
  const submit=form?.querySelector('[type="submit"]');
  if(submit)submit.textContent="Preparar mi consulta";
  document.querySelectorAll(".hero-actions .btn-primary,.mobile-quote-bar .btn-primary").forEach(a=>{
    a.textContent="Preparar consulta";
  });
}else{
  // El número existe en configuración. El envío solo ocurre al pulsar el botón del formulario.
  if(window.gtag){
    try{window.gtag("event","ingebam_contact_available")}catch(_){}
  }
}
form?.addEventListener("input",()=>{
  if(copy){copy.hidden=true;delete copy.dataset.message;}
  const status=$("success");if(status)status.style.display="none";
});
async function copyMessage(){
  const value=copy?.dataset.message||"";
  if(!value)return;
  let done=false;
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);done=true}}catch(_){}
  if(!done){
    // Fallback accesible: ofrece el mensaje seleccionado para copiar manualmente.
    const dialog=$("ingebam-copy-dialog"),content=$("ingebam-copy-text");
    if(dialog&&content){content.value=value;dialog.showModal();content.focus();content.select();return;}
  }
  const status=$("success");if(status){status.style.display="block";status.textContent="Consulta copiada. Puedes pegarla en el WhatsApp de INGEBAM cuando tengas su contacto verificado."}
}
copy?.addEventListener("click",copyMessage);
$("ingebam-copy-close")?.addEventListener("click",()=>$("ingebam-copy-dialog")?.close());
const menu=$("menuBtn"),nav=$("navLinks");
if(menu&&nav){
  menu.setAttribute("aria-expanded",nav.classList.contains("open")?"true":"false");
  menu.setAttribute("aria-controls","navLinks");
  const observer=new MutationObserver(()=>menu.setAttribute("aria-expanded",nav.classList.contains("open")?"true":"false"));
  observer.observe(nav,{attributes:true,attributeFilter:["class"]});
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&nav.classList.contains("open")){nav.classList.remove("open");menu.focus()}
  });
  document.addEventListener("pointerdown",e=>{
    if(nav.classList.contains("open")&&!nav.contains(e.target)&&!menu.contains(e.target))nav.classList.remove("open");
  });
}
})();
