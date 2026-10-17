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
 function burst(duration=.07,volume=.12,frequency=1600){
  if(!context)return;
  if(!noiseBuffer){noiseBuffer=context.createBuffer(1,Math.ceil(context.sampleRate*.16),context.sampleRate);const data=noiseBuffer.getChannelData(0);let seed=17;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}}
  const t=context.currentTime,source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=noiseBuffer;filter.type='highpass';filter.frequency.value=frequency;
  gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start(t);source.stop(t+duration);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
 function play(kind){
  if(!enabled||!context||globalThis.document?.hidden)return;
  if(kind==='step'){const now=performance.now();if(now-lastStep<55)return;lastStep=now;}
  try{
   if(kind==='select')note(520,.045);
   else if(kind==='cursor')note(700,.025,0,'sine');
   else if(kind==='confirm'){note(520,.055);note(780,.08,.045);}
   else if(kind==='cancel')note(360,.07,0,'triangle',220);
   else if(kind==='step')note(125,.035,0,'triangle',70);
   else if(kind==='swing'){burst(.075,.09,1900);note(760,.075,0,'sawtooth',130,.065);note(150,.09,.02,'triangle',65,.065);}
   else if(kind==='bow'){note(420,.07,0,'triangle',100,.09);note(1300,.22,.035,'sine',380,.055);}
   else if(kind==='magic'){note(240,.25,0,'sine',1100,.07);note(480,.22,.04,'triangle',1500,.035);}
   else if(kind==='range')note(850,.11,0,'sine',330);
   else if(kind==='hit'){burst(.055,.22,1000);note(135,.12,0,'sine',42,.17);note(1080,.09,.005,'triangle',480,.08);note(1620,.065,.008,'sine',700,.035);}
   else if(kind==='heal'){note(520,.12);note(650,.13,.06);note(780,.15,.12);}
   else if(kind==='phase'){note(390,.08);note(520,.12,.07);}
   else return;
   played++;
  }catch{/* Audio failure must never interrupt a command. */}
 }
 return {unlock,play,get enabled(){return enabled;},toggle(){enabled=!enabled;try{storage?.setItem('field-command-sound',String(enabled));}catch{}if(enabled){unlock();play('select');}else if(context?.state==='running')context.suspend().catch(()=>{});return enabled;},snapshot:()=>({enabled,played,state:context?.state||'locked'})};
}

