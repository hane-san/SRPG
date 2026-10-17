// Keyboard-only commands, forecast outcomes, migration and destructive navigation.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createGame} from '../engine.js';
import {RELEASE} from '../config.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu']}: {})});
const results=[],errors=[];mkdirSync('test-results',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.TEST_URL||'http://localhost:4173')+'/?debug=1');
 async function reset(state=createGame(),release=RELEASE){await page.evaluate(data=>localStorage.setItem('field-command-save-v1',JSON.stringify(data)),{release,state,campaign:true});await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);}
 const snapshot=()=>page.evaluate(()=>window.srpgDebug.snapshot());
 await reset();await page.locator('#nextUnit').click();assert.equal(await page.evaluate(()=>window.srpgDebug.draft().selected),'a1');
 await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await page.keyboard.press('w');assert.equal((await snapshot()).metrics.commands,0);
 assert((await page.locator('#actionPreview').textContent()).includes('P3スキルなし'));await page.keyboard.press('Escape');assert.equal((await snapshot()).metrics.commands,0);
 await page.keyboard.press('Enter');await page.keyboard.press('w');await page.keyboard.press('Enter');assert.equal((await snapshot()).units[0].y,15);assert.equal((await snapshot()).metrics.commands,1);
 await page.keyboard.press('n');assert.equal(await page.evaluate(()=>window.srpgDebug.draft().selected),'a2');
 await page.keyboard.press('w');await page.keyboard.press('Enter');assert.equal((await snapshot()).units[1].command,'support');
 assert((await page.locator('#endTurn').textContent()).includes('(6)'));results.push('keyboard movement, explicit wait confirmation, Escape, stationary support and next-ready navigation');
 const combat=createGame();for(const e of combat.units.filter(u=>u.team==='enemy'))e.ai='hold';
 Object.assign(combat.units.find(u=>u.id==='e1'),{x:7,y:16});Object.assign(combat.units.find(u=>u.id==='e2'),{x:8,y:17});
 await reset(combat);await page.locator('#rosterBtn').click();await page.locator('#rosterList button').filter({hasText:'ノア'}).click();
 await page.locator('#mapViewport').focus();await page.keyboard.press('a');assert.equal(await page.evaluate(()=>window.srpgDebug.draft().target),'e1');
 assert((await page.locator('.battle-forecast').textContent()).includes('HP 18 → 9'));assert((await page.locator('.battle-forecast').textContent()).includes('HP 22 → 14'));
 await page.keyboard.press('a');assert.equal(await page.evaluate(()=>window.srpgDebug.draft().target),'e2');await page.keyboard.press('a');
 await page.screenshot({path:'test-results/forecast-0.3.0.png'});await page.keyboard.press('Enter');
 assert.equal((await snapshot()).units.find(u=>u.id==='a4').hp,9);assert.equal((await snapshot()).units.find(u=>u.id==='e1').hp,14);results.push('in-range target cycling and HP forecast agree with actual attack and counter');
 await page.locator('#menuBtn').click();await page.locator('#maps .map-card').nth(1).getByRole('button').click();assert(await page.locator('#newBattleConfirm').isVisible());assert.equal((await snapshot()).map.id,0);
 await page.locator('#closeModal').click();assert.equal((await snapshot()).metrics.commands,1);
 await page.locator('#menuBtn').click();await page.locator('#maps .map-card').nth(1).getByRole('button').click();await page.locator('#newBattleConfirm button').click();assert.equal((await snapshot()).map.id,1);results.push('changing battles requires confirmation and returning keeps progress');
 const old=createGame();old.units[0].acted=true;await reset(old,'0.2.0');assert((await snapshot()).units[0].acted);assert(!(await page.locator('#modal').evaluate(e=>e.open)));results.push('v0.2.0 save resumes without losing actions');
 await page.locator('#menuBtn').click();await page.getByText('操作と表示速度',{exact:true}).click();await page.locator('#speedControl button').click();assert((await page.locator('#speedControl button').textContent()).includes('高速'));await page.reload();await page.locator('#menuBtn').click();await page.getByText('操作と表示速度',{exact:true}).click();assert((await page.locator('#speedControl button').textContent()).includes('高速'));results.push('playback speed persists independently of battle saves');
 const iconResults=await page.evaluate(async()=>{const manifest=await fetch('manifest.webmanifest').then(r=>r.json());return Promise.all([...manifest.icons,{src:document.querySelector('link[rel="apple-touch-icon"]').getAttribute('href')}].map(async icon=>{const i=new Image();i.src=icon.src;await i.decode();return {src:icon.src,width:i.naturalWidth,height:i.naturalHeight};}));});assert(iconResults.every(i=>i.width===i.height&&i.width>=180));results.push('install icons, maskable icon and Apple touch icon load at correct sizes');
 const defeat=createGame(1,{},['a2']);Object.assign(defeat.units.find(u=>u.id==='a3'),{alive:false,hp:0});defeat.lost.push('a3');defeat.metrics.deaths.push({id:'a3',turn:1,reason:'test'});defeat.status='defeat';defeat.phase=2;await reset(defeat);
 await page.locator('#menuBtn').click();await page.locator('#settingsDetails summary').click();await page.locator('#difficulty').selectOption('2');await page.locator('#maps .map-card').first().getByRole('button').click();await page.locator('#closeModal').click();
 await page.locator('#orders').getByRole('button',{name:'再試行',exact:true}).click();await page.locator('#restartConfirm button').click();
 assert.equal((await snapshot()).settings.enemyAttack,0);assert(!(await snapshot()).units.some(u=>u.id==='a2'));assert((await snapshot()).units.find(u=>u.id==='a3').alive);results.push('retry restores chapter-start roster and settings after canceling a different battle');
 const victory=createGame(0,{mode:'casual'});Object.assign(victory.units.find(u=>u.id==='a2'),{alive:false,hp:0});victory.metrics.deaths.push({id:'a2',turn:1,reason:'test'});victory.status='victory';await reset(victory);
 await page.locator('#orders').getByRole('button',{name:'次章へ（離脱継承）',exact:true}).click();assert.equal((await snapshot()).map.id,1);assert((await snapshot()).units.find(u=>u.id==='a2').alive);results.push('casual campaign restores withdrawn named units in the next chapter');
 // Observe an actual intermediate enemy hit before the turn completes.
 await page.evaluate(()=>localStorage.setItem('field-command-fast','false'));
 const playback=createGame();Object.assign(playback.units.find(u=>u.id==='e1'),{x:5,y:15});await reset(playback);
 await page.locator('#endTurn').click();await page.locator('#endConfirm button').click();await page.waitForFunction(()=>window.srpgDebug.snapshot().phase===2&&window.srpgDebug.snapshot().units.some(u=>u.team==='ally'&&u.hp<u.maxHp));
 assert(await page.locator('#nextUnit').isDisabled());assert(await page.locator('#menuBtn').isDisabled());await page.waitForFunction(()=>window.srpgDebug.snapshot().turn===2);assert.equal((await snapshot()).metrics.turns,1);results.push('individual enemy damage is observable while turn controls stay locked');
 assert.deepEqual(errors,[]);writeFileSync('test-results/usability-results-0.3.0.json',JSON.stringify({results,icons:iconResults,errors},null,2));console.log(JSON.stringify({results,errors},null,2));
}finally{await browser.close();}
