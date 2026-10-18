import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {unit,MAPS,ROSTER} from '../data.js';
import {RULES} from '../config.js';
function fixture(){const s=E.createGame();s.map.tiles=Array(20).fill('.'.repeat(12));s.map.spawns=[];s.map.base=null;s.map.goal={x:11,y:0};s.map.camp={x:2,y:17};s.units=[];return s;}
const add=(s,type,x,y,team='ally',id=type,rank='lower')=>{const u=unit({id,name:id,type,x,y,rank},team);s.units.push(u);return u;};
const cmd=(s,u,action,t,dest=u)=>E.act(s,u.id,{x:dest.x,y:dest.y},action,t?.id);

test('all six maps start with two active HP6 allies; reserves never occupy a tile',()=>{
 for(const m of MAPS){const s=E.createGame(m.id),cells=new Set();assert.equal(E.alive(s,'ally').length,2);assert.equal(E.reserves(s).length,ROSTER.length+(m.extraAllies?.length||0)-2);
  for(const u of s.units){assert.equal(u.maxHp,6);assert.equal(u.hp,6);assert(Number.isFinite(E.terrain(s,u)?.cost));if(u.deployed===false)continue;assert(!cells.has(E.key(u)));cells.add(E.key(u));}
  assert(E.deploymentCells(s).length>0);
 }
});
test('six HP produces 2+2+2, 3+3, and minimum one against armour',()=>{
 const s=fixture(),sword=add(s,'sword',2,2),bow=add(s,'bow',2,3),foe=add(s,'sword',2,4,'enemy');
 assert.equal(E.damage(s,sword,foe),2);assert.equal(E.damage(s,bow,foe),2);
 const sniper=add(s,'sword',3,2,'ally','veteran','advanced');assert.equal(E.damage(s,sniper,foe),3);
 const armour=add(s,'shield',4,2,'enemy','armour','advanced');
 assert.equal(E.damage(s,sword,armour),1);assert.equal(E.damage(s,sniper,armour),1);assert.equal(E.damage(s,{...sniper,atk:5},armour),3);
 assert.equal(RULES.maxHp,6);
});
test('shooter uses damage 1 only at distance three',()=>{
 const s=fixture(),c=add(s,'shooter',4,5),e=add(s,'sword',4,8,'enemy');
 assert.equal(E.damage(s,c,e),1);e.y=7;assert.equal(E.damage(s,c,e),2);
});
test('P1 bow and foot attack plus P2 counter reach lethal 6 without RNG',()=>{
 const s=fixture(),bow=add(s,'bow',4,7),foot=add(s,'sword',4,6),foe=add(s,'sword',4,5,'enemy','foe');foe.ai='hold';
 assert(cmd(s,bow,'attack',foe).ok);assert.equal(foe.hp,4);assert(cmd(s,foot,'attack',foe).ok);assert.equal(foe.hp,2);assert.equal(foot.hp,4);
 E.prepareEnemy(s);E.enemyPhase(s);assert.equal(foe.alive,false);assert.equal(foot.hp,2);
});
test('stationary stance gives up counter; activates once, spends ammo on effect only',()=>{
 const s=fixture(),bow=add(s,'bow',3,5),foe=add(s,'sword',3,3,'enemy');foe.ai='hold';
 assert(cmd(s,bow,'wait').ok);assert.equal(bow.command,'support');E.prepareEnemy(s);
 E.enemyPhase(s);assert.equal(foe.hp,6);E.supportPhase(s);assert.equal(foe.hp,4);assert.equal(bow.charges,1);
 E.supportPhase(s);assert.equal(foe.hp,4);assert.equal(bow.charges,1);
 const empty=fixture(),u=add(empty,'bow',3,5);cmd(empty,u,'wait');E.prepareEnemy(empty);E.supportPhase(empty);assert.equal(u.charges,2);
});
test('healing costs one supply and restores two to one adjacent ally',()=>{
 const s=fixture(),h=add(s,'healer',3,5),a=add(s,'shield',4,5),b=add(s,'shield',3,4);a.hp=3;b.hp=1;
 cmd(s,h,'wait');E.prepareEnemy(s);E.supportPhase(s);
 assert.equal([a.hp,b.hp].filter(x=>x>3).length,0);assert.equal(a.hp+b.hp,6);assert.equal(h.charges,1);
});
test('castle resupplies one ammo per turn, and a spent unit can still counter',()=>{
 const s=fixture(),a=add(s,'sword',2,16),e=add(s,'sword',3,16,'enemy');e.ai='hold';a.charges=0;
 assert(cmd(s,a,'wait').ok);assert.equal(a.command,null);E.prepareEnemy(s);E.enemyPhase(s);assert.equal(e.hp,4);
 E.supportPhase(s);E.eventPhase(s);E.nextTurn(s);assert.equal(a.charges,1);
 E.nextTurn(s);assert.equal(a.charges,2);E.nextTurn(s);assert.equal(a.charges,2);
});
test('castle deployment: one per P1, active cap five, no bench target or premature action',()=>{
 const s=E.createGame(),r=E.reserves(s),before=E.alive(s,'ally').length;
 assert(E.canDeploy(s));assert(!E.alive(s).some(u=>u.id===r[0].id));assert(E.deploy(s,r[0].id).ok);assert.equal(E.alive(s,'ally').length,before+1);
 assert(!E.deploy(s,r[1].id).ok);E.endTurn(s);if(s.status==='playing'){assert(E.canDeploy(s));assert(E.deploy(s,r[1].id).ok);}
});
test('return to castle restores a slot but requires an unused adjacent unit',()=>{
 const s=fixture(),a=add(s,'sword',2,16);assert(E.returnToReserve(s,a.id).ok);assert.equal(E.alive(s,'ally').length,0);assert.equal(E.reserves(s).length,1);
});
test('named death is persistent, but its slot becomes a same-rank generic next chapter',()=>{
 const first=E.createGame(0),named=first.units.find(u=>u.id==='a2');
 const s=fixture(),dead=add(s,'sword',3,5,'ally','a2'),foe=add(s,'sword',3,4,'enemy');dead.named=true;dead.hp=1;foe.ai='hold';E.endTurn(s);
 assert(!dead.alive);assert(s.lost.includes('a2'));
 const next=E.createGame(2,{mode:'classic'},s.lost,{specialties:{a2:'counter',a1:'guard'}});
 assert(!next.units.some(u=>u.id==='a2'));const generic=next.units.find(u=>u.id==='general-a2');
 assert(generic&&!generic.named&&generic.rank==='advanced'&&generic.specialty===null&&generic.atk===3);
 const hero=next.units.find(u=>u.id==='a1');assert.equal(hero.specialty,'guard');assert.equal(hero.atk,3);
 assert.equal(E.alive(next,'ally').length,2);assert.equal(E.reserves(next).length,7);assert(named.named);
});
test('promotions are three mutually exclusive named-only extra abilities',()=>{
 const s=E.createGame(1);s.status='victory';
 assert(E.assignPromotion(s,'a1','counter'));assert.equal(s.specialties.a1,'counter');
 assert(!E.assignPromotion(s,'not-a-unit','guard'));assert(!E.assignPromotion(s,'a1','invalid'));
 const next=E.createGame(2,{},[],{specialties:s.specialties});
 assert.equal(next.units.find(u=>u.id==='a1').specialty,'counter');
});
test('P4 warnings arrive after notification; waves cannot attack before next P2',()=>{
 const s=E.createGame(2);s.units=s.units.filter(u=>u.team==='ally');s.warnings=[{kind:'spawn',turn:1,cells:s.map.spawns}];s.phase=4;
 E.eventPhase(s);const e=s.units.find(u=>u.id.startsWith('reinforcement'));assert(e&&e.hp===6&&!e.acted);assert.equal(s.phase,4);
});
test('four phases preserve terrain movement, weather and finite turn reset',()=>{
 const s=E.createGame(4),u=E.alive(s,'ally')[1];assert(E.routeTo(s,u,u).length);
 for(let i=0;i<5&&s.status==='playing';i++){assert.equal(s.phase,1);E.endTurn(s);assert.equal(s.phase,1);}
 assert(['clear','light','heavy'].includes(E.weatherAt(s)));
});

test('castle sortie validates atomically, walks from an occupied castle and fights',()=>{
 const s=fixture(),guard=add(s,'shield',2,17),reserve=add(s,'sword',0,0,'ally','reserve'),foe=add(s,'sword',4,17,'enemy','foe');
 reserve.deployed=false;
 const original=structuredClone(s),source=E.sortieUnit(s,reserve.id);
 assert.deepEqual({x:source.x,y:source.y},{x:2,y:17});
 assert(!E.act(s,reserve.id,{x:3,y:17},'wait').ok,'reserves cannot act without sortie');
 assert(!E.deployAndAct(s,reserve.id,{x:3,y:17},'attack','missing').ok);
 assert.deepEqual(s,original,'invalid target must not spend a sortie');
 assert(!E.deployAndAct(s,reserve.id,s.map.camp,'wait').ok);
 assert.deepEqual(s,original,'occupied castle cannot be an endpoint');
 const frames=[];
 assert(E.deployAndAct(s,reserve.id,{x:3,y:17},'attack',foe.id,(_,__,event)=>frames.push(event)).ok);
 assert.equal(s.deployedThisTurn,1);assert.equal(s.metrics.commands,1);
 assert.equal(E.reserves(s).length,0);assert.equal(E.at(s,s.map.camp)?.id,guard.id);
 assert.equal(reserve.hp,4);assert.equal(foe.hp,4);
 assert.equal(frames[0]?.kind,'deploy');assert.deepEqual(frames[0].origin,s.map.camp);
 assert.deepEqual(frames.find(event=>event.kind==='move')?.path[0],s.map.camp);
 assert(!E.canDeploy(s),'second sortie blocked this turn');
});
