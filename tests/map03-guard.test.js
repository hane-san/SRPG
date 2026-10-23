import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS} from '../data.js';
import * as E from '../engine.js';
import {readSave,writeSave} from '../save.js';
import {play} from './simulate.mjs';
// Layout before the 2026-10-23 castle-garrison change: captain on the castle, e5 on the
// central road, e3 just north of the east bridge and no castle-guard.
const beforeGarrison=()=>{const m=structuredClone(MAPS[2]);m.enemies=m.enemies.filter(e=>e.id!=='castle-guard');
 Object.assign(m.enemies.find(e=>e.id==='boss'),{x:7,y:1});Object.assign(m.enemies.find(e=>e.id==='e5'),{x:7,y:5});Object.assign(m.enemies.find(e=>e.id==='e3'),{x:10,y:10});return m;};
// Layout before the guard trial (#59): the same, with e1 and e3 still advancing.
const previous=()=>{const m=beforeGarrison();m.enemies[0].ai=m.enemies[2].ai='advance';return m;};
test('03 guard trial preserves the complete battlefield and announced events',()=>{
 const current=beforeGarrison(),old=previous();
 assert.equal(current.enemies[0].ai,'hold');assert.equal(current.enemies[2].ai,'defend');
 current.enemies[0].ai=current.enemies[2].ai='advance';
 assert.deepEqual(current,old);
 assert.deepEqual([current.w,current.h,current.camp,current.cannon,current.maxWaves],[14,26,{x:6,y:22},{x:7,y:2},2]);
});
test('03 measured standard and careful progress replace long stalemates without erasing the cost of rushing',()=>{
 for(const policy of ['advance','cautious']){
  const old=play(2,policy,{},35,[],previous()).result,next=play(2,policy,{},35).result;
  assert.equal(old.status,'timeout');assert.equal(next.status,'victory');
  assert.ok(next.turn<=15);assert.ok(next.commands<old.commands);
  assert.ok(next.tactical.allyDeaths.length<=2);
  assert.equal(next.tactical.firstTurnEnemyAttacks,0);
  assert.ok(next.tactical.noCombatTurns.length<old.tactical.noCombatTurns.length);
  assert.ok(next.tactical.warnedAllyTurns>0);assert.ok(next.tactical.escapedBeforeImpact>0);
 }
 const rushed=play(2,'fast',{},35).result;
 assert.equal(rushed.status,'defeat');assert.ok(rushed.tactical.allyDeaths.length>2);
});
test('03 old v0.8 positions, HP, orders and warning cells survive the trial',()=>{
 // An old save has no castle-guard and keeps the captain on the castle.
 const s=E.createGame(2);s.map=previous();s.units=s.units.filter(u=>u.id!=='castle-guard');
 Object.assign(s.units.find(u=>u.id==='boss'),{x:7,y:1});Object.assign(s.units.find(u=>u.id==='e5'),{x:7,y:5});Object.assign(s.units.find(u=>u.id==='e3'),{x:10,y:10});
 for(const u of s.units.filter(u=>u.team==='enemy'&&['e1','e3'].includes(u.id)))u.ai='advance';
 s.turn=3;s.units.find(u=>u.id==='e1').hp=4;
 s.warnings=[{kind:'cannon',turn:3,cells:[{x:6,y:22}]}];
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 assert.ok(writeSave(storage,'0.8.0',s,true));
 const restored=readSave(storage,'0.8.0',MAPS);assert.ok(restored);
 assert.deepEqual(restored.state.units,s.units);assert.deepEqual(restored.state.warnings,s.warnings);
 assert.equal(restored.state.map.enemies[0].ai,'hold');assert.equal(restored.campaign,true);
 assert(!restored.state.units.some(u=>u.id==='castle-guard'),'an old battle is not given a new unit mid-fight');
 assert.deepEqual([restored.state.units.find(u=>u.id==='boss').x,restored.state.units.find(u=>u.id==='boss').y],[7,1]);
});
test('03 campaign can deploy replacement soldiers in the same named roster slots',()=>{
 const s=E.createGame(2,{},['a1','a2']);
 for(const id of ['a1','a2']){
  const replacement=s.units.find(u=>u.id==='general-'+id);assert.ok(replacement);assert.equal(replacement.named,false);
  assert.equal(replacement.maxHp,6);assert.equal(replacement.deployed,false);
 }
 assert.equal(E.deploymentLimit(s),2);assert.equal(E.alive(s,'ally').length,0);
});
test('03 announced barrages never catch a moving policy; any counted hit lands on the enemy',()=>{
 for(const policy of ['advance','cautious','fast','east']){
  const r=play(2,policy,{},35).result.tactical;
  assert.equal(r.allyCannonHitEvents,0,policy);
  // A victory in P1 of an impact turn ends the battle before P4, so that warning is neither hit nor counted as escaped.
  if(policy!=='fast'){const {result,trace}=play(2,policy,{},35),unresolved=result.status==='victory'?trace.at(-1).warnedUnits.length:0;assert.equal(result.tactical.escapedBeforeImpact+unresolved,result.tactical.warnedAllyTurns,policy);}
 }
 // A force that never moves is still shelled, so the warning keeps its teeth.
 assert.ok(play(2,'hold',{},35).result.tactical.allyCannonHitEvents>0);
});

test('03 castle garrison: the captain guards the gate and one ordinary bow holds the castle',()=>{
 const m=MAPS[2],at=(x,y)=>m.enemies.filter(e=>e.x===x&&e.y===y);
 assert.deepEqual(m.goal,{x:7,y:1});
 const [guard]=at(7,1);assert.equal(guard.id,'castle-guard');assert.equal(guard.type,'bow');assert.equal(guard.ai,'hold');assert.notEqual(guard.rank,'advanced');
 const boss=m.enemies.find(e=>e.id==='boss');assert.deepEqual([boss.x,boss.y,boss.ai,boss.rank],[7,2,'hold','advanced']);
 // e5 no longer plugs the central road, so a column on the road is not jammed behind a shield.
 const e5=m.enemies.find(e=>e.id==='e5');assert.notEqual(e5.x,7);
 for(let y=3;y<=12;y++)assert.equal(at(7,y).filter(e=>e.type==='shield').length,0,'no shield sits on the central road at y='+y);
 const s=E.createGame(2);assert(s.units.some(u=>u.id==='castle-guard'&&u.x===7&&u.y===1&&u.alive));
});
test('03 east bridge is a real rush lane: it wins at least as fast as the centre while a reckless rush still loses',()=>{
 const centre=play(2,'advance',{},35).result,east=play(2,'east',{},35),fast=play(2,'fast',{},35).result;
 assert.equal(east.result.status,'victory');assert(east.result.turn<=centre.turn,'east must not be slower than the centre');
 assert(east.result.tactical.bridgeCells.some(k=>k.startsWith('10,')||k.startsWith('11,')),'the east policy actually crosses the east bridge');
 assert(east.result.tactical.allyDeaths.length<=2);
 // Old layout: the same east rush was a slow, costly detour against the captain on the castle.
 const oldEast=play(2,'east',{},35,[],beforeGarrison()).result,oldCentre=play(2,'advance',{},35,[],beforeGarrison()).result;
 assert(oldEast.status!=='victory'||oldEast.turn>oldCentre.turn,'baseline: east used to be slower than the centre');
 assert(oldEast.status!=='victory'||oldEast.tactical.allyDeaths.length>east.result.tactical.allyDeaths.length);
 assert.equal(fast.status,'defeat');
});
