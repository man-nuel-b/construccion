/* Servidor local opcional para análisis multimodal real. Sin dependencias npm.
   Solo escucha 127.0.0.1. GEMINI_API_KEY se carga en el entorno, nunca en el HTML. */
'use strict';
const http=require('node:http');const fs=require('node:fs/promises');const path=require('node:path');
const port=Number(process.env.PORT)||8765;
const geminiModel=process.env.GEMINI_MODEL||'gemini-2.5-flash';
const allowed=new Set(['/','/index.html','/furnitureCore.js','/viewer.js','/renderer3d.js','/vision.js','/app.js','/quoteEngine.js']);
const mime={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8'};
const send=(res,code,data,type='application/json;charset=utf-8')=>{res.writeHead(code,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(typeof data==='string'||Buffer.isBuffer(data)?data:JSON.stringify(data))};
const prompt=`Eres un analizador visual para un CONFIGURADOR DE MUEBLES. Observa exclusivamente el frente visible de la imagen. No supongas piezas ocultas, cotas, accesorios ni resistencia de montaje.
Devuelve JSON válido con: category ("cocina"|"closet"|"vanitorio"), modules (entero 1-6), moduleTypes (lista de modules con "puerta"|"cajones"|"abierto"|"mixto"), regions (lista de modules objetos {type,drawers, shelves,mixPct,confidence,detail}), finish ("roble"|"nogal"|"blanco"|"grafito"), confidence (0.05-0.95), notes (hasta 250 caracteres).
"mixto" significa repisas abiertas en la zona superior y cajones en la inferior. drawers y shelves son números estimativos (1-5 cajones, 0-5 repisas); mixPct indica qué porcentaje inferior ocupa la cajonera (25-75).
IMPORTANTE: las líneas de madera, reflejos, sombras y tiradores se pueden confundir con puertas/cajones/repisas. Si no se distinguen, marca confidence bajo y aclara la incertidumbre en detail. No inventes dimensiones reales. El resultado solo propone módulos editables, nunca despieces para producción.`;
async function processImage(input){
 const key=process.env.GEMINI_API_KEY;if(!key)throw Object.assign(new Error('Configura GEMINI_API_KEY en el servidor para utilizar IA real.'),{status:503});
 const type=input?.mimeType;if(!['image/png','image/jpeg','image/webp'].includes(type))throw Object.assign(new Error('Tipo de imagen no admitido.'),{status:400});
 const data=input?.data;if(typeof data!=='string'||data.length>16_500_000||!(/^[\w+/=]+$/.test(data)))throw Object.assign(new Error('Archivo de imagen inválido o demasiado grande.'),{status:400});
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`,{
   method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts:[{text:prompt},{inline_data:{mime_type:type,data}}]}],generationConfig:{response_mime_type:'application/json',temperature:0.1}})
  });
  if(!response.ok)throw Object.assign(new Error(`El proveedor de IA respondió ${response.status}. Comprueba la clave, cuotas y disponibilidad del modelo.`),{status:502});
  const json=await response.json();const content=json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if(!content)throw Object.assign(new Error('La IA no devolvió un análisis interpretable.'),{status:502});
  let ai;try{ai=JSON.parse(content)}catch{throw Object.assign(new Error('Respuesta de IA no contiene JSON válido.'),{status:502})}
  const category=['cocina','closet','vanitorio'].includes(ai.category)?ai.category:'closet';
  const modules=Math.min(6,Math.max(1,Math.round(Number(ai.modules)||3)));
  const types=['puerta','cajones','abierto','mixto'];
  const moduleTypes=Array.from({length:modules},(_,i)=>types.includes(ai.moduleTypes?.[i])?ai.moduleTypes[i]:'puerta');
  const limit=(value,min,max,fallback)=>Math.min(max,Math.max(min,Number.isFinite(Number(value))?Number(value):fallback));
  const regions=Array.from({length:modules},(_,i)=>{const r=ai.regions?.[i]||{};return{
   type:types.includes(r.type)?r.type:moduleTypes[i],drawers:Math.round(limit(r.drawers,1,5,3)),shelves:Math.round(limit(r.shelves,0,5,1)),
   mixPct:Math.round(limit(r.mixPct,25,75,45)),confidence:limit(r.confidence,.05,.95,.35),detail:String(r.detail||'Verificar visualmente').slice(0,150)};
  });
  const finish=['roble','nogal','blanco','grafito'].includes(ai.finish)?ai.finish:'roble';
  return {category,modules,moduleTypes,regions,finish,confidence:limit(ai.confidence,.05,.95,.4),notes:String(ai.notes||'Propuesta aproximada, confirma en terreno.').slice(0,250)};
 }finally{clearTimeout(timeout)}
}
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`).pathname;
 if(req.method==='POST'&&pathname==='/api/analyze-furniture'){
  let chunks=[],size=0;try{for await(const chunk of req){size+=chunk.length;if(size>17_000_000)throw Object.assign(new Error('Imagen demasiado grande.'),{status:413});chunks.push(chunk)}const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));return send(res,200,await processImage(data))}catch(e){return send(res,e.status||500,{error:e.message||'Error interno.'})}
 }
 if((req.method==='GET'||req.method==='HEAD')&&allowed.has(pathname)){
  const name=pathname==='/'?'/index.html':pathname;
  try{const bytes=await fs.readFile(path.join(__dirname,name));return send(res,200,bytes,mime[path.extname(name)]||'application/octet-stream')}catch{return send(res,404,{error:'Archivo no encontrado'})}
 }
 return send(res,404,{error:'Ruta no disponible'});
});
if(require.main===module)server.listen(port,'127.0.0.1',()=>console.log(`INGEBAM Muebles360: http://127.0.0.1:${port}/`));
module.exports={server,processImage};
