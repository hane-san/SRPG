import {RELEASE,SKILLS} from './config.js?v=0.2.0';
import {MAPS} from './data.js?v=0.2.0';
import * as E from './engine.js?v=0.2.0';
import {render,mini} from './render.js?v=0.2.0';
import {bindMapInput} from './ui-input.js?v=0.2.0';
import {readSave,writeSave} from './save.js?v=0.2.0';
const $=id=>document.getElementById(id),canvas=$('battlefield'),vp=$('mapViewport');
let s,campaign=false,settings={mode:'classic',healing:'H1',enemyAttack:0},zoom=0,locked=false;
let lastSize={w:0,h:0};
let view={selected:null,dest:null,target:null,action:null,danger:false,tile:32};
let stored=null;try{stored=readSave(localStorage,RELEASE,MAPS);}catch{/* storage may be disabled */}
if(stored){s=stored.state;campaign=stored.campaign;settings=s.settings;}else s=E.createGame(0,settings);
function save(){try{writeSave(localStorage,RELEASE,s,campaign);}catch{}}
function modal(html,canClose=true){$('modalBody').innerHTML=html;$('closeModal').hidden=!canClose;if(!$('modal').open)$('modal').showModal();$('modal').scrollTop=0;}
function close(){$('modal').close();}
$('closeModal').onclick=close;
function button(text,fn,cls=''){const b=document.createElement('button');b.textContent=text;if(cls)b.className=cls;b.onclick=fn;return b;}
function selected(){return s.units.find(u=>u.id===view.selected);}
function resetSelection(){Object.assign(view,{selected:null,dest:null,target:null,action:null,menu:false,route:[]});}
function center(){return {x:(vp.scrollLeft+vp.clientWidth/2)/view.tile,y:(vp.scrollTop+vp.clientHeight/2)/view.tile};}
function recenter(p){vp.scrollLeft=p.x*view.tile-vp.clientWidth/2;vp.scrollTop=p.y*view.tile-vp.clientHeight/2;}
function fit(){lastSize={w:vp.clientWidth,h:vp.clientHeight};view.tile=Math.max(20,Math.floor(vp.clientWidth/s.map.w))*[1,1.4,1.9][zoom];$('zoomLabel').textContent=['全幅','×1.4','×1.9'][zoom];}
function draw(){render(canvas,s,view);mini($('minimap'),s,vp,view.tile);}
function refresh(){
 $('turn').textContent=`T${s.turn}`;$('phaseName').textContent=s.status==='victory'?'勝利':s.status==='defeat'?'敗北':['','味方','敵軍','支援','戦場'][s.phase];
 $('objective').textContent=s.map.base?'北城制圧 / 本陣死守':'北城制圧';
 const warning=s.warnings.map(w=>`T${w.turn} ${w.kind==='cannon'?'終了時：赤枠に砲撃 −6':'終了時：紫枠に増援'}`).join(' ／ ');
 $('forecast').hidden=!warning;$('forecast').textContent=warning;
 $('endTurn').disabled=locked||s.status!=='playing';$('endTurn').textContent=locked?'進行中…':'命令終了 →';
 $('menuBtn').disabled=locked;$('dangerBtn').setAttribute('aria-pressed',String(view.danger));
 for(const id of ['rosterBtn','logBtn'])$(id).disabled=locked;
 vp.classList.toggle('routing',!locked&&s.status==='playing'&&selected()?.team==='ally'&&!selected().acted);
 panel();fit();draw();
}
function cancelDraft(){const u=selected();if(!u)return;view.dest={x:u.x,y:u.y};view.target=null;view.action=null;view.menu=false;view.route=[];refresh();}
function unitDetails(u){const risk=view.dest&&u.team==='ally'?E.threatAt(s,view.dest,u):null;
 modal(`<h2>${u.name} · ${u.label}</h2><p>HP ${u.hp}/${u.maxHp}　攻撃 ${u.atk}　守備 ${u.def}<br>移動 ${u.move}　射程 ${u.range.join('–')}${u.team==='ally'&&u.skill==='support'?` / P3 ${E.supportRange(u).join('–')}`:''}</p>${u.team==='ally'?`<p>${SKILLS[u.skill].label}：残り${u.charges}回<br>${SKILLS[u.skill].text}</p><p>仮の移動先のP2被害上限：${risk}。各敵の単独到達を合算した安全側の値で、敵同士の進路競合やP3の効果を省いています。</p>`:''}<div id="unitDetailControls"></div>`);
 if(u.team==='ally'&&['heal','support'].includes(u.skill))supportControls($('unitDetailControls'),u);
}
function panel(){const root=$('orders');root.innerHTML='';const u=selected();root.className=s.status!=='playing'?'result':u?'selected'+(u.team==='enemy'||u.acted?' readonly':!view.menu?' choosing':''):'idle';root.dataset.dock=view.dock||'top';root.dataset.side=view.side||'right';
 if(s.status!=='playing'){
  root.innerHTML=`<div class="result-title">${s.status==='victory'?'北城制圧':'敗北'} <small>T${s.turn} · 味方離脱 ${s.metrics.deaths.filter(d=>s.units.find(u=>u.id===d.id)?.team==='ally').length}</small></div>`;
  const row=document.createElement('div');row.className='action-row';row.append(button('再試行',()=>confirmRestart(s.map.id)));if(s.status==='victory'&&s.map.id<2)row.append(button(campaign?'次章へ（離脱継承）':'次のマップ',()=>start(s.map.id+1,campaign,campaign?s.lost:[]),'primary'));root.append(row);return;
 }
 if(!u){root.innerHTML='<span class="idle-tip">青い部隊を選択。地図は指でスクロール。</span>';return;}
 const head=document.createElement('div');head.className='unit-head';head.innerHTML=`<div class="unit-name"><strong>${u.name}</strong><small>${u.label}${u.team==='ally'?` · 残${u.charges}`:''}${u.acted?' · 行動済':''}</small></div><span class="hp">${u.hp}<small>/${u.maxHp}</small></span>`;
 if(u.team==='ally'&&!u.acted)head.append(button(view.menu?'地図':'命令',()=>{view.menu=!view.menu;refresh();},'subtle'));
 head.append(button('詳細',()=>unitDetails(u),'subtle'),button('解除',()=>{resetSelection();refresh();},'subtle'));root.append(head);
 if(u.team==='enemy'){
  const names={hold:'このマスを守り動かない',defend:'初期位置の周囲3マスまで守備',advance:'接近し射程内へ攻撃',skirmish:'西側の部隊を追う。東道は追わない',raid:'空いた本陣へ突入。回復・弓も狙う'};
  const p=document.createElement('div');p.className='preview';p.textContent=`敵方針：${names[u.ai]}。赤い範囲は最大到達攻撃域。`;root.append(p);return;
 }
 if(u.acted||locked){const p=document.createElement('p');p.className='hint';p.textContent=u.command?`P3準備：${{support:'待機攻撃',heal:'待機回復'}[u.command]}。支援の対象と温存は「詳細」で変更できます。`:'このターンは行動済みです。';root.append(p);return;}
 const dest=view.dest||u,target=s.units.find(t=>t.id===view.target),moved=E.dist(u,dest)>0;
 const row=document.createElement('div');row.className='command-row';
 const normal=button('攻撃',()=>{view.action='attack';view.target=null;refresh();});normal.setAttribute('aria-label','通常攻撃');normal.classList.toggle('chosen',view.action==='attack');row.append(normal);
 const wait=button('待機',()=>{view.action='wait';view.target=null;refresh();});wait.classList.toggle('chosen',view.action==='wait');row.append(wait);root.append(row);
 let message=`${moved?`(${dest.x+1}, ${dest.y+1})へ移動`:'その場で'} · 攻撃／待機を選択`;
 if(view.action==='attack')message='敵をタップ、または仮の駒から敵へフリック';
 if(view.action==='wait'){
  const command=E.waitCommand(u,dest),t=command?E.supportTarget(s,u):null;
  message=command?`P3${command==='heal'?'回復':'攻撃'}準備・P2反撃なし。候補：${t?t.name:'なし'}${u.spend?'':'（温存）'}`:'通常待機。P3スキルなし、射程が合えばP2反撃。';
 }
 if(target&&view.action==='attack'){
  const valid=E.inRange({...u,...dest},target),p=E.prediction(s,u,target,dest);
  message=valid?`${target.name}へ ${p.damage}${p.damage>=target.hp?'・撃破':''} / 反撃 ${p.counter}${p.counter>=u.hp?' ⚠ 離脱の危険':''}`:`${target.name}は射程外。移動先を選んでください。`;
 }
 const pre=document.createElement('div');pre.id='actionPreview';pre.className='preview';pre.textContent=!view.menu&&!view.action?'青い範囲をタップ／スライド。その場なら「命令」。':message;pre.setAttribute('aria-live','polite');root.append(pre);
 const bottom=document.createElement('div');bottom.className='confirm-row';bottom.append(button('取消',cancelDraft));
 const confirm=button('この命令を確定',commit,'primary');confirm.id='confirmOrder';confirm.disabled=!view.action||!!E.validateAction(s,u.id,dest,view.action,view.target);bottom.append(confirm);root.append(bottom);
}
function supportControls(root,u){const t=E.supportTarget(s,u);const p=document.createElement('p');p.className='hint';p.textContent=`P3の現時点候補：${t?t.name:'なし'}。敵移動・被害後に再判定。${u.skill==='support'?'指定→撃破可能→攻撃力順':'指定→HP割合が低い順。欠損4以上'}。対象なしは消費0。`;root.append(p);
 root.append(button(u.spend?'消費許可：ON':'消費許可：温存',()=>{if(locked)return;u.spend=!u.spend;save();refresh();unitDetails(u);}));
 const select=document.createElement('select');select.className='focus-select';select.setAttribute('aria-label','待機支援の優先対象');select.add(new Option('対象は自動選択',''));
 for(const a of E.alive(s,u.skill==='support'?'enemy':'ally').filter(a=>a.id!==u.id))select.add(new Option(`${a.name}を優先（射程外なら自動）`,a.id));select.value=u.focus||'';select.onchange=()=>{if(locked)return;u.focus=select.value||null;save();refresh();unitDetails(u);};root.append(select);
}
function commit(){if(locked||s.phase!==1||s.status!=='playing')return;const u=selected();if(!u||!view.action)return;const r=E.act(s,u.id,view.dest||u,view.action,view.target);if(!r.ok){modal(`<p>${r.error}</p>`);return;}resetSelection();save();refresh();}
function selectUnit(u){view.selected=u.id;view.dest={x:u.x,y:u.y};view.action=null;view.target=null;view.menu=false;view.route=[];
 // Move the window, never the battlefield. Keep its position through submenus.
 view.dock=(u.y+.5)*view.tile-vp.scrollTop>vp.clientHeight/2?'top':'bottom';
 view.side=(u.x+.5)*view.tile-vp.scrollLeft>vp.clientWidth/2?'left':'right';refresh();}
function mapPoint(clientX,clientY){const r=canvas.getBoundingClientRect();return {x:Math.floor((clientX-r.left)/view.tile),y:Math.floor((clientY-r.top)/view.tile)};}
function draftMove(u,p){const route=E.routeTo(s,u,p);if(!route.length)return false;
 view.dest={x:p.x,y:p.y};view.route=route;view.target=null;view.action=null;return true;
}
function mapTap(clientX,clientY){
 if(locked||s.status!=='playing'||$('modal').open)return;
 const p=mapPoint(clientX,clientY);if(!E.terrain(s,p))return;
 const u=E.at(s,p),a=selected();
 if(a?.team==='ally'&&!a.acted&&u?.team==='enemy'){view.target=u.id;view.menu=true;view.action='attack';refresh();return;}
 if(u){if(u.id===view.selected){resetSelection();refresh();}else selectUnit(u);return;}
 if(a?.team==='ally'&&!a.acted){if(draftMove(a,p)){view.menu=true;refresh();}}else{resetSelection();refresh();}
}
bindMapInput(vp,mapTap,(clientX,clientY)=>{
 const u=selected();if(locked||s.status!=='playing'||$('modal').open||u?.team!=='ally'||u.acted)return null;
 const p=mapPoint(clientX,clientY);
 // A drag outside the movement area pans; the blue area edits the route.
 if(!E.routeTo(s,u,p).length)return {pan:true};
 const before=structuredClone(view),anchor={...view.dest},canAim=E.dist(p,anchor)===0;
 const update=(x,y)=>{const next=mapPoint(x,y),enemy=E.at(s,next);
  if(canAim&&enemy?.team==='enemy'){
   view.dest={...anchor};view.route=E.routeTo(s,u,anchor);view.action='attack';view.target=enemy.id;
  }else draftMove(u,next);
  draw();
 };
 return {move:update,end:(x,y)=>{update(x,y);view.menu=true;refresh();},cancel:()=>{Object.assign(view,before);refresh();}};
});
$('dangerBtn').onclick=()=>{view.danger=!view.danger;refresh();};
function setZoom(z){const p=center();zoom=Math.max(0,Math.min(2,z));fit();draw();recenter(p);}
$('zoomIn').onclick=()=>setZoom(zoom+1);$('zoomOut').onclick=()=>setZoom(zoom-1);
function home(){const friends=E.alive(s,'ally'),a=selected()?.team==='ally'?selected():friends.find(u=>!u.acted)||friends[0];if(a){recenter({x:a.x+.5,y:a.y+.5});mini($('minimap'),s,vp,view.tile);}}
$('homeBtn').onclick=home;let miniFrame=null;vp.addEventListener('scroll',()=>{if(miniFrame===null)miniFrame=requestAnimationFrame(()=>{miniFrame=null;mini($('minimap'),s,vp,view.tile);});},{passive:true});
$('minimap').onclick=ev=>{const r=ev.target.getBoundingClientRect();recenter({x:(ev.clientX-r.left)/r.width*s.map.w,y:(ev.clientY-r.top)/r.height*s.map.h});};
$('objective').onclick=()=>modal(`<h2>${s.map.title}</h2><p>${s.map.briefing}</p><p>勝利：味方が北城へ移動して制圧。${s.map.base?'敗北：敵が本陣に侵入。':''}</p><p>${campaign?'連戦':'単体マップ'} / ${s.settings.mode==='classic'?'クラシック':'カジュアル'}。砲撃・増援の確報は戦場の上端とマップ上に表示します。</p>`);
function askEnd(){if(locked||s.status!=='playing')return;const unacted=E.alive(s,'ally').filter(a=>!a.acted);
 modal(`<h2>命令を終えますか？</h2><p>未操作 ${unacted.length}部隊は、その場で待機しP3スキルを準備します。攻撃回数0の部隊は通常待機です。</p><p>Ⅱ 敵行動 → Ⅲ 待機支援 → Ⅳ 戦場イベント。構えた部隊は敵の攻撃に反撃しません。</p><div id="endConfirm"></div>`);$('endConfirm').append(button('敵フェーズへ進む',()=>{close();runTurn();},'primary wide'));
}
$('endTurn').onclick=askEnd;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function runTurn(){if(locked||s.phase!==1||s.status!=='playing')return;
 const recovery=structuredClone(s);locked=true;resetSelection();
 try{
  if(!E.prepareEnemy(s))return;refresh();
  for(const [phase,fn,label]of [[2,E.enemyPhase,'敵軍行動'],[3,E.supportPhase,'待機支援'],[4,E.eventPhase,'戦場更新']]){
   if(s.status!=='playing')break;s.phase=phase;$('phaseFlash').textContent=label;$('phaseFlash').classList.add('visible');refresh();
   await pause(matchMedia('(prefers-reduced-motion: reduce)').matches?40:260);fn(s);draw();await pause(100);$('phaseFlash').classList.remove('visible');
  }
  E.nextTurn(s);save();
 }catch(error){console.error('Turn failed',error);s=recovery;modal('<h2>進行を中断しました</h2><p>問題が起きたため、敵フェーズ開始前の状態に戻しました。記録を確認してから再試行してください。</p>');}
 finally{locked=false;$('phaseFlash').classList.remove('visible');$('phaseFlash').textContent='';refresh();}
}
function start(id,chain=false,lost=[]){s=E.createGame(id,settings,lost);campaign=chain;resetSelection();zoom=0;close();save();refresh();home();}
function confirmRestart(id){modal('<h2>再試行</h2><p>このマップ開始時の部隊構成に戻ります。現在の戦闘記録は消えます。</p><div id="restartConfirm"></div>');const startLost=campaign?s.lost.filter(id=>!s.metrics.deaths.some(d=>d.id===id)):[];$('restartConfirm').append(button('再試行する',()=>start(id,campaign,startLost),'danger wide'));}
function showMenu(){if(locked)return;modal(`<h2>戦場を選ぶ</h2><div id="maps"></div><div id="campaignStart"></div><details id="settingsDetails"><summary>難易度・回復・スキル回数の設定</summary><div class="settings"><label>離脱の扱い<select id="mode"><option value="classic">クラシック（永久離脱）</option><option value="casual">カジュアル（次章復帰）</option></select></label><label>敵の攻撃<select id="difficulty"><option value="-2">練習 −2</option><option value="0">標準 ±0</option><option value="2">挑戦 ＋2</option></select></label><label>枯渇後の回復<select id="healing"><option value="H1">H1：半分まで＋1</option><option value="H0">H0：上限なし＋1</option><option value="H2">H2：今ターン負傷のみ＋1</option></select></label><label>スキル回数<select id="charges"><option value="">兵種ごとの初期値</option><option value="1">一律1回</option><option value="4">一律4回</option></select></label></div><p class="hint">次に開始する戦闘へ適用。現在の戦闘は下の「戦場へ戻る」で続行できます。</p></details><details><summary>遊び方・勝敗と4フェーズ</summary><p>青部隊 → 水色の移動先をタップ／スライド → 攻撃・待機 → 確定。仮の駒から敵へフリックしても攻撃対象を選べます。範囲外からのドラッグは地図スクロール。その場で行動する時は「命令」。命令欄の「地図」で小さく戻せます。移動先は四隅のカーソルと半透明の駒で表示。確定前なら取消可能。同じ部隊の再タップか「解除」で選択を外せます。</p><p>Ⅰ 味方行動 → Ⅱ 敵軍 → Ⅲ 味方の待機支援 → Ⅳ 予告イベント。通常攻撃は射程が合えば反撃されます。構えた部隊はⅡで反撃しませんが、Ⅲの射撃にも反撃はありません。</p><p>動かず待機するとP3の自動攻撃／回復を準備。移動後の待機にはP3スキルなし。前衛・魔道・騎兵は通常射程、弓の待機攻撃は2〜3、祈祷・救護は隣接7回復。攻撃の残回数0は通常待機、回復の残回数0は応急回復になります。対象や温存は「詳細」で指定できます。</p><p>北城に入れば勝利。本陣があるマップは敵に入られると敗北。砲撃は予告の赤枠に固定6、次のⅠで退避できます。増援は到着した次ターンから行動。出現地点の占有で到着を止められます。</p><p>森は移動コスト2・守備＋1、砦は守備＋1。射線遮蔽や属性相性は今回ありません。</p></details><details><summary>このゲーム・検証記録</summary><p>戦線指揮 / FIELD COMMAND v${RELEASE}。オリジナルの戦術試作。命中100%、必殺なし。データは data.js、数値は config.js、戦闘は engine.js。戦闘記録から検証JSONを持ち出せます。</p><p>保存はこの端末内のみ。同じ版の確定済み命令・P1・勝敗状態を復元します。版の更新時には新規試験になります。</p><p><a href="https://github.com/hane-san/SRPG" target="_blank" rel="noopener">GitHubでソースを開く</a> · <a href="docs/balance.md" target="_blank">仕様とバランス検討</a></p></details><div id="utility" class="action-row"></div>`);
 $('mode').value=settings.mode;$('difficulty').value=String(settings.enemyAttack);$('healing').value=settings.healing;$('charges').value=settings.charges==null?'':String(settings.charges);
 function getSettings(){settings={mode:$('mode').value,enemyAttack:Number($('difficulty').value),healing:$('healing').value};if($('charges').value)settings.charges=Number($('charges').value);}
 for(const m of MAPS){const card=document.createElement('div');card.className='map-card'+(s.map.id===m.id?' active':'');card.innerHTML=`<div><strong>${m.title}</strong><small>${m.subtitle}</small></div>`;card.append(button('開始',()=>{getSettings();start(m.id);}));$('maps').append(card);}
 $('campaignStart').append(button('第1章から連戦（離脱を引き継ぐ）',()=>{getSettings();start(0,true);},'primary wide'));
 $('utility').append(button('この戦闘を再試行',()=>confirmRestart(s.map.id)),button('最新版を確認',async()=>{try{const r=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const v=await r.json();if(v.version===RELEASE)modal(`<h2>最新版です</h2><p>現在 v${RELEASE}。</p>`);else{modal(`<h2>新しい版があります</h2><p>更新すると戦闘途中の保存はリセットされます。</p><div id="update"></div>`);$('update').append(button('更新して再起動',()=>{location.href=`./?v=${Date.now()}`;},'primary wide'));}}catch{modal('<p>更新確認ができませんでした。接続を確かめてください。</p>');}}));
}
$('menuBtn').onclick=showMenu;
function roster(){if(locked)return;modal('<h2>部隊表</h2><div id="rosterList"></div>');const list=$('rosterList');for(const u of s.units.filter(a=>a.team==='ally')){const p=document.createElement('p');const rosterButton=button(`${u.name} ${u.glyph} · ${u.alive?`HP ${u.hp}/${u.maxHp} 残${u.charges}`:s.settings.mode==='classic'?'永久離脱':'撤退'}`,()=>{close();selectUnit(u);vp.scrollTop=u.y*view.tile-vp.clientHeight/2;vp.scrollLeft=u.x*view.tile-vp.clientWidth/2;});rosterButton.disabled=!u.alive;p.append(rosterButton);list.append(p);}if(s.lost.length){const p=document.createElement('p');p.textContent=`連戦の離脱記録：${s.lost.join(', ')}`;list.append(p);}}
$('rosterBtn').onclick=roster;
$('logBtn').onclick=()=>{if(locked)return;modal(`<h2>戦闘記録</h2><p>T${s.turn} / 再命令 ${s.metrics.commands} / 支援発動 ${s.metrics.supports} / 支援不発 ${s.metrics.misfires} / 消費 ${s.metrics.charges}</p><div id="export"></div><div id="logs"></div>`);$('export').append(button('検証記録をコピー',async()=>{const report=JSON.stringify({release:RELEASE,map:s.map.id,settings:s.settings,campaign,metrics:s.metrics,units:s.units,log:s.log},null,2);try{await navigator.clipboard.writeText(report);$('export').textContent='コピーしました';}catch{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([report],{type:'application/json'}));a.download='srpg-playtest.json';a.textContent='検証記録JSONを保存';$('export').append(a);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}}));for(const line of [...s.log].reverse()){const p=document.createElement('div');p.className='log-line';p.textContent=line;$('logs').append(p);}};
window.addEventListener('resize',()=>{const p={x:(vp.scrollLeft+lastSize.w/2)/view.tile,y:(vp.scrollTop+lastSize.h/2)/view.tile};refresh();recenter(p);});
// Explicit test controls are available only with ?debug=1; normal play has none.
if(new URLSearchParams(location.search).has('debug'))window.srpgDebug={snapshot:()=>structuredClone(s),draft:()=>structuredClone(view),select:id=>{const u=s.units.find(u=>u.id===id);if(u)selectUnit(u);},start:(id,opts={})=>{settings={...settings,...opts};start(id);}};
refresh();requestAnimationFrame(home);
if(!stored)showMenu();
