// Issue #43: the campaign result shows a war record and carries it to the next chapter.
import assert from 'node:assert/strict';
import {play} from './simulate.mjs';
import {launch,setup} from './browser-helpers.mjs';

const browser=await launch();
try{
 const t=await setup(browser),{page}=t;
 const won=play(0,'advance').s;assert.equal(won.status,'victory','map 01 baseline victory for the fixture');
 await t.reset(won,'0.8.0',true);
 await page.locator('#orders button').filter({hasText:'戦果記録'}).click();
 const text=await page.locator('#modalBody').innerText();
 assert.match(text,/戦果記録/);assert.match(text,new RegExp(`T${won.turn}で制圧`));assert.match(text,/結末や難易度は変わりません/);
 await page.locator('#closeModal').click();
 await page.locator('#orders button').filter({hasText:/次章/}).click();
 const next=await t.state();
 assert.equal(next.map.id,1);assert.equal(next.chronicle.length,1);assert.equal(next.chronicle[0].turn,won.turn);
 await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);
 assert.equal((await t.state()).chronicle[0].turn,won.turn,'the record survives a reload');
 assert.deepEqual(t.errors,[]);
 console.log(JSON.stringify({warRecord:'ok',turn:won.turn}));
}finally{await browser.close();}
