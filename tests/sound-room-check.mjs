// Check the mobile sound room, including previews while ordinary BGM is OFF.
import assert from 'node:assert/strict';
import {launch,setup} from './browser-helpers.mjs';
const browser=await launch();
try{
 const {page,errors}=await setup(browser,390,844);
 await page.locator('#soundRoomDetails summary').click();
 assert.equal(await page.locator('#soundRoomList button').count(),12);
 const initial=await page.evaluate(()=>srpgDebug.music());
 assert.equal(initial.enabled,false);
 await page.locator('#soundRoomList button').nth(0).click();
 await page.waitForFunction(()=>srpgDebug.music().scene==='0:ally'&&srpgDebug.music().state==='running');
 assert.equal((await page.evaluate(()=>srpgDebug.music())).preview,'0:ally');
 assert.equal((await page.evaluate(()=>srpgDebug.music())).enabled,false);
 assert.equal(await page.locator('#soundRoomList button[aria-pressed="true"]').count(),1);
 await page.locator('#soundRoomList button').nth(3).click();
 await page.waitForFunction(()=>srpgDebug.music().scene==='1:hostile');
 assert.equal((await page.evaluate(()=>srpgDebug.music())).preview,'1:hostile');
 await page.locator('#soundRoomStop').click();
 assert.equal((await page.evaluate(()=>srpgDebug.music())).scene,null);
 assert.equal((await page.evaluate(()=>srpgDebug.music())).preview,null);
 await page.locator('#audioDetails summary').click();
 await page.locator('#musicToggle').click();
 assert.equal((await page.evaluate(()=>srpgDebug.music())).scene,'0:ally');
 await page.locator('#soundRoomList button').nth(11).click();
 assert.equal((await page.evaluate(()=>srpgDebug.music())).scene,'5:hostile');
 await page.locator('#closeModal').click();
 assert.equal((await page.evaluate(()=>srpgDebug.music())).preview,null);
 assert.equal((await page.evaluate(()=>srpgDebug.music())).scene,'0:ally');
 await page.locator('#menuBtn').click();
 await page.locator('#soundRoomDetails summary').click();
 await page.locator('#soundRoomList button').nth(0).click();
 assert.equal((await page.evaluate(()=>srpgDebug.music())).preview,'0:ally');
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.querySelector('#modal').open);
 assert.equal((await page.evaluate(()=>srpgDebug.music())).preview,null);
 assert.deepEqual(errors,[]);
 console.log('Sound room: 12 tracks, independent OFF audition, switching, stop, restore, Escape cleanup OK');
}finally{await browser.close();}
