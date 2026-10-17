// Optional dependencies for this test only: playwright + Chromium.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const launch=()=>chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu']}:{} )});
let browser;
const base=process.env.TEST_URL||'http://localhost:4173';
mkdirSync('test-results',{recursive:true});const results=[];
try{
 for(const [label,width,height]of [['iphone',390,844],['android',360,740],['small',320,568],['landscape',844,390]]){
  browser=await launch();
  const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1});const page=await ctx.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?debug=1');await page.waitForSelector('#maps');
  for(const map of [0,1,2]){
   if(map)await page.locator('#menuBtn').click();
   await page.locator('#maps .map-card').nth(map).getByRole('button').click();
   if(await page.locator('#newBattleConfirm').count())await page.locator('#newBattleConfirm button').click();
   await page.getByRole('button',{name:'部隊表',exact:true}).click();await page.locator('#rosterList button').first().click();
   assert(await page.locator('#battleHeader').evaluate(e=>e.getBoundingClientRect().height<=64));
   assert.equal(await page.locator('#forecast').isVisible(),false);
   assert.equal(await page.locator('#battleHeader').innerText().then(t=>t.includes('戦線指揮')||t.includes('FIELD COMMAND')||/\d+\.\d+\.\d+/.test(t)),false);
   const geometry=()=>page.evaluate(()=>{const v=document.querySelector('#mapViewport'),c=document.querySelector('#battlefield'),r=v.getBoundingClientRect(),b=c.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,cx:b.x,cy:b.y,cw:b.width,ch:b.height,left:v.scrollLeft,top:v.scrollTop};});
   const unchanged=async(g,step)=>assert.deepEqual(await geometry(),g,`${label}/map${map+1}: ${step} must not shift the map`);
   await page.getByRole('button',{name:'解除',exact:true}).click();const selectionCamera=await geometry();
   await page.evaluate(()=>window.srpgDebug.select('a1'));await unchanged(selectionCamera,'selection');
   const before=await page.evaluate(()=>window.srpgDebug.snapshot());const a=before.units.find(u=>u.id==='a1');const dest=map===1?before.map.base:{x:a.x,y:a.y-2};
   const coords=await page.evaluate(p=>{const c=document.querySelector('#battlefield'),v=document.querySelector('#mapViewport'),t=c.getBoundingClientRect().width/window.srpgDebug.snapshot().map.w;v.scrollTop=Math.max(0,p.y*t-v.clientHeight/2);const r=c.getBoundingClientRect();return {x:r.left+(p.x+.5)*t,y:r.top+(p.y+.5)*t};},dest);
   const draftCamera=await geometry();await page.touchscreen.tap(coords.x,coords.y);await unchanged(draftCamera,'movement menu');await page.getByRole('button',{name:'待機',exact:true}).click();await unchanged(draftCamera,'command preview');
   await page.getByRole('button',{name:'詳細',exact:true}).click();await unchanged(draftCamera,'details open');await page.getByRole('button',{name:'戦場へ戻る',exact:true}).click();await unchanged(draftCamera,'details close');
   await page.locator('#menuBtn').click();await unchanged(draftCamera,'main menu');await page.getByRole('button',{name:'戦場へ戻る',exact:true}).click();await unchanged(draftCamera,'main menu close');
   assert.equal((await page.evaluate(()=>window.srpgDebug.snapshot())).units.find(u=>u.id==='a1').y,a.y,'preview must not move');
   assert(await page.locator('#confirmOrder').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));
   await page.getByRole('button',{name:'この命令を確定',exact:true}).click();await unchanged(draftCamera,'commit and deselect');
   assert.equal((await page.evaluate(()=>window.srpgDebug.snapshot())).units.find(u=>u.id==='a1').y,dest.y);
   await page.getByRole('button',{name:'拡大',exact:true}).click();await page.getByRole('button',{name:'縮小',exact:true}).click();
   await page.getByRole('button',{name:'危険域',exact:true}).click();await page.getByRole('button',{name:'危険域',exact:true}).click();
   for(let turn=0;turn<4;turn++){
    const turnCamera=await geometry();const ss=await page.evaluate(()=>window.srpgDebug.snapshot());if(ss.status!=='playing')break;
    await page.locator('#endTurn').click();await page.getByRole('button',{name:'敵フェーズへ進む',exact:true}).click();
    await page.waitForFunction(()=>window.srpgDebug.snapshot().phase===1||window.srpgDebug.snapshot().status!=='playing');await page.waitForTimeout(160);await unchanged(turnCamera,'phases and warning appearance');
   }
   const snap=await page.evaluate(()=>window.srpgDebug.snapshot());assert.equal(snap.turn,5,'all four full turns must finish');assert.equal(snap.map.id,map);
   const overflow=await page.evaluate(()=>({doc:document.documentElement.scrollWidth>innerWidth,height:document.querySelector('#app').getBoundingClientRect().height>innerHeight+1,map:document.querySelector('#mapViewport').clientHeight,end:document.querySelector('#endTurn').getBoundingClientRect().bottom>innerHeight+1}));
   assert(!overflow.doc&&!overflow.height&&!overflow.end,JSON.stringify({label,map,overflow}));
   await page.screenshot({path:`test-results/${label}-map${map+1}.png`});
   await page.locator('#logBtn').click();assert(await page.locator('#logs').textContent());await page.getByRole('button',{name:'戦場へ戻る',exact:true}).click();
   const prior=await page.evaluate(()=>window.srpgDebug.snapshot());await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);const resumed=await page.evaluate(()=>window.srpgDebug.snapshot());assert.equal(resumed.turn,prior.turn);assert.equal(resumed.map.id,prior.map.id);
   results.push({label,map:map+1,turn:snap.turn,mapHeight:overflow.map,headerHeight:await page.locator('#battleHeader').evaluate(e=>e.clientHeight),errors:errors.length});
  }
  assert.deepEqual(errors,[]);await browser.close();
 }
 writeFileSync('test-results/browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
