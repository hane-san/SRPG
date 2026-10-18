import {tacticalRanges} from './ui-model.js?v=0.6.0';
import {alive,at,reachable,inRange,key,terrain,supportRange,movement as moveBudget,weatherAt} from './engine.js?v=0.6.0';
export const COLORS={'.':'#889968','=':'#baad7c',f:'#5c7957','~':'#688f9a','#':'#79827b','+':'#9c8157',c:'#8b9581',v:'#a69b71'};
const PALETTES=[
 {'.':'#919e7b','=':'#beb792',f:'#627d68','~':'#769aab'},
 {'.':'#aa9d6e','=':'#d0b384',f:'#687650','~':'#749397'},
 {'.':'#8b8d7e','=':'#aaa18b',f:'#667461','#':'#747d83','~':'#688594'},
 {'.':'#7e9f8c','=':'#c4b994',f:'#3f7468','~':'#568baf','+':'#b18a60'},
 {'.':'#6e8e7b','=':'#a99c7d',f:'#3e655c','#':'#667879','~':'#668c9d'},
 {'.':'#a5a077','=':'#cfb28e',f:'#687c61','~':'#8c92b0',c:'#a39588'}
];
export function render(canvas,s,view){
 const palette={...COLORS,...PALETTES[s.map.id]};
 const tile=view.tile,ratio=Math.min(devicePixelRatio||1,2);const width=Math.round(s.map.w*tile*ratio),height=Math.round(s.map.h*tile*ratio);if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;canvas.style.width=`${s.map.w*tile}px`;canvas.style.height=`${s.map.h*tile}px`;
 const c=canvas.getContext('2d');c.setTransform(ratio*tile/32,0,0,ratio*tile/32,0,0);c.imageSmoothingEnabled=false;
 const selected=s.units.find(u=>u.id===view.selected),movement=selected?.team==='ally'&&!selected.acted?reachable(s,selected):[];
 const {moves,attacks}=movement.length?tacticalRanges(s,selected,movement):{moves:new Set(),attacks:new Set()},danger=new Set();
 if(view.danger||selected?.team==='enemy')for(const e of selected?.team==='enemy'?[selected]:alive(s,'enemy')){
  const poss=reachable(s,e,e.ai==='hold'?0:moveBudget(s,e),{threat:true});
  for(const p of poss)for(let dy=-e.range[1];dy<=e.range[1];dy++)for(let dx=-e.range[1];dx<=e.range[1];dx++){const t={x:p.x+dx,y:p.y+dy};if(terrain(s,t)&&inRange({...e,...p},t))danger.add(key(t));}
 }
 for(let y=0;y<s.map.h;y++)for(let x=0;x<s.map.w;x++){
  const t=s.map.tiles[y][x],px=x*32,py=y*32,n=(x*73+y*127)%19;c.fillStyle=palette[t];c.fillRect(px,py,32,32);
  // Small deterministic stipple, never randomises between frames.
  if(t==='.'||t==='f'){c.fillStyle=t==='f'?'#526e4c':'#7b8f5c';for(let j=0;j<3;j++)c.fillRect(px+((n+j*11)%28),py+((n*3+j*7)%28),2,2);}
  if(t==='f'){for(const [dx,dy]of [[6,14],[21,8],[18,25]]){c.fillStyle='#3b5748';c.fillRect(px+dx,py+dy,2,5);c.fillStyle='#3c634e';c.fillRect(px+dx-4,py+dy-8,10,9);c.fillStyle='#6e8b57';c.fillRect(px+dx-2,py+dy-11,6,7);}}
  if(t==='~'){c.fillStyle='#91b2ad';c.fillRect(px+(n%9),py+10,12,1);c.fillRect(px+13,py+24,10,1);}
  if(t==='+'){c.fillStyle='#725f43';for(let j=0;j<32;j+=6)c.fillRect(px,py+j,32,1);c.fillStyle='#d2b37a';c.fillRect(px+2,py,2,32);c.fillRect(px+28,py,2,32);}
  if(t==='#'){c.fillStyle='#98a297';c.fillRect(px+3,py+5,22,20);c.fillStyle='#596b64';c.fillRect(px+7,py+16,20,12);}
  if(t==='c')castle(c,px,py);
  if(t==='v'){c.fillStyle='#e0c58f';c.fillRect(px+7,py+14,19,13);c.fillStyle='#8f614d';c.beginPath();c.moveTo(px+4,py+14);c.lineTo(px+16,py+4);c.lineTo(px+29,py+14);c.fill();c.fillStyle='#524e45';c.fillRect(px+15,py+21,4,6);}
  if(danger.has(`${x},${y}`)){c.fillStyle='#b4445548';c.fillRect(px,py,32,32);}
  if(moves.has(`${x},${y}`)){
   c.fillStyle='#306acbd4';c.fillRect(px,py,32,32);c.strokeStyle='#c1ddff48';c.lineWidth=.5;c.strokeRect(px+.5,py+.5,31,31);
   // Terrain stays identifiable under a consistent blue plane.
   c.strokeStyle='#bddcffb3';c.lineWidth=1;c.beginPath();
   if(t==='f'){c.moveTo(px+3,py+25);c.lineTo(px+7,py+17);c.lineTo(px+11,py+25);c.closePath();c.moveTo(px+7,py+25);c.lineTo(px+7,py+29);}
   else if(t==='='||t==='+'){c.moveTo(px+3,py+27);c.lineTo(px+11,py+27);c.moveTo(px+3,py+24);c.lineTo(px+11,py+24);}
   else if(t==='c'||t==='v'){c.rect(px+3,py+21,8,7);c.moveTo(px+3,py+21);c.lineTo(px+7,py+17);c.lineTo(px+11,py+21);}c.stroke();
  }else if(attacks.has(`${x},${y}`)){c.fillStyle='#5edcfa70';c.fillRect(px,py,32,32);}
  if(['bow','shooter'].includes(selected?.type)&&view.menu&&view.dest&&key(view.dest)===key(selected)&&inRange(selected,{x,y},supportRange(selected))){c.strokeStyle='#e5c5ffbb';c.lineWidth=1.5;c.setLineDash([3,3]);c.strokeRect(px+2,py+2,28,28);c.setLineDash([]);}
  if(selected?.skill==='heal'&&view.dest&&key(view.dest)===key(selected)&&Math.abs(selected.x-x)+Math.abs(selected.y-y)===1){c.strokeStyle='#b5ffe0';c.lineWidth=2;c.strokeRect(px+2,py+2,28,28);}
 }
 if(moves.size){outline(c,new Set([...moves,...attacks]),'#8eeaff',3,6);outline(c,moves,'#e6f3ff',3,0);outline(c,moves,'#3975e8',1,0);}
 for(const w of s.warnings)for(const p of w.cells){c.strokeStyle=w.kind==='cannon'?'#ffdfb0':'#e0b9f2';c.lineWidth=2;c.strokeRect(p.x*32+2,p.y*32+2,28,28);c.fillStyle=w.kind==='cannon'?'#b34545bb':'#79568ebb';c.fillRect(p.x*32+3,p.y*32+3,26,8);c.fillStyle='#fff2cd';c.font='bold 7px sans-serif';c.textAlign='center';c.fillText(w.kind==='cannon'?`P4 −6`:`増援T${w.turn}`,p.x*32+16,p.y*32+10);}
 for(const [p,color,label]of [[s.map.goal,'#c66557','北城'],[s.map.base,'#6dc6db','本陣'],[s.map.south,s.southTaken?'#75b9c0':'#c66557','南城']])if(p){c.fillStyle=color;c.fillRect(p.x*32+27,p.y*32+2,3,19);c.fillRect(p.x*32+19,p.y*32+2,10,7);c.fillStyle='#fff8d4';c.font='7px sans-serif';c.textAlign='center';c.fillText(label,p.x*32+16,p.y*32+31);}
 const weather=weatherAt(s);
 if(weather!=='clear'){
  c.fillStyle=weather==='heavy'?'#20395128':'#6f9fb518';c.fillRect(0,0,s.map.w*32,s.map.h*32);c.strokeStyle=weather==='heavy'?'#b7d5e66b':'#cee1eb45';c.lineWidth=1;c.beginPath();
  for(let y=0;y<s.map.h*32;y+=weather==='heavy'?15:31)for(let x=0;x<s.map.w*32;x+=29){const dx=(y*7)%23;c.moveTo(x+dx,y);c.lineTo(x+dx-3,y+8);}c.stroke();
 }
 if(view.route?.length>1)drawRoute(c,view.route);
 for(const u of alive(s)){
  const motion=view.motion?.id===u.id?view.motion:null;
  drawUnit(c,motion?{...u,x:motion.x,y:motion.y-(motion.bob||0),acted:false}:u);
 }
 if(view.ghost){c.globalAlpha=view.ghost.alpha;drawUnit(c,view.ghost.unit);c.globalAlpha=1;}
 if(selected?.alive&&view.dest&&(view.dest.x!==selected.x||view.dest.y!==selected.y)){c.globalAlpha=.55;drawUnit(c,{...selected,...view.dest});c.globalAlpha=1;}
 if(view.dest&&selected&&view.selected)cursor(c,view.dest,'#fff1ad');
 if(view.cursor&&(!selected||(view.keyboard&&key(view.cursor)!==key(view.dest||selected))))cursor(c,view.cursor,'#fff1ad');
 if(view.active&&!view.motion){const actor=s.units.find(u=>u.id===view.active);if(actor?.alive)cursor(c,actor,'#f4cea1');}
 if(view.target){const t=s.units.find(u=>u.id===view.target);if(t){c.strokeStyle='#ffe5a6';c.lineWidth=2;c.strokeRect(t.x*32+1,t.y*32+1,30,30);}}
 if(view.target&&view.dest){const t=s.units.find(u=>u.id===view.target);if(t){c.save();c.setLineDash([3,3]);c.strokeStyle='#ffe1a9';c.lineWidth=2;c.beginPath();c.moveTo(view.dest.x*32+16,view.dest.y*32+16);c.lineTo(t.x*32+16,t.y*32+16);c.stroke();c.restore();}}
 if(view.projectile){
  const {from,to,progress:p,heal,type}=view.projectile,dx=(to.x-from.x)*32,dy=(to.y-from.y)*32;
  const x=from.x*32+16+dx*p,y=from.y*32+14+dy*p-(type==='bow'?Math.sin(p*Math.PI)*12:0);
  c.save();c.translate(x,y);
  if(type==='bow'||type==='shooter'){
   c.rotate(Math.atan2(dy-Math.cos(p*Math.PI)*12*Math.PI,dx));c.strokeStyle='#25343a';c.lineWidth=5;c.beginPath();c.moveTo(-10,0);c.lineTo(8,0);c.stroke();
   c.strokeStyle='#ffefbd';c.lineWidth=2;c.stroke();c.fillStyle='#fff8e1';c.beginPath();c.moveTo(11,0);c.lineTo(3,-4);c.lineTo(3,4);c.closePath();c.fill();
   c.strokeStyle='#edd3a2';c.beginPath();c.moveTo(-8,0);c.lineTo(-12,-4);c.moveTo(-8,0);c.lineTo(-12,4);c.stroke();
  }else{c.fillStyle=heal?'#b8ffe0':type==='mage'?'#e4b3ff':'#ffe2a2';c.shadowColor=c.fillStyle;c.shadowBlur=6;c.beginPath();c.arc(0,0,heal?4:5,0,Math.PI*2);c.fill();}
  c.restore();
 }
 if(view.flash){const t=s.units.find(u=>u.id===view.flash.id);if(t){c.fillStyle=view.flash.heal?`rgba(132,255,194,${view.flash.amount*.45})`:`rgba(255,247,220,${view.flash.amount*.7})`;c.fillRect(t.x*32+3,t.y*32+3,26,27);}}
 if(view.effect){const e=view.effect;c.save();c.globalAlpha=1-e.progress*.4;c.font='bold 12px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#132b32';c.fillStyle=e.heal?'#b8ffd0':'#fff2c2';const x=e.x*32+16,y=e.y*32+5-e.progress*13;c.strokeText(e.text,x,y);c.fillText(e.text,x,y);c.restore();}
}
function outline(c,cells,color,width,glow){
 c.save();c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.shadowColor=color;c.shadowBlur=glow;c.beginPath();
 for(const k of cells){const [x,y]=k.split(',').map(Number),px=x*32,py=y*32;
  if(!cells.has(`${x},${y-1}`)){c.moveTo(px,py);c.lineTo(px+32,py);}
  if(!cells.has(`${x+1},${y}`)){c.moveTo(px+32,py);c.lineTo(px+32,py+32);}
  if(!cells.has(`${x},${y+1}`)){c.moveTo(px+32,py+32);c.lineTo(px,py+32);}
  if(!cells.has(`${x-1},${y}`)){c.moveTo(px,py+32);c.lineTo(px,py);}
 }c.stroke();c.restore();
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
 // Equipment and body shape both encode class; palette only encodes allegiance.
 const metal=spent?'#c0c2b1':'#e0e8d8',wood=spent?'#99988a':'#a57648';
 if(u.type==='shooter'){
  rect(5,20,23,6,ink);rect(7,21,19,3,wood);rect(7,25,5,5,ink);rect(22,25,5,5,ink);rect(8,26,3,3,metal);rect(23,26,3,3,metal);
  rect(13,9,9,12,col);rect(14,4,8,8,ink);rect(15,6,6,5,skin);rect(14,3,9,4,metal);
  rect(3,14,25,3,wood);rect(16,8,3,18,metal);rect(3,11,3,10,ink);rect(26,11,3,10,ink);rect(5,12,2,7,metal);rect(24,12,2,7,metal);
 }else if(u.type==='horse'){
  rect(3,18,24,9,ink);rect(5,19,20,6,wood);rect(23,11,6,12,ink);rect(24,12,5,8,'#d4b17e');rect(26,10,2,4,ink);
  for(const dx of [6,12,22,26])rect(dx,25,2,4,ink);
  rect(11,4,8,7,ink);rect(12,6,6,5,skin);rect(11,3,8,3,metal);rect(10,11,11,9,col);rect(12,12,3,6,light);rect(20,2,2,19,metal);rect(21,2,6,3,col);
 }else if(u.type==='mage'){
  rect(9,12,15,15,ink);rect(11,13,11,13,col);rect(15,13,3,13,spent?'#b4b8a6':'#c2a2d5');
  c.fillStyle=ink;c.beginPath();c.moveTo(x+7,y+10);c.lineTo(x+16,y+1);c.lineTo(x+25,y+10);c.fill();rect(11,8,10,6,skin);rect(8,9,17,3,col);
  rect(21,16,9,10,ink);rect(22,17,7,8,spent?'#b4b8a6':'#d6a4ee');rect(25,17,1,8,'#fff0bb');
 }else if(u.type==='healer'){
  rect(11,3,10,11,ink);rect(12,4,8,9,metal);rect(14,7,5,6,skin);rect(10,14,13,13,metal);rect(14,14,5,11,col);
  rect(25,7,2,20,wood);rect(23,3,6,7,'#f4e6aa');rect(25,1,2,11,'#fff5ce');
 }else if(u.type==='medic'){
  rect(11,4,10,10,ink);rect(12,5,8,8,skin);rect(10,4,12,3,metal);rect(10,14,14,11,col);rect(11,15,3,10,light);
  rect(7,21,19,6,metal);rect(21,15,9,11,ink);rect(22,16,7,9,metal);rect(25,17,2,7,col);rect(23,19,6,2,col);
 }else{
  rect(11,4,10,10,ink);rect(12,6,8,7,skin);rect(11,3,10,4,col);rect(13,3,5,2,light);
  rect(10,13,13,11,ink);rect(12,13,9,10,col);rect(12,14,3,8,light);rect(11,24,4,4,ink);rect(19,24,4,4,ink);
  if(u.type==='shield'){
   rect(10,3,13,4,metal);rect(5,13,12,14,ink);rect(6,14,10,11,metal);rect(9,15,4,10,col);rect(25,5,2,22,wood);rect(24,2,4,6,metal);
  }else if(u.type==='bow'){
   rect(8,11,5,15,wood);rect(8,8,2,7,metal);
   c.strokeStyle=ink;c.lineWidth=5;c.beginPath();c.moveTo(x+24,y+6);c.quadraticCurveTo(x+35,y+16,x+24,y+27);c.stroke();c.strokeStyle='#f0d19a';c.lineWidth=2;c.stroke();
   c.strokeStyle='#f7edc8';c.lineWidth=1;c.beginPath();c.moveTo(x+24,y+6);c.lineTo(x+24,y+27);c.stroke();rect(20,16,9,2,skin);
  }else{rect(25,3,3,18,ink);rect(25,4,2,16,metal);rect(22,20,8,2,'#edc577');rect(25,22,2,5,wood);rect(10,3,4,7,metal);}
 }
 // Persistent high-contrast class badge remains readable for spent units.
 rect(0,0,10,11,'#172f35e6');c.font='bold 8px sans-serif';c.textAlign='center';c.fillStyle='#fff3cf';c.fillText(u.glyph,x+5,y+8);
 rect(6,29,23,3,ink);rect(7,29,21*u.hp/u.maxHp,2,u.hp/u.maxHp<.35?'#f1b16f':blue?'#b3e59d':'#ffad91');
 // The palette communicates allegiance; a dot still distinguishes spent allies.
 if(spent){rect(26,3,4,4,'#f6e6b1');rect(27,4,2,2,ink);}
}
function cursor(c,p,color){const x=p.x*32,y=p.y*32;c.fillStyle='#273847';for(const [dx,dy]of [[0,0],[23,0],[0,23],[23,23]])c.fillRect(x+dx,y+dy,9,9);c.fillStyle=color;for(const [dx,dy,sx,sy]of [[1,1,1,1],[30,1,-1,1],[1,30,1,-1],[30,30,-1,-1]]){c.fillRect(x+dx+(sx<0?-7:0),y+dy,8,2);c.fillRect(x+dx,y+dy+(sy<0?-7:0),2,8);}}
export function mini(canvas,s,viewport,tile){const c=canvas.getContext('2d');c.clearRect(0,0,64,120);const sx=64/s.map.w,sy=120/s.map.h;for(let y=0;y<s.map.h;y++)for(let x=0;x<s.map.w;x++){c.fillStyle=PALETTES[s.map.id]?.[s.map.tiles[y][x]]||COLORS[s.map.tiles[y][x]];c.fillRect(x*sx,y*sy,sx+.3,sy+.3);}for(const u of alive(s)){c.fillStyle=u.team==='ally'?'#ace4f3':'#b43947';c.fillRect(u.x*sx,u.y*sy,Math.max(sx,3),Math.max(sy,3));}c.strokeStyle='#fff0ad';c.lineWidth=1;c.strokeRect(viewport.scrollLeft/tile*sx,viewport.scrollTop/tile*sy,viewport.clientWidth/tile*sx,viewport.clientHeight/tile*sy);}

