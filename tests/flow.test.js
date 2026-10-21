import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {unit,MAPS} from '../data.js';
import {slideDraft,tacticalRanges} from '../ui-model.js';
import {createAudio} from '../audio.js';
import {readSave,writeSave} from '../save.js';

test('continuous slide keeps its route endpoint when entering an enemy and can choose an approach',()=>{
 const s=E.createGame(),u=s.units.find(u=>u.id==='a2');s.units.find(a=>a.id==='a1').x=5;u.x=6;u.y=16;const original=structuredClone(s);
 const move=slideDraft(s,u,{x:6,y:13});assert.equal(move.route.length,4);
 const aim=slideDraft(s,u,{x:6,y:12},move.dest);assert.deepEqual(aim.dest,move.dest);assert.deepEqual(aim.route,move.route);assert.equal(aim.target,'e1');
 const jump=slideDraft(s,u,{x:6,y:12});assert.deepEqual(jump.dest,{x:6,y:13});
 const tooFar=slideDraft(s,u,{x:5,y:8});assert.equal(tooFar.target,null);assert(tooFar.attackError.includes('移動しても届きません'));assert.equal(slideDraft(s,u,{x:0,y:0}),null);
 assert.deepEqual(s,original,'preview never changes rules or spends an action');
});
test('presentation events separate legal movement, attack and counter HP changes',()=>{
 const s=E.createGame();s.map.tiles=Array(20).fill('.'.repeat(12));
 s.units=[unit({id:'a',name:'ally',type:'sword',x:3,y:5},'ally'),unit({id:'e',name:'enemy',type:'sword',x:3,y:2,ai:'hold'},'enemy')];
 const baseline=structuredClone(s),frames=[];E.act(s,'a',{x:3,y:3},'attack','e',(state,actor,event)=>frames.push({state:structuredClone(state),event}));
 E.act(baseline,'a',{x:3,y:3},'attack','e');assert.deepEqual(s,baseline);
 assert.deepEqual(frames.map(f=>f.event.kind),['move','hit','hit']);
 assert.deepEqual(frames[0].event.path,[{x:3,y:5},{x:3,y:4},{x:3,y:3}]);
 assert.equal(frames[1].state.units[0].hp,6);assert.equal(frames[1].state.units[1].hp,4);
 assert.equal(frames[2].event.actor,'e');assert(frames[2].event.counter);assert.equal(frames[2].state.units[0].hp,4);
});
test('lethal attacks and P3 attacks never fabricate a counter event',()=>{
 for(const support of [false,true]){
  const s=E.createGame();s.units=[unit({id:'a',name:'a',type:support?'shooter':'sword',x:3,y:5},'ally'),unit({id:'e',name:'e',type:'sword',x:3,y:support?3:4,ai:'hold'},'enemy')];
  const hits=[];if(support){E.act(s,'a',s.units[0],'wait');E.prepareEnemy(s);E.supportPhase(s,(_s,_u,e)=>{if(e.kind==='hit')hits.push(e);});}
  else{s.units[1].hp=1;E.act(s,'a',s.units[0],'attack','e',(_s,_u,e)=>hits.push(e));}
  assert.equal(hits.length,1);assert(!hits[0].counter);
 }
});
test('enemy move events follow adjacent traversable tiles, one actor at a time',()=>{
 for(let id=0;id<MAPS.length;id++){
  const s=E.createGame(id),events=[];E.prepareEnemy(s);E.enemyPhase(s,(state,actor,event)=>{if(event.kind==='move')events.push({event,actor:structuredClone(actor),state:structuredClone(state)});});
  for(const {event,actor,state} of events){assert(event.path.length>1);assert.deepEqual(event.path.at(-1),{x:actor.x,y:actor.y});for(let i=1;i<event.path.length;i++){assert.equal(E.dist(event.path[i-1],event.path[i]),1);assert(Number.isFinite(E.terrain(state,event.path[i]).cost));}}
  assert(events.length);
 }
});
test('sound unavailable or storage disabled never blocks play; mute preference persists',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const a=createAudio(storage);a.unlock();a.play('hit');assert.equal(a.toggle(),false);assert.equal(createAudio(storage).enabled,false);
 const unavailable=createAudio({getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}});assert.doesNotThrow(()=>{unavailable.unlock();unavailable.play('confirm');unavailable.toggle();});
});
test('0.4 accepts stable 0.2 and 0.3 saves without changing the roster or actions',()=>{
 for(const release of ['0.2.0','0.3.0']){let value;const storage={setItem:(_k,v)=>{value=v;},getItem:()=>value},s=E.createGame(1,{},['a2']);E.act(s,'a1',s.units[0],'wait');writeSave(storage,release,s,true);const read=readSave(storage,'0.4.0',MAPS);assert(read.campaign);assert.deepEqual(read.state,s);}
});


test('0.5 preserves stable prior saves and all added battlefield saves',()=>{
 for(const release of ['0.2.0','0.3.0','0.4.0','0.5.0'])for(const m of MAPS){let value;const storage={setItem:(_k,v)=>value=v,getItem:()=>value},s=E.createGame(m.id);writeSave(storage,release,s,false);assert.deepEqual(readSave(storage,'0.5.0',MAPS).state,s);}
});

test('a drawn endpoint never moves to make an out-of-range enemy attackable',()=>{
 const s=E.createGame(),u=s.units.find(u=>u.id==='a2');s.units.find(a=>a.id==='a1').x=5;u.x=6;u.y=16;const draft=slideDraft(s,u,{x:6,y:14});
 const aim=slideDraft(s,u,{x:6,y:12},draft.dest,{preserve:true,route:draft.route});assert.deepEqual(aim.dest,draft.dest);assert.deepEqual(aim.route,draft.route);assert.equal(aim.target,null);assert(aim.attackError);
 const hit=slideDraft(s,u,{x:6,y:12},{x:6,y:13},{preserve:true,route:E.routeTo(s,u,{x:6,y:13})});assert.equal(hit.target,'e1');assert.equal(hit.dest.y,13);
});
test('blue movement and outside attack areas use weather-aware legal movement without overlap',()=>{
 for(const id of [0,4]){const s=E.createGame(id);s.turn=4;for(const u of s.units.filter(u=>u.team==='ally')){const {moves,attacks}=tacticalRanges(s,u),legal=E.reachable(s,u);for(const ally of E.alive(s,'ally'))assert(!attacks.has(E.key(ally)));assert.deepEqual(moves,new Set(legal.map(E.key)));for(const k of attacks){assert(!moves.has(k));const [x,y]=k.split(',').map(Number);assert(legal.some(p=>E.inRange({...u,...p},{x,y})));}}}
});
test('0.5.1 keeps 0.5.0 saved roster and commands intact',()=>{
 let value;const storage={getItem:()=>value,setItem:(_k,v)=>value=v},s=E.createGame(4);E.act(s,'a1',s.units[0],'wait');writeSave(storage,'0.5.0',s,false);assert.deepEqual(readSave(storage,'0.5.1',MAPS).state,s);
});
test('0.5.2 preserves compatible saves and resolved commands on every map',()=>{
 for(const release of ['0.2.0','0.3.0','0.4.0','0.5.0','0.5.1'])for(const m of MAPS){let value;const storage={getItem:()=>value,setItem:(_k,v)=>value=v},s=E.createGame(m.id);E.act(s,'a1',s.units[0],'wait');writeSave(storage,release,s,true);const read=readSave(storage,'0.5.2',MAPS);assert(read.campaign);assert.deepEqual(read.state,s);}
});
