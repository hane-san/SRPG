import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS} from '../data.js';
import * as E from '../engine.js';
import {readSave,writeSave} from '../save.js';
import {play} from './simulate.mjs';

const originalMap=()=>{
 const m=structuredClone(MAPS[3]);
 Object.assign(m.enemies[0],{y:29,ai:'advance'});
 Object.assign(m.enemies[3],{y:27,ai:'advance'});
 return m;
};

test('map04 second trial keeps all terrain, bridge topology and IDs; two guards move north',()=>{
 const m=MAPS[3],before=originalMap();
 assert.deepEqual(m.tiles,before.tiles);
 assert.deepEqual(m.goal,before.goal);
 assert.deepEqual(m.camp,before.camp);
 assert.equal(m.enemies.length,13);
 assert.deepEqual(m.enemies.map(e=>e.id),before.enemies.map(e=>e.id));
 assert.deepEqual(m.enemies.map(e=>e.type),before.enemies.map(e=>e.type));
 assert.deepEqual([m.enemies[0].x,m.enemies[0].y,m.enemies[0].ai],[6,24,'defend']);
 assert.deepEqual([m.enemies[3].x,m.enemies[3].y,m.enemies[3].ai],[9,22,'defend']);
 assert.equal(new Set(m.enemies.map(e=>E.key(e))).size,m.enemies.length);
 for(const u of m.enemies)assert(Number.isFinite(E.terrain({map:m},u)?.cost),u.id+' must stand on passable terrain');
});

test('map04 staggered defenders turn opening concentration into readable river fighting',()=>{
 const prior=originalMap();
 const original=play(3,'advance',{},34,[],prior).result;
 const next=play(3,'advance',{},34).result;
 const careful=play(3,'cautious',{},34).result;
 const fast=play(3,'fast',{},34).result;
 assert.equal(original.tactical.firstTurnEnemyAttacks,3);
 assert.equal(next.tactical.firstTurnEnemyAttacks,0,'player must be able to deploy before all guards collide');
 assert.equal(original.status,'timeout');
 assert.equal(next.status,'victory');
 assert(next.turn<original.turn);
 assert(next.tactical.allyDeaths.length<=3);
 assert.equal(careful.status,'victory','the river must also reward careful positioning');
 assert.equal(fast.status,'victory','a mobile sortie must remain viable');
 assert.equal(fast.tactical.p3Effects,0,'speed policy proves P3 is not mandatory to clear');
});

test('map04 previous v0.8 saves do not teleport enemies when guard homes change',()=>{
 const s=E.createGame(3);
 Object.assign(s.units.find(u=>u.id==='extra-3-0-0'),{y:29,ai:'advance'});
 Object.assign(s.units.find(u=>u.id==='extra-3-0-3'),{y:27,ai:'advance'});
 const storage=new Map(),adapter={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 assert(writeSave(adapter,'0.8.0',s,false));
 const restored=readSave(adapter,'0.8.0',MAPS);
 assert(restored);
 assert.equal(restored.state.units.find(u=>u.id==='extra-3-0-0').y,29);
 assert.equal(restored.state.units.find(u=>u.id==='extra-3-0-3').y,27);
 assert.equal(restored.state.map.enemies[0].y,24);
 assert.equal(restored.state.map.enemies[3].y,22);
 assert.equal(restored.state.status,'playing');
});
