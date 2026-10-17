// Four viewport sizes x three maps, direct choices, full phases and reload.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createGame} from '../engine.js';
import {launch,setup} from './browser-helpers.mjs';
let browser;const results=[];
try{
 for(const [label,width,height]of [['iphone',390,844],['android',360,740],['small',320,568],['landscape',844,390]]){
  browser=await launch();const t=await setup(browser,width,height),{page}=t;
  for(let map=0;map<3;map++){
   await t.reset(createGame(map));await t.select('a1');await page.getByRole('button',{name:'戻る',exact:true}).click();
   const u=(await t.state()).units.find(u=>u.id==='a1'),camera=await t.camera();
   await t.slide(u,{x:u.x,y:u.y-1});assert.deepEqual(await t.camera(),camera);
   assert.deepEqual(await page.locator('.command-row button').allTextContents(),['攻撃','待機','戻る']);assert.equal(await page.locator('#confirmOrder').count(),0);
   await page.getByRole('button',{name:'詳細',exact:true}).click();assert.deepEqual(await t.camera(),camera);await page.locator('#closeModal').click();assert.deepEqual(await t.camera(),camera);
   await page.locator('#menuBtn').click();assert.deepEqual(await t.camera(),camera);await page.locator('#closeModal').click();
   await page.locator('#waitOrder').click();await t.settled();assert.equal((await t.state()).units.find(a=>a.id===u.id).y,u.y-1);assert.deepEqual(await t.camera(),camera);
   await page.locator('#zoomIn').click();await page.locator('#zoomOut').click();await page.locator('#dangerBtn').click();await page.locator('#dangerBtn').click();
   for(let turn=0;turn<4;turn++){const before=await t.camera();await t.endTurn();assert.deepEqual(await t.camera(),before);}
   const state=await t.state();assert.equal(state.turn,5);assert.equal(state.map.id,map);
   const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,app:document.querySelector('#app').getBoundingClientRect().height>innerHeight+1,end:document.querySelector('#endTurn').getBoundingClientRect().bottom>innerHeight+1}));assert.deepEqual(geometry,{overflow:false,app:false,end:false});
   await page.locator('#logBtn').click();assert((await page.locator('#logs').innerText()).length);await page.locator('#closeModal').click();
   await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);assert.deepEqual(await t.state(),state);
   await page.screenshot({path:`test-results/${label}-map${map+1}-0.4.0.png`});results.push({label,map:map+1,turn:state.turn,cameraStable:true,errors:t.errors.length});
  }
  assert.deepEqual(t.errors,[]);await browser.close();
 }
 writeFileSync('test-results/browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{if(browser?.isConnected())await browser.close();}
