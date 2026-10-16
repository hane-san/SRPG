import {alive,at,reachable,inRange,key,terrain} from './engine.js?v=0.2.0';
export const COLORS={'.':'#889968','=':'#baad7c',f:'#5c7957','~':'#688f9a','#':'#79827b','+':'#9c8157',c:'#8b9581',v:'#a69b71'};
export function render(canvas,s,view){
 const tile=view.tile,ratio=Math.min(devicePixelRatio||1,2);const width=Math.round(s.map.w*tile*ratio),height=Math.round(s.map.h*tile*ratio);if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;canvas.style.width=`${s.map.w*tile}px`;canvas.style.height=`${s.map.h*tile}px`;
 const c=canvas.getContext('2d');c.setTransform(ratio*tile/32,0,0,ratio*tile/32,0,0);c.imageSmoothingEnabled=false;
 const selected=s.units.find(u=>u.id===view.selected),movement=selected?.team==='ally'&&!selected.acted?reachable(s,selected,selected.move):[];
 const moves=new Set(movement.map(key)),danger=new Set();
 if(view.danger||selected?.team==='enemy')for(const e of selected?.team==='enemy'?[selected]:alive(s,'enemy')){
  const poss=reachable(s,e,e.ai==='hold'?0:e.move,{threat:true});
  for(const p of poss)for(let dy=-e.range[1];dy<=e.range[1];dy++)for(let dx=-e.range[1];dx<=e.range[1];dx++){const t={x:p.x+dx,y:p.y+dy};if(terrain(s,t)&&inRange({...e,...p},t))danger.add(key(t));}
 }
 for(let y=0;y<s.map.h;y++)for(let x=0;x<s.map.w;x++){
  const t=s.map.tiles[y][x],px=x*32,py=y*32,n=(x*73+y*127)%19;c.fillStyle=COLORS[t];c.fillRect(px,py,32,32);
  // Small deterministic stipple, never randomises between frames.
  if(t==='.'||t==='f'){c.fillStyle=t==='f'?'#526e4c':'#7b8f5c';for(let j=0;j<3;j++)c.fillRect(px+((n+j*11)%28),py+((n*3+j*7)%28),2,2);}
  if(t==='f'){for(const [dx,dy]of [[6,14],[21,8],[18,25]]){c.fillStyle='#3b5748';c.fillRect(px+dx,py+dy,2,5);c.fillStyle='#3c634e';c.fillRect(px+dx-4,py+dy-8,10,9);c.fillStyle='#6e8b57';c.fillRect(px+dx-2,py+dy-11,6,7);}}
  if(t==='~'){c.fillStyle='#91b2ad';c.fillRect(px+(n%9),py+10,12,1);c.fillRect(px+13,py+24,10,1);}
  if(t==='+'){c.fillStyle='#725f43';for(let j=0;j<32;j+=6)c.fillRect(px,py+j,32,1);c.fillStyle='#d2b37a';c.fillRect(px+2,py,2,32);c.fillRect(px+28,py,2,32);}
  if(t==='#'){c.fillStyle='#98a297';c.fillRect(px+3,py+5,22,20);c.fillStyle='#596b64';c.fillRect(px+7,py+16,20,12);}
  if(t==='c')castle(c,px,py);
  if(t==='v'){c.fillStyle='#e0c58f';c.fillRect(px+7,py+14,19,13);c.fillStyle='#8f614d';c.beginPath();c.moveTo(px+4,py+14);c.lineTo(px+16,py+4);c.lineTo(px+29,py+14);c.fill();c.fillStyle='#524e45';c.fillRect(px+15,py+21,4,6);}
  if(danger.has(`${x},${y}`)){c.fillStyle='#b4445548';c.fillRect(px,py,32,32);}
  if(moves.has(`${x},${y}`)){c.fillStyle='#5fbece55';c.fillRect(px+1,py+1,30,30);c.strokeStyle='#b4e4dd88';c.lineWidth=.5;c.strokeRect(px+.5,py+.5,31,31);}
  if(selected&&view.dest&&inRange({...selected,...view.dest},{x,y})){c.fillStyle='#e7a14a33';c.fillRect(px+1,py+1,30,30);}
 }
 for(const w of s.warnings)for(const p of w.cells){c.strokeStyle=w.kind==='cannon'?'#ffdfb0':'#e0b9f2';c.lineWidth=2;c.strokeRect(p.x*32+2,p.y*32+2,28,28);c.fillStyle=w.kind==='cannon'?'#b34545bb':'#79568ebb';c.fillRect(p.x*32+3,p.y*32+3,26,8);c.fillStyle='#fff2cd';c.font='bold 7px sans-serif';c.textAlign='center';c.fillText(w.kind==='cannon'?`P4 −6`:`増援T${w.turn}`,p.x*32+16,p.y*32+10);}
 for(const [p,color,label]of [[s.map.goal,'#c66557','北城'],[s.map.base,'#6dc6db','本陣'],[s.map.south,s.southTaken?'#75b9c0':'#c66557','南城']])if(p){c.fillStyle=color;c.fillRect(p.x*32+27,p.y*32+2,3,19);c.fillRect(p.x*32+19,p.y*32+2,10,7);c.fillStyle='#fff8d4';c.font='7px sans-serif';c.textAlign='center';c.fillText(label,p.x*32+16,p.y*32+31);}
 if(view.route?.length>1)drawRoute(c,view.route);
 for(const u of alive(s))drawUnit(c,u);
 if(selected?.alive&&view.dest&&(view.dest.x!==selected.x||view.dest.y!==selected.y)){c.globalAlpha=.55;drawUnit(c,{...selected,...view.dest});c.globalAlpha=1;}
 if(view.dest&&selected&&view.selected)cursor(c,view.dest,'#fff1ad');
 if(view.target){const t=s.units.find(u=>u.id===view.target);if(t){c.strokeStyle='#ffe5a6';c.lineWidth=2;c.strokeRect(t.x*32+1,t.y*32+1,30,30);}}
}
function drawRoute(c,path){
 c.save();c.globalAlpha=.58;c.lineJoin='round';c.lineCap='round';
 c.beginPath();for(const [i,p]of path.entries()){const x=p.x*32+16,y=p.y*32+16;if(i)c.lineTo(x,y);else c.moveTo(x,y);}
 c.strokeStyle='#254b59';c.lineWidth=7;c.stroke();c.strokeStyle='#fff1ba';c.lineWidth=4;c.stroke();
 // Small chevrons keep the direction visible beneath the translucent destination unit.
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y,x=(a.x+b.x)*16+16,y=(a.y+b.y)*16+16;
  c.beginPath();c.moveTo(x-dx*2-dy*4,y-dy*2+dx*4);c.lineTo(x+dx*3,y+dy*3);c.lineTo(x-dx*2+dy*4,y-dy*2-dx*4);c.strokeStyle='#fff8d8';c.lineWidth=2;c.stroke();
 }
 const end=path.at(-1),prev=path.at(-2),dx=end.x-prev.x,dy=end.y-prev.y,x=end.x*32+16,y=end.y*32+16;
 c.fillStyle='#fff1ba';c.beginPath();c.moveTo(x+dx*8,y+dy*8);c.lineTo(x-dx*3-dy*6,y-dy*3+dx*6);c.lineTo(x-dx*3+dy*6,y-dy*3-dx*6);c.closePath();c.fill();c.restore();
}
function castle(c,x,y){c.fillStyle='#52645f';c.fillRect(x+3,y+10,26,19);c.fillStyle='#c6c6a5';c.fillRect(x+6,y+8,20,17);for(const xx of [4,13,23]){c.fillRect(x+xx,y+3,5,11);c.fillStyle='#e0d5af';c.fillRect(x+xx,y+3,5,3);c.fillStyle='#c6c6a5';}c.fillStyle='#354b4b';c.fillRect(x+13,y+16,7,10);}
// One original, equipment-led silhouette per unit. No external sprite assets.
function drawUnit(c,u){const x=u.x*32,y=u.y*32,blue=u.team==='ally',spent=blue&&u.acted;
 const ink=spent?'#46504e':'#21323d',col=spent?'#7c8581':blue?'#376ec0':'#bb4352',light=spent?'#b4b8a6':blue?'#9ed6f1':'#ffb09b',skin=spent?'#b6b9a2':'#efd6a4';
 const rect=(dx,dy,w,h,color)=>{c.fillStyle=color;c.fillRect(x+dx,y+dy,w,h);};
 rect(7,26,21,3,'#19363866');
 // Two-pixel edges remain crisp at full-width mobile scale.
 rect(12,5,9,9,ink);rect(13,7,7,6,skin);rect(12,4,9,4,col);rect(14,4,5,2,light);
 rect(10,13,13,11,ink);rect(12,13,9,10,col);rect(12,14,3,8,light);
 rect(11,24,5,3,ink);rect(19,24,5,3,ink);
 if(u.type==='horse'){
  rect(5,20,22,6,ink);rect(7,20,18,4,spent?'#a3a393':'#c3a17c');rect(23,15,5,9,ink);rect(24,16,4,5,spent?'#b5b59f':'#e0c399');rect(8,25,3,4,ink);rect(23,25,3,4,ink);rect(25,14,2,3,col);
 }else if(u.type==='shield'){
  rect(6,14,9,11,ink);rect(7,15,7,8,'#d9d9b7');rect(9,16,3,7,col);rect(25,7,2,18,ink);rect(24,5,3,5,'#e9e4c9');
 }else if(u.type==='bow'){
  rect(25,8,2,17,'#e8cb8d');rect(27,11,2,11,'#cba775');rect(24,10,1,13,ink);rect(21,15,6,2,skin);
 }else if(u.type==='sword'){
  rect(25,6,2,15,'#edf1de');rect(24,7,1,13,'#9db7bd');rect(22,20,7,2,'#e2bc73');rect(25,22,2,4,ink);
 }else{
  // Mage: violet book; prayer: long robe + staff; medic: pale bag + cross.
  rect(10,22,14,4,col);
  if(u.type==='mage'){rect(20,15,8,9,ink);rect(21,16,6,7,spent?'#a2a697':'#cf9de1');rect(23,16,1,7,'#f1dfbf');rect(11,5,11,3,col);}
  else if(u.type==='healer'){rect(25,7,2,19,'#ead3a0');rect(23,5,6,5,light);rect(25,4,2,7,'#f4f0ca');rect(13,13,6,4,'#f1e9cf');}
  else{rect(20,18,9,8,'#eae5c9');rect(23,19,2,6,col);rect(21,21,6,2,col);}
 }
 rect(6,29,23,3,ink);rect(7,29,21*u.hp/u.maxHp,2,u.hp/u.maxHp<.35?'#f1b16f':blue?'#b3e59d':'#ffad91');
 // The palette communicates allegiance; a dot still distinguishes spent allies.
 if(spent){rect(26,3,4,4,'#f6e6b1');rect(27,4,2,2,ink);}
}
function cursor(c,p,color){const x=p.x*32,y=p.y*32;c.fillStyle='#273847';for(const [dx,dy]of [[0,0],[23,0],[0,23],[23,23]])c.fillRect(x+dx,y+dy,9,9);c.fillStyle=color;for(const [dx,dy,sx,sy]of [[1,1,1,1],[30,1,-1,1],[1,30,1,-1],[30,30,-1,-1]]){c.fillRect(x+dx+(sx<0?-7:0),y+dy,8,2);c.fillRect(x+dx,y+dy+(sy<0?-7:0),2,8);}}
export function mini(canvas,s,viewport,tile){const c=canvas.getContext('2d');c.clearRect(0,0,64,120);const sx=64/s.map.w,sy=120/s.map.h;for(let y=0;y<s.map.h;y++)for(let x=0;x<s.map.w;x++){c.fillStyle=COLORS[s.map.tiles[y][x]];c.fillRect(x*sx,y*sy,sx+.3,sy+.3);}for(const u of alive(s)){c.fillStyle=u.team==='ally'?'#ace4f3':'#b43947';c.fillRect(u.x*sx,u.y*sy,Math.max(sx,3),Math.max(sy,3));}c.strokeStyle='#fff0ad';c.lineWidth=1;c.strokeRect(viewport.scrollLeft/tile*sx,viewport.scrollTop/tile*sy,viewport.clientWidth/tile*sx,viewport.clientHeight/tile*sy);}
