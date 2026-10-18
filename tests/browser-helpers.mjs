import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {RELEASE} from '../config.js';
import {createGame} from '../engine.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
export const base=process.env.TEST_URL||'http://localhost:4173';
export async function launch(){return chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu']}: {})});}
export async function setup(browser,width=390,height=844,options={}){
 mkdirSync('test-results',{recursive:true});
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce',...options}),page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?debug=1');await page.waitForFunction(()=>!!window.srpgDebug);
 const state=()=>page.evaluate(()=>window.srpgDebug.snapshot()),draft=()=>page.evaluate(()=>window.srpgDebug.draft());
 async function reset(s=createGame(),release=RELEASE,campaign=false){await page.evaluate(data=>localStorage.setItem('field-command-save-v1',JSON.stringify(data)),{release,state:s,campaign});await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);}
 const settled=()=>page.waitForFunction(()=>!window.srpgDebug.busy());
 async function select(id){const u=(await state()).units.find(u=>u.id===id);await page.locator('#rosterBtn').click();await page.locator('#rosterList button').filter({hasText:u.name}).click();}
 const camera=()=>page.locator('#mapViewport').evaluate(e=>[e.scrollLeft,e.scrollTop,e.clientWidth,e.clientHeight]);
 const point=p=>page.locator('#battlefield').evaluate((e,p)=>{const r=e.getBoundingClientRect(),t=r.width/window.srpgDebug.snapshot().map.w;return {x:r.left+(p.x+.5)*t,y:r.top+(p.y+.5)*t};},p);
 const tap=async p=>{const a=await point(p);await page.touchscreen.tap(a.x,a.y);};
 const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map((p,i)=>({...p,id:i+1,radiusX:2,radiusY:2,force:1}))});
 async function slide(from,to,{end=true,steps=8}={}){const a=await point(from),z=await point(to);await touch('touchStart',[a]);for(let i=1;i<=steps;i++)await touch('touchMove',[{x:a.x+(z.x-a.x)*i/steps,y:a.y+(z.y-a.y)*i/steps}]);if(end)await touch('touchEnd',[]);}
 async function endTurn(){const turn=(await state()).turn;await page.locator('#endTurn').click();if(await page.locator('#endConfirm button').count())await page.locator('#endConfirm button').click();await page.waitForFunction(t=>!window.srpgDebug.busy()&&(window.srpgDebug.snapshot().turn===t||window.srpgDebug.snapshot().status!=='playing'),turn+1);}
 return {context,page,cdp,errors,state,draft,reset,settled,select,camera,point,tap,touch,slide,endTurn};
}
