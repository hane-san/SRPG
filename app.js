import {openGemDemo} from './gem-demo.js?v=0.8.0-gems28';
import {RELEASE,SKILLS,PROMOTIONS,RULES} from './config.js?v=0.8.0-p3-26-sortie29';
import {MAPS} from './data.js?v=0.8.0-issue17-p3-26-sortie29';
import * as E from './engine.js?v=0.8.0-issue17-p3-26-sortie29';
import {render,mini} from './render.js?v=0.8.0-position22-p3-26-sortie29-issue24-gems28-flick35-fx39';
import {bindMapInput,createHoldLock} from './ui-input.js?v=0.8.0-issue24';
import {readSave,writeSave} from './save.js?v=0.8.0-p3-26';
import {attackTargets,battleForecast,nextReady,slideDraft,routeSummary} from './ui-model.js?v=0.8.0-position22-p3-26';
import {createAudio} from './audio.js?v=0.8.0-issue17-sortie29-issue24-gems28-flick35';
import {createMusic,buildTrack,SCORES,BONUS_SCORES,MUSIC_LIBRARY,trackNumber,assignedTrackNumber,trackByNumber} from './music.js?v=0.8.0-library42';
import {createPlayback} from './playback.js?v=0.8.0-issue17-sortie29-gems28-flick35-fx39';
import {DISPLAY_NAME} from './display-name.js?v=0.8.0-display-2fb0ebb2368b';
const $=id=>document.getElementById(id),canvas=$('battlefield'),vp=$('mapViewport');
let s,campaign=false,settings={mode:'classic',healing:'H1',enemyAttack:0},zoom=0,locked=false;
let lastSize={w:0,h:0};
let view={selected:null,dest:null,target:null,action:null,danger:false,tile:32,cursor:null};
let fast=false;try{fast=localStorage.getItem('field-command-fast')==='true';}catch{}
const sound=createAudio(),music=createMusic();
let battleCard=null,lastNotice=null,pendingUndo=null;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const playback=createPlayback({getState:()=>s,setState:state=>{s=state;},view,draw,sound,isFast:()=>fast,isReduced:reduced,onCombat:presentCombat,onMessage:message=>{$('phaseFlash').textContent=message;$('phaseFlash').classList.add('visible');}});
for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>{sound.unlock();music.unlock();},{capture:true,passive:true});
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let stored=null;try{stored=readSave(localStorage,RELEASE,MAPS);}catch{/* storage may be disabled */}
if(stored){s=stored.state;campaign=stored.campaign;settings=s.settings;}else s=E.createGame(0,settings);
function save(state=s){try{writeSave(localStorage,RELEASE,state,campaign);}catch{}}
function modal(html,canClose=true){music.stopPreview();$('modalBody').innerHTML=html;$('closeModal').hidden=!canClose;if(!$('modal').open)$('modal').showModal();$('modal').scrollTop=0;}
function close(){music.stopPreview();$('modal').close();}
$('modal').addEventListener('cancel',()=>music.stopPreview());
$('modal').addEventListener('close',()=>music.stopPreview());
$('closeModal').onclick=close;
function button(text,fn,cls=''){const b=document.createElement('button');b.textContent=text;if(cls)b.className=cls;b.onclick=ev=>{sound.unlock();fn(ev);};return b;}
function selected(){const u=s.units.find(a=>a.id===view.selected);return view.sortie&&u?view.sortieUnit:u;}
function resetSelection(){Object.assign(view,{selected:null,dest:null,target:null,action:null,menu:false,route:[],invalid:false,attackError:null,dragging:false,destinationPress:false,moveArmed:false,sortie:false,sortieUnit:null});}
function center(){return {x:(vp.scrollLeft+vp.clientWidth/2)/view.tile,y:(vp.scrollTop+vp.clientHeight/2)/view.tile};}
function recenter(p){vp.scrollLeft=p.x*view.tile-vp.clientWidth/2;vp.scrollTop=p.y*view.tile-vp.clientHeight/2;}
function fit(){lastSize={w:vp.clientWidth,h:vp.clientHeight};view.tile=Math.max(20,Math.floor(vp.clientWidth/s.map.w))*[1,1.4,1.9][zoom];$('zoomLabel').textContent=['全幅','×1.4','×1.9'][zoom];}
function draw(){render(canvas,s,view);mini($('minimap'),s,vp,view.tile);}
function refresh(){
 music.setScene(s.map.id,s.phase,s.status);
 $('turn').textContent=`T${s.turn}`;$('phaseName').textContent=s.status==='victory'?'勝利':s.status==='defeat'?'敗北':['','味方','敵軍','支援','戦場'][s.phase];
 $('objective').textContent=s.map.base?'北城制圧 / 本陣死守':'北城制圧';
 const weather=s.map.weatherCycle?`T${s.turn} ${E.WEATHER[E.weatherAt(s)].label} → T${s.turn+1} ${E.WEATHER[E.weatherAt(s,s.turn+1)].label} · 歩兵−${E.WEATHER[E.weatherAt(s)].foot}/騎兵−${E.WEATHER[E.weatherAt(s)].horse}（最低1）`:'';
 const warning=[weather,s.warnings.map(w=>`T${w.turn} ${w.kind==='cannon'?`終了時：赤枠に砲撃 −${RULES.barrageDamage}`:'終了時：紫枠に増援'}`).join(' ／ ')].filter(Boolean).join(' ／ ');
 $('forecast').hidden=!warning;$('forecast').textContent=warning;
 const ready=E.alive(s,'ally').filter(u=>!u.acted).length;
 $('moveUndo').hidden=locked||!!view.dragging||!pendingUndo||s.phase!==1||s.status!=='playing';
 $('endTurn').disabled=locked||view.dragging||s.status!=='playing';$('endTurn').textContent=locked?'進行中…':`命令終了 (${ready}) →`;
 $('nextUnit').disabled=locked||view.dragging||s.status!=='playing'||!ready;
 $('soundBtn').textContent=sound.enabled?'SE ON':'SE OFF';$('soundBtn').setAttribute('aria-pressed',String(sound.enabled));
 $('menuBtn').disabled=locked||!!view.dragging;$('dangerBtn').setAttribute('aria-pressed',String(view.danger));
 for(const id of ['rosterBtn','logBtn'])$(id).disabled=locked||!!view.dragging;
 for(const id of ['zoomIn','zoomOut','homeBtn','dangerBtn','toolsToggle'])$(id).disabled=!!view.dragging;
 vp.classList.toggle('routing',!locked&&s.status==='playing'&&selected()?.team==='ally'&&!selected().acted);
 panel();fit();placeOrders();draw();
}
function placeOrders(){
 const root=$('orders'),u=selected();for(const k of ['top','bottom','left','right'])root.style.removeProperty(k);delete root.dataset.pointer;
 root.dataset.location='outside-map';if(u)root.dataset.destination=`${(view.dest||u).x},${(view.dest||u).y}`;
 const editing=s.status==='playing'&&u?.team==='ally'&&!u.acted&&(view.dragging||!view.menu);
 root.hidden=!!editing;$('commandHint').hidden=!editing;
 if(editing){
  const dest=view.dest||u,summary=routeSummary(s,u,dest,view.route?.length?view.route:[u]),target=s.units.find(t=>t.id===view.target);
  const hint=$('commandHint');hint.replaceChildren();
  const route=document.createElement('strong');route.className='route-readout';route.textContent=`移動先 (${dest.x+1}, ${dest.y+1}) · コスト ${summary.cost??'—'}/${summary.budget} · ${summary.weather}`;
  const detail=document.createElement('span');detail.className='route-intent';
  detail.textContent=view.attackError||(target?(()=>{const f=battleForecast(s,u,target,dest);return `${target.name} · 自HP ${u.hp}→${f.allyAfter} ／ 敵HP ${target.hp}→${f.enemyAfter} · 反撃${f.counter} · 敵の上で離して攻撃`;})():view.moveArmed?'移動先を固定しました · 離すと移動、敵へ滑らせると攻撃':`通常攻撃 ${summary.targets}隊 · 金の目印が対象`);
  const help=document.createElement('span');help.className='route-help';help.textContent=view.target&&view.dragging?'敵の上で離すと攻撃確定':view.moveArmed?'カチャッ · 離すと移動確定':view.destinationPress&&!view.target?'敵へスライド。選ばず離すと取消':view.dragging?'敵まで滑らせて離すと直接攻撃／移動だけは0.2秒保持':'部隊からスライド（静止待機は命令欄から）';
  hint.append(route,detail,help);
 }
}
function cancelDraft(){const u=selected();if(u)view.cursor={x:u.x,y:u.y};sound.play('cancel');resetSelection();refresh();}
function unitDetails(u){const ai={hold:'このマスを守り動かない',defend:'初期位置の周囲3マスまで守備',advance:'接近し射程内へ攻撃',skirmish:'西側の部隊を追う。東道は追わない',raid:'空いた本陣へ突入。回復・弓も狙う'},risk=view.dest&&u.team==='ally'?E.threatAt(s,view.dest,u):null;
 modal(`<h2>${escapeHTML(u.name)} · ${escapeHTML(u.label)}</h2><p>HP ${u.hp}/${u.maxHp}　攻撃 ${u.atk}　軽減 ${u.def}${u.specialty?`　固有：${PROMOTIONS[u.specialty].label}`:''}<br>移動 ${E.movement(s,u)}（基礎${u.move}）　射程 ${u.team==='ally'&&u.skill==='heal'?'P3回復：隣接1':u.range.join('–')}${u.team==='ally'&&u.skill==='support'?` / P3砲撃 ${E.supportRange(u).join('–')}`:''}</p>${u.team==='ally'?`<p>${SKILLS[u.skill].label}${u.skill==='none'?'':`：待機弾薬 ${u.charges}/${u.maxCharges}`}<br>${SKILLS[u.skill].text}</p><p>${u.type==='bow'?'弓の射程は2で隣接不可。<br>':''}仮の移動先のP2被害上限：${risk}。各敵の単独到達を合算した安全側の値で、敵同士の進路競合やP3の効果を省いています。</p>`:`<p>敵方針：${ai[u.ai]||'方針なし'}。</p>`}<div id="unitDetailControls"></div>`);
 if(u.team==='ally'&&!view.sortie&&['heal','support'].includes(u.skill))supportControls($('unitDetailControls'),u);
}
function panel(){
 const root=$('orders'),u=selected();root.innerHTML='';root.className=s.status!=='playing'?'result':u?'selected'+(u.team==='enemy'||u.acted?' readonly':!view.menu?' choosing':''):'idle';
 if(s.status!=='playing'){
  root.innerHTML=`<div class="result-title">${s.status==='victory'?'北城制圧':'敗北'} <small>T${s.turn} · 味方離脱 ${s.metrics.deaths.filter(d=>s.units.find(u=>u.id===d.id)?.team==='ally').length}</small></div>`;
  const row=document.createElement('div');row.className='action-row';row.append(button('再試行',()=>confirmRestart(s.map.id)));if(s.status==='victory'&&s.map.id<2){if(campaign&&s.map.id===1)row.append(button('上級職の技能を選ぶ',promotionMenu));row.append(button(campaign?'次章へ（補充と昇格）':'次のマップ',()=>start(s.map.id+1,campaign,campaign?s.lost:[],campaign?s.specialties:{}),'primary'));}root.append(row);return;
 }
 if(!u){if(battleCard||lastNotice){renderReport(root);return;}if(locked){root.textContent='部隊が行動中…';return;}
   const hint=document.createElement('span');hint.textContent=E.alive(s,'ally').length?'部隊を動かすか、本城から追加出撃。':'全員本城で待機中。城をタップして出撃！';root.append(hint);
   const b=button(`出撃可 ${E.canDeploy(s)?E.deploymentLimit(s)-s.deployedThisTurn:0}隊 / 予備${E.reserves(s).length}隊`,openDeployment,'subtle');b.disabled=!E.canDeploy(s);root.append(b);return;}
 const dest=view.dest||u,targets=u.team==='ally'&&!u.acted?attackTargets(s,u,dest):[],target=targets.find(t=>t.id===view.target);
 const head=document.createElement('div');head.className='unit-head';head.innerHTML=`<strong>${escapeHTML(u.name)}${view.sortie?' · 出撃準備':''}</strong><span><b class='hp-value ${u.hp<=2?'hp-critical':''}'>HP ${u.hp}/${u.maxHp}</b> · ${escapeHTML(u.label)}${target?` → ${escapeHTML(target.name)}`:''}</span>`;root.append(head);
 const pre=document.createElement('div');pre.id='actionPreview';pre.className='preview';pre.setAttribute('aria-live','polite');
 if(u.team==='enemy')pre.textContent='敵部隊：詳細で能力と方針を確認';
 else if(u.acted)pre.textContent=u.command?`P3${u.command==='heal'?'回復':'攻撃'}を準備中`:'行動済み';
 else if(view.attackError)pre.textContent=view.attackError;
 else if(target){
  const p=battleForecast(s,u,target,dest);pre.classList.add('combat-forecast');
  const bar=(hp,max,kind)=>`<div class="hp-track ${kind}" aria-hidden="true"><i style="width:${Math.max(0,hp/max*100)}%"></i></div>`;
  pre.innerHTML=`<div class="forecast-side ally"><span>自HP ${u.hp} → ${p.allyAfter}</span>${bar(p.allyAfter,u.maxHp,'ally')}<small class="${p.allyAfter===0?'fatal':''}">反撃 ${p.counter}${p.allyAfter===0?' · ⚠ 離脱':''}</small></div><div class="forecast-side enemy"><span>敵HP ${target.hp} → ${p.enemyAfter}</span>${bar(p.enemyAfter,target.maxHp,'enemy')}<small>攻撃 ${p.damage}${p.enemyAfter===0?' · 撃破':u.type==='bow'?' · 隣接不可':u.type==='shooter'?' · 距離3は1':''}</small></div>`;
 }
 else{const command=E.waitCommand(u,dest);pre.textContent=(s.map.base&&E.dist(u,s.map.base)===0&&E.dist(dest,u)>0?'本陣から離れます ／ ':'')+(u.type==='bow'?'弓2マス・隣接不可 ／ ':u.type==='shooter'?'砲兵は移動せずP3砲撃 ／ ':u.skill==='heal'?'魔術師系は移動せずP3治療 ／ ':'')+(command==='heal'?'待機：P3回復・P2反撃なし':command==='support'?'待機：P3攻撃・P2反撃なし':'待機：P3なし');}
 root.append(pre);
 const row=document.createElement('div');row.className='command-row';
 if(u.team==='ally'&&!u.acted){
  const attack=button('攻撃',()=>commit('attack'),'attack primary');attack.id='attackOrder';attack.disabled=!E.canNormalAttack(u)||!target||!!view.dragging;attack.setAttribute('aria-label','攻撃');
  const preparing=E.waitCommand(u,dest);
  const wait=button(preparing?'待機\n無反撃':'待機',()=>commit('wait'),'primary');wait.title=preparing?'その場で待機：P3準備・P2反撃なし':'通常待機：P3なし';wait.setAttribute('aria-label',wait.title);wait.id='waitOrder';wait.disabled=!!view.dragging;row.append(attack,wait);if(s.map.camp&&E.dist(u,s.map.camp)<=1)row.append(button('帰還',()=>{const result=E.returnToReserve(s,u.id);if(result.ok){pendingUndo=null;lastNotice={title:'帰還',text:`${u.name}は予備隊に戻りました`};resetSelection();save();refresh();}},'subtle'));row.append(button('戻る',cancelDraft,'subtle'));
  if(targets.length>1){const cycle=button('対象 ↻',()=>{const i=targets.findIndex(t=>t.id===view.target);view.target=targets[(i+1)%targets.length].id;view.attackError=null;sound.play('cursor');refresh();},'subtle');cycle.id='targetCycle';cycle.setAttribute('aria-label','次の攻撃対象');row.append(cycle);}
 }else row.append(button('解除',()=>{resetSelection();refresh();},'subtle'));
 row.append(button('詳細',()=>unitDetails(u),'subtle'));row.style.setProperty('--choices',row.childElementCount);root.append(row);
}
function renderReport(root=$('orders')){
 root.className='battle-report';root.hidden=false;$('commandHint').hidden=true;
 const title=lastNotice?.title||battleCard?.title||'行動中';
 let body=lastNotice?.text?`<div class="report-note">${escapeHTML(lastNotice.text)}</div>`:'';
 if(battleCard)body=`<div class="combatants">${battleCard.units.map(u=>`<div class="combatant ${u.team}"><strong>${escapeHTML(u.name)}</strong><div class="hp-track ${u.team}" aria-hidden="true"><i style="width:${Math.max(0,u.hp/u.maxHp*100)}%"></i></div><span>HP ${u.startHp} → <b>${u.hp}</b>${u.hp===0?` · ${u.team==='enemy'?'撃破':'離脱'}`:''}</span></div>`).join('')}</div>`;
 root.innerHTML=`<div class="report-title" role="status">${escapeHTML(title)}</div>${body}<div class="report-tail"><span class="report-tail-text">${escapeHTML(lastNotice?.tail||(locked?'戦闘を表示中':'続けて部隊を選択できます'))}</span></div>`;
 if(!locked&&s.status==='playing'&&s.phase===1){const b=button(`出撃可 ${E.canDeploy(s)?E.deploymentLimit(s)-s.deployedThisTurn:0}隊 / 予備${E.reserves(s).length}隊`,openDeployment,'report-sortie subtle');b.disabled=!E.canDeploy(s);root.querySelector('.report-tail').append(b);}
}
function presentCombat(before,after,event,stage){
 const actor=before.units.find(u=>u.id===event.actor),target=before.units.find(u=>u.id===event.target);
 const participants=[actor,target].filter((u,i,a)=>u&&a.findIndex(v=>v?.id===u.id)===i).sort((a,b)=>Number(a.team==='enemy')-Number(b.team==='enemy'));
 if(stage==='windup'&&(!event.counter||!battleCard||!participants.every(u=>battleCard.units.some(a=>a.id===u.id))))battleCard={units:participants.map(u=>({id:u.id,name:u.name,team:u.team,maxHp:u.maxHp,startHp:u.hp,hp:u.hp}))};
 if(!battleCard)return;
 const label=event.kind==='heal'?'回復':event.counter?'反撃':!actor?'砲撃':s.phase===3?'待機攻撃':actor.team==='enemy'?'敵の攻撃':'攻撃';
 battleCard.title=`${label}${stage==='impact'?` ${event.kind==='heal'?'+':'−'}${event.amount}`:''} · ${actor?.name||'城砲'} → ${target?.name||''}`;
 for(const u of battleCard.units)u.hp=after.units.find(a=>a.id===u.id)?.hp??u.hp;
 lastNotice=null;renderReport();
}
function openDraft(){
 const u=selected();if(!u||u.acted||u.team!=='ally')return;
 const targets=attackTargets(s,u,view.dest||u);if(view.attackError)view.target=null;else if(!targets.some(t=>t.id===view.target))view.target=targets[0]?.id||null;
 view.menu=true;view.invalid=false;view.action=null;refresh();
}
function supportControls(root,u){const targets=E.supportTargets(s,u);const p=document.createElement('p');p.className='hint';p.textContent=`P3の現時点候補：${targets.length?targets.map(t=>u.skill==='heal'?`${t.name}＋${E.healAmount(s,u,t)}`:t.name).join('、'):'なし'}。敵移動・被害後に再判定。${u.type==='shooter'?'射程内の敵1隊。距離3は威力1':u.skill==='support'?'指定→撃破可能→攻撃力順':'隣接味方1隊を2回復'}。対象なしは消費0。`;root.append(p);
 root.append(button(u.spend?'消費許可：ON':'消費許可：温存',()=>{if(locked)return;pendingUndo=null;u.spend=!u.spend;save();refresh();unitDetails(u);}));
 if(u.skill==='heal')return;
 const select=document.createElement('select');select.className='focus-select';select.setAttribute('aria-label','待機支援の優先対象');select.add(new Option('対象は自動選択',''));
 for(const a of E.alive(s,'enemy'))select.add(new Option(`${a.name}を優先（射程外なら自動）`,a.id));select.value=u.focus||'';select.onchange=()=>{if(locked)return;pendingUndo=null;u.focus=select.value||null;save();refresh();unitDetails(u);};root.append(select);
}
async function commit(action){
 if(locked||view.dragging||s.phase!==1||s.status!=='playing')return;const u=selected();if(!u||!['attack','wait'].includes(action))return;
 const eligibleUndo=action==='wait'&&!view.sortie&&E.dist(u,view.dest||u)>0;
 const undoCandidate=eligibleUndo?{state:structuredClone(s),id:u.id}:null;
 const resolved=structuredClone(s),frames=[],record=(state,actor,event)=>{if(event&&event.kind!=='settled')frames.push({state:structuredClone(state),event});};
 const r=view.sortie?E.deployAndAct(resolved,u.id,view.dest||u,action,view.target,record):E.act(resolved,u.id,view.dest||u,action,view.target,record);if(!r.ok){sound.play('cancel');lastNotice={title:'出撃不可',text:r.error};refresh();return;}
 pendingUndo=null;battleCard=null;lastNotice={title:`${u.name} · ${action==='attack'?'攻撃':'待機'}`,text:'移動を表示中',tail:'確定済み'};
 locked=true;resetSelection();refresh();sound.play('confirm');save(resolved);
 try{await playback.play(frames);}catch(error){console.error('Presentation skipped',error);}
 finally{s=resolved;playback.clear();locked=false;pendingUndo=undoCandidate;if(!battleCard){const moved=E.dist(u,resolved.units.find(a=>a.id===u.id))>0,command=resolved.units.find(a=>a.id===u.id)?.command;lastNotice={title:`${u.name} · ${moved?'移動待機':'待機'}`,text:command?`P3${command==='heal'?'隣接回復':'攻撃'}を準備 · P2反撃なし`:'通常待機 · P3なし',tail:'続けて部隊を選択できます'};}$('phaseFlash').classList.remove('visible');save();refresh();vp.focus({preventScroll:true});}
}
function undoMove(){
 if(locked||view.dragging||!pendingUndo||s.status!=='playing'||s.phase!==1)return;
 const {state,id}=pendingUndo;pendingUndo=null;s=state;resetSelection();battleCard=null;lastNotice=null;
 const u=s.units.find(a=>a.id===id);if(u)selectUnit(u);else refresh();
 sound.play('cancel');save();
}
$('moveUndo').onclick=undoMove;
function selectUnit(u,open=false){battleCard=null;lastNotice=null;view.sortie=false;view.sortieUnit=null;view.selected=u.id;view.dest={x:u.x,y:u.y};view.cursor={x:u.x,y:u.y};view.keyboard=false;view.action=null;view.target=null;view.menu=false;view.route=[];
 sound.play('select');view.attackError=null;if(open&&u.team==='ally'&&!u.acted)openDraft();else refresh();}
function mapPoint(clientX,clientY){const r=canvas.getBoundingClientRect();return {x:Math.floor((clientX-r.left)/view.tile),y:Math.floor((clientY-r.top)/view.tile)};}
function draftMove(u,p,anchor=null){
 const draft=slideDraft(s,u,p,anchor?.dest||view.dest||u,{preserve:!!anchor,route:anchor?.route});view.invalid=!draft;if(!draft)return false;
 const changed=E.key(draft.dest)!==E.key(view.dest||u)||draft.target!==view.target;
 Object.assign(view,draft,{cursor:{...p},action:null});if(changed)sound.play('cursor');placeOrders();return true;
}
function mapTap(clientX,clientY){
 if(locked||s.status!=='playing'||$('modal').open)return;
 const p=mapPoint(clientX,clientY);if(!E.terrain(s,p))return;if(s.map.camp&&E.dist(p,s.map.camp)===0&&(!E.at(s,p)||view.selected===E.at(s,p)?.id)){openDeployment();return;}view.cursor={...p};view.keyboard=false;vp.focus({preventScroll:true});
 const u=E.at(s,p),a=selected();
 if(a?.team==='ally'&&!a.acted&&(!u||u.team==='enemy'||u.id===a.id)){if(draftMove(a,p))openDraft();return;}
 if(u)selectUnit(u,true);else{resetSelection();refresh();}
}
bindMapInput(vp,mapTap,(clientX,clientY)=>{
 if(locked||s.status!=='playing'||$('modal').open)return {pan:true};
 const p=mapPoint(clientX,clientY),sortieOrigin=!!view.sortie&&!!s.map.camp&&E.dist(p,s.map.camp)===0,pressed=sortieOrigin?null:E.at(s,p);if(!sortieOrigin&&s.map.camp&&E.dist(p,s.map.camp)===0&&(!pressed||view.selected===pressed.id))return {pan:true,tap:()=>setTimeout(openDeployment,150)};
 const before=structuredClone(view);let u=selected();
 const ready=u?.team==='ally'&&!u.acted,same=ready&&pressed?.id===u.id;
 const destinationPress=!!(ready&&!sortieOrigin&&!pressed&&E.routeTo(s,u,p).length);
 // A previously chosen approach is reused only from the unit or the exact
 // endpoint. A random empty map cell must never inherit a distant attack route.
 const fromChosenEndpoint=before.route?.length>1&&before.dest&&E.key(p)===E.key(before.dest);
 let anchor=before.route?.length>1&&(same||fromChosenEndpoint)?{dest:before.dest,route:before.route}:null;
 const existingArrow=!!anchor;
 // No enemy-start or unrelated-cell gesture is a direct attack confirmation.
 const directAttackGesture=!!(pressed?.team==='ally'&&!pressed.acted||destinationPress||fromChosenEndpoint||sortieOrigin);
 if(pressed?.team==='ally'&&!pressed.acted){u=pressed;if(!anchor)selectUnit(u);}
 else if(!ready||(!destinationPress&&pressed?.team!=='enemy'&&!sortieOrigin&&!anchor))return {pan:true,tap:()=>{if(ready)cancelDraft();else mapTap(clientX,clientY);}};
 if(destinationPress&&!anchor){draftMove(u,p);anchor={dest:{...view.dest},route:[...view.route]};}
 view.dragging=true;view.destinationPress=destinationPress;view.menu=false;view.moveArmed=false;refresh();vp.focus({preventScroll:true});
 let lastCell=null,lockAnchor=false;
 const hold=createHoldLock(200,()=>{
  if(!view.dragging||view.invalid||view.target||view.attackError||!view.dest||E.dist(u,view.dest)===0)return;
  if(!anchor){anchor={dest:{...view.dest},route:[...view.route]};lockAnchor=true;}
  view.moveArmed=true;sound.play('lock');placeOrders();draw();
 });
 const update=(x,y,release=false)=>{
  const point=mapPoint(x,y),cell=E.key(point),enemy=E.at(s,point)?.team==='enemy';
  if(!release&&cell===lastCell)return;lastCell=cell;
  // Once locked, preserve the exact endpoint through intervening empty cells
  // on the way to a ranged target; release away from endpoint/enemy cancels.
  if(anchor&&!enemy){
   if(!hold.armed)hold.reset();
   // Leaving a target clears the intent. The drawn endpoint stays fixed.
   view.target=null;view.attackError=null;view.menu=false;view.invalid=false;
   view.cursor={...point};placeOrders();draw();return;
  }
  // Preserve the last *explicitly visited* legal destination when crossing onto
  // an enemy; slideDraft without an anchor could silently pick a new approach.
  if(enemy&&!anchor){
   const dest=view.dest||u,route=E.routeTo(s,u,dest);
   if(route.length)anchor={dest:{x:dest.x,y:dest.y},route:[...route]};
  }
  const legal=draftMove(u,point,enemy?anchor:null);
  // Keep the static command dock hidden throughout the gesture; the live HP
  // and counter preview is already shown by placeOrders().
  view.menu=false;
  if(!release){
   if(!enemy&&legal&&!view.attackError&&E.dist(u,view.dest)>0&&!anchor)hold.enter(cell);
   else if(!hold.armed)hold.reset();
  }
  placeOrders();draw();
 };
 const restore=()=>{hold.reset();for(const k of Object.keys(view))if(!(k in before))delete view[k];Object.assign(view,before);refresh();};
 const end=(x,y)=>{
  const point=mapPoint(x,y),enemy=E.at(s,point)?.team==='enemy';
  // Classify release while the lock is still armed; no command can fire on cancel.
  const quick=hold.armed;update(x,y,true);
  view.dragging=false;view.destinationPress=false;view.moveArmed=false;hold.reset();
  // A deliberate enemy release is the confirmation: no 200ms hold and no
  // second attack button. Engine legality is still checked inside commit().
  if(enemy&&view.target&&!view.invalid&&!view.attackError&&directAttackGesture){commit('attack');return;}
  if(quick&&!view.invalid&&!view.attackError&&!view.sortie){
   if(!enemy&&!view.target&&E.key(view.dest)===E.key(point)&&E.dist(u,view.dest)>0){commit('wait');return;}
   sound.play('cancel');restore();return;
  }
  if(view.invalid||(destinationPress&&!existingArrow&&!view.target&&!view.attackError)){sound.play('cancel');restore();return;}
  // A clean drag starting at the castle confirms move+wait directly.
  // Enemy release has already committed above, including a legal sortie attack.
  if(sortieOrigin&&view.sortie&&!view.target&&!view.attackError&&E.dist(view.dest,u)>0){commit('wait');return;}
  openDraft();
 };
 const tap=(x,y)=>{
  hold.reset();
  if(same){view.dragging=false;cancelDraft();return;}
  // Tapping an enemy is a deliberate *preview*, not a release-confirmed
  // attack. Keep the old "no reachable approach" explanation on taps.
  if(E.at(s,mapPoint(x,y))?.team==='enemy'){
   restore();mapTap(x,y);return;
  }
  if(destinationPress){
   view.dragging=false;view.destinationPress=false;
   if(existingArrow){update(x,y,true);openDraft();return;}
   if(attackTargets(s,u,p).length){sound.play('cancel');restore();return;}
   draftMove(u,p);commit('wait');return;
  }
  end(x,y);
 };
 return {move:update,end,tap,cancel:restore};
});
$('toolsToggle').onclick=()=>{const open=$('mapToolChoices').hidden;$('mapToolChoices').hidden=!open;$('toolsToggle').setAttribute('aria-expanded',String(open));};
$('soundBtn').onclick=()=>{sound.toggle();refresh();};
$('dangerBtn').onclick=()=>{view.danger=!view.danger;refresh();};
function setZoom(z){const p=center();zoom=Math.max(0,Math.min(2,z));fit();draw();recenter(p);}
$('zoomIn').onclick=()=>setZoom(zoom+1);$('zoomOut').onclick=()=>setZoom(zoom-1);
function home(){const friends=E.alive(s,'ally'),a=selected()?.team==='ally'?selected():friends.find(u=>!u.acted)||friends[0],p=a||s.map.camp;if(p){recenter({x:p.x+.5,y:p.y+.5});mini($('minimap'),s,vp,view.tile);}}
$('homeBtn').onclick=home;let miniFrame=null;vp.addEventListener('scroll',()=>{if(miniFrame===null)miniFrame=requestAnimationFrame(()=>{miniFrame=null;mini($('minimap'),s,vp,view.tile);placeOrders();});},{passive:true});
function nextUnit(){const u=nextReady(s,view.selected);if(!u)return;selectUnit(u,true);recenter({x:u.x+.5,y:u.y+.5});draw();vp.focus({preventScroll:true});}
$('nextUnit').onclick=nextUnit;
// Keyboard navigation is explicit camera navigation, like the minimap or roster.
vp.addEventListener('keydown',ev=>{
 if(locked||view.dragging||s.status!=='playing'||$('modal').open||ev.altKey||ev.ctrlKey||ev.metaKey||(ev.repeat&&!ev.key.startsWith('Arrow')))return;
 const k=ev.key.toLowerCase(),u=selected();
 if(k==='n'){ev.preventDefault();nextUnit();return;}
 if(k==='escape'){ev.preventDefault();if(view.menu){cancelDraft();}else if(u&&view.dest&&E.dist(u,view.dest)){cancelDraft();}else{resetSelection();refresh();}return;}
 if(['a','w'].includes(k)&&u?.team==='ally'&&!u.acted){ev.preventDefault();openDraft();commit(k==='a'?'attack':'wait');return;}
 const delta={arrowup:[0,-1],arrowdown:[0,1],arrowleft:[-1,0],arrowright:[1,0]}[k];
 if(delta){ev.preventDefault();view.keyboard=true;const origin=view.cursor||view.dest||E.alive(s,'ally')[0]||s.map.camp,p={x:Math.max(0,Math.min(s.map.w-1,origin.x+delta[0])),y:Math.max(0,Math.min(s.map.h-1,origin.y+delta[1]))};view.cursor=p;
  if(u?.team==='ally'&&!u.acted){draftMove(u,p);view.menu=false;}refresh();recenter({x:p.x+.5,y:p.y+.5});draw();return;
 }
 if(k==='enter'||k===' '){ev.preventDefault();if(u&&view.menu){$('attackOrder').disabled?$('waitOrder').focus():$('attackOrder').focus();return;}
  const p=view.cursor||view.dest||E.alive(s,'ally')[0]||s.map.camp;if(!p)return;const target=E.at(s,p);
  if(u?.team==='ally'&&!u.acted&&(!target||target.id===u.id)){openDraft();}
  else{const r=canvas.getBoundingClientRect();mapTap(r.left+(p.x+.5)*view.tile,r.top+(p.y+.5)*view.tile);}
 }
});
$('minimap').onclick=ev=>{const r=ev.target.getBoundingClientRect();recenter({x:(ev.clientX-r.left)/r.width*s.map.w,y:(ev.clientY-r.top)/r.height*s.map.h});};
$('objective').onclick=()=>modal(`<h2>${s.map.title}</h2><p>${s.map.briefing}</p><p>勝利：味方が北城へ移動して制圧。${s.map.base?'敗北：敵が本陣に侵入。':''}</p><p>${campaign?'連戦':'単体マップ'} / ${s.settings.mode==='classic'?'クラシック':'カジュアル'}。砲撃・増援の確報は戦場の上端とマップ上に表示します。</p>`);
function askEnd(){if(locked||s.status!=='playing')return;const unacted=E.alive(s,'ally').filter(a=>!a.acted);
 if(!unacted.length){runTurn();return;}
 modal(`<h2>命令を終えますか？</h2><p>未操作 ${unacted.length}部隊は、その場で待機します。砲兵・魔術師系だけは弾薬があればP3行動を準備します。</p><p>Ⅱ 敵行動 → Ⅲ 待機支援 → Ⅳ 戦場イベント。砲兵・魔術師系はP1攻撃とP2反撃ができません。</p><div id="endConfirm"></div>`);$('endConfirm').append(button('敵フェーズへ進む',()=>{close();runTurn();},'primary wide'));
}
$('endTurn').onclick=askEnd;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function runTurn(){if(locked||s.phase!==1||s.status!=='playing')return;
 pendingUndo=null;const recovery=structuredClone(s);battleCard=null;lastNotice={title:`T${s.turn} · 敵軍行動`,text:'一隊ずつ戦闘を表示します',tail:''};locked=true;resetSelection();
 try{
  if(!E.prepareEnemy(s))return;refresh();
  for(const [phase,fn,label]of [[2,E.enemyPhase,'敵軍行動'],[3,E.supportPhase,'待機支援'],[4,E.eventPhase,'戦場更新']]){
   if(s.status!=='playing')break;s.phase=phase;$('phaseFlash').textContent=label;$('phaseFlash').classList.add('visible');refresh();
   const frames=[],resolved=structuredClone(s);
   fn(resolved,(state,actor,event)=>{if(event&&event.kind!=='settled')frames.push({state:structuredClone(state),event});});
   if(frames.length){sound.play('phase');await pause(fast?0:reduced()?60:140);}
   await playback.play(frames);s=resolved;playback.clear();draw();$('phaseFlash').classList.remove('visible');
  }
  const kills=s.metrics.deaths.filter(d=>d.turn===recovery.turn&&s.units.find(u=>u.id===d.id)?.team==='enemy').length,losses=s.metrics.deaths.filter(d=>d.turn===recovery.turn&&s.units.find(u=>u.id===d.id)?.team==='ally').length;
  E.nextTurn(s);lastNotice={title:`T${recovery.turn}の結果`,text:'戦場の更新が完了しました',tail:`敵撃破 ${kills} · 味方離脱 ${losses} ／ 続けて部隊を選択`};save();
 }catch(error){console.error('Turn failed',error);s=recovery;modal('<h2>進行を中断しました</h2><p>問題が起きたため、敵フェーズ開始前の状態に戻しました。記録を確認してから再試行してください。</p>');}
 finally{playback.clear();locked=false;$('phaseFlash').classList.remove('visible');$('phaseFlash').textContent='';refresh();}
}
function requestStart(id,chain=false){
 if(s.metrics.commands===0&&s.turn===1&&s.status==='playing'){start(id,chain);return;}
 modal('<h2>新しい戦闘を開始しますか？</h2><p>現在の戦闘と連戦の進行は、新しい戦闘に置き換わります。</p><div id="newBattleConfirm"></div>');$('newBattleConfirm').append(button('新しい戦闘を開始',()=>start(id,chain),'primary wide'));
}
function start(id,chain=false,lost=[],specialties={}){pendingUndo=null;battleCard=null;lastNotice=null;s=E.createGame(id,settings,lost,{specialties});campaign=chain;resetSelection();view.cursor=null;zoom=0;close();save();refresh();home();}
function confirmRestart(id){modal('<h2>再試行</h2><p>このマップ開始時の部隊構成に戻ります。現在の戦闘記録は消えます。</p><div id="restartConfirm"></div>');const startLost=campaign?s.lost.filter(id=>!s.metrics.deaths.some(d=>d.id===id)):[];$('restartConfirm').append(button('再試行する',()=>{settings={...s.settings};start(id,campaign,startLost,s.specialties);},'danger wide'));}
function selectSortie(u){
 const virtual=E.sortieUnit(s,u.id);
 if(!virtual||!E.canDeploy(s))return;
 close();resetSelection();battleCard=null;lastNotice=null;
 Object.assign(view,{selected:u.id,sortie:true,sortieUnit:virtual,dest:{...s.map.camp},cursor:{...s.map.camp},route:[],keyboard:false,menu:false});
 sound.play('select');refresh();recenter({x:s.map.camp.x+.5,y:s.map.camp.y+.5});draw();vp.focus({preventScroll:true});
}
function openDeployment(){
 if(locked||s.status!=='playing'||s.phase!==1)return;
 resetSelection();refresh();
 const r=E.reserves(s),allowed=E.canDeploy(s);
 modal(`<h2>本城から出撃</h2><p>予備 ${r.length}隊／戦場 ${E.alive(s,'ally').length}/${RULES.maxDeployed}隊。このターン残り ${Math.max(0,E.deploymentLimit(s)-s.deployedThisTurn)}隊（初ターン2隊／以後1隊）。アイコンを選び城からスライドして出撃先を決定します。行動を確定するまで出撃枠は消費しません。</p><div id="deploymentList"></div>`);
 const root=$('deploymentList');
 if(!r.length){root.textContent='予備部隊はいません。';return;}
 if(!allowed){root.textContent='出撃上限、または本城周辺の空きがありません。';return;}
 for(const u of r){
  const row=button('',()=>selectSortie(u),'wide sortie-choice');
  const symbol=document.createElement('span');symbol.className='sortie-choice-icon';symbol.textContent=u.glyph;
  const caption=document.createElement('span');caption.className='sortie-choice-copy';caption.textContent=`${u.name} ／ ${u.label}　HP${u.hp}${u.maxCharges?' ・弾薬'+u.charges:''}`;
  row.append(symbol,caption);root.append(row);
 }
}
function promotionMenu(){
 if(!campaign||s.status!=='victory'||s.map.id<1)return;
 modal('<h2>昇格技能の選択</h2><p>次章から全員の基本性能が上級職に上昇します。生存ネームドだけが固有技能を選択できます。一般兵にも共通性能はあります。</p><div id="promotionList"></div>');
 const root=$('promotionList');
 for(const u of s.units.filter(u=>u.team==='ally'&&u.named&&u.alive)){
  const section=document.createElement('div');section.className='map-card';
  const label=document.createElement('strong');label.textContent=u.name+'：'+(PROMOTIONS[s.specialties[u.id]]?.label||'未選択');section.append(label);
  const row=document.createElement('div');row.className='action-row';
  for(const [id,skill] of Object.entries(PROMOTIONS))row.append(button(skill.label,()=>{
   if(E.assignPromotion(s,u.id,id)){save();promotionMenu();}
  },'subtle'));
  section.append(row);root.append(section);
 }
}
function showMenu(){if(locked)return;modal(`<h2>戦場を選ぶ</h2><div id="maps"></div><div id="campaignStart"></div><details id="soundRoomDetails"><summary>♪ サウンドルーム（全${MUSIC_LIBRARY.length*2}曲）</summary><p class="hint">BGMがOFFでも試聴できます。曲を切り替えると短く音が切れ、選んだ曲が頭から流れます。戦場へ戻ると試聴を終了し、元のBGM設定へ戻ります。</p><p class="hint">曲ごとの固定番号です。例：『マップ03・味方 No.37／敵 No.42』と指定できます。番号は今後追加しても変更しません。</p><div id="soundRoomMapAssignments" class="sound-room-map-assignments"></div><div id="soundRoomList"></div><p id="soundRoomNow" role="status" aria-live="polite">曲を選んでください。</p><div class="action-row"><button id="soundRoomStop">試聴を停止</button></div></details><details id="settingsDetails"><summary>難易度・補給の設定</summary><div class="settings"><label>離脱の扱い<select id="mode"><option value="classic">クラシック（永久離脱）</option><option value="casual">カジュアル（次章復帰）</option></select></label><label>敵の攻撃<select id="difficulty"><option value="-1">練習 −1</option><option value="0">標準 ±0</option><option value="1">挑戦 ＋1</option></select></label></div><p class="hint">次に開始する戦闘へ適用。現在の戦闘は下の「戦場へ戻る」で続行できます。</p></details><details><summary>遊び方・勝敗と4フェーズ</summary><p>部隊を選んで、攻撃できない空きマスをタップすると移動して待機します。攻撃できる移動先は押したまま敵へスライドして対象を選びます。敵を選ばず離すと元に戻り、部隊自身や移動できないマスのタップでも選択を取り消せます。青い部隊を押したままスライドすると、指に合わせて経路の矢印が伸びます。離すと「攻撃・待機・戻る」。そのまま敵マスまで滑らせれば移動先を保って対象選択。攻撃／待機を一度押すと実行し、戻るは消費せず取消。射程内に複数の敵がいる場合は↻で切替。その場なら部隊をタップするだけ。何もない場所や青範囲外からのドラッグは地図移動、指を地図端へ寄せると追ってスクロールします。地図内の長押しではブラウザのメニューを開きません。</p><p>Ⅰ 味方行動 → Ⅱ 敵軍 → Ⅲ 味方の待機支援 → Ⅳ 予告イベント。通常兵種は射程が合えば反撃できます。砲兵・魔術師系はP1攻撃とP2反撃はできず、動かず待機した時だけⅢで砲撃・治療します。</p><p>HPは全員6。下級職は基本威力2、上級近接職は3、上級重装の軽減2（最低ダメージ1）。通常兵種の待機はP3効果なし。砲兵は静止待機でP3に敵1隊を砲撃、魔術師系は隣接味方1隊を2回復。P3専門兵の弾薬は最大2、効果があったときだけ1消費。本城から1マス以内でターンごとに1補給。弾薬0では通常待機。弓は射程2、シューターは射程3で威力1。</p><p>北城に入れば勝利。本陣があるマップは敵に入られると敗北。砲撃は予告の赤枠に固定${RULES.barrageDamage}、次のⅠで退避できます。増援は到着した次ターンから行動。出現地点の占有で到着を止められます。</p><p>森は移動コスト2。地形によるダメージ軽減はなし。重装兵の固有軽減のみ適用（最低1）。</p></details><details><summary>このゲーム・検証記録</summary><p>${escapeHTML(DISPLAY_NAME.about)} v${RELEASE}。オリジナルの戦術試作。命中100%、必殺なし。データは data.js、数値は config.js、戦闘は engine.js。戦闘記録から検証JSONを持ち出せます。</p><p>保存はこの端末内のみ。v0.8のHP6化はルール変更のため、旧戦闘データからの自動復元をしません。新規開始が必要です。</p><p><a href="https://github.com/hane-san/SRPG-01-FEstyle" target="_blank" rel="noopener">GitHubでソースを開く</a> · <a href="docs/balance.md" target="_blank">仕様とバランス検討</a></p></details><details><summary>操作と表示速度</summary><p>戦場をクリックしてキー操作：矢印でカーソル・移動先、Enterでメニュー、Aで攻撃を実行、Wで待機を実行、Escで取消、Nで次の未行動部隊。Tabでボタンを選んでEnterでも操作できます。効果音は上の「SE」で切替。最初のタップ後に鳴り、設定はこの端末に保存します。</p><div id="speedControl"></div></details><details id="audioDetails"><summary>音楽・効果音</summary><p>各戦場に味方用／敵・支援・戦場更新用のオリジナル曲。BGMは初期OFF、効果音は初期ON。音楽と効果音は別々に切り替えられます。</p><div id="musicControl"></div><label>BGM音量<input id="musicVolume" aria-label="BGM音量" type="range" min="0" max="100" step="1"></label><p id="musicTrack"></p></details><div id="utility" class="action-row"></div>`);
 const speedButton=button('',()=>{fast=!fast;try{localStorage.setItem('field-command-fast',String(fast));}catch{}updateSpeed();});function updateSpeed(){speedButton.textContent=fast?'進行速度：高速':'進行速度：通常（行動をゆっくり表示）';speedButton.setAttribute('aria-pressed',String(fast));}updateSpeed();$('speedControl').append(speedButton);
 const musicToggle=button('',()=>{music.setEnabled(!music.enabled);updateMusic();});musicToggle.id='musicToggle';$('musicControl').append(musicToggle);function updateMusic(){musicToggle.textContent=music.enabled?'BGM：ON':'BGM：OFF';musicToggle.setAttribute('aria-pressed',String(music.enabled));$('musicTrack').textContent=`現在の曲：No.${String(assignedTrackNumber(s.map.id,s.phase)).padStart(2,'0')} ${trackByNumber(assignedTrackNumber(s.map.id,s.phase)).title}`;}updateMusic();$('musicVolume').value=Math.round(music.volume*100);$('musicVolume').oninput=ev=>music.setVolume(Number(ev.target.value)/100);
 const assigned=$('soundRoomMapAssignments');
 for(const map of MAPS){
  const line=document.createElement('div');line.className='sound-room-map-line';
  line.textContent=`${String(map.id+1).padStart(2,'0')} ${map.title}：味方 No.${String(assignedTrackNumber(map.id,1)).padStart(2,'0')} ／ 敵 No.${String(assignedTrackNumber(map.id,2)).padStart(2,'0')}`;
  assigned.append(line);
 }
 const roomButtons=[];
 function updateRoom(){
  const active=music.snapshot().preview;
  for(const {control,key,title,number} of roomButtons){const selected=active===key;control.setAttribute('aria-pressed',String(selected));control.textContent=`${selected?'■ 再生中':'▶'} No.${String(number).padStart(2,'0')} ${title}`;}
  $('soundRoomNow').textContent=active?`試聴中：No.${String(roomButtons.find(b=>b.key===active)?.number).padStart(2,'0')} ${music.snapshot().title}（BGM設定には影響しません）`:'曲を選んでください。';
  $('soundRoomStop').disabled=!active;
 }
 for(const [mapId,score] of MUSIC_LIBRARY.entries()){
  if(mapId===0||mapId===SCORES.length||mapId===SCORES.length+BONUS_SCORES.length){
   const section=document.createElement('h3');section.className='sound-room-section';
   section.textContent=mapId===0?'現行マップ曲｜No.01–12':mapId===SCORES.length?'既存の追加候補｜No.13–26':'新曲・哀愁と勇壮｜No.27–42';
   $('soundRoomList').append(section);
  }
  const card=document.createElement('div');card.className='sound-room-card';
  const heading=document.createElement('strong');heading.textContent=score.name;card.append(heading);
  if(score.mood){const mood=document.createElement('p');mood.className='sound-room-mood';mood.textContent=score.mood;card.append(mood);}
  const row=document.createElement('div');row.className='sound-room-actions';
  for(const phase of [1,2]){
   const title=buildTrack(mapId,phase).title,key=`${mapId}:${phase===1?'ally':'hostile'}`,number=trackNumber(mapId,phase);
   const control=button('',()=>{if(music.snapshot().preview===key)music.stopPreview();else music.playPreview(mapId,phase);updateRoom();});
   control.setAttribute('aria-label',`No.${String(number).padStart(2,'0')} ${score.name}・${phase===1?'味方':'敵'}：${title}`);row.append(control);roomButtons.push({control,key,title,number});
  }
  card.append(row);$('soundRoomList').append(card);
 }
 $('soundRoomStop').onclick=()=>{music.stopPreview();updateRoom();};updateRoom();
 $('mode').value=settings.mode;$('difficulty').value=String(settings.enemyAttack);
 function getSettings(){settings={mode:$('mode').value,enemyAttack:Number($('difficulty').value)};}
 for(const m of MAPS){const card=document.createElement('div');card.className='map-card'+(s.map.id===m.id?' active':'');card.innerHTML=`<div><strong>${m.title}</strong><small>${m.subtitle}</small></div>`;card.append(button('開始',()=>{getSettings();requestStart(m.id);}));$('maps').append(card);}
 $('campaignStart').append(button('第1〜3章を連戦（離脱を引き継ぐ）',()=>{getSettings();requestStart(0,true);},'primary wide'));
 $('utility').append(button('💎 宝石の破砕音を試す',()=>openGemDemo({modal,sound,button}),'subtle'));
 $('utility').append(button('この戦闘を再試行',()=>confirmRestart(s.map.id)),button('最新版を確認',async()=>{try{const r=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const v=await r.json();if(v.version===RELEASE)modal(`<h2>最新版です</h2><p>現在 v${RELEASE}。</p>`);else{modal(`<h2>新しい版があります</h2><p>互換性のある保存は引き継ぎます。ルールが変わる更新では新規開始になる場合があります。</p><div id="update"></div>`);$('update').append(button('更新して再起動',()=>{location.href=`./?v=${Date.now()}`;},'primary wide'));}}catch{modal('<p>更新確認ができませんでした。接続を確かめてください。</p>');}}));
}
$('menuBtn').onclick=showMenu;
function roster(){if(locked)return;modal('<h2>部隊表</h2><div id="rosterList"></div>');const list=$('rosterList');for(const u of s.units.filter(a=>a.team==='ally')){const p=document.createElement('p');const rosterButton=button(`${u.name} ${u.label}${u.alive?(u.deployed===false?' [予備]':u.acted?' [行動済]':' [未行動]'):''} · ${u.alive?`HP ${u.hp}/${u.maxHp} 残${u.charges}`:s.settings.mode==='classic'?'永久離脱':'撤退'}`,()=>{close();if(u.deployed===false){openDeployment();return;}selectUnit(u,true);vp.scrollTop=u.y*view.tile-vp.clientHeight/2;vp.scrollLeft=u.x*view.tile-vp.clientWidth/2;});rosterButton.disabled=!u.alive;p.append(rosterButton);list.append(p);}if(s.lost.length){const p=document.createElement('p');p.textContent=`連戦の離脱記録：${s.lost.join(', ')}`;list.append(p);}}
$('rosterBtn').onclick=roster;
$('logBtn').onclick=()=>{if(locked)return;modal(`<h2>戦闘記録</h2><p>T${s.turn} / 再命令 ${s.metrics.commands} / 支援発動 ${s.metrics.supports} / 支援不発 ${s.metrics.misfires} / 消費 ${s.metrics.charges}</p><div id="export"></div><div id="logs"></div>`);$('export').append(button('検証記録をコピー',async()=>{const report=JSON.stringify({release:RELEASE,map:s.map.id,settings:s.settings,campaign,metrics:s.metrics,units:s.units,log:s.log},null,2);try{await navigator.clipboard.writeText(report);$('export').textContent='コピーしました';}catch{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([report],{type:'application/json'}));a.download='srpg-playtest.json';a.textContent='検証記録JSONを保存';$('export').append(a);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}}));for(const line of [...s.log].reverse()){const p=document.createElement('div');p.className='log-line';p.textContent=line;$('logs').append(p);}};
window.addEventListener('resize',()=>{const p={x:(vp.scrollLeft+lastSize.w/2)/view.tile,y:(vp.scrollTop+lastSize.h/2)/view.tile};refresh();recenter(p);});
// Explicit test controls are available only with ?debug=1; normal play has none.
if(new URLSearchParams(location.search).has('debug'))window.srpgDebug={snapshot:()=>structuredClone(s),draft:()=>structuredClone(view),audio:()=>sound.snapshot(),music:()=>music.snapshot(),busy:()=>locked,select:id=>{const u=s.units.find(u=>u.id===id);if(u)selectUnit(u);},start:(id,opts={})=>{settings={...settings,...opts};start(id);}};
// Layout is already measured by refresh; finish initial centering before accepting input.
refresh();home();
if(!stored)showMenu();

