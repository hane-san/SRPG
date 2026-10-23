import {weaponFrame,bossFracture,isBossUnit} from './weapon-fx.js?v=0.8.0-weapon48';
import {impactFrame,landingFrame} from './combat-fx.js?v=0.8.0-fx39';
import {tacticalRanges,attackTargets} from './ui-model.js?v=0.8.0-position22-p3-26-map38-m02-war43-m02gate57-m04bridge58-m03guard59-m05rain61';
import {RULES} from './config.js?v=0.8.0-p3-26';
import {alive,reachable,inRange,key,terrain,supportRange,movement as moveBudget,weatherAt} from './engine.js?v=0.8.0-p3-26-sortie29-map38-m02-war43-m02gate57-m04bridge58-m03guard59-m05rain61';
export const COLORS={'.':'#889968','=':'#baad7c',f:'#5c7957','~':'#688f9a','#':'#79827b','+':'#9c8157',c:'#8b9581',v:'#a69b71'};
const PALETTES=[
 {'.':'#919e7b','=':'#beb792',f:'#627d68','~':'#769aab'},
 {'.':'#aa9d6e','=':'#d0b384',f:'#687650','~':'#749397'},
 {'.':'#8b8d7e','=':'#aaa18b',f:'#667461','#':'#747d83','~':'#688594'},
 {'.':'#7e9f8c','=':'#c4b994',f:'#3f7468','~':'#568baf','+':'#b18a60'},
 {'.':'#6e8e7b','=':'#a99c7d',f:'#3e655c','#':'#667879','~':'#668c9d'},
 {'.':'#a5a077','=':'#cfb28e',f:'#687c61','~':'#8c92b0',c:'#a39588'}
];
// Bounded per-canvas surfaces: terrain and tactical background, in map pixels.
// Keys include mutable map/unit data so future in-place editing cannot leave stale ranges.
const caches=new WeakMap();
export function renderStats(canvas){const c=caches.get(canvas);return c?{terrainBuilds:c.terrainBuilds,rangeBuilds:c.rangeBuilds,boardBuilds:c.boardBuilds}:null;}
function surface(s){const c=document.createElement('canvas');c.width=s.map.w*32;c.height=s.map.h*32;return c;}
function layers(canvas,s,view){
 let cache=caches.get(canvas);if(!cache){cache={terrainBuilds:0,rangeBuilds:0,boardBuilds:0};caches.set(canvas,cache);}
 const mapKey=JSON.stringify([s.map.id,s.map.w,s.map.h,s.map.tiles]),weather=weatherAt(s);
 if(cache.mapKey!==mapKey){cache.terrain=surface(s);paintTerrain(cache.terrain.getContext('2d'),s);cache.mapKey=mapKey;cache.terrainBuilds++;}
 const rangeKey=JSON.stringify([mapKey,weather,view.selected,!!view.danger,s.units.map(u=>[u.id,u.team,u.alive,u.acted,u.x,u.y,u.move,u.range,u.ai,u.type,u.skill,u.deployed])]);
 const selected=view.sortie?view.sortieUnit:s.units.find(u=>u.id===view.selected);
 if(cache.rangeKey!==rangeKey){
  const movement=selected?.team==='ally'&&!selected.acted?reachable(s,selected):[];
  Object.assign(cache,movement.length?tacticalRanges(s,selected,movement):{moves:new Set(),attacks:new Set()});cache.danger=new Set();
  if(view.danger||selected?.team==='enemy')for(const e of selected?.team==='enemy'?[selected]:alive(s,'enemy')){
   for(const p of reachable(s,e,e.ai==='hold'?0:moveBudget(s,e),{threat:true}))
    for(let y=Math.max(0,p.y-e.range[1]);y<=Math.min(s.map.h-1,p.y+e.range[1]);y++)
     for(let x=Math.max(0,p.x-e.range[1]);x<=Math.min(s.map.w-1,p.x+e.range[1]);x++){
     const t={x,y};if(terrain(s,t)&&inRange({...e,...p},t))cache.danger.add(key(t));
    }
  }
  cache.rangeKey=rangeKey;cache.rangeBuilds++;
 }
 const boardKey=JSON.stringify([rangeKey,view.dest,!!view.menu,!!view.target,s.warnings,s.map.goal,s.map.base,s.map.camp,s.map.south,s.southTaken]);
 if(cache.boardKey!==boardKey){
  if(!cache.board||cache.board.width!==cache.terrain.width||cache.board.height!==cache.terrain.height)cache.board=surface(s);
  const c=cache.board.getContext('2d');c.clearRect(0,0,cache.board.width,cache.board.height);c.drawImage(cache.terrain,0,0);
  paintTactics(c,s,view,selected,cache);cache.boardKey=boardKey;cache.boardBuilds++;
 }
 return cache;
}
function paintTerrain(c,s){
 const palette={...COLORS,...PALETTES[s.map.id]};
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
 }
}
function paintTactics(c,s,view,selected,{moves,attacks,danger}){
 const showAttackHalo=!!view.target;
 for(let y=0;y<s.map.h;y++)for(let x=0;x<s.map.w;x++){
  const t=s.map.tiles[y][x],px=x*32,py=y*32;
  if(danger.has(`${x},${y}`)){c.fillStyle='#b4445548';c.fillRect(px,py,32,32);}
  if(moves.has(`${x},${y}`)){
   c.fillStyle='#306acbd4';c.fillRect(px,py,32,32);c.strokeStyle='#c1ddff48';c.lineWidth=.5;c.strokeRect(px+.5,py+.5,31,31);
   // Terrain stays identifiable under a consistent blue plane.
   c.strokeStyle='#bddcffb3';c.lineWidth=1;c.beginPath();
   if(t==='f'){c.moveTo(px+3,py+25);c.lineTo(px+7,py+17);c.lineTo(px+11,py+25);c.closePath();c.moveTo(px+7,py+25);c.lineTo(px+7,py+29);}
   else if(t==='='||t==='+'){c.moveTo(px+3,py+27);c.lineTo(px+11,py+27);c.moveTo(px+3,py+24);c.lineTo(px+11,py+24);}
   else if(t==='c'||t==='v'){c.rect(px+3,py+21,8,7);c.moveTo(px+3,py+21);c.lineTo(px+7,py+17);c.lineTo(px+11,py+21);}c.stroke();
  }else if(showAttackHalo&&attacks.has(`${x},${y}`)){c.fillStyle='#5edcfa70';c.fillRect(px,py,32,32);}
  if(selected?.type==='shooter'&&view.menu&&view.dest&&key(view.dest)===key(selected)&&inRange(selected,{x,y},supportRange(selected))){c.strokeStyle='#e5c5ffbb';c.lineWidth=1.5;c.setLineDash([3,3]);c.strokeRect(px+2,py+2,28,28);c.setLineDash([]);}
  if(selected?.skill==='heal'&&view.dest&&key(view.dest)===key(selected)&&Math.abs(selected.x-x)+Math.abs(selected.y-y)===1){c.strokeStyle='#b5ffe0';c.lineWidth=2;c.strokeRect(px+2,py+2,28,28);}
 }
 if(moves.size){outline(c,showAttackHalo?new Set([...moves,...attacks]):moves,'#8eeaff',3,6);outline(c,moves,'#e6f3ff',3,0);outline(c,moves,'#3975e8',1,0);}
 // Gold corners identify ordinary P1 targets from this exact destination.
 // They do not extend the blue movement field or promise a future P3 attack.
 if(selected?.team==='ally'&&!selected.acted&&view.dest){
  c.strokeStyle='#ffe2a1';c.lineWidth=2;c.beginPath();
  for(const t of attackTargets(s,selected,view.dest)){
   const x=t.x*32,y=t.y*32;
   c.moveTo(x+1,y+9);c.lineTo(x+1,y+1);c.lineTo(x+9,y+1);
   c.moveTo(x+23,y+1);c.lineTo(x+31,y+1);c.lineTo(x+31,y+9);
  }c.stroke();
 }
 for(const w of s.warnings)for(const p of w.cells){c.strokeStyle=w.kind==='cannon'?'#ffdfb0':'#e0b9f2';c.lineWidth=2;c.strokeRect(p.x*32+2,p.y*32+2,28,28);c.fillStyle=w.kind==='cannon'?'#b34545bb':'#79568ebb';c.fillRect(p.x*32+3,p.y*32+3,26,8);c.fillStyle='#fff2cd';c.font='bold 7px sans-serif';c.textAlign='center';c.fillText(w.kind==='cannon'?`P4 −${RULES.barrageDamage}`:`増援T${w.turn}`,p.x*32+16,p.y*32+10);}
 if(s.map.camp&&s.map.tiles[s.map.camp.y]?.[s.map.camp.x]!=='c')castle(c,s.map.camp.x*32,s.map.camp.y*32);
  for(const [p,color,label]of [[s.map.goal,'#c66557','北城'],[s.map.camp,'#6dc6db','出撃'],[s.map.south,s.southTaken?'#75b9c0':'#c66557','南城']])if(p){c.fillStyle=color;c.fillRect(p.x*32+27,p.y*32+2,3,19);c.fillRect(p.x*32+19,p.y*32+2,10,7);c.fillStyle='#fff8d4';c.font='7px sans-serif';c.textAlign='center';c.fillText(label,p.x*32+16,p.y*32+31);}
 const weather=weatherAt(s);
 if(weather!=='clear'){
  c.fillStyle=weather==='heavy'?'#20395128':'#6f9fb518';c.fillRect(0,0,s.map.w*32,s.map.h*32);c.strokeStyle=weather==='heavy'?'#b7d5e66b':'#cee1eb45';c.lineWidth=1;c.beginPath();
  for(let y=0;y<s.map.h*32;y+=weather==='heavy'?15:31)for(let x=0;x<s.map.w*32;x+=29){const dx=(y*7)%23;c.moveTo(x+dx,y);c.lineTo(x+dx-3,y+8);}c.stroke();
 }
}
export function render(canvas,s,view){
 const tile=view.tile,ratio=Math.min(devicePixelRatio||1,2),width=Math.round(s.map.w*tile*ratio),height=Math.round(s.map.h*tile*ratio);
 if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
 canvas.style.width=`${s.map.w*tile}px`;canvas.style.height=`${s.map.h*tile}px`;
 const c=canvas.getContext('2d');c.setTransform(ratio*tile/32,0,0,ratio*tile/32,0,0);c.imageSmoothingEnabled=false;
 c.drawImage(layers(canvas,s,view).board,0,0);
 const selected=s.units.find(u=>u.id===view.selected);
 if(view.route?.length>1)drawRoute(c,view.route);
 for(const u of alive(s)){
  if(view.sortieEntrance?.id===u.id)continue;
  const motion=view.motion?.id===u.id?view.motion:null;
  const jewel=view.jewel?.id===u.id?view.jewel:null;
  const character=motion?{...u,x:motion.x,y:motion.y-(motion.bob||0),acted:false}:u;
  if(jewel)character.hp=jewel.hp;
  const hit=view.impact?.id===u.id&&view.impact.kind!=='heal'?view.impact:null;
  if(hit){const recoil=impactFrame(hit.style,hit.progress).recoil;c.save();c.translate(hit.dx*recoil,hit.dy*recoil);drawUnit(c,character);c.restore();}
  else drawUnit(c,character);
 }
 if(view.sortieEntrance){
  const intro=view.sortieEntrance,unit=s.units.find(u=>u.id===intro.id),p=intro.progress;
  if(unit){c.save();c.globalAlpha=Math.max(.1,p);drawUnit(c,{...unit,x:intro.x,y:intro.y-.18*(1-p),acted:false});c.restore();}
 }
 if(view.sortieQuote){
  const {x,y,line}=view.sortieQuote,text=String(line).slice(0,24);
  c.save();c.font='bold 11px sans-serif';const w=Math.max(62,Math.ceil(c.measureText(text).width)+12);
  const left=Math.max(2,Math.min(s.map.w*32-w-2,x*32+16-w/2)),top=Math.max(3,y*32-22);
  c.fillStyle='rgba(30,37,44,.91)';c.strokeStyle='#e1cd91';c.lineWidth=1;
  c.fillRect(left,top,w,19);c.strokeRect(left+.5,top+.5,w-1,18);
  c.fillStyle='#fff6d7';c.textAlign='center';c.fillText(text,left+w/2,top+13);c.restore();
 }
 if(view.sortieUnit){c.save();c.globalAlpha=.83;drawUnit(c,view.sortieUnit);c.restore();}
 if(view.ghost){c.save();c.globalAlpha=view.ghost.alpha;if(view.ghost.shatter)drawGemCollapse(c,view.ghost.unit,view.ghost.progress);else drawUnit(c,view.ghost.unit);c.restore();}
 if(selected?.alive&&view.dest&&(view.dest.x!==selected.x||view.dest.y!==selected.y)){c.globalAlpha=.55;drawUnit(c,{...selected,...view.dest});c.globalAlpha=1;}
 if(view.dest&&selected&&view.selected)cursor(c,view.dest,'#fff1ad');
 if(view.moveArmed&&view.dest&&selected?.team==='ally'){
  const x=view.dest.x*32,y=view.dest.y*32;c.save();c.strokeStyle='#ffedbe';c.lineWidth=3;c.shadowColor='#ffe1a0';c.shadowBlur=7;c.strokeRect(x+3,y+3,26,26);c.restore();
 }
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
 if(view.strike)drawWeaponSweep(c,view.strike);
 if(view.stepLanding)drawLandingDust(c,view.stepLanding);
 if(view.impact)drawCrystalImpact(c,view.impact);
 if(view.jewel&&!view.jewel.hitStop)drawGemFragments(c,s.units.find(u=>u.id===view.jewel.id),view.jewel);
 if(view.flash){const t=s.units.find(u=>u.id===view.flash.id);if(t){c.fillStyle=view.flash.heal?`rgba(132,255,194,${view.flash.amount*.45})`:`rgba(255,247,220,${view.flash.amount*.7})`;c.fillRect(t.x*32+3,t.y*32+3,26,27);}}
 if(view.effect){const e=view.effect;c.save();c.globalAlpha=1-e.progress*.4;c.font='bold 12px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#132b32';c.fillStyle=e.heal?'#b8ffd0':'#fff2c2';const x=e.x*32+16,y=e.y*32+5-e.progress*13;c.strokeText(e.text,x,y);c.fillText(e.text,x,y);c.restore();}
 if(view.bossBreak)drawBossFracture(c,view.bossBreak);
}
// Class-specific weapon movement lives entirely inside existing windup frames.
// A large, readable sweep precedes the first HP gem crack: a strike, not a tick.
function drawWeaponSweep(c,fx){
 const {from,to,weapon,progress:p}=fx,frame=weaponFrame(p,weapon?.enabled);
 if(frame.alpha<=0||!from||!to)return;
 const {sweep,reach}=frame,kind=weapon.kind;
 const angle=Math.atan2(to.y-from.y,to.x-from.x);
 c.save();c.globalAlpha=frame.alpha;c.strokeStyle=weapon.color;c.lineWidth=weapon.width;c.lineCap='round';
 if(kind==='arrow'||kind==='artillery'||kind==='arcane'){
  const dx=(to.x-from.x)*32,dy=(to.y-from.y)*32;
  const px=from.x*32+16+dx*p,py=from.y*32+14+dy*p-(kind==='arrow'?Math.sin(p*Math.PI)*12:0);
  c.translate(px,py);c.rotate(angle);
  c.shadowColor=weapon.color;c.shadowBlur=kind==='arcane'?8:3;
  if(kind==='arcane'){
   c.beginPath();c.arc(0,0,4+reach*5,-Math.PI*.9,Math.PI*(reach*1.5-.8));c.stroke();
   c.beginPath();c.moveTo(-14,0);c.lineTo(-4,0);c.stroke();
  }else{
   c.lineWidth=kind==='artillery'?4:2;
   c.beginPath();c.moveTo(-19-(kind==='artillery'?5:0),0);c.lineTo(-2,0);c.stroke();
   c.strokeStyle='#fff8e4';c.lineWidth=1;c.beginPath();c.moveTo(-12,1);c.lineTo(-3,1);c.stroke();
  }
 }else{
  c.translate(to.x*32+16,to.y*32+15);c.rotate(angle);
  c.shadowColor=weapon.color;c.shadowBlur=4;
  if(kind==='slash'){
   const start=-1.52+reach*1.65;
   c.beginPath();c.arc(0,0,13,start,start+.85);c.stroke();
   c.strokeStyle='#fffdf1';c.lineWidth=1.2;c.beginPath();c.arc(0,0,15,start+.2,start+.75);c.stroke();
  }else if(kind==='thrust'){
   const tip=-16+29*reach;
   c.beginPath();c.moveTo(-19,0);c.lineTo(tip,0);c.stroke();
   c.beginPath();c.moveTo(tip-6,-4);c.lineTo(tip,0);c.lineTo(tip-6,4);c.stroke();
   c.strokeStyle='#fffdf1';c.lineWidth=1;c.beginPath();c.moveTo(-15,-2);c.lineTo(tip-5,-2);c.stroke();
  }else{ // shield: weighty broad cleave, not the defensive shield sparks
   const x=-14+22*reach;
   c.lineWidth=4;c.beginPath();c.moveTo(x-8,-11);c.lineTo(x+6,10);c.stroke();
   c.strokeStyle='#fff5d3';c.lineWidth=1.6;c.beginPath();c.moveTo(x-7,-10);c.lineTo(x+7,11);c.stroke();
  }
 }
 c.restore();
}
// The unique final boss jewel visibly fractures before the larger collapse.
// This is a presentation cue only: never grants invulnerability or a second HP bar.
function drawBossFracture(c,fx){
 const p=bossFracture(fx.progress,fx.stage);
 if(p.alpha<=0)return;
 const x=fx.x*32+16,y=fx.y*32+15;
 c.save();c.globalAlpha=p.alpha;c.strokeStyle=fx.stage==='burst'?'#f5d7ad':'#fcf0d4';c.lineWidth=1.4;c.lineCap='round';
 c.beginPath();
 for(let i=0;i<p.branches;i++){
  const a=(i*2*Math.PI/p.branches)+.15,r=p.radius;
  const mid=r*.56,offset=(i%2?2.5:-2.5);
  c.moveTo(x,y);
  c.lineTo(x+Math.cos(a)*mid,y+Math.sin(a)*mid);
  c.lineTo(x+Math.cos(a)*r+Math.cos(a+Math.PI/2)*offset,y+Math.sin(a)*r+Math.sin(a+Math.PI/2)*offset);
 }
 c.stroke();
 if(p.burst){
  c.lineWidth=2;c.beginPath();c.arc(x,y,p.radius,0,Math.PI*2);c.stroke();
 }
 c.restore();
}
// Lightweight screen-space marks drawn into the already-existing canvas.
// Never touch battlefield camera, map surfaces or command dock geometry.
function drawCrystalImpact(c,fx){
 const {alpha,ring,glow,rays}=impactFrame(fx.style,fx.progress);
 if(alpha<=0)return;
 const x=fx.x*32+16,y=fx.y*32+15,heal=fx.kind==='heal',armour=fx.style.armoured&&!heal;
 c.save();
 c.globalAlpha=alpha*(heal?.75:.83);
 c.strokeStyle=heal?'#abf7d3':armour?'#d3b99d':'#fff1bd';
 c.lineWidth=armour?2:heal?1.5:fx.style.heavy?2.5:1.5;
 c.beginPath();c.arc(x,y,ring,0,Math.PI*2);c.stroke();
 // A shield absorbs the sharp edge: short, broad brass scratches.
 if(armour){
  c.strokeStyle='#e0b989';c.lineWidth=2;
  c.beginPath();c.moveTo(x-8,y-4);c.lineTo(x+3,y-8);
  c.moveTo(x-7,y+1);c.lineTo(x+5,y-3);c.stroke();
 }else{
  const lines=heal?4:rays,reach=heal?2:fx.style.heavy?5:3;
  c.strokeStyle=heal?'#d4ffeb':'#fff2d3';c.lineWidth=1;
  c.beginPath();
  for(let k=0;k<lines;k++){
   const a=2*Math.PI*k/lines-Math.PI/2,inner=ring+1,outer=inner+reach;
   c.moveTo(x+Math.cos(a)*inner,y+Math.sin(a)*inner);
   c.lineTo(x+Math.cos(a)*outer,y+Math.sin(a)*outer);
  }c.stroke();
 }
 if(glow>0){
  c.globalAlpha=Math.min(.42,glow*.58);
  c.fillStyle=heal?'#c8ffde':armour?'#f4d9ab':'#fff3cd';
  c.beginPath();c.arc(x,y,heal?3:2.5,0,Math.PI*2);c.fill();
 }
 c.restore();
}
function drawLandingDust(c,step){
 const {alpha,spread}=landingFrame(step.progress);
 if(alpha<=0)return;
 const x=step.x*32+16,y=step.y*32+29;
 c.save();c.globalAlpha=alpha;c.fillStyle='#f3e7c4';
 for(const dir of [-1,1]){
  c.beginPath();c.ellipse(x+dir*spread,y,2+step.progress*1.5,1.25,0,0,Math.PI*2);c.fill();
 }
 c.restore();
}
// Pixel-sized, deterministic diamond chips: one burst per actual HP point.
function drawGemFragments(c,u,frame){
 if(!u||frame.progress>=1)return;
 const x=u.x*32+4+frame.index*4+1.5,y=u.y*32+29.5,p=frame.progress;
 const colors=frame.heal?['#e6fff3','#8cd8bf','#baffdf']:frame.armoured?['#f3d9a0','#c3b4c0','#b3a1a0']:u.team==='ally'?['#f4ecff','#d9cbf0','#f5d99e']:['#fff1d6','#ffd0ac','#f7c58d'];
 c.save();c.globalAlpha=Math.max(0,1-p);c.lineWidth=.75;
 const double=!frame.heal&&frame.count===2;
 const scale=frame.heavy?1.5:double?1.34:1;
 for(let k=0;k<(double?6:4);k++){
  const a=(k*Math.PI*2/(double?6:4))+.3,spread=scale*(2+p*9),dx=Math.cos(a)*spread,dy=Math.sin(a)*spread;
  c.fillStyle=colors[k%colors.length];c.beginPath();
  c.moveTo(x+dx,y+dy-2);c.lineTo(x+dx+2,y+dy);c.lineTo(x+dx,y+dy+2);c.lineTo(x+dx-2,y+dy);c.closePath();c.fill();
 }
 c.restore();
}
// Defeat reads as the same crystal language, not an unrelated explosion.
function drawGemCollapse(c,u,progress=0){
 if(!u)return;
 const x=u.x*32+16,y=u.y*32+16,p=Math.min(1,Math.max(0,progress));
 const boss=isBossUnit(u);
 const shards=[[-9,-10],[-2,-14],[7,-10],[-11,-2],[-3,0],[7,0],[-8,10],[5,9],...(boss?[[-13,5],[12,-8],[-1,13],[14,11]]:[])];
 c.save();
 for(let i=0;i<shards.length;i++){
  const [dx,dy]=shards[i],a=(i+.3)*Math.PI*2/shards.length,dist=3+p*(boss?20:13);
  const px=x+dx+Math.cos(a)*dist,py=y+dy+Math.sin(a)*dist+p*7;
  c.fillStyle=i%3===0?'#fff1c9':u.team==='ally'?'#b3d9f0':boss?'#dfb5da':'#f0a6a5';
  c.beginPath();c.moveTo(px,py-4);c.lineTo(px+3,py);c.lineTo(px,py+4);c.lineTo(px-3,py);c.closePath();c.fill();
 }
 c.restore();
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
 // High-contrast HP6 pips, visible even when zoomed out.
 rect(2,26,28,6,'#15202a');
 for(let i=0;i<6;i++){
  const px=4+i*4,filled=i<u.hp,color=filled?(u.hp<=2?'#ffd078':blue?'#c0eabe':'#ffc1a3'):'#45505b';
  // A 3×5 faceted diamond silhouette reads as one distinct HP jewel.
  rect(px,28,3,3,color);rect(px+1,27,1,1,filled?'#fff7dc':'#606978');
  rect(px+1,31,1,1,filled?blue?'#8faebc':'#cd877a':'#343d48');
 }
 // The palette communicates allegiance; a dot still distinguishes spent allies.
 if(spent){rect(26,3,4,4,'#f6e6b1');rect(27,4,2,2,ink);}
}
function cursor(c,p,color){const x=p.x*32,y=p.y*32;c.fillStyle='#273847';for(const [dx,dy]of [[0,0],[23,0],[0,23],[23,23]])c.fillRect(x+dx,y+dy,9,9);c.fillStyle=color;for(const [dx,dy,sx,sy]of [[1,1,1,1],[30,1,-1,1],[1,30,1,-1],[30,30,-1,-1]]){c.fillRect(x+dx+(sx<0?-7:0),y+dy,8,2);c.fillRect(x+dx,y+dy+(sy<0?-7:0),2,8);}}
export function mini(canvas,s,viewport,tile){const c=canvas.getContext('2d');c.clearRect(0,0,64,120);const sx=64/s.map.w,sy=120/s.map.h;for(let y=0;y<s.map.h;y++)for(let x=0;x<s.map.w;x++){c.fillStyle=PALETTES[s.map.id]?.[s.map.tiles[y][x]]||COLORS[s.map.tiles[y][x]];c.fillRect(x*sx,y*sy,sx+.3,sy+.3);}for(const u of alive(s)){c.fillStyle=u.team==='ally'?'#ace4f3':'#b43947';c.fillRect(u.x*sx,u.y*sy,Math.max(sx,3),Math.max(sy,3));}c.strokeStyle='#fff0ad';c.lineWidth=1;c.strokeRect(viewport.scrollLeft/tile*sx,viewport.scrollTop/tile*sy,viewport.clientWidth/tile*sx,viewport.clientHeight/tile*sy);}

