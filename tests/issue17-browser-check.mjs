import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as E from '../engine.js';
import {unit,MAPS,positions} from '../data.js';
import {RULES} from '../config.js';
import {launch,setup} from './browser-helpers.mjs';
const probe=process.argv.includes('--probe'),browser=await launch(),results=[];
const check=(ok,label,detail={})=>{results.push({label,pass:!!ok,...detail});if(!probe)assert(ok,label+' '+JSON.stringify(detail));};
try{
 const t=await setup(browser),{page}=t;
 const s=E.createGame();s.units=[unit({id:'a',name:'剣士',type:'sword',x:4,y:16},'ally'),unit({id:'e',name:'盾敵',type:'shield',x:6,y:14,ai:'hold'},'enemy'),unit({id:'far',name:'遠方',type:'sword',x:9,y:13,ai:'hold'},'enemy')];
 const origin={x:4,y:16},dest={x:5,y:14};
 const arrow=async()=>{await t.reset(s);await t.slide(origin,dest);return t.draft();};
 const intended=structuredClone(s);assert(E.act(intended,'a',dest,'attack','e').ok);
 // Issue #35: an explicitly drawn endpoint is now a confirmation source,
 // not just a menu preview. Keyboard attempts during a held gesture still fail.
 for(const [label,start]of [['endpoint',dest],['original unit',origin]]){
  const before=await arrow(),camera=await t.camera();
  await t.touch('touchStart',[await t.point(start)]);
  await t.touch('touchMove',[await t.point({x:5,y:15})]);
  await t.touch('touchMove',[await t.point({x:6,y:14})]);
  const held=await t.draft();
  check(held.dragging&&held.target==='e'&&await page.locator('#orders').isHidden(),'controls hidden while held: '+label);
  check(JSON.stringify(held.dest)===JSON.stringify(before.dest),'exact attack route preserved while held: '+label);
  await page.keyboard.press('w');
  check((await t.state()).metrics.commands===0,'held keyboard cannot commit: '+label);
  await t.touch('touchEnd',[]);await t.settled();
  check(JSON.stringify(await t.state())===JSON.stringify(intended),'enemy release commits exact chosen route: '+label);
  check(JSON.stringify(await t.camera())===JSON.stringify(camera),'stable camera: '+label);
  check((await t.state()).metrics.commands===1,'flick commits only one action: '+label);
 }
 // A different reachable tile must not silently reuse an earlier attack origin;
 // an unreachable empty tile is map panning, never a combat command.
 await arrow();await t.touch('touchStart',[await t.point({x:4,y:15})]);
 await t.touch('touchMove',[await t.point({x:5,y:15})]);
 await t.touch('touchMove',[await t.point({x:6,y:14})]);
 await t.touch('touchEnd',[]);
 check((await t.state()).metrics.commands===0,'different origin outside attack range does not commit');
 await arrow();await t.slide({x:0,y:14},{x:6,y:14});
 check((await t.state()).metrics.commands===0,'unreachable empty origin never commits');
 if(probe){console.log(JSON.stringify({baselineProbe:results},null,2));writeFileSync('test-results/issue17-input-before.json',JSON.stringify(results,null,2));}else{
 await arrow();await t.slide(dest,{x:9,y:13});
 check(await page.locator('#attackOrder').isDisabled()&&(await page.locator('#actionPreview').innerText()).includes('射程外'),'out-of-range target disabled with reason');
 check(E.dist((await t.draft()).dest,dest)===0,'out-of-range keeps endpoint');
 await arrow();await t.slide(dest,{x:5,y:15});
 check(E.dist((await t.draft()).dest,dest)===0&&(await t.state()).metrics.commands===0,'release away from the fixed endpoint keeps route without spending action');
 for(const kind of ['cancel','lostcapture','multitouch']){
  const before=await arrow();await page.locator('#mapViewport').evaluate(v=>v.addEventListener('pointerdown',e=>window.testPointer=e.pointerId,{once:true}));await t.slide(dest,{x:6,y:14},{end:false});
  if(kind==='cancel')await t.touch('touchCancel',[]);
  else if(kind==='lostcapture'){await page.locator('#mapViewport').evaluate(v=>v.releasePointerCapture(window.testPointer));await t.touch('touchEnd',[]);}
  else{const held=await t.point({x:6,y:14});await t.touch('touchStart',[held,{x:20,y:20}]);await t.touch('touchEnd',[]);}
  const after=await t.draft();check(JSON.stringify(after)===JSON.stringify(before),'full draft restored after '+kind);
  check((await t.state()).metrics.commands===0,'no action after '+kind);
 }
 // Pointer capture id comes from Chromium's browser stream; exercise a robust explicit loss as well.
 await arrow();await page.locator('#attackOrder').click();await t.settled();
 const expected=structuredClone(s);E.act(expected,'a',dest,'attack','e');check(JSON.stringify(await t.state())===JSON.stringify(expected),'single click move + hit + counter matches engine');
 check((await page.locator('#orders').innerText()).includes('出撃可'),'report exposes remaining sortie budget');
 await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);check(JSON.stringify(await t.state())===JSON.stringify(expected),'resolved command restores after reload');
 const waiting=E.createGame();waiting.units=[unit({id:'a',name:'剣士',type:'sword',x:4,y:16},'ally'),unit({id:'e',name:'敵',type:'sword',x:4,y:15,ai:'hold'},'enemy')];
 await t.reset(waiting);await t.select('a');check((await page.locator('#actionPreview').innerText()).includes('P2反撃なし')===false,'attack forecast remains a forecast');
 await t.slide({x:4,y:16},{x:3,y:16});await t.slide({x:3,y:16},{x:4,y:16});
 check(!(await page.locator('#waitOrder').innerText()).includes('無反撃')&&!(await page.locator('#waitOrder').getAttribute('aria-label')).includes('P2反撃なし'),'normal infantry wait retains P2 counter');
 const cannon=E.createGame(2);cannon.warnings=[{kind:'cannon',turn:1,cells:[{x:6,y:22}]}];
 await t.reset(cannon);check((await page.locator('#forecast').innerText()).includes('−'+RULES.barrageDamage),'artillery display uses actual damage, independent of HP6');
 // Four sizes x six maps: geometry cannot change with draft, warning or cancellation.
 for(const [width,height]of [[320,568],[360,740],[390,844],[844,390]]){
  await page.setViewportSize({width,height});
  for(const map of MAPS){
   const state=E.createGame(map.id),p=positions(map.id);state.units.filter(u=>u.team==='ally').slice(0,2).forEach((u,i)=>Object.assign(u,{deployed:true,x:p[i+1][0],y:p[i+1][1]}));await t.reset(state);const camera=await t.camera();
   await t.select('a1');const selected=await t.camera();
   const metrics=await page.evaluate(()=>{const v=document.querySelector('#mapViewport').getBoundingClientRect(),d=document.querySelector('#commandDock').getBoundingClientRect();return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,dock:d.height,overlap:d.left<v.right-1&&d.right>v.left+1&&d.top<v.bottom-1&&d.bottom>v.top+1,buttons:[...document.querySelectorAll('#orders button')].map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,w:r.width,h:r.height,onScreen:r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};})};});
   check(!metrics.overflow&&!metrics.overlap&&metrics.buttons.every(b=>b.w>=44&&b.h>=44&&b.onScreen),'44px dock controls '+width+' map '+(map.id+1),metrics);
   if(map.id===0&&(width===320||width===844))await page.screenshot({path:`test-results/issue17-dock-${width}.png`});
   // Roster selection deliberately navigates; cancellation must retain that new position.
   await page.keyboard.press('Escape');check(JSON.stringify(await t.camera())===JSON.stringify(selected),'cancel keeps camera '+width+' map '+(map.id+1));
   const warnings=structuredClone(state);warnings.warnings=[{kind:'cannon',turn:1,cells:[{...state.map.camp}]}];await t.reset(warnings);
   check((await t.camera())[3]===camera[3],'warning keeps viewport height '+width+' map '+(map.id+1));
  }
 }
 const waves=await page.evaluate(async()=>{
  const Original=window.AudioContext,rows=[];
  try{for(const kind of ['deploy','defend','defeat','hit']){
   const rate=24000,ctx=new OfflineAudioContext(1,rate,rate);window.AudioContext=function(){return ctx;};ctx.resume=()=>Promise.resolve();
   const {createAudio}=await import('./audio.js?v=0.8.0-issue17');const audio=createAudio(null);audio.unlock();audio.play(kind,3);
   const data=(await ctx.startRendering()).getChannelData(0);let peak=0,energy=0,tail=0,signature=2166136261;
   for(let i=0;i<data.length;i++){if(!Number.isFinite(data[i]))throw Error('non-finite sample');const v=data[i];peak=Math.max(peak,Math.abs(v));energy+=v*v;if(i>rate*.6)tail=Math.max(tail,Math.abs(v));signature=Math.imul(signature^(Math.round(v*32767)&65535),16777619)>>>0;}
   rows.push({kind,peak,rms:Math.sqrt(energy/data.length),tail,signature});
  }}finally{window.AudioContext=Original;}return rows;
 });
 check(waves.every(w=>w.peak>.005&&w.peak<1&&w.rms>.001&&w.tail<.001)&&new Set(waves.map(w=>w.signature)).size===4,'four finite, non-silent, distinct cues with headroom',{waves});
 // Effects mute persists, and failed Web Audio never changes a committed command.
 await page.setViewportSize({width:390,height:844});await t.reset(s);await page.locator('#soundBtn').click();await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);check(!(await page.evaluate(()=>srpgDebug.audio())).enabled,'mute persists');
 await page.evaluate(()=>{window.AudioContext=function(){throw Error('audio unavailable');};window.webkitAudioContext=window.AudioContext;});
 await page.locator('#soundBtn').click();check((await page.evaluate(()=>srpgDebug.audio())).enabled&&(await page.evaluate(()=>srpgDebug.audio())).state==='locked','failed audio unlock remains enabled and locked');
 await t.slide(origin,dest);await page.locator('#attackOrder').click();await t.settled();check(JSON.stringify(await t.state())===JSON.stringify(expected),'audio failure cannot block combat');
 check(t.errors.length===0,'no page errors',{errors:t.errors});
 writeFileSync('test-results/issue17-browser-results.json',JSON.stringify({results,waves},null,2));console.log(JSON.stringify({cases:results.length,failed:results.filter(r=>!r.pass),waves},null,2));
}
}finally{await browser.close();}
