import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {unit} from '../data.js';
import {launch,setup} from './browser-helpers.mjs';

const browser=await launch();
try{
 const t=await setup(browser),{page}=t;
 const fixture=()=>{
  const s=E.createGame();s.units=[
   unit({id:'a',name:'先鋒',type:'sword',x:4,y:16},'ally'),
   unit({id:'e',name:'重装敵',type:'shield',x:6,y:14,ai:'hold'},'enemy')
  ];return s;
 };
 const initial=fixture();
 for(const [width,height] of [[320,568],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await t.reset(initial);await t.select('a');
  const previous=await t.camera();
  await t.slide({x:4,y:16},{x:5,y:14},{end:false});
  const warning=page.locator('#commandHint .route-risk');
  assert(await warning.isVisible(),'the P2 caution belongs inside the existing dock');
  assert((await warning.innerText()).includes('P2射程概算'));
  assert((await warning.innerText()).includes('確定被害ではありません'));
  const box=await warning.boundingBox(),dock=await page.locator('#commandDock').boundingBox();
  assert(box.y>=dock.y&&box.y+box.height<=dock.y+dock.height+1,'risk never leaves the dock at '+width);
  const level=await warning.getAttribute('data-level');
  assert(['safe','caution','high','critical'].includes(level));
  assert.deepEqual(await t.state(),initial);
  await t.touch('touchCancel',[]);
  assert.deepEqual(await t.camera(),previous,'reading P2 risk never pans the map');
 }
 await page.setViewportSize({width:390,height:844});
 const cannon=fixture();cannon.warnings=[{kind:'cannon',turn:1,cells:[{x:5,y:14}]}];
 await t.reset(cannon);await t.select('a');
 await t.slide({x:4,y:16},{x:5,y:14},{end:false});
 assert.equal(await page.locator('.route-risk').getAttribute('data-level'),'cannon');
 assert((await page.locator('.route-risk').innerText()).includes('P4砲撃'));
 await t.touch('touchCancel',[]);

 // Thumb choice persists separately from the actual saved battle. Under both
 // configurations neither side may move the underlying battlefield camera.
 await t.reset(initial);const camera=await t.camera();
 await page.locator('#menuBtn').click();
 await page.locator('summary').filter({hasText:'操作と表示速度'}).click();
 const toggle=page.locator('#thumbSideToggle');
 assert(await toggle.isVisible());
 assert((await toggle.innerText()).includes('右'));
 await toggle.click();
 assert.equal(await toggle.getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#app').getAttribute('data-thumb'),'left');
 assert((await page.locator('#mapViewport').getAttribute('aria-label')).includes('左下'));
 await page.locator('#closeModal').click();
 const leftLayout=await page.evaluate(()=>({
  undo:getComputedStyle(document.getElementById('moveUndo')).left,
  tool:getComputedStyle(document.querySelector('.map-tools')).right
 }));
 assert.notEqual(leftLayout.undo,'auto');assert.notEqual(leftLayout.tool,'auto');
 assert.deepEqual(await t.camera(),camera);
 await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);
 assert.equal(await page.locator('#app').getAttribute('data-thumb'),'left','thumb choice survives reload');
 assert.deepEqual(await t.state(),initial,'thumb preference does not alter saved game');
 await page.locator('#menuBtn').click();await page.locator('summary').filter({hasText:'操作と表示速度'}).click();
 await page.locator('#thumbSideToggle').click();
 assert.equal(await page.locator('#app').getAttribute('data-thumb'),'right','original control layout is reversible');
 await page.locator('#closeModal').click();

 // Read the exact (post-mitigation) HP change on a real overkill. Pips are
 // determined by HP2 → 0, even when the hit amount exceeds remaining HP.
 const duel=E.createGame();duel.units=[
  unit({id:'a',name:'剣士',type:'sword',x:4,y:16},'ally'),
  unit({id:'e',name:'鉄衛',type:'shield',x:4,y:15,ai:'hold'},'enemy')
 ];
 duel.units[0].atk=5;duel.units[1].hp=2;
 const expected=structuredClone(duel);assert(E.act(expected,'a',duel.units[0],'attack','e').ok);
 await t.reset(duel);await t.select('a');await t.tap({x:4,y:15});
 await page.locator('#attackOrder').click();await t.settled();
 const report=await page.locator('#orders').innerText();
 assert(report.includes('結晶破砕 2個'),report);
 assert(report.includes('防御適用後'),report);
 assert(report.includes('残HP分のみ'),report);
 assert.deepEqual(await t.state(),expected,'battle UI does not change the engine result');
 await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);
 assert.deepEqual(await t.state(),expected,'reload does not persist presentation transient');
 assert.deepEqual(t.errors,[],'no browser exceptions');
 console.log(JSON.stringify({sizes:[320,390,844],leftLayout,report,errors:t.errors},null,2));
}finally{await browser.close();}
