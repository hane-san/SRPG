// Reproducible baseline agents, not an optimal solver or a replacement for human play.
import * as E from '../engine.js';
import {RELEASE} from '../config.js';
import {writeFileSync} from 'node:fs';
export function play(mapId,policy='advance',opts={},maxTurns=35,lost=[]){const s=E.createGame(mapId,opts,lost);let reachedEast=false,firstCombatTurn=null,hits=0,heals=0,movementSteps=0;const combatTurns=new Set(),garrison=s.map.base?E.alive(s,'ally').filter(u=>E.dist(u,s.map.base)===0||u.skill==='heal'&&E.dist(u,s.map.base)===1).map(u=>u.id):[];
 const observe=(state,_actor,event)=>{if(event?.kind==='hit'){firstCombatTurn??=state.turn;combatTurns.add(state.turn);hits++;}else if(event?.kind==='heal')heals++;else if(event?.kind==='move')movementSteps+=event.path.length-1;};
 while(s.status==='playing'&&s.turn<=maxTurns){
  const enemies=E.alive(s,'enemy');
  const enemyReach=enemies.map(e=>({e,positions:E.reachable(s,e,e.ai==='hold'?0:E.movement(s,e),{threat:true})}));
  function risk(p,u){return enemyReach.reduce((v,{e,positions})=>v+(positions.some(n=>E.inRange({...e,...n},p))?E.damage(s,e,{...u,...p}):0),0);}
  // Fighters first, healers after movement to recover them. Bow before melee where possible.
  // Issue #29: everyone starts in the castle reserve. Sortie candidates are planned
  // from the castle and committed through deployAndAct, exactly like the UI.
  const sortied=[];for(const r of E.reserves(s).slice(0,Math.max(0,E.deploymentLimit(s)-s.deployedThisTurn)))if(E.canDeploy(s)&&E.sortieUnit(s,r.id))sortied.push(r.id);
  const allies=[...E.alive(s,'ally'),...sortied.map(id=>s.units.find(u=>u.id===id))].sort((a,b)=>Number(['healer','medic'].includes(a.type))-Number(['healer','medic'].includes(b.type))||Number(b.type==='bow')-Number(a.type==='bow')||a.id.localeCompare(b.id));
  for(const unit of allies){if(!unit.alive||s.status!=='playing')continue;
   const sortie=unit.deployed===false;if(sortie&&!E.canDeploy(s))continue;const u=sortie?E.sortieUnit(s,unit.id):unit;
   const command=(p,a,t)=>sortie?E.deployAndAct(s,u.id,p,a,t,observe):E.act(s,u.id,p,a,t,observe);
   if(!sortie&&policy==='garrison'&&mapId===1&&garrison.includes(u.id)){command(u,'wait');continue;}
   if(policy==='hold'&&!sortie){command(u,'wait');continue;}
   let goal=s.map.goal;
   if(policy==='east'&&mapId===1&&['horse','sword'].includes(u.type)&&u.y>3)goal={x:13,y:Math.max(2,u.y-5)};
   if(policy==='south'&&mapId===1&&!s.southTaken)goal=s.map.south;
   if(mapId===1&&['shield','bow','healer','medic'].includes(u.type)){
    const attackers=E.alive(s,'enemy').filter(e=>e.y>17);if(attackers.length)goal=s.map.base;
   }
   if(['healer','medic'].includes(u.type)){const wounded=E.alive(s,'ally').filter(a=>a.id!==u.id).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);goal=wounded[0]||goal;if(wounded.every(a=>a.hp===a.maxHp))goal=E.alive(s,'ally').filter(a=>!['healer','medic'].includes(a.type)).sort((a,b)=>a.y-b.y)[0]||goal;}
   const field=E.distanceField(s,goal,u.team);const pos=E.reachable(s,u);const choices=[];
   const healType=['healer','medic'].includes(u.type),goalDistance=p=>field.get(E.key(p))??999;
   for(const p of pos){const moved=E.dist(p,u)>0;let r=risk(p,u),dangerPenalty=r*(policy==='cautious'?1.1:.65)+(r>=u.hp?30:0);const imminent=s.warnings.some(w=>w.kind==='cannon'&&w.turn===s.turn&&w.cells.some(c=>E.dist(c,p)===0));if(imminent)dangerPenalty+=12;
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
  if(E.prepareEnemy(s)){E.enemyPhase(s,observe);E.supportPhase(s,observe);E.eventPhase(s,observe);E.nextTurn(s);}
 }
 const result={map:mapId+1,policy,healing:s.settings.healing,status:s.status==='playing'?'timeout':s.status,turn:s.turn,alive:E.alive(s,'ally').length,southTaken:s.southTaken,reachedEast,firstCombatTurn,combatTurns:combatTurns.size,hits,heals,movementSteps,...s.metrics};
 return {s,result};
}
if(process.argv[1]?.endsWith('simulate.mjs')){const results=[];for(const id of [0,1,2,3,4,5])for(const policy of ['advance','cautious','hold',...(id===1?['east','south','garrison']:[])]){const {result}=play(id,policy);results.push(result);console.log(JSON.stringify(result));}if(process.argv.includes('--save'))writeFileSync(`docs/simulation-results-${RELEASE}.json`,JSON.stringify(results,null,2)+'\n');}

