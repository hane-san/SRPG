// Presentation-only status classification. Combat rules and phase timing live in engine.js.
export const PHASE_LABELS=['Ⅰ 味方','Ⅱ 敵軍','Ⅲ 待機支援','Ⅳ 戦場'];
export function hudSignals({status='playing',phase=1,warnings=[],weatherCycle=null,map=null}={}){
 const active=status==='playing'&&Number.isInteger(phase)&&phase>=1&&phase<=4?phase:0;
 const level=warnings.some(w=>w.kind==='cannon')?'cannon':warnings.some(w=>w.kind==='spawn')?'reinforcement':weatherCycle||map?.weatherCycle?'weather':'none';
 return {active,level};
}
export function routeIntent({attackError=null,target=null,moveArmed=false}={}){
 return attackError?'invalid':target?'attack':moveArmed?'locked':'route';
}
