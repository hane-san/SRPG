// One finite tactical resource per unit. No RNG or hidden difficulty scaling.
export const RELEASE = '0.5.2';
export const RULES = {
  heal: 7, emergencyCap: 0.5,
  barrageDamage: 6,
  supportRange: [2, 3], cannonPeriod: 3, reinforcementPeriod: 4,
};
export const CLASSES = {
  shooter: {label:'シューター',glyph:'砲',hp:10,atk:9,def:1,move:3,range:[2,3],skill:'support',charges:2},
  shield: {label:'盾槍隊',glyph:'盾',hp:26,atk:9,def:6,move:4,range:[1,1],skill:'support',charges:3},
  sword: {label:'剣士隊',glyph:'剣',hp:22,atk:11,def:4,move:5,range:[1,1],skill:'support',charges:2},
  bow: {label:'長弓隊',glyph:'弓',hp:20,atk:10,def:3,move:4,range:[2,2],skill:'support',charges:3},
  mage: {label:'魔道隊',glyph:'術',hp:18,atk:12,def:2,move:4,range:[1,2],skill:'support',charges:2},
  healer: {label:'祈祷隊',glyph:'祈',hp:19,atk:6,def:3,move:4,range:[1,1],skill:'heal',charges:3},
  medic: {label:'救護隊',glyph:'癒',hp:19,atk:6,def:3,move:4,range:[1,1],skill:'heal',charges:3},
  horse: {label:'騎兵隊',glyph:'騎',hp:24,atk:10,def:4,move:7,range:[1,1],skill:'support',charges:2},
};
export const SKILLS = {
  volley:{label:'待機一斉射撃',text:'動かず待機したP3に距離1〜5の敵全員へ1発ずつ。反撃なし。何体でも発動1回で1消費、対象なしは消費0。通常攻撃は2〜3マス。'},
  support:{label:'待機攻撃',text:'動かず待機すると構え、P2は反撃なし。P3に敵へ一度攻撃し、効果時に1回消費。弓は射程2〜3、他は通常射程。'},
  heal:{label:'待機回復',text:'動かず待機すると構え、P2は反撃なし。P3に上下左右で隣接する味方全員を各7回復。自分・敵・斜めは対象外。発動1回で1消費、対象なしは消費0。枯渇後も全員へ応急回復。'},
};
export const TERRAINS = {
  '.':{name:'草原',cost:1,def:0}, '=':{name:'街道',cost:1,def:0},
  'f':{name:'森',cost:2,def:1}, '~':{name:'水域',cost:Infinity,def:0},
  '#':{name:'岩壁',cost:Infinity,def:0}, '+':{name:'橋',cost:1,def:0},
  'c':{name:'砦',cost:1,def:1}, 'v':{name:'村',cost:1,def:0},
};

