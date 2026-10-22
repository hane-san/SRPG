import {alive,at,dist,inRange,prediction,terrain,reachable,routeTo,key,movement,weatherAt,WEATHER,canNormalAttack} from './engine.js?v=0.8.0-issue17-p3-26-map38-m02-war43-m02gate57';

export const attackTargets=(s,u,dest=u)=>canNormalAttack(u)?alive(s,'enemy').filter(t=>inRange({...u,...dest},t)):[];
// Read the engine's chosen route, including terrain costs and this turn's rain.
// Call on draft changes, not on animation frames.
export function routeSummary(s,u,dest=u,route=routeTo(s,u,dest)){
 const cost=route.length?route.slice(1).reduce((n,p)=>n+terrain(s,p).cost,0):null;
 return {cost,budget:movement(s,u),weather:WEATHER[weatherAt(s)].label,targets:attackTargets(s,u,dest).length};
}
function rangeError(u,target,dest,noApproach=false){
 const distance=dist(dest,target),range=u.range[0]===u.range[1]?u.range[0]:u.range.join('–');
 return `射程外：${target.name}まで${distance}マス\n${noApproach?'移動しても届きません':distance<u.range[0]?'近すぎます・移動先を維持':'移動先を維持'}（射程${range}）`;
}
export function battleForecast(s,u,target,dest=u){
 const p=prediction(s,u,target,dest);
 return {...p,allyAfter:Math.max(0,u.hp-p.counter),enemyAfter:Math.max(0,target.hp-p.damage),terrain:terrain(s,dest)};
}
export function nextReady(s,current){
 const units=alive(s,'ally'),start=units.findIndex(u=>u.id===current);
 for(let i=1;i<=units.length;i++){const u=units[(start+i)%units.length];if(!u.acted)return u;}
 return null;
}
// Derive feedback from actual state changes, including counters and healing.
// A stationary enemy doing nothing must not repeat the previous enemy's damage.
export function actionMessage(before,after,actor){
 const changes=after.units.flatMap(u=>{const old=before.units.find(a=>a.id===u.id);if(!old||old.hp===u.hp)return [];
  const delta=u.hp-old.hp;return [`${u.name} HP ${old.hp}→${u.hp} (${delta>0?'+':''}${delta})${!u.alive?(u.team==='enemy'?'・撃破':after.settings.mode==='classic'?'・永久離脱':'・撤退'):''}`];});
 const old=before.units.find(u=>u.id===actor.id),moved=old&&(old.x!==actor.x||old.y!==actor.y);
 return changes.length?`${actor.name}：${changes.join(' / ')}`:moved?`${actor.name}が (${actor.x+1}, ${actor.y+1})へ移動`:null;
}
// Continue the arrow into an enemy without moving onto its occupied tile.
export function slideDraft(s,u,p,current=u,{preserve=false,route:chosenRoute=null}={}){
 const target=at(s,p);
 if(target?.team==='enemy'){
  if(!canNormalAttack(u))return {dest:{x:current.x,y:current.y},route:chosenRoute||routeTo(s,u,current),target:null,attackError:'この兵種はP3専用です'};
  let dest=current;
  if(!inRange({...u,...dest},target)){
   if(preserve||dist(current,u)>0){const route=chosenRoute||routeTo(s,u,current);return {dest:{x:current.x,y:current.y},route,target:null,attackError:rangeError(u,target,current)};}
   const options=reachable(s,u).filter(n=>inRange({...u,...n},target));
   options.sort((a,b)=>dist(a,current)-dist(b,current)||a.cost-b.cost||a.y-b.y||a.x-b.x);
   dest=options[0];
   if(!dest)return {dest:{x:current.x,y:current.y},route:routeTo(s,u,current),target:null,attackError:rangeError(u,target,current,true)};
  }
  if(!dest)return null;
  const route=chosenRoute||routeTo(s,u,dest);if(!route.length)return null;
  return {dest:{x:dest.x,y:dest.y},route,target:target.id,attackError:null};
 }
 const route=routeTo(s,u,p);return route.length?{dest:{x:p.x,y:p.y},route,target:null,attackError:null}:null;
}


// Movement/normal-attack regions share the exact legal movement field.
export function tacticalRanges(s,u,cells=reachable(s,u)){
 const moves=new Set(cells.map(key)),attacks=new Set(),friends=new Set(alive(s,'ally').map(key));
 if(!canNormalAttack(u))return {moves,attacks};
 // Clip loops to map bounds even for future long-range abilities or bad old data.
 for(const p of cells)for(let y=Math.max(0,p.y-u.range[1]);y<=Math.min(s.map.h-1,p.y+u.range[1]);y++)
  for(let x=Math.max(0,p.x-u.range[1]);x<=Math.min(s.map.w-1,p.x+u.range[1]);x++){
   const t={x,y},k=key(t);if(terrain(s,t)&&inRange({...u,...p},t)&&!moves.has(k)&&!friends.has(k))attacks.add(k);
  }
 return {moves,attacks};
}
