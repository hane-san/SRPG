// Optional development dependency: npm install --no-save --package-lock=false sharp
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_MODULE||'sharp');
mkdirSync('assets',{recursive:true});
for(const [name,size] of [['icon-32',32],['apple-touch-icon',180],['icon-192',192],['icon-512',512]]){
 await sharp('assets/icon-source.png').resize(size,size).png({palette:true,colours:32,dither:0}).toFile(`assets/${name}.png`);
}
const inset=await sharp('assets/icon-source.png').resize(410,410).png().toBuffer();
await sharp({create:{width:512,height:512,channels:4,background:'#172b2b'}}).composite([{input:inset,gravity:'centre'}]).png({palette:true,colours:32,dither:0}).toFile('assets/icon-maskable-512.png');
console.log('Exported favicon, Apple touch icon and install icons from assets/icon-source.png');
