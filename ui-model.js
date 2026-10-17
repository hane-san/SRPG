import {alive,inRange,prediction,terrain} from './engine.js?v=0.3.0';

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
