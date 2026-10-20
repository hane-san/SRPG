// Same deterministic policy for both layouts. This is an example, never an optimal solver.
import * as E from '../engine.js';
import {unit,MAPS} from '../data.js';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const before=JSON.parse(readFileSync(new URL('./fixtures/issue17-enemies-before.json',import.meta.url)));
export function scenario(id,layout='after'){
 const s=E.createGame(id);
 if(layout==='before'){
  s.map.enemies=structuredClone(before.maps[id]);
  s.units=[...s.units.filter(u=>u.team==='ally'),...s.map.enemies.map(e=>unit(e,'enemy',s.settings))];
 }
 return s;
}
export function run(id,layout='after',policy='advance',limit=40){
 const s=scenario(id,layout),trace=[];let stalled=0,lastSignature='',stop='turn-limit';
 for(;s.status==='playing'&&s.turn<=limit;){
  const turn=s.turn,events=[];let sorties=0;
  const observe=(state,a,e)=>{if(e.kind==='deploy')sorties++;if(e.kind==='hit'||e.kind==='heal')events.push({phase:state.phase,...e});};
  // Choose first living reserve in roster order; sortie from the castle and act once.
  const bench=E.reserves(s)[0],virtual=bench&&E.canDeploy(s)?E.sortieUnit(s,bench.id):null;
  const units=[...E.alive(s,'ally'),...(virtual?[virtual]:[])];
  for(const u of units){
   if(s.status!=='playing'||!u.alive)continue;
   const sortie=u===virtual,issue=c=>sortie?E.deployAndAct(s,u.id,c.p,c.a,c.t,observe):E.act(s,u.id,c.p,c.a,c.t,observe);
   if(policy==='hold'){
    const p=sortie?E.reachable(s,u).filter(p=>!E.at(s,p)).sort((a,b)=>a.cost-b.cost||a.y-b.y||a.x-b.x)[0]:u;
    if(p)issue({p,a:'wait'});continue;
   }
   let goal=s.map.goal;
   // Shield defends the base while southern raiders exist; healers follow wounded allies.
   if(s.map.base&&u.type==='shield'&&E.alive(s,'enemy').some(e=>e.ai==='raid'))goal=s.map.base;
   if(u.skill==='heal')goal=E.alive(s,'ally').filter(a=>a.id!==u.id).sort((a,b)=>a.hp-b.hp||a.y-b.y||a.id.localeCompare(b.id))[0]||goal;
   const field=E.distanceField(s,goal,'ally'),enemies=E.alive(s,'enemy');
   const threats=enemies.map(e=>({e,cells:E.reachable(s,e,e.ai==='hold'?0:E.movement(s,e),{threat:true})}));
   const choices=[];
   for(const p of E.reachable(s,u)){
    const risk=threats.reduce((n,{e,cells})=>n+(cells.some(c=>E.inRange({...e,...c},p))?E.damage(s,e,{...u,...p}):0),0);
    let score=-(field.get(E.key(p))??999)*1.5-risk*.65-(risk>=u.hp?20:0);
    if(s.map.base&&E.dist(goal,s.map.base)===0&&u.type==='shield'&&E.dist(p,s.map.base)===0)score+=20;
    if(s.warnings.some(w=>w.kind==='cannon'&&w.turn===s.turn&&w.cells.some(c=>E.dist(c,p)===0)))score-=30;
    const stationary=E.dist(p,u)===0,ts=stationary?E.supportTargets(s,u):[];
    const support=u.charges>0?ts.reduce((n,t)=>n+(u.skill==='heal'?E.healAmount(s,u,t)*3:E.damage(s,u,t)*1.5),0):0;
    choices.push({p,a:'wait',score:score+support});
    for(const t of enemies)if(E.inRange({...u,...p},t)){
     const pr=E.prediction(s,u,t,p);choices.push({p,a:'attack',t:t.id,score:score+pr.damage*2+(pr.damage>=t.hp?24:0)-pr.counter*1.3});
    }
   }
   choices.sort((a,b)=>b.score-a.score||a.p.cost-b.p.cost||a.p.y-b.p.y||a.p.x-b.p.x||String(a.t||'').localeCompare(String(b.t||'')));
   for(const c of choices)if(issue(c).ok)break;
  }
  if(E.prepareEnemy(s)){E.enemyPhase(s,observe);E.supportPhase(s,observe);E.eventPhase(s,observe);E.nextTurn(s);}
  const signature=JSON.stringify([E.alive(s).map(u=>[u.id,u.x,u.y,u.hp,u.charges]),E.reserves(s).map(u=>u.id),s.warnings,E.weatherAt(s)]);
  stalled=signature===lastSignature?stalled+1:0;lastSignature=signature;
  trace.push({turn,enemyHits:events.filter(e=>e.phase===2&&!e.counter&&s.units.find(u=>u.id===e.actor)?.team==='enemy'),events,alive:E.alive(s,'ally').length,reserves:E.reserves(s).length,sorties,legalMoves:E.alive(s,'ally').reduce((n,u)=>n+E.reachable(s,u).filter(p=>E.dist(p,u)>0).length,0),canDeploy:E.canDeploy(s),deaths:s.metrics.deaths.filter(d=>d.turn===turn)});
  if(stalled>=6){stop='unchanged-six-turns';break;}
 }
 return {map:id+1,layout,policy,status:s.status==='playing'?(stop==='unchanged-six-turns'?'stalled':'timeout'):s.status,stop:s.status==='playing'?stop:'outcome',turn:s.turn,alive:E.alive(s,'ally').length,reserves:E.reserves(s).length,commands:s.metrics.commands,deaths:s.metrics.deaths,trace};
}
export function audit(){return {source:before.source,policy:'roster-order castle sortie once per turn, advance or hold; 40-turn cap; six unchanged states stop',results:MAPS.flatMap(m=>['before','after'].flatMap(layout=>['advance','hold'].map(policy=>run(m.id,layout,policy))))};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=audit();if(process.argv.includes('--save'))writeFileSync('docs/issue17-balance-results.json',JSON.stringify({...result,results:result.results.map(({trace,...r})=>({...r,opening:trace.slice(0,6).map(({events,...t})=>t),final:(({events,...t})=>t)(trace.at(-1))}))},null,2)+'\n');for(const r of result.results)console.log(JSON.stringify({map:r.map,layout:r.layout,policy:r.policy,status:r.status,turn:r.turn,alive:r.alive,reserves:r.reserves,firstThreeHits:r.trace.slice(0,3).map(t=>t.enemyHits.length),allyDeaths:r.deaths.filter(d=>d.id.startsWith('a')).length}));}
