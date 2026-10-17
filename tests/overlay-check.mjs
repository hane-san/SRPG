// Commands stay outside the map, with stable geometry and legible touch choices.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createGame} from '../engine.js';
import {unit} from '../data.js';
import {launch,setup} from './browser-helpers.mjs';
let browser;const results=[];
try{
 for(const [width,height]of [[390,844],[360,740],[320,568],[844,390],[1363,936]]){
  browser=await launch();const t=await setup(browser,width,height),{page}=t;
  for(const warning of [false,true]){
   const s=createGame();if(warning)s.warnings=[{kind:'cannon',turn:1,cells:[{x:5,y:18}]}];await t.reset(s);
   await page.evaluate(()=>{const v=document.querySelector('#mapViewport'),tile=document.querySelector('#battlefield').getBoundingClientRect().width/12;v.scrollTop=16*tile-v.clientHeight*.68;});
   const geometry=()=>page.evaluate(()=>{const v=document.querySelector('#mapViewport'),r=v.getBoundingClientRect(),c=document.querySelector('#battlefield').getBoundingClientRect();return [r.x,r.y,r.width,r.height,c.x,c.y,c.width,c.height,v.scrollLeft,v.scrollTop];});
   const before=await geometry();await t.slide({x:5,y:16},{x:5,y:15},{end:false});assert(!(await page.locator('#orders').isVisible()));assert(await page.locator('#commandHint').isVisible());assert.deepEqual(await geometry(),before);await t.touch('touchEnd',[]);assert(await page.locator('#orders').isVisible());assert.deepEqual(await geometry(),before);
   const dock=await page.locator('#orders').evaluate(e=>{const r=e.getBoundingClientRect(),v=document.querySelector('#mapViewport').getBoundingClientRect(),p=document.querySelector('#actionPreview'),row=e.querySelector('.command-row');return {outsideMap:r.top>=v.bottom||r.bottom<=v.top||r.left>=v.right||r.right<=v.left,font:parseFloat(getComputedStyle(p).fontSize),noHorizontalOverflow:e.scrollWidth<=e.clientWidth&&p.scrollWidth<=p.clientWidth,noVerticalOverflow:e.scrollHeight<=e.clientHeight,rowFits:row.getBoundingClientRect().bottom<=r.bottom,preview:p.textContent};});assert(dock.outsideMap&&dock.font>=14&&dock.noHorizontalOverflow&&dock.noVerticalOverflow&&dock.rowFits,JSON.stringify({width,height,warning,dock}));
   const buttons=await page.locator('#orders button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,w:r.width,h:r.height,onScreen:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth};}));assert(buttons.every(b=>b.w>=44&&b.h>=44&&b.onScreen),JSON.stringify({width,height,warning,buttons}));
   await page.getByRole('button',{name:'詳細',exact:true}).click();assert.deepEqual(await geometry(),before);await page.locator('#closeModal').click();assert.deepEqual(await geometry(),before);
   await page.screenshot({path:`test-results/quick-${width}x${height}${warning?'-warning':''}-0.5.2.png`});
   await page.getByRole('button',{name:'戻る',exact:true}).click();assert.equal((await t.state()).metrics.commands,0);assert.deepEqual(await geometry(),before);
   await t.slide({x:5,y:16},{x:5,y:15});await page.locator('#waitOrder').click();await t.settled();assert.deepEqual(await geometry(),before);
   results.push({width,height,warning,cameraStable:true,outsideMap:dock.outsideMap,legible:true,buttons,errors:t.errors});
  }
  if(width===320){
   const s=createGame();s.units=[{...unit({id:'a',name:'弓兵',type:'bow',x:5,y:16},'ally'),hp:1},unit({id:'e',name:'敵弓',type:'bow',x:5,y:14,ai:'hold'},'enemy'),unit({id:'e2',name:'別の敵',type:'bow',x:7,y:16,ai:'hold'},'enemy')];await t.reset(s);await t.select('a');
   assert.equal(await page.locator('#orders button').count(),5);const fit=await page.locator('#actionPreview').evaluate(e=>({text:e.textContent,fullTextVisible:e.scrollHeight<=e.clientHeight&&e.scrollWidth<=e.clientWidth}));assert(fit.fullTextVisible,JSON.stringify(fit));assert(fit.text.includes('離脱'));const target=(await t.draft()).target;await page.locator('#targetCycle').click();assert.notEqual((await t.draft()).target,target);
   const buttons=await page.locator('#orders button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height};}));assert(buttons.every(b=>b.w>=44&&b.h>=44));await page.screenshot({path:'test-results/multiple-targets-320-0.5.2.png'});
   await page.getByRole('button',{name:'戻る',exact:true}).click();await t.tap({x:5,y:14});await page.getByRole('button',{name:'詳細',exact:true}).click();assert((await page.locator('#modalBody').innerText()).includes('このマスを守り動かない'));await page.locator('#closeModal').click();const acted=createGame();acted.units[0].acted=true;await t.reset(acted);await t.select('a1');assert((await page.locator('#actionPreview').innerText()).includes('行動済み'));assert.equal(await page.locator('#waitOrder').count(),0);results.push({width,height,multipleTargets:true,lethalWarningVisible:true,enemyDetails:true,errors:t.errors});
  }
  assert.deepEqual(t.errors,[]);await browser.close();
 }
 writeFileSync('test-results/overlay-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({width,height,warning,cameraStable,outsideMap,legible,errors})=>({width,height,warning,cameraStable,outsideMap,legible,errors})),null,2));
}finally{if(browser?.isConnected())await browser.close();}

