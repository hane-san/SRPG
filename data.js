import {CLASSES,RULES,PROMOTIONS} from './config.js?v=0.8.0-p3-26-sortie29-classes68';
const row = (w,h) => Array.from({length:h},()=>Array(w).fill('.'));
function path(g,x,y0,y1,t='='){for(let y=y0;y<=y1;y++)g[y][x]=t;}
function patch(g,x,y,w,h,t){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)g[j][i]=t;}
// The first stronger captains teach attack 3; optional maps introduce elite 4.
export const enemy=(id,type,x,y,ai='advance')=>({id,name:{shield:'鉄衛',sword:'斥候',bow:'敵弓隊',mage:'灰術師',horse:'襲撃騎兵',spear:'槍兵',bandit:'賊'}[type],type,x,y,ai,...(id==='boss'?{name:'守将',rank:'advanced'}:{})});
// Owner rule (PR #62/#64, extended 2026-10-23): when the captain does not stand on the
// north castle, one ordinary bow unit holds it, so skipping the captain still costs a fight.
export function castleGarrison(enemies,goal){
 return enemies.some(e=>e.x===goal.x&&e.y===goal.y)?[]:[enemy('castle-guard','bow',goal.x,goal.y,'hold')];
}
function makeMap(id){
 const w=[12,16,14][id],h=[20,30,26][id],g=row(w,h),cx=Math.floor(w/2);
 path(g,cx,1,h-2);
 for(let y=2;y<h-2;y+=5){patch(g,1,y,2,2,'f');patch(g,w-4,y+1,2,2,'f');}
 let enemies=[],base=null,south=null,spawns=[],cannon=null;
 if(id===0){
   patch(g,0,10,w,2,'~');patch(g,5,10,2,2,'+');patch(g,9,10,1,2,'+');path(g,9,4,17);g[10][9]=g[11][9]='+';
   g[6][6]='c';g[15][3]='v';
   // Issue #38 first playable slice: widen the western approach without closing
   // any old passable cell, so in-progress v0.8 positions remain legal.
   patch(g,2,10,2,2,'+');path(g,3,4,17);g[10][3]=g[11][3]='+';
   for(let x=3;x<=6;x++)g[4][x]='=';
   enemies=[enemy('e1','sword',4,12,'hold'),enemy('e2','bow',7,8,'hold'),enemy('e3','shield',3,6,'hold'),enemy('e4','sword',6,5,'hold'),enemy('e5','mage',9,3,'hold'),enemy('boss','shield',6,1,'hold')];
 } else if(id===1){
   base={x:7,y:16};south={x:7,y:28};
   patch(g,9,3,2,24,'#');for(const y of [7,16,24])patch(g,9,y,2,2,'=');
   path(g,13,1,28);path(g,7,1,28);for(let x=7;x<=13;x++)g[2][x]='=';
   enemies=[enemy('e1','sword',5,12,'skirmish'),enemy('e2','horse',2,6,'defend'),enemy('e3','bow',7,7,'defend'),enemy('e4','shield',4,3,'defend'),enemy('e5','sword',7,25,'defend'),enemy('e6','bow',6,27,'defend'),enemy('boss','shield',7,2,'hold'),enemy('southguard','shield',7,28,'hold'),enemy('e7','bow',13,4,'hold')];
   // 2026-10-23 owner decision: a bow holds the top of the east road, so the flank still
   // reaches the castle but costs time and risk instead of being the free fastest route.
   spawns=[{x:7,y:27}];
 } else {
   patch(g,0,13,w,2,'~');patch(g,4,13,2,2,'+');patch(g,10,13,2,2,'+');path(g,10,2,23);g[13][10]=g[14][10]='+';
   cannon={x:7,y:2};spawns=[{x:3,y:21}];g[18][6]='c';
   // 2026-10-23 owner rule: the captain steps down to the gate and the castle keeps one garrison.
   // e5 leaves the central road for the north-west flank so a single-file advance no longer jams on it;
   // e3 waits further north on the east road, so the east bridge is an open but unsupported rush lane.
   enemies=[enemy('e1','sword',7,18,'hold'),enemy('e2','bow',5,11,'defend'),enemy('e3','sword',10,8,'defend'),enemy('e4','mage',7,7,'defend'),enemy('e5','shield',5,3,'defend'),enemy('boss','shield',7,2,'hold')];
 }
 if(id<2)enemies=enemies.map(e=>e.id==='boss'?{...e,rank:'lower'}:e);
 const goal={x:id===1?8:cx,y:1};g[goal.y][goal.x]='c';if(base)g[base.y][base.x]='c';if(south)g[south.y][south.x]='c';
 // Owner rule (2026-10-23): a castle the captain does not stand on still keeps one ordinary garrison.
 enemies.push(...castleGarrison(enemies,goal));
 return {id,w,h,maxWaves:id===2?2:id===1?3:null,tiles:g.map(r=>r.join('')),goal,base,camp:base||{x:positions(id)[0][0],y:positions(id)[0][1]},south,spawns,cannon,enemies,
  title:['01 霧河の渡し','02 二つの戦線','03 灰城の砲火'][id],
  subtitle:['正面突破 / 12 × 20','南北挟撃・東側機動 / 16 × 30','予告増援・城砲撃 / 14 × 26'][id],
  briefing:[
   '北の城を制圧。西の広い渡しは見通しのよい迂回路。中央の橋は近道ですが、向こう岸の弓の射程を確かめましょう。盾で受け、剣と弓を続けて動かすと守備を崩せます。魔術師の回復は動かず待機したP3だけ。',
   '中央の青砦を守り、北城を制圧。守将は城門前に控え、城の上には弓兵1隊が残る。北西の守備隊は街道を押さえ、東の道の奥にも弓兵が構える。正面から守備を崩すか、東の道から城へ回り込むか。本陣を空にすると南城からT4・8・12に来る増援に奪われるため、後衛を残す判断が重要。南城制圧で増援は停止する。',
   '北城を制圧。守将は城門前に控え、城の上には弓兵1隊が残ります。中継砦の剣は定位置、北西の盾は城への街道脇、東の剣は東街道の奥で待ち構えます。中央を押し上げるか、東の橋から一気に城へ回り込むか（東は守りが薄い分、本隊や回復役から離れます）。砲撃はT2に予告、T3のP4に着弾し以後3ターンごと。予告マスから退避して進軍しましょう。増援はT4・T8のP4に各1隊、前ターンに位置確報。出現直後には攻撃しません。北城を取れば砲撃も止まります。'
  ][id]};
}
// Optional battlefields; only the original three chapters belong to the campaign.
function extraMap(id){
 const w=[12,16,14][id-3],h=[40,36,44][id-3],g=row(w,h),cx=Math.floor(w/2);
 path(g,cx,1,h-2);path(g,2,2,h-3);path(g,w-3,2,h-3);
 for(let y=5;y<h-4;y+=6){for(let x=2;x<=w-3;x++)g[y][x]='=';patch(g,3,y-2,2,2,'f');patch(g,w-5,y+1,2,2,'f');}
 const goal={x:cx,y:1},base=null;let south=null,spawns=[],cannon=null;
 if(id===3){
  for(const y of [12,25]){patch(g,0,y,w,2,'~');for(const x of [2,cx,w-3])patch(g,x,y,1,2,'+');}
  // Issue #66: widen the crossings without closing any old passable cell.
  // Central banks also need room: a wide bridge alone still funnels into forest.
  for(const y of [12,25]){patch(g,1,y,2,2,'+');patch(g,5,y,3,2,'+');patch(g,9,y,2,2,'+');}
  for(const y of [11,14,24,27])for(const x of [5,7])g[y][x]='=';
  for(const y of [8,20,31]){g[y][cx]='c';g[y][1]='v';}
 }else if(id===4){
  patch(g,7,5,2,25,'#');for(const y of [9,18,27])patch(g,7,y,2,2,'=');
  // Issue #61: the middle and north gaps become forest gates (still passable,
  // cost 2). Clear weather crosses them; rain stalls movement inside them.
  for(const y of [9,18])patch(g,7,y,2,2,'f');
  path(g,5,2,h-3);path(g,11,2,h-3);patch(g,3,h-7,10,6,'.');g[18][5]='c';g[27][11]='v';g[7][12]='c';
 }else{
  for(const y of [14,29]){patch(g,0,y,w,2,'~');for(const x of [2,cx,w-3])patch(g,x,y,1,2,'+');}
  for(const y of [8,22,36]){g[y][cx]='c';g[y][1]='v';}
  cannon={x:cx,y:2};spawns=[{x:2,y:20},{x:w-3,y:9}];
  // Issue #63: three-wide central fords and wider flank fords so one enemy can
  // no longer plug a river (water only opens). The south castle (2,21) is the
  // reinforcement post: its flags sit beside it and taking it stops later waves.
  for(const y of [14,29]){patch(g,1,y,3,2,'+');patch(g,cx-1,y,3,2,'+');patch(g,w-3,y,2,2,'+');}
  south={x:2,y:21};g[south.y][south.x]='c';spawns=[{x:2,y:22},{x:3,y:22}];
 }
 g[goal.y][goal.x]='c';
 // Each front has a purpose: screen, ranged cover, flank, then a guarded approach.
 const formations={
  3:[['shield',6,29,'advance'],['bow',6,27,'defend'],['sword',2,28,'defend'],['horse',9,27,'advance'],['shield',6,19,'defend'],['mage',5,18,'defend'],['bow',2,19,'defend'],['horse',9,18,'defend'],['sword',6,7,'advance'],['mage',9,6,'defend'],['bow',2,6,'defend'],['shield',6,4,'defend']],
  4:[['sword',5,26,'advance'],['bow',5,24,'defend'],['shield',10,26,'defend'],['horse',12,24,'defend'],['shield',5,17,'defend'],['mage',4,16,'defend'],['bow',11,17,'defend'],['sword',12,15,'defend'],['shield',5,7,'defend'],['bow',4,5,'defend'],['mage',11,6,'defend'],['horse',12,4,'defend']],
  5:[['shield',7,32,'defend'],['mage',6,31,'defend'],['sword',2,33,'advance'],['bow',11,32,'defend'],['shield',7,24,'defend'],['bow',6,23,'defend'],['horse',2,23,'defend'],['mage',11,22,'defend'],['sword',7,10,'advance'],['shield',2,9,'defend'],['mage',11,8,'defend'],['horse',7,6,'defend']]
 };
 const enemies=formations[id].map(([type,x,y,ai],i)=>{g[y][x]='=';return enemy(`extra-${id}-${Math.floor(i/4)}-${i%4}`,type,x,y,ai);});
 // Keep terrain stamped at its original formation cells; move only enemy specs.
 if(id===4){enemies[1].y=21;enemies[2].y=22;enemies[3].y=22;}
 // Issue #61: the north shield/bow guard the north forest gate, so the second
 // clear spell ends in contact; the east mage/horse close on the castle front.
 if(id===4){Object.assign(enemies[8],{y:10});Object.assign(enemies[9],{y:8});Object.assign(enemies[10],{x:10,y:3});Object.assign(enemies[11],{x:11,y:2});}
 // Issue #38 second slice: defend the far bank instead of rushing the castle
 // on T1. Mutate specs after stamping their original cells to preserve all tiles.
 if(id===3){Object.assign(enemies[0],{y:24,ai:'defend'});Object.assign(enemies[3],{y:22,ai:'defend'});}
 // These three guards hold their posts; the wider crossings must not turn into
 // a faster enemy pile-up. Other ten units keep the #58 formation and behaviour.
 if(id===3)for(const i of [0,1,3])enemies[i].ai='hold';
 // One tile behind the former post leaves room to stage at the east exit,
 // retaining a winning cautious advance as well as the faster flank.
 if(id===3)enemies[3].y=21;
 // Issue #63: three stages — the south-river front (shield, sword, bow), the
 // centre around the south castle, then the north river and the castle garrison.
 if(id===5)[[7,27,'defend'],[6,17,'hold'],[2,26,'defend'],[7,25,'hold'],[3,21,'hold'],[7,21,'hold'],[11,20,'defend'],[8,18,'defend'],[3,10,'defend'],[7,12,'defend'],[10,11,'hold'],[7,6,'defend']].forEach(([x,y,ai],i)=>Object.assign(enemies[i],{x,y,ai}));
 // Maps 05 and 06 put the captain at the gate in front of the castle (Issues #61, #63), like map 02.
 enemies.push(enemy('boss','shield',cx,[4,5].includes(id)?2:1,'hold'));
 if(id===5){enemies.push(enemy('tower-west','bow',3,3,'hold'),enemy('tower-east','mage',w-4,3,'hold'));}
 // Owner rule (PR #62/#64, 2026-10-23): where the captain is not on the castle, one ordinary
 // garrison unit holds the castle tile, so skipping the captain still costs one fight.
 enemies.push(...castleGarrison(enemies,goal));
 // More troops without introducing a new class, resource or campaign roster.
 const extraAllies=[{id:'aux-bow',name:'遊撃弓隊',type:'bow'},{id:'aux-shield',name:'後衛槍隊',type:'shield'},...(id===5?[{id:'aux-horse',name:'増派騎兵',type:'horse'},{id:'aux-medic',name:'衛生隊',type:'mage'}]:[])];
 const title=['04 長河の三橋','05 森壁の回廊','06 暁の城塞線'][id-3];
 const briefing=[
  '縦40マスの河川戦。二本の川を各三つの渡しで越え、北城へ。中央は3マス幅で岸も広く、部隊を並べて攻められます。西と東は2マス幅。最初の中央の盾・南岸の弓・東の騎兵は定位置を守るため、正面から崩すか、別の渡しへ迂回するかを選びましょう。北の守備隊は近づくと動きます。途中の砦で前衛を交代する道もあります。味方11隊・敵13隊。砲撃・増援なし。',
  '森と岩壁に隔てられた縦36マスの回廊。岩壁の切れ目のうち中央と北は森の門（移動コスト2）。晴れなら隣の回廊へ回り込めるが、雨で移動力が落ちると門で足が止まり、大雨では軽装兵以外の歩兵（重装・槍・弓・砲兵・魔術師）は森に入れない。晴・晴・小雨・大雨・小雨の周期。P4で翌ターンへ切替。小雨は歩兵−2/騎兵−3、大雨は−3/−4（最低1、敵味方共通）。晴れのうちに次の守備線まで進み、大雨は止まって砲兵・魔術師のP3で支え、晴れたら押し返す。北の守備隊は森の門の前、守将は城門前に控え、城の上には弓兵1隊が残る。味方11隊・敵14隊。砲撃・増援なし。',
  '縦44マスの三段の長期戦。①南の河：北岸の盾・剣・弓が渡しを守る（中央の渡しは3マス幅）。②中央：西の南城の旗にT4・T8各2隊の増援が前ターン予告で現れ、到着直後は攻撃しない。南城を先に制圧すれば以後の増援は止まるが、北城への道からは外れる。③北の河と北城：守備隊と二つの塔、守将は城門前、城の上には弓兵1隊。砲撃はT2予告・T3着弾、以後3ターンごとに最も後方の味方を狙う。味方13隊・敵16隊。'
 ][id-3];
 return {id,w,h,tiles:g.map(r=>r.join('')),goal,base,camp:{x:positions(id)[0][0],y:positions(id)[0][1]},south,spawns,cannon,maxWaves:id===5?2:null,enemies,extraAllies,title,weatherCycle:id===4?['clear','clear','light','heavy','light']:null,subtitle:`追加戦場 / ${w} × ${h} / 味方${9+extraAllies.length}・敵${enemies.length}${id===4?' / 周期的な雨':''}`,briefing};
}
export const MAPS=[... [0,1,2].map(makeMap),... [3,4,5].map(extraMap)];
export const ROSTER=[
 {id:'a1',name:'リオ',type:'shield'}, {id:'a2',name:'セナ',type:'sword'},
 {id:'a3',name:'エル',type:'bow'}, {id:'a4',name:'ノア',type:'mage'},
 {id:'a5',name:'ミナ',type:'mage'}, {id:'a6',name:'ルカ',type:'horse'},
 {id:'a7',name:'フィン',type:'horse'}, {id:'a8',name:'テオ',type:'spear'}, {id:'a9',name:'ニコ',type:'shooter'},
];
// Rank changes are common to named and replacement soldiers; only named can carry a branch.
export function unit(spec,team,options={}){
 const rank=spec.rank||'lower',named=spec.named??(team==='ally'&&ROSTER.some(r=>r.id===spec.id)),c=CLASSES[spec.type];
 const promoted=rank==='advanced',specialty=named&&promoted&&PROMOTIONS[spec.specialty]?spec.specialty:null;
 const baseAtk=c.atk+(promoted&&!['bow','shooter'].includes(spec.type)?1:0);
 const hp=RULES.maxHp,def=c.def+(promoted&&spec.type==='shield'?1:0);
 return {...c,...spec,rank,named,specialty,team,maxHp:hp,hp,
  atk:Math.min(5,Math.max(1,(spec.atk??baseAtk)+(team==='enemy'?(options.enemyAttack||0):0))),
  def:spec.def??def,move:(spec.move??c.move)+(specialty==='advance'?1:0),
  charges:options.charges??c.charges,maxCharges:options.charges??c.charges,
  alive:true,deployed:spec.deployed??true,acted:false,command:null,spend:true,focus:null,guard:0};
}
export function positions(id){
 const deployments={
  1:[[7,16],[8,16],[6,17],[8,17],[7,17],[13,17],[13,18],[8,18],[6,18]],
  3:[[6,34],[5,34],[5,35],[7,35],[6,35],[2,33],[9,33],[7,36],[4,35],[9,35],[2,35]],
  4:[[5,29],[11,29],[5,30],[11,30],[5,31],[12,28],[4,28],[11,31],[4,30],[12,30],[12,29]],
  5:[[7,37],[6,37],[6,38],[8,38],[7,38],[2,36],[11,36],[7,39],[5,38],[11,38],[2,38],[8,37],[8,39]]
 };
 if(deployments[id])return deployments[id].map(p=>[...p]);
 const x=[5,7,6][id],y=[16,17,22][id];return [[x,y],[x+1,y],[x-1,y+1],[x+2,y+1],[x,y+2],[x+2,y-1],[x+3,y],[x+1,y+2],[x-1,y+2]];
}
