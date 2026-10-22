import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {play} from './simulate.mjs';
import {launch,setup} from './browser-helpers.mjs';
let browser;const results=[];
try{
 for(const [width,height]of [[320,568],[360,740],[390,844],[844,390]]){
  console.log(JSON.stringify({checkingViewport:[width,height]}));
  browser=await launch();
  const t=await setup(browser,width,height),{page}=t;
  // The existing 144px landscape dock leaves only about two visible rows.
  // Scroll explicitly and check one bridge step there; portrait crosses both banks.
  const from={x:3,y:height<500?11:12},to={x:3,y:height<500?10:8};
  const s=E.createGame(),u=s.units.find(u=>u.id==='a1');Object.assign(u,{deployed:true,...from});s.turn=2;
  await t.reset(s);assert((await t.state()).map.briefing.includes('西の広い渡し'));
  await t.select('a1');
  // Explicitly scroll to keep the whole gesture away from both auto-scroll edges.
  await page.locator('#mapViewport').evaluate((e,center)=>{const tile=document.querySelector('#battlefield').getBoundingClientRect().width/12;e.scrollTop=center*tile-e.clientHeight/2;},(from.y+to.y+1)/2);
  const before=await t.camera();
  await t.slide(from,to,{end:false});
  await page.waitForFunction(()=>window.srpgDebug.draft().moveArmed,null,{timeout:3000});
  await t.touch('touchEnd',[]);
  await page.waitForFunction(y=>!window.srpgDebug.busy()&&window.srpgDebug.snapshot().units.find(u=>u.id==='a1').y===y,to.y,{timeout:5000});
  const crossed=await t.state();assert.equal(crossed.units.find(u=>u.id==='a1').y,to.y,'western bridge route commits');
  assert.equal(await page.locator('#commandDock').evaluate(e=>{const r=e.getBoundingClientRect();return innerHeight<=500&&innerWidth>=600?r.width:r.height;}),height<500?300:144);
  assert.deepEqual((await t.camera()).slice(2),before.slice(2));
  await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);assert.deepEqual(await t.state(),crossed);
  await t.reset(play(0,'basic').s,'0.8.0',true);
  assert((await page.locator('#orders').innerText()).includes('北城制圧'));
  await page.locator('#orders button').filter({hasText:/次章|次の戦場/}).click();
  assert.equal((await t.state()).map.id,1,'original three-chapter campaign continues');
  assert.deepEqual(t.errors,[]);results.push({width,height,westernCrossing:height<500?'bridge-step':'bank-to-bank',reload:true,campaign:true});await browser.close();browser=null;
 }
 console.log(JSON.stringify(results));
}finally{if(browser?.isConnected())await browser.close();}
