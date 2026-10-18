import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DISPLAY_NAME} from '../display-name.js';

const args=process.argv.slice(2);
if(args.length>1||(args.length===1&&args[0]!=='--check'))throw Error('usage: node scripts/sync-display-name.mjs [--check]');
const check=args[0]==='--check',root=new URL('../',import.meta.url);
const htmlPath=new URL('index.html',root),manifestPath=new URL('manifest.webmanifest',root);
const appPath=new URL('app.js',root);
const [html,manifestText,app]=await Promise.all([readFile(htmlPath,'utf8'),readFile(manifestPath,'utf8'),readFile(appPath,'utf8')]);
if(!Object.values(DISPLAY_NAME).every(value=>typeof value==='string'&&value.trim()))throw Error('Display names must be non-empty strings');
const titles=[...html.matchAll(/<title>[^<]*<\/title>/g)];
if(titles.length!==1)throw Error('Expected exactly one static HTML title');
const escaped=DISPLAY_NAME.title.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const revision='display-'+createHash('sha256').update(JSON.stringify(DISPLAY_NAME)).digest('hex').slice(0,12);
function revise(source,pattern){
 if([...source.matchAll(pattern)].length!==1)throw Error('Expected exactly one display/entry module URL');
 return source.replace(pattern,url=>url.replace(/-display-[a-f0-9]{12}$/,'')+'-'+revision);
}
const nextHtml=revise(html.replace(/<title>[^<]*<\/title>/,()=>`<title>${escaped}</title>`),/\.\/app\.js\?v=[^'"\s<>]+/g);
const nextApp=revise(app,/\.\/display-name\.js\?v=[^'"\s<>]+/g);
const manifest=JSON.parse(manifestText);
manifest.name=DISPLAY_NAME.manifestName;manifest.short_name=DISPLAY_NAME.shortName;
const nextManifest=JSON.stringify(manifest,null,2)+'\n';
if(check){
 if(html!==nextHtml||manifestText!==nextManifest||app!==nextApp)throw Error('Display metadata is stale; run npm run sync:display-name and commit app.js / index.html / manifest.webmanifest');
 console.log('Display metadata matches display-name.js');
}else{
 if(html!==nextHtml)await writeFile(htmlPath,nextHtml);
 if(manifestText!==nextManifest)await writeFile(manifestPath,nextManifest);
 if(app!==nextApp)await writeFile(appPath,nextApp);
 console.log('Synced display labels and module cache tags; start/scope, IDs, release and icons are unchanged');
}
