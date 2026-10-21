// Issue #24: the armed gesture is an optional fast path, not a second rules engine.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as E from '../engine.js';
import {unit} from '../data.js';
import {launch,setup} from './browser-helpers.mjs';

const browser=await launch(),cases=[];
const fixture=()=>{
 const s=E.createGame();
 s.units=[
  unit({id:'a',name:'先鋒',type:'sword',x:5,y:16},'ally'),
  unit({id:'b',name:'予備守備',type:'shield',x:3,y:16},'ally'),
  unit({id:'e',name:'敵弓兵',type:'bow',x:6,y:13,ai:'hold'},'enemy')
 ];
 return s;
};
try{
 const t=await setup(browser),{page}=t,origin={x:5,y:16},step={x:5,y:15},firing={x:5,y:13},enemy={x:6,y:13};
 await t.reset(fixture());
 const original=await t.state(),camera=await t.camera();
 await t.slide(origin,step,{end:false});
 await page.waitForFunction(()=>window.srpgDebug.draft().moveArmed===true);
 assert((await page.locator('#commandHint').innerText()).includes('カチャッ'));
 assert.deepEqual(await t.state(),original,'arming is feedback, never a command');
 await t.touch('touchEnd',[]);await t.settled();
 const expected=structuredClone(original);assert(E.act(expected,'a',step,'wait').ok);
 assert.deepEqual(await t.state(),expected,'armed release commits exactly one move + ordinary wait');
 assert.deepEqual(await t.camera(),camera,'dock and camera remain stable');
 assert(await page.locator('#moveUndo').isVisible());
 await t.select('b');assert(await page.locator('#moveUndo').isVisible(),'selection alone preserves undo');
 await page.locator('#moveUndo').click();
 assert.deepEqual(await t.state(),original,'undo restores acted flag, position, log and metrics');
 assert(await page.locator('#moveUndo').isHidden());
 await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);
 assert.deepEqual(await t.state(),original,'undo overwrites durable save');
 cases.push('armed movement, exact state undo, selection retention, camera and reload');

 // The locked endpoint must survive intermediate empty cells on the way to a target.
 await t.reset(fixture());await t.slide(origin,step,{end:false});
 await page.waitForFunction(()=>window.srpgDebug.draft().moveArmed===true);
 const next=await t.point({x:5,y:14});await t.touch('touchMove',[next]);
 assert.equal((await t.draft()).moveArmed,true,'an armed route stays fixed');
 assert.deepEqual((await t.draft()).dest,step);
 await t.touch('touchEnd',[]);
 assert.deepEqual(await t.state(),original,'releasing at a different empty cell cancels');
 assert(await page.locator('#moveUndo').isHidden());
 cases.push('locked destination remains fixed, off-endpoint release cancels');

 // A legal endpoint is fixed; the enemy release commits an attack immediately.
 await t.reset(fixture());await t.slide(origin,firing,{end:false});
 await page.waitForFunction(()=>window.srpgDebug.draft().moveArmed===true);
 await t.touch('touchMove',[await t.point(enemy)]);
 assert.equal((await t.draft()).target,'e');
 assert.deepEqual((await t.draft()).dest,firing,'enemy targeting never silently repositions');
 const hint=await page.locator('#commandHint').innerText();
 assert(hint.includes('自HP')&&hint.includes('敵HP')&&hint.includes('反撃'),hint);
 assert(await page.locator('#orders').isHidden(),'held-finger command buttons are hidden');
 await t.touch('touchEnd',[]);await t.settled();
 const attackExpected=fixture();assert(E.act(attackExpected,'a',firing,'attack','e').ok);
 assert.deepEqual(await t.state(),attackExpected);
 assert.equal((await t.state()).metrics.commands,1);
 assert(await page.locator('#moveUndo').isHidden(),'an attack must not be undoable');
 cases.push('endpoint lock + continued enemy flick = immediate single attack with pre-release HP');

 // An armed route interrupted by a second finger must restore the draft.
 await t.reset(fixture());await t.slide(origin,step,{end:false});
 await page.waitForFunction(()=>window.srpgDebug.draft().moveArmed===true);
 const a=await t.point(step),b=await t.point({x:7,y:16});
 await t.touch('touchStart',[a,b]);await t.touch('touchEnd',[]);
 assert.deepEqual(await t.state(),original);assert(await page.locator('#moveUndo').isHidden());
 cases.push('multitouch cancellation after arm');

 // Undo expires on the next actual command, not on inspection.
 await t.reset(fixture());await t.slide(origin,step,{end:false});
 await page.waitForFunction(()=>window.srpgDebug.draft().moveArmed===true);
 await t.touch('touchEnd',[]);await t.settled();
 await t.select('b');assert(await page.locator('#moveUndo').isVisible());
 await page.locator('#waitOrder').click();await t.settled();
 assert(await page.locator('#moveUndo').isHidden());
 cases.push('undo expires after another committed command');

 // Both columns have identical row geometry even on narrow phones.
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844});await t.reset(fixture());await t.select('a');
  await t.tap(enemy);
  assert(await page.locator('.forecast-side').count()===2);
  const metrics=await page.locator('.forecast-side').evaluateAll(nodes=>nodes.map(n=>{
   const a=[n.querySelector('span'),n.querySelector('.hp-track'),n.querySelector('small')];
   return a.map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.y),Math.round(r.height)];});
  }));
  assert.deepEqual(metrics[0],metrics[1],`HP row geometry at ${width}px must match`);
 }
 cases.push('battle HP columns aligned at 320 and 390 pixels');
 assert.deepEqual(t.errors,[],'no browser exceptions');
 writeFileSync('test-results/quick-flick-browser-results.json',JSON.stringify({cases,errors:t.errors},null,2));
 console.log(JSON.stringify({cases,errors:t.errors},null,2));
}finally{await browser.close();}
