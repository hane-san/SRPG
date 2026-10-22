import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {unit} from '../data.js';
import {launch,setup} from './browser-helpers.mjs';

const browser=await launch();
try{
 const t=await setup(browser),{page}=t,observations=[];
 const fixture=()=>{const s=E.createGame();s.units=[
  unit({id:'a',name:'操作剣士',type:'sword',x:4,y:16},'ally'),
  unit({id:'e',name:'防衛兵',type:'shield',x:6,y:14,ai:'hold'},'enemy')
 ];return s;};
 const original=fixture();
 for(const [width,height] of [[320,568],[360,740],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await t.reset(original);
  const initialCamera=await t.camera();
  const metrics=await page.evaluate(()=>{
   const head=document.getElementById('battleHeader').getBoundingClientRect(),dock=document.getElementById('commandDock').getBoundingClientRect(),map=document.getElementById('mapViewport').getBoundingClientRect(),rail=document.getElementById('phaseRail'),items=[...rail.children];
   const buttons=[...document.querySelectorAll('#battleHeader button,footer button')];
   return {header:head.height,dock:dock.height,mapBottom:map.bottom,dockTop:dock.top,rail:items.map(x=>({phase:x.dataset.step,current:x.getAttribute('aria-current'),width:x.getBoundingClientRect().width})),overflow:document.documentElement.scrollWidth>innerWidth,buttons:buttons.map(b=>({w:b.getBoundingClientRect().width,onScreen:b.getBoundingClientRect().left>=0&&b.getBoundingClientRect().right<=innerWidth}))};
  });
  assert.equal(metrics.header,height<=500?48:52,'existing 48px landscape header must remain unchanged');assert.equal(metrics.dock,144);
  assert(Math.abs(metrics.mapBottom-metrics.dockTop)<=2,'dock must not cover battlefield');
  assert.deepEqual(metrics.rail.map(x=>x.phase),['1','2','3','4']);
  assert.deepEqual(metrics.rail.map(x=>x.current),['step','false','false','false']);
  assert(metrics.rail.every(x=>x.width>15));
  assert(!metrics.overflow,JSON.stringify(metrics));
  assert(metrics.buttons.every(b=>b.w>=44&&b.onScreen),JSON.stringify(metrics));
  assert.deepEqual(await t.camera(),initialCamera);
  observations.push({width,height,metrics});
 }
 await page.setViewportSize({width:390,height:844});
 for(const [kind,level] of [['cannon','cannon'],['spawn','reinforcement']]){
  const s=fixture();s.warnings=[{kind,turn:s.turn,cells:[{x:0,y:14}]}];
  await t.reset(s);
  assert.equal(await page.locator('#forecast').getAttribute('data-level'),level);
  assert(await page.locator('#forecast').isVisible());
  assert((await page.locator('#forecast').innerText()).length>5);
  const color=await page.locator('#forecast').evaluate(el=>getComputedStyle(el).borderLeftColor);
  observations.push({alert:kind,level,color});
 }
 const rainy=E.createGame(4);rainy.turn=4;
 await t.reset(rainy);
 assert.equal(await page.locator('#forecast').getAttribute('data-level'),'weather');
 await t.reset(fixture());
 await t.select('a');await t.slide({x:4,y:16},{x:5,y:14},{end:false});
 assert.equal(await page.locator('#commandHint').getAttribute('data-intent'),'route');
 await t.touch('touchMove',[await t.point({x:6,y:14})]);
 assert.equal(await page.locator('#commandHint').getAttribute('data-intent'),'attack');
 await t.touch('touchCancel',[]);
 assert.deepEqual(await t.state(),original);
 await t.slide({x:4,y:16},{x:5,y:14});
 await t.slide({x:5,y:14},{x:6,y:14});
 assert(await page.locator('#orders .hp-track').count()>=2,'forecast still has both HP bar DOM nodes');
 const gem=await page.locator('#orders .hp-track').first().evaluate(el=>({track:getComputedStyle(el).height,cut:getComputedStyle(el,'::after').backgroundImage,fill:el.querySelector('i').getBoundingClientRect().width,bar:el.getBoundingClientRect().width}));
 assert(gem.cut.includes('repeating-linear-gradient'),JSON.stringify(gem));
 assert(gem.fill>0&&gem.fill<=gem.bar,'gem fill must remain exactly bounded by the engine forecast');
 const cam=await t.camera();assert.deepEqual(await t.state(),original,'HUD changes never perform a command');assert.deepEqual(await t.camera(),cam);
 await page.screenshot({path:'test-results/hud50-forecast-390.png'});
 assert.deepEqual(t.errors,[],'no browser page errors');
 console.log(JSON.stringify({observations,gem,errors:t.errors},null,2));
}finally{await browser.close();}
