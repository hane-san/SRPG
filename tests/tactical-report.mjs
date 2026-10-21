import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {play} from './simulate.mjs';
const prior=JSON.parse(readFileSync(new URL('./fixtures/map01-before-38.json',import.meta.url)));
export function tacticalReport(){
 const rows=[];
 for(const layout of ['before','after'])for(const policy of ['advance','pause','fast','basic','detour','west','central'])rows.push({layout,...play(0,policy,{},35,[],layout==='before'?prior.map:null).result});
 for(const id of [1,2,3,4,5])for(const policy of [1,5].includes(id)?['base','offense']:['advance'])rows.push({layout:'unchanged',...play(id,policy).result});
 return {baselineSource:prior.source,settings:{mode:'classic',healing:'H1',enemyAttack:0},turnCap:35,
  note:'Same rules, difficulty, policy and enemy count before/after. Policies are reproducible examples, not optimal strategies. Old-route policies have the same coordinate constraints on both layouts; the old map has no west bridge.',rows};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=tacticalReport();if(process.argv.includes('--save'))writeFileSync('docs/tactical-report-38-41.json',JSON.stringify(report,null,2)+'\n');
 for(const r of report.rows)console.log(JSON.stringify({map:r.map,layout:r.layout,policy:r.policy,status:r.status,turn:r.turn,commands:r.commands,allyDeaths:r.tactical.allyDeaths.length,noCombatTurns:r.tactical.noCombatTurns.length,noAdvanceTurns:r.tactical.noAdvanceTurns.length,openingEnemyAttacks:r.tactical.firstTurnEnemyAttacks,p3:r.tactical.p3Effects,base:r.tactical.base}));
}
