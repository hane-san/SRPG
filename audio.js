// Small original synthesized cues. No files, network requests or autoplay.
export function createAudio(storage){
 if(arguments.length===0)try{storage=globalThis.localStorage;}catch{}
 let enabled=true,context=null,played=0,lastStep=0,noiseBuffer=null;
 try{enabled=storage?.getItem('field-command-sound')!=='false';}catch{}
 function unlock(){
  if(!enabled)return;
  try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;if(!context||context.state==='closed')context=new Audio();if(context.state!=='running')context.resume().catch(()=>{});}catch{}
 }
 function note(frequency,duration,delay=0,type='triangle',end=frequency,volume=.055){
  if(!context||context.state==='closed')return;
  const t=context.currentTime+delay,o=context.createOscillator(),gain=context.createGain();
  o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.004);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(gain);gain.connect(context.destination);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();gain.disconnect();};
 }
 // Short filtered noise provides a crisp transient without a long loud tail.
 function burst(duration=.07,volume=.12,frequency=1600,delay=0){
  if(!context)return;
  if(!noiseBuffer){noiseBuffer=context.createBuffer(1,Math.ceil(context.sampleRate*.16),context.sampleRate);const data=noiseBuffer.getChannelData(0);let seed=17;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}}
  const t=context.currentTime+delay,source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=noiseBuffer;filter.type='highpass';filter.frequency.value=frequency;
  gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start(t);source.stop(t+duration);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
 function play(kind,amount=2,lethal=false,options={}){
  if(!enabled||!context||globalThis.document?.hidden)return;
  if(kind==='step'){const now=performance.now();if(now-lastStep<55)return;lastStep=now;}
  try{
   if(kind==='select')note(520,.045);
   else if(kind==='cursor')note(700,.025,0,'sine');
   else if(kind==='confirm'){note(520,.055);note(780,.08,.045);}
   else if(kind==='lock'){burst(.022,.035,2400);note(820,.04,0,'triangle',610,.025);}
   else if(kind==='cancel')note(360,.07,0,'triangle',220);
   else if(kind==='step')note(125,.035,0,'triangle',70);
   else if(kind==='swing'){burst(.075,.09,1900);note(760,.075,0,'sawtooth',130,.065);note(150,.09,.02,'triangle',65,.065);}
   else if(kind==='bow'){note(420,.07,0,'triangle',100,.09);note(1300,.22,.035,'sine',380,.055);}
   else if(kind==='magic'){note(240,.25,0,'sine',1100,.07);note(480,.22,.04,'triangle',1500,.035);}
   else if(kind==='range')note(850,.11,0,'sine',330);
   else if(kind==='gem-impact'){
    // Initial force is distinct from the independently countable gem cracks.
    const heavy=!!options.heavy,armoured=!!options.armoured;
    if(heavy){
     burst(.09,.16,armoured?390:650);
     note(armoured?110:145,.16,0,'sawtooth',38,.08);
     note(270,.12,.016,'triangle',85,.045);
    }else if(armoured){
     burst(.04,.065,570);note(180,.085,0,'triangle',70,.05);
    }else{
     burst(.045,.075,1500);note(450,.065,0,'triangle',190,.035);
    }
   }
   else if(kind==='gem-chain'){
    const chips=Math.max(0,Math.min(6,Math.floor(Number(amount)||0)));
    const interval=Math.max(20,Math.min(140,Number(options.intervalMs)||74))/1000;
    const heal=!!options.heal,armoured=!!options.armoured;
    for(let i=0;i<chips;i++){
     const delay=i*interval,variation=[0,65,-25,95,25,125][i],base=heal?630:armoured?650:850;
     if(heal){
      note(base+variation,.085,delay,'sine',base+variation+320,.052);
      note(base+variation+350,.065,delay+.014,'triangle',base+variation+600,.027);
     }else{
      burst(.029,armoured?.041:.052,armoured?1300:2700,delay);
      note(base+variation,.055,delay,'sine',armoured?base*.54:base*.67,.044);
      note(base*1.8+variation,.033,delay+.004,'triangle',base,.016);
     }
    }
   }
   else if(kind==='gem-finish'){
    if(options.ally){
     // An ally's final crystal trails down and falls quiet.
     note(380,.12,0,'sine',160,.035);note(200,.12,.035,'triangle',65,.027);
    }else{
     burst(.068,.075,1750);note(1120,.11,0,'sine',370,.048);
     note(520,.1,.025,'triangle',250,.032);
    }
   }
   else if(kind==='hit'){
    // Weight is pitch, low-frequency body and decay, not just loudness.
    const tier=Math.max(1,Math.min(5,Math.round(Number(amount)||1))),heavy=tier>=3;
    burst(.04+tier*.009,.12+tier*.02,heavy?520:1300);
    note(heavy?140-tier*9:175,.08+tier*.023,0,'triangle',heavy?38:80,.09+tier*.017);
    note(1200-tier*105,.045+tier*.012,.006,'sawtooth',heavy?180:620,.035+tier*.006);
    if(heavy)note(68,.12+(tier-3)*.055,.015,'sine',32,.055+(tier-3)*.012);
    if(lethal){burst(.045,.10,2300);note(100,.15,.03,'triangle',37,.07);}
   }
   else if(kind==='deploy'){burst(.055,.08,1100);note(220,.11,0,'sawtooth',110,.085);note(1380,.09,.01,'triangle',510,.047);note(190,.12,.15,'sawtooth',95,.085);note(1100,.1,.16,'triangle',450,.052);}
   else if(kind==='defend'){burst(.035,.055,2600);note(1500,.07,0,'sine',900,.06);note(750,.06,.018,'triangle',580,.03);}
   else if(kind==='defeat'){burst(.09,.07,750);note(180,.24,0,'sawtooth',35,.045);note(75,.28,.02,'sine',25,.065);}
   else if(kind==='heal'){note(520,.12);note(650,.13,.06);note(780,.15,.12);}
   else if(kind==='phase'){note(390,.08);note(520,.12,.07);}
   else return;
   played++;
  }catch{/* Audio failure must never interrupt a command. */}
 }
 return {unlock,play,get enabled(){return enabled;},toggle(){enabled=!enabled;try{storage?.setItem('field-command-sound',String(enabled));}catch{}if(enabled){unlock();play('select');}else if(context?.state==='running')context.suspend().catch(()=>{});return enabled;},snapshot:()=>({enabled,played,state:context?.state||'locked'})};
}

