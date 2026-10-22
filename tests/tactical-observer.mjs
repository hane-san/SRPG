// Test-only telemetry. Never attach counters or scenario flags to the game/save state.
import * as E from '../engine.js';

export function createTacticalObserver(initial){
 const turns=[],bridges=new Set(),field=E.distanceField({...initial,units:[]},initial.map.goal,'ally');
 let current;
 const start=s=>{
  current={turn:s.turn,commands:0,attacks:0,waits:0,deployments:0,p3:0,hits:0,enemyAttacks:0,movementSteps:0,advanceSteps:0,
   incomingCannon:s.warnings.filter(w=>w.kind==='cannon'&&w.turn===s.turn).flatMap(w=>w.cells),warnedUnits:[],escapedBeforeImpact:0,cannonHits:0,allyCannonHits:0};
  current.warnedUnits=E.alive(s,'ally').filter(u=>current.incomingCannon.some(c=>E.dist(c,u)===0)).map(u=>u.id);
  turns.push(current);
 };
 const observe=(s,actor,event)=>{
  if(!current)throw Error('beginTurn must precede observations');
  if(event.kind==='deploy')current.deployments++;
  if(event.kind==='hit'){
   current.hits++;
   if(s.phase===2&&actor?.team==='enemy'&&!event.counter)current.enemyAttacks++;
   // The barrage also strikes enemies standing in the cells, so count allies separately.
   if(s.phase===4&&event.actor===null){current.cannonHits++;if(actor?.team==='ally')current.allyCannonHits++;}
  }
  if(s.phase===3&&['hit','heal'].includes(event.kind))current.p3++;
  if(event.kind==='move'&&actor?.team==='ally'){
   current.movementSteps+=event.path.length-1;
   for(const p of event.path)if(s.map.tiles[p.y][p.x]==='+')bridges.add(E.key(p));
   for(let i=1;i<event.path.length;i++)if(field.get(E.key(event.path[i]))<field.get(E.key(event.path[i-1])))current.advanceSteps++;
  }
 };
 const command=action=>{current.commands++;current[action==='attack'?'attacks':'waits']++;};
 const beforeEvents=s=>{
  current.escapedBeforeImpact=current.warnedUnits.filter(id=>{
   const u=E.alive(s,'ally').find(u=>u.id===id);
   return u&&!current.incomingCannon.some(c=>E.dist(c,u)===0);
  }).length;
 };
 const finishTurn=s=>{
  current.baseHeld=s.map.base?!(s.status==='defeat'&&E.alive(s,'enemy').some(u=>E.dist(u,s.map.base)===0)):null;
  current.allyDeaths=s.metrics.deaths.filter(d=>d.turn===current.turn&&s.units.find(u=>u.id===d.id)?.team==='ally').map(d=>d.id);
 };
 const summary=s=>({
  observedTurns:turns.length,firstCombatTurn:turns.find(t=>t.hits)?.turn??null,
  noCombatTurns:turns.filter(t=>!t.hits).map(t=>t.turn),noAdvanceTurns:turns.filter(t=>!t.advanceSteps).map(t=>t.turn),
  p1Attacks:turns.reduce((n,t)=>n+t.attacks,0),p1Waits:turns.reduce((n,t)=>n+t.waits,0),
  deployments:turns.reduce((n,t)=>n+t.deployments,0),p3Effects:turns.reduce((n,t)=>n+t.p3,0),
  firstTurnEnemyAttacks:turns[0]?.enemyAttacks??0,
  capture:s.status==='victory'?{turn:s.turn,commands:s.metrics.commands}:null,
  base:s.map.base?{heldThroughTurn:turns.filter(t=>t.baseHeld).at(-1)?.turn??0,fallen:s.status==='defeat'&&E.alive(s,'enemy').some(u=>E.dist(u,s.map.base)===0)}:null,
  warnedAllyTurns:turns.reduce((n,t)=>n+t.warnedUnits.length,0),escapedBeforeImpact:turns.reduce((n,t)=>n+t.escapedBeforeImpact,0),
  cannonHitEvents:turns.reduce((n,t)=>n+t.cannonHits,0),allyCannonHitEvents:turns.reduce((n,t)=>n+t.allyCannonHits,0),allyDeaths:s.metrics.deaths.filter(d=>s.units.find(u=>u.id===d.id)?.team==='ally'),
  bridgeCells:[...bridges].sort(),unmeasured:['humanEnjoyment','touchOperationCount','optimalStrategy','storyFlags','counterfactualGarrisonBenefit']
 });
 return {beginTurn:start,observe,command,beforeEvents,finishTurn,summary,turns};
}
