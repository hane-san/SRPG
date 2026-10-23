import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,castleGarrison,enemy} from '../data.js';
import * as E from '../engine.js';

// Owner rule (PR #62/#64 for maps 05/06, extended to 02/03 on 2026-10-23):
// when the captain does not stand on the north castle, one ordinary bow unit holds it.
const onGoal=m=>m.enemies.filter(e=>e.x===m.goal.x&&e.y===m.goal.y);
test('every north castle starts occupied: by the captain, or else by one ordinary hold bow',()=>{
 const garrisoned=[];
 for(const m of MAPS){
  const occupants=onGoal(m),boss=m.enemies.find(e=>e.id==='boss');
  assert.equal(occupants.length,1,m.title+' castle has exactly one defender');
  const bossOnCastle=boss.x===m.goal.x&&boss.y===m.goal.y;
  const guards=m.enemies.filter(e=>e.id==='castle-guard');
  if(bossOnCastle){assert.equal(guards.length,0,m.title+' keeps the captain on the castle without an extra unit');continue;}
  garrisoned.push(m.id);
  assert.equal(guards.length,1);const [g]=guards;
  assert.deepEqual([g.x,g.y,g.type,g.ai],[m.goal.x,m.goal.y,'bow','hold'],m.title);
  assert.notEqual(g.rank,'advanced');assert.equal(g.name,'敵弓隊');
  const s=E.createGame(m.id),unit=s.units.find(u=>u.id==='castle-guard');
  assert(unit&&unit.alive&&unit.team==='enemy'&&unit.hp===6&&unit.maxHp===6,m.title+' guard is an ordinary HP6 unit');
 }
 assert.deepEqual(garrisoned,[1,2,4,5],'maps 02, 03, 05 and 06 put the captain at the gate');
});
test('castleGarrison only adds a unit to an empty castle and never mutates its input',()=>{
 const goal={x:3,y:1},bossOn=[enemy('boss','shield',3,1,'hold')],bossOff=[enemy('boss','shield',3,2,'hold')];
 const copy=structuredClone(bossOff);
 assert.deepEqual(castleGarrison(bossOn,goal),[]);
 assert.deepEqual(castleGarrison(bossOff,goal).map(e=>[e.id,e.type,e.x,e.y,e.ai]),[['castle-guard','bow',3,1,'hold']]);
 assert.deepEqual(bossOff,copy);
});
test('a castle-guard blocks capture until it is defeated; then stepping in wins',()=>{
 const s=E.createGame(1),guard=s.units.find(u=>u.id==='castle-guard');
 assert(!E.reachable(s,{...s.units.find(u=>u.team==='ally'),x:9,y:1,deployed:true}).some(p=>p.x===8&&p.y===1),'an occupied castle is not a legal destination');
 guard.alive=false;E.checkOutcome(s);assert.equal(s.status,'playing','an empty castle is not a capture by itself');
 const ally=s.units.find(u=>u.team==='ally');Object.assign(ally,{deployed:true,x:8,y:1});E.checkOutcome(s);assert.equal(s.status,'victory');
});
