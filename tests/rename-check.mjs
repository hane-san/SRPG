// A local project-path rehearsal. No GitHub rename, real deployment or iOS claims.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {createGame} from '../engine.js';
import {RELEASE} from '../config.js';
import {DISPLAY_NAME} from '../display-name.js';
import {launch} from './browser-helpers.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),prefixes=['/SRPG/','/SRPG-01-FEstyle/','/hane-no-SRPG01/'];
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.md':'text/plain'};
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname,prefix=prefixes.find(value=>path.startsWith(value));
  if(!prefix){res.writeHead(404).end();return;}
  const file=resolve(root,decodeURIComponent(path.slice(prefix.length))||'index.html');
  if(!file.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(404).end();return;}
  const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'}).end(body);
 }catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
 await mkdir('test-results',{recursive:true});browser=await launch();
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
 page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
 await page.goto(base+prefixes[0]+'?debug=1');await page.waitForFunction(()=>!!window.srpgDebug);
 const state=createGame(1,{mode:'casual',healing:'H1',enemyAttack:0});state.turn=3;
 const legacy={
  'field-command-save-v1':JSON.stringify({release:RELEASE,state,campaign:true}),
  'field-command-fast':'true','field-command-sound':'false','field-command-music':'true','field-command-music-volume':'0.17'
 };
 await page.evaluate(values=>{for(const [key,value]of Object.entries(values))localStorage.setItem(key,value);},legacy);
 let restored;
 for(const prefix of prefixes){
  await page.goto(base+prefix+'?debug=1');await page.waitForFunction(()=>!!window.srpgDebug);
  const actual=await page.evaluate(()=>srpgDebug.snapshot());assert.equal(actual.turn,3);assert.equal(actual.map.id,1);
  if(restored)assert.deepEqual(actual,restored);else restored=actual;
  assert.equal(await page.title(),DISPLAY_NAME.title);
  assert.equal(await page.evaluate(()=>srpgDebug.audio().enabled),false);
  const music=await page.evaluate(()=>srpgDebug.music());assert.equal(music.enabled,true);assert.equal(music.volume,.17);
  const manifestURL=await page.locator('link[rel="manifest"]').evaluate(e=>e.href);
  assert.equal(manifestURL,base+prefix+'manifest.webmanifest');
  const manifest=await(await page.request.get(manifestURL)).json();
  assert.equal(manifest.name,DISPLAY_NAME.manifestName);assert.equal(manifest.short_name,DISPLAY_NAME.shortName);assert(!Object.hasOwn(manifest,'id'));
  for(const path of [manifest.start_url,manifest.scope,...manifest.icons.map(icon=>icon.src)]){
   const url=new URL(path,manifestURL);assert(url.pathname.startsWith(prefix),url.href);
   assert((await page.request.get(url.href)).ok(),url.href);
  }
  for(const selector of ['link[rel="icon"]','link[rel="apple-touch-icon"]']){
   const url=await page.locator(selector).evaluate(e=>e.href);assert(new URL(url).pathname.startsWith(prefix));assert((await page.request.get(url)).ok());
  }
  await page.locator('#menuBtn').click();
  await page.getByText('このゲーム・検証記録',{exact:true}).click();
  assert((await page.locator('#modalBody').innerText()).includes(`${DISPLAY_NAME.about} v${RELEASE}`));
  await page.getByText('操作と表示速度',{exact:true}).click();
  assert((await page.locator('#speedControl').innerText()).includes('高速'));
  const versionRequest=page.waitForRequest(r=>new URL(r.url()).pathname===prefix+'version.json');
  await page.getByRole('button',{name:'最新版を確認',exact:true}).click();await versionRequest;
  await page.getByRole('heading',{name:'最新版です',exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(legacy)),legacy);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await page.screenshot({path:'test-results/rename-new-path.png'});
 console.log('Rename rehearsal: old/new project paths, relative assets/manifest/icons, update check and all five legacy storage entries passed');
}catch(error){if(browser){const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:'test-results/rename-failure.png'}).catch(()=>{});}throw error;
}finally{await browser?.close();server.close();await once(server,'close');}
