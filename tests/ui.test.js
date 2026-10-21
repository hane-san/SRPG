import test from 'node:test';
import assert from 'node:assert/strict';
import {createGesture,createHoldLock} from '../ui-input.js';
import {readSave,writeSave,STORAGE} from '../save.js';
import {createGame} from '../engine.js';
import {MAPS} from '../data.js';
const memory=()=>{const entries=new Map();return {getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)};};
test('map gestures accept one tap once and reject right drag even after returning',()=>{const g=createGesture();g.down(1,20,30);assert(g.up(1,22,31));assert(!g.up(1,22,31));g.down(2,20,30);g.move(2,45,30);g.move(2,20,30);assert(!g.up(2,20,30));g.down(3,20,30);assert(g.up(3,20,30),'next genuine tap must not be swallowed');});
test('scrolling, pointer cancellation and multiple fingers never select a unit',()=>{const g=createGesture();g.down(1,10,10,0,0);assert(!g.up(1,10,10,0,50));g.down(1,10,10);g.cancel(1);assert(!g.up(1,10,10));g.down(1,10,10);g.down(2,20,20);assert(!g.up(2,20,20));assert(!g.up(1,10,10));g.down(3,5,5);g.reset();assert(!g.up(3,5,5));});
test('stable P1 and finished phases restore, partial phase never overwrites stable save',()=>{const store=memory(),s=createGame(1);assert(writeSave(store,'test',s,true));const original=store.getItem(STORAGE);s.phase=2;assert(!writeSave(store,'test',s,true));assert.equal(store.getItem(STORAGE),original);s.status='defeat';assert(writeSave(store,'test',s,true));const resumed=readSave(store,'test',MAPS);assert.equal(resumed.state.status,'defeat');assert.equal(resumed.state.map.id,1);assert(resumed.campaign);});
test('old, unavailable and malformed storage resets safely without a crash',()=>{const store=memory(),s=createGame();writeSave(store,'test',s,false);assert.equal(readSave(store,'other',MAPS),null);store.setItem(STORAGE,'{bad');assert.equal(readSave(store,'test',MAPS),null);assert.equal(readSave({getItem(){throw Error('disabled');}},'test',MAPS),null);assert(!writeSave({setItem(){throw Error('quota');}},'test',s,false));s.units[0].hp=NaN;writeSave(store,'test',s,false);assert.equal(readSave(store,'test',MAPS),null);});
test('save uses release map rules and rejects duplicate units',()=>{const store=memory(),s=createGame();s.map.warnings='edited';writeSave(store,'test',s,false);const r=readSave(store,'test',MAPS);assert.equal(r.state.map.warnings,undefined);s.units.push({...s.units[0]});writeSave(store,'test',s,false);assert.equal(readSave(store,'test',MAPS),null);});

test('unknown class or skill cannot reach the UI from a save',()=>{for(const field of ['type','skill']){const store=memory(),s=createGame();s.units[0][field]='missing';writeSave(store,'test',s,false);assert.equal(readSave(store,'test',MAPS),null);}});

test('destination hold starts at the last legal tile, cancels stale timers and fires once',async()=>{
 const fired=[],hold=createHoldLock(18,k=>fired.push(k));
 hold.enter('5,15');await new Promise(r=>setTimeout(r,7));
 hold.enter('5,14');await new Promise(r=>setTimeout(r,13));
 assert.equal(hold.armed,false,'moving to another cell restarts the hold');
 await new Promise(r=>setTimeout(r,13));
 assert.equal(hold.armed,true);assert.deepEqual(fired,['5,14']);
 hold.enter('5,14');assert.deepEqual(fired,['5,14']);
 hold.reset();assert.equal(hold.armed,false);
 hold.enter('5,13');hold.reset();await new Promise(r=>setTimeout(r,25));
 assert.deepEqual(fired,['5,14'],'cancelled pointer must never arm later');
});
