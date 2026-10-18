import {readFile,writeFile} from 'node:fs/promises';
import {DISPLAY_NAME} from '../display-name.js';

const args=process.argv.slice(2);
if(args.length>1||(args.length===1&&args[0]!=='--check'))throw Error('usage: node scripts/sync-display-name.mjs [--check]');
const check=args[0]==='--check',root=new URL('../',import.meta.url);
const htmlPath=new URL('index.html',root),manifestPath=new URL('manifest.webmanifest',root);
const [html,manifestText]=await Promise.all([readFile(htmlPath,'utf8'),readFile(manifestPath,'utf8')]);
if(!Object.values(DISPLAY_NAME).every(value=>typeof value==='string'&&value.trim()))throw Error('Display names must be non-empty strings');
const titles=[...html.matchAll(/<title>[^<]*<\/title>/g)];
if(titles.length!==1)throw Error('Expected exactly one static HTML title');
const escaped=DISPLAY_NAME.title.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const nextHtml=html.replace(/<title>[^<]*<\/title>/,()=>`<title>${escaped}</title>`);
const manifest=JSON.parse(manifestText);
manifest.name=DISPLAY_NAME.manifestName;manifest.short_name=DISPLAY_NAME.shortName;
const nextManifest=JSON.stringify(manifest,null,2)+'\n';
if(check){
 if(html!==nextHtml||manifestText!==nextManifest)throw Error('Display metadata is stale; run npm run sync:display-name and commit index.html / manifest.webmanifest');
 console.log('Display metadata matches display-name.js');
}else{
 if(html!==nextHtml)await writeFile(htmlPath,nextHtml);
 if(manifestText!==nextManifest)await writeFile(manifestPath,nextManifest);
 console.log('Synced HTML title and manifest names; paths, IDs and icons are unchanged');
}
