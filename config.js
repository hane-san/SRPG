// HP6 fixed-damage tactical prototype. One common finite supply for P3 stances.
export const RELEASE = '0.8.0';
export const RULES = {
  maxHp: 6, heal: 2, emergencyCap: 0.5,
  barrageDamage: 2, ammo: 2, supplyRadius: 1, maxDeployed: 5, deploymentsPerTurn: 1,
  supportRange: [2, 2], cannonPeriod: 3, reinforcementPeriod: 4,
};
export const CLASSES = {
  shooter: {label:'シューター',glyph:'砲',hp:6,atk:2,def:0,move:3,range:[2,3],skill:'support',charges:2},
  shield: {label:'盾槍隊',glyph:'盾',hp:6,atk:2,def:1,move:4,range:[1,1],skill:'support',charges:2},
  sword: {label:'剣士隊',glyph:'剣',hp:6,atk:2,def:0,move:5,range:[1,1],skill:'support',charges:2},
  bow: {label:'長弓隊',glyph:'弓',hp:6,atk:2,def:0,move:4,range:[2,2],skill:'support',charges:2},
  mage: {label:'魔道隊',glyph:'術',hp:6,atk:2,def:0,move:4,range:[1,2],skill:'support',charges:2},
  healer: {label:'祈祷隊',glyph:'祈',hp:6,atk:2,def:0,move:4,range:[1,1],skill:'heal',charges:2},
  medic: {label:'救護隊',glyph:'癒',hp:6,atk:2,def:0,move:4,range:[1,1],skill:'heal',charges:2},
  horse: {label:'騎兵隊',glyph:'騎',hp:6,atk:2,def:0,move:7,range:[1,1],skill:'support',charges:2},
};
export const SKILLS = {
  support:{label:'待機攻撃',text:'その場で待機してP2の反撃を放棄し、P3に通常射程内の敵1隊へ攻撃。命中した時だけ弾薬1を消費。本陣付近で毎ターン1補給。'},
  heal:{label:'待機回復',text:'その場で待機してP2の反撃を放棄し、P3に隣接する負傷味方1隊へHP2回復。効果時だけ弾薬1消費。'},
};
export const PROMOTIONS = {
  guard:{label:'護衛',text:'待機中、受けるダメージを1軽減（最低1）'},
  advance:{label:'機動',text:'上級職の移動力が1増加'},
  counter:{label:'迎撃',text:'反撃するときのみ攻撃力+1（上限4）'},
};
export const TERRAINS = {
  '.':{name:'草原',cost:1,def:0}, '=':{name:'街道',cost:1,def:0},
  'f':{name:'森',cost:2,def:0}, '~':{name:'水域',cost:Infinity,def:0},
  '#':{name:'岩壁',cost:Infinity,def:0}, '+':{name:'橋',cost:1,def:0},
  'c':{name:'砦',cost:1,def:0}, 'v':{name:'村',cost:1,def:0},
};
