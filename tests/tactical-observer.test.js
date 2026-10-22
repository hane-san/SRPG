import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {unit} from '../data.js';
import {createTacticalObserver} from './tactical-observer.mjs';

function fixture(){const s=E.createGame();s.units=[unit({id:'a',type:'sword',name:'a',x:4,y:15},'ally'),unit({id:'e',type:'sword',name:'e',x:4,y:14,ai:'hold'},'enemy')];return s;}
test('telemetry distinguishes P1 attacks and P2 enemy attacks/counters without mutating rules',()=>{
 const s=fixture(),plain=structuredClone(s),o=createTacticalObserver(s);o.beginTurn(s);
 for(const [state,observe]of [[s,o.observe],[plain,()=>{}]]){assert(E.act(state,'a',state.units[0],'attack','e',observe).ok);E.prepareEnemy(state);E.enemyPhase(state,observe);E.supportPhase(state,observe);E.eventPhase(state,observe);E.nextTurn(state);}
 o.command('attack');o.finishTurn(s);const before=structuredClone(s),r=o.summary(s);
 assert.deepEqual(s,plain);assert.deepEqual(s,before);assert.equal(r.p1Attacks,1);assert.equal(r.p1Waits,0);
 assert.equal(r.firstTurnEnemyAttacks,1);assert.equal(o.turns[0].hits,4);assert.deepEqual(r.noCombatTurns,[]);assert.deepEqual(r.noAdvanceTurns,[1]);
 assert(r.unmeasured.includes('humanEnjoyment'));assert.equal(r.capture,null);
});
test('telemetry counts actual P3 effects, including healing, rather than wait intentions',()=>{
 const s=fixture();s.units=[unit({id:'gun',type:'shooter',name:'gun',x:4,y:15},'ally'),unit({id:'e',type:'shield',name:'e',x:4,y:13,ai:'hold'},'enemy'),unit({id:'mage',type:'mage',name:'mage',x:7,y:16},'ally'),unit({id:'hurt',type:'sword',name:'hurt',x:7,y:17,hp:2},'ally')];s.units.find(u=>u.id==='hurt').hp=2;
 const o=createTacticalObserver(s);o.beginTurn(s);
 for(const id of ['gun','mage']){assert(E.act(s,id,s.units.find(u=>u.id===id),'wait',null,o.observe).ok);o.command('wait');}
 E.prepareEnemy(s);E.supportPhase(s,o.observe);o.finishTurn(s);const r=o.summary(s);assert.equal(r.p1Waits,2);assert.equal(r.p3Effects,2);assert.equal(r.p3Effects,s.metrics.supports);
});
test('warned-unit escapes and base loss are observed facts; mapless base is null',()=>{
 const s=fixture();s.turn=3;s.warnings=[{kind:'cannon',turn:3,cells:[{x:4,y:15}]}];
 const o=createTacticalObserver(s);o.beginTurn(s);assert(E.act(s,'a',{x:5,y:15},'wait',null,o.observe).ok);o.command('wait');o.beforeEvents(s);s.phase=4;E.eventPhase(s,o.observe);o.finishTurn(s);
 const r=o.summary(s);assert.equal(r.warnedAllyTurns,1);assert.equal(r.escapedBeforeImpact,1);assert.equal(r.cannonHitEvents,0);assert.equal(r.base,null);
 const base=E.createGame(1);base.units.push(unit({id:'raider',type:'horse',name:'raider',...base.map.base},'enemy'));const guard=createTacticalObserver(base);guard.beginTurn(base);E.checkOutcome(base);guard.finishTurn(base);assert.deepEqual(guard.summary(base).base,{heldThroughTurn:0,fallen:true});
});
