import {NEW_SCORES} from './music-extra.js?v=0.8.0-library42';
// Original map scores. No samples, downloads, quotes or melodies from other games.
// A score has a composed A/B melody, harmony, bass and countermelody, then a varied reprise.
const major=[0,2,4,5,7,9,11],minor=[0,2,3,5,7,8,10];
export const SCORES=[
 {name:'霧河',root:62,meter:3,lead:'flute',arp:'harp',ally:{title:'川霧を越えて',bpm:98,scale:major,chords:[0,3,4,0,5,3,4,0],melody:[[0,2,4,5,4,2,1,0],[2,4,6,7,6,4,3,2],[5,7,6,4,3,2,4,1],[2,3,4,6,5,2,1,0]]},hostile:{title:'霧中の足音',bpm:108,scale:minor,chords:[0,5,3,4,0,2,4,0],melody:[[4,4,3,1,0,2,3,4],[5,4,2,1,3,2,0,-1],[0,2,3,5,4,3,1,2],[4,3,2,1,0,-1,1,0]]}},
 {name:'二戦線',root:57,meter:4,lead:'strings',arp:'harp',ally:{title:'守り継ぐ旗',bpm:116,scale:minor,chords:[0,3,5,4,0,2,3,4],melody:[[0,0,4,3,2,3,4,7],[6,5,4,2,3,4,2,1],[3,5,7,6,5,3,2,4],[5,4,3,2,1,-1,1,0]]},hostile:{title:'挟撃の鼓動',bpm:124,scale:minor,chords:[0,4,0,5,3,2,4,4],melody:[[0,1,0,-1,2,1,3,2],[4,3,4,2,1,0,2,1],[5,5,4,2,3,2,0,-1],[4,2,1,-1,0,1,-1,0]]}},
 {name:'灰城',root:52,meter:4,lead:'horn',arp:'strings',ally:{title:'灰を裂く光',bpm:112,scale:minor,chords:[0,5,2,4,3,5,4,0],melody:[[0,4,7,6,4,3,2,4],[5,7,6,4,2,3,4,2],[3,4,5,7,6,5,3,4],[2,4,6,5,4,2,1,0]]},hostile:{title:'城壁の残響',bpm:120,scale:minor,chords:[0,1,4,0,5,3,4,0],melody:[[0,0,-1,0,3,2,1,-1],[4,3,1,0,2,1,-1,-3],[3,4,3,1,0,2,1,0],[4,2,3,1,0,-1,1,0]]}},
 {name:'三橋',root:55,meter:3,lead:'flute',arp:'harp',ally:{title:'三つの橋の旅路',bpm:108,scale:major,chords:[0,4,5,3,0,2,3,4],melody:[[4,5,7,6,4,2,3,4],[2,3,5,4,2,1,0,2],[5,6,7,9,7,5,4,3],[4,6,5,3,2,4,1,0]]},hostile:{title:'流れを塞ぐ槍',bpm:118,scale:minor,chords:[0,3,4,0,5,2,4,0],melody:[[2,2,4,3,1,0,1,2],[4,5,3,2,0,-1,0,1],[5,4,6,5,3,2,3,4],[3,2,4,2,1,-1,1,0]]}},
 {name:'雨森',root:62,meter:3,lead:'harp',arp:'flute',ally:{title:'木洩れ雨の回廊',bpm:88,scale:minor,chords:[0,3,5,2,0,5,3,4],melody:[[4,2,3,0,1,3,2,0],[5,3,4,2,0,2,1,-1],[3,5,6,4,2,3,1,2],[4,3,1,2,0,-1,1,0]]},hostile:{title:'雨幕の追跡',bpm:102,scale:minor,chords:[0,5,0,4,3,1,4,0],melody:[[0,2,1,3,2,4,3,1],[2,4,3,5,4,2,1,0],[3,2,5,4,6,3,2,1],[4,3,2,0,1,-1,1,0]]}},
 {name:'暁城',root:60,meter:4,lead:'horn',arp:'harp',ally:{title:'暁の城塞へ',bpm:122,scale:major,chords:[0,5,3,4,0,2,3,4],melody:[[0,4,3,5,7,6,4,2],[3,5,4,6,7,5,4,3],[5,7,9,7,6,4,5,3],[4,6,7,5,4,2,1,0]]},hostile:{title:'最後の防壁',bpm:130,scale:minor,chords:[0,4,5,3,0,1,4,0],melody:[[7,4,5,3,4,2,3,0],[5,3,4,2,3,1,2,-1],[3,6,5,7,4,5,2,3],[4,3,1,2,0,-1,1,0]]}}
];
// Seven independent sound-room-only theme pairs. They are not assigned to campaign maps.
// Same synth voices as the original scores; optional articulation, pulse and density vary by scene.
export const BONUS_SCORES=[
 {
  "name": "旅立ちの行軍",
  "mood": "序盤｜弾む足取りと、まだ明るい冒険心",
  "root": 60,
  "meter": 4,
  "lead": "flute",
  "arp": "harp",
  "ally": {
   "title": "朝風に旗を掲げて",
   "bpm": 114,
   "scale": [
    0,
    2,
    4,
    5,
    7,
    9,
    11
   ],
   "rhythm": [
    0.5,
    0.5,
    1,
    0.5,
    0.5,
    1,
    2,
    2
   ],
   "chords": [
    0,
    4,
    3,
    5,
    0,
    3,
    4,
    0
   ],
   "melody": [
    [
     0,
     2,
     4,
     4,
     5,
     6,
     5,
     4
    ],
    [
     2,
     3,
     4,
     6,
     5,
     4,
     2,
     1
    ],
    [
     4,
     5,
     7,
     6,
     4,
     3,
     5,
     4
    ],
    [
     5,
     4,
     2,
     3,
     4,
     2,
     1,
     0
    ]
   ],
   "arpPattern": [
    0,
    2,
    4,
    7,
    4,
    2,
    3,
    4
   ],
   "drumEvery": 2,
   "leadVel": 0.33,
   "arpVel": 0.095
  },
  "hostile": {
   "title": "丘の向こうの先遣隊",
   "bpm": 122,
   "scale": [
    0,
    2,
    3,
    5,
    7,
    8,
    10
   ],
   "rhythm": [
    0.75,
    0.25,
    1,
    1,
    1,
    0.5,
    1.5,
    2
   ],
   "chords": [
    0,
    5,
    3,
    4,
    2,
    5,
    4,
    0
   ],
   "melody": [
    [
     0,
     1,
     3,
     2,
     4,
     3,
     2,
     0
    ],
    [
     3,
     4,
     5,
     4,
     2,
     3,
     1,
     0
    ],
    [
     4,
     5,
     6,
     4,
     5,
     3,
     2,
     1
    ],
    [
     3,
     2,
     0,
     1,
     2,
     1,
     0,
     -1
    ]
   ],
   "arpPattern": [
    0,
    4,
    2,
    5,
    0,
    3,
    2,
    4
   ],
   "leadVel": 0.32,
   "drumVel": 0.16
  }
 },
 {
  "name": "鋼旗の行軍",
  "mood": "中盤｜隊列の重みと勢いが増す進軍",
  "root": 57,
  "meter": 4,
  "lead": "horn",
  "arp": "strings",
  "ally": {
   "title": "鋼の隊列、前へ",
   "bpm": 130,
   "scale": [
    0,
    2,
    3,
    5,
    7,
    9,
    10
   ],
   "rhythm": [
    0.75,
    0.25,
    1,
    1,
    1,
    0.5,
    1.5,
    2
   ],
   "chords": [
    0,
    3,
    4,
    5,
    0,
    4,
    3,
    4
   ],
   "melody": [
    [
     0,
     0,
     4,
     3,
     5,
     4,
     2,
     3
    ],
    [
     4,
     5,
     7,
     6,
     5,
     3,
     4,
     5
    ],
    [
     7,
     7,
     6,
     4,
     5,
     6,
     4,
     3
    ],
    [
     4,
     2,
     3,
     5,
     4,
     2,
     1,
     0
    ]
   ],
   "arpPattern": [
    0,
    4,
    2,
    4,
    0,
    5,
    3,
    4
   ],
   "leadVel": 0.34,
   "bassVel": 0.26,
   "drumEvery": 1,
   "drumVel": 0.15
  },
  "hostile": {
   "title": "軍靴は地を裂く",
   "bpm": 138,
   "scale": [
    0,
    2,
    3,
    5,
    7,
    8,
    10
   ],
   "rhythm": [
    0.5,
    0.5,
    1,
    0.5,
    0.5,
    1,
    1,
    3
   ],
   "chords": [
    0,
    4,
    5,
    3,
    0,
    2,
    4,
    0
   ],
   "melody": [
    [
     0,
     0,
     1,
     3,
     2,
     1,
     3,
     4
    ],
    [
     5,
     4,
     3,
     2,
     4,
     5,
     4,
     2
    ],
    [
     3,
     5,
     6,
     5,
     3,
     4,
     2,
     1
    ],
    [
     4,
     3,
     2,
     1,
     0,
     1,
     0,
     -1
    ]
   ],
   "arpPattern": [
    0,
    2,
    0,
    4,
    2,
    5,
    2,
    4
   ],
   "bassVel": 0.28,
   "drumVel": 0.19
  }
 },
 {
  "name": "終章への行軍",
  "mood": "終盤｜疾走する勇気、その奥に残る別れの痛み",
  "root": 62,
  "meter": 4,
  "lead": "strings",
  "arp": "harp",
  "ally": {
   "title": "別れを抱いて進め",
   "bpm": 148,
   "scale": [
    0,
    2,
    3,
    5,
    7,
    9,
    10
   ],
   "rhythm": [
    0.5,
    0.5,
    0.5,
    1.5,
    0.5,
    0.5,
    1,
    3
   ],
   "chords": [
    0,
    5,
    3,
    4,
    2,
    5,
    4,
    0
   ],
   "melody": [
    [
     7,
     6,
     4,
     3,
     5,
     4,
     2,
     1
    ],
    [
     2,
     4,
     5,
     7,
     6,
     5,
     4,
     2
    ],
    [
     3,
     5,
     7,
     9,
     7,
     6,
     5,
     4
    ],
    [
     6,
     5,
     3,
     2,
     4,
     2,
     1,
     0
    ]
   ],
   "arpPattern": [
    0,
    4,
    2,
    6,
    5,
    2,
    4,
    2
   ],
   "padVel": 0.092,
   "leadVel": 0.34,
   "bassVel": 0.25,
   "drumEvery": 1,
   "drumVel": 0.14
  },
  "hostile": {
   "title": "涙の残る戦野",
   "bpm": 152,
   "scale": [
    0,
    2,
    3,
    5,
    7,
    8,
    11
   ],
   "rhythm": [
    0.5,
    0.5,
    0.5,
    1.5,
    0.5,
    0.5,
    1,
    3
   ],
   "chords": [
    0,
    3,
    5,
    4,
    0,
    5,
    2,
    4
   ],
   "melody": [
    [
     4,
     3,
     1,
     0,
     2,
     3,
     2,
     1
    ],
    [
     3,
     5,
     4,
     3,
     1,
     2,
     0,
     -1
    ],
    [
     5,
     7,
     6,
     5,
     3,
     4,
     2,
     1
    ],
    [
     4,
     3,
     2,
     0,
     1,
     0,
     -1,
     0
    ]
   ],
   "arpPattern": [
    0,
    2,
    4,
    7,
    5,
    3,
    2,
    4
   ],
   "padVel": 0.095,
   "drumVel": 0.15
  }
 },
 {
  "name": "白嵐の行軍",
  "mood": "吹雪｜冷えた空気、かすかな足音、遠い稜線",
  "root": 64,
  "meter": 3,
  "lead": "flute",
  "arp": "strings",
  "ally": {
   "title": "白夜に残す足跡",
   "bpm": 104,
   "scale": [
    0,
    2,
    3,
    5,
    7,
    8,
    10
   ],
   "rhythm": [
    1,
    0.5,
    1,
    0.5,
    0.5,
    0.5,
    1,
    1
   ],
   "chords": [
    0,
    5,
    3,
    2,
    0,
    4,
    5,
    0
   ],
   "melody": [
    [
     7,
     6,
     4,
     3,
     2,
     1,
     2,
     0
    ],
    [
     5,
     4,
     2,
     3,
     4,
     2,
     1,
     0
    ],
    [
     7,
     9,
     7,
     5,
     4,
     3,
     2,
     1
    ],
    [
     4,
     3,
     1,
     2,
     0,
     1,
     -1,
     0
    ]
   ],
   "arpPattern": [
    0,
    4,
    2,
    5,
    3,
    4,
    2,
    0
   ],
   "arpVel": 0.065,
   "padVel": 0.092,
   "bassVel": 0.16,
   "drumEvery": 4,
   "drumVel": 0.065,
   "leadArticulation": 0.82
  },
  "hostile": {
   "title": "凍てつく追跡者",
   "bpm": 116,
   "scale": [
    0,
    1,
    3,
    5,
    7,
    8,
    10
   ],
   "rhythm": [
    1,
    0.5,
    1,
    0.5,
    0.5,
    0.5,
    1,
    1
   ],
   "chords": [
    0,
    1,
    5,
    4,
    0,
    2,
    1,
    0
   ],
   "melody": [
    [
     4,
     3,
     2,
     1,
     0,
     1,
     2,
     3
    ],
    [
     5,
     4,
     3,
     1,
     2,
     1,
     0,
     -1
    ],
    [
     6,
     5,
     3,
     4,
     2,
     1,
     0,
     1
    ],
    [
     3,
     2,
     1,
     0,
     -1,
     0,
     1,
     0
    ]
   ],
   "arpPattern": [
    0,
    3,
    2,
    4,
    0,
    5,
    2,
    3
   ],
   "arpVel": 0.07,
   "padVel": 0.09,
   "bassVel": 0.18,
   "drumEvery": 2,
   "drumVel": 0.1
  }
 },
 {
  "name": "熱砂の行軍",
  "mood": "砂漠｜灼けた地面、乾いた拍動、揺れる視界",
  "root": 55,
  "meter": 4,
  "lead": "flute",
  "arp": "harp",
  "ally": {
   "title": "陽炎を越える隊商",
   "bpm": 124,
   "scale": [
    0,
    1,
    3,
    5,
    7,
    8,
    10
   ],
   "rhythm": [
    0.75,
    0.25,
    0.5,
    0.5,
    1.5,
    0.5,
    1,
    3
   ],
   "chords": [
    0,
    1,
    4,
    3,
    0,
    5,
    1,
    0
   ],
   "melody": [
    [
     0,
     1,
     3,
     4,
     5,
     3,
     2,
     1
    ],
    [
     3,
     4,
     6,
     5,
     4,
     3,
     1,
     0
    ],
    [
     5,
     7,
     6,
     4,
     3,
     5,
     4,
     2
    ],
    [
     4,
     3,
     1,
     2,
     3,
     1,
     0,
     -1
    ]
   ],
   "arpPattern": [
    0,
    3,
    0,
    4,
    2,
    5,
    2,
    4
   ],
   "leadArticulation": 0.78,
   "padVel": 0.055,
   "bassVel": 0.23,
   "drumEvery": 1,
   "drumVel": 0.12
  },
  "hostile": {
   "title": "砂塵に潜む刃",
   "bpm": 136,
   "scale": [
    0,
    1,
    4,
    5,
    7,
    8,
    10
   ],
   "rhythm": [
    0.75,
    0.25,
    0.5,
    0.5,
    1.5,
    0.5,
    1,
    3
   ],
   "chords": [
    0,
    1,
    3,
    4,
    0,
    5,
    1,
    0
   ],
   "melody": [
    [
     1,
     0,
     3,
     2,
     4,
     3,
     2,
     0
    ],
    [
     3,
     4,
     5,
     6,
     5,
     3,
     2,
     1
    ],
    [
     4,
     3,
     1,
     0,
     1,
     3,
     2,
     0
    ],
    [
     5,
     4,
     3,
     1,
     2,
     1,
     0,
     -1
    ]
   ],
   "arpPattern": [
    0,
    4,
    1,
    5,
    0,
    3,
    1,
    4
   ],
   "leadArticulation": 0.75,
   "padVel": 0.058,
   "bassVel": 0.25,
   "drumVel": 0.2
  }
 },
 {
  "name": "聖域の行軍",
  "mood": "神殿｜速い分散和音に、長く響く荘厳な主旋律",
  "root": 60,
  "meter": 4,
  "lead": "horn",
  "arp": "harp",
  "ally": {
   "title": "聖域の石階を登る",
   "bpm": 132,
   "scale": [
    0,
    2,
    3,
    5,
    7,
    8,
    11
   ],
   "rhythm": [
    0.5,
    0.5,
    1,
    1,
    1,
    1,
    1,
    2
   ],
   "chords": [
    0,
    5,
    3,
    4,
    0,
    2,
    5,
    0
   ],
   "melody": [
    [
     0,
     4,
     7,
     6,
     5,
     4,
     2,
     3
    ],
    [
     4,
     5,
     7,
     9,
     7,
     5,
     4,
     3
    ],
    [
     7,
     6,
     5,
     4,
     7,
     6,
     4,
     2
    ],
    [
     3,
     5,
     4,
     2,
     1,
     2,
     0,
     0
    ]
   ],
   "arpPattern": [
    0,
    2,
    4,
    7,
    4,
    2,
    5,
    7
   ],
   "leadArticulation": 0.98,
   "padVel": 0.12,
   "arpVel": 0.1,
   "drumEvery": 4,
   "drumVel": 0.08
  },
  "hostile": {
   "title": "祭壇を守る影",
   "bpm": 140,
   "scale": [
    0,
    2,
    3,
    5,
    7,
    8,
    11
   ],
   "rhythm": [
    0.5,
    0.5,
    1,
    1,
    1,
    1,
    1,
    2
   ],
   "chords": [
    0,
    1,
    4,
    5,
    0,
    2,
    4,
    0
   ],
   "melody": [
    [
     7,
     6,
     4,
     3,
     5,
     4,
     2,
     1
    ],
    [
     5,
     4,
     3,
     1,
     4,
     3,
     1,
     0
    ],
    [
     3,
     5,
     7,
     6,
     4,
     5,
     3,
     2
    ],
    [
     4,
     3,
     2,
     1,
     0,
     -1,
     1,
     0
    ]
   ],
   "arpPattern": [
    0,
    5,
    4,
    7,
    5,
    3,
    2,
    4
   ],
   "leadArticulation": 0.98,
   "padVel": 0.13,
   "arpVel": 0.09,
   "drumEvery": 2,
   "drumVel": 0.12
  }
 },
 {
  "name": "籠城の行軍",
  "mood": "要塞防衛｜迫る敵影、崩せない守備線、絶えない緊張",
  "root": 53,
  "meter": 4,
  "lead": "strings",
  "arp": "strings",
  "ally": {
   "title": "城門、なお立つ",
   "bpm": 142,
   "scale": [
    0,
    2,
    3,
    5,
    7,
    8,
    10
   ],
   "rhythm": [
    0.5,
    0.5,
    1,
    0.5,
    0.5,
    1,
    1,
    3
   ],
   "chords": [
    0,
    4,
    0,
    5,
    3,
    4,
    2,
    0
   ],
   "melody": [
    [
     0,
     0,
     2,
     3,
     2,
     0,
     1,
     2
    ],
    [
     3,
     4,
     3,
     2,
     5,
     4,
     3,
     1
    ],
    [
     2,
     2,
     4,
     5,
     4,
     3,
     2,
     0
    ],
    [
     5,
     4,
     3,
     1,
     2,
     1,
     0,
     0
    ]
   ],
   "arpPattern": [
    0,
    4,
    0,
    2,
    0,
    4,
    0,
    5
   ],
   "leadVel": 0.34,
   "bassVel": 0.29,
   "drumEvery": 1,
   "drumVel": 0.2
  },
  "hostile": {
   "title": "包囲網の圧迫",
   "bpm": 154,
   "scale": [
    0,
    2,
    3,
    5,
    7,
    8,
    10
   ],
   "rhythm": [
    0.5,
    0.5,
    1,
    0.5,
    0.5,
    1,
    1,
    3
   ],
   "chords": [
    0,
    1,
    4,
    0,
    5,
    3,
    4,
    0
   ],
   "melody": [
    [
     0,
     1,
     0,
     2,
     1,
     3,
     2,
     1
    ],
    [
     3,
     4,
     2,
     4,
     3,
     5,
     4,
     2
    ],
    [
     4,
     5,
     3,
     5,
     4,
     6,
     5,
     3
    ],
    [
     5,
     3,
     4,
     2,
     1,
     2,
     0,
     -1
    ]
   ],
   "arpPattern": [
    0,
    2,
    0,
    4,
    0,
    5,
    3,
    4
   ],
   "leadVel": 0.35,
   "bassVel": 0.3,
   "drumVel": 0.21
  }
 }
];
// Appending score pairs preserves the original No.01–26 catalogue forever.
export const MUSIC_LIBRARY=[...SCORES,...BONUS_SCORES,...NEW_SCORES];
export const trackNumber=(scoreIndex,phase=1)=>scoreIndex*2+(phase===1?1:2);
export const MAP_TRACK_NUMBERS=Object.freeze([
 {ally:1,hostile:2},  // 01 霧河の渡し
 {ally:3,hostile:4},  // 02 二つの戦線
 {ally:5,hostile:6},  // 03 灰城の砲火
 {ally:7,hostile:8},  // 04 長河の三橋
 {ally:9,hostile:10}, // 05 森壁の回廊
 {ally:11,hostile:12} // 06 暁の城塞線
]);
// Change only this assignment table when the producer picks a numbered track.
// Odd numbers are the first (ally) candidate; even numbers are the second.
// Any number may be assigned to either phase without changing the composition.
export function assignedTrackNumber(mapId,phase=1){
 return MAP_TRACK_NUMBERS[mapId]?.[phase===1?'ally':'hostile']??trackNumber(mapId,phase);
}
export function trackByNumber(number){
 if(!Number.isInteger(number)||number<1||number>MUSIC_LIBRARY.length*2)return null;
 const scoreIndex=Math.floor((number-1)/2),phase=number%2?1:2;
 return {...buildTrack(scoreIndex,phase),number};
}
const degree=(root,scale,n)=>root+12*Math.floor(n/7)+scale[((n%7)+7)%7];
export function buildTrack(mapId,phase=1){
 const score=MUSIC_LIBRARY[mapId]||SCORES[0],side=phase===1?'ally':'hostile',part=score[side],bar=score.meter,length=bar*32;
 const rhythm=part.rhythm||(bar===3?[.5,.5,.5,.5,1,.5,.5,2]:[1,.5,.5,1,1,1,1,2]),events=[];
 const push=(beat,duration,n,voice,velocity,pan=0)=>events.push({beat,duration,midi:degree(score.root,part.scale,n),voice,velocity,pan});
 for(let pass=0;pass<4;pass++)for(let phrase=0;phrase<4;phrase++){
  let beat=pass*bar*8+phrase*bar*2;
  for(const [i,n]of part.melody[phrase].entries()){push(beat,rhythm[i]*(part.leadArticulation??.9),n+(pass===2&&phrase===2?7:0),score.lead,part.leadVel??.32,0);if(pass%2===1&&i%2===0)push(beat+.08,Math.min(rhythm[i],.8),n-7,'flute',.07,.3);beat+=rhythm[i];}
 }
 for(let i=0;i<32;i++){
  const beat=i*bar,chord=part.chords[i%8];
  for(const n of [chord-7,chord-5,chord-3])push(beat,bar*.94,n,'pad',part.padVel??.075,-.18);
  push(beat,bar*.65,chord-14,'bass',part.bassVel??.24,0);if(side==='hostile'||bar===4)push(beat+bar/2,.7,chord-10,'bass',part.offbeatBassVel??.14,0);
  for(let j=0;j<bar*2;j++)push(beat+j/2,.35,chord+(part.arpPattern||[0,2,4,2,0,4,2,4])[j%8],score.arp,part.arpVel??.09,.22);
  if(i%(part.drumEvery??(side==='hostile'?1:2))===0)events.push({beat,duration:.12,midi:38,voice:'drum',velocity:part.drumVel??(side==='hostile'?.18:.10),pan:0});
 }
 events.sort((a,b)=>a.beat-b.beat);
 return {mapId,side,title:part.title,bpm:part.bpm,beats:length,seconds:length*60/part.bpm,events};
}
// Shared by realtime playback and deterministic OfflineAudioContext verification.
// Keep the gain envelope continuous: stepping a sounding oscillator's gain creates a click.
export function scheduleNote(context,destination,event,time,secondsPerBeat){
 const duration=Math.max(.035,event.duration*secondsPerBeat),gain=context.createGain(),filter=context.createBiquadFilter(),osc=context.createOscillator();
 const frequency=440*2**((event.midi-69)/12),isPad=event.voice==='pad',plucked=event.voice==='harp',drum=event.voice==='drum';
 osc.type=['flute','harp','bass','drum'].includes(event.voice)?'sine':'triangle';
 osc.frequency.setValueAtTime(drum?95:frequency,time);if(drum)osc.frequency.exponentialRampToValueAtTime(35,time+duration);
 filter.type='lowpass';filter.frequency.value=event.voice==='horn'?1800:isPad?900:plucked?2400:3000;
 const attack=isPad?.075:plucked?.006:.018,release=isPad?.2:.07,end=time+duration+release;
 gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(event.velocity,time+Math.min(attack,duration/3));
 if(plucked||drum)gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
 else{gain.gain.linearRampToValueAtTime(event.velocity*.72,time+duration*.72);gain.gain.linearRampToValueAtTime(0,end);}
 osc.connect(filter);filter.connect(gain);let pan=null;
 if(context.createStereoPanner){pan=context.createStereoPanner();pan.pan.value=event.pan||0;gain.connect(pan);pan.connect(destination);}else gain.connect(destination);
 osc.start(time);osc.stop(end+.01);
 const clean=()=>{osc.disconnect();filter.disconnect();gain.disconnect();pan?.disconnect();};osc.onended=clean;
 return {stop(at=context.currentTime){try{gain.gain.cancelScheduledValues(at);gain.gain.setTargetAtTime(0,at,.012);osc.stop(at+.06);}catch{}},clean,osc};
}
// Phase/preview switches: fast fade, a short true silence, then normal-level playback.
export const MUSIC_TRANSITION={fade:.085,silence:.055};
export function createMusic(storage){
 if(arguments.length===0)try{storage=globalThis.localStorage;}catch{}
 let enabled=false,volume=.32,context=null,master=null,bus=null,timer=null,track=null,key=null,currentSource=null,requested=null,preview=null,index=0,start=0,scheduled=0,serial=0,starts=0;
 const voices=new Set(),retired=new Set();
 try{enabled=storage?.getItem('field-command-music')==='true';const saved=storage?.getItem('field-command-music-volume');if(saved!==null&&saved!==undefined&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(1,Number(saved)));}catch{}
 function stop(){
  serial++;if(timer!==null){clearInterval(timer);timer=null;}const now=context?.currentTime||0;
  if(bus)try{bus.gain.cancelScheduledValues(now);bus.gain.setValueAtTime(bus.gain.value,now);bus.gain.linearRampToValueAtTime(0,now+MUSIC_TRANSITION.fade);}catch{}
  // All future notes are already connected to the retiring bus. Fade that bus,
  // then release its oscillators; never abruptly drop a sounding note.
  for(const v of voices)v.stop(now+MUSIC_TRANSITION.fade);voices.clear();
  if(bus){const old=bus;const cleanup=setTimeout(()=>{old.disconnect();retired.delete(cleanup);},260);retired.add(cleanup);}bus=null;key=null;currentSource=null;index=0;
 }
 function pump(){
  if(!context||context.state!=='running'||!bus||!track||(!enabled&&!preview))return;
  const beat=60/track.bpm,limit=context.currentTime+.24;
  // Recover cleanly from a throttled foreground timer instead of emitting stale notes.
  if(start+track.seconds<context.currentTime-.2){start=context.currentTime+.04;index=0;}
  let count=0;
  while(count++<200){
   if(index===track.events.length){index=0;start+=track.seconds;}
   const event=track.events[index],time=start+event.beat*beat;if(time>limit)break;index++;
   if(time<context.currentTime-.02)continue;
   try{const voice=scheduleNote(context,bus,event,Math.max(time,context.currentTime+.002),beat);voices.add(voice);const clean=voice.osc.onended;voice.osc.onended=()=>{clean();voices.delete(voice);};scheduled++;}catch{stop();return;}
  }
 }
 function activate(){
  if(globalThis.document?.hidden||context?.state!=='running')return;
  const target=preview||(enabled&&requested?.status==='playing'?requested:null);
  if(!target){if(key)stop();return;}
  const number=preview?trackNumber(target.mapId,target.phase):assignedTrackNumber(target.mapId,target.phase);
  if(!Number.isInteger(number)||number<1||number>MUSIC_LIBRARY.length*2)return;
  const next=`${Math.floor((number-1)/2)}:${number%2?'ally':'hostile'}`,source=preview?'preview':'game';
  if(next===key&&currentSource===source)return;
  const candidate=trackByNumber(number);
  const switching=!!bus;stop();
  track=candidate;key=next;currentSource=source;bus=context.createGain();
  // Each oscillator already has its own gentle note attack. Do not fade in the new bus.
  bus.gain.setValueAtTime(1,context.currentTime);bus.connect(master);
  start=context.currentTime+(switching?MUSIC_TRANSITION.fade+MUSIC_TRANSITION.silence:.01);
  index=0;pump();if(key===next){starts++;timer=setInterval(pump,100);}
 }
 function unlock(){
  if((!enabled&&!preview)||globalThis.document?.hidden)return;
  try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
   if(!context||context.state==='closed'){context=new Audio();master=context.createGain();master.gain.value=volume*.34;const limiter=context.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=18;limiter.ratio.value=4;master.connect(limiter);limiter.connect(context.destination);}
   if(context.state==='running')activate();else{const token=serial;context.resume().then(()=>{if(token===serial)activate();}).catch(()=>{});}
  }catch{/* Music never blocks input or phase resolution. */}
 }
 function setScene(mapId,phase,status='playing'){
  requested={mapId,phase,status};if(preview)return;if(status!=='playing'){if(key)stop();return;}try{if(enabled)activate();}catch{stop();}
 }
 function setEnabled(value){enabled=!!value;try{storage?.setItem('field-command-music',String(enabled));}catch{}
  if(enabled)unlock();else if(!preview)stop();return enabled;
 }
 function setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));try{storage?.setItem('field-command-music-volume',String(volume));}catch{}if(master&&context)master.gain.setTargetAtTime(volume*.34,context.currentTime,.03);}
 function playPreview(mapId,phase=1){
  if(!Number.isInteger(mapId)||mapId<0||mapId>=MUSIC_LIBRARY.length)return false;
  preview={mapId,phase:phase===1?1:2};unlock();return true;
 }
 function stopPreview(){
  if(!preview)return false;
  preview=null;if(enabled&&requested?.status==='playing')activate();
  else stop();return true;
 }
 const visibility=()=>{if(globalThis.document?.hidden){stop();if(context?.state==='running')context.suspend().catch(()=>{});}else if((enabled||preview)&&context)unlock();};
 globalThis.document?.addEventListener('visibilitychange',visibility);
 return {unlock,setScene,setEnabled,setVolume,playPreview,stopPreview,get enabled(){return enabled;},get volume(){return volume;},snapshot:()=>({enabled,volume,scene:key,preview:preview?`${preview.mapId}:${preview.phase===1?'ally':'hostile'}`:null,title:track?.title||null,state:context?.state||'locked',scheduled,starts,voices:voices.size}),destroy(){preview=null;stop();globalThis.document?.removeEventListener('visibilitychange',visibility);for(const t of retired)clearTimeout(t);retired.clear();if(context&&context.state!=='closed')context.close().catch(()=>{});}};
}
