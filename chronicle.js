// Issue #43 (first stage): a war record that follows the three-chapter campaign.
// Pure summaries of a finished chapter. It never changes rules, odds or the story;
// it only lets the player look back at how each battle was won.
const MAX_RECORDS=3;

export function chapterRecord(s){
 const allyIds=new Set(s.units.filter(u=>u.team==='ally').map(u=>u.id));
 const fallen=s.metrics.deaths.filter(d=>allyIds.has(d.id)).map(d=>s.units.find(u=>u.id===d.id));
 const named=fallen.filter(u=>u?.named).map(u=>u.name);
 return {
  map:s.map.id,title:s.map.title,turn:s.turn,commands:s.metrics.commands,
  fallen:fallen.length,namedFallen:named,
  standing:s.units.filter(u=>u.team==='ally'&&u.alive).length,
  southTaken:s.map.south?!!s.southTaken:null
 };
}

// Old saves have no record; malformed entries are dropped instead of failing the game.
export function sanitizeChronicle(list){
 if(!Array.isArray(list))return [];
 return list.filter(r=>r&&typeof r==='object'&&Number.isInteger(r.map)&&r.map>=0&&r.map<=2&&
  Number.isInteger(r.turn)&&r.turn>=1&&Number.isInteger(r.commands)&&r.commands>=0&&
  Number.isInteger(r.fallen)&&r.fallen>=0&&Number.isInteger(r.standing)&&r.standing>=0&&
  typeof r.title==='string'&&Array.isArray(r.namedFallen)&&r.namedFallen.every(n=>typeof n==='string')&&
  (r.southTaken===null||typeof r.southTaken==='boolean')).slice(-MAX_RECORDS);
}

export function appendChapter(list,s){
 return sanitizeChronicle([...sanitizeChronicle(list).filter(r=>r.map!==s.map.id),chapterRecord(s)]);
}

// Short readable lines; no ranks or scores, the record only tells what happened.
export function chronicleLines(list){
 return sanitizeChronicle(list).map(r=>{
  const parts=[`T${r.turn}で制圧`,`命令${r.commands}`,r.fallen?`離脱${r.fallen}隊`:'離脱なし'];
  if(r.southTaken!==null)parts.push(r.southTaken?'南城を先に制圧':'南城は残したまま');
  return {title:r.title,summary:parts.join(' · '),memory:r.namedFallen.length?`帰らなかった者：${r.namedFallen.join('、')}`:'名のある隊長は全員帰還'};
 });
}
