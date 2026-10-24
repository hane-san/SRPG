// HP6 fixed-damage tactical prototype. P3 ammunition belongs to artillery and mage-family healers.
export const RELEASE = '0.8.0';
export const RULES = {
  maxHp: 6, heal: 2, emergencyCap: 0.5, openingDeployments: 2,
  barrageDamage: 2, ammo: 2, supplyRadius: 1, maxDeployed: 5, deploymentsPerTurn: 1,
  supportRange: [2, 2], cannonPeriod: 3, reinforcementPeriod: 4,
};
// Eight simple *base* roles: seven playable professions, one enemy-only mob.
// Keep existing class IDs for v0.8.0 save compatibility; healer/medic migrate to mage.
export const CLASSES = {
  sword:   {label:'軽装兵',glyph:'軽',hp:6,atk:2,def:0,move:5,range:[1,1],skill:'none',charges:0},
  shield:  {label:'重装兵',glyph:'重',hp:6,atk:2,def:1,move:4,range:[1,1],skill:'none',charges:0},
  spear:   {label:'槍兵',glyph:'槍',hp:6,atk:2,def:0,move:4,range:[1,1],skill:'none',charges:0},
  bow:     {label:'弓兵',glyph:'弓',hp:6,atk:2,def:0,move:4,range:[2,2],skill:'none',charges:0},
  horse:   {label:'騎兵',glyph:'騎',hp:6,atk:2,def:0,move:7,range:[1,1],skill:'none',charges:0},
  mage:    {label:'魔術師',glyph:'術',hp:6,atk:2,def:0,move:4,range:[1,2],skill:'heal',charges:2},
  shooter: {label:'砲兵',glyph:'砲',hp:6,atk:2,def:0,move:3,range:[2,3],skill:'support',charges:2},
  bandit:  {label:'賊',glyph:'賊',hp:6,atk:1,def:0,move:5,range:[1,1],skill:'none',charges:0},
};
export const CLASS_ROLES = {
  sword:'機動的な正規歩兵。地形と位置で戦線を動かす。',
  shield:'被ダメージを1軽減し、戦線を守る。',
  spear:'対騎兵へのダメージ+1。騎兵の単騎突破を牽制する。',
  bow:'射程2、隣接は攻撃不可。P1射撃とP2反撃。',
  horse:'移動力7で遊撃・偵察・側面突破。',
  mage:'P3専用。静止待機で隣接した負傷味方1隊をHP2回復。',
  shooter:'P3専用。静止待機で射程2〜3の砲撃。',
  bandit:'敵専用。基本攻撃1の弱い兵。正規軽装兵とは別。',
};
export const SKILLS = {
  none:{label:'通常兵種',text:'P1で移動・攻撃・待機。P2は射程内なら反撃。P3行動はありません。'},
  support:{label:'砲撃準備',text:'砲兵専用。P1で動かず待機するとP3に射程内の敵1隊を砲撃。P1通常攻撃とP2反撃はできません。命中時だけ弾薬1消費。'},
  heal:{label:'治療準備',text:'魔術師系専用。P1で動かず待機するとP3に隣接する負傷味方1隊をHP2回復。P1通常攻撃とP2反撃はできません。効果時だけ弾薬1消費。'},
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
