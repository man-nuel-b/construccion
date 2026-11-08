/* INGEBAM - Catálogo administrable desde Pages CMS. Sin base de datos. */
(function(){
  "use strict";
  const DATA_URL="data/modelos.json";
  const root=document.querySelector("#proyectos .projects");
  const filters=document.querySelector("#proyectos .projects-controls");
  const typeSelect=document.getElementById("type"),modelSelect=document.getElementById("model");
  if(!root)return;
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const categories={tiny:"Tiny Houses",oficina:"Oficinas modulares",banos:"Baterías de baños",comercial:"Módulos comerciales"};
  let data=[];
  function path(v){
    const s=String(v||"").trim();
    if(!s||/^(javascript:|data:|https?:\/\/)/i.test(s)||s.includes("..")||s.includes('"')||s.includes("'"))return "";
    if(s.startsWith("/construccion/"))return s;
    if(s.startsWith("/"))return s;
    return "./"+s.replace(/^\.\//,"");
  }
  function card(m,i){
    const name=esc(m.nombre),pic=path(m.imagen),desc=esc(m.descripcion),type=esc(m.tipo),area=esc(m.superficie);
    const imgs=Array.isArray(m.galeria)?m.galeria.filter(path):[];
    const pano=path(m.panorama);
    return '<article class="card project reveal visible" data-category="'+type+'" data-model="'+i+'">'+
      '<div class="project-media">'+(pic?'<img loading="lazy" decoding="async" src="'+esc(pic)+'" alt="'+name+'">':'<div class="ingebam-no-image">Fotografía pendiente</div>')+
      (pano?'<button type="button" class="tour-button" data-panorama="'+i+'">Vista 360°</button>':'')+'</div>'+
      '<div class="project-info"><small>'+esc(categories[m.tipo]||"Proyecto modular")+(m.ubicacion?' · '+esc(m.ubicacion):'')+'</small>'+
      '<h3>'+name+(area?' · '+area:'')+'</h3><p>'+desc+'</p>'+
      '<div class="ingebam-card-actions">'+(imgs.length?'<button type="button" class="ingebam-photo-btn" data-gallery="'+i+'">Ver fotografías ('+imgs.length+')</button>':'')+
      '<a href="#cotizador" class="ingebam-quote-btn" data-select-model="'+i+'">Consultar por este modelo</a></div></div></article>';
  }
  function mount(){
    const active=document.querySelector("#proyectos .filter.active")?.dataset.filter||"todos";
    root.innerHTML=data.map(card).join("");
    document.querySelectorAll("#proyectos .project").forEach(p=>{p.style.display=(active==="todos"||p.dataset.category===active)?"":"none"});
    if(filters){
      const present=new Set(data.map(x=>x.tipo));
      const labels=[["todos","Todos"],["tiny","Tiny Houses"],["oficina","Oficinas"],["banos","Baños"],["comercial","Comercial"]];
      filters.innerHTML=labels.filter(([k])=>k==="todos"||present.has(k)).map(([k,l])=>'<button class="filter'+(k===active?" active":"")+'" type="button" data-filter="'+k+'">'+l+'</button>').join("");
      filters.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{
        filters.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));
        root.querySelectorAll(".project").forEach(p=>{p.style.display=b.dataset.filter==="todos"||p.dataset.category===b.dataset.filter?"":"none"});
      }));
    }
    if(typeSelect){
      const previous=typeSelect.value;
      typeSelect.innerHTML='<option value="">¿Qué tipo de proyecto tienes en mente?</option>'+
        ["tiny","oficina","banos","comercial"].map(k=>'<option value="'+esc(k)+'">'+esc(categories[k])+'</option>').join("")+
        '<option value="habilitacion">Habilitación de local comercial existente</option>'+
        '<option value="personalizado">Otro proyecto / Aún no lo sé</option>';
      if(previous&&[...typeSelect.options].some(o=>o.value===previous))typeSelect.value=previous;
      populateModel();
    }
  }
  function populateModel(selection){
    if(!modelSelect||!typeSelect)return;
    const matches=data.filter(m=>m.tipo===typeSelect.value);
    modelSelect.replaceChildren(new Option(typeSelect.value==="habilitacion"?"No aplica: habilitación de espacio existente":"Aún no tengo un modelo definido",""));
    for(const m of matches)modelSelect.add(new Option(m.nombre,m.nombre));
    modelSelect.add(new Option("Diseño personalizado","Proyecto personalizado"));
    if(selection)modelSelect.value=selection;
  }
  // Se registra después del formulario existente, y reemplaza sus opciones.
  typeSelect?.addEventListener("change",()=>populateModel());
  root.addEventListener("click",e=>{
    const target=e.target.closest("[data-select-model],[data-gallery],[data-panorama]");
    if(!target)return;
    const idx=Number(target.dataset.selectModel??target.dataset.gallery??target.dataset.panorama),m=data[idx];
    if(!m)return;
    if(target.hasAttribute("data-select-model")){
      if(typeSelect){typeSelect.value=m.tipo;populateModel(m.nombre);typeSelect.dispatchEvent(new Event("change",{bubbles:false}));populateModel(m.nombre);document.getElementById("selectedProjectNotice")?.replaceChildren(document.createTextNode("Elegiste: "+m.nombre+". Puedes cambiarlo en el formulario."));document.getElementById("name")?.focus({preventScroll:true})}
    }else if(target.hasAttribute("data-panorama")){
      const panorama=path(m.panorama);
      if(panorama)location.href="tour-360.html?imagen="+encodeURIComponent(panorama)+"&modelo="+encodeURIComponent(m.nombre);
    }else if(target.hasAttribute("data-gallery")){
      openGallery(m);
    }
  });
  function openGallery(m){
    const images=[m.imagen,...(Array.isArray(m.galeria)?m.galeria:[])].map(path).filter(Boolean);
    if(!images.length)return;
    const dialog=document.getElementById("ingebam-gallery");
    const pane=dialog.querySelector(".ingebam-gallery-photos");
    dialog.querySelector("h2").textContent=m.nombre;
    pane.replaceChildren();
    images.forEach((src,i)=>{const img=document.createElement("img");img.src=src;img.alt="Fotografía "+(i+1)+" de "+m.nombre;img.loading="lazy";pane.appendChild(img)});
    if(typeof dialog.showModal==="function")dialog.showModal();else dialog.setAttribute("open","");
  }
  fetch(DATA_URL,{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
    .then(rows=>{if(!Array.isArray(rows))throw Error("Formato de catálogo no válido");data=rows.filter(x=>x&&x.publicado!==false&&x.nombre&&categories[x.tipo]);mount()})
    .catch(err=>{console.warn("INGEBAM: catálogo no cargado, conservando fichas originales.",err)});
})();
