import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as E from '../engine.js';
import {MAPS,unit} from '../data.js';
import {TERRAINS} from '../config.js';
import {readSave,writeSave} from '../save.js';
import {play} from './simulate.mjs';
const previous=JSON.parse(readFileSync(new URL('./fixtures/map01-before-38.json',import.meta.url))).map;
const expected=JSON.parse(readFileSync(new URL('./fixtures/map01-after-72.json',import.meta.url))).map;
const beforeBandit=JSON.parse(readFileSync(new URL('./fixtures/map01-current-38.json',import.meta.url))).map;
test('01 keeps every old route, guard and event; only the first patrol becomes a bandit',()=>{
 const e=expected.enemies.find(u=>u.id==='e1');
 assert.deepEqual(e,{id:'e1',name:'賊',type:'bandit',x:4,y:12,ai:'hold'});
 const normalized=structuredClone(expected);Object.assign(normalized.enemies.find(u=>u.id==='e1'),{name:'斥候',type:'sword'});
 assert.deepEqual(normalized,beforeBandit,'outside of this one deliberate patrol, map01 matches the previously approved stage');
 const s=E.createGame(0),rogue=E.alive(s,'enemy').find(u=>u.id==='e1');
 assert.equal(rogue.atk,1);assert.equal(rogue.maxHp,6);
});

test('map01 snapshot preserves all old passable coordinates and keeps both campaign anchors',()=>{
 const current=structuredClone(MAPS[0]);
 const first=current.enemies.find(u=>u.id==='e1');
 assert.deepEqual([first.type,first.name,first.x,first.y,first.ai],['bandit','賊',4,12,'hold']);
 Object.assign(first,{type:'sword',name:'斥候'}); // Exact historical fixture remains immutable.
 assert.deepEqual(current,expected,'only the approved e1 profession/name may differ from the pinned map');
 assert.equal(MAPS[0].w,previous.w);assert.equal(MAPS[0].h,previous.h);
 assert.deepEqual(MAPS[0].goal,previous.goal);assert.deepEqual(MAPS[0].camp,previous.camp);
 for(let y=0;y<previous.h;y++)for(let x=0;x<previous.w;x++)if(Number.isFinite(TERRAINS[previous.tiles[y][x]].cost))assert(Number.isFinite(TERRAINS[MAPS[0].tiles[y][x]].cost),`old occupied coordinate ${x},${y}`);
 assert.deepEqual(MAPS[0].enemies.map(u=>u.id),previous.enemies.map(u=>u.id));
});
test('novice policies and both explicit crossings win; offensive roster rewards fewer turns and orders',()=>{
 const results=Object.fromEntries(['advance','pause','basic','detour','west','central'].map(p=>[p,play(0,p).result]));
 for(const [p,r]of Object.entries(results)){assert.equal(r.status,'victory',p);assert(r.tactical.firstTurnEnemyAttacks<=1,p);assert(r.turn<=12,p);}
 assert(results.basic.turn<results.advance.turn);assert(results.basic.commands<results.advance.commands);
 assert.equal(results.basic.tactical.p3Effects,0,'the tutorial does not require P3');
 assert(results.central.turn<results.west.turn,'shorter central approach trades safety for time');
 assert.equal(results.west.tactical.allyDeaths.length,0);
 assert(results.west.tactical.bridgeCells.length>0);assert(results.west.tactical.bridgeCells.every(k=>Number(k.split(',')[0])<=3));
 assert(results.central.tactical.bridgeCells.length>0);assert(results.central.tactical.bridgeCells.every(k=>[5,6].includes(Number(k.split(',')[0]))));
});
test('old map01 battle positions, HP and pending warnings survive under the revised geometry',()=>{
 const s=E.createGame();s.map=structuredClone(previous);
 s.units=[...s.units.filter(u=>u.team==='ally'),...previous.enemies.map(e=>unit(e,'enemy',s.settings))];
 for(const [index,x]of [5,6,9].entries()){const u=s.units[index];Object.assign(u,{deployed:true,x,y:10,hp:3});}
 s.turn=4;s.deployedThisTurn=1;s.warnings=[{kind:'cannon',turn:6,cells:[{x:5,y:10},{x:9,y:11}]}];
 let value;const store={getItem:()=>value,setItem:(_k,v)=>value=v};assert(writeSave(store,'0.8.0',s,true));const restored=readSave(store,'0.8.0',MAPS);
 assert(restored?.campaign);assert.deepEqual(restored.state.units,s.units);assert.deepEqual(restored.state.warnings,s.warnings);assert.equal(restored.state.turn,4);
 assert.deepEqual(restored.state.map,MAPS[0]);assert.deepEqual(restored.state.metrics,s.metrics);
});
