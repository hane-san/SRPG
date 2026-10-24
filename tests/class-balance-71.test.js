import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,ROSTER,unit} from '../data.js';
import * as E from '../engine.js';
import {CLASSES} from '../config.js';
import {readSave,writeSave} from '../save.js';
import {play} from './simulate.mjs';

const priorMap=(id,enemyId,oldType)=>{
 const map=structuredClone(MAPS[id]);
 const enemy=map.enemies.find(u=>u.id===enemyId);
 assert(enemy,`Missing map ${id+1} enemy ${enemyId}`);
 Object.assign(enemy,{type:oldType,name:oldType==='sword'?'斥候':enemy.name});
 return map;
};

test('pilot leaves roster and full map topology alone; two enemy roles are newly visible',()=>{
 const first=MAPS[0],sixth=MAPS[5];
 const bandit=first.enemies.find(u=>u.id==='e1');
 const spear=sixth.enemies.find(u=>u.id==='extra-5-0-2');
 assert.deepEqual([bandit.type,bandit.x,bandit.y,bandit.ai],['bandit',4,12,'hold']);
 assert.equal(bandit.name,'賊');
 assert.deepEqual([spear.type,spear.x,spear.y,spear.ai],['spear',2,26,'defend']);
 assert.equal(spear.name,'槍兵');
 assert.equal(first.enemies.length,6);
 assert.equal(sixth.enemies.length,16);
 assert.equal(ROSTER.length,9);
 assert.equal(ROSTER.filter(u=>u.type==='mage').length,3);
 assert.equal(ROSTER.filter(u=>u.type==='horse').length,2);
 assert(!ROSTER.some(u=>u.type==='spear'||u.type==='bandit'));
 for(const [id,enemyId,type] of [[0,'e1','sword'],[5,'extra-5-0-2','sword']]){
  const before=priorMap(id,enemyId,type),after=MAPS[id];
  assert.deepEqual(after.tiles,before.tiles);
  assert.deepEqual(after.camp,before.camp);
  assert.deepEqual(after.goal,before.goal);
  assert.deepEqual(after.spawns,before.spawns);
  assert.equal(new Set(after.enemies.map(u=>u.id)).size,after.enemies.length);
 }
});

test('bandit remains attack-one and spear has exactly one extra damage against cavalry',()=>{
 const s=E.createGame(5),foe=s.units.find(u=>u.id==='extra-5-0-2');
 const cavalry=s.units.find(u=>u.id==='a6'),heavy=s.units.find(u=>u.id==='a1');
 assert.equal(foe.type,'spear');
 assert.equal(E.damage(s,foe,cavalry),3);
 assert.equal(E.prediction(s,foe,cavalry).damage,3);
 assert.equal(E.damage(s,foe,heavy),1); // Heavy reduces ordinary damage 2 to 1.
 const banditState=E.createGame(0);
 const bandit=banditState.units.find(u=>u.id==='e1');
 assert.equal(bandit.atk,1);
 assert.equal(E.damage(banditState,bandit,banditState.units.find(u=>u.id==='a1')),1);
 assert.equal(CLASSES.bandit.atk,1);
});

test('before/after map01 novice and fast examples remain viable',()=>{
 const before=priorMap(0,'e1','sword');
 for(const policy of ['advance','pause','fast']){
  const old=play(0,policy,{},35,[],before).result;
  const revised=play(0,policy).result;
  assert.equal(old.status,'victory');
  assert.equal(revised.status,'victory');
  assert.equal(revised.turn,old.turn,`01 ${policy} turn regression`);
  assert(revised.tactical.allyDeaths.length<=old.tactical.allyDeaths.length,`01 ${policy} losses`);
 }
});

test('map06 river spear changes matchups without removing alternate southern strategy',()=>{
 const before=priorMap(5,'extra-5-0-2','sword');
 const original=play(5,'advance',{},35,[],before).result;
 const next=play(5,'advance').result;
 const south=play(5,'south').result;
 const line=play(5,'line').result;
 assert.equal(original.status,'victory');
 assert.equal(next.status,'victory');
 assert(next.turn<=original.turn,'river spear should not make default advance stall');
 assert(next.tactical.allyDeaths.length<=original.tactical.allyDeaths.length,'river spear should not increase losses for the reference advance');
 assert.equal(south.status,'victory');
 assert.equal(south.tactical.allyDeaths.length,0,'the southern castle route must remain a no-loss example');
 assert.equal(line.status,'victory','the front-line alternative should still resolve');
});

test('existing saves keep old enemy class, HP and coordinates after map role rebalance',()=>{
 for(const [id,enemyId] of [[0,'e1'],[5,'extra-5-0-2']]){
  const s=E.createGame(id),old=s.units.find(u=>u.id===enemyId);
  const original=unit({id:old.id,name:'旧斥候',type:'sword',x:old.x,y:old.y,ai:old.ai,rank:old.rank},'enemy',s.settings);
  Object.assign(old,original,{hp:4});
  const storage=new Map(),adapter={getItem:k=>storage.get(k)??null,setItem:(k,value)=>storage.set(k,value)};
  assert.equal(writeSave(adapter,'0.8.0',s,false),true);
  const restored=readSave(adapter,'0.8.0',MAPS);
  assert(restored,`map ${id+1} prior save must be valid`);
  const foe=restored.state.units.find(u=>u.id===enemyId);
  assert.equal(foe.type,'sword');
  assert.equal(foe.hp,4);
  assert.deepEqual({x:foe.x,y:foe.y},{x:old.x,y:old.y});
  assert.equal(restored.state.map.enemies.find(u=>u.id===enemyId).type,id===0?'bandit':'spear');
 }
});
