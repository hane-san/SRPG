// Overlay translucency, geometry, warning/short screens and accessible choices.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createGame} from '../engine.js';
import {launch,setup} from './browser-helpers.mjs';
let browser;const results=[];
try{
 for(const [width,height]of [[390,844],[360,740],[320,568],[844,390],[1363,936]]){
  browser=await launch();const t=await setup(browser,width,height),{page}=t;
  for(const warning of [false,true]){
   const s=createGame();if(warning)s.warnings=[{kind:'cannon',turn:1,cells:[{x:5,y:18}]}];await t.reset(s);
   await page.evaluate(()=>{const v=document.querySelector('#mapViewport'),tile=document.querySelector('#battlefield').getBoundingClientRect().width/12;v.scrollTop=16*tile-v.clientHeight*.68;});
   const geometry=()=>page.evaluate(()=>{const v=document.querySelector('#mapViewport'),r=v.getBoundingClientRect(),c=document.querySelector('#battlefield').getBoundingClientRect();return [r.x,r.y,r.width,r.height,c.x,c.y,c.width,c.height,v.scrollLeft,v.scrollTop];});
   const before=await geometry();await t.slide({x:5,y:16},{x:5,y:15});assert.deepEqual(await geometry(),before);
   const buttons=await page.locator('#orders button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,w:r.width,h:r.height,onScreen:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth};}));assert(buttons.every(b=>b.w>=44&&b.h>=44&&b.onScreen),JSON.stringify({width,height,warning,buttons}));
   const color=await page.locator('#orders').evaluate(e=>getComputedStyle(e).backgroundColor);assert(/^rgba\(/.test(color),color);
   await page.getByRole('button',{name:'詳細',exact:true}).click();assert.deepEqual(await geometry(),before);await page.locator('#closeModal').click();assert.deepEqual(await geometry(),before);
   await page.screenshot({path:`test-results/quick-${width}x${height}${warning?'-warning':''}-0.4.0.png`});
   await page.getByRole('button',{name:'戻る',exact:true}).click();assert.equal((await t.state()).metrics.commands,0);assert.deepEqual(await geometry(),before);
   await t.slide({x:5,y:16},{x:5,y:15});await page.locator('#waitOrder').click();await t.settled();assert.deepEqual(await geometry(),before);
   results.push({width,height,warning,cameraStable:true,translucent:true,buttons,errors:t.errors});
  }
  assert.deepEqual(t.errors,[]);await browser.close();
 }
 writeFileSync('test-results/overlay-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({width,height,warning,cameraStable,translucent,errors})=>({width,height,warning,cameraStable,translucent,errors})),null,2));
}finally{if(browser?.isConnected())await browser.close();}
