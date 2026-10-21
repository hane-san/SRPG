import {gemPlan,gemHP,gemSchedule} from './gem-effects.js?v=0.8.0-gems28';

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const scenarios=[
 {label:'1ダメージ',start:6,amount:1},
 {label:'2ダメージ',start:6,amount:2},
 {label:'3ダメージ',start:6,amount:3},
 {label:'4ダメージ・強打',start:6,amount:4},
 {label:'5ダメージ・強打',start:6,amount:5},
 {label:'重装：攻撃3→被害2',start:6,amount:2,armoured:true},
 {label:'敵を撃破（HP2）',start:2,amount:3},
 {label:'味方が戦死（HP2）',start:2,amount:3,ally:true},
 {label:'2ジュエル回復',start:2,amount:2,heal:true}
];
export function openGemDemo({modal,sound,button}){
 modal('<h2>💎 HPジュエル破砕・試聴</h2><p class="hint">戦闘結果は変えず、1〜5ダメージ・重装の軽減・撃破・回復の音とテンポを試せます。音はゲーム独自の合成音です。</p><div id="gemDemoBoard" class="gem-demo-board"><div id="gemDemoStatus" role="status" aria-live="polite">HP 6 / 6</div><div id="gemDemoPips" class="gem-demo-pips" role="img" aria-label="残りHP6"></div><div id="gemDemoMessage">比べたい演出を選んでください</div></div><div id="gemDemoControls" class="gem-demo-controls"></div><p class="hint">実戦でも同じタイミングで砕けます。4以上はヒットストップの後に高速破砕。重装は防いだ分まで割れません。SE OFFなら無音です。</p>');
 const container=document.getElementById('gemDemoBoard'),status=document.getElementById('gemDemoStatus'),pips=document.getElementById('gemDemoPips'),message=document.getElementById('gemDemoMessage');
 const controls=document.getElementById('gemDemoControls');let busy=false;
 const setHP=(hp,{breaking=-1,reforming=-1,ally=false}={})=>{
  pips.replaceChildren(...Array.from({length:6},(_,i)=>{
   const gem=document.createElement('span');
   gem.className='gem-demo-jewel'+(i<hp?' intact':' gone')+(i===breaking?' breaking':'')+(i===reforming?' reforming':'')+(ally?' ally':'');
   gem.setAttribute('aria-hidden','true');return gem;
  }));
  container.dataset.hp=String(hp);status.textContent='HP '+hp+' / 6';pips.setAttribute('aria-label','残りHP'+hp);
 };
 setHP(6);
 async function run(spec){
  if(busy||!container.isConnected)return;busy=true;
  for(const b of controls.querySelectorAll('button'))b.disabled=true;
  const end=spec.heal?Math.min(6,spec.start+spec.amount):Math.max(0,spec.start-spec.amount);
  const plan=gemPlan(spec.start,end,spec.amount,spec);
  const timing=gemSchedule(plan);
  try{
   setHP(spec.start);message.textContent=spec.label+'：準備';
   sound.unlock();
   sound.play(spec.heal?'range':'swing');
   await wait(spec.heal?75:110);
   if(!container.isConnected)return;
   if(!spec.heal)sound.play('gem-impact',spec.amount,plan.lethal,plan);
   if(timing.hitStopMs){message.textContent='ズバーン！ 強打の衝撃';container.classList.add('gem-demo-hitstop');await wait(timing.hitStopMs);container.classList.remove('gem-demo-hitstop');}
   if(!container.isConnected)return;
   await wait(timing.firstDelayMs);
   sound.play('gem-chain',plan.count,plan.lethal,{...plan,intervalMs:timing.intervalMs});
   for(let i=1;i<=plan.count;i++){
    if(!container.isConnected)return;
    setHP(gemHP(plan,i),{breaking:spec.heal?-1:plan.start-i,reforming:spec.heal?plan.start+i-1:-1,ally:!!spec.ally});
    message.textContent=spec.heal?'結晶が再生 '+i+' / '+plan.count:'パリン！ '+i+' / '+plan.count;
    await wait(timing.intervalMs);
   }
   if(!container.isConnected)return;
   if(plan.lethal){sound.play('gem-finish',plan.count,true,plan);message.textContent=spec.ally?'最後の結晶が砕け、静かに消える':'最後の結晶が砕け、敵を撃破！';}
   else message.textContent=spec.heal?'回復完了':'HP '+plan.end+' / 6';
  }finally{
   busy=false;container.classList.remove('gem-demo-hitstop');
   if(container.isConnected)for(const b of controls.querySelectorAll('button'))b.disabled=false;
  }
 }
 for(const spec of scenarios)controls.append(button(spec.label,()=>run(spec),'subtle'));
}
