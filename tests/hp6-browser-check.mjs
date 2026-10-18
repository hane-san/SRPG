// v0.8 rule-change browser regression: deployments, HP6 forecasts, save, promotions, mobile dock.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as E from '../engine.js';
import {unit,MAPS} from '../data.js';
import {launch,setup} from './browser-helpers.mjs';
let browser;const cases=[];
try{
 for(const [label,width,height]of [['iphone',390,844],['android',360,740],['small',320,568],['landscape',844,390]]){
  browser=await launch();const t=await setup(browser,width,height),{page}=t;
  await page.evaluate(()=>localStorage.setItem('field-command-fast','true'));
  for(const map of MAPS){
   await t.reset(E.createGame(map.id));
   const first=await t.state();
   assert.equal(first.units.filter(u=>u.team==='ally'&&u.deployed).length,2);
   assert(first.units.every(u=>u.maxHp===6));
   const deploy=page.locator('#orders button').filter({hasText:'出撃'});
   assert.equal(await deploy.count(),1);
   if(map.id===0){await t.tap(first.map.camp);await page.locator('#modal[open]').waitFor({state:'visible',timeout:5000});}else await deploy.click();
   assert(await page.locator('#deploymentList button').count()>0);
   await page.locator('#deploymentList button').first().click();
   assert(await page.locator('#deploymentList button').filter({hasText:'中央'}).count()>0);
   await page.locator('#deploymentList button').filter({hasText:'中央'}).click();
   const deployed=await t.state();
   assert.equal(E.alive(deployed,'ally').length,3);
   assert.equal(deployed.deployedThisTurn,1);
   assert.equal(E.reserves(deployed).length,first.units.filter(u=>u.team==='ally').length-3);
   assert(!E.canDeploy(deployed),'only one sortie per turn');
   await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);
   assert.deepEqual(await t.state(),deployed,'the sortie survives reload');
   const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,app:document.querySelector('#app').getBoundingClientRect().height>innerHeight+1,end:document.querySelector('#endTurn').getBoundingClientRect().bottom>innerHeight+1}));
   assert.deepEqual(geometry,{overflow:false,app:false,end:false});
   await t.endTurn();const after=await t.state();assert(after.turn===2||after.status!=='playing');
   await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);
   assert.deepEqual(await t.state(),after);
   cases.push({label,map:map.id+1,phase:after.phase,status:after.status,turn:after.turn,errors:t.errors.length});
  }
  assert.deepEqual(t.errors,[],label);
  await browser.close();browser=null;
 }
 browser=await launch();const t=await setup(browser),{page}=t;
 const melee=E.createGame();melee.units=[
  unit({id:'a',name:'味方',type:'sword',x:4,y:15},'ally'),
  unit({id:'e',name:'敵',type:'sword',x:4,y:14,ai:'hold'},'enemy')];
 await t.reset(melee);await t.select('a');
 assert((await page.locator('#actionPreview').innerText()).includes('6 → 4'));
 await page.locator('#attackOrder').click();await t.settled();
 const hit=await t.state();assert.equal(hit.units[0].hp,4);assert.equal(hit.units[1].hp,4);
 assert((await page.locator('#orders').innerText()).includes('HP 6 →'));
 cases.push({scenario:'fixed six HP strike/counter, no extra confirmation'});
 const support=E.createGame();support.units=[
  unit({id:'archer',name:'弓手',type:'bow',x:5,y:16},'ally'),
  unit({id:'target',name:'標的',type:'sword',x:5,y:14,ai:'hold'},'enemy')];
 await t.reset(support);await t.select('archer');await page.locator('#waitOrder').click();await t.settled();
 await t.endTurn();const p3=await t.state();assert.equal(p3.units.find(u=>u.id==='target').hp,4);
 assert.equal(p3.units.find(u=>u.id==='archer').charges,2,'P3 spent one, castle resupplied one');
 cases.push({scenario:'P3 consumes ammunition; castle replenishes at next turn'});
 const promotion=E.createGame(1);promotion.status='victory';
 await t.reset(promotion,'0.8.0',true);
 await page.getByRole('button',{name:'上級職の技能を選ぶ'}).click();
 assert(await page.locator('#promotionList button').count()>0);
 await page.locator('#promotionList button').first().click();
 assert(Object.values((await t.state()).specialties).some(v=>v==='guard'));
 cases.push({scenario:'named upper-class choice is persisted'});
 assert.deepEqual(t.errors,[]);
 writeFileSync('test-results/hp6-browser-results.json',JSON.stringify(cases,null,2));
 console.log(JSON.stringify(cases,null,2));
}finally{if(browser?.isConnected())await browser.close();}
