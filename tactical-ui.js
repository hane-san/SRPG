// Presentation-only, bounded tactical cues. The engine owns all calculations.
// "risk" is the sum of separate enemy reach scenarios, not an actual P2 forecast.
export function riskCue(risk,availableHp,{cannon=false}={}){
 const n=Math.max(0,Math.floor(Number.isFinite(risk)?risk:0));
 const hp=Math.max(0,Math.floor(Number.isFinite(availableHp)?availableHp:0));
 const level=n===0?'safe':n>=hp&&hp>0?'critical':n>=3?'high':'caution';
 return {
  level:cannon?'cannon':level,
  text:`P2射程概算 ${n}（確定被害ではありません）${cannon?' ／ ⚠ P4砲撃予告マス':''}`
 };
}
export function hasAnnouncedCannon(warnings,position){
 return Array.isArray(warnings)&&warnings.some(w=>w.kind==='cannon'&&Array.isArray(w.cells)&&w.cells.some(p=>p.x===position?.x&&p.y===position?.y));
}
// Phones can scroll an announced barrage (or reinforcement) out of view. Return the
// tile-unit centre of the most urgent warning (cannon first, earliest turn) and
// whether any of its cells lies outside the visible tile rectangle.
export function warningFocus(warnings,visible=null){
 const list=(Array.isArray(warnings)?warnings:[]).filter(w=>Array.isArray(w?.cells)&&w.cells.length);
 const byTurn=(a,b)=>(a.turn??0)-(b.turn??0);
 const w=list.filter(w=>w.kind==='cannon').sort(byTurn)[0]||[...list].sort(byTurn)[0];
 if(!w)return null;
 const xs=w.cells.map(p=>p.x),ys=w.cells.map(p=>p.y);
 const offscreen=!!visible&&w.cells.some(p=>p.x<visible.x0||p.x+1>visible.x1||p.y<visible.y0||p.y+1>visible.y1);
 return {kind:w.kind,turn:w.turn,x:(Math.min(...xs)+Math.max(...xs)+1)/2,y:(Math.min(...ys)+Math.max(...ys)+1)/2,offscreen};
}
// Each change in displayed HP comes from an already-resolved combat event.
// Never infer "raw attack" from final damage, and never animate extra gems for overkill.
export function combatCue(event,beforeHP,afterHP,{def=0,guard=0,specialty=null,command=null}={}){
 if(!event||!['hit','heal'].includes(event.kind))return '';
 const before=Math.max(0,Number(beforeHP)||0),after=Math.max(0,Number(afterHP)||0);
 const healed=Math.max(0,after-before),broken=Math.max(0,before-after);
 if(event.kind==='heal')return `結晶再生 +${healed}個`;
 const prefix=event.counter?'反撃 · ':'';
 const defensive=def>0||guard>0||(specialty==='guard'&&!!command)?' · 防御適用後':'';
 const overkill=Number(event.amount)>broken&&after===0?' · 残HP分のみ':'';
 return `${prefix}結晶破砕 ${broken}個${defensive}${overkill}`;
}
export function thumbSide(value){return value==='left'?'left':'right';}

// Cache the enemy reach once per *board state*, not once per pointer movement.
// The generated attack sets are mathematically equivalent to engine.threatAt's
// per-enemy reachable(...).some(inRange), including stationary "hold" enemies.
export function buildThreatIndex(state,engine){
 return engine.alive(state,'enemy').map(enemy=>{
  const cells=new Set(),steps=engine.reachable(state,enemy,enemy.ai==='hold'?0:engine.movement(state,enemy),{threat:true});
  const [min,max]=enemy.range;
  for(const p of steps)for(let dx=-max;dx<=max;dx++)for(let dy=-max;dy<=max;dy++){
   const dist=Math.abs(dx)+Math.abs(dy),x=p.x+dx,y=p.y+dy;
   if(dist>=min&&dist<=max&&x>=0&&y>=0&&x<state.map.w&&y<state.map.h)cells.add(`${x},${y}`);
  }
  return {enemy,cells};
 });
}
export function indexedThreat(state,index,unit,dest,engine){
 const cell=`${dest.x},${dest.y}`,target={...unit,...dest};
 return index.reduce((sum,entry)=>sum+(entry.cells.has(cell)?engine.damage(state,entry.enemy,target):0),0);
}
