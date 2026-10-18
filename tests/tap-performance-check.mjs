import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createGame,act} from '../engine.js';
import {unit} from '../data.js';
import {RELEASE} from '../config.js';
import {launch,setup} from './browser-helpers.mjs';
const browser=await launch(),results=[];
try{
 const t=await setup(browser),{page}=t;
 const fixture=()=>{const s=createGame();s.units=[unit({id:'a',name:'剣士',type:'sword',x:5,y:16},'ally'),unit({id:'e',name:'敵',type:'shield',x:6,y:13,ai:'hold'},'enemy')];return s;};
 await t.reset(fixture());await t.tap({x:5,y:16});assert.equal((await t.draft()).selected,'a');assert.equal((await t.state()).metrics.commands,0);const camera=await t.camera();
 await t.tap({x:5,y:15});await t.settled();const expected=fixture();act(expected,'a',{x:5,y:15},'wait');assert.deepEqual(await t.state(),expected);assert.deepEqual(await t.camera(),camera);await page.reload();await page.waitForFunction(()=>!!srpgDebug);assert.deepEqual(await t.state(),expected);results.push('select then tap a non-attacking empty cell commits one animated move/wait and saves the complete result');
 await t.reset(fixture());await t.tap({x:5,y:16});const before=await t.draft();await t.tap({x:5,y:13});assert.deepEqual(await t.draft(),before);assert.equal((await t.state()).metrics.commands,0);results.push('releasing an attack-capable destination without an enemy restores the pre-press draft');
 const dest=await t.point({x:5,y:13}),enemy=await t.point({x:6,y:13});await t.touch('touchStart',[dest]);assert.deepEqual((await t.draft()).dest,{x:5,y:13});assert(!(await page.locator('#orders').isVisible()));assert(await page.locator('#nextUnit').isDisabled());const held=await t.draft();await page.keyboard.press('n');assert.deepEqual(await t.draft(),held);await t.touch('touchMove',[enemy]);await t.touch('touchEnd',[]);const aimed=await t.draft();assert.deepEqual(aimed.dest,{x:5,y:13});assert.equal(aimed.target,'e');assert.equal((await t.state()).metrics.commands,0);assert(await page.locator('#attackOrder').isEnabled());await page.screenshot({path:'test-results/tap-attack-0.7.0.png'});await page.locator('#attackOrder').click();await t.settled();const combat=fixture();act(combat,'a',{x:5,y:13},'attack','e');assert.deepEqual(await t.state(),combat);results.push('hold the destination and slide onto its enemy, retaining the exact endpoint; one attack choice executes');
 await t.reset(fixture());await t.tap({x:5,y:16});await t.tap({x:5,y:16});assert.equal((await t.draft()).selected,null);assert.equal((await t.state()).metrics.commands,0);
 await t.tap({x:5,y:16});await t.tap({x:0,y:10});assert.equal((await t.draft()).selected,null);assert.equal((await t.state()).metrics.commands,0);results.push('tapping the selected unit or an invalid destination cancels without consuming a command');
 await t.reset(fixture());await t.tap({x:5,y:16});const cancelBefore=await t.draft();await t.touch('touchStart',[await t.point({x:5,y:13})]);await t.touch('touchCancel',[]);assert.deepEqual(await t.draft(),cancelBefore);
 await t.touch('touchStart',[await t.point({x:5,y:13})]);await t.touch('touchStart',[await t.point({x:5,y:13}),await t.point({x:7,y:14})]);await t.touch('touchEnd',[]);assert.deepEqual(await t.draft(),cancelBefore);results.push('canceling a destination press or adding a second finger restores the entire draft');
 await t.reset(fixture());await t.slide({x:5,y:16},{x:5,y:13});assert(await page.locator('#waitOrder').isEnabled());await page.locator('#waitOrder').click();await t.settled();assert.equal((await t.state()).units[0].y,13);assert.equal((await t.state()).metrics.commands,1);results.push('an attack-capable destination still allows explicit wait through the unit-origin drag menu');
 // Failure inside a later rAF callback must not strand the final command or input lock.
 await page.emulateMedia({reducedMotion:'no-preference'});await t.reset(fixture());await t.slide({x:5,y:16},{x:5,y:15});
 await page.evaluate(()=>{const c=document.querySelector('#battlefield').getContext('2d'),draw=c.drawImage.bind(c);let failed=false;c.drawImage=(...args)=>{const a=srpgDebug.draft().animation;if(!failed&&a?.stage==='move'&&a.progress>0){failed=true;throw Error('test interrupted drawing');}return draw(...args);};});
 await page.locator('#waitOrder').click();await t.settled();assert.deepEqual(await t.state(),expected);assert(await page.locator('#nextUnit').isDisabled());results.push('a later animation drawing failure still finalizes the resolved state and releases the input lock');
 const performanceRows=await page.evaluate(async release=>{
  const {render,renderStats}=await import(`./render.js?v=${release}`),{createGame}=await import(`./engine.js?v=${release}`),rows=[];
  for(let id=0;id<6;id++){
   const state=createGame(id),canvas=document.createElement('canvas'),v={tile:32,selected:state.units[0].id,dest:state.units[0],menu:true,danger:true};
   render(canvas,state,v);const initial=renderStats(canvas),times=[];
   for(let i=0;i<120;i++){v.motion={id:state.units[0].id,x:state.units[0].x+i%10/10,y:state.units[0].y};const start=performance.now();render(canvas,state,v);times.push(performance.now()-start);}
   const steady=renderStats(canvas);if(JSON.stringify(initial)!==JSON.stringify(steady))throw Error('animation rebuilt tactical layers');
   state.units[0].move++;render(canvas,state,v);const stats=renderStats(canvas);if(stats.rangeBuilds!==steady.rangeBuilds+1)throw Error('stale edited movement');
   if(id===4){const before=renderStats(canvas);state.turn=4;render(canvas,state,v);if(renderStats(canvas).rangeBuilds!==before.rangeBuilds+1)throw Error('stale weather range');}
   const terrainBefore=renderStats(canvas).terrainBuilds;state.map.tiles[0]=state.map.tiles[0].replace(/./,state.map.tiles[0][0]==='.'?'f':'.');render(canvas,state,v);if(renderStats(canvas).terrainBuilds!==terrainBefore+1)throw Error('stale edited map');
   times.sort((a,b)=>a-b);rows.push({map:id+1,frames:times.length,meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[Math.floor(times.length*.95)],steady});
  }return rows;
 },RELEASE);results.push('720 frames across six maps reuse terrain, movement, attack, weather and danger layers; stat/weather/terrain edits invalidate them');
 assert.deepEqual(t.errors,[]);writeFileSync('test-results/tap-performance-results-0.7.0.json',JSON.stringify({results,performanceRows,errors:t.errors},null,2));console.log(JSON.stringify({results,performanceRows,errors:t.errors},null,2));
}finally{await browser.close();}
