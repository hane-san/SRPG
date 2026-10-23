// Reproduce the before/after comparison using one engine and one policy set.
import {readFileSync,writeFileSync} from 'node:fs';
import {play} from './simulate.mjs';
const before=JSON.parse(readFileSync(new URL('./fixtures/map04-before-66.json',import.meta.url))).map;
const results=[];
for(const policy of ['advance','cautious','hold','fast','west','central','east'])for(const layout of ['before','after']){
 const {result}=play(3,policy,{},35,[],layout==='before'?before:null);
 results.push({layout,...result});
 console.log(JSON.stringify({layout,policy,status:result.status,turn:result.turn,commands:result.commands,
  losses:result.tactical.allyDeaths.length,noCombat:result.tactical.noCombatTurns.length,
  p3:result.tactical.p3Effects,opening:result.tactical.firstTurnEnemyAttacks,bridges:result.tactical.bridgeCells}));
}
if(process.argv.includes('--save'))writeFileSync(new URL('../docs/map04-crossings-results.json',import.meta.url),
 '{\n  "sourceMain": "a6a84fc",\n  "command": "node tests/map04-crossings-report.mjs --save",\n  "turnLimit": 35,\n  "results": [\n'+
 results.map(r=>'    '+JSON.stringify(r)).join(',\n')+'\n  ]\n}\n');
