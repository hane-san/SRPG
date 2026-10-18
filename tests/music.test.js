import test from 'node:test';
import {NEW_SCORES} from '../music-extra.js';
import assert from 'node:assert/strict';
import {SCORES,BONUS_SCORES,MUSIC_LIBRARY,MAP_TRACK_NUMBERS,assignedTrackNumber,trackNumber,trackByNumber,buildTrack,createMusic,scheduleNote,MUSIC_TRANSITION} from '../music.js';
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

test('phase changes fade out, leave silence and start at normal bus volume; previews ignore saved BGM mute',()=>{
 const old=globalThis.AudioContext;
 const contexts=[];
 const param=()=>({value:0,events:[],setValueAtTime(value,time){this.value=value;this.events.push(['set',value,time]);},linearRampToValueAtTime(value,time){this.value=value;this.events.push(['linear',value,time]);},exponentialRampToValueAtTime(value,time){this.value=value;this.events.push(['exponential',value,time]);},cancelScheduledValues(){},setTargetAtTime(value,time){this.value=value;this.events.push(['target',value,time]);}});
 class FakeAudio {
  constructor(){this.state='running';this.currentTime=10;this.gains=[];this.starts=[];contexts.push(this);}
  createGain(){const node={gain:param(),destination:null,connect(destination){this.destination=destination;},disconnect(){}};this.gains.push(node);return node;}
  createOscillator(){const owner=this;return {frequency:param(),connect(){},disconnect(){},start(time){owner.starts.push(time);},stop(){},onended:null};}
  createBiquadFilter(){return {frequency:{value:0},connect(){},disconnect(){}};}
  createStereoPanner(){return {pan:{value:0},connect(){},disconnect(){}};}
  createDynamicsCompressor(){return {threshold:{value:0},knee:{value:0},ratio:{value:0},connect(){},disconnect(){}};}
  resume(){this.state='running';return Promise.resolve();}
  suspend(){this.state='suspended';return Promise.resolve();}
  close(){this.state='closed';return Promise.resolve();}
 }
 globalThis.AudioContext=FakeAudio;let music;
 try{
  music=createMusic({getItem(){return null;},setItem(){}});
  music.setScene(0,1);music.setEnabled(true);
  const context=contexts[0],buses=()=>context.gains.filter(g=>g.destination===context.gains[0]);
  assert.equal(music.snapshot().scene,'0:ally');assert.equal(buses().length,1);
  const first=buses()[0],before=context.starts.length;
  music.setScene(0,2);
  const second=buses()[1],fade=first.gain.events.at(-1);
  assert.equal(fade[0],'linear');assert.equal(fade[1],0);
  assert(Math.abs(fade[2]-10-MUSIC_TRANSITION.fade)<1e-8);
  assert.deepEqual(second.gain.events,[['set',1,10]]);
  assert(context.starts.slice(before).length>0);
  assert(Math.min(...context.starts.slice(before))>=10+MUSIC_TRANSITION.fade+MUSIC_TRANSITION.silence-1e-8);
  const continued=music.snapshot().starts;
  music.setScene(0,3);music.setScene(0,4);assert.equal(music.snapshot().starts,continued);
  music.setEnabled(false);assert.equal(music.snapshot().scene,null);
  assert(music.playPreview(4,1));assert.equal(music.enabled,false);
  assert.equal(music.snapshot().preview,'4:ally');assert.equal(music.snapshot().scene,'4:ally');
  assert(music.playPreview(4,2));assert.equal(music.snapshot().preview,'4:hostile');
  music.stopPreview();assert.equal(music.snapshot().preview,null);assert.equal(music.snapshot().scene,null);
  music.setScene(1,1);music.setEnabled(true);
  const regular=music.snapshot().starts;
  music.playPreview(1,1);assert.equal(music.snapshot().starts,regular+1);
  music.stopPreview();assert.equal(music.snapshot().scene,'1:ally');
  assert.equal(music.snapshot().starts,regular+2);
 }finally{music?.destroy();if(old===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=old;}
});

test('seven contrasting sound-room-only themes provide fourteen complete original companion tracks',()=>{
 assert.equal(SCORES.length,6);
 assert.equal(BONUS_SCORES.length,7);
 assert.equal(MUSIC_LIBRARY.length,21);
 assert.deepEqual(MUSIC_LIBRARY.slice(0,6),SCORES);
 const titles=new Set(),notes=new Set(),moods=new Set(),tempos=new Set();
 for(let map=6;map<SCORES.length+BONUS_SCORES.length;map++){
  const score=MUSIC_LIBRARY[map];
  assert(score.mood&&score.name&&!moods.has(score.mood));
  moods.add(score.mood);
  for(const phase of [1,2]){
   const side=phase===1?'ally':'hostile',p=score[side],track=buildTrack(map,phase);
   assert(!titles.has(track.title));titles.add(track.title);
   assert(p.rhythm.length===8&&Math.abs(p.rhythm.reduce((a,b)=>a+b,0)-score.meter*2)<1e-9);
   assert.equal(track.mapId,map);
   assert(track.seconds>38&&track.seconds<85,track.title);
   assert(track.events.length>230,track.title);
   assert(track.events.every(e=>Number.isFinite(e.midi)&&e.midi>=24&&e.midi<=96&&e.beat>=0&&e.beat<track.beats&&e.duration>0&&e.velocity>0&&e.velocity<.5),track.title);
   assert(new Set(track.events.map(e=>e.voice)).size>=4);
   const sig=JSON.stringify(track.events.map(e=>[e.beat,e.midi,e.voice,e.velocity]));
   assert(!notes.has(sig),track.title);notes.add(sig);tempos.add(track.bpm);
   assert.deepEqual(track,buildTrack(map,phase===1?1:4));
  }
 }
 assert.equal(titles.size,14);
 assert(tempos.size>=11);
 const store={getItem(){return null;},setItem(){}},music=createMusic(store);
 music.setScene(0,1);assert.equal(music.enabled,false);
 assert(music.playPreview(12,2));assert.equal(music.snapshot().preview,'12:hostile');
 music.stopPreview();assert.equal(music.snapshot().preview,null);
 assert.equal(music.playPreview(21,1),false);
 music.destroy();
});

test('No.01–26 stay fixed and sixteen distinct sorrowful-heroic tracks extend to No.42',()=>{
 assert.equal(NEW_SCORES.length,8);
 assert.equal(MUSIC_LIBRARY.length,21);
 assert.deepEqual(MUSIC_LIBRARY.slice(0,6),SCORES);
 assert.deepEqual(MUSIC_LIBRARY.slice(6,13),BONUS_SCORES);
 assert.deepEqual(MUSIC_LIBRARY.slice(13),NEW_SCORES);
 assert.equal(MUSIC_LIBRARY[0].ally.title,'川霧を越えて');
 assert.equal(trackByNumber(1).title,'川霧を越えて');
 assert.equal(trackByNumber(26).title,'包囲網の圧迫');
 assert.equal(trackByNumber(27).title,'沈む陽を背に進め');
 assert.equal(trackByNumber(42).title,'運命を断つ槍');
 assert.equal(trackByNumber(0),null);
 assert.equal(trackByNumber(43),null);
 assert.equal(trackByNumber(1.5),null);
 const titles=new Set(),signatures=new Set();
 for(let n=1;n<=42;n++){
  const t=trackByNumber(n),side=n%2===1?1:2;
  assert.equal(trackNumber(t.mapId,side),n);
  assert.equal(t.number,n);
  assert(t.events.length>230);
  assert(t.events.every(e=>e.beat>=0&&e.beat<t.beats&&e.duration>0&&e.midi>=24&&e.midi<=96));
  assert(!titles.has(t.title),t.title);titles.add(t.title);
  const signature=JSON.stringify(t.events.map(e=>[e.beat,e.midi,e.voice,e.velocity]));
  assert(!signatures.has(signature),t.title);signatures.add(signature);
 }
 const moods=new Set();
 for(const sc of NEW_SCORES){
  assert(sc.mood&&!moods.has(sc.mood));moods.add(sc.mood);
  for(const part of [sc.ally,sc.hostile]){
   assert.equal(part.rhythm.length,8);
   assert(Math.abs(part.rhythm.reduce((a,b)=>a+b,0)-sc.meter*2)<1e-9);
  }
 }
});
test('map music assignments retain current tracks and can resolve any numbered candidate',()=>{
 assert.equal(MAP_TRACK_NUMBERS.length,6);
 for(let map=0;map<6;map++)for(const phase of [1,2,3,4]){
  const number=assignedTrackNumber(map,phase);
  assert.equal(number,trackNumber(map,phase));
  assert.equal(trackByNumber(number).title,buildTrack(map,phase).title);
 }
 const first=trackByNumber(37),last=trackByNumber(42);
 assert.equal(first.side,'ally');assert.equal(last.side,'hostile');
 assert.notEqual(first.title,last.title);
});
