import test from 'node:test';
import assert from 'node:assert/strict';
import {riskCue,hasAnnouncedCannon,combatCue,thumbSide} from '../tactical-ui.js';

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
