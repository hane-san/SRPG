// Real pointer selection and every overlay transition must preserve map pixels.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const results=[];mkdirSync('test-results',{recursive:true});
for(const [width,height]of [[390,844],[360,740],[320,568],[844,390],[1363,936]]){
 const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu']}:{} )});
 try{
  const ctx=await b.newContext({viewport:{width,height},hasTouch:true,isMobile:true}),p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto((process.env.TEST_URL||'http://localhost:4173')+'/?debug=1');await p.locator('#maps .map-card').first().getByRole('button').click();
  await p.evaluate(()=>{const v=document.querySelector('#mapViewport'),t=document.querySelector('#battlefield').getBoundingClientRect().width/12;v.scrollTop=16*t-v.clientHeight*.7;});
  const geometry=()=>p.evaluate(()=>{const v=document.querySelector('#mapViewport'),r=v.getBoundingClientRect(),c=document.querySelector('#battlefield').getBoundingClientRect();return [r.x,r.y,r.width,r.height,c.x,c.y,c.width,c.height,v.scrollLeft,v.scrollTop];});
  const camera=await geometry(),check=async()=>assert.deepEqual(await geometry(),camera);
  const tap=async(x,y)=>{const a=await p.locator('#battlefield').evaluate((e,{x,y})=>{const r=e.getBoundingClientRect(),t=r.width/12;return {x:r.left+(x+.5)*t,y:r.top+(y+.5)*t};},{x,y});await p.touchscreen.tap(a.x,a.y);await check();};
  await tap(5,16);assert(await p.locator('#orders.choosing').count());
  await p.getByRole('button',{name:'命令',exact:true}).click();await check();
  await p.getByRole('button',{name:'待機',exact:true}).click();await check();
  await p.getByRole('button',{name:'地図',exact:true}).click();await check();assert(!(await p.locator('#confirmOrder').isVisible()));
  await p.getByRole('button',{name:'命令',exact:true}).click();await check();assert(await p.locator('#confirmOrder').isEnabled());
  await p.getByRole('button',{name:'取消',exact:true}).click();await check();assert(await p.locator('#orders.choosing').count());
  const cdp=await ctx.newCDPSession(p);
  const position=async(x,y)=>p.locator('#battlefield').evaluate((e,{x,y})=>{const r=e.getBoundingClientRect(),t=r.width/12;return {x:r.left+(x+.5)*t,y:r.top+(y+.5)*t};},{x,y});
  const swipe=async(from,to)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/6,y:from.y+(to.y-from.y)*i/6,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  await swipe(await position(5,16),await position(5,14));await check();assert.equal(await p.evaluate(()=>window.srpgDebug.draft().dest.y),14);assert(await p.locator('#confirmOrder').isVisible());
  await p.getByRole('button',{name:'待機',exact:true}).click();await check();
  const buttons=await p.locator('#orders button:visible').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,w:r.width,h:r.height,visible:r.top>=0&&r.bottom<=innerHeight};}));
  assert(buttons.every(b=>b.w>=44&&b.h>=44&&b.visible),JSON.stringify(buttons));
  await p.screenshot({path:`test-results/overlay-${width}x${height}-0.2.0.png`});
  await p.locator('#confirmOrder').click();await check();assert.equal(await p.evaluate(()=>window.srpgDebug.snapshot().units.find(u=>u.id==='a1').y),14);
  await p.locator('#rosterBtn').click();await p.locator('#rosterList button').filter({hasText:'セナ'}).click();
  await p.evaluate(()=>{const v=document.querySelector('#mapViewport'),t=document.querySelector('#battlefield').getBoundingClientRect().width/12;v.scrollTop=13*t-v.clientHeight*.6;});
  await p.touchscreen.tap(...Object.values(await position(6,13)));const aimCamera=await geometry();
  await swipe(await position(6,13),await position(6,12));assert.deepEqual(await geometry(),aimCamera);
  assert.equal(await p.evaluate(()=>window.srpgDebug.draft().target),'e1');assert(await p.locator('#confirmOrder').isEnabled());
  assert.equal(await p.evaluate(()=>window.srpgDebug.snapshot().units.find(u=>u.id==='e1').hp),22);await p.locator('#confirmOrder').click();assert.equal(await p.evaluate(()=>window.srpgDebug.snapshot().units.find(u=>u.id==='e1').hp),15);
  assert.deepEqual(errors,[]);results.push({width,height,cameraStable:true,slideAndFlick:true,buttons,errors});
 }finally{await b.close();}
}
writeFileSync('test-results/overlay-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
