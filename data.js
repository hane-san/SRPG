import {CLASSES} from './config.js?v=0.5.2';
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
// Optional battlefields; the original three-chapter campaign stays unchanged.
function extraMap(id){
 const w=[12,16,14][id-3],h=[40,36,44][id-3],g=row(w,h),cx=Math.floor(w/2);
 path(g,cx,1,h-2);path(g,2,2,h-3);path(g,w-3,2,h-3);
 for(let y=5;y<h-4;y+=6){for(let x=2;x<=w-3;x++)g[y][x]='=';patch(g,3,y-2,2,2,'f');patch(g,w-5,y+1,2,2,'f');}
 const goal={x:cx,y:1},base=null,south=null;let spawns=[],cannon=null;
 if(id===3){
  for(const y of [12,25]){patch(g,0,y,w,2,'~');for(const x of [2,cx,w-3])patch(g,x,y,1,2,'+');}
  for(const y of [8,20,31]){g[y][cx]='c';g[y][1]='v';}
 }else if(id===4){
  patch(g,7,5,2,25,'#');for(const y of [9,18,27])patch(g,7,y,2,2,'=');
  path(g,5,2,h-3);path(g,11,2,h-3);patch(g,3,h-7,10,6,'.');g[18][5]='c';g[27][11]='v';g[7][12]='c';
 }else{
  for(const y of [14,29]){patch(g,0,y,w,2,'~');for(const x of [2,cx,w-3])patch(g,x,y,1,2,'+');}
  for(const y of [8,22,36]){g[y][cx]='c';g[y][1]='v';}
  cannon={x:cx,y:2};spawns=[{x:2,y:20},{x:w-3,y:9}];
 }
 g[goal.y][goal.x]='c';
 const types=['shield','bow','sword','mage','horse'];let enemies=[];
 for(const [rank,y]of [h-12,h-21,5].entries())for(let lane=0;lane<4;lane++){
  const x=[2,cx-2,cx+2,w-3][lane];g[y][x]='=';
  enemies.push(enemy(`extra-${id}-${rank}-${lane}`,types[(rank+lane)%types.length],x,y,rank===0?'defend':rank===1?'advance':'defend'));
 }
 enemies.push(enemy('boss','shield',cx,1,'hold'));
 if(id===5){enemies.push(enemy('tower-west','bow',3,3,'hold'),enemy('tower-east','mage',w-4,3,'hold'));}
 // More troops without introducing a new class, resource or campaign roster.
 const extraAllies=[{id:'aux-bow',name:'遊撃弓隊',type:'bow'},{id:'aux-shield',name:'後衛槍隊',type:'shield'},...(id===5?[{id:'aux-horse',name:'増派騎兵',type:'horse'},{id:'aux-medic',name:'衛生隊',type:'medic'}]:[])];
 const title=['04 長河の三橋','05 森壁の回廊','06 暁の城塞線'][id-3];
 const briefing=[
  '縦40マスの河川戦。二本の川を各三つの橋で越え、北城へ。途中の砦で前衛を交代するか、左右の街道で騎兵を先行させるか。味方11隊・敵13隊。砲撃・増援なし。',
  '森と岩壁に隔てられた縦36マスの回廊。三か所の横道で部隊を合流できる。晴・晴・小雨・大雨・小雨の周期。P4で翌ターンへ切替。小雨は歩兵−2/騎兵−3、大雨は−3/−4（最低1、敵味方共通）。守備隊を弓で崩すか、左右から包むか。味方11隊・敵13隊。砲撃・増援なし。',
  '縦44マスの長期戦。二つの渡河線と三つの砦を越えて北城へ。味方13隊・敵15隊。砲撃はT2予告・T3着弾、以後3ターンごと。T4・T8に各2隊の有限増援、前ターンに予告し到着直後は攻撃しない。'
 ][id-3];
 return {id,w,h,tiles:g.map(r=>r.join('')),goal,base,south,spawns,cannon,maxWaves:id===5?2:null,enemies,extraAllies,title,weatherCycle:id===4?['clear','clear','light','heavy','light']:null,subtitle:`追加戦場 / ${w} × ${h} / 味方${9+extraAllies.length}・敵${enemies.length}${id===4?' / 周期的な雨':''}`,briefing};
}
export const MAPS=[... [0,1,2].map(makeMap),... [3,4,5].map(extraMap)];
export const ROSTER=[
 {id:'a1',name:'リオ',type:'shield'}, {id:'a2',name:'セナ',type:'sword'},
 {id:'a3',name:'エル',type:'bow'}, {id:'a4',name:'ノア',type:'mage'},
 {id:'a5',name:'ミナ',type:'healer'}, {id:'a6',name:'ルカ',type:'horse'},
 {id:'a7',name:'フィン',type:'horse'}, {id:'a8',name:'テオ',type:'medic'}, {id:'a9',name:'ニコ',type:'shooter'},
];
export function unit(spec,team,options={}){
 const c=CLASSES[spec.type];return {...c,...spec,team,maxHp:c.hp,hp:c.hp,
  atk:c.atk+(team==='enemy'?(options.enemyAttack||0):0),charges:options.charges??c.charges,
  alive:true,acted:false,command:null,spend:true,focus:null,guard:0};
}
export function positions(id){if(id>=3){const m=MAPS[id],x=Math.floor(m.w/2)-2,y=m.h-6;return [[x,y],[x+1,y],[x-1,y+1],[x+2,y+1],[x,y+2],[x+2,y-1],[x+3,y],[x+1,y+2],[x-2,y],[x+3,y+2],[x-2,y+2],[x+1,y+3],[x+4,y+1]];}const x=[5,7,6][id],y=[16,17,22][id];return [[x,y],[x+1,y],[x-1,y+1],[x+(id===1?1:2),y+1],[x,y+2],[x+2,y-1],[x+3,y],[x+1,y+2],[x-1,y+2]];}

