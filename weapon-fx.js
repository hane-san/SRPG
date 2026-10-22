// Temporary weapon motion profiles only; never read/write battle rules.
const kindFor={sword:'slash',shield:'cleave',horse:'thrust',bow:'arrow',shooter:'artillery',mage:'arcane',healer:'arcane',medic:'arcane'};
export function weaponProfile(type,{fast=false,reduced=false}={}){
 const kind=kindFor[type]||'cleave';
 return {kind,type:type||'unknown',color:kind==='arcane'?'#dbc1ff':kind==='artillery'?'#ffe4aa':kind==='arrow'?'#f8efda':kind==='thrust'?'#ffe3ac':kind==='cleave'?'#f9dca7':'#fff6d8',width:kind==='cleave'?3.5:kind==='thrust'?2.8:2.3,enabled:!fast&&!reduced};
}
export function weaponFrame(progress,enabled=true){
 const p=Number.isFinite(progress)?Math.min(1,Math.max(0,progress)):0;
 const sweep=Math.min(1,Math.max(0,(p-.32)/.58));
 const fade=sweep===0||sweep===1?0:Math.min(1,sweep*4,(1-sweep)*3);
 // Concentrate the flash in the *end* of the existing windup, no new delay.
 return {p,sweep,alpha:enabled?fade:0,reach:1-Math.pow(1-sweep,3)};
}
export function isBossUnit(unit){return !!unit&&unit.id==='boss'&&unit.team==='enemy';}
export function bossFracture(progress,stage='crack'){
 const p=Number.isFinite(progress)?Math.min(1,Math.max(0,progress)):0;
 if(stage==='burst')return {alpha:(1-p)*.95,radius:10+18*p,branches:8,burst:true};
 return {alpha:p*.85,radius:3+11*p,branches:6,burst:false};
}
