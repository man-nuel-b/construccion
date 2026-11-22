/* Visor 3D ligero por proyección ortográfica de prismas. Sin CDN ni WebGL.
   No reemplaza un motor de render fotorrealista; permite selección, giro y zoom offline. */
(function(root){
'use strict';
class FurnitureViewer{
 constructor(canvas,onSelect){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.model=null;this.onSelect=onSelect;this.yaw=-.55;this.pitch=.27;this.zoom=1;this.isOpen=false;this.selectedId=null;this.polys=[];this.drag=null;this.bind();this.resize();}
 bind(){
  const c=this.canvas;
  c.addEventListener('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY,moved:false};c.setPointerCapture(e.pointerId)});
  c.addEventListener('pointermove',e=>{if(!this.drag)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.abs(dx)+Math.abs(dy)>3)this.drag.moved=true;this.yaw+=dx*.008;this.pitch=Math.max(-.35,Math.min(.65,this.pitch+dy*.006));this.drag.x=e.clientX;this.drag.y=e.clientY;this.render()});
  c.addEventListener('pointerup',e=>{if(!this.drag)return;const moved=this.drag.moved;this.drag=null;if(!moved){const rect=c.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const match=[...this.polys].reverse().find(p=>hitPoly(x,y,p.points));this.selectedId=match?match.part.id:null;this.onSelect?.(match?match.part:null);this.render()}});
  c.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.5,Math.min(2.4,this.zoom*(e.deltaY>0?.9:1.1)));this.render()},{passive:false});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>this.resize()).observe(c.parentElement);else window.addEventListener('resize',()=>this.resize());
 }
 setModel(m){this.model=m;this.selectedId=null;this.render()}
 setView(name){
  if(name==='front'){this.yaw=0;this.pitch=0}
  else if(name==='side'){this.yaw=-Math.PI/2;this.pitch=0}
  else if(name==='top'){this.yaw=0;this.pitch=1.55}
  else{this.yaw=-.55;this.pitch=.27}
  this.render();
 }
 selectModule(i){this.activeModule=i;this.render()}
 toggle(){this.isOpen=!this.isOpen;this.render();return this.isOpen}
 reset(){this.yaw=-.55;this.pitch=.27;this.zoom=1;this.render()}
 resize(){const r=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);if(!r.width||!r.height)return;this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);this.render()}
 render(){const c=this.canvas,ctx=this.ctx,w=c.clientWidth,h=c.clientHeight;if(!w||!h)return;
  ctx.clearRect(0,0,w,h);const grad=ctx.createRadialGradient(w*.55,h*.35,25,w*.55,h*.45,Math.max(w,h)*.72);grad.addColorStop(0,'#242d3a');grad.addColorStop(1,'#111722');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  const m=this.model;if(!m)return;
  const p=m.params,unit=Math.min((w-65)/(p.width*1.7),(h-120)/(p.height*1.35))*this.zoom;
  const cy=p.height*.5;const yaw=this.yaw,pitch=this.pitch;
  const proj=({x,y,z})=>{const xx=Math.cos(yaw)*x-Math.sin(yaw)*z,zz=Math.sin(yaw)*x+Math.cos(yaw)*z;const yp=Math.cos(pitch)*(y-cy)-Math.sin(pitch)*zz;const depth=Math.sin(pitch)*(y-cy)+Math.cos(pitch)*zz;return {x:w/2+xx*unit,y:h/2-yp*unit,depth}};
  // Plano cuadriculado de referencia
  const lim=Math.max(p.width,p.depth)*.85;ctx.strokeStyle='#ffffff0c';ctx.lineWidth=1;
  for(let k=-4;k<=4;k++){const a=proj({x:k*lim/4,y:0,z:-lim}),b=proj({x:k*lim/4,y:0,z:lim}),d=proj({x:-lim,y:0,z:k*lim/4}),e=proj({x:lim,y:0,z:k*lim/4});line(ctx,a,b);line(ctx,d,e)}
  const faces=[];this.polys=[];
  for(const part of m.parts){if(part.kind==='back')continue;const verts=boxVerts(part,this.isOpen);const facesIdx=[{name:'back',idx:[0,1,2,3]},{name:'front',idx:[4,5,6,7]},{name:'left',idx:[0,3,7,4]},{name:'right',idx:[1,2,6,5]},{name:'bottom',idx:[0,1,5,4]},{name:'top',idx:[3,2,6,7]}];
   for(const f of facesIdx){const v=f.idx.map(i=>proj(verts[i])),depth=v.reduce((sum,pt)=>sum+pt.depth,0)/4;faces.push({part,points:v,depth,face:f.name})}
  }
  faces.sort((a,b)=>a.depth-b.depth);
  for(const f of faces){ctx.beginPath();f.points.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();let color=f.part.kind==='interior'?'#c4c5c5':f.part.kind==='countertop'?'#404956':f.part.kind==='front'||f.part.kind==='body'?(root.MueblesCore.FINISHES[p.finish]?.color||'#b99264'):'#bdbdbd';if(f.part.kind==='back')color='#d0d0d0';const sh={front:1.05,back:.55,left:.69,right:.82,top:1.17,bottom:.57}[f.face]||1;ctx.fillStyle=shade(color,sh);ctx.fill();ctx.strokeStyle='#11151fa8';ctx.lineWidth=.8;ctx.stroke();
   // Decorative raised-panel effect on hinged doors, visual only, no BOM.
   if(p.frontStyle==='marco'&&f.part.kind==='front'&&f.part.motion==='door'&&f.face==='front'){
    const center=f.points.reduce((acc,q)=>({x:acc.x+q.x/4,y:acc.y+q.y/4}),{x:0,y:0});
    const inner=f.points.map(q=>({x:q.x+(center.x-q.x)*.18,y:q.y+(center.y-q.y)*.18}));
    ctx.beginPath();inner.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();
    ctx.fillStyle=shade(color,.95);ctx.fill();ctx.strokeStyle=shade(color,.65);ctx.lineWidth=1.6;ctx.stroke();
   }
   if(f.part.moduleIndex===this.activeModule){ctx.strokeStyle='#d9b77a66';ctx.lineWidth=1.6;ctx.stroke()}if(f.part.id===this.selectedId){ctx.strokeStyle='#f8bc66';ctx.lineWidth=2.6;ctx.stroke();}this.polys.push(f);
  }
  ctx.textAlign='left';ctx.fillStyle='#8d9cac';ctx.font='11px system-ui';
  if(w>680)ctx.fillText('Arrastrar: girar · Rueda: zoom · Clic: seleccionar pieza',14,22);
 }
}
function boxVerts(p,open){const a=p.dx/2,b=p.dy/2,c=p.dz/2;let vs=[[-a,-b,-c],[a,-b,-c],[a,b,-c],[-a,b,-c],[-a,-b,c],[a,-b,c],[a,b,c],[-a,b,c]];return vs.map(([xx,yy,zz])=>{let x=p.x+xx,y=p.y+yy,z=p.z+zz;if(open&&p.motion==='drawer'){z+=160;}if(open&&p.motion==='door'){const pivot=p.x+(p.hingeSide==='left'?-a:a);const ang=p.hingeSide==='left'?-1.02:1.02;const dx=x-pivot,dz=z-p.z;x=pivot+dx*Math.cos(ang)+dz*Math.sin(ang);z=p.z-dx*Math.sin(ang)+dz*Math.cos(ang);}return{x,y,z}})}
function line(ctx,a,b){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
function hitPoly(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const xi=p[i].x,yi=p[i].y,xj=p[j].x,yj=p[j].y;const cross=yi>y!==yj>y&&x<(xj-xi)*(y-yi)/(yj-yi)+xi;if(cross)inside=!inside;}return inside}
function shade(hex,mul){const s=hex.replace('#','');const v=[0,2,4].map(i=>parseInt(s.slice(i,i+2),16));return `rgb(${v.map(c=>Math.max(0,Math.min(255,Math.round(c*mul)))).join(',')})`}
root.FurnitureViewer=FurnitureViewer;
})(window);
