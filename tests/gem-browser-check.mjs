import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {unit} from '../data.js';
import {launch,setup} from './browser-helpers.mjs';
const browser=await launch(),results=[];
try{
 const t=await setup(browser),{page}=t;
 await t.reset(E.createGame());
 await page.locator('#menuBtn').click();
 await page.getByRole('button',{name:/宝石の破砕音を試す/}).click();
 assert(await page.locator('#gemDemoBoard').isVisible());
 for(const [label,hp] of [['1ダメージ',5],['2ダメージ',4],['3ダメージ',3],['4ダメージ・強打',2],['5ダメージ・強打',1],['重装：攻撃3→被害2',4],['敵を撃破（HP2）',0],['味方が戦死（HP2）',0],['2ジュエル回復',4]]){
  await page.getByRole('button',{name:label,exact:true}).click();
  await page.waitForFunction(h=>document.querySelector('#gemDemoBoard')?.dataset.hp===String(h)&&Array.from(document.querySelectorAll('#gemDemoControls button')).every(b=>!b.disabled),hp);
  assert.equal(await page.locator('.gem-demo-jewel.intact').count(),hp,label);
  assert.equal(await page.locator('.gem-demo-jewel.gone').count(),6-hp,label);
  results.push({demo:label,hp});
 }
 await page.locator('#closeModal').click();
 // A heavy, armoured, overkill encounter proves that HP jewels follow actual,
 // mitigated HP lost, not attack rating or proposed damage. Last gem kills.
 const scenario=E.createGame();scenario.units=[
  unit({id:'a',name:'攻撃側',type:'sword',x:5,y:16},'ally'),
  unit({id:'e',name:'重装敵',type:'shield',x:5,y:15,ai:'hold'},'enemy')
 ];
 scenario.units[0].atk=5;scenario.units[1].hp=2;
 const expected=structuredClone(scenario);assert(E.act(expected,'a',scenario.units[0],'attack','e').ok);
 assert.equal(expected.units[1].hp,0);
 await t.reset(scenario);
 await page.evaluate(()=>{
  window.gemTrail=[];window.gemCapture=true;const previous=new Set();
  function poll(){if(!window.gemCapture)return;const j=window.srpgDebug?.draft()?.jewel;
   if(j&&j.index>=0){const token=j.id+':'+j.hp;if(!previous.has(token)){previous.add(token);window.gemTrail.push({hp:j.hp,index:j.index,heavy:j.heavy,armoured:j.armoured});}}
   requestAnimationFrame(poll);
  }requestAnimationFrame(poll);
 });
 await t.select('a');
 await page.locator('#attackOrder').click();await t.settled();
 const trail=await page.evaluate(()=>{window.gemCapture=false;return window.gemTrail;});
 assert.deepEqual(await t.state(),expected,'rule engine and saved game must remain unchanged');
 assert.deepEqual(trail.map(z=>z.hp),[1,0],JSON.stringify(trail));
 assert(trail.every(z=>z.heavy&&z.armoured));
 assert((await page.locator('#orders').innerText()).includes('撃破'));
 await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);
 assert.deepEqual(await t.state(),expected,'a reload restores the already resolved attack');
 results.push({combat:'heavy overkill against armour',trail,finalHP:0});
 assert.deepEqual(t.errors,[],'no browser uncaught errors');
 console.log(JSON.stringify({results,errors:t.errors},null,2));
}finally{await browser.close();}
