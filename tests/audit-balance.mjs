// Complement the unchanged greedy comparison with explicit garrison and campaign checks.
import {play} from './simulate.mjs';
import {writeFileSync} from 'node:fs';
import {RELEASE} from '../config.js';
export function campaign(mode='classic',policy='garrison'){
 const chapters=[];let lost=[];
 for(let map=0;map<3;map++){
  const {s,result}=play(map,policy,{mode},35,lost);chapters.push(result);lost=s.lost;
  if(result.status!=='victory')break;
 }
 return {mode,policy,chapters,lost};
}
if(process.argv[1]?.endsWith('audit-balance.mjs')){
 const campaigns=['classic','casual'].map(mode=>campaign(mode)),difficulty=[];
 for(const enemyAttack of [-2,0,2])for(let map=0;map<6;map++){const {result}=play(map,map===1?'garrison':'advance',{enemyAttack});difficulty.push({enemyAttack,...result});}
 const report={method:'Greedy deterministic examples, not optimal play or human enjoyment',campaigns,difficulty};
 if(process.argv.includes('--save'))writeFileSync(`docs/campaign-audit-${RELEASE}.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({campaigns:campaigns.map(c=>({mode:c.mode,lost:c.lost,chapters:c.chapters.map(r=>({map:r.map,status:r.status,turn:r.turn,alive:r.alive}))})),difficulty:difficulty.map(r=>({map:r.map,attack:r.enemyAttack,status:r.status,turn:r.turn,alive:r.alive}))},null,2));
}
