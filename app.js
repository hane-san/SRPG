import {RELEASE,RULES,SKILLS,CLASSES} from './config.js?v=0.1.0';
import {MAPS} from './data.js?v=0.1.0';
import * as E from './engine.js?v=0.1.0';
import {render,mini} from './render.js?v=0.1.0';
const $=id=>document.getElementById(id),canvas=$('battlefield'),vp=$('mapViewport');
const STORAGE='field-command-save-v1';let s,campaign=false,settings={mode:'classic',healing:'H1',enemyAttack:0},zoom=0,locked=false;
let view={selected:null,dest:null,target:null,action:null,danger:false,tile:32};
try{const saved=JSON.parse(localStorage.getItem(STORAGE));if(saved?.release===RELEASE&&saved.state?.phase===1){s=saved.state;campaign=saved.campaign;settings=s.settings;}}catch{/* storage is optional */}
if(!s)s=E.createGame(0,settings);
function save(){try{localStorage.setItem(STORAGE,JSON.stringify({release:RELEASE,state:s,campaign}));}catch{}}
function modal(html,close=true){$('modalBody').innerHTML=html;$('closeModal').hidden=!close;if(!$('modal').open)$('modal').showModal();}
function close(){$('modal').close();}
$('closeModal').onclick=close;
function button(text,fn,cls=''){const b=document.createElement('button');b.textContent=text;if(cls)b.className=cls;b.onclick=fn;return b;}
function selected(){return s.units.find(u=>u.id===view.selected);}
function resetSelection(){Object.assign(view,{selected:null,dest:null,target:null,action:null});}
function fit(){view.tile=Math.max(20,Math.floor(vp.clientWidth/s.map.w))*[1,1.4,1.9][zoom];$('zoomLabel').textContent=['全幅','×1.4','×1.9'][zoom];}
function draw(){render(canvas,s,view);mini($('minimap'),s,vp,view.tile);}
function refresh(){fit();draw();$('release').textContent=`v${RELEASE}`;$('turn').textContent=`TURN ${s.turn}`;
 document.querySelectorAll('[data-phase]').forEach(n=>n.classList.toggle('current',Number(n.dataset.phase)===s.phase));
 $('objective').textContent=`${s.map.title} · 北城へ移動して制圧${s.map.base?' / 本陣を死守':''}`;
 $('forecast').textContent=s.warnings.length?s.warnings.map(w=>`T${w.turn} P4 ${w.kind==='cannon'?'赤枠へ砲撃 −6':'紫枠に増援（到着時は攻撃なし）'}`).join(' ｜ '):s.map.spawns.length&&(!s.map.maxWaves||s.turn<=s.map.maxWaves*4)?`次の増援 T${Math.ceil(s.turn/4)*4} P4${s.southTaken?'（南城制圧で停止）':''} · 位置は前ターン確報`: '青＝移動 / 黄＝攻撃射程 / 赤＝敵の到達攻撃域';
 $('endTurn').disabled=locked||s.status!=='playing';$('endTurn').textContent=locked?`P${s.phase} 進行中…`:'命令終了 →';
 $('menuBtn').disabled=locked;$('dangerBtn').setAttribute('aria-pressed',String(view.danger));panel();
}
function panel(){const root=$('orders');root.innerHTML='';
 if(s.status!=='playing'){
 root.innerHTML=`<div class="unit-head"><strong>${s.status==='victory'?'北城、制圧。':'戦線、崩壊。'}</strong><span>T${s.turn} · 離脱 ${s.metrics.deaths.filter(d=>s.units.find(u=>u.id===d.id)?.team==='ally').length}部隊</span></div><div class="hint">${campaign?'連戦：クラシックの離脱は次章に引き継ぎます。':'単体試験：リスタートで全隊復帰。連戦は作戦室から。'}</div>`;
 const row=document.createElement('div');row.className='action-row';row.append(button('再試行',()=>confirmRestart(s.map.id)));if(s.status==='victory'&&s.map.id<2)row.append(button(campaign?'次章へ（離脱継承）':'次の試験マップ',()=>start(s.map.id+1,campaign,campaign?s.lost:[]),'primary'));if(s.status==='victory'&&s.map.id===2)row.append(button('作戦室へ',showMenu));root.append(row);return;
 }
 const u=selected();if(!u){root.innerHTML=`<div class="unit-head"><strong>布陣を、決める。</strong><span>${campaign?'連戦':'単体試験'} · ${s.settings.mode==='classic'?'クラシック':'カジュアル'}</span></div><div class="hint">青い部隊 → 移動先 → 命令 → 確定。<br>赤い部隊で射程と方針を確認。地図は指でスクロール。</div>`;return;}
 root.innerHTML=`<div class="unit-head"><strong>${u.name}</strong><span>${u.label} ${u.alive?'':'離脱'}</span><span class="hp">HP ${u.hp}/${u.maxHp}</span></div><div class="stats">攻${u.atk} / 守${u.def} / 移${u.move} / 射程${u.range.join('–')} ${u.team==='ally'?'· '+SKILLS[u.skill].label+' 残'+u.charges:'· P2のみ行動'} ${u.acted?' / 行動済み':''}${u.command?' / 継続：'+({guard:'守備',support:'援護',heal:'回復'}[u.command]||u.command):''}</div>`;
 if(u.team==='enemy'){
 const names={hold:'このマスを守り動かない',defend:'初期位置の周囲3マスまで守備',advance:'接近し射程内へ攻撃',skirmish:'西側（x<10）の味方を追う。東道は追わない',raid:'回復・弓を優先し、本陣を狙う'};
 root.insertAdjacentHTML('beforeend',`<div class="preview">敵方針：${names[u.ai]}<br>赤い危険域は最大到達範囲。守備圏・味方の壁を考慮しない安全側の表示です。</div>`);return;}
 if(u.acted||locked){if(u.command==='support'||u.command==='heal')supportControls(root,u);return;}
 const dest=view.dest||u,target=s.units.find(t=>t.id===view.target),moved=E.dist(u,dest)>0;
 const row=document.createElement('div');row.className='action-row';
 row.append(button('通常攻撃',()=>{view.action='attack';view.target=null;refresh();}));
 row.append(button('守備 −1',()=>{view.action='guard';view.target=null;refresh();}));
 const skill=SKILLS[u.skill];const skillButton=button(`${skill.label} ${u.charges||(['heal','immediate'].includes(u.skill)?'応急':'0')}`,()=>{view.action=u.skill;view.target=null;refresh();});
 skillButton.disabled=(u.charges===0&&!['heal','immediate'].includes(u.skill))||(['heal','support'].includes(u.skill)&&moved);row.append(skillButton);
 row.append(button('取消',()=>{Object.assign(view,{dest:{x:u.x,y:u.y},target:null,action:null});refresh();}));root.append(row);
 let message=`${moved?`移動先 (${dest.x+1}, ${dest.y+1})`:'その場で命令'}。`;
 if(view.action==='attack'||view.action==='burst')message+=target?'':' 射程内の赤い部隊をタップ。';
 else if(view.action==='immediate')message+=' 隣接する負傷した青い部隊をタップ。';
 else if(view.action)message+=view.action==='guard'?'被害−1・反撃可。':SKILLS[view.action]?.text||'';
 else message+=' 命令を選んでください。';
 if(target&&['attack','burst'].includes(view.action)){const p=E.prediction(s,u,target,dest,view.action==='burst'?RULES.burstBonus:0);message=`${target.name}へ ${p.damage}ダメージ${p.damage>=target.hp?'・撃破':''} / 反撃 ${p.counter}${p.counter>=u.hp?' ⚠ この攻撃で離脱':''}`;}
 if(target&&view.action==='immediate')message=`${target.name}を${E.healAmount(s,u,target,true)}回復。${u.charges===0?'応急処置（'+s.settings.healing+'）':''}`;
 const pre=document.createElement('div');pre.className='preview';pre.textContent=message;root.append(pre);
 if(view.action){const err=E.validateAction(s,u.id,dest,view.action,view.target);if(!err)root.append(button('この命令を確定',()=>commit(),'primary wide'));}
 if(['support','heal'].includes(view.action))supportControls(root,u);
 const riskButton=button('移動先の最大被害を調べる',()=>{const risk=E.threatAt(s,dest,u);const p=document.createElement('div');p.className=risk>=u.hp?'hint risk':'hint';p.textContent=`P2被害上限 ${risk}（現在HP ${u.hp}）。各敵の単独到達を合算した保守的上限。守備選択前の値。`;root.append(p);});riskButton.className='subtle';riskButton.style.cssText='font-size:10px;min-height:28px;padding:3px 0';root.append(riskButton);
}
function supportControls(root,u){const t=E.supportTarget(s,u);const p=document.createElement('div');p.className='hint';p.textContent=`P3の現時点候補：${t?t.name:'対象なし'}（敵移動・被害後に再判定）。${u.skill==='support'?'指定→撃破可能→攻撃力順':'指定→HP割合が低い順、欠損4以上'}。対象なしは消費0。`;root.append(p);
 const row=document.createElement('div');row.className='action-row';row.append(button(u.spend?'消費許可：ON':'消費許可：温存',()=>{u.spend=!u.spend;save();refresh();}));root.append(row);
 const select=document.createElement('select');select.className='focus-select';select.setAttribute('aria-label','待機支援の優先対象');select.add(new Option('対象は自動選択', ''));for(const a of E.alive(s,u.skill==='support'?'enemy':'ally').filter(a=>a.id!==u.id))select.add(new Option(`${a.name}を優先（射程外なら自動）`,a.id));select.value=u.focus||'';select.onchange=()=>{u.focus=select.value||null;save();refresh();};root.append(select);
}
function commit(){const u=selected();const r=E.act(s,u.id,view.dest||u,view.action,view.target);if(!r.ok){modal(`<p>${r.error}</p>`);return;}resetSelection();save();refresh();}
function selectUnit(u){view.selected=u.id;view.dest={x:u.x,y:u.y};view.action=null;view.target=null;refresh();}
canvas.addEventListener('click',ev=>{
 if(locked||s.status!=='playing')return;const rect=canvas.getBoundingClientRect(),p={x:Math.floor((ev.clientX-rect.left)/view.tile),y:Math.floor((ev.clientY-rect.top)/view.tile)},u=E.at(s,p),a=selected();
 if(a?.team==='ally'&&!a.acted&&u&&((u.team==='enemy')||(view.action==='immediate'&&u.team==='ally'&&u.id!==a.id))){view.target=u.id;if(u.team==='enemy'&&!['attack','burst'].includes(view.action))view.action='attack';refresh();return;}
 if(u){selectUnit(u);return;}
 if(a?.team==='ally'&&!a.acted){const poss=E.reachable(s,a,a.move+(view.action==='dash'?2:0));if(poss.some(n=>n.x===p.x&&n.y===p.y)){view.dest=p;view.target=null;if(['heal','support'].includes(view.action))view.action=null;refresh();}}else{resetSelection();refresh();}
});
let pointerStart=null;canvas.addEventListener('pointerdown',ev=>{pointerStart={x:ev.clientX,y:ev.clientY};});canvas.addEventListener('pointerup',ev=>{if(pointerStart&&Math.hypot(ev.clientX-pointerStart.x,ev.clientY-pointerStart.y)>10){canvas.addEventListener('click',e=>e.stopImmediatePropagation(),{capture:true,once:true});}pointerStart=null;});
$('dangerBtn').onclick=()=>{view.danger=!view.danger;refresh();};
function setZoom(z){const cx=(vp.scrollLeft+vp.clientWidth/2)/view.tile,cy=(vp.scrollTop+vp.clientHeight/2)/view.tile;zoom=Math.max(0,Math.min(2,z));refresh();vp.scrollLeft=cx*view.tile-vp.clientWidth/2;vp.scrollTop=cy*view.tile-vp.clientHeight/2;}
$('zoomIn').onclick=()=>setZoom(zoom+1);$('zoomOut').onclick=()=>setZoom(zoom-1);
function home(){const friends=E.alive(s,'ally');const a=friends.find(u=>!u.acted)||friends[0];if(a){vp.scrollTop=a.y*view.tile-vp.clientHeight*.5;vp.scrollLeft=a.x*view.tile-vp.clientWidth*.5;}draw();}
$('homeBtn').onclick=home;vp.addEventListener('scroll',()=>mini($('minimap'),s,vp,view.tile),{passive:true});
$('minimap').onclick=ev=>{const r=ev.target.getBoundingClientRect();vp.scrollLeft=(ev.clientX-r.left)/r.width*s.map.w*view.tile-vp.clientWidth/2;vp.scrollTop=(ev.clientY-r.top)/r.height*s.map.h*view.tile-vp.clientHeight/2;};
function askEnd(){if(locked||s.status!=='playing')return;const unacted=E.alive(s,'ally').filter(a=>!a.acted);const keeps=unacted.filter(a=>a.command).length;
 modal(`<h2>命令を終えますか？</h2><p>未操作 ${unacted.length}部隊。継続命令 ${keeps}部隊は前の守備・待機支援を維持し、それ以外はその場で待機します。</p><p>Ⅱ 敵行動 → Ⅲ 待機支援 → Ⅳ 戦場イベント。構えた部隊は敵の攻撃に反撃しません。</p><div id="endConfirm"></div>`);$('endConfirm').append(button('敵フェーズへ進む',()=>{close();runTurn();},'primary wide'));
}
$('endTurn').onclick=askEnd;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function runTurn(){if(locked)return;locked=true;resetSelection();E.prepareEnemy(s);refresh();
 for(const [phase,fn,label]of [[2,E.enemyPhase,'Ⅱ ENEMY PHASE'],[3,E.supportPhase,'Ⅲ SUPPORT PHASE'],[4,E.eventPhase,'Ⅳ BATTLEFIELD']]){
  if(s.status!=='playing')break;s.phase=phase;$('phaseFlash').textContent=label;$('phaseFlash').classList.add('visible');refresh();await pause(matchMedia('(prefers-reduced-motion: reduce)').matches?60:420);fn(s);draw();await pause(160);$('phaseFlash').classList.remove('visible');
 }
 E.nextTurn(s);locked=false;save();refresh();
}
function start(id,chain=false,lost=[]){s=E.createGame(id,settings,lost);campaign=chain;resetSelection();zoom=0;close();save();refresh();home();}
function confirmRestart(id){modal('<h2>再試行</h2><p>このマップ開始時の部隊構成に戻ります。現在の戦闘記録は消えます。</p><div id="restartConfirm"></div>');const startLost=campaign?s.lost.filter(id=>!s.metrics.deaths.some(d=>d.id===id)):[];$('restartConfirm').append(button('再試行する',()=>start(id,campaign,startLost),'danger wide'));}
function showMenu(){if(locked)return;modal(`<span class="eyebrow">OPERATIONS ROOM</span><h2>戦う場所を、選ぶ。</h2><p>命中100%・必殺なし。まずは配置、支援、切り札の使いどころを試す3戦です。</p><div class="settings"><label>離脱の扱い<select id="mode"><option value="classic">クラシック（連戦で永久離脱）</option><option value="casual">カジュアル（次章復帰）</option></select></label><label>敵の攻撃<select id="difficulty"><option value="-2">練習 −2</option><option value="0">標準 ±0</option><option value="2">挑戦 ＋2</option></select></label><label>枯渇後の回復<select id="healing"><option value="H1">H1：HP半分まで＋1</option><option value="H0">H0：上限なし＋1</option><option value="H2">H2：今ターン負傷のみ＋1</option></select></label><label>スキル回数（新規戦闘）<select id="charges"><option value="">兵種ごとの初期値</option><option value="1">一律1回</option><option value="4">一律4回</option></select></label></div><p class="hint">設定は次に開始する戦闘へ適用。現在の戦闘は下の「戦場へ戻る」で続行。自動保存は端末内だけです。</p><div id="maps"></div><div id="campaignStart"></div><details><summary>遊び方とルール</summary><p>青部隊をタップ → 水色の移動先 → 命令 → 確定。敵をタップすると攻撃予測、もう一度「確定」で実行。移動は確定前なら取消可。</p><p>通常攻撃は射程が合えば反撃されます。P3の待機射撃は反撃されませんが、構えた部隊はP2でも反撃しません。守備は被害−1、盾の堅守は−3。森・砦は守備＋1。森の移動コストは2。射線遮蔽・属性相性は今回ありません。</p><p>待機回復は移動不可、回復役自身は対象外。回復量7、欠損4以上なら自動。指定対象では閾値を無視。対象なしは消費0。尽きたら応急処置へ。即時回復は6で移動後も可能です。</p><p>北城へ入ると即勝利。敵全滅だけでは勝利しません。南城も移動して制圧。本陣へ敵が入ると即敗北。画面の上下は地図の北・南です。</p><p>増援地点の占有でその部隊の到着を止められます。砲撃は赤枠の全員へ固定6（敵にも命中）、予告後に1回のP1退避機会があります。</p></details><details><summary>試験メモ・今後の編集</summary><p>データは data.js、数値は config.js、処理は engine.js。追加のビルド作業なし。記録は戦闘記録からJSONで持ち出せます。</p><p>この版では経験値・成長・乱数・音声・敵P3スキルなし。進行中セーブは同じ版だけ復元します。更新時には新規試験になります。</p><p><a href="https://github.com/hane-san/SRPG" target="_blank" rel="noopener">GitHubでソースを開く</a> · <a href="docs/balance.md" target="_blank">仕様とバランス検討</a></p></details><div id="utility" class="action-row"></div>`);
 $('mode').value=settings.mode;$('difficulty').value=String(settings.enemyAttack);$('healing').value=settings.healing;$('charges').value=settings.charges==null?'':String(settings.charges);
 function getSettings(){settings={mode:$('mode').value,enemyAttack:Number($('difficulty').value),healing:$('healing').value};if($('charges').value)settings.charges=Number($('charges').value);}
 for(const m of MAPS){const card=document.createElement('div');card.className='map-card'+(s.map.id===m.id?' active':'');card.innerHTML=`<strong>${m.title}</strong><small>${m.subtitle}</small><p>${m.briefing}</p>`;card.append(button('このマップを開始',()=>{getSettings();start(m.id);}));$('maps').append(card);}
 $('campaignStart').append(button('第1章から連戦（ロストを次章へ）',()=>{getSettings();start(0,true);},'primary wide'));
 $('utility').append(button('この戦闘を再試行',()=>confirmRestart(s.map.id)),button('最新版を確認',async()=>{try{const r=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});const v=await r.json();if(v.version===RELEASE)modal(`<h2>最新版です</h2><p>現在 v${RELEASE}。再度開くと設定・戦闘は同じ版で復元されます。</p>`);else{modal(`<h2>v${v.version} が公開されています</h2><p>更新すると戦闘途中の保存はリセットされます。</p><div id="update"></div>`);$('update').append(button('更新して再起動',()=>{location.href=`./?v=${Date.now()}`;},'primary wide'));}}catch{modal('<p>更新確認ができませんでした。接続を確かめてください。</p>');}}));
}
$('menuBtn').onclick=showMenu;
function roster(){modal('<h2>部隊表</h2><div id="rosterList"></div>');const list=$('rosterList');for(const u of s.units.filter(a=>a.team==='ally')){const p=document.createElement('p');p.append(button(`${u.name} ${u.glyph} · ${u.alive?`HP ${u.hp}/${u.maxHp} 残${u.charges}`:s.settings.mode==='classic'?'永久離脱':'撤退'}`,()=>{close();selectUnit(u);vp.scrollTop=u.y*view.tile-vp.clientHeight/2;vp.scrollLeft=u.x*view.tile-vp.clientWidth/2;}));list.append(p);}if(s.lost.length){const p=document.createElement('p');p.textContent=`連戦の離脱記録：${s.lost.join(', ')}`;list.append(p);}}
$('rosterBtn').onclick=roster;
$('logBtn').onclick=()=>{modal(`<h2>戦闘記録</h2><p>T${s.turn} / 再命令 ${s.metrics.commands} / 支援発動 ${s.metrics.supports} / 支援不発 ${s.metrics.misfires} / 消費 ${s.metrics.charges}</p><div id="export"></div><div id="logs"></div>`);$('export').append(button('検証記録をコピー',async()=>{const report=JSON.stringify({release:RELEASE,map:s.map.id,settings:s.settings,campaign,metrics:s.metrics,units:s.units,log:s.log},null,2);try{await navigator.clipboard.writeText(report);$('export').textContent='コピーしました';}catch{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([report],{type:'application/json'}));a.download='srpg-playtest.json';a.textContent='検証記録JSONを保存';$('export').append(a);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}}));for(const line of [...s.log].reverse()){const p=document.createElement('div');p.className='log-line';p.textContent=line;$('logs').append(p);}};
window.addEventListener('resize',()=>{refresh();});
// Read-only QA surface; browser tests use the same public command interface as taps.
if(new URLSearchParams(location.search).has('debug'))window.srpgDebug={snapshot:()=>structuredClone(s),select:id=>{const u=s.units.find(u=>u.id===id);if(u)selectUnit(u);},start:(id,opts={})=>{settings={...settings,...opts};start(id);}};
refresh();requestAnimationFrame(home);
try{if(!localStorage.getItem(STORAGE))showMenu();}catch{showMenu();}
