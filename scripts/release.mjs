import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
const v=process.argv[2];if(!/^\d+\.\d+\.\d+$/.test(v||''))throw Error('usage: node scripts/release.mjs 0.1.1');
for(const f of [...readdirSync('.').filter(f=>f.endsWith('.js')),'index.html']){let s=readFileSync(f,'utf8').replace(/\?v=\d+\.\d+\.\d+/g,`?v=${v}`);if(f==='config.js')s=s.replace(/RELEASE = '[^']+'/g,`RELEASE = '${v}'`);writeFileSync(f,s);}
const p=JSON.parse(readFileSync('package.json','utf8'));p.version=v;writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');writeFileSync('version.json',JSON.stringify({version:v})+'\n');console.log(`Release ${v}; run npm run check, then commit and push main.`);
