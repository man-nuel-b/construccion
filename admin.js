(function(){
"use strict";
const OWNER="man-nuel-b",REPO="construccion",BRANCH="main",BASE="https://api.github.com/repos/man-nuel-b/construccion";
const $=id=>document.getElementById(id);
const CATS={tiny:"Tiny House",oficina:"Oficina modular",banos:"Batería de baños",comercial:"Local comercial"};
let token="",models=[],dataSha="",configSha="",editing=-1,saving=false,catalogBusy=false,coverFile=null,panoFile=null,galleryFiles=[],cover="",pano="",gallery=[];
function show(id,yes){$(id).classList.toggle("hidden",!yes)}
function msg(id,value){$(id).textContent=value||"";show(id,!!value)}
function flash(value,err){const el=$("toast");el.textContent=value;el.classList.toggle("error",!!err);show("toast",true);clearTimeout(flash.t);flash.t=setTimeout(()=>show("toast",false),4500)}
function textB64(v){const bytes=new TextEncoder().encode(v);return bytesB64(bytes)}
function bytesB64(v){let s="";for(let i=0;i<v.length;i+=32000)s+=String.fromCharCode(...v.subarray(i,i+32000));return btoa(s)}
function fromB64(s){const raw=atob(s.replace(/\s/g,""));return new TextDecoder().decode(Uint8Array.from(raw,c=>c.charCodeAt(0)))}
function encPath(path){return path.split("/").map(encodeURIComponent).join("/")}
async function api(url,opt={}){
 const h={Accept:"application/vnd.github+json",Authorization:"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28"};
 if(opt.body)h["Content-Type"]="application/json";
 const r=await fetch(url.startsWith("https://")?url:BASE+url,{...opt,headers:h,cache:"no-store"});
 let data={};try{data=await r.json()}catch(e){}
 if(!r.ok){if(r.status===401)throw Error("Token inválido o vencido.");if(r.status===403)throw Error("No tienes permisos suficientes o se alcanzó un límite de GitHub.");if(r.status===409)throw Error("Conflicto de edición. Actualiza los datos antes de guardar.");throw Error(data.message||"Error de GitHub: "+r.status)}
 return data;
}
async function getFile(path){const r=await api("/contents/"+encPath(path)+"?ref="+BRANCH);return {sha:r.sha,content:fromB64(r.content)}}
async function putFile(path,content,sha,message,raw){
 const data={message,branch:BRANCH,content:raw?content:textB64(content)};if(sha)data.sha=sha;
 return api("/contents/"+encPath(path),{method:"PUT",body:JSON.stringify(data)});
}
async function login(){
 msg("login-error","");token=$("token").value.trim();if(!token)return msg("login-error","Introduce tu token de GitHub.");
 $("login").disabled=true;
 try{const [u,repo]=await Promise.all([api("https://api.github.com/user"),api("")]);
 if(repo.full_name!=="man-nuel-b/construccion"||!repo.permissions||!repo.permissions.push)throw Error("Sin permisos de escritura en INGEBAM.");
 $("token").value="";$("admin-user").textContent=u.login||"GitHub";
 await reload();show("login-view",false);show("app-view",true);flash("Conectado a GitHub");
 }catch(e){token="";msg("login-error",e.message)}finally{$("login").disabled=false}
}
async function reload(){
 msg("dashboard-error","");
 try{const [data,config]=await Promise.all([getFile("data/modelos.json"),getFile("config.js")]);models=JSON.parse(data.content);if(!Array.isArray(models))throw Error("Catálogo inválido.");
 dataSha=data.sha;configSha=config.sha;const m=config.content.match(/whatsappNumber\s*:\s*["']([0-9]*)["']/);
 $("whatsapp").value=m?m[1]:"";$("whatsapp-status").textContent=m&&m[1]?"Número configurado. Verifica que recibas las consultas.":"Sin número configurado; el formulario público no enviará mensajes.";
 render()}catch(e){msg("dashboard-error",e.message);throw e}
}
function path(p){
 if(typeof p!=="string"||!p||p.includes(".."))return"";
 if(/^\/construccion\/media\/[a-zA-Z0-9\/_.%\-]+$/i.test(p))return p;
 if(/^(media|imagenes|assets)\/[a-zA-Z0-9\/_.%\-]+$/i.test(p))return "./"+p;
 return"";
}
function render(){
 $("stat-total").textContent=models.length;
 $("stat-live").textContent=models.filter(x=>x.publicado!==false).length;
 $("stat-images").textContent=models.reduce((n,x)=>n+(x.imagen?1:0)+(Array.isArray(x.galeria)?x.galeria.length:0),0);
 $("stat-360").textContent=models.filter(x=>x.panorama).length;
 const q=$("search").value.trim().toLowerCase(),cat=$("category-filter").value,status=$("status-filter").value;
 const out=$("model-list");out.replaceChildren();let count=0;
 models.forEach((m,i)=>{
 if(q&&!(String(m.nombre)+" "+String(m.ubicacion)).toLowerCase().includes(q))return;
 if(cat!=="all"&&m.tipo!==cat)return;
 if(status==="live"&&m.publicado===false)return;
 if(status==="draft"&&m.publicado!==false)return;
 count++;
 const row=document.createElement("article");row.className="model-row";
 const img=document.createElement("img");img.className="thumb";img.alt="";img.loading="lazy";if(path(m.imagen))img.src=path(m.imagen);
 const info=document.createElement("div");const name=document.createElement("div");name.className="row-title";name.textContent=m.nombre;info.appendChild(name);
 const sub=document.createElement("div");sub.className="row-sub";sub.textContent=[m.ubicacion,m.descripcion].filter(Boolean).join(" · ");info.appendChild(sub);
 const catEl=document.createElement("div");catEl.className="row-category";catEl.textContent=CATS[m.tipo]||m.tipo;
 const surface=document.createElement("div");surface.className="row-surface small muted";surface.textContent=m.superficie||"—";
 const actions=document.createElement("div");actions.className="row-actions";
 const tag=document.createElement("span");tag.className="pill "+(m.publicado===false?"off":"live");tag.textContent=m.publicado===false?"Borrador":"Publicado";actions.appendChild(tag);
 [["Editar","edit"],[m.publicado===false?"Publicar":"Ocultar","toggle"],["Duplicar","copy"],["Eliminar","delete"]].forEach(x=>{const b=document.createElement("button");b.type="button";b.className="icon-btn"+(x[1]==="delete"?" danger":"");b.dataset.action=x[1];b.dataset.index=i;b.textContent=x[0];actions.appendChild(b)});
 row.append(img,info,catEl,surface,actions);out.appendChild(row);
 });
 if(!count)out.innerHTML='<div class="empty">No se encontraron modelos.</div>';
}
async function validateImage(f,isPano){
 if(!["image/jpeg","image/png","image/webp"].includes(f.type))throw Error("Imagen no admitida. Usa JPG, PNG o WEBP.");
 if(!f.size||f.size>8*1024*1024)throw Error("Imagen vacía o superior a 8 MB.");
 await new Promise((resolve,reject)=>{const u=URL.createObjectURL(f),im=new Image();
 im.onload=()=>{URL.revokeObjectURL(u);const r=im.naturalWidth/im.naturalHeight;if(isPano&&Math.abs(r-2)>.085)reject(Error("El panorama 360° debe tener proporción 2:1."));else resolve()};
 im.onerror=()=>{URL.revokeObjectURL(u);reject(Error("No se pudo leer la imagen."))};im.src=u});
}
function preview(id,source,file){const el=$(id);el.removeAttribute("src");show(id,false);
 if(file){const u=URL.createObjectURL(file);el.onload=()=>URL.revokeObjectURL(u);el.src=u;show(id,true)}
 else if(path(source)){el.src=path(source);show(id,true)}
}
function galleryView(){
 const root=$("gallery-preview");root.replaceChildren();
 function one(src,i,newItem){
 const box=document.createElement("div");box.className="thumb-item";
 const img=document.createElement("img");img.alt="Foto de galería";
 if(newItem){const u=URL.createObjectURL(src);img.onload=()=>URL.revokeObjectURL(u);img.src=u}else img.src=path(src);
 const btn=document.createElement("button");btn.type="button";btn.textContent="Quitar";
 btn.dataset[newItem?"removeNewGallery":"removeGallery"]=i;box.append(img,btn);root.appendChild(box)}
 gallery.forEach((x,i)=>one(x,i,false));galleryFiles.forEach((x,i)=>one(x,i,true));
}
function openEditor(i=-1,clone=false){
 editing=clone?-1:i;const row=i>=0?models[i]:null;
 $("model-form").reset();["main-photo","pano-photo","gallery-photos"].forEach(k=>$(k).value="");
 coverFile=null;panoFile=null;galleryFiles=[];cover=row?.imagen||"";pano=row?.panorama||"";gallery=Array.isArray(row?.galeria)?[...row.galeria]:[];
 $("editor-title").textContent=clone?"Duplicar modelo":row?"Editar modelo":"Nuevo modelo";
 $("name").value=(row?.nombre||"")+(clone?" (copia)":"");
 $("type").value=row?.tipo||"tiny";$("location").value=row?.ubicacion||"";$("surface").value=row?.superficie||"";$("description").value=row?.descripcion||"";
 $("published").checked=clone?false:row?row.publicado!==false:false;
 $("main-path").textContent=cover?"Foto actual: "+cover:"Sin portada";$("pano-path").textContent=pano?"Panorama actual: "+pano:"Sin panorámica";
 preview("main-preview",cover,null);preview("pano-preview",pano,null);show("remove-main",!!cover);show("remove-pano",!!pano);
 galleryView();msg("save-error","");$("editor").showModal();
}
function slug(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,55)||"modelo"}
async function upload(file,name,label){
 await validateImage(file,label==="360");
 const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
 const id=Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
 const filePath="media/"+slug(name)+"/"+label+"-"+id+"."+ext;
 await putFile(filePath,bytesB64(new Uint8Array(await file.arrayBuffer())),null,"INGEBAM: subir fotografía "+label,true);
 return "/construccion/"+filePath;
}
async function saveModel(e){
 e.preventDefault();if(saving||catalogBusy)return;const name=$("name").value.trim(),description=$("description").value.trim();
 if(!name||!description)return msg("save-error","Faltan nombre y descripción.");
 if(!cover&&!coverFile)return msg("save-error","Debes subir una fotografía principal.");
 if(gallery.length+galleryFiles.length>12)return msg("save-error","Máximo 12 imágenes de galería.");
 const row={nombre:name,tipo:$("type").value,ubicacion:$("location").value.trim(),superficie:$("surface").value.trim(),descripcion:description,imagen:cover,galeria:[...gallery],panorama:pano,publicado:$("published").checked};
 saving=true;$("save-model").disabled=true;$("save-model").textContent="Guardando…";msg("save-error","");
 try{
 if(coverFile){flash("Subiendo fotografía…");row.imagen=await upload(coverFile,name,"portada")}
 if(panoFile){flash("Subiendo panorama 360°…");row.panorama=await upload(panoFile,name,"360")}
 for(let i=0;i<galleryFiles.length;i++){flash("Subiendo foto "+(i+1)+" de "+galleryFiles.length);row.galeria.push(await upload(galleryFiles[i],name,"galeria"))}
 const latest=await getFile("data/modelos.json");if(latest.sha!==dataSha)throw Error("El catálogo cambió en otra sesión. Actualiza antes de guardar.");
 const copy=models.slice();if(editing>=0)copy[editing]=row;else copy.unshift(row);
 await putFile("data/modelos.json",JSON.stringify(copy,null,2)+"\n",dataSha,"INGEBAM: "+(editing>=0?"editar ":"agregar ")+name);
 await reload();$("editor").close();flash("Modelo guardado. GitHub Pages actualizará la web.");
 }catch(err){msg("save-error",err.message);flash("Error: revisa el formulario.",true)}
 finally{saving=false;$("save-model").disabled=false;$("save-model").textContent="Guardar modelo"}
}
async function togglePublish(i){
 const m=models[i];if(!m||catalogBusy||saving)return;
 const next=m.publicado===false;
 if(!confirm((next?"¿Publicar ":"¿Ocultar ")+m.nombre+" en el catálogo público?"))return;
 catalogBusy=true;$("model-list").classList.add("busy");
 try{
  const latest=await getFile("data/modelos.json");if(latest.sha!==dataSha)throw Error("El catálogo fue modificado en otra sesión. Actualiza antes de continuar.");
  const copy=models.map((x,j)=>j===i?{...x,publicado:next}:x);
  await putFile("data/modelos.json",JSON.stringify(copy,null,2)+"\n",dataSha,"INGEBAM: "+(next?"publicar ":"ocultar ")+m.nombre);
  await reload();flash(next?"Modelo publicado correctamente.":"Modelo oculto del catálogo público.");
 }catch(e){flash(e.message,true)}finally{catalogBusy=false;$("model-list").classList.remove("busy")}
}
function exportCatalog(){
 if(!dataSha)return flash("Primero carga el catálogo.",true);
 const blob=new Blob([JSON.stringify(models,null,2)+"\n"],{type:"application/json;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="ingebam-modelos-respaldo-"+new Date().toISOString().slice(0,10)+".json";
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
 flash("Respaldo descargado.");
}
async function del(i){
 const m=models[i];if(!m||catalogBusy||saving||!confirm("¿Eliminar la ficha "+m.nombre+"? Las imágenes se conservarán en GitHub como respaldo."))return;
 try{const latest=await getFile("data/modelos.json");if(latest.sha!==dataSha)throw Error("Catálogo modificado en otra sesión; actualiza antes de borrar.");
 await putFile("data/modelos.json",JSON.stringify(models.filter((_,j)=>j!==i),null,2)+"\n",dataSha,"INGEBAM: quitar "+m.nombre);await reload();flash("Modelo eliminado del catálogo.")
 }catch(e){flash(e.message,true)}
}
async function saveWhatsapp(){
 const number=$("whatsapp").value.replace(/[\s()+-]/g,"");
 if(number&&!/^569\d{8}$/.test(number))return flash("Usa un número chileno 569XXXXXXXX o deja vacío para desactivar.",true);
 if(!confirm(number?"¿Publicar este número para recibir consultas?":"¿Desactivar WhatsApp?"))return;
 $("save-whatsapp").disabled=true;
 try{const curr=await getFile("config.js");if(curr.sha!==configSha)throw Error("La configuración cambió. Pulsa Actualizar.");
 const re=/whatsappNumber\s*:\s*["'][0-9]*["']/;
 if(!re.test(curr.content))throw Error("No se encontró el ajuste comercial en config.js.");
 const changed=curr.content.replace(re,"whatsappNumber: \""+number+"\"");
 await putFile("config.js",changed,configSha,"INGEBAM: cambiar WhatsApp comercial");await reload();flash("WhatsApp actualizado.");
 }catch(e){flash(e.message,true)}finally{$("save-whatsapp").disabled=false}
}
$("login").addEventListener("click",login);$("token").addEventListener("keydown",e=>{if(e.key==="Enter")login()});
$("logout").addEventListener("click",()=>{token="";models=[];$("token").value="";show("app-view",false);show("login-view",true);flash("Sesión cerrada.")});
$("refresh").addEventListener("click",()=>reload().then(()=>flash("Catálogo actualizado.")).catch(e=>flash(e.message,true)));
$("new-model").addEventListener("click",()=>openEditor());
$("export-catalog").addEventListener("click",exportCatalog);
$("save-whatsapp").addEventListener("click",saveWhatsapp);
["search","category-filter","status-filter"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",render));
$("model-list").addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b)return;const i=Number(b.dataset.index);if(catalogBusy||saving||!Number.isInteger(i)||!models[i])return;
 if(b.dataset.action==="edit")openEditor(i);if(b.dataset.action==="copy")openEditor(i,true);if(b.dataset.action==="toggle")togglePublish(i);if(b.dataset.action==="delete")del(i)});
$("close-editor").addEventListener("click",()=>{if(!saving)$("editor").close()});
$("cancel-editor").addEventListener("click",()=>{if(!saving)$("editor").close()});
$("editor").addEventListener("cancel",e=>{if(saving)e.preventDefault()});
$("model-form").addEventListener("submit",saveModel);
$("main-photo").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{await validateImage(f,false);coverFile=f;preview("main-preview","",f);$("main-path").textContent=f.name;show("remove-main",true)}catch(err){e.target.value="";flash(err.message,true)}});
$("pano-photo").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{await validateImage(f,true);panoFile=f;preview("pano-preview","",f);$("pano-path").textContent=f.name;show("remove-pano",true)}catch(err){e.target.value="";flash(err.message,true)}});
$("gallery-photos").addEventListener("change",async e=>{const arr=[...(e.target.files||[])];e.target.value="";try{if(arr.length+gallery.length+galleryFiles.length>12)throw Error("Solo se permiten 12 fotos de galería.");
 for(const f of arr)await validateImage(f,false);galleryFiles.push(...arr);galleryView()}catch(err){flash(err.message,true)}});
$("gallery-preview").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.removeGallery!==undefined)gallery.splice(Number(b.dataset.removeGallery),1);if(b.dataset.removeNewGallery!==undefined)galleryFiles.splice(Number(b.dataset.removeNewGallery),1);galleryView()});
$("remove-main").addEventListener("click",()=>{cover="";coverFile=null;$("main-photo").value="";show("main-preview",false);show("remove-main",false);$("main-path").textContent="Sin portada"});
$("remove-pano").addEventListener("click",()=>{pano="";panoFile=null;$("pano-photo").value="";show("pano-preview",false);show("remove-pano",false);$("pano-path").textContent="Sin panorámica"});
window.addEventListener("pagehide",()=>{token=""});
})();