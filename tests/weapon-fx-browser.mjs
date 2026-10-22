// Browser: weapon signatures have visible pixels; boss fracture belongs to lethal only.
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {unit} from '../data.js';
import {launch,setup} from './browser-helpers.mjs';

const browser=await launch();
try{
 // This suite measures visible movement; normal browser helpers intentionally use reduced motion.
 const t=await setup(browser,390,844,{reducedMotion:'no-preference'}),{page}=t;
 const synthetic=await page.evaluate(async()=>{
  const {render,renderStats}=await import('./render.js?v=0.8.0-weapon48');
  const {weaponProfile}=await import('./weapon-fx.js?v=0.8.0-weapon48');
  const {unit}=await import('./data.js?v=0.8.0-issue17');
  const s=srpgDebug.snapshot(),actor=unit({id:'a',name:'攻撃側',type:'sword',x:4,y:16},'ally'),
   enemy=unit({id:'boss',name:'守将',type:'shield',x:5,y:15,ai:'hold'},'enemy');
  s.units=[actor,enemy];const original=JSON.stringify(s),canvas=document.createElement('canvas');
  const v={tile:32,selected:null,route:[],menu:false,dest:null};
  const fingerprint=()=>{const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let h=2166136261;for(let i=0;i<data.length;i+=4)h=Math.imul(h^(data[i]+(data[i+1]<<8)+(data[i+2]<<16)),16777619)>>>0;return h;};
  render(canvas,s,v);const base=fingerprint(),initial=renderStats(canvas);
  const signatures={};
  for(const type of ['sword','shield','horse','bow','shooter','mage']){
   v.strike={from:{...actor,type},to:enemy,weapon:weaponProfile(type),progress:.65};
   render(canvas,s,v);signatures[type]=fingerprint();
  }
  v.strike={from:actor,to:enemy,weapon:weaponProfile('sword',{reduced:true}),progress:.65};
  render(canvas,s,v);const quiet=fingerprint();
  v.strike=null;v.bossBreak={x:5,y:15,progress:.75,stage:'crack'};
  render(canvas,s,v);const fracture=fingerprint();
  v.bossBreak={x:5,y:15,progress:.35,stage:'burst'};
  render(canvas,s,v);const burst=fingerprint();
  v.bossBreak=null;render(canvas,s,v);const final=fingerprint(),after=renderStats(canvas);
  return {base,signatures,quiet,fracture,burst,final,initial,after,unchanged:JSON.stringify(s)===original};
 });
 for(const [kind,signature] of Object.entries(synthetic.signatures))assert.notEqual(signature,synthetic.base,'visible weapon sweep for '+kind);
 assert.equal(synthetic.quiet,synthetic.base,'reduced motion hides weapon trails');
 assert.notEqual(synthetic.fracture,synthetic.base,'boss initial fracture renders');
 assert.notEqual(synthetic.burst,synthetic.base,'boss final burst renders');
 assert.equal(synthetic.final,synthetic.base,'effects clear without residue');
 assert.deepEqual(synthetic.after,synthetic.initial,'temporary weapon/boss effects never rebuild terrain or attack-range cache');
 assert(synthetic.unchanged,'synthetic weapon render never changes battle state');
 const game=E.createGame();game.units=[
  unit({id:'a',name:'突撃剣士',type:'sword',x:4,y:16},'ally'),
  unit({id:'boss',name:'守将',type:'shield',x:4,y:15,ai:'hold'},'enemy')
 ];
 game.units[0].atk=5;game.units[1].hp=2;
 const expected=structuredClone(game);
 assert(E.act(expected,'a',game.units[0],'attack','boss').ok);
 assert.equal(expected.units[1].hp,0);
 await t.reset(game);
 await page.evaluate(()=>{
  window.weaponTrail=[];window.bossTrail=[];window.recordWeapon=true;
  function poll(){
   if(!window.recordWeapon)return;
   const f=window.srpgDebug?.draft();
   if(f?.strike&&window.weaponTrail.length<80)window.weaponTrail.push({kind:f.strike.weapon.kind,p:f.strike.progress});
   if(f?.bossBreak&&window.bossTrail.length<80)window.bossTrail.push({stage:f.bossBreak.stage,p:f.bossBreak.progress});
   requestAnimationFrame(poll);
  }requestAnimationFrame(poll);
 });
 await t.select('a');await page.locator('#attackOrder').click();await t.settled();
 const observed=await page.evaluate(()=>{window.recordWeapon=false;return {weapons:window.weaponTrail,boss:window.bossTrail};});
 assert(observed.weapons.some(x=>x.kind==='slash'&&x.p>.32&&x.p<1),'actual combat makes a visible slash');
 assert(observed.boss.some(x=>x.stage==='crack'),'boss's lethal jewels fracture');
 assert(observed.boss.some(x=>x.stage==='burst'),'boss collapse is a bigger distinct burst');
 assert.deepEqual(await t.state(),expected,'visuals never change HP, actor flags, counter or logs');
 await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);
 assert.deepEqual(await t.state(),expected,'lethal boss saved state survives reload');
 assert.deepEqual(t.errors,[],'no browser uncaught exceptions');
 console.log(JSON.stringify({synthetic:{...synthetic,signatures:synthetic.signatures},frames:{weapons:observed.weapons.length,boss:observed.boss.length},errors:t.errors},null,2));
}finally{await browser.close();}
