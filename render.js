import {alive,at,reachable,inRange,key,terrain} from './engine.js?v=0.1.0';
export const COLORS={'.':'#889968','=':'#baad7c',f:'#5c7957','~':'#688f9a','#':'#79827b','+':'#9c8157',c:'#8b9581',v:'#a69b71'};
export function render(canvas,s,view){
 const tile=view.tile,ratio=Math.min(devicePixelRatio||1,2);canvas.width=s.map.w*tile*ratio;canvas.height=s.map.h*tile*ratio;canvas.style.width=`${s.map.w*tile}px`;canvas.style.height=`${s.map.h*tile}px`;
 const c=canvas.getContext('2d');c.scale(ratio*tile/32,ratio*tile/32);c.imageSmoothingEnabled=false;
 const selected=s.units.find(u=>u.id===view.selected),movement=selected?.team==='ally'&&!selected.acted?reachable(s,selected,selected.move+(view.action==='dash'?2:0)):[];
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
 for(const u of alive(s))drawUnit(c,u,selected?.id===u.id);
 if(selected?.alive&&view.dest&&(view.dest.x!==selected.x||view.dest.y!==selected.y)){c.globalAlpha=.55;drawUnit(c,{...selected,...view.dest},true);c.globalAlpha=1;}
 if(view.target){const t=s.units.find(u=>u.id===view.target);if(t){c.strokeStyle='#ffe5a6';c.lineWidth=2;c.strokeRect(t.x*32+1,t.y*32+1,30,30);}}
}
function castle(c,x,y){c.fillStyle='#52645f';c.fillRect(x+3,y+10,26,19);c.fillStyle='#c6c6a5';c.fillRect(x+6,y+8,20,17);for(const xx of [4,13,23]){c.fillRect(x+xx,y+3,5,11);c.fillStyle='#e0d5af';c.fillRect(x+xx,y+3,5,3);c.fillStyle='#c6c6a5';}c.fillStyle='#354b4b';c.fillRect(x+13,y+16,7,10);}
function drawUnit(c,u,selected){const x=u.x*32,y=u.y*32,blue=u.team==='ally',col=blue?'#395e91':'#994b50',light=blue?'#8ac1cf':'#dfa08a';c.fillStyle='#1c343b55';c.fillRect(x+4,y+26,25,4);
 // Two tiny soldiers and their captain form one HP unit, with no attrition state.
 for(const [dx,dy]of [[5,17],[24,19]]){c.fillStyle='#dac49d';c.fillRect(x+dx,y+dy-4,3,3);c.fillStyle=col;c.fillRect(x+dx-1,y+dy,5,7);c.fillStyle='#c4d1c4';c.fillRect(x+dx+4,y+dy-5,1,10);}
 c.fillStyle='#e6cfac';c.fillRect(x+13,y+8,7,6);c.fillStyle=col;c.fillRect(x+11,y+14,11,10);c.fillStyle=light;c.fillRect(x+12,y+14,3,9);c.fillStyle='#283f4d';c.fillRect(x+12,y+24,4,3);c.fillRect(x+19,y+24,4,3);
 if(u.type==='horse'){c.fillStyle='#655044';c.fillRect(x+8,y+20,19,6);c.fillRect(x+24,y+15,4,10);c.fillRect(x+10,y+25,2,4);c.fillRect(x+23,y+25,2,4);}
 if(u.type==='shield'){c.fillStyle='#ced0aa';c.fillRect(x+9,y+15,7,10);c.fillStyle=col;c.fillRect(x+11,y+17,3,6);}
 if(u.type==='bow'){c.strokeStyle='#dfc48d';c.lineWidth=1.5;c.beginPath();c.arc(x+24,y+17,6,-Math.PI/2,Math.PI/2);c.stroke();}
 if(['healer','medic','mage'].includes(u.type)){c.fillStyle='#eadfb1';c.fillRect(x+24,y+8,2,17);c.fillStyle=u.type==='mage'?'#bf8bd8':'#c1e9cb';c.fillRect(x+22,y+5,6,5);}
 if(u.type==='sword'){c.fillStyle='#d5e1d4';c.fillRect(x+24,y+7,2,14);c.fillStyle='#dfc48d';c.fillRect(x+21,y+20,6,2);}
 c.fillStyle='#1b3438';c.fillRect(x+8,y+28,22,3);c.fillStyle=u.hp/u.maxHp<.35?'#ed9a78':blue?'#a7d0a2':'#e5af86';c.fillRect(x+8,y+28,22*u.hp/u.maxHp,2);
 c.fillStyle='#152e3a';c.fillRect(x+1,y+1,10,9);c.fillStyle='#f2e5bf';c.font='bold 8px sans-serif';c.textAlign='center';c.fillText(u.glyph,x+6,y+8);
 if(u.acted&&blue){c.fillStyle='#17383966';c.fillRect(x+7,y+6,22,21);c.fillStyle='#fff4c4';c.font='8px sans-serif';c.fillText(u.command==='support'?'弓':u.command==='heal'?'＋':'✓',x+27,y+9);}
 if(selected){c.strokeStyle='#ffe5a6';c.lineWidth=2;c.strokeRect(x+1,y+1,30,30);}
}
export function mini(canvas,s,viewport,tile){const c=canvas.getContext('2d');c.clearRect(0,0,64,120);const sx=64/s.map.w,sy=120/s.map.h;for(let y=0;y<s.map.h;y++)for(let x=0;x<s.map.w;x++){c.fillStyle=COLORS[s.map.tiles[y][x]];c.fillRect(x*sx,y*sy,sx+.3,sy+.3);}for(const u of alive(s)){c.fillStyle=u.team==='ally'?'#ace4f3':'#b43947';c.fillRect(u.x*sx,u.y*sy,Math.max(sx,3),Math.max(sy,3));}c.strokeStyle='#fff0ad';c.lineWidth=1;c.strokeRect(viewport.scrollLeft/tile*sx,viewport.scrollTop/tile*sy,viewport.clientWidth/tile*sx,viewport.clientHeight/tile*sy);}
