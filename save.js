import {CLASSES,SKILLS} from './config.js?v=0.6.0';
// Storage is optional. Reject partial turns and malformed/old saves before rendering.
export const STORAGE='field-command-save-v1';
export function readSave(storage,release,maps){
 try{
  const saved=JSON.parse(storage.getItem(STORAGE)),s=saved?.state,m=maps[s?.map?.id];
  const migrations={'0.6.0':['0.2.0','0.3.0','0.4.0','0.5.0','0.5.1','0.5.2'],'0.3.0':['0.2.0'],'0.4.0':['0.2.0','0.3.0'],'0.5.0':['0.2.0','0.3.0','0.4.0'],'0.5.1':['0.2.0','0.3.0','0.4.0','0.5.0'],'0.5.2':['0.2.0','0.3.0','0.4.0','0.5.0','0.5.1']};
  const compatible=saved?.release===release||migrations[release]?.includes(saved?.release);
  if(!compatible||!s||!m||s.map.w!==m.w||s.map.h!==m.h||!['playing','victory','defeat'].includes(s.status)||(![1,2,3,4].includes(s.phase))||(s.status==='playing'&&s.phase!==1))return null;
  if(!Number.isInteger(s.turn)||s.turn<1||!Array.isArray(s.units)||!s.units.length||!Array.isArray(s.log)||!Array.isArray(s.lost)||!Array.isArray(s.warnings)||!s.metrics||!s.settings)return null;
  if(!['classic','casual'].includes(s.settings.mode)||!['H0','H1','H2'].includes(s.settings.healing)||![-2,0,2].includes(s.settings.enemyAttack))return null;
  if(!s.log.every(x=>typeof x==='string')||!s.lost.every(x=>typeof x==='string')||!Array.isArray(s.metrics.deaths)||!s.metrics.deaths.every(d=>d&&typeof d.id==='string'&&Number.isInteger(d.turn)))return null;
  if(!['commands','supports','misfires','charges','turns'].every(k=>Number.isInteger(s.metrics[k])&&s.metrics[k]>=0))return null;
  const cell=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x<m.w&&p.y<m.h;
  if(!s.warnings.every(w=>w&&['cannon','spawn'].includes(w.kind)&&Number.isInteger(w.turn)&&w.turn>=s.turn&&Array.isArray(w.cells)&&w.cells.every(cell)))return null;
  const ids=new Set();for(const u of s.units){if(!u||!Object.hasOwn(CLASSES,u.type)||!Object.hasOwn(SKILLS,u.skill)||typeof u.name!=='string'||typeof u.glyph!=='string'||typeof u.label!=='string'||typeof u.alive!=='boolean'||typeof u.id!=='string'||ids.has(u.id)||!['ally','enemy'].includes(u.team)||!Number.isInteger(u.x)||!Number.isInteger(u.y)||u.x<0||u.y<0||u.x>=m.w||u.y>=m.h||![u.hp,u.maxHp,u.atk,u.def,u.move,u.charges].every(Number.isFinite)||u.hp<0||u.hp>u.maxHp||u.charges<0||!Array.isArray(u.range)||u.range.length!==2||!u.range.every(Number.isInteger)||u.range[0]<1||u.range[1]<u.range[0])return null;ids.add(u.id);}
  const occupied=new Set();for(const u of s.units){
   for(const k of ['healedTurn','volleyTurn'])if(u[k]!==undefined&&(!Number.isInteger(u[k])||u[k]<1||u[k]>s.turn))return null;
   if(typeof u.acted!=='boolean'||typeof u.spend!=='boolean'||!Number.isInteger(u.charges)||!Number.isInteger(u.move)||u.move<0||u.move>m.w*m.h||u.maxHp<=0||u.alive!==(u.hp>0)||![null,'support','heal'].includes(u.command)||!(u.focus===null||typeof u.focus==='string')||![u.guard].every(Number.isFinite))return null;
   if(u.alive){const tile=m.tiles[u.y][u.x],key=`${u.x},${u.y}`;if(['~','#'].includes(tile)||occupied.has(key))return null;occupied.add(key);}
  }
  // Map rules come from the current release, never from saved or partially edited JSON.
  s.map=structuredClone(m);return {state:s,campaign:!!saved.campaign};
 }catch{return null;}
}
export function writeSave(storage,release,state,campaign){
 if(state.status==='playing'&&state.phase!==1)return false;
 try{storage.setItem(STORAGE,JSON.stringify({release,state,campaign}));return true;}catch{return false;}
}

