import {CLASSES} from './config.js?v=0.4.0';
const row = (w,h) => Array.from({length:h},()=>Array(w).fill('.'));
function path(g,x,y0,y1,t='='){for(let y=y0;y<=y1;y++)g[y][x]=t;}
function patch(g,x,y,w,h,t){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)g[j][i]=t;}
const enemy=(id,type,x,y,ai='advance')=>({id,name:{shield:'鉄衛',sword:'斥候',bow:'敵弓隊',mage:'灰術師',horse:'襲撃騎兵'}[type],type,x,y,ai});
function makeMap(id){
 const w=[12,16,14][id],h=[20,30,26][id],g=row(w,h),cx=Math.floor(w/2);
 path(g,cx,1,h-2);
 for(let y=2;y<h-2;y+=5){patch(g,1,y,2,2,'f');patch(g,w-4,y+1,2,2,'f');}
 let enemies=[],base=null,south=null,spawns=[],cannon=null;
 if(id===0){
   patch(g,0,10,w,2,'~');patch(g,5,10,2,2,'+');patch(g,9,10,1,2,'+');path(g,9,4,17);g[10][9]=g[11][9]='+';
   g[6][6]='c';g[15][3]='v';
   enemies=[enemy('e1','sword',6,12),enemy('e2','bow',5,8,'defend'),enemy('e3','shield',6,7,'defend'),enemy('e4','sword',9,7),enemy('e5','mage',7,4,'defend'),enemy('boss','shield',6,1,'hold')];
 } else if(id===1){
   base={x:7,y:16};south={x:7,y:28};
   patch(g,9,3,2,24,'#');for(const y of [7,16,24])patch(g,9,y,2,2,'=');
   path(g,13,1,28);path(g,7,1,28);for(let x=7;x<=13;x++)g[2][x]='=';
   enemies=[enemy('e1','sword',5,12,'skirmish'),enemy('e2','horse',4,9,'skirmish'),enemy('e3','bow',7,7,'defend'),enemy('e4','shield',7,4,'defend'),enemy('e5','sword',7,24,'raid'),enemy('e6','bow',6,26,'raid'),enemy('boss','shield',8,1,'hold'),enemy('southguard','shield',7,28,'hold')];
   spawns=[{x:7,y:27}];
 } else {
   patch(g,0,13,w,2,'~');patch(g,4,13,2,2,'+');patch(g,10,13,2,2,'+');path(g,10,2,23);g[13][10]=g[14][10]='+';
   cannon={x:7,y:2};spawns=[{x:3,y:24},{x:11,y:21}];g[18][6]='c';
   enemies=[enemy('e1','sword',7,18),enemy('e2','bow',5,11,'defend'),enemy('e3','sword',10,10),enemy('e4','mage',7,7,'defend'),enemy('e5','shield',7,5,'defend'),enemy('boss','shield',7,1,'hold')];
 }
 const goal={x:id===1?8:cx,y:1};g[goal.y][goal.x]='c';if(base)g[base.y][base.x]='c';if(south)g[south.y][south.x]='c';
 return {id,w,h,maxWaves:id===2?2:null,tiles:g.map(r=>r.join('')),goal,base,south,spawns,cannon,enemies,
  title:['01 霧河の渡し','02 二つの戦線','03 灰城の砲火'][id],
  subtitle:['正面突破 / 12 × 20','南北挟撃・東側機動 / 16 × 30','予告増援・城砲撃 / 14 × 26'][id],
  briefing:[
   '北の城を制圧。中央の橋で盾と弓を連携させるか、東の細橋へ騎兵を送るか。自動回復は移動したターンには使えません。',
   '中央の青砦を守り、北城を制圧。南城からT4・8・12…に増援。南城を制圧すれば停止。西で遊撃隊を引きつけ、東道から北を狙う手もあります。',
   '北城を制圧。砲撃はT2に予告、T3のP4に着弾し以後3ターンごと。増援はT4・T8のP4に各2隊、前ターンに位置確報。出現直後には攻撃しません。北城を取れば砲撃も止まります。'
  ][id]};
}
export const MAPS=[0,1,2].map(makeMap);
export const ROSTER=[
 {id:'a1',name:'リオ',type:'shield'}, {id:'a2',name:'セナ',type:'sword'},
 {id:'a3',name:'エル',type:'bow'}, {id:'a4',name:'ノア',type:'mage'},
 {id:'a5',name:'ミナ',type:'healer'}, {id:'a6',name:'ルカ',type:'horse'},
 {id:'a7',name:'フィン',type:'horse'}, {id:'a8',name:'テオ',type:'medic'},
];
export function unit(spec,team,options={}){
 const c=CLASSES[spec.type];return {...c,...spec,team,maxHp:c.hp,hp:c.hp,
  atk:c.atk+(team==='enemy'?(options.enemyAttack||0):0),charges:options.charges??c.charges,
  alive:true,acted:false,command:null,spend:true,focus:null,guard:0};
}
export function positions(id){const x=[5,7,6][id],y=[16,17,22][id];return [[x,y],[x+1,y],[x-1,y+1],[x+(id===1?1:2),y+1],[x,y+2],[x+2,y-1],[x+3,y],[x+1,y+2]];}
