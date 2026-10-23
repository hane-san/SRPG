import test from 'node:test';
import assert from 'node:assert/strict';
import {riskCue,hasAnnouncedCannon,combatCue,thumbSide,buildThreatIndex,indexedThreat,warningFocus} from '../tactical-ui.js';
import * as E from '../engine.js';

test('P2 reaches are *approximate*: thresholds and labels never promise certain damage',()=>{
 for(const [risk,hp,level] of [[0,6,'safe'],[1,6,'caution'],[2,6,'caution'],[3,6,'high'],[5,6,'high'],[2,2,'critical'],[10,6,'critical']]){
  const r=riskCue(risk,hp);assert.equal(r.level,level);assert(r.text.includes('概算')&&r.text.includes('確定被害ではありません'));
  assert(r.text.includes(String(risk)));
 }
 assert.equal(riskCue(4,6,{cannon:true}).level,'cannon');
 assert(riskCue(0,6,{cannon:true}).text.includes('P4砲撃'));
 assert.equal(riskCue(Number.NaN,6).level,'safe');
});
test('only actually announced cannon tiles get the special warning',()=>{
 const warnings=[{kind:'spawn',turn:2,cells:[{x:1,y:2}]},{kind:'cannon',turn:2,cells:[{x:4,y:5},{x:4,y:6}]}];
 assert(hasAnnouncedCannon(warnings,{x:4,y:6}));
 assert(!hasAnnouncedCannon(warnings,{x:1,y:2}));
 assert(!hasAnnouncedCannon([],null));
 assert(!hasAnnouncedCannon([{kind:'cannon',cells:[]}],{x:4,y:6}));
});
test('real changes, not attack number, determine shattered gemstones',()=>{
 assert.equal(combatCue({kind:'hit',amount:5},2,0,{def:1}),'結晶破砕 2個 · 防御適用後 · 残HP分のみ');
 assert.equal(combatCue({kind:'hit',amount:2},6,4,{}),'結晶破砕 2個');
 assert.equal(combatCue({kind:'hit',amount:1,counter:true},5,4,{}),'反撃 · 結晶破砕 1個');
 assert.equal(combatCue({kind:'hit',amount:2},2,1,{guard:1}),'結晶破砕 1個 · 防御適用後');
 assert.equal(combatCue({kind:'hit',amount:1},6,5,{specialty:'guard',command:'wait'}),'結晶破砕 1個 · 防御適用後');
});
test('healing respects the actual cap and has no break / win fanfare',()=>{
 assert.equal(combatCue({kind:'heal',amount:2},5,6,{}),'結晶再生 +1個');
 assert.equal(combatCue({kind:'heal',amount:2},6,6,{}),'結晶再生 +0個');
 assert.equal(combatCue({kind:'miss'},6,6,{}),'');
});
test('thumb setting rejects unknown saved values without changing the save format',()=>{
 assert.equal(thumbSide('right'),'right');
 assert.equal(thumbSide('left'),'left');
 assert.equal(thumbSide(''),'right');
 assert.equal(thumbSide('bad'),'right');
 assert.equal(thumbSide(null),'right');
});

test('precomputed enemy attack field matches canonical engine.threatAt on real maps',()=>{
 for(const mapId of [0,2,4,5]){
  const state=E.createGame(mapId);
  const index=buildThreatIndex(state,E),u=state.units.find(a=>a.team==='ally');
  assert(u&&index.length>0);
  const choices=[{x:0,y:0},{x:Math.floor(state.map.w/2),y:Math.floor(state.map.h/2)},state.map.camp,...state.units.filter(a=>a.team==='enemy').slice(0,2).map(a=>({x:a.x,y:a.y}))];
  for(const p of choices){
   assert.equal(indexedThreat(state,index,u,p,E),E.threatAt(state,p,u),`map${mapId} @ ${p.x},${p.y}`);
  }
 }
});
test('indexed armour and HP changes affect resulting damage without rebuilding enemy reach',()=>{
 const state=E.createGame(),u=state.units.find(a=>a.team==='ally'),index=buildThreatIndex(state,E);
 const tile=state.units.find(a=>a.team==='enemy');
 if(!tile)return;
 const p={x:tile.x,y:tile.y},without=indexedThreat(state,index,u,p,E);
 const armoured=indexedThreat(state,index,{...u,def:Math.max(1,u.def+3)},p,E);
 assert(armoured<=without,'changing only defence does not need a new reach field');
});

test('warningFocus centres the most urgent announced cells and reports when they leave the view',()=>{
 assert.equal(warningFocus([]),null);assert.equal(warningFocus(null),null);
 const cannon={kind:'cannon',turn:6,cells:[{x:6,y:22},{x:6,y:21},{x:5,y:22},{x:7,y:22},{x:6,y:23}]};
 const spawn={kind:'spawn',turn:4,cells:[{x:3,y:21}]};
 // Cannon takes priority over an earlier reinforcement notice; the centre is in tile units (cell centre = x+0.5).
 assert.deepEqual(warningFocus([spawn,cannon]),{kind:'cannon',turn:6,x:6.5,y:22.5,offscreen:false});
 assert.deepEqual(warningFocus([spawn]),{kind:'spawn',turn:4,x:3.5,y:21.5,offscreen:false});
 const top={x0:0,x1:14,y0:0,y1:12},bottom={x0:0,x1:14,y0:14,y1:26};
 assert.equal(warningFocus([cannon],top).offscreen,true,'north view cannot see the southern barrage');
 assert.equal(warningFocus([cannon],bottom).offscreen,false);
 assert.equal(warningFocus([cannon],{x0:0,x1:14,y0:14,y1:23}).offscreen,true,'a partly visible ring still counts as off-screen');
 // Pure: it never mutates the state's warning list.
 const list=[spawn,cannon],copy=structuredClone(list);warningFocus(list,top);assert.deepEqual(list,copy);
});
