import test from 'node:test';
import assert from 'node:assert/strict';
import {SCORES,buildTrack,createMusic,scheduleNote} from '../music.js';
test('six maps have twelve distinct complete scores; P2-P4 share one uninterrupted score',()=>{
 const signatures=new Set();for(let map=0;map<SCORES.length;map++){
  const ally=buildTrack(map,1),enemy=buildTrack(map,2);assert.notEqual(ally.title,enemy.title);assert.deepEqual(enemy,buildTrack(map,3));assert.deepEqual(enemy,buildTrack(map,4));
  for(const t of [ally,enemy]){signatures.add(JSON.stringify(t.events));assert(t.seconds>=45&&t.seconds<=90);assert(t.events.length>=200);assert(new Set(t.events.map(e=>e.voice)).size>=4);assert(t.events.every(e=>Number.isFinite(e.midi)&&e.midi>=24&&e.midi<=96&&e.beat>=0&&e.beat<t.beats&&e.duration>0&&e.velocity>0&&e.velocity<.5));}
 }assert.equal(signatures.size,12);
});
test('music defaults off, preferences are separate from effects and missing audio/storage never block play',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},music=createMusic(storage);assert(!music.enabled);music.setScene(0,1);music.unlock();assert.equal(music.snapshot().state,'locked');
 music.setEnabled(true);music.setVolume(.17);assert.equal(data.get('field-command-music'),'true');assert.equal(data.get('field-command-music-volume'),'0.17');assert(!data.has('field-command-sound'));
 const restored=createMusic(storage);assert(restored.enabled);assert.equal(restored.volume,.17);restored.setScene(2,3);restored.setEnabled(false);assert.equal(restored.snapshot().scene,null);restored.destroy();music.destroy();
 const bad=createMusic({getItem(){throw Error('blocked');},setItem(){throw Error('quota');}});assert.doesNotThrow(()=>{bad.setScene(5,2);bad.setEnabled(true);bad.unlock();bad.setVolume(0);bad.setScene(5,1,'victory');bad.destroy();});
});

test('synthesized BGM envelopes have no mid-note gain steps that cause clicks',()=>{
 const param=(events=[])=>({value:0,setValueAtTime(v,t){events.push(['set',v,t]);},linearRampToValueAtTime(v,t){events.push(['linear',v,t]);},exponentialRampToValueAtTime(v,t){events.push(['exponential',v,t]);}});
 for(const voice of ['flute','strings','horn','bass','pad','harp','drum']){
  const envelope=[];
  const context={currentTime:0,createGain(){return {gain:param(envelope),connect(){},disconnect(){}};},createBiquadFilter(){return {frequency:{value:0},connect(){},disconnect(){}};},createOscillator(){return {frequency:param(),connect(){},disconnect(){},start(){},stop(){},onended:null};},createStereoPanner(){return {pan:{value:0},connect(){},disconnect(){}};}};
  scheduleNote(context,{}, {voice,velocity:.25,duration:1,midi:69,pan:0},1,.5);
  assert.deepEqual(envelope.filter(([kind])=>kind==='set'),[['set',0,1]],voice);
  if(!['harp','drum'].includes(voice)){
   assert.deepEqual(envelope.map(([kind])=>kind),['set','linear','linear','linear'],voice);
   assert.equal(envelope[2][1],.25*.72);
  }
 }
});
