import assert from 'node:assert/strict';
import test from 'node:test';
import {weaponProfile,weaponFrame,isBossUnit,bossFracture} from '../weapon-fx.js';

test('every current combat class has a distinct legible weapon family',()=>{
 const families={sword:'slash',shield:'cleave',horse:'thrust',bow:'arrow',shooter:'artillery',mage:'arcane',healer:'arcane',medic:'arcane'};
 for(const [type,kind] of Object.entries(families)){
  const profile=weaponProfile(type);
  assert.equal(profile.kind,kind);
  assert(profile.width>0&&profile.color.startsWith('#')&&profile.enabled);
 }
 assert.equal(weaponProfile('unknown').kind,'cleave');
 assert.notEqual(weaponProfile('sword').color,weaponProfile('horse').color);
});
test('all slashes peak inside the pre-existing windup, never linger afterward',()=>{
 const one=weaponFrame(.1),active=weaponFrame(.65),ended=weaponFrame(1);
 assert.equal(one.alpha,0);assert(active.alpha>.5);assert.equal(ended.alpha,0);
 assert(active.reach>0&&active.reach<1);
 assert.equal(weaponFrame(-1).p,0);assert.equal(weaponFrame(3).p,1);
 assert.equal(weaponFrame(NaN).p,0);
});
test('fast and reduced motion hide extra weapon trails without altering class',()=>{
 for(const opt of [{fast:true},{reduced:true}]){
  const profile=weaponProfile('sword',opt);
  assert.equal(profile.kind,'slash');
  assert.equal(weaponFrame(.65,profile.enabled).alpha,0);
 }
});
test('only a designated enemy boss gets the special fracture',()=>{
 assert(isBossUnit({id:'boss',team:'enemy'}));
 assert(!isBossUnit({id:'boss',team:'ally'}));
 assert(!isBossUnit({id:'e2',team:'enemy',rank:'advanced'}));
 assert(!isBossUnit(null));
 const crack0=bossFracture(0),crack1=bossFracture(1),burst=bossFracture(.35,'burst');
 assert(crack1.radius>crack0.radius&&crack1.alpha>crack0.alpha);
 assert.equal(crack0.branches,6);assert(burst.branches>crack1.branches);
 assert(burst.burst);assert.equal(bossFracture(1,'burst').alpha,0);
});
