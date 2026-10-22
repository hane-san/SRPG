// Presentation visual smoke checks, without modifying game rules or saves.
import assert from 'node:assert/strict';
import {launch,setup} from './browser-helpers.mjs';
const browser=await launch();
try{
 const {page,errors}=await setup(browser);
 const out=await page.evaluate(async()=>{
  const {render,renderStats}=await import('./render.js?v=0.8.0-fx39');
  const {feedbackStyle}=await import('./combat-fx.js?v=0.8.0-fx39');
  const {unit}=await import('./data.js?v=0.8.0-issue17');
  const s=srpgDebug.snapshot(),canvas=document.createElement('canvas');
  s.units=[unit({id:'a',name:'騎兵',type:'horse',x:4,y:16},'ally'),unit({id:'e',name:'鉄衛',type:'shield',x:5,y:15},'enemy')];
  const before=JSON.stringify(s),v={tile:32,selected:null,route:[],menu:false,dest:null};
  const sample=(x=5,y=15)=>{
   const ratio=canvas.width/(s.map.w*32),r=canvas.getContext('2d').getImageData(Math.floor(x*32*ratio),Math.floor(y*32*ratio),Math.ceil(32*ratio),Math.ceil(32*ratio));
   return Array.from(r.data);
  };
  const differs=(a,b)=>a.some((n,i)=>n!==b[i]);
  render(canvas,s,v);const base=sample(),initial=renderStats(canvas);
  const moveFx=feedbackStyle({count:2});
  v.impact={id:'e',x:5,y:15,dx:1,dy:0,style:moveFx,kind:'shard',progress:.18};
  render(canvas,s,v);const hit=sample(),afterHit=renderStats(canvas);
  const visibleHit=differs(base,hit);
  v.impact.progress=1;render(canvas,s,v);const afterFade=sample();
  const style=feedbackStyle({count:2,armoured:true});
  v.impact={...v.impact,style,progress:.18};render(canvas,s,v);const armour=sample();
  v.impact={...v.impact,style:feedbackStyle({heal:true,count:2}),kind:'heal'};render(canvas,s,v);const heal=sample();
  v.impact=null;v.stepLanding={x:5,y:15,progress:.18};render(canvas,s,v);const landing=sample();
  v.stepLanding=null;render(canvas,s,v);const afterClear=sample(),afterEffects=renderStats(canvas);
  return {visibleHit,vanishes:!differs(base,afterFade),visibleArmour:differs(base,armour),healDifferent:differs(armour,heal),visibleLanding:differs(base,landing),clean:!differs(base,afterClear),mapUnchanged:JSON.stringify(s)===before,initial,afterHit,afterEffects};
 });
 for(const key of ['visibleHit','vanishes','visibleArmour','healDifferent','visibleLanding','clean','mapUnchanged'])assert(out[key],key+' '+JSON.stringify(out));
 assert.deepEqual(out.initial,out.afterHit,'ephemeral hit FX must not invalidate cached battlefield layers');
 assert.deepEqual(out.initial,out.afterEffects,'landing FX must not allocate additional map-sized layers');
 assert.deepEqual(errors,[],'no page errors');
 console.log(JSON.stringify({fx:out,errors},null,2));
}finally{await browser.close();}
