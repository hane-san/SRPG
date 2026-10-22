import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS} from '../data.js';
import * as E from '../engine.js';
import {TERRAINS} from '../config.js';
import {readSave,writeSave} from '../save.js';
import {play} from './simulate.mjs';
import {readFileSync} from 'node:fs';
const historical=JSON.parse(readFileSync(new URL('./fixtures/issue17-enemies-before.json',import.meta.url))).terrain[4];

// Issue #61: rebuild main 74ca3b3's map 05 from the current one.
const previous=()=>{
 const m=structuredClone(MAPS[4]),g=m.tiles.map(r=>[...r]);
 for(const y of [9,10,18,19])for(const x of [7,8])g[y][x]='=';
 m.tiles=g.map(r=>r.join(''));
 const old={'extra-4-2-0':[5,7],'extra-4-2-1':[4,5],'extra-4-2-2':[11,6],'extra-4-2-3':[12,4],boss:[8,1]};
 for(const e of m.enemies)if(old[e.id])Object.assign(e,{x:old[e.id][0],y:old[e.id][1]});
 return m;
};
const passable=t=>Number.isFinite(TERRAINS[t].cost);
const weatherOf=(m,turn)=>m.weatherCycle[(turn-1)%m.weatherCycle.length];

test('05 keeps size, castles, rain cycle, enemy IDs/types and never closes an old passable cell',()=>{
 const m=MAPS[4],old=previous();
 assert.deepEqual(old.tiles,historical,'the reconstructed old map is the pinned historical terrain');
 assert.deepEqual([m.w,m.h,m.goal,m.camp,m.weatherCycle],[old.w,old.h,old.goal,old.camp,old.weatherCycle]);
 assert.deepEqual(m.enemies.map(e=>[e.id,e.type,e.ai]),old.enemies.map(e=>[e.id,e.type,e.ai]));
 assert.equal(m.enemies.length,13);assert.equal(m.extraAllies.length,2);
 const changed=[];
 for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){
  if(passable(old.tiles[y][x]))assert(passable(m.tiles[y][x]),`${x},${y} must stay passable`);
  if(m.tiles[y][x]!==old.tiles[y][x])changed.push(`${x},${y}:${m.tiles[y][x]}`);
 }
 assert.deepEqual(changed.sort(),['7,10:f','7,18:f','7,19:f','7,9:f','8,10:f','8,18:f','8,19:f','8,9:f'].sort());
 assert.equal(m.tiles[27][7],'=','the south crossing beside the sortie castle stays a road');
 assert.deepEqual(m.enemies.find(e=>e.id==='boss'),{...old.enemies.find(e=>e.id==='boss'),y:2});
 for(const e of m.enemies)assert(passable(m.tiles[e.y][e.x]),e.id);
});

test('05 forest gates close for foot units in heavy rain and open in clear weather',()=>{
 const s=E.createGame(4),shield=s.units.find(u=>u.id==='a1');
 Object.assign(shield,{deployed:true,x:6,y:18});
 s.turn=1;assert(E.reachable(s,shield).some(p=>p.x===8&&p.y===18),'clear: a shield reaches the far side of the gate');
 s.turn=4;assert.equal(E.weatherAt(s),'heavy');
 assert(!E.reachable(s,shield).some(p=>p.x===7&&p.y===18),'heavy rain: a shield cannot step into the gate');
});

test('05 measured policies: stalls become wins, rain turns keep fighting, clear turns carry the advance',()=>{
 const old=previous();
 const before={advance:play(4,'advance',{},35,[],old).result,cautious:play(4,'cautious',{},35,[],old).result,rain:play(4,'rain',{},35,[],old).result};
 assert.equal(before.cautious.status,'timeout');assert.equal(before.rain.status,'timeout');
 const runs={};
 for(const policy of ['advance','cautious','rain','east','fast']){
  const {result,trace}=play(4,policy,{},35);runs[policy]=result;
  assert.equal(result.status,'victory',policy);
  assert(result.turn<=21,policy);
  // Combat or P3 happens in every rainy stretch; the march concentrates in clear weather.
  const by=w=>trace.filter(t=>weatherOf(MAPS[4],t.turn)===w);
  assert(by('heavy').some(t=>t.hits||t.p3),policy+' heavy rain is not an empty wait');
  const avg=(ts,k)=>ts.reduce((n,t)=>n+t[k],0)/Math.max(1,ts.length);
  assert(avg(by('clear'),'advanceSteps')>avg(by('heavy'),'advanceSteps'),policy+' advances mostly while clear');
 }
 assert(runs.advance.turn<before.advance.turn);assert(runs.advance.tactical.noCombatTurns.length<before.advance.tactical.noCombatTurns.length);
 assert(runs.advance.tactical.firstTurnEnemyAttacks<=1);
 assert.equal(runs.rain.tactical.allyDeaths.length,0,'stopping in heavy rain with P3 support keeps every unit');
 assert(runs.rain.tactical.p3Effects>0);
 assert(runs.fast.tactical.allyDeaths.length>runs.rain.tactical.allyDeaths.length,'rushing cavalry without P3 costs units');
 assert.equal(runs.fast.tactical.p3Effects,0,'P3 is not mandatory to win');
});

test('05 old v0.8 saves keep enemy positions and HP; only the map definition is current',()=>{
 const s=E.createGame(4);s.map=previous();
 for(const e of s.map.enemies){const u=s.units.find(u=>u.id===e.id);Object.assign(u,{x:e.x,y:e.y});}
 s.turn=4;s.units.find(u=>u.id==='boss').hp=5;
 const a1=s.units.find(u=>u.id==='a1');Object.assign(a1,{deployed:true,x:7,y:18,hp:4});
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 assert(writeSave(storage,'0.8.0',s,false));
 const restored=readSave(storage,'0.8.0',MAPS);assert(restored);
 assert.deepEqual(restored.state.units,s.units);
 assert.deepEqual(restored.state.units.find(u=>u.id==='boss'),{...s.units.find(u=>u.id==='boss'),x:8,y:1,hp:5});
 assert.equal(restored.state.map.tiles[18][7],'f');assert.equal(restored.state.map.enemies.find(e=>e.id==='boss').y,2);
 assert.equal(restored.state.status,'playing');
});
