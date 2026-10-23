// Reproducible baseline agents, not an optimal solver or a replacement for human play.
import * as E from '../engine.js';
import {RELEASE} from '../config.js';
import {writeFileSync} from 'node:fs';
import {unit} from '../data.js';
import {createTacticalObserver} from './tactical-observer.mjs';
export function play(mapId,policy='advance',opts={},maxTurns=35,lost=[],initialMap=null){const s=E.createGame(mapId,opts,lost);
 if(initialMap){s.map=structuredClone(initialMap);s.units=[...s.units.filter(u=>u.team==='ally'),...s.map.enemies.map(e=>unit(e,'enemy',s.settings))];}
 const telemetry=createTacticalObserver(s);let reachedEast=false,firstCombatTurn=null,hits=0,heals=0,movementSteps=0;const combatTurns=new Set(),garrison=s.map.base?E.alive(s,'ally').filter(u=>E.dist(u,s.map.base)===0||u.skill==='heal'&&E.dist(u,s.map.base)===1).map(u=>u.id):[];
 const observe=(state,actor,event)=>{telemetry.observe(state,actor,event);if(event?.kind==='hit'){firstCombatTurn??=state.turn;combatTurns.add(state.turn);hits++;}else if(event?.kind==='heal')heals++;else if(event?.kind==='move')movementSteps+=event.path.length-1;};
 while(s.status==='playing'&&s.turn<=maxTurns){
  telemetry.beginTurn(s);
  const enemies=E.alive(s,'enemy');
  const enemyReach=enemies.map(e=>({e,positions:E.reachable(s,e,e.ai==='hold'?0:E.movement(s,e),{threat:true})}));
  function risk(p,u){return enemyReach.reduce((v,{e,positions})=>v+(positions.some(n=>E.inRange({...e,...n},p))?E.damage(s,e,{...u,...p}):0),0);}
  // Fighters first, healers after movement to recover them. Bow before melee where possible.
  // Issue #29: everyone starts in the castle reserve. Sortie candidates are planned
  // from the castle and committed through deployAndAct, exactly like the UI.
  const bench=E.reserves(s).filter(u=>policy!=='basic'||E.canNormalAttack(u));if(policy==='fast')bench.sort((a,b)=>['horse','sword','bow','shield','mage','healer','medic','shooter'].indexOf(a.type)-['horse','sword','bow','shield','mage','healer','medic','shooter'].indexOf(b.type)||a.id.localeCompare(b.id));
  // Issue #63: a front line with artillery/medics early (shield, sword, shooter, mage first).
  if(policy==='line')bench.sort((a,b)=>['shield','sword','shooter','mage','horse','bow','healer','medic'].indexOf(a.type)-['shield','sword','shooter','mage','horse','bow','healer','medic'].indexOf(b.type)||a.id.localeCompare(b.id));
  // Issue #61: weather-reading map05 trial — front line and support units first.
  if(policy==='rain')bench.sort((a,b)=>['shield','sword','shooter','mage','horse','bow','healer','medic'].indexOf(a.type)-['shield','sword','shooter','mage','horse','bow','healer','medic'].indexOf(b.type)||a.id.localeCompare(b.id));
  const sortied=[];for(const r of bench.slice(0,Math.max(0,E.deploymentLimit(s)-s.deployedThisTurn)))if(E.canDeploy(s)&&E.sortieUnit(s,r.id))sortied.push(r.id);
  const allies=[...E.alive(s,'ally'),...sortied.map(id=>s.units.find(u=>u.id===id))].sort((a,b)=>Number(['healer','medic'].includes(a.type))-Number(['healer','medic'].includes(b.type))||Number(b.type==='bow')-Number(a.type==='bow')||a.id.localeCompare(b.id));
  for(const unit of allies){if(!unit.alive||s.status!=='playing')continue;
   const sortie=unit.deployed===false;if(sortie&&!E.canDeploy(s))continue;const u=sortie?E.sortieUnit(s,unit.id):unit;
   const command=(p,a,t)=>{const r=sortie?E.deployAndAct(s,u.id,p,a,t,observe):E.act(s,u.id,p,a,t,observe);if(r.ok)telemetry.command(a);return r;};
   if(!sortie&&policy==='pause'&&s.turn%3===0){command(u,'wait');continue;}
   if(!sortie&&policy==='garrison'&&mapId===1&&garrison.includes(u.id)){command(u,'wait');continue;}
   if(policy==='hold'&&!sortie){command(u,'wait');continue;}
   let goal=s.map.goal;
   // Issue #66: compare the same roster/score on a deliberately chosen map04
   // crossing. Both rivers must actually be crossed on that side.
   if(mapId===3&&['west','central','east'].includes(policy)&&u.y>=12)goal={x:{west:2,central:6,east:10}[policy],y:u.y>=25?24:11};
   if(mapId===0&&['west','central'].includes(policy)&&u.y>=10)goal={x:policy==='west'?3:6,y:9};
   if(policy==='detour'&&s.turn===2&&!sortie)goal={x:1,y:s.map.camp.y};
   if(policy==='base'&&u.type==='shield')goal=s.map.base||s.map.camp;
   if(policy==='east'&&mapId===1&&['horse','sword'].includes(u.type)&&u.y>3)goal={x:13,y:Math.max(2,u.y-5)};
   // Map 03 east-bridge rush: every non-medical unit takes the eastern road and bridge, then turns to the castle.
   if(policy==='east'&&mapId===2&&!['healer','medic'].includes(u.type)&&u.y>3)goal={x:10,y:Math.max(2,u.y-5)};
   if(policy==='east'&&mapId===4&&u.y>3&&!['healer','medic'].includes(u.type))goal={x:11,y:Math.max(2,u.y-5)};
   if(policy==='south'&&[1,5].includes(mapId)&&s.map.south&&!s.southTaken)goal=s.map.south;
   if(policy!=='offense'&&mapId===1&&['shield','bow','healer','medic'].includes(u.type)){
    const attackers=E.alive(s,'enemy').filter(e=>e.y>17);if(attackers.length)goal=s.map.base;
   }
   if(['healer','medic'].includes(u.type)){const wounded=E.alive(s,'ally').filter(a=>a.id!==u.id).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);goal=wounded[0]||goal;if(wounded.every(a=>a.hp===a.maxHp))goal=E.alive(s,'ally').filter(a=>!['healer','medic'].includes(a.type)).sort((a,b)=>a.y-b.y)[0]||goal;}
   const field=E.distanceField(s,goal,u.team);let pos=E.reachable(s,u);
   if(mapId===0&&['west','central'].includes(policy)&&u.y>=10)pos=pos.filter(p=>E.routeTo(s,u,p).every(c=>![10,11].includes(c.y)||(policy==='west'?c.x<=3:[5,6].includes(c.x))));
   // Heavy rain: units already on the board hold still, so P3 specialists stay armed.
   if(policy==='rain'&&!sortie&&E.weatherAt(s)==='heavy')pos=pos.filter(p=>E.dist(p,u)===0);
   if(mapId===3&&['west','central','east'].includes(policy))pos=pos.filter(p=>E.routeTo(s,u,p).every(c=>![12,13,25,26].includes(c.y)||({west:c.x<=3,central:c.x>=5&&c.x<=7,east:c.x>=9})[policy]));
   const choices=[];
   const healType=['healer','medic'].includes(u.type),goalDistance=p=>field.get(E.key(p))??999;
   for(const p of pos){const moved=E.dist(p,u)>0;let r=risk(p,u),dangerPenalty=r*(policy==='cautious'?1.1:policy==='fast'?.35:.65)+(r>=u.hp?30:0);const imminent=s.warnings.some(w=>w.kind==='cannon'&&w.turn===s.turn&&w.cells.some(c=>E.dist(c,p)===0));if(imminent)dangerPenalty+=12;
    let score=-goalDistance(p)*1.5-dangerPenalty+(E.terrain(s,p)?.def||0);
    if(goalDistance(p)===0&&!healType)score+=5;
    choices.push({p,a:'wait',score});
    for(const t of E.alive(s,'enemy'))if(E.inRange({...u,...p},t)){
     const pr=E.prediction(s,u,t,p);choices.push({p,a:'attack',t,score:score+pr.damage*1.5+(pr.damage>=t.hp?24:0)-pr.counter*1.3});
    }
    if(!moved&&['heal','support'].includes(u.skill)){const ts=E.supportTargets(s,u);if(ts.length){const benefit=ts.reduce((sum,t)=>sum+(u.skill==='heal'?E.healAmount(s,u,t)*2+8:E.damage(s,u,t)*1.5+(E.damage(s,u,t)>=t.hp?24:0)),0);if(u.skill==='heal'||u.charges>0)choices.push({p,a:'wait',score:score+benefit});}}
   }
   choices.sort((a,b)=>b.score-a.score||a.p.cost-b.p.cost||a.p.y-b.p.y||a.p.x-b.p.x);
   for(const c of choices)if((!sortie||E.dist(c.p,u)>0)&&command(c.p,c.a,c.t?.id).ok)break;
   if(u.x>=12)reachedEast=true;
  }
  if(E.prepareEnemy(s)){E.enemyPhase(s,observe);E.supportPhase(s,observe);telemetry.beforeEvents(s);E.eventPhase(s,observe);E.nextTurn(s);}
  telemetry.finishTurn(s);
 }
 const result={map:mapId+1,policy,healing:s.settings.healing,status:s.status==='playing'?'timeout':s.status,turn:s.turn,alive:E.alive(s,'ally').length,southTaken:s.southTaken,reachedEast,firstCombatTurn,combatTurns:combatTurns.size,hits,heals,movementSteps,...s.metrics};
 result.tactical=telemetry.summary(s);return {s,result,trace:telemetry.turns};
}
if(process.argv[1]?.endsWith('simulate.mjs')){const results=[];for(const id of [0,1,2,3,4,5])for(const policy of ['advance','cautious','hold',...(id===0?['pause','fast']:[]),...(id===1?['east','south','garrison']:[]),...(id===2?['fast','east']:[]),...(id===3?['fast','west','central','east']:[]),...([1,5].includes(id)?['base','offense']:[]),...(id===4?['fast','rain','east']:[]),...(id===5?['fast','south','line']:[])]){const {result}=play(id,policy);results.push(result);console.log(JSON.stringify(result));}if(process.argv.includes('--save'))writeFileSync(`docs/simulation-results-${RELEASE}.json`,JSON.stringify(results,null,2)+'\n');}

