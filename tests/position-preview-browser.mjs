import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as E from '../engine.js';
import {MAPS,unit} from '../data.js';
import {RULES} from '../config.js';
import {launch,setup} from './browser-helpers.mjs';
const browser=await launch(),results=[];
try{
 const t=await setup(browser),{page}=t;
 const fixture=(type='sword')=>{const s=E.createGame();s.units=[
  unit({id:'a',name:'味方',type,x:4,y:16},'ally'),
  unit({id:'e',name:'近敵',type:'shield',x:6,y:14,ai:'hold'},'enemy'),
  unit({id:'other',name:'別の敵',type:'sword',x:7,y:14,ai:'hold'},'enemy'),
  unit({id:'far',name:'遠方',type:'sword',x:9,y:8,ai:'hold'},'enemy')];return s;};
 const origin={x:4,y:16},dest={x:5,y:14};
 for(const [width,height]of [[320,568],[360,740],[390,844],[844,390]]){
  await page.setViewportSize({width,height});
  for(const map of MAPS){
   const s=E.createGame(map.id);if(map.id===4)s.turn=4;
   await t.reset(s);await t.select('a1');const camera=await t.camera(),u=E.alive(s,'ally')[0];
   const p=E.reachable(s,u).find(p=>p.y===u.y&&E.dist(p,u)===1&&(!s.map.camp||E.dist(p,s.map.camp)>0));assert(p);
   await t.slide(u,p,{end:false});const draft=await t.draft();assert(draft.dragging);assert(await page.locator('#orders').isHidden());
   const text=await page.locator('#commandHint').innerText();assert(text.includes(`コスト ${p.cost}/${E.movement(s,u)}`),text);
   if(map.id===4)assert(text.includes('大雨'));
   const geometry=await page.locator('#commandHint').evaluate(e=>{const dock=e.parentElement.getBoundingClientRect();return {dock:dock.height,children:[...e.children].map(c=>{const r=c.getBoundingClientRect();return {top:r.top>=dock.top,bottom:r.bottom<=dock.bottom,left:r.left>=dock.left,right:r.right<=dock.right,font:parseFloat(getComputedStyle(c).fontSize)};})};});
   assert.equal(geometry.dock,144);assert(geometry.children.every(c=>c.top&&c.bottom&&c.left&&c.right),JSON.stringify({width,map:map.id,geometry}));assert(geometry.children.slice(0,2).every(c=>c.font>=14));
   assert.deepEqual(await t.state(),s);await t.touch('touchCancel',[]);assert.deepEqual(await t.state(),s);
   assert.deepEqual(await t.camera(),camera);await page.keyboard.press('Escape');assert.deepEqual(await t.camera(),camera);
   results.push({width,map:map.id+1,weather:E.weatherAt(s),cost:p.cost,budget:E.movement(s,u)});
  }
 }
 await page.setViewportSize({width:390,height:844});
 const forest=fixture();forest.units[0].x=3;forest.units[0].y=17;await t.reset(forest);
 await t.slide({x:3,y:17},{x:2,y:17},{end:false});assert((await page.locator('#commandHint').innerText()).includes('コスト 2/5'),'one forest tile costs two movement points');await t.touch('touchCancel',[]);assert.deepEqual(await t.state(),forest);
 const s=fixture();await t.reset(s);
 await t.slide(origin,dest,{end:false});
 assert((await page.locator('#commandHint').innerText()).includes('コスト 3/5'));
 await page.screenshot({path:'test-results/position22-route-390.png'});
 await t.touch('touchCancel',[]);assert.deepEqual(await t.state(),s);
 await t.slide(origin,dest);const arrow=await t.draft(),camera=await t.camera();
 await t.slide(dest,{x:9,y:8});assert((await page.locator('#actionPreview').innerText()).includes('遠方まで10マス'));assert(await page.locator('#attackOrder').isDisabled());
 assert.deepEqual((await t.draft()).route,arrow.route);assert.deepEqual(await t.state(),s);assert.deepEqual(await t.camera(),camera);
 await page.screenshot({path:'test-results/position22-range-390.png'});
 await t.slide(dest,{x:6,y:14});const expected=structuredClone(s);assert(E.act(expected,'a',dest,'attack','e').ok);
 await page.locator('#attackOrder').click();await t.settled();assert.deepEqual(await t.state(),expected);
 await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);assert.deepEqual(await t.state(),expected);
 // An adjacent bow error must not silently switch to the other, legal enemy.
 const bow=fixture('bow');await t.reset(bow);await t.slide(origin,dest);await t.slide(dest,{x:6,y:14});
 const close=await t.draft();assert.equal(close.target,null);assert.deepEqual(close.dest,dest);
 const error=await page.locator('#actionPreview').innerText();assert(error.includes('近敵まで1マス')&&error.includes('近すぎます')&&error.includes('射程2'),error);
 assert(await page.locator('#attackOrder').isDisabled());assert.deepEqual(await t.state(),bow);
 await page.setViewportSize({width:320,height:568});await page.screenshot({path:'test-results/position22-bow-320.png'});
 await page.setViewportSize({width:390,height:844});await t.reset(fixture());await t.tap(origin);await t.tap({x:9,y:8});
 assert((await page.locator('#actionPreview').innerText()).includes('移動しても届きません'));assert(await page.locator('#attackOrder').isDisabled());assert.equal((await t.state()).metrics.commands,0);
 // Actual canvas pixels: gold marks only enemies in normal range from the endpoint.
 const rendering=await page.evaluate(async()=>{
  const {render,renderStats}=await import('./render.js?v=0.8.0-position22'),{createGame}=await import('./engine.js?v=0.8.0-issue17'),{unit}=await import('./data.js?v=0.8.0-issue17');
  const s=createGame();s.units=[unit({id:'a',name:'弓',type:'bow',x:4,y:16},'ally'),unit({id:'e',name:'隣接',type:'sword',x:6,y:14},'enemy'),unit({id:'other',name:'射程内',type:'sword',x:7,y:14},'enemy')];
  const canvas=document.createElement('canvas'),v={tile:32,selected:'a',dest:{x:5,y:14},menu:true};render(canvas,s,v);
  const c=canvas.getContext('2d'),scale=canvas.width/(s.map.w*32);
  const gold=t=>{const data=c.getImageData(t.x*32*scale,t.y*32*scale,32*scale,10*scale).data;let n=0;for(let i=0;i<data.length;i+=4)if(data[i]===255&&data[i+1]===226&&data[i+2]===161)n++;return n;};
  const adjacent=gold(s.units[1]),inRange=gold(s.units[2]),initial=renderStats(canvas);
  for(let i=0;i<30;i++)render(canvas,s,v);const steady=renderStats(canvas);
  s.units[2].alive=false;render(canvas,s,v);const dead=gold(s.units[2]);
  const labels=[],proto=CanvasRenderingContext2D.prototype,fill=proto.fillText;
  try{proto.fillText=function(text,...args){labels.push(text);return fill.call(this,text,...args);};
   s.warnings=[{kind:'cannon',turn:1,cells:[{x:2,y:16}]}];render(canvas,s,v);
  }finally{proto.fillText=fill;}
  return {adjacent,inRange,dead,initial,steady,labels};
 });
 assert.equal(rendering.adjacent,0);assert(rendering.inRange>0);assert.equal(rendering.dead,0);assert.deepEqual(rendering.initial,rendering.steady);assert(rendering.labels.includes(`P4 −${RULES.barrageDamage}`));
 // Castle sortie still originates at the castle; cancellation never spends a slot.
 for(const occupied of [false,true]){
  const sortie=E.createGame();if(occupied)Object.assign(sortie.units[0],sortie.map.camp);
  await t.reset(sortie);await page.locator('#orders button').filter({hasText:'出撃可'}).click();await page.locator('#deploymentList button').first().click();
  const before=await t.draft(),virtual=before.sortieUnit,p=E.reachable(sortie,virtual).find(p=>p.y===virtual.y&&E.dist(p,virtual)===1);
  await t.slide(virtual,p,{end:false});const held=await t.draft();assert(held.dragging&&!held.destinationPress);assert((await page.locator('#commandHint').innerText()).includes('コスト 1/4'));await t.touch('touchCancel',[]);
  assert.deepEqual(await t.draft(),before);assert.deepEqual(await t.state(),sortie);
  await t.slide(virtual,p);assert((await t.draft()).menu);assert.deepEqual(await t.state(),sortie);
  const expected=structuredClone(sortie);assert(E.deployAndAct(expected,virtual.id,p,'wait').ok);
  await page.locator('#waitOrder').click();await t.settled();assert.deepEqual(await t.state(),expected);
  await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);assert.deepEqual(await t.state(),expected);
 }
 assert.deepEqual(t.errors,[]);writeFileSync('test-results/position22-browser-results.json',JSON.stringify({results,rendering,errors:t.errors},null,2));
 console.log(JSON.stringify({screens:results.length,scenarios:['weighted route','cancel','retained route/range reason','single commit/reload','bow minimum range','unreachable direct selection','gold pixels/cache/death','artillery label','sortie cancel'],rendering,errors:t.errors},null,2));
}finally{await browser.close();}
