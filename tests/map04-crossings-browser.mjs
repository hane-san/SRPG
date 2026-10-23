import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {launch,setup} from './browser-helpers.mjs';
let browser;const results=[];
try{
 for(const [width,height]of [[320,568],[360,740],[390,844],[844,390]]){
  browser=await launch();const t=await setup(browser,width,height),{page}=t;
  const s=E.createGame(3),from={x:5,y:27},to={x:5,y:24};s.turn=2;
  Object.assign(s.units.find(u=>u.id==='a2'),{deployed:true,...from});
  const route=E.routeTo(s,s.units.find(u=>u.id==='a2'),to);
  assert.deepEqual(route.map(p=>[p.x,p.y]),[[5,27],[5,26],[5,25],[5,24]]);
  await t.reset(s);assert.ok((await t.state()).map.briefing.includes('中央は3マス幅'));
  await t.select('a2');
  await page.locator('#mapViewport').evaluate(e=>{const tile=document.querySelector('#battlefield').getBoundingClientRect().width/12;e.scrollTop=26*tile-e.clientHeight/2;});
  const before=await t.camera();
  await t.slide(from,to);
  await page.locator('#orders button').filter({hasText:/待機/}).click();
  await page.waitForFunction(()=>!window.srpgDebug.busy()&&window.srpgDebug.snapshot().metrics.commands===1);
  const crossed=await t.state(),u=crossed.units.find(u=>u.id==='a2');
  assert.deepEqual([u.x,u.y],[to.x,to.y]);assert.equal(u.hp,6);
  assert.deepEqual((await t.camera()).slice(2),before.slice(2),'battlefield dimensions remain stable');
  assert.equal(await page.locator('#commandDock').evaluate(e=>{const r=e.getBoundingClientRect();return innerHeight<=500&&innerWidth>=600?r.width:r.height;}),height<500?300:144);
  await page.screenshot({path:`test-results/map04-crossing-${width}.png`});
  await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);
  assert.deepEqual(await t.state(),crossed,'committed crossing survives reload');assert.deepEqual(t.errors,[]);
  results.push({width,height,crossing:'new central-bank lane',reload:true});
  await browser.close();browser=null;
 }
 console.log(JSON.stringify(results));
}finally{if(browser?.isConnected())await browser.close();}
