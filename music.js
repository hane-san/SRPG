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
const degree=(root,scale,n)=>root+12*Math.floor(n/7)+scale[((n%7)+7)%7];
export function buildTrack(mapId,phase=1){
 const score=SCORES[mapId]||SCORES[0],side=phase===1?'ally':'hostile',part=score[side],bar=score.meter,length=bar*32;
 const rhythm=bar===3?[.5,.5,.5,.5,1,.5,.5,2]:[1,.5,.5,1,1,1,1,2],events=[];
 const push=(beat,duration,n,voice,velocity,pan=0)=>events.push({beat,duration,midi:degree(score.root,part.scale,n),voice,velocity,pan});
 for(let pass=0;pass<4;pass++)for(let phrase=0;phrase<4;phrase++){
  let beat=pass*bar*8+phrase*bar*2;
  for(const [i,n]of part.melody[phrase].entries()){push(beat,rhythm[i]*.9,n+(pass===2&&phrase===2?7:0),score.lead,.32,0);if(pass%2===1&&i%2===0)push(beat+.08,Math.min(rhythm[i],.8),n-7,'flute',.07,.3);beat+=rhythm[i];}
 }
 for(let i=0;i<32;i++){
  const beat=i*bar,chord=part.chords[i%8];
  for(const n of [chord-7,chord-5,chord-3])push(beat,bar*.94,n,'pad',.075,-.18);
  push(beat,bar*.65,chord-14,'bass',.24,0);if(side==='hostile'||bar===4)push(beat+bar/2,.7,chord-10,'bass',.14,0);
  for(let j=0;j<bar*2;j++)push(beat+j/2,.35,chord+[0,2,4,2,0,4,2,4][j%8],score.arp,.09,.22);
  if(side==='hostile'||i%2===0)events.push({beat,duration:.12,midi:38,voice:'drum',velocity:side==='hostile'?.18:.10,pan:0});
 }
 events.sort((a,b)=>a.beat-b.beat);
 return {mapId,side,title:part.title,bpm:part.bpm,beats:length,seconds:length*60/part.bpm,events};
}
// Shared by realtime playback and deterministic OfflineAudioContext verification.
export function scheduleNote(context,destination,event,time,secondsPerBeat){
 const duration=Math.max(.035,event.duration*secondsPerBeat),gain=context.createGain(),filter=context.createBiquadFilter(),osc=context.createOscillator();
 const frequency=440*2**((event.midi-69)/12),isPad=event.voice==='pad',plucked=event.voice==='harp',drum=event.voice==='drum';
 osc.type=['flute','harp','bass','drum'].includes(event.voice)?'sine':'triangle';
 osc.frequency.setValueAtTime(drum?95:frequency,time);if(drum)osc.frequency.exponentialRampToValueAtTime(35,time+duration);
 filter.type='lowpass';filter.frequency.value=event.voice==='horn'?1800:isPad?900:plucked?2400:3000;
 const attack=isPad?.075:plucked?.006:.018,release=isPad?.2:.07,end=time+duration+release;
 gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(event.velocity,time+Math.min(attack,duration/3));
 if(plucked||drum)gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
 else{gain.gain.setValueAtTime(event.velocity*.72,time+duration*.72);gain.gain.linearRampToValueAtTime(0,end);}
 osc.connect(filter);filter.connect(gain);let pan=null;
 if(context.createStereoPanner){pan=context.createStereoPanner();pan.pan.value=event.pan||0;gain.connect(pan);pan.connect(destination);}else gain.connect(destination);
 osc.start(time);osc.stop(end+.01);
 const clean=()=>{osc.disconnect();filter.disconnect();gain.disconnect();pan?.disconnect();};osc.onended=clean;
 return {stop(at=context.currentTime){try{gain.gain.cancelScheduledValues(at);gain.gain.setTargetAtTime(0,at,.012);osc.stop(at+.06);}catch{}},clean,osc};
}
export function createMusic(storage){
 if(arguments.length===0)try{storage=globalThis.localStorage;}catch{}
 let enabled=false,volume=.32,context=null,master=null,bus=null,timer=null,track=null,key=null,requested=null,index=0,start=0,scheduled=0,serial=0,starts=0;
 const voices=new Set(),retired=new Set();
 try{enabled=storage?.getItem('field-command-music')==='true';const saved=storage?.getItem('field-command-music-volume');if(saved!==null&&saved!==undefined&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(1,Number(saved)));}catch{}
 function stop(){
  serial++;if(timer!==null){clearInterval(timer);timer=null;}const now=context?.currentTime||0;
  if(bus)try{bus.gain.cancelScheduledValues(now);bus.gain.setTargetAtTime(0,now,.04);}catch{}
  for(const v of voices)v.stop(now);voices.clear();
  if(bus){const old=bus;const cleanup=setTimeout(()=>{old.disconnect();retired.delete(cleanup);},220);retired.add(cleanup);}bus=null;key=null;index=0;
 }
 function pump(){
  if(!context||context.state!=='running'||!bus||!track||!enabled)return;
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
  if(!enabled||!requested||requested.status!=='playing'||globalThis.document?.hidden||context?.state!=='running')return;
  const next=`${requested.mapId}:${requested.phase===1?'ally':'hostile'}`;if(next===key)return;
  stop();track=buildTrack(requested.mapId,requested.phase);key=next;bus=context.createGain();bus.gain.setValueAtTime(0,context.currentTime);bus.gain.linearRampToValueAtTime(1,context.currentTime+.2);bus.connect(master);start=context.currentTime+.04;index=0;pump();if(key===next){starts++;timer=setInterval(pump,100);}
 }
 function unlock(){
  if(!enabled||globalThis.document?.hidden)return;
  try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
   if(!context||context.state==='closed'){context=new Audio();master=context.createGain();master.gain.value=volume*.34;const limiter=context.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=18;limiter.ratio.value=4;master.connect(limiter);limiter.connect(context.destination);}
   if(context.state==='running')activate();else{const token=serial;context.resume().then(()=>{if(token===serial)activate();}).catch(()=>{});}
  }catch{/* Music never blocks input or phase resolution. */}
 }
 function setScene(mapId,phase,status='playing'){
  requested={mapId,phase,status};if(status!=='playing'){if(key)stop();return;}try{if(enabled)activate();}catch{stop();}
 }
 function setEnabled(value){enabled=!!value;try{storage?.setItem('field-command-music',String(enabled));}catch{}
  if(enabled)unlock();else{stop();if(context?.state==='running')context.suspend().catch(()=>{});}return enabled;
 }
 function setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));try{storage?.setItem('field-command-music-volume',String(volume));}catch{}if(master&&context)master.gain.setTargetAtTime(volume*.34,context.currentTime,.03);}
 const visibility=()=>{if(globalThis.document?.hidden){stop();if(context?.state==='running')context.suspend().catch(()=>{});}else if(enabled)unlock();};
 globalThis.document?.addEventListener('visibilitychange',visibility);
 return {unlock,setScene,setEnabled,setVolume,get enabled(){return enabled;},get volume(){return volume;},snapshot:()=>({enabled,volume,scene:key,title:track?.title||null,state:context?.state||'locked',scheduled,starts,voices:voices.size}),destroy(){stop();globalThis.document?.removeEventListener('visibilitychange',visibility);for(const t of retired)clearTimeout(t);retired.clear();if(context&&context.state!=='closed')context.close().catch(()=>{});}};
}
