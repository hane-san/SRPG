import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {MAPS} from '../data.js';
import {TERRAINS} from '../config.js';
import {tween} from '../playback.js';

test('editable maps keep legal geometry, deployments, and reachable objectives',()=>{
 for(const map of MAPS){
  const s=E.createGame(map.id);assert.equal(map.tiles.length,map.h);
  for(const row of map.tiles){assert.equal(row.length,map.w);for(const tile of row)assert(Object.hasOwn(TERRAINS,tile),`${map.id}: ${tile}`);}
  const ids=new Set(),cells=new Set();
  for(const u of s.units){assert(!ids.has(u.id));ids.add(u.id);assert(!cells.has(E.key(u)));cells.add(E.key(u));assert(Number.isFinite(E.terrain(s,u)?.cost));assert(u.hp>0&&u.range[0]>=1&&u.range[1]>=u.range[0]);}
  for(const p of [map.goal,map.base,map.south,...map.spawns].filter(Boolean))assert(Number.isFinite(E.terrain(s,p)?.cost));
  const empty={...s,units:[]},field=E.distanceField(empty,map.goal,'ally');
  for(const u of E.alive(s,'ally'))assert(field.has(E.key(u)),`${map.id}: ${u.id} cannot reach goal even on an empty map`);
 }
});
test('a later animation callback error rejects playback and cancels both scheduling paths',async()=>{
 const saved=Object.fromEntries(['document','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 let pending,canceled=0;
 try{
  globalThis.document={hidden:false};globalThis.requestAnimationFrame=fn=>{pending=fn;return 123;};globalThis.cancelAnimationFrame=()=>{canceled++;};
  let calls=0;const done=tween(1000,()=>{if(++calls===2)throw Error('drawing failed');});
  const check=assert.rejects(done,/drawing failed/);assert(pending);pending();await check;assert.equal(calls,2);assert(canceled>=2);
 }finally{for(const [k,descriptor]of Object.entries(saved)){if(descriptor)Object.defineProperty(globalThis,k,descriptor);else delete globalThis[k];}}
});

test('HP6 release refuses old rule-set saves and preserves fresh HP6 saves',async()=>{
 const {readSave,writeSave}=await import('../save.js');
 for(const m of MAPS){let value;const storage={getItem:()=>value,setItem:(_k,v)=>value=v};const s=E.createGame(m.id);
 writeSave(storage,'0.7.0',s,true);assert.equal(readSave(storage,'0.8.0',MAPS),null);
 writeSave(storage,'0.8.0',s,true);const saved=readSave(storage,'0.8.0',MAPS);assert(saved?.campaign);assert.deepEqual(saved.state,s);
 }
});

test('future map-wide ranges stay bounded by the map and exclude allies and blue movement',async()=>{
 const {tacticalRanges}=await import('../ui-model.js'),s=E.createGame(),u=s.units[0];u.range=[1,1e9];
 const {moves,attacks}=tacticalRanges(s,u);assert(attacks.size>0&&attacks.size<=s.map.w*s.map.h);
 for(const k of attacks){assert(!moves.has(k));const [x,y]=k.split(',').map(Number);assert(x>=0&&y>=0&&x<s.map.w&&y<s.map.h);assert.notEqual(E.at(s,{x,y})?.team,'ally');}
});
