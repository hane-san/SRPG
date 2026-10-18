// Check the mobile sound room, including previews while ordinary BGM is OFF.
import assert from 'node:assert/strict';
import {launch,setup} from './browser-helpers.mjs';
const browser=await launch();
try{
 const {page,errors}=await setup(browser,390,844);
 await page.locator('#soundRoomDetails summary').click();
 assert.equal(await page.locator('#soundRoomList button').count(),26);
 assert.equal(await page.locator('.sound-room-section').count(),2);
 assert.equal(await page.locator('.sound-room-mood').count(),7);
 const initial=await page.evaluate(()=>srpgDebug.music());
 assert.equal(initial.enabled,false);
 await page.locator('#soundRoomList button').nth(0).click();
 await page.waitForFunction(()=>srpgDebug.music().scene==='0:ally'&&srpgDebug.music().state==='running');
 assert.equal((await page.evaluate(()=>srpgDebug.music())).preview,'0:ally');
 assert.equal((await page.evaluate(()=>srpgDebug.music())).enabled,false);
 assert.equal(await page.locator('#soundRoomList button[aria-pressed="true"]').count(),1);
 await page.locator('#soundRoomList button').nth(25).click();
 await page.waitForFunction(()=>srpgDebug.music().scene==='12:hostile');
 assert.equal((await page.evaluate(()=>srpgDebug.music())).preview,'12:hostile');
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
 const waveChecks=await page.evaluate(async()=>{
  const {buildTrack,scheduleNote,MUSIC_LIBRARY}=await import('./music.js?v=0.7.0-library26');
  const rows=[];
  for(let map=6;map<MUSIC_LIBRARY.length;map++)for(const phase of [1,2]){
   const track=buildTrack(map,phase),rate=12000;
   const context=new OfflineAudioContext(1,Math.ceil((track.seconds+.4)*rate),rate);
   const master=context.createGain();master.gain.value=.34;master.connect(context.destination);
   for(const event of track.events)scheduleNote(context,master,event,.02+event.beat*60/track.bpm,60/track.bpm);
   const buffer=await context.startRendering(),samples=buffer.getChannelData(0);
   let peak=0,square=0,signature=2166136261;
   for(let i=0;i<samples.length;i++){
    const x=samples[i];if(!Number.isFinite(x))throw Error('Nonfinite sample: '+track.title);
    peak=Math.max(peak,Math.abs(x));square+=x*x;
    if(i%79===0)signature=Math.imul(signature^(Math.round(x*32767)&65535),16777619)>>>0;
   }
   rows.push({title:track.title,peak,rms:Math.sqrt(square/samples.length),signature});
  }
  return rows;
 });
 assert.equal(waveChecks.length,14);
 assert.equal(new Set(waveChecks.map(x=>x.signature)).size,14);
 assert(waveChecks.every(x=>x.peak>.005&&x.peak<.8&&x.rms>.001),JSON.stringify(waveChecks));
 assert.deepEqual(errors,[]);
 console.log('Sound room: 26 tracks, independent OFF audition, switching, stop, restore, Escape cleanup OK');
}finally{await browser.close();}
