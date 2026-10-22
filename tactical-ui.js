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
// Each change in displayed HP comes from an already-resolved combat event.
// Never infer "raw attack" from final damage, and never animate extra gems for overkill.
export function combatCue(event,beforeHP,afterHP,{def=0,guard=0}={}){
 if(!event||!['hit','heal'].includes(event.kind))return '';
 const before=Math.max(0,Number(beforeHP)||0),after=Math.max(0,Number(afterHP)||0);
 const healed=Math.max(0,after-before),broken=Math.max(0,before-after);
 if(event.kind==='heal')return `結晶再生 +${healed}個`;
 const prefix=event.counter?'反撃 · ':'';
 const defensive=def>0||guard>0?' · 防御適用後':'';
 const overkill=Number(event.amount)>broken&&after===0?' · 残HP分のみ':'';
 return `${prefix}結晶破砕 ${broken}個${defensive}${overkill}`;
}
export function thumbSide(value){return value==='left'?'left':'right';}
