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
