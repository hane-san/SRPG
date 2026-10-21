import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {MAPS,ROSTER,positions,unit} from '../data.js';
import {RULES} from '../config.js';

test('garrison/roster placement retains every named slot and active unit location',()=>{
 for(const m of MAPS){
  const pos=positions(m.id),s=E.createGame(m.id),live=E.alive(s,'ally');
  assert.equal(live.length,0);assert.equal(E.reserves(s).length,s.units.filter(u=>u.team==='ally').length);
  assert.equal(s.map.camp.x,m.base?.x??pos[0][0]);
  assert.equal(s.map.camp.y,m.base?.y??pos[0][1]);
  assert.equal(new Set(E.alive(s).map(E.key)).size,E.alive(s).length);
  assert(E.deploymentCells(s).length>0);
 }
});
test('dead names are replaced, not shifted or revived; replacement inherits upper class basics',()=>{
 for(const lost of [['a2'],ROSTER.slice(0,7).map(u=>u.id)]){
  const s=E.createGame(2,{},lost),positionsById=positions(2);
  for(const [i,r] of ROSTER.entries()){
   const u=s.units.find(u=>u.id===(lost.includes(r.id)?'general-'+r.id:r.id));
   assert(u);assert.deepEqual([u.x,u.y],positionsById[i]);assert.equal(u.rank,'advanced');
   assert.equal(u.named,!lost.includes(r.id));assert.equal(u.maxHp,6);
  }
  assert.equal(s.units.filter(u=>u.team==='ally').length,9);
 }
});
test('damage fixed at 1–3 initially, advanced shields reduce one more',()=>{
 for(const m of MAPS){const s=E.createGame(m.id),sword=s.units.find(u=>u.id==='a2');
  assert.equal(sword.maxHp,6);for(const enemy of E.alive(s,'enemy')){assert(enemy.atk>=2&&enemy.atk<=3);assert(enemy.def>=0&&enemy.def<=2);assert(E.damage(s,sword,enemy)>=1);}
 }
 const s=E.createGame(2),generic=unit({id:'general',type:'shield',x:1,y:2,rank:'advanced'},'ally');
 assert.equal(generic.def,2);
});
test('supply cannot exceed maximum, no penalty repair resource after death',()=>{
 const s=E.createGame(),a=s.units.find(u=>u.id==='a4');Object.assign(a,{deployed:true,x:s.map.camp.x,y:s.map.camp.y,charges:0});
 E.nextTurn(s);assert.equal(a.charges,1);E.nextTurn(s);assert.equal(a.charges,RULES.ammo);
 E.nextTurn(s);assert.equal(a.charges,RULES.ammo);assert(!('repairs' in s.metrics));assert(!('repairCosts' in s));
});
test('rain and moving costs continue using the unified movement field',()=>{
 const s=E.createGame(4),u=s.units.find(u=>u.id==='a1');s.turn=4;
 assert.equal(E.weatherAt(s),'heavy');assert.equal(E.movement(s,u),Math.max(1,u.move-3));
 for(const p of E.reachable(s,u)){assert(E.routeTo(s,u,p).length);assert(p.cost<=E.movement(s,u));}
});
