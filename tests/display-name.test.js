import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DISPLAY_NAME} from '../display-name.js';

test('committed HTML and manifest use the canonical display labels',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const manifest=JSON.parse(await readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
 const title=html.match(/<title>([^<]*)<\/title>/)?.[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 assert.equal(title,DISPLAY_NAME.title);
 assert.equal(manifest.name,DISPLAY_NAME.manifestName);assert.equal(manifest.short_name,DISPLAY_NAME.shortName);
});

test('a future display change updates only labels; check mode never writes or changes PWA identity',async()=>{
 const root=new URL('../',import.meta.url),temp=await mkdtemp(join(tmpdir(),'srpg-display-'));
 try{
  await mkdir(join(temp,'scripts'));
  await writeFile(join(temp,'package.json'),'{"type":"module"}\n');
  for(const file of ['index.html','manifest.webmanifest','scripts/sync-display-name.mjs'])await copyFile(new URL(file,root),join(temp,file));
  const source=await readFile(new URL('display-name.js',root),'utf8');
  const nextSource=source.replace(/const display=Object.freeze\(\{[^\n]*\}\);/,"const display=Object.freeze({name:'英雄叙事詩 & <旅>',subtitle:'',manifestSuffix:''});");
  assert.notEqual(nextSource,source);await writeFile(join(temp,'display-name.js'),nextSource);
  const beforeHtml=await readFile(join(temp,'index.html'),'utf8'),beforeManifest=await readFile(join(temp,'manifest.webmanifest'),'utf8');
  const run=(...args)=>spawnSync(process.execPath,[join(temp,'scripts/sync-display-name.mjs'),...args],{encoding:'utf8'});
  assert.notEqual(run('--check').status,0);
  assert.equal(await readFile(join(temp,'index.html'),'utf8'),beforeHtml);
  assert.equal(await readFile(join(temp,'manifest.webmanifest'),'utf8'),beforeManifest);
  const sync=run();assert.equal(sync.status,0,sync.stderr);
  const nextHtml=await readFile(join(temp,'index.html'),'utf8'),nextManifest=JSON.parse(await readFile(join(temp,'manifest.webmanifest'),'utf8'));
  assert.equal(nextHtml,beforeHtml.replace(/<title>[^<]*<\/title>/,'<title>英雄叙事詩 &amp; &lt;旅&gt;</title>'));
  const expected=JSON.parse(beforeManifest);expected.name='英雄叙事詩 & <旅>';expected.short_name=expected.name;
  assert.deepEqual(nextManifest,expected);assert.equal(nextManifest.start_url,'./');assert.equal(nextManifest.scope,'./');assert(!Object.hasOwn(nextManifest,'id'));
  const check=run('--check');assert.equal(check.status,0,check.stderr);
 }finally{await rm(temp,{recursive:true,force:true});}
});
