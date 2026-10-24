import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAPS,unit} from '../data.js';
import * as E from '../engine.js';
import {readSave,writeSave} from '../save.js';
import {play} from './simulate.mjs';
const before=JSON.parse(readFileSync(new URL('./fixtures/map04-before-66.json',import.meta.url))).map;
const after=JSON.parse(readFileSync(new URL('./fixtures/map04-after-72.json',import.meta.url))).map;
const lastApproved=JSON.parse(readFileSync(new URL('./fixtures/map04-current-66.json',import.meta.url))).map;
test('04 class pilot changes only the named auxiliary shield slot to a spear',()=>{
 const old=lastApproved.extraAllies[1],now=after.extraAllies[1];
 assert.deepEqual(old,{id:'aux-shield',name:'後衛槍隊',type:'shield'});
 assert.deepEqual(now,{id:'aux-shield',name:'後衛槍隊',type:'spear'});
 const normalized=structuredClone(after);normalized.extraAllies[1].type='shield';
 assert.deepEqual(normalized,lastApproved,'all other map04 terrain, enemies, events, counts and briefings remain byte-for-byte equivalent');
});

test('04 changes exactly sixteen water cells, six bank cells, three AI tags and one horse position',()=>{
 assert.deepEqual(MAPS[3],after,'pin the complete new map, including briefing');
 const current=structuredClone(after),changed=[];
 for(let y=0;y<before.h;y++)for(let x=0;x<before.w;x++)if(before.tiles[y][x]!==current.tiles[y][x])changed.push([x,y,before.tiles[y][x],current.tiles[y][x]]);
 const water=changed.filter(c=>c[2]==='~'),banks=changed.filter(c=>c[2]!=='~');
 assert.equal(water.length,16);assert.equal(banks.length,6);
 assert.deepEqual(water.map(c=>c.slice(0,2)),[12,13,25,26].flatMap(y=>[1,5,7,10].map(x=>[x,y])));
 assert.ok(water.every(c=>c[3]==='+'));assert.ok(banks.every(c=>c[3]==='='&&['.','f'].includes(c[2])));
 assert.deepEqual(banks.map(c=>c.slice(0,2)),[14,24,27].flatMap(y=>[5,7].map(x=>[x,y])));
 for(const i of [0,1,3]){assert.equal(current.enemies[i].ai,'hold');current.enemies[i].ai=before.enemies[i].ai;}
 assert.deepEqual([current.enemies[3].x,current.enemies[3].y],[9,21]);current.enemies[3].y=before.enemies[3].y;
 current.tiles=before.tiles;current.briefing=before.briefing;
 current.extraAllies=structuredClone(before.extraAllies); // #72 pilot checked separately above
 assert.deepEqual(current,before,'all other map rules and entity data are identical');
 for(let y=0;y<before.h;y++)for(let x=0;x<before.w;x++)if(Number.isFinite(E.terrain({map:before},{x,y}).cost))assert.ok(Number.isFinite(E.terrain({map:after},{x,y}).cost),'old passable '+x+','+y);
});

test('04 offers a faster mixed advance and lower-loss flanks, with real crossings on both rivers',()=>{
 const original=play(3,'advance',{},35,[],before).result;
 const mixed=play(3,'advance',{},35).result;
 assert.equal(original.status,'victory');assert.equal(mixed.status,'victory');
 assert.ok(mixed.turn<original.turn);assert.ok(mixed.commands<original.commands);
 assert.ok(mixed.tactical.allyDeaths.length<=original.tactical.allyDeaths.length);
 assert.equal(mixed.tactical.firstTurnEnemyAttacks,0);
 for(const policy of ['west','east']){
  const r=play(3,policy,{},35).result;
  assert.equal(r.status,'victory',policy);
  if(policy==='west'){
   assert.ok(r.turn>mixed.turn,'western regrouping takes longer');
   assert.ok(r.tactical.allyDeaths.length<mixed.tactical.allyDeaths.length,'western regrouping loses fewer');
  }else{
   assert.ok(r.turn<mixed.turn,'outer eastern flank is faster');
   assert.ok(r.tactical.allyDeaths.length<=mixed.tactical.allyDeaths.length,'eastern cost remains bounded');
  }
  assert.equal(r.tactical.firstTurnEnemyAttacks,0);
  const cells=r.tactical.bridgeCells.map(k=>k.split(',').map(Number));
  assert.deepEqual([...new Set(cells.map(c=>c[1]))].sort((a,b)=>a-b),[12,13,25,26]);
  assert.ok(cells.every(([x])=>policy==='west'?x<=3:x>=9),'selected side, no silent crossing swap');
 }
});

test('04 old v0.8 saves retain positions, HP and AI rather than applying the new guards retroactively',()=>{
 const s=E.createGame(3);s.map=structuredClone(before);
 s.units=[...s.units.filter(u=>u.team==='ally'),...before.enemies.map(e=>unit(e,'enemy',s.settings))];
 s.turn=3;Object.assign(s.units.find(u=>u.id==='a1'),{deployed:true,x:6,y:26,hp:4});
 s.units.find(u=>u.id==='extra-3-0-0').hp=3;
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 assert.ok(writeSave(storage,'0.8.0',s,false));
 const restored=readSave(storage,'0.8.0',MAPS);assert.ok(restored);
 assert.deepEqual(restored.state.units,s.units);assert.deepEqual(restored.state.warnings,s.warnings);
 assert.equal(restored.state.map.enemies[0].ai,'hold');
 assert.equal(restored.state.units.find(u=>u.id==='extra-3-0-0').ai,'defend');
 assert.equal(restored.campaign,false);
});
