import {RULES,TERRAINS} from './config.js?v=0.3.0';
import {MAPS,ROSTER,unit,positions} from './data.js?v=0.3.0';
export const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export const key=p=>`${p.x},${p.y}`;
export const alive=(s,team)=>s.units.filter(u=>u.alive&&(!team||u.team===team));
export const at=(s,p)=>alive(s).find(u=>u.x===p.x&&u.y===p.y);
export const terrain=(s,p)=>TERRAINS[s.map.tiles[p.y]?.[p.x]];
export const inRange=(a,b,r=a.range)=>dist(a,b)>=r[0]&&dist(a,b)<=r[1];
export function log(s,text){s.log.push(`T${s.turn} P${s.phase} · ${text}`);if(s.log.length>250)s.log.shift();}
export function createGame(mapId=0,opts={},lost=[]){
 const map=structuredClone(MAPS[mapId]);const settings={mode:'classic',healing:'H1',enemyAttack:0,...opts};
 const pos=positions(mapId);const allies=ROSTER.filter(r=>!lost.includes(r.id)).map((r,i)=>unit({...r,x:pos[i][0],y:pos[i][1]},'ally',settings));
 // Emergency recruits avoid a campaign softlock without restoring named dead captains.
 for(let i=allies.length;i<4;i++)allies.push(unit({id:`reserve-${mapId}-${i}`,name:`予備隊${i+1}`,type:i===3?'healer':'shield',x:pos[i][0],y:pos[i][1]},'ally',settings));
 const s={version:1,map,settings,units:[...allies,...map.enemies.map(e=>unit(e,'enemy',settings))],turn:1,phase:1,status:'playing',lost:[...lost],log:[],warnings:[],southTaken:false,metrics:{commands:0,supports:0,misfires:0,charges:0,deaths:[],turns:0},events:[]};
 log(s,map.briefing);return s;
}
// Dijkstra uses four neighbours. Friends may be crossed; endpoints must be empty.
function movementField(s,u,budget=u.move,{threat=false}={}){
 const costs=new Map([[key(u),0]]),parents=new Map(),todo=[{x:u.x,y:u.y,c:0}];
 while(todo.length){todo.sort((a,b)=>a.c-b.c);const p=todo.shift();if(p.c!==costs.get(key(p)))continue;
  for(const [dx,dy] of [[0,-1],[-1,0],[1,0],[0,1]]){
   const n={x:p.x+dx,y:p.y+dy},t=terrain(s,n);if(!t)continue;
   const occ=at(s,n);if(occ&&occ.team!==u.team&&!threat)continue;
   const c=p.c+t.cost;if(c>budget||c>=(costs.get(key(n))??Infinity))continue;
   costs.set(key(n),c);parents.set(key(n),{x:p.x,y:p.y});todo.push({...n,c});
  }
 }
 return {costs,parents};
}
export function reachable(s,u,budget=u.move,options={}){
 const {costs}=movementField(s,u,budget,options),{threat=false}=options;
 return [...costs].map(([k,cost])=>{const [x,y]=k.split(',').map(Number);return {x,y,cost};}).filter(p=>!at(s,p)||at(s,p).id===u.id||threat);
}
// The same weighted field drives both legal movement and the preview arrow.
export function routeTo(s,u,dest){
 const {costs,parents}=movementField(s,u);const occupied=at(s,dest);
 if(!costs.has(key(dest))||(occupied&&occupied.id!==u.id))return [];
 const path=[{x:dest.x,y:dest.y}];let p=path[0];
 while(key(p)!==key(u)){p=parents.get(key(p));if(!p)return [];path.push(p);}
 return path.reverse();
}
export const supportRange=u=>u.type==='bow'?RULES.supportRange:u.range;
export function waitCommand(u,dest=u){
 if(dist(u,dest)>0)return null;
 return u.skill==='heal'?'heal':u.skill==='support'&&u.charges>0?'support':null;
}
export function damage(s,a,b,bonus=0){return Math.max(1,a.atk+bonus-b.def-(terrain(s,b)?.def||0)-(b.guard||0));}
export function prediction(s,u,target,position=u,bonus=0){const a={...u,...position};const dealt=damage(s,a,target,bonus);return {damage:dealt,counter:dealt>=target.hp||target.command==='support'||target.command==='heal'||!inRange(target,a)?0:damage(s,target,a)};}
export function threatAt(s,p,u){return alive(s,'enemy').filter(e=>reachable(s,e,e.ai==='hold'?0:e.move,{threat:true}).some(n=>inRange({...e,...n},p))).reduce((sum,e)=>sum+damage(s,e,{...u,...p}),0);}
function hurt(s,u,n,reason){u.hp=Math.max(0,u.hp-n);if(u.hp===0&&u.alive){u.alive=false;u.command=null;s.metrics.deaths.push({turn:s.turn,id:u.id,reason});if(u.team==='ally'&&s.settings.mode==='classic'&&!s.lost.includes(u.id))s.lost.push(u.id);log(s,`${u.name} ${u.team==='enemy'?'撃破':s.settings.mode==='classic'?'永久離脱':'撤退（次章復帰）'}`);}}
function strike(s,a,b,bonus=0,counter=true){const n=damage(s,a,b,bonus);log(s,`${a.name} → ${b.name} ${n}ダメージ`);hurt(s,b,n,a.id);if(counter&&b.alive&&a.alive&&b.command!=='support'&&b.command!=='heal'&&inRange(b,a)){const c=damage(s,b,a);log(s,`${b.name}の反撃 ${c}`);hurt(s,a,c,b.id);}}
function charge(s,u){u.charges--;s.metrics.charges++;}
export function healAmount(s,h,t){
 if(h.charges>0)return Math.min(t.maxHp-t.hp,RULES.heal);
 if(s.settings.healing==='H2'&&t.hurtTurn!==s.turn)return 0;
 const cap=s.settings.healing==='H1'?Math.floor(t.maxHp*RULES.emergencyCap):t.maxHp;return Math.max(0,Math.min(1,cap-t.hp));
}
export function supportTarget(s,u){
 const ranged=u.skill==='support';let targets=alive(s,ranged?'enemy':'ally').filter(t=>ranged?inRange(u,t,supportRange(u)):t.id!==u.id&&dist(u,t)===1&&healAmount(s,u,t)>0);
 if(!ranged&&u.charges>0)targets=targets.filter(t=>t.maxHp-t.hp>=RULES.healThreshold||u.focus===t.id);
 targets.sort((a,b)=>Number(b.id===u.focus)-Number(a.id===u.focus)||(ranged?Number(b.hp<=damage(s,u,b))-Number(a.hp<=damage(s,u,a))||b.atk-a.atk:a.hp/a.maxHp-b.hp/b.maxHp)||a.y-b.y||a.x-b.x||a.id.localeCompare(b.id));return targets[0]||null;
}
export function validateAction(s,id,dest,action,targetId){
 const u=s.units.find(a=>a.id===id),t=s.units.find(a=>a.id===targetId);
 if(s.status!=='playing'||s.phase!==1||!u?.alive||u.team!=='ally'||u.acted)return 'この部隊は行動できません';
 if(!dest||!reachable(s,u).some(p=>p.x===dest.x&&p.y===dest.y))return '移動できない地点です';
 if(!['attack','wait'].includes(action))return '命令は攻撃か待機を選んでください';
 if(action==='attack'&&(!t?.alive||t.team!=='enemy'||!inRange({...u,...dest},t)))return '射程内の敵を選んでください';
 return null;
}
export function act(s,id,dest,action,targetId){const error=validateAction(s,id,dest,action,targetId);if(error)return {ok:false,error};
 const u=s.units.find(a=>a.id===id),t=s.units.find(a=>a.id===targetId),command=action==='wait'?waitCommand(u,dest):null;
 Object.assign(u,{x:dest.x,y:dest.y,acted:true,guard:0,command});s.metrics.commands++;
 if(action==='attack')strike(s,u,t);
 else log(s,`${u.name}：${command?`${command==='heal'?'回復':'攻撃'}待機（P3準備・P2反撃なし）`:'通常待機（P3なし）'}`);
 checkOutcome(s);return {ok:true};
}
export function checkOutcome(s){if(s.status!=='playing')return;
 if(alive(s,'ally').length===0){s.status='defeat';log(s,'全軍撤退。敗北');return;}
 if(s.map.base&&alive(s,'enemy').some(e=>dist(e,s.map.base)===0)){s.status='defeat';log(s,'本陣陥落。敗北');return;}
 if(alive(s,'ally').some(u=>dist(u,s.map.goal)===0)){s.status='victory';log(s,'北城制圧。勝利！');return;}
 if(s.map.south&&!s.southTaken&&alive(s,'ally').some(u=>dist(u,s.map.south)===0)){s.southTaken=true;log(s,'南城制圧。以後の南方増援停止');}
}
export function prepareEnemy(s){if(s.phase!==1||s.status!=='playing')return false;
 for(const u of alive(s,'ally'))if(!u.acted){u.guard=0;u.command=waitCommand(u);u.acted=true;}
 s.phase=2;log(s,'敵軍行動');return true;
}
// Optional observers receive settled individual actions; UI playback never changes rules.
export function enemyPhase(s,observe=()=>{}){
 if(s.phase!==2||s.status!=='playing')return;
 for(const e of alive(s,'enemy')){if(s.status!=='playing')break;
 const friends=alive(s,'ally');let positions=reachable(s,e,e.ai==='hold'?0:e.move);const home=s.map.enemies.find(a=>a.id===e.id)||e;
 if(e.ai==='defend')positions=positions.filter(p=>dist(p,home)<=3);
 if(e.ai==='skirmish'){const nearby=friends.filter(a=>a.x<9);if(!nearby.length)continue;}
 if(e.ai==='raid'&&s.map.base&&positions.some(p=>dist(p,s.map.base)===0)){Object.assign(e,s.map.base);log(s,`${e.name}が本陣へ突入`);checkOutcome(s);observe(s,e);continue;}
 const targets=e.ai==='skirmish'?friends.filter(a=>a.x<9):friends;
 const shots=[];for(const p of positions)for(const t of targets)if(inRange({...e,...p},t))shots.push({p,t,score:(damage(s,e,t)>=t.hp?100:0)+(e.ai==='raid'&&['healer','medic','bow'].includes(t.type)?12:0)+damage(s,e,t)-t.hp/10});
 shots.sort((a,b)=>b.score-a.score||a.p.cost-b.p.cost||a.t.y-b.t.y||a.t.x-b.t.x||a.p.y-b.p.y||a.p.x-b.p.x);
 if(shots.length){const {p,t}=shots[0];Object.assign(e,{x:p.x,y:p.y});const hp=t.hp;strike(s,e,t);if(t.hp<hp)t.hurtTurn=s.turn;}
 else if(e.ai!=='hold'){
  const goal=e.ai==='raid'&&s.map.base?s.map.base:[...targets].sort((a,b)=>dist(e,a)-dist(e,b)||a.y-b.y||a.x-b.x)[0];
  if(goal){ // Global distance field avoids getting stuck behind a river or a wall.
   const field=distanceField(s,goal,e.team);positions.sort((a,b)=>(field.get(key(a))??Infinity)-(field.get(key(b))??Infinity)||a.cost-b.cost||a.y-b.y||a.x-b.x);
   if(positions[0]&&Number.isFinite(field.get(key(positions[0]))))Object.assign(e,{x:positions[0].x,y:positions[0].y});
  }
 }
 checkOutcome(s);observe(s,e);
 }
}
export function distanceField(s,goal,team){const costs=new Map([[key(goal),0]]),q=[{...goal,c:0}];while(q.length){q.sort((a,b)=>a.c-b.c);const p=q.shift();if(p.c!==costs.get(key(p)))continue;for(const [dx,dy]of [[0,-1],[-1,0],[1,0],[0,1]]){const n={x:p.x+dx,y:p.y+dy},t=terrain(s,n);if(!t)continue;const occ=at(s,n);if(occ&&occ.team!==team&&dist(n,goal)!==0)continue;const c=p.c+(terrain(s,p)?.cost||1);if(c>=(costs.get(key(n))??Infinity)||!Number.isFinite(c))continue;costs.set(key(n),c);q.push({...n,c});}}return costs;}
export function supportPhase(s,observe=()=>{}){if(s.status!=='playing')return;s.phase=3;log(s,'味方待機支援');
 for(const u of alive(s,'ally'))if(['support','heal'].includes(u.command)){
  if((!u.spend&&u.charges>0)||(u.skill==='support'&&u.charges===0)){log(s,`${u.name}：温存／残数0のため支援なし`);s.metrics.misfires++;continue;}
  const t=supportTarget(s,u);if(!t){s.metrics.misfires++;log(s,`${u.name}：対象なし・消費なし`);continue;}
  if(u.skill==='support'){charge(s,u);strike(s,u,t,0,false);}
  else{const n=healAmount(s,u,t);if(u.charges>0)charge(s,u);t.hp+=n;log(s,`${u.name} → ${t.name} 待機回復＋${n}`);}
  s.metrics.supports++;checkOutcome(s);observe(s,u);
 }
}
function spawn(s,cells){for(let i=0;i<cells.length;i++){const p=cells[i];if(at(s,p)){log(s,`増援地点(${p.x+1},${p.y+1})占有・到着中止`);continue;}s.units.push(unit({id:`reinforcement-${s.turn}-${i}`,name:'増援隊',type:i%2?'sword':'horse',ai:s.map.base?'raid':'advance',...p},'enemy',s.settings));}log(s,'増援到着。行動は次ターンP2から');}
export function eventPhase(s){if(s.status!=='playing')return;s.phase=4;log(s,'戦場更新');
 for(const w of s.warnings.filter(w=>w.turn===s.turn)){
  if(w.kind==='cannon'){log(s,`予告砲撃：各${RULES.barrageDamage}ダメージ`);for(const u of alive(s))if(w.cells.some(p=>dist(u,p)===0))hurt(s,u,RULES.barrageDamage,'砲撃');}
  else if(!s.southTaken)spawn(s,w.cells);
 }
 s.warnings=s.warnings.filter(w=>w.turn>s.turn);
 const next=s.turn+1;
 if(s.map.cannon&&next%RULES.cannonPeriod===0){const target=alive(s,'ally').sort((a,b)=>b.y-a.y||a.x-b.x)[0];if(target){const cells=[{x:target.x,y:target.y},...[[0,-1],[-1,0],[1,0],[0,1]].map(([dx,dy])=>({x:target.x+dx,y:target.y+dy})).filter(p=>terrain(s,p))];s.warnings.push({kind:'cannon',turn:next,cells});log(s,`確報：T${next} P4 赤い照準へ砲撃6。次のP1で退避できます`);}}
 if(s.map.spawns.length&&!s.southTaken&&next%RULES.reinforcementPeriod===0&&next/RULES.reinforcementPeriod<=(s.map.maxWaves??Infinity)){s.warnings.push({kind:'spawn',turn:next,cells:s.map.spawns});log(s,`確報：T${next} P4 紫の旗に増援。次ターンから攻撃`);}
 checkOutcome(s);
}
export function nextTurn(s){if(s.status!=='playing')return;s.turn++;s.metrics.turns++;s.phase=1;for(const u of alive(s)){u.acted=false;u.guard=0;u.command=null;}log(s,'味方行動開始');}
export function endTurn(s){if(!prepareEnemy(s))return;enemyPhase(s);supportPhase(s);eventPhase(s);nextTurn(s);return s;}
