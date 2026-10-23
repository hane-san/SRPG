import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS} from '../data.js';
import * as E from '../engine.js';
import {readSave,writeSave} from '../save.js';
import {play} from './simulate.mjs';

const map02=()=>MAPS[1];
const byId=(m,id)=>m.enemies.find(e=>e.id===id);

test('map02 trial: north gate is contested but victory tile has a viable flank',()=>{
 const m=map02();
 assert.deepEqual(m.goal,{x:8,y:1});
 assert.deepEqual(m.base,{x:7,y:16});
 assert.deepEqual(m.south,{x:7,y:28});
 assert.deepEqual([byId(m,'boss').x,byId(m,'boss').y],[7,2]);
 assert.deepEqual([byId(m,'e4').x,byId(m,'e4').y],[4,3]);
 assert.deepEqual([byId(m,'e2').x,byId(m,'e2').y],[2,6]);
 assert.equal(byId(m,'boss').ai,'hold');
 assert.equal(byId(m,'e4').ai,'defend');
 assert.equal(m.enemies.length,10);
 // 2026-10-23 owner decision: the east road keeps a holding bow so the flank is not free.
 const east=byId(m,'e7');
 assert.deepEqual([east.x,east.y,east.type,east.ai],[13,4,'bow','hold']);
 // 2026-10-23 owner rule: the captain is off the castle, so one ordinary bow holds it.
 const guard=byId(m,'castle-guard');
 assert.deepEqual([guard.x,guard.y,guard.type,guard.ai],[8,1,'bow','hold']);assert.notEqual(guard.rank,'advanced');
 assert.equal(new Set(m.enemies.map(e=>e.id)).size,m.enemies.length);
 for(const e of m.enemies)assert(Number.isFinite(E.terrain({map:m},e)?.cost),e.id+' must stay on passable ground');
 assert.equal(new Set(m.enemies.map(e=>E.key(e))).size,m.enemies.length);
});

test('map02: guarded counteroffensive can complete while thoughtless full offense still loses its home',()=>{
 // Restore the prior main layout in-memory; compare with exactly the same engine/policy.
 const before=structuredClone(map02());before.enemies=before.enemies.filter(e=>!['castle-guard','e7'].includes(e.id));
 Object.assign(byId(before,'boss'),{x:8,y:1});
 Object.assign(byId(before,'e4'),{x:7,y:4});
 Object.assign(byId(before,'e2'),{x:4,y:6});
 const original=play(1,'advance',{},32,[],before).result;
 const revised=play(1,'advance',{},32).result;
 const careful=play(1,'cautious',{},32).result;
 const reckless=play(1,'offense',{},32).result;
 assert.equal(original.status,'timeout','baseline must expose the long castle-gate stalemate');
 assert.equal(revised.status,'victory','the ordinary counteroffensive must reach the north castle');
 assert(revised.turn<original.turn,'new path should resolve sooner');
 assert(revised.turn<=16,'more than sixteen turns would erase the intended tempo gain');
 assert(revised.tactical.allyDeaths.length<=2,'early named losses should not be the price of the rescue');
 assert.equal(careful.status,'victory','defending cautiously must have a viable outcome');
 const replacement=play(1,'advance',{},32,['a1']);
 assert.equal(replacement.result.status,'victory','losing the named shield before chapter 2 should not erase this known route');
 assert(replacement.s.units.some(u=>u.id==='general-a1'),'a generic unit must replace the named shield');
 assert.equal(reckless.status,'defeat','abandoning the central base should remain dangerous');
 assert.equal(reckless.tactical.base.fallen,true);
});

test('old valid 0.8 battle positions reload after changing map02 enemy home positions',()=>{
 const s=E.createGame(1);
 // A mid-battle save created before the map edit still remembers the existing actors (and has no castle-guard).
 s.units=s.units.filter(u=>!['castle-guard','e7'].includes(u.id));
 Object.assign(s.units.find(u=>u.id==='boss'),{x:8,y:1});
 Object.assign(s.units.find(u=>u.id==='e4'),{x:7,y:4});
 const storage=new Map(),adapter={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 assert.equal(writeSave(adapter,'0.8.0',s,true),true);
 const restored=readSave(adapter,'0.8.0',MAPS);
 assert(restored,'a legal prior v0.8 save must remain readable');
 assert.deepEqual([restored.state.units.find(u=>u.id==='boss').x,restored.state.units.find(u=>u.id==='boss').y],[8,1]);
 assert.deepEqual([restored.state.units.find(u=>u.id==='e4').x,restored.state.units.find(u=>u.id==='e4').y],[7,4]);
 assert.deepEqual([byId(restored.state.map,'boss').x,byId(restored.state.map,'boss').y],[7,2]);
 assert(!restored.state.units.some(u=>u.id==='castle-guard'),'an old battle is not given a new unit mid-fight');
 assert.equal(restored.state.status,'playing');
});

test('map02 castle garrison: the gate captain no longer leaves an empty castle',()=>{
 const garrisoned=play(1,'advance',{},32).result;
 assert.equal(garrisoned.status,'victory');
 // The guard must actually be fought: it is defeated before the castle is taken.
 const {s}=play(1,'advance',{},32);assert.equal(s.units.find(u=>u.id==='castle-guard').alive,false);
 assert(E.createGame(1).units.some(u=>u.id==='castle-guard'&&u.x===8&&u.y===1&&u.alive));
 const east=play(1,'east',{},32).result;
 assert.equal(east.status,'victory','the east flank remains a viable route to the guarded castle');
 // Owner decision 2026-10-23: the flank is an alternative, not the free fastest line.
 assert(east.turn>garrisoned.turn,'the east flank must cost more time than the central counteroffensive');
 assert(east.tactical.allyDeaths.length>=1,'the east flank must carry real risk');
});
