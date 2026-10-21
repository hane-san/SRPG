import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {MAPS} from '../data.js';
import {readSave,writeSave,STORAGE} from '../save.js';

function memory(){let value;return {getItem:()=>value,setItem:(_key,next)=>value=next};}
function roundTrip(s){const storage=memory();assert(writeSave(storage,'0.8.0',s,true));return readSave(storage,'0.8.0',MAPS);}
function sortie(s){const u=E.sortieUnit(s,E.reserves(s)[0].id),dest=E.reachable(s,u).find(p=>E.dist(p,u)===1);assert(dest);assert(E.deployAndAct(s,u.id,dest,'wait').ok);}

test('all six maps restore T1 0/1/2 sorties and T2 0/1 without granting more sorties',()=>{
 for(const map of MAPS){
  const s=E.createGame(map.id);
  for(let count=0;count<=2;count++){
   if(count)sortie(s);
   const restored=roundTrip(s);assert(restored?.campaign);assert.deepEqual(restored.state,s);
   assert.equal(restored.state.deployedThisTurn,count);
   assert.equal(E.canDeploy(restored.state),count<2);
  }
  E.endTurn(s);assert.equal(s.turn,2);assert.equal(s.phase,1);
  assert.deepEqual(roundTrip(s).state,s);
  sortie(s);const resumed=roundTrip(s).state;assert.deepEqual(resumed,s);assert(!E.canDeploy(resumed));
  const expected=structuredClone(s);E.endTurn(expected);E.endTurn(resumed);assert.deepEqual(resumed,expected);
  assert(resumed.turn===3||resumed.status!=='playing');assert.deepEqual(roundTrip(resumed).state,resumed);
 }
});

test('save keeps rejecting fractional, negative and turn-specific excess sortie counters',()=>{
 for(const turn of [1,2])for(const count of [-1,.5,turn===1?3:2]){
  const s=E.createGame();s.turn=turn;s.deployedThisTurn=count;assert.equal(roundTrip(s),null);
 }
 const s=E.createGame(),store=memory();sortie(s);writeSave(store,'0.8.0',s,false);
 const stable=store.getItem(STORAGE);s.phase=2;assert(!writeSave(store,'0.8.0',s,false));assert.equal(store.getItem(STORAGE),stable);
 for(const phase of [2,3,4]){const malformed=JSON.parse(stable);malformed.state.phase=phase;store.setItem(STORAGE,JSON.stringify(malformed));assert.equal(readSave(store,'0.8.0',MAPS),null);}
 store.setItem(STORAGE,stable.replace('0.8.0','0.7.0'));assert.equal(readSave(store,'0.8.0',MAPS),null);
});

test('cancelled sorties are atomic; reloaded commands and the five-unit limit stay legal',()=>{
 const s=E.createGame();const before=structuredClone(s),id=E.reserves(s)[0].id;
 assert(!E.deployAndAct(s,id,{x:-1,y:-1},'wait').ok);assert.deepEqual(s,before);
 // Legacy deploy is also legal: reload with two unacted units, then move/attack/wait.
 assert(E.deploy(s,E.reserves(s)[0].id).ok);assert(E.deploy(s,E.reserves(s)[0].id).ok);
 const resumed=roundTrip(s).state;
 const u=E.alive(resumed,'ally')[0],p=E.reachable(resumed,u).find(p=>E.dist(p,u)>0);
 assert(E.act(resumed,u.id,p,'wait').ok);
 const a=E.alive(resumed,'ally').find(u=>!u.acted),target=E.alive(resumed,'enemy')[0];
 // Use a legal attack on the original map after reload, then save the committed command.
 const attackCell=E.reachable(resumed,a).find(p=>E.inRange({...a,...p},target));
 assert(attackCell);assert(E.act(resumed,a.id,attackCell,'attack',target.id).ok);
 assert.deepEqual(roundTrip(resumed).state,resumed);
 const cap=E.createGame();cap.units=cap.units.filter(u=>u.team==='ally');
 for(let i=0;i<5;i++){if(!E.canDeploy(cap)){E.endTurn(cap);assert.equal(cap.status,'playing');}assert(E.deploy(cap,E.reserves(cap)[0].id).ok);}
 assert.equal(E.alive(cap,'ally').length,5);assert(!E.canDeploy(roundTrip(cap).state));
});
