import {CLASSES,SKILLS} from './config.js?v=0.1.2';
// Storage is optional. Reject partial turns and malformed/old saves before rendering.
export const STORAGE='field-command-save-v1';
export function readSave(storage,release,maps){
 try{
  const saved=JSON.parse(storage.getItem(STORAGE)),s=saved?.state,m=maps[s?.map?.id];
  if(saved?.release!==release||!s||!m||s.map.w!==m.w||s.map.h!==m.h||!['playing','victory','defeat'].includes(s.status)||(![1,2,3,4].includes(s.phase))||(s.status==='playing'&&s.phase!==1))return null;
  if(!Number.isInteger(s.turn)||s.turn<1||!Array.isArray(s.units)||!s.units.length||!Array.isArray(s.log)||!Array.isArray(s.lost)||!Array.isArray(s.warnings)||!s.metrics||!s.settings)return null;
  if(!['classic','casual'].includes(s.settings.mode)||!['H0','H1','H2'].includes(s.settings.healing)||![-2,0,2].includes(s.settings.enemyAttack))return null;
  const ids=new Set();for(const u of s.units){if(!u||!Object.hasOwn(CLASSES,u.type)||!Object.hasOwn(SKILLS,u.skill)||typeof u.name!=='string'||typeof u.glyph!=='string'||typeof u.label!=='string'||typeof u.alive!=='boolean'||typeof u.id!=='string'||ids.has(u.id)||!['ally','enemy'].includes(u.team)||!Number.isInteger(u.x)||!Number.isInteger(u.y)||u.x<0||u.y<0||u.x>=m.w||u.y>=m.h||![u.hp,u.maxHp,u.atk,u.def,u.move,u.charges].every(Number.isFinite)||u.hp<0||u.hp>u.maxHp||u.charges<0||!Array.isArray(u.range)||u.range.length!==2||!u.range.every(Number.isInteger)||u.range[0]<1||u.range[1]<u.range[0])return null;ids.add(u.id);}
  // Map rules come from the current release, never from saved or partially edited JSON.
  s.map=structuredClone(m);return {state:s,campaign:!!saved.campaign};
 }catch{return null;}
}
export function writeSave(storage,release,state,campaign){
 if(state.status==='playing'&&state.phase!==1)return false;
 try{storage.setItem(STORAGE,JSON.stringify({release,state,campaign}));return true;}catch{return false;}
}
