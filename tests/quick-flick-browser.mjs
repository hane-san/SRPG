// Issue #24: the armed gesture is an optional fast path, not a second rules engine.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as E from '../engine.js';
import {unit} from '../data.js';
import {launch,setup} from './browser-helpers.mjs';

const browser=await launch(),cases=[];
// Units start off the castle tile: since Issue #29 a castle press always opens the sortie roster.
const fixture=()=>{
 const s=E.createGame();
 s.units=[
  unit({id:'a',name:'先鋒',type:'sword',x:4,y:16},'ally'),
  unit({id:'b',name:'予備守備',type:'shield',x:3,y:16},'ally'),
  unit({id:'e',name:'敵弓兵',type:'bow',x:5,y:13,ai:'hold'},'enemy')
 ];
 return s;
};
try{
 const t=await setup(browser),{page}=t,origin={x:4,y:16},step={x:4,y:15},firing={x:4,y:13},enemy={x:5,y:13};
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
 await t.slide({x:3,y:16},{x:3,y:15},{end:false});
 assert(await page.locator('#moveUndo').isHidden(),'Undo must be unavailable during another held gesture');
 await t.touch('touchCancel',[]);
 assert(await page.locator('#moveUndo').isVisible(),'aborting the other gesture does not consume Undo');
 await page.locator('#moveUndo').click();
 assert.deepEqual(await t.state(),original,'undo restores acted flag, position, log and metrics');
 assert(await page.locator('#moveUndo').isHidden());
 await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);
 assert.deepEqual(await t.state(),original,'undo overwrites durable save');
 cases.push('armed movement, exact state undo, selection retention, camera and reload');

 // The locked endpoint must survive intermediate empty cells on the way to a target.
 await t.reset(fixture());await t.slide(origin,step,{end:false});
 await page.waitForFunction(()=>window.srpgDebug.draft().moveArmed===true);
 const next=await t.point({x:4,y:14});await t.touch('touchMove',[next]);
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
 // New #35 input: a fluid attack must not require the 200ms movement lock.
 await t.reset(fixture());
 const preFlick=await t.state();
 await t.slide(origin,firing,{end:false});
 assert.equal((await t.draft()).moveArmed,false,'immediate drag has not passed the movement dwell');
 await t.touch('touchMove',[await t.point(enemy)]);
 assert.equal((await t.draft()).target,'e','enemy is previewed without the attack menu');
 assert.deepEqual((await t.draft()).dest,firing,'explicit endpoint must be preserved');
 assert(await page.locator('#orders').isHidden(),'command buttons stay hidden while aiming');
 assert((await page.locator('#commandHint').innerText()).includes('離して攻撃'));
 assert.deepEqual(await t.state(),preFlick,'aiming alone must not mutate the game');
 await t.touch('touchEnd',[]);await t.settled();
 assert.deepEqual(await t.state(),attackExpected,'enemy release immediately resolves the explicit attack');
 assert.equal((await t.state()).metrics.commands,1,'one pointer release means one action');
 assert(await page.locator('#moveUndo').isHidden());
 cases.push('under-200ms continuous legal destination → enemy release, no attack menu');

 // A previously previewed route can be continued by a second quick flick.
 await t.reset(fixture());await t.select('a');await t.tap(firing);
 assert.deepEqual((await t.draft()).dest,firing);
 assert.deepEqual(await t.state(),preFlick);
 await t.slide(firing,enemy);await t.settled();
 assert.deepEqual(await t.state(),attackExpected);
 cases.push('second quick flick from previewed endpoint commits without attack button');

 // Passing over an enemy does not confirm when the finger leaves elsewhere.
 await t.reset(fixture());await t.slide(origin,firing,{end:false});
 await t.touch('touchMove',[await t.point(enemy)]);
 assert.equal((await t.draft()).target,'e');
 await t.touch('touchMove',[await t.point({x:6,y:14})]);
 assert.equal((await t.draft()).target,null,'leaving an enemy clears attack intent');
 await t.touch('touchEnd',[]);
 assert.deepEqual(await t.state(),preFlick,'release outside enemy is not an attack');
 cases.push('enemy pass-through and release on another cell does not attack');

 // A direct enemy tap is still only a preview, not an implicit attack.
 await t.reset(fixture());await t.select('a');await t.tap(enemy);
 assert.deepEqual(await t.state(),preFlick);
 assert.equal((await t.draft()).target,'e');
 cases.push('enemy tap preserves the explicit fallback command');

 // P3-only units cannot acquire a P1 attack by using the fast path.
 const support=fixture();support.units[0]=unit({id:'a',name:'砲兵',type:'shooter',x:4,y:16},'ally');
 await t.reset(support);await t.slide(origin,firing,{end:false});
 await t.touch('touchMove',[await t.point(enemy)]);
 assert.equal((await t.draft()).target,null);
 await t.touch('touchEnd',[]);
 assert.deepEqual(await t.state(),support);
 cases.push('P3-only shooter never attacks by drag');
 // Explicit target selection among two enemies is the end of the pointer,
 // not the first reachable target or whichever was last previewed.
 const choices=fixture();choices.units.push(unit({id:'e2',name:'別の敵',type:'sword',x:3,y:13,ai:'hold'},'enemy'));
 await t.reset(choices);await t.slide(origin,firing,{end:false});
 await t.touch('touchMove',[await t.point(enemy)]);
 assert.equal((await t.draft()).target,'e');
 await t.touch('touchMove',[await t.point({x:3,y:13})]);
 assert.equal((await t.draft()).target,'e2');
 await t.touch('touchEnd',[]);await t.settled();
 const choicesExpected=structuredClone(choices);assert(E.act(choicesExpected,'a',firing,'attack','e2').ok);
 assert.deepEqual(await t.state(),choicesExpected);
 assert.equal((await t.state()).metrics.commands,1);
 cases.push('flick chooses the final explicit enemy among multiple targets');

 // Newly selected castle reserve should not have to visit a menu after sliding
 // from the castle through its exit and onto a legal enemy.
 const sortie=E.createGame(),gatePoint=sortie.map.camp,exit={x:gatePoint.x-1,y:gatePoint.y},sortieEnemy={x:exit.x,y:exit.y-1};
 sortie.units=[
  unit({id:'a',name:'出撃剣士',type:'sword',x:gatePoint.x,y:gatePoint.y,deployed:false},'ally'),
  unit({id:'e',name:'門前の敵',type:'shield',x:sortieEnemy.x,y:sortieEnemy.y,ai:'hold'},'enemy')
 ];
 assert(E.routeTo(sortie,E.sortieUnit(sortie,'a'),exit).length>0);
 const sortieExpected=structuredClone(sortie);
 assert(E.deployAndAct(sortieExpected,'a',exit,'attack','e').ok);
 await t.reset(sortie);await t.tap(gatePoint);
 await page.locator('#deploymentList button').first().click();
 assert.equal((await t.draft()).sortie,true);
 await t.slide(gatePoint,exit,{end:false});
 await t.touch('touchMove',[await t.point(sortieEnemy)]);
 assert.equal((await t.draft()).target,'e');
 await t.touch('touchEnd',[]);await t.settled();
 assert.deepEqual(await t.state(),sortieExpected,'castle→exit→enemy also attacks in one gesture');
 cases.push('castle sortie can move and attack on one continued finger gesture');


 // Ranged attacks cross intermediate empty cells without changing the fixed firing tile.
 // Issue #26 removed P1 attacks from shooters, so the bow (range 2) carries this case.
 const archer=fixture(),archerStep={x:4,y:14};archer.units[0]=unit({id:'a',name:'弓兵',type:'bow',x:4,y:16},'ally');
 await t.reset(archer);await t.slide(origin,archerStep,{end:false});
 await page.waitForFunction(()=>window.srpgDebug.draft().moveArmed===true);
 await t.touch('touchMove',[await t.point({x:3,y:14})]);
 assert.deepEqual((await t.draft()).dest,archerStep,'passing another empty cell preserves the firing position');
 await t.touch('touchMove',[await t.point(enemy)]);
 assert.deepEqual((await t.draft()).dest,archerStep);
 assert.equal((await t.draft()).target,'e');
 await t.touch('touchEnd',[]);await t.settled();
 const archerExpected=structuredClone(archer);assert(E.act(archerExpected,'a',archerStep,'attack','e').ok);
 assert.deepEqual(await t.state(),archerExpected);
 cases.push('bow crosses intervening empty tiles while keeping exact ranged attack origin');

 // Bow minimum range may not silently select another approach or cause a strike.
 const bow=fixture();bow.units[0]=unit({id:'a',name:'弓兵',type:'bow',x:4,y:16},'ally');
 await t.reset(bow);await t.slide(origin,firing,{end:false});
 await page.waitForFunction(()=>window.srpgDebug.draft().moveArmed===true);
 await t.touch('touchMove',[await t.point(enemy)]);
 assert.equal((await t.draft()).target,null);
 assert((await page.locator('#commandHint').innerText()).includes('近すぎます'));
 await t.touch('touchEnd',[]);
 assert.deepEqual(await t.state(),bow,'illegal bow target never spends an action');
 assert(await page.locator('#attackOrder').isDisabled());
 cases.push('illegal adjacent bow contact remains a preview, never auto-attacks');

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

 // A deployed unit standing on the castle stays selectable; a second tap opens the sortie roster.
 const gate=fixture();gate.units[0]=unit({id:'a',name:'先鋒',type:'sword',x:5,y:16},'ally');
 await t.reset(gate);await t.tap({x:5,y:16});await page.waitForTimeout(250);
 assert.equal((await t.draft()).selected,'a','tapping a unit on the castle selects it');
 assert.equal(await page.locator('#modal').evaluate(m=>m.open),false);
 await t.tap({x:5,y:16});await page.waitForFunction(()=>document.getElementById('modal').open);
 assert(await page.locator('#deploymentList').count());
 await page.locator('#closeModal').click();
 cases.push('castle occupant can be selected, then the castle opens the sortie roster');

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
