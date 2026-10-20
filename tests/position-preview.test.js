import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {unit} from '../data.js';
import {routeSummary,slideDraft,attackTargets} from '../ui-model.js';

function fixture(type='sword'){
 const s=E.createGame();s.map.tiles=Array(20).fill('.'.repeat(12));
 s.units=[unit({id:'a',name:'味方',type,x:3,y:16},'ally'),unit({id:'e',name:'近敵',type:'sword',x:6,y:15,ai:'hold'},'enemy'),unit({id:'far',name:'遠敵',type:'bow',x:11,y:1,ai:'hold'},'enemy')];return s;
}
test('route readout counts forest cost rather than steps and uses current rain for both classes',()=>{
 const s=fixture(),u=s.units[0];s.map.tiles[16]='....f.......';
 const before=structuredClone(s),dest={x:5,y:16},route=E.routeTo(s,u,dest),summary=routeSummary(s,u,dest,route);
 assert.equal(route.length-1,2);assert.equal(summary.cost,3);assert.equal(summary.budget,5);assert.equal(summary.targets,0);assert.deepEqual(s,before);
 const rain=E.createGame(4);rain.turn=4;
 for(const [type,budget]of [['sword',2],['horse',3]]){
  const u=unit({id:'test',type,x:5,y:29},'ally'),summary=routeSummary(rain,u,u,[u]);
  assert.equal(summary.cost,0);assert.equal(summary.budget,budget);assert.equal(summary.weather,'大雨');
 }
});
test('range reasons distinguish an adjacent bow target from a distant target without changing the chosen route',()=>{
 const s=fixture('bow'),u=s.units[0],dest={x:5,y:15},route=E.routeTo(s,u,dest),before=structuredClone(s);
 const close=slideDraft(s,u,s.units[1],dest,{preserve:true,route});
 assert.equal(close.target,null);assert.match(close.attackError,/近敵まで1マス/);assert.match(close.attackError,/近すぎます/);assert.match(close.attackError,/射程2/);
 const far=slideDraft(s,u,s.units[2],dest,{preserve:true,route});assert.match(far.attackError,/遠敵まで20マス/);
 for(const draft of [close,far]){assert.deepEqual(draft.dest,dest);assert.deepEqual(draft.route,route);}
 assert.deepEqual(s,before);
});
test('a direct unreachable enemy selection gives feedback and a valid selection still matches committed combat',()=>{
 const s=fixture(),u=s.units[0],before=structuredClone(s),far=slideDraft(s,u,s.units[2]);
 assert.match(far.attackError,/移動しても届きません/);assert.deepEqual(far.dest,{x:u.x,y:u.y});assert.equal(far.target,null);assert.deepEqual(s,before);
 const aim=slideDraft(s,u,s.units[1]);assert.equal(aim.target,'e');assert.equal(aim.attackError,null);
 assert.deepEqual(attackTargets(s,u,aim.dest).map(t=>t.id),['e']);
 const prediction=E.prediction(s,u,s.units[1],aim.dest);assert(E.act(s,u.id,aim.dest,'attack',aim.target).ok);
 assert.equal(s.units[1].hp,6-prediction.damage);assert.equal(u.hp,6-prediction.counter);
});
