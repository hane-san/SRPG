import assert from 'node:assert/strict';
import test from 'node:test';
import {feedbackStyle,impactFrame,landingFrame} from '../combat-fx.js';

test('default two-gem impact reads stronger than one but less than 4+ heavy',()=>{
 const one=feedbackStyle({count:1}),two=feedbackStyle({count:2}),heavy=feedbackStyle({count:4,heavy:true});
 assert(one.recoil<two.recoil&&two.recoil<heavy.recoil);
 assert(one.radius<two.radius&&two.radius<heavy.radius);
 assert(one.rays<two.rays&&two.rays<heavy.rays);
 assert(one.glow<two.glow&&two.glow<heavy.glow);
});
test('armour gets a distinct shield mark without changing the game or gem count',()=>{
 const armour=feedbackStyle({armoured:true,count:2}),normal=feedbackStyle({count:2});
 assert(armour.armoured&&!normal.armoured);
 assert(armour.radius<normal.radius);
 assert.equal(impactFrame(armour,1).alpha,0);
});
test('healing has no recoil and distinct soft halo',()=>{
 const heal=feedbackStyle({heal:true,count:2}),frame=impactFrame(heal,.2);
 assert.equal(heal.recoil,0);assert(heal.heal);assert(heal.rays===4);
 assert(frame.ring>0&&frame.alpha>0);
});
test('visual recoil and landing dust are optional in fast/reduced motion',()=>{
 for(const flag of ['fast','reduced']){
  const v=feedbackStyle({count:2,[flag]:true});
  assert.equal(v.recoil,0);assert.equal(v.glow,0);assert.equal(v.dust,0);
 }
 assert.equal(landingFrame(0,true).alpha,0);
 assert.equal(landingFrame(0,false,true).alpha,0);
 assert(landingFrame(.15).alpha>landingFrame(.85).alpha);
});
test('effect frames clamp time safely and vanish after each animation',()=>{
 const style=feedbackStyle({count:2});
 assert.deepEqual(impactFrame(style,1),impactFrame(style,12));
 assert.deepEqual(impactFrame(style,0),impactFrame(style,-5));
 assert.equal(impactFrame(style,1).alpha,0);
 assert.equal(impactFrame(style,1).recoil,0);
 assert.equal(landingFrame(1).alpha,0);
 assert(Number.isFinite(impactFrame(style,NaN).alpha));
});
