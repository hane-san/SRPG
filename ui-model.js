import {alive,at,dist,inRange,prediction,terrain,reachable,routeTo} from './engine.js?v=0.5.2';

export const attackTargets=(s,u,dest=u)=>alive(s,'enemy').filter(t=>inRange({...u,...dest},t));
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
  let dest=current;
  if(!inRange({...u,...dest},target)){
   if(preserve||dist(current,u)>0){const route=chosenRoute||routeTo(s,u,current);return route.length?{dest:{x:current.x,y:current.y},route,target:null,attackError:'選択した移動先からは射程外。移動先は維持しています。'}:null;}
   const options=reachable(s,u).filter(n=>inRange({...u,...n},target));
   options.sort((a,b)=>dist(a,current)-dist(b,current)||a.cost-b.cost||a.y-b.y||a.x-b.x);
   dest=options[0];
  }
  if(!dest)return null;
  const route=chosenRoute||routeTo(s,u,dest);if(!route.length)return null;
  return {dest:{x:dest.x,y:dest.y},route,target:target.id,attackError:null};
 }
 const route=routeTo(s,u,p);return route.length?{dest:{x:p.x,y:p.y},route,target:null,attackError:null}:null;
}


// Movement/normal-attack regions share the exact legal movement field.
export function tacticalRanges(s,u,cells=reachable(s,u)){
 const moves=new Set(cells.map(p=>`${p.x},${p.y}`)),attacks=new Set();
 for(const p of cells)for(let dy=-u.range[1];dy<=u.range[1];dy++)for(let dx=-u.range[1];dx<=u.range[1];dx++){
  const t={x:p.x+dx,y:p.y+dy},k=`${t.x},${t.y}`;if(terrain(s,t)&&inRange({...u,...p},t)&&!moves.has(k)&&at(s,t)?.team!=='ally')attacks.add(k);
 }
 return {moves,attacks};
}
