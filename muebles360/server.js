/* Servidor local opcional para análisis multimodal real V3.4. Sin dependencias npm.
   Solo escucha 127.0.0.1. GEMINI_API_KEY se carga en el entorno, nunca en el HTML. */
'use strict';
const http=require('node:http');const fs=require('node:fs/promises');const path=require('node:path');
const port=Number(process.env.PORT)||8765;
const geminiModel=process.env.GEMINI_MODEL||'gemini-2.5-flash';
const allowed=new Set(['/','/index.html','/furnitureCore.js','/viewer.js','/renderer3d.js','/vision.js','/photoStudio.js','/app.js','/quoteEngine.js','/v36.html']);
const mime={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8'};
const send=(res,code,data,type='application/json;charset=utf-8')=>{res.writeHead(code,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(typeof data==='string'||Buffer.isBuffer(data)?data:JSON.stringify(data))};
const Vision=require('./vision.js');
const prompt=`Eres un especialista en interpretación VISUAL de frentes de muebles para INGEBAM Muebles360. Examina SOLO el mueble visible en esta imagen, recortada por el usuario. No estimes medidas reales ni piezas ocultas.
Necesito un JSON con category (cocina|closet|vanitorio), modules (entero 1-6), finish (roble|nogal|blanco|grafito), confidence (0 a 1), notes (máximo 250 caracteres), warnings (lista breve de incertidumbres) y regions (un objeto por módulo, de izquierda a derecha).
Cada objeto regions debe contener: x0, x1 (posición relativa horizontal visible entre 0 y 1; 0 = borde izquierdo, 1 = derecho), type (puerta|cajones|abierto|mixto), drawers (1-5), shelves (0-5), mixPct (porcentaje de altura ocupado por cajones inferiores entre 25 y 75), confidence (0-1) y detail (breve observación visual).
No inventes módulos simétricos: usa la proporción observada. Identifica puertas, frentes de cajones y repisas visibles, pero no confundir molduras decorativas, reflejos o paneles de madera con cajones. Si el objeto está parcialmente oculto, reduce confianza y advierte. Ninguna sugerencia autoriza fabricación.`;
const normalizeGemini=ai=>{
 const safe=Vision.normalizeAI(ai,{category:'closet'});
 return {category:safe.category,modules:safe.modules,regions:safe.regions,confidence:safe.confidence,
 finish:['roble','nogal','blanco','grafito'].includes(ai?.finish)?ai.finish:'roble',notes:safe.detail,warnings:safe.warnings};
};
const looksLikeImage=(bytes,type)=>{
 if(type==='image/png')return bytes.length>8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(type==='image/jpeg')return bytes.length>4&&bytes[0]===255&&bytes[1]===216&&bytes[bytes.length-2]===255&&bytes[bytes.length-1]===217;
 if(type==='image/webp')return bytes.length>12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 return false;
};
async function processImage(input,{apiKey=process.env.GEMINI_API_KEY,fetchImpl=fetch}={}){
 if(!apiKey)throw Object.assign(new Error('Configura GEMINI_API_KEY en el servidor para utilizar IA real.'),{status:503});
 const type=input?.mimeType;if(!['image/png','image/jpeg','image/webp'].includes(type))throw Object.assign(new Error('Tipo de imagen no admitido.'),{status:400});
 const data=input?.data;if(typeof data!=='string'||data.length>16_500_000||!(/^[A-Za-z0-9+/]+={0,2}$/.test(data)))throw Object.assign(new Error('Archivo de imagen inválido o demasiado grande.'),{status:400});
 const bytes=Buffer.from(data,'base64');
 if(bytes.length>12*1024*1024||!looksLikeImage(bytes,type))throw Object.assign(new Error('La imagen no coincide con su formato o supera el máximo.'),{status:400});
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`,{
   method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
   body:JSON.stringify({contents:[{parts:[{text:prompt},{inline_data:{mime_type:type,data}}]}],generationConfig:{response_mime_type:'application/json',temperature:0.1}})
  });
  if(!response.ok)throw Object.assign(new Error(`El proveedor de IA respondió ${response.status}. Verifica credenciales, cuota y disponibilidad del modelo.`),{status:502});
  const json=await response.json();const content=json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if(!content)throw Object.assign(new Error('La IA no devolvió un análisis interpretable.'),{status:502});
  let ai;try{ai=JSON.parse(content)}catch{throw Object.assign(new Error('La IA no devolvió JSON válido.'),{status:502})}
  return normalizeGemini(ai);
 }finally{clearTimeout(timeout)}
}
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`).pathname;
 if(req.method==='GET'&&pathname==='/api/capabilities')return send(res,200,{aiAvailable:Boolean(process.env.GEMINI_API_KEY),requiresExplicitConsent:true,maxImageMB:12});
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
module.exports={server,processImage,normalizeGemini};
