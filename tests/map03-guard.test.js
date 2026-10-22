import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS} from '../data.js';
import * as E from '../engine.js';
import {readSave,writeSave} from '../save.js';
import {play} from './simulate.mjs';
const previous=()=>{const m=structuredClone(MAPS[2]);m.enemies[0].ai=m.enemies[2].ai='advance';return m;};
test('03 guard trial preserves the complete battlefield and announced events',()=>{
 const current=structuredClone(MAPS[2]),old=previous();
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
 const s=E.createGame(2);s.map=previous();
 for(const u of s.units.filter(u=>u.team==='enemy'&&['e1','e3'].includes(u.id)))u.ai='advance';
 s.turn=3;s.units.find(u=>u.id==='e1').hp=4;
 s.warnings=[{kind:'cannon',turn:3,cells:[{x:6,y:22}]}];
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 assert.ok(writeSave(storage,'0.8.0',s,true));
 const restored=readSave(storage,'0.8.0',MAPS);assert.ok(restored);
 assert.deepEqual(restored.state.units,s.units);assert.deepEqual(restored.state.warnings,s.warnings);
 assert.equal(restored.state.map.enemies[0].ai,'hold');assert.equal(restored.campaign,true);
});
test('03 campaign can deploy replacement soldiers in the same named roster slots',()=>{
 const s=E.createGame(2,{},['a1','a2']);
 for(const id of ['a1','a2']){
  const replacement=s.units.find(u=>u.id==='general-'+id);assert.ok(replacement);assert.equal(replacement.named,false);
  assert.equal(replacement.maxHp,6);assert.equal(replacement.deployed,false);
 }
 assert.equal(E.deploymentLimit(s),2);assert.equal(E.alive(s,'ally').length,0);
});
