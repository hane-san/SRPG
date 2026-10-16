import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {unit,MAPS} from '../data.js';
function fixture(){const s=E.createGame();s.map.tiles=Array(20).fill('.'.repeat(12));s.map.spawns=[];s.units=[];return s;}
const add=(s,type,x,y,team='ally',id=type)=>{const u=unit({id,name:id,type,x,y},team);s.units.push(u);return u;};
const cmd=(s,u,action,t,dest=u)=>E.act(s,u.id,{x:dest.x,y:dest.y},action,t?.id);
test('all maps: units occupy legal unique tiles and bases can be reached',()=>{for(let i=0;i<3;i++){const s=E.createGame(i),occupied=new Set();assert.equal(E.alive(s,'ally').length,8);for(const u of s.units){assert(Number.isFinite(E.terrain(s,u)?.cost),`${i} ${u.id} ${u.x},${u.y}`);assert(!occupied.has(E.key(u)));occupied.add(E.key(u));}const field=E.distanceField(s,s.map.goal,'ally');assert(E.alive(s,'ally').some(u=>Number.isFinite(field.get(E.key(u)))));}});
test('four phases; each ally acts once; restart state is independent',()=>{const s=fixture(),a=add(s,'sword',2,5);assert(cmd(s,a,'wait').ok);assert.equal(cmd(s,a,'wait').ok,false);E.prepareEnemy(s);assert.equal(s.phase,2);E.enemyPhase(s);E.supportPhase(s);assert.equal(s.phase,3);E.eventPhase(s);assert.equal(s.phase,4);E.nextTurn(s);assert.equal(s.turn,2);assert(!a.acted);assert.equal(E.createGame().units[0].hp,26);});
test('support requires no movement, no counter; consumes on effect only',()=>{const s=fixture(),a=add(s,'bow',3,5),e=add(s,'bow',3,3,'enemy');e.ai='hold';assert(cmd(s,a,'wait').ok);E.prepareEnemy(s);const hp=e.hp;E.enemyPhase(s);assert.equal(e.hp,hp,'P2 no ally counter');E.supportPhase(s);assert(e.hp<hp);assert.equal(a.charges,2);assert.equal(s.metrics.supports,1);
 const b=fixture(),c=add(b,'bow',2,5);cmd(b,c,'wait');E.prepareEnemy(b);E.supportPhase(b);assert.equal(c.charges,3);});
test('P3 is not countered; focus then kill then attack ordering',()=>{const s=fixture(),a=add(s,'bow',3,5),e=add(s,'bow',3,3,'enemy','first'),f=add(s,'mage',5,5,'enemy','second');assert.equal(E.supportTarget(s,a).id,'second');a.focus=e.id;assert.equal(E.supportTarget(s,a).id,'first');cmd(s,a,'wait');E.prepareEnemy(s);const hp=a.hp;E.supportPhase(s);assert.equal(a.hp,hp);});
test('healing threshold, focus override, conservation and empty charges',()=>{const s=fixture(),h=add(s,'healer',3,5),t=add(s,'shield',4,5);t.hp-=2;cmd(s,h,'wait');E.prepareEnemy(s);E.supportPhase(s);assert.equal(h.charges,3);h.focus=t.id;E.supportPhase(s);assert.equal(t.hp,t.maxHp);assert.equal(h.charges,2);
 t.hp-=7;h.spend=false;E.supportPhase(s);assert.equal(h.charges,2);assert.equal(t.hp,t.maxHp-7);});
test('H1 emergency cap; H0 unbounded; H2 requires injury this turn; no self heal',()=>{const s=fixture(),h=add(s,'healer',3,5),t=add(s,'shield',4,5);h.charges=0;t.hp=12;assert.equal(E.healAmount(s,h,t),1);t.hp=13;assert.equal(E.healAmount(s,h,t),0);s.settings.healing='H0';assert.equal(E.healAmount(s,h,t),1);s.settings.healing='H2';assert.equal(E.healAmount(s,h,t),0);t.hurtTurn=s.turn;assert.equal(E.healAmount(s,h,t),1);t.hp=t.maxHp;h.hp=1;assert.equal(E.supportTarget(s,h),null,'self healing is never a target');});
test('wait after moving never arms P3; medic now heals only on stationary wait',()=>{
 const s=fixture(),h=add(s,'medic',3,5),t=add(s,'shield',5,5);t.hp=3;
 assert(cmd(s,h,'wait',null,{x:4,y:5}).ok);assert.equal(h.command,null);E.prepareEnemy(s);E.supportPhase(s);assert.equal(t.hp,3);assert.equal(h.charges,3);
 E.nextTurn(s);assert(cmd(s,h,'wait').ok);assert.equal(t.hp,3,'preparing is not an immediate heal');E.prepareEnemy(s);E.supportPhase(s);assert.equal(t.hp,10);assert.equal(h.charges,2);
});
test('ranged minimum range and damage preview match real counter',()=>{const s=fixture(),a=add(s,'bow',3,5),e=add(s,'sword',3,4,'enemy');assert(!cmd(s,a,'attack',e).ok);e.y=3;e.range=[2,2];const p=E.prediction(s,a,e);const hp=a.hp,ehp=e.hp;assert(cmd(s,a,'attack',e).ok);assert.equal(ehp-e.hp,p.damage);assert.equal(hp-a.hp,p.counter);});
test('route arrow uses legal minimum-cost paths, allied transit and normal move budget',()=>{
 const s=fixture(),a=add(s,'horse',1,5),friend=add(s,'shield',2,5);s.map.tiles[4]='..~.........';
 assert.equal(E.routeTo(s,a,{x:2,y:4}).length,0,'water endpoint');assert.equal(E.routeTo(s,a,friend).length,0,'occupied endpoint');
 const route=E.routeTo(s,a,{x:4,y:5});assert(route.some(p=>p.x===2&&p.y===5),'can pass allies');assert.equal(route.length,4);
 s.map.tiles[5]='..f.........';const weighted=E.routeTo(s,a,{x:4,y:5});const cost=weighted.slice(1).reduce((n,p)=>n+E.terrain(s,p).cost,0);assert.equal(cost,4);
 assert.equal(E.routeTo(s,a,{x:10,y:5}).length,0,'no former dash budget');assert(!cmd(s,a,'wait',null,{x:10,y:5}).ok);
 add(s,'sword',2,6,'enemy');assert(E.routeTo(s,a,{x:3,y:6}).every(p=>p.x!==2||p.y!==6),'enemy blocks transit');
});
test('all combat classes arm finite P3 attacks on stationary wait and never on P1 attack',()=>{
 for(const type of ['shield','sword','bow','mage','horse']){
  const s=fixture(),a=add(s,type,3,5),e=add(s,'shield',3,type==='bow'?3:4,'enemy');e.ai='hold';
  assert(cmd(s,a,'wait').ok);assert.equal(a.command,'support');assert.equal(a.charges,type==='bow'||type==='shield'?3:2);
  E.prepareEnemy(s);const hp=a.hp;E.supportPhase(s);assert.equal(a.hp,hp,'P3 cannot be countered');assert.equal(s.metrics.supports,1);assert.equal(s.metrics.charges,1);
 }
 const s=fixture(),a=add(s,'sword',3,5),e=add(s,'shield',3,4,'enemy');assert(cmd(s,a,'attack',e).ok);assert.equal(a.command,null);assert.equal(a.charges,2);E.prepareEnemy(s);const hp=e.hp;E.supportPhase(s);assert.equal(e.hp,hp,'no P3 after P1 attack');
});
test('zero-charge attacks wait normally; phase-end omission is stationary wait',()=>{
 const s=fixture(),a=add(s,'sword',3,5);a.charges=0;assert(cmd(s,a,'wait').ok);assert.equal(a.command,null);const b=add(s,'mage',5,5);E.prepareEnemy(s);assert.equal(b.command,'support');assert.equal(a.command,null);
});
test('death remains across campaign in classic but returns in casual',()=>{for(const mode of ['classic','casual']){const s=fixture();s.settings.mode=mode;const a=add(s,'sword',3,5,'ally','a2'),other=add(s,'shield',0,19);const e=add(s,'mage',3,4,'enemy');e.ai='hold';a.hp=1;E.endTurn(s);assert(!a.alive);assert.equal(s.lost.includes('a2'),mode==='classic');const next=E.createGame(1,s.settings,s.lost);assert.equal(next.units.some(u=>u.id==='a2'),mode==='casual');assert(next.units.filter(u=>u.team==='ally').length>=4);}});
test('event announcement gives a full P1; spawn attacks only following turn',()=>{const s=E.createGame(2);for(let i=0;i<2;i++)E.endTurn(s);assert.equal(s.turn,3);const w=s.warnings.find(w=>w.kind==='cannon');assert.equal(w.turn,3);assert(s.log.some(l=>l.startsWith('T2 P4')&&l.includes('確報')));const before=s.units.length;E.endTurn(s);assert.equal(s.turn,4);assert(s.warnings.some(w=>w.kind==='spawn'&&w.turn===4));E.endTurn(s);assert.equal(s.turn,5);assert(s.units.length>before);assert(s.units.filter(u=>u.id.startsWith('reinforcement')).every(u=>u.hp===u.maxHp));});
test('cannon damage, dead support removal, base defeat and objective victory',()=>{let s=fixture(),a=add(s,'healer',3,5);a.hp=6;a.command='heal';add(s,'shield',0,19);s.warnings=[{kind:'cannon',turn:1,cells:[{x:3,y:5}]}];E.eventPhase(s);assert(!a.alive);assert.equal(a.command,null);
 s=E.createGame(1);s.units.find(u=>u.team==='enemy').x=s.map.base.x;s.units.find(u=>u.team==='enemy').y=s.map.base.y;E.checkOutcome(s);assert.equal(s.status,'defeat');s=E.createGame();const ally=s.units[0];s.units=s.units.filter(u=>u.team==='ally');Object.assign(ally,s.map.goal);E.checkOutcome(s);assert.equal(s.status,'victory');});
test('turn-end wait re-arms P3 only while attack charges remain; action validation rejects non-P1',()=>{const s=fixture(),a=add(s,'bow',3,5),e=add(s,'shield',3,3,'enemy');e.ai='hold';a.charges=1;cmd(s,a,'wait');E.endTurn(s);assert.equal(a.charges,0);const hp=e.hp;E.endTurn(s);assert.equal(e.hp,hp);s.phase=2;assert(!cmd(s,a,'wait').ok);});
test('south capture suppresses subsequent scheduled reinforcements',()=>{const s=E.createGame(1);s.units=s.units.filter(u=>u.id!=='southguard');Object.assign(s.units[0],s.map.south);E.checkOutcome(s);assert(s.southTaken);s.turn=3;E.eventPhase(s);assert(!s.warnings.some(w=>w.kind==='spawn'));});

test('moved attackers retain P2 counter but have no P3; zero charges restore counter',()=>{
 for(const empty of [false,true]){const s=fixture(),a=add(s,'sword',3,5),e=add(s,'sword',4,empty?5:4,'enemy');e.ai='hold';
  if(empty)a.charges=0;assert(cmd(s,a,'wait',null,empty?a:{x:3,y:4}).ok);assert.equal(a.command,null);E.prepareEnemy(s);E.enemyPhase(s);assert(e.hp<e.maxHp);const hp=e.hp;E.supportPhase(s);assert.equal(e.hp,hp);}
});
