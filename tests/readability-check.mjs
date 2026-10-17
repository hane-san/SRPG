// P3 area heal, readable archery and action timing, and clear active tiles.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createGame,act,endTurn as resolveTurn} from '../engine.js';
import {unit} from '../data.js';
import {launch,setup} from './browser-helpers.mjs';
const browser=await launch(),results=[];
try{
 const t=await setup(browser,390,844,{reducedMotion:'no-preference'}),{page}=t;
 await t.reset();assert(!(await page.locator('#orders').isVisible()));assert(!(await page.locator('#mapToolChoices').isVisible()));
 const camera=await t.camera();await page.locator('#toolsToggle').click();assert(await page.locator('#zoomIn').isVisible());await page.locator('#toolsToggle').click();assert.deepEqual(await t.camera(),camera);results.push('idle strip absent and tool expansion leaves camera unchanged');
 await t.slide({x:6,y:16},{x:6,y:12});
 const overlap=await page.evaluate(()=>{const r=document.querySelector('#orders').getBoundingClientRect(),c=document.querySelector('#battlefield').getBoundingClientRect(),s=srpgDebug.snapshot(),v=srpgDebug.draft(),tile=c.width/s.map.w;return [s.units.find(u=>u.id===v.selected),v.dest,s.units.find(u=>u.id===v.target)].filter(Boolean).some(p=>{const x=c.left+(p.x+.5)*tile,y=c.top+(p.y+.5)*tile;return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;});});assert(!overlap);results.push('attack window avoids origin, destination and target at phone size');
 const arch=createGame();arch.units=[unit({id:'archer',name:'弓隊',type:'bow',x:5,y:16},'ally'),unit({id:'target',name:'標的',type:'shield',x:5,y:14,ai:'hold'},'enemy')];
 await t.reset(arch);await t.select('archer');assert((await page.locator('#actionPreview').innerText()).includes('隣接不可'));
 await page.evaluate(()=>{window.arrowTrace=[];window.arrowTimer=setInterval(()=>{const v=srpgDebug.draft();window.arrowTrace.push({at:performance.now(),animation:v.animation,projectile:v.projectile});},10);});
 const expected=structuredClone(arch);act(expected,'archer',arch.units[0],'attack','target');await page.locator('#attackOrder').click();await t.settled();
 const trace=await page.evaluate(()=>{clearInterval(arrowTimer);return arrowTrace;});assert.deepEqual(await t.state(),expected);
 const flight=trace.filter(f=>f.projectile?.type==='bow'&&f.projectile.progress>0&&f.projectile.progress<1);assert(flight.length>3);assert(flight.at(-1).at-flight[0].at>=180);results.push('archer shows range warning and an observable directional flight before impact');
 const heals=createGame();heals.units=[unit({id:'h',name:'回復役',type:'healer',x:5,y:16},'ally'),...[[5,15],[4,16],[6,16],[5,17]].map(([x,y],i)=>({...unit({id:'f'+i,name:'味方'+i,type:'shield',x,y},'ally'),hp:10,acted:true})),unit({id:'boss',name:'敵',type:'shield',x:6,y:1,ai:'hold'},'enemy')];heals.units[0].charges=1;
 await t.reset(heals);await t.select('h');assert((await page.locator('#actionPreview').innerText()).includes('隣接全員回復'));await page.locator('#waitOrder').click();await t.settled();await t.endTurn();
 const after=await t.state();assert(after.units.filter(u=>u.id.startsWith('f')).every(u=>u.hp===17));assert.equal(after.units[0].charges,0);assert.equal(after.metrics.charges,1);assert.equal(after.metrics.supports,1);
 await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);assert.deepEqual(await t.state(),after);results.push('four recipients get full +7 from the last charge; one spend and stable reload');
 const barrage=createGame();barrage.units=[unit({id:'gun',name:'シューター',type:'shooter',x:5,y:16},'ally'),unit({id:'near',name:'近い敵',type:'shield',x:5,y:14,ai:'hold'},'enemy'),unit({id:'far',name:'遠い敵',type:'shield',x:5,y:11,ai:'hold'},'enemy')];barrage.units[0].charges=1;
 await t.reset(barrage);await t.select('gun');assert((await page.locator('#actionPreview').innerText()).includes('全敵'));await page.locator('#waitOrder').click();await t.settled();const expectedVolley=await t.state();resolveTurn(expectedVolley);
 await page.evaluate(()=>{window.volleyTrace=[];window.volleyTimer=setInterval(()=>{const v=srpgDebug.draft();if(v.animation?.kind==='hit')volleyTrace.push(v.animation);},10);});await t.endTurn();const volley=await page.evaluate(()=>{clearInterval(volleyTimer);return volleyTrace;});assert.deepEqual(await t.state(),expectedVolley);assert.deepEqual([...new Set(volley.filter(v=>v.actor==='gun').map(v=>v.target))].sort(),['far','near']);assert.equal((await t.state()).metrics.charges,1);results.push('shooter presents each P3 victim separately and spends the last charge once');
 const rain=createGame(4);rain.turn=4;await t.reset(rain);assert((await page.locator('#forecast').innerText()).includes('大雨'));assert((await page.locator('#forecast').innerText()).includes('歩兵−3/騎兵−4'));
 await t.select('a6');await page.getByRole('button',{name:'詳細',exact:true}).click();assert((await page.locator('#modalBody').innerText()).includes('移動 3（基礎7）'));await page.locator('#closeModal').click();await page.screenshot({path:'test-results/rain-heavy-0.5.0.png'});results.push('rain forecast, cavalry current movement and rendered heavy-rain field agree');
 assert.deepEqual(t.errors,[]);writeFileSync('test-results/readability-results.json',JSON.stringify({results,flightSamples:flight.length,errors:t.errors},null,2));console.log(JSON.stringify({results,errors:t.errors},null,2));
}finally{await browser.close();}
