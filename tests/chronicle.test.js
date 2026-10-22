import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../engine.js';
import {MAPS} from '../data.js';
import {readSave,writeSave,STORAGE} from '../save.js';
import {chapterRecord,appendChapter,sanitizeChronicle,chronicleLines} from '../chronicle.js';

const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))};};

test('a finished chapter becomes a short war record without touching the battle state',()=>{
 const s=createGame(1);s.status='victory';s.turn=14;s.metrics.commands=40;s.southTaken=true;
 const named=s.units.find(u=>u.team==='ally'&&u.named);named.alive=false;named.hp=0;s.metrics.deaths.push({turn:9,id:named.id,reason:'e1'});
 const before=structuredClone(s),r=chapterRecord(s);
 assert.deepEqual(s,before,'recording is read-only');
 assert.equal(r.map,1);assert.equal(r.turn,14);assert.equal(r.commands,40);assert.equal(r.fallen,1);
 assert.deepEqual(r.namedFallen,[named.name]);assert.equal(r.southTaken,true);
 const [line]=chronicleLines([r]);
 assert.match(line.summary,/T14で制圧/);assert.match(line.summary,/南城を先に制圧/);assert.match(line.memory,new RegExp(named.name));
 assert.equal(chapterRecord(createGame(0)).southTaken,null,'maps without a south castle say nothing about it');
});
test('the record follows the campaign and a replayed chapter replaces its old entry',()=>{
 const one=createGame(0);one.status='victory';one.turn=7;
 let list=appendChapter([],one);
 const two=createGame(1,{},[],{chronicle:list});assert.deepEqual(two.chronicle,list,'the next chapter starts with the record');
 two.status='victory';two.turn=20;list=appendChapter(two.chronicle,two);
 assert.deepEqual(list.map(r=>r.map),[0,1]);
 two.turn=18;list=appendChapter(list,two);
 assert.deepEqual(list.map(r=>[r.map,r.turn]),[[0,7],[1,18]]);
});
test('saves keep the record, old saves get an empty one and bad entries are dropped',()=>{
 const store=memory(),s=createGame(1);s.chronicle=[chapterRecord(Object.assign(createGame(0),{status:'victory',turn:8}))];
 assert(writeSave(store,'0.8.0',s,true));
 assert.equal(readSave(store,'0.8.0',MAPS).state.chronicle[0].turn,8);
 const old=JSON.parse(store.getItem(STORAGE));delete old.state.chronicle;store.setItem(STORAGE,JSON.stringify(old));
 const restored=readSave(store,'0.8.0',MAPS);assert(restored,'a pre-record save still loads');assert.deepEqual(restored.state.chronicle,[]);
 assert.deepEqual(sanitizeChronicle([{map:9,turn:1},null,'x',{map:0,turn:0}]),[]);
});
