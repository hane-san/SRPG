// Detailed UI regressions: movement cancellation, gestures, targets, saves and input locks.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createGame} from '../engine.js';
import {RELEASE} from '../config.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu']}:{} )});
const base=process.env.TEST_URL||'http://localhost:4173',results=[],errors=[];mkdirSync('test-results',{recursive:true});
const context=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.srpgDebug.snapshot());
async function reset(fixture=createGame(0)){
 await page.evaluate(data=>localStorage.setItem('field-command-save-v1',JSON.stringify(data)),{release:RELEASE,state:fixture,campaign:false});
 await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);assert(!(await page.locator('#modal').evaluate(e=>e.open)));
}
async function select(id){const ss=await state(),u=ss.units.find(u=>u.id===id);await page.locator('#rosterBtn').click();await page.locator('#rosterList button').filter({hasText:u.name}).click();}
async function point(p){return page.evaluate(p=>{const c=document.querySelector('#battlefield'),v=document.querySelector('#mapViewport'),t=c.getBoundingClientRect().width/window.srpgDebug.snapshot().map.w;v.scrollTop=p.y*t-v.clientHeight*.45;v.scrollLeft=p.x*t-v.clientWidth*.5;const r=c.getBoundingClientRect();return {x:r.left+(p.x+.5)*t,y:r.top+(p.y+.5)*t};},p);}
async function tap(p){const at=await point(p);await page.touchscreen.tap(at.x,at.y);}
try{
 await page.goto(base+'/?debug=1');await page.waitForSelector('#maps');await page.locator('#maps .map-card').first().getByRole('button').click();
 await page.screenshot({path:'test-results/mobile-idle-0.1.1.png'});
 await select('a1');await tap({x:5,y:14});assert((await page.locator('#actionPreview').textContent()).includes('(6, 15)'));
 assert.equal((await state()).units.find(u=>u.id==='a1').y,16);
 await page.getByRole('button',{name:'取消',exact:true}).click();assert((await page.locator('#actionPreview').textContent()).includes('その場'));
 await page.getByRole('button',{name:'解除',exact:true}).click();assert(await page.locator('#orders.idle').count());
 await select('a1');await tap({x:5,y:16});assert(await page.locator('#orders.idle').count(),'same-unit tap deselects');
 results.push('preview, cancel and deselect');
 await select('a1');const before=await page.locator('#actionPreview').textContent(),coords=await point({x:5,y:15});
 await page.mouse.move(coords.x,coords.y);await page.mouse.down();await page.mouse.move(coords.x+35,coords.y,{steps:4});await page.mouse.move(coords.x,coords.y,{steps:4});await page.mouse.up();
 assert.equal(await page.locator('#actionPreview').textContent(),before,'returning drag must not produce a tap');
 await tap({x:5,y:14});assert((await page.locator('#actionPreview').textContent()).includes('(6, 15)'),'next real tap must work');
 await page.locator('#mapViewport').dispatchEvent('pointerdown',{pointerId:21,clientX:100,clientY:200,button:0});
 await page.locator('#mapViewport').dispatchEvent('pointercancel',{pointerId:21});
 await tap({x:5,y:13});assert((await page.locator('#actionPreview').textContent()).includes('(6, 14)'));
 results.push('drag return, cancellation and next valid touch');
 const camera=()=>page.evaluate(()=>{const v=document.querySelector('#mapViewport'),t=document.querySelector('#battlefield').getBoundingClientRect().width/window.srpgDebug.snapshot().map.w;return {x:(v.scrollLeft+v.clientWidth/2)/t,y:(v.scrollTop+v.clientHeight/2)/t};});
 await point({x:5,y:10});const c0=await camera();await page.locator('#zoomIn').click();const c1=await camera();assert(Math.abs(c0.x-c1.x)<.12&&Math.abs(c0.y-c1.y)<.12,JSON.stringify({c0,c1}));
 await tap({x:5,y:14});await page.getByRole('button',{name:'守備 −1',exact:true}).click();
 await page.screenshot({path:'test-results/mobile-order-0.1.1.png'});
 await page.locator('#confirmOrder').evaluate(e=>{e.click();e.click();});assert.equal((await state()).metrics.commands,1,'double confirm only one action');
 await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);assert.equal((await state()).units.find(u=>u.id==='a1').y,14);
 results.push('zoom anchor, touch coordinates, double confirm and save');
 await reset();await select('a2');await tap({x:6,y:13});await page.getByRole('button',{name:'破陣',exact:true}).click();await tap({x:6,y:12});
 assert((await page.locator('#actionPreview').textContent()).includes('11'));
 await page.locator('#confirmOrder').click();const attacked=await state();assert.equal(attacked.units.find(u=>u.id==='e1').hp,11);assert.equal(attacked.units.find(u=>u.id==='a2').charges,1);results.push('burst target, preview and charge consumption');
 const healing=createGame(0);healing.units.find(u=>u.id==='a2').hp=5;await reset(healing);await select('a8');await tap({x:6,y:17});await page.getByRole('button',{name:'即時治癒',exact:true}).click();await tap({x:6,y:16});
 assert(await page.locator('#confirmOrder').isEnabled());await page.locator('#confirmOrder').click();assert.equal((await state()).units.find(u=>u.id==='a2').hp,11);results.push('move then immediate heal');
 await reset(healing);await select('a5');await page.getByRole('button',{name:'待機祈祷',exact:true}).click();
 await page.getByRole('button',{name:'詳細',exact:true}).click();await page.getByRole('combobox',{name:'待機支援の優先対象'}).selectOption('a2');await page.getByRole('button',{name:'消費許可：ON',exact:true}).click();assert.equal((await state()).units.find(u=>u.id==='a5').spend,false);
 await page.getByRole('button',{name:'戦場へ戻る',exact:true}).click();assert((await page.locator('#actionPreview').textContent()).includes('温存'));await page.locator('#confirmOrder').click();results.push('support detail, priority, conservation and confirmation');
 await page.locator('#endTurn').click();await page.getByRole('button',{name:'敵フェーズへ進む',exact:true}).evaluate(e=>{e.click();e.click();});
 assert(await page.locator('#menuBtn').isDisabled());assert(await page.locator('#rosterBtn').isDisabled());await page.waitForFunction(()=>window.srpgDebug.snapshot().turn===2);assert.equal((await state()).metrics.turns,1);results.push('phase lock and double end-turn');
 await reset(createGame(2));for(let i=0;i<2;i++){await page.locator('#endTurn').click();await page.getByRole('button',{name:'敵フェーズへ進む',exact:true}).click();await page.waitForFunction(t=>window.srpgDebug.snapshot().turn===t,i+2);}
 assert(await page.locator('#forecast').isVisible());assert((await page.locator('#forecast').textContent()).includes('砲撃'));results.push('artillery warning remains visible');
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);await select('a1');await tap({x:6,y:20});await page.getByRole('button',{name:'守備 −1',exact:true}).click();assert(await page.locator('#confirmOrder').isEnabled());await page.locator('#confirmOrder').click();assert.equal((await state()).units.find(u=>u.id==='a1').y,20);results.push('rotation preserves hit testing');
 const terminal=createGame(0);terminal.status='defeat';terminal.phase=2;await reset(terminal);assert((await page.locator('#orders').textContent()).includes('敗北'));assert.equal((await state()).status,'defeat');results.push('finished battle restores after reload');
 await page.evaluate(()=>localStorage.setItem('field-command-save-v1','{bad'));await page.reload();await page.waitForSelector('#maps');assert.equal((await state()).turn,1);results.push('corrupt save recovers to map selection');
 assert.deepEqual(errors,[]);writeFileSync('test-results/interaction-results.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));
}finally{await b.close();}
