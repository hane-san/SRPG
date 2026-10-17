import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {MAPS} from '../data.js';
import {attackTargets,battleForecast,nextReady,actionMessage} from '../ui-model.js';
import {readSave,writeSave,STORAGE} from '../save.js';

test('forecast HP matches committed combat, including terrain and lethal counters',()=>{
 for(const lethal of [false,true]){
  const s=E.createGame(),u=s.units.find(u=>u.id==='a4'),t=s.units.find(u=>u.id==='e1');
  Object.assign(t,{x:8,y:17});s.map.tiles[17]=s.map.tiles[17].slice(0,7)+'f'+s.map.tiles[17].slice(8);if(lethal)u.hp=1;
  const forecast=battleForecast(s,u,t);assert.equal(forecast.terrain.def,1);assert(attackTargets(s,u).includes(t));
  E.act(s,u.id,u,'attack',t.id);assert.equal(u.hp,forecast.allyAfter);assert.equal(t.hp,forecast.enemyAfter);
 }
});
test('next ready unit wraps, ignores acted and dead units, and returns null when done',()=>{
 const s=E.createGame();assert.equal(nextReady(s).id,'a1');assert.equal(nextReady(s,'a8').id,'a1');
 s.units[0].acted=true;s.units[1].alive=false;assert.equal(nextReady(s,'a8').id,'a3');
 for(const u of E.alive(s,'ally'))u.acted=true;assert.equal(nextReady(s,'a8'),null);
});
test('playback feedback reports the current hit/counter/heal and skips idle enemies',()=>{
 const before=E.createGame(),after=structuredClone(before),actor=after.units.find(u=>u.id==='e1');
 after.log.push('a previous enemy hit');assert.equal(actionMessage(before,after,actor),null);
 actor.y--;assert(actionMessage(before,after,actor).includes('へ移動'));
 after.units[0].hp-=5;actor.hp-=2;const hit=actionMessage(before,after,actor);assert(hit.includes('26→21'));assert(hit.includes('22→20'));
 before.units[0].hp=20;after.units[0].hp=21;assert(actionMessage(before,after,actor).includes('(+1)'));
});
test('action playback produces identical complete state to instantaneous resolution',()=>{
 for(let id=0;id<3;id++){
  const a=E.createGame(id),b=structuredClone(a),frames=[];
  for(let turn=0;turn<5&&a.status==='playing';turn++){
   E.endTurn(a);E.prepareEnemy(b);E.enemyPhase(b,s=>frames.push(structuredClone(s)));E.supportPhase(b,s=>frames.push(structuredClone(s)));E.eventPhase(b);E.nextTurn(b);
   assert.deepEqual(b,a);
  }
  assert(frames.length>0);assert(frames.every(s=>s.phase===2||s.phase===3));
 }
});
test('v0.2 saves migrate without losing actions; corrupt nested data is rejected',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const s=E.createGame();E.act(s,'a1',{x:5,y:14},'wait');writeSave(storage,'0.2.0',s,true);
 const migrated=readSave(storage,'0.3.0',MAPS);assert(migrated.campaign);assert.equal(migrated.state.units[0].y,14);assert(migrated.state.units[0].acted);
 for(const corrupt of [s=>s.metrics.deaths=null,s=>s.metrics.commands=-1,s=>s.warnings=[{kind:'cannon',turn:2,cells:null}],s=>s.units[0].acted=null,s=>s.units[0].alive=false,s=>Object.assign(s.units[1],{x:5,y:14})]){
  const damaged=structuredClone(s);corrupt(damaged);writeSave(storage,'0.3.0',damaged,true);assert.equal(readSave(storage,'0.3.0',MAPS),null);
 }
 assert(values.get(STORAGE));
});
