import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAPS} from '../data.js';
import * as E from '../engine.js';
import {TERRAINS} from '../config.js';
import {readSave,writeSave} from '../save.js';
import {play} from './simulate.mjs';

// Issue #63: main 74ca3b3's map 06 (terrain is the pinned historical fixture).
const historical=JSON.parse(readFileSync(new URL('./fixtures/issue17-enemies-before.json',import.meta.url))).terrain[5];
const OLD=[[7,32,'defend'],[6,31,'defend'],[2,33,'advance'],[11,32,'defend'],[7,24,'defend'],[6,23,'defend'],[2,23,'defend'],[11,22,'defend'],[7,10,'advance'],[2,9,'defend'],[11,8,'defend'],[7,6,'defend'],[7,1,'hold']];
const previous=()=>{
 const m=structuredClone(MAPS[5]);m.tiles=[...historical];m.south=null;m.spawns=[{x:2,y:20},{x:11,y:9}];
 m.enemies=m.enemies.map((e,i)=>OLD[i]?{...e,x:OLD[i][0],y:OLD[i][1],ai:OLD[i][2]}:e);return m;
};
const passable=t=>Number.isFinite(TERRAINS[t].cost);

test('06 keeps size, castles, rules and IDs; only opens fords and adds the south castle post',()=>{
 const m=MAPS[5],old=previous();
 assert.deepEqual([m.w,m.h,m.goal,m.camp,m.cannon,m.maxWaves],[14,44,{x:7,y:1},{x:7,y:37},{x:7,y:2},2]);
 assert.deepEqual(m.enemies.map(e=>[e.id,e.type]),old.enemies.map(e=>[e.id,e.type]));
 assert.equal(m.enemies.length,15);assert.equal(m.extraAllies.length,4);
 for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){
  if(passable(old.tiles[y][x]))assert(passable(m.tiles[y][x]),`${x},${y} must stay passable`);
  if(m.tiles[y][x]!==old.tiles[y][x])assert(m.tiles[y][x]==='+'&&old.tiles[y][x]==='~'||x===2&&y===21&&m.tiles[y][x]==='c',`${x},${y} unexpected change`);
 }
 for(const y of [14,29])for(const x of [6,7,8])assert.equal(m.tiles[y][x],'+','central crossings are three wide');
 assert.deepEqual(m.south,{x:2,y:21});
 for(const p of m.spawns)assert(E.dist(p,m.south)<=2,'reinforcement flags stand beside the south castle');
 for(const e of m.enemies)assert(passable(m.tiles[e.y][e.x]),e.id);
 assert.deepEqual(m.enemies.find(e=>e.id==='boss'),{...old.enemies.find(e=>e.id==='boss'),y:2});
});

test('06 three phases: no opening strike, every tested plan finishes, and the plans trade speed for losses',()=>{
 const before={advance:play(5,'advance',{},35,[],previous()).result,cautious:play(5,'cautious',{},35,[],previous()).result};
 assert.equal(before.advance.status,'timeout');assert.equal(before.cautious.status,'defeat');
 assert.equal(before.advance.tactical.firstTurnEnemyAttacks,3);
 const r=Object.fromEntries(['advance','cautious','fast','south','line'].map(p=>[p,play(5,p,{},35).result]));
 for(const [p,x] of Object.entries(r))assert.equal(x.status,'victory',p);
 assert.equal(r.advance.tactical.firstTurnEnemyAttacks,0);
 // Heading for the south castle meets the waves at their flags and takes the post: slower but safe.
 assert.equal(r.south.southTaken,true);assert.equal(r.south.tactical.allyDeaths.length,0);
 // Driving straight up the centre is the fastest plan but costs units.
 assert(r.line.turn<r.south.turn);assert(r.line.tactical.allyDeaths.length>r.south.tactical.allyDeaths.length);
 // Ignoring both ideas is neither fast nor safe.
 for(const p of ['advance','cautious','fast'])assert(r[p].turn>r.line.turn&&r[p].tactical.allyDeaths.length>r.south.tactical.allyDeaths.length,p);
});

test('06 reinforcements are announced on visible flags before they arrive and stop once the south castle falls',()=>{
 const s=E.createGame(5);s.turn=3;s.phase=4;E.eventPhase(s);
 const w=s.warnings.find(w=>w.kind==='spawn');assert(w);assert.equal(w.turn,4);assert.deepEqual(w.cells,MAPS[5].spawns);
 const t=E.createGame(5);t.southTaken=true;t.turn=3;t.phase=4;E.eventPhase(t);assert(!t.warnings.some(w=>w.kind==='spawn'));
});

test('06 old v0.8 saves keep positions, HP and announced warnings',()=>{
 const s=E.createGame(5),old=previous();
 for(const e of old.enemies){const u=s.units.find(u=>u.id===e.id);Object.assign(u,{x:e.x,y:e.y,ai:e.ai});}
 const a1=s.units.find(u=>u.id==='a1');Object.assign(a1,{deployed:true,x:7,y:33,hp:4});
 s.turn=3;s.warnings=[{kind:'spawn',turn:4,cells:[{x:2,y:20},{x:11,y:9}]},{kind:'cannon',turn:3,cells:[{x:7,y:33}]}];
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 assert(writeSave(storage,'0.8.0',s,false));
 const restored=readSave(storage,'0.8.0',MAPS);assert(restored);
 assert.deepEqual(restored.state.units,s.units);assert.deepEqual(restored.state.warnings,s.warnings);
 assert.deepEqual(restored.state.map.south,{x:2,y:21});assert.equal(restored.state.status,'playing');
});
