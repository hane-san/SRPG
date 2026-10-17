// Small original synthesized cues. No files, network requests or autoplay.
export function createAudio(storage){
 if(arguments.length===0)try{storage=globalThis.localStorage;}catch{}
 let enabled=true,context=null,played=0,lastStep=0;
 try{enabled=storage?.getItem('field-command-sound')!=='false';}catch{}
 function unlock(){
  if(!enabled)return;
  try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;if(!context||context.state==='closed')context=new Audio();if(context.state!=='running')context.resume().catch(()=>{});}catch{}
 }
 function note(frequency,duration,delay=0,type='triangle',end=frequency){
  if(!context||context.state==='closed')return;
  const t=context.currentTime+delay,o=context.createOscillator(),gain=context.createGain();
  o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.055,t+.004);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(gain);gain.connect(context.destination);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();gain.disconnect();};
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
   else if(kind==='swing')note(270,.09,0,'sawtooth',100);
   else if(kind==='range')note(850,.11,0,'sine',330);
   else if(kind==='hit'){note(110,.11,0,'square',35);note(490,.035,0,'triangle',120);}
   else if(kind==='heal'){note(520,.12);note(650,.13,.06);note(780,.15,.12);}
   else if(kind==='phase'){note(390,.08);note(520,.12,.07);}
   else return;
   played++;
  }catch{/* Audio failure must never interrupt a command. */}
 }
 return {unlock,play,get enabled(){return enabled;},toggle(){enabled=!enabled;try{storage?.setItem('field-command-sound',String(enabled));}catch{}if(enabled){unlock();play('select');}else if(context?.state==='running')context.suspend().catch(()=>{});return enabled;},snapshot:()=>({enabled,played,state:context?.state||'locked'})};
}
