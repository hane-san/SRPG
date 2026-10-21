import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import * as E from '../engine.js';import {MAPS,unit,positions} from '../data.js';import {RULES} from '../config.js';import {scenario,run} from './issue17-balance.mjs';
const baseline=JSON.parse(readFileSync(new URL('./fixtures/issue17-enemies-before.json',import.meta.url)));
// Compare historical enemy layouts with the original two-ally defensive formation.
function oldOpening(s){const pos=positions(s.map.id);s.units.filter(u=>u.team==='ally').slice(0,2).forEach((u,i)=>Object.assign(u,{deployed:true,x:pos[i+1][0],y:pos[i+1][1]}));return s;}
test('issue17 retains exact terrain, enemy IDs, HP6, castle access and campaign structure',()=>{
 for(const m of MAPS){
  assert.deepEqual(m.tiles,baseline.terrain[m.id]);assert.deepEqual(m.enemies.map(e=>e.id),baseline.maps[m.id].map(e=>e.id));
  const s=E.createGame(m.id);assert.equal(E.alive(s,'ally').length,0);assert.equal(E.reserves(s).length,s.units.filter(u=>u.team==='ally').length);assert(s.units.every(u=>u.maxHp===6));assert(E.canDeploy(s));
 }
 assert.equal(RULES.barrageDamage,2);assert.equal(RULES.deploymentsPerTurn,1);assert.equal(RULES.maxDeployed,5);
});
test('issue17 fixed stationary first contact is staged on maps02/05 without free wins',()=>{
 const hits=(id,layout)=>{const s=oldOpening(scenario(id,layout));const v=E.sortieUnit(s,'a3');assert(E.deployAndAct(s,'a3',s.map.camp,'wait').ok);E.prepareEnemy(s);let n=0;E.enemyPhase(s,(_s,_a,e)=>{if(e.kind==='hit'&&!e.counter)n++;});return n;};
 assert.equal(hits(4,'before'),4);assert.equal(hits(4,'after'),1);
 // A defensive opening is a valid choice, never a victory trigger.
 for(let id=0;id<6;id++){const s=E.createGame(id);for(let turn=0;turn<3&&s.status==='playing';turn++)E.endTurn(s);assert.notEqual(s.status,'victory');}
});
test('issue17 cannon warning and impact use the same unmodified damage',()=>{
 const s=E.createGame(2),u=s.units.find(u=>u.id==='a1');Object.assign(u,{deployed:true,x:s.map.camp.x,y:s.map.camp.y});s.turn=2;s.phase=4;E.eventPhase(s);const w=s.warnings.find(w=>w.kind==='cannon');assert(w);assert(s.log.some(l=>l.includes('砲撃'+RULES.barrageDamage)));
 s.turn=w.turn;s.phase=4;s.warnings=[{...w,cells:[{x:u.x,y:u.y}]}];E.eventPhase(s);assert.equal(u.hp,6-RULES.barrageDamage);
});
test('issue17 playback keeps deploy, hit and counter ordered and dispatches distinct cues',async()=>{
 const {createPlayback}=await import('../playback.js');const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 try{
  globalThis.document={hidden:true};
  for(const lethal of [false,true]){
   const s=E.createGame(),reserve=unit({id:'r',name:'予備剣',type:'sword',x:3,y:16,deployed:false},'ally'),enemy=unit({id:'e',name:'盾',type:'shield',x:6,y:16,ai:'hold'},'enemy');
   if(lethal)enemy.hp=1;s.units=[reserve,enemy];const initial=structuredClone(s),frames=[];
   assert(E.deployAndAct(s,'r',s.map.camp,'attack','e',(state,_a,event)=>frames.push({state:structuredClone(state),event})).ok);
   let shown=initial;const cues=[],impacts=[],view={};
   const playback=createPlayback({getState:()=>shown,setState:v=>shown=v,view,draw:()=>{},sound:{play:k=>cues.push(k)},isFast:()=>true,isReduced:()=>true,onCombat:(_b,_a,e,stage)=>{if(stage==='impact')impacts.push(e.counter?'counter':'hit');}});
   await playback.play(frames);assert.deepEqual(shown.units,s.units);assert.deepEqual(impacts,lethal?['hit']:['hit','counter']);assert.equal(cues[0],'deploy');assert(cues.includes(lethal?'defeat':'defend'));
  }
 }finally{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}
});
