import test from 'node:test';
import assert from 'node:assert/strict';
import {gemPlan,gemHP,gemSchedule} from '../gem-effects.js';
import {createAudio} from '../audio.js';
test('each real lost HP breaks one, and only one, of the six gems',()=>{
 for(const damage of [1,2,3,4,5,6]){
  const p=gemPlan(6,6-damage,damage);
  assert.equal(p.count,damage);assert.equal(p.lethal,damage===6);
  assert.deepEqual(Array.from({length:damage+1},(_,i)=>gemHP(p,i)),Array.from({length:damage+1},(_,i)=>6-i));
  assert.equal(p.heavy,damage>=4);
 }
});
test('heavy overkill keeps heavy impact but shatters no more gems than remain',()=>{
 const p=gemPlan(2,0,5,{armoured:true,ally:true});
 assert.equal(p.count,2);assert.equal(p.start,2);assert.equal(p.end,0);assert(p.heavy&&p.lethal&&p.armoured&&p.ally);
 assert.deepEqual([gemHP(p,0),gemHP(p,1),gemHP(p,2),gemHP(p,6)],[2,1,0,0]);
});
test('armour changes sound identity, never the actual pip count',()=>{
 const p=gemPlan(6,4,2,{armoured:true});
 assert.equal(p.count,2);assert(p.armoured);assert(!p.heavy);
});
test('healing grows jewels one by one but never beyond HP6',()=>{
 const p=gemPlan(4,6,5,{heal:true});
 assert.equal(p.count,2);assert(!p.heavy&&!p.lethal);
 assert.deepEqual([gemHP(p,0),gemHP(p,1),gemHP(p,2)],[4,5,6]);
 assert.equal(gemPlan(6,6,2,{heal:true}).count,0);
});
test('fast and reduced motion shorten animation without changing jewel counts',()=>{
 for(const options of [{},{armoured:true},{heal:true}]){
  const p=options.heal?gemPlan(2,6,4,options):gemPlan(6,2,4,options),normal=gemSchedule(p),quick=gemSchedule(p,true),reduced=gemSchedule(p,false,true);
  assert(quick.intervalMs<normal.intervalMs);assert(reduced.intervalMs<normal.intervalMs);
  assert.equal(quick.hitStopMs,0);assert.equal(reduced.hitStopMs,0);assert.equal(p.count,4);
 }
});

test('two-point impacts have a stronger attack body and exactly two jewel transients',()=>{
 const original=globalThis.AudioContext,events=[];
 class FakeAudioContext{
  constructor(){this.currentTime=0;this.sampleRate=22050;this.state='running';this.destination={};}
  createOscillator(){return {frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){},disconnect(){}};}
  createGain(){return {gain:{setValueAtTime(v){events.push({kind:'gain',v});},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  createBuffer(_channels,len){return {getChannelData(){return new Float32Array(len);}};}
  createBufferSource(){events.push({kind:'burst'});return {connect(){},start(){},stop(){},disconnect(){}};}
  createBiquadFilter(){return {frequency:{value:0},connect(){},disconnect(){}};}
 }
 try{
  globalThis.AudioContext=FakeAudioContext;
  const audio=createAudio({getItem:()=>null,setItem(){}});
  audio.unlock();audio.play('gem-impact',1);
  const normalPeak=Math.max(...events.filter(e=>e.kind==='gain').map(e=>e.v));
  events.length=0;audio.play('gem-impact',2);
  const doublePeak=Math.max(...events.filter(e=>e.kind==='gain').map(e=>e.v));
  assert(doublePeak>normalPeak,'ordinary 2-point strikes have a distinct punchier attack');
  events.length=0;audio.play('gem-chain',2,false,{intervalMs:74});
  assert.equal(events.filter(e=>e.kind==='burst').length,2,'two damage must contain exactly two crack transients');
  events.length=0;audio.play('gem-chain',1,false,{intervalMs:74});
  assert.equal(events.filter(e=>e.kind==='burst').length,1);
 }finally{
  if(original===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=original;
 }
});
