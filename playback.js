import {feedbackStyle} from './combat-fx.js?v=0.8.0-fx39';
import {gemPlan,gemHP,gemSchedule} from './gem-effects.js?v=0.8.0-gems28';
// Only presentation lives here; all rules have already resolved synchronously.
export function tween(duration,update){
 if(!duration||document.hidden){update(1);return Promise.resolve();}
 return new Promise((resolve,reject)=>{
  const start=performance.now();let frame,timer;
  const cleanup=()=>{cancelAnimationFrame(frame);clearTimeout(timer);};
  const step=()=>{
   cleanup();
   try{const p=document.hidden?1:Math.min(1,(performance.now()-start)/duration);update(p);
    if(p===1){resolve();return;}frame=requestAnimationFrame(step);timer=setTimeout(step,90);
   }catch(error){cleanup();reject(error);}
  };step();
 });
}
export function createPlayback({getState,setState,view,draw,sound,isFast,isReduced,onMessage=()=>{},onCombat=()=>{}}){
 const duration=(normal,quick=0,still=0)=>document.hidden||isFast()?quick:isReduced()?still:normal;
 const clear=()=>{for(const k of ['motion','projectile','effect','flash','ghost','active','animation','sortieEntrance','sortieQuote','jewel','impact','stepLanding'])view[k]=null;};
 async function play(frames){
  let lastActor=null;
  for(const {state,event} of frames){
   const before=getState(),actor=before.units.find(u=>u.id===event.actor),target=before.units.find(u=>u.id===event.target);
   view.active=event.actor;view.animation={...event,stage:'start',progress:0};
   if(event.actor!==lastActor&&!event.counter){
    const who=event.kind==='deploy'&&actor?{...actor,...event.origin}:actor||target;onMessage(`${who.team==='enemy'?'敵軍':'味方'} ${who.label}・${who.name} (${who.x+1},${who.y+1})`);
    view.animation={...event,stage:'ready',progress:0};draw();await tween(duration(60,0,30),()=>{});lastActor=event.actor;
   }
   if(event.kind==='deploy'){
    // A committed sortie is presented at the gate before any travel or attack.
    // Scene changes happen only in playback; combat and charges were settled by engine.
    const entrant=state.units.find(u=>u.id===event.actor),line=event.line||'出撃する！';
    setState(state);sound.play('deploy');onMessage(`${entrant.name}、本城より出撃！`);
    await tween(duration(210,30,80),p=>{view.sortieEntrance={id:entrant.id,x:event.origin.x,y:event.origin.y,progress:p};draw();});
    view.sortieEntrance=null;view.sortieQuote={id:entrant.id,x:event.origin.x,y:event.origin.y,line};
    onMessage(`${entrant.name}「${line}」`);draw();
    await tween(duration(440,60,130),()=>{});
    view.sortieQuote=null;draw();
   }else if(event.kind==='move'){
    setState(state);onMessage(`${actor.name}が移動`);
    for(let i=1;i<event.path.length;i++){
     const a=event.path[i-1],b=event.path[i];if(!isFast())sound.play('step');
     await tween(duration(65),p=>{view.animation={...event,stage:'move',segment:i,progress:p};view.motion={id:event.actor,x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p,bob:Math.sin(p*Math.PI)*.06};
      // A landing mark lives *inside* the existing 65ms step, never adds delay.
      view.stepLanding=!isFast()&&!isReduced()&&p>=.68?{x:b.x,y:b.y,progress:(p-.68)/.32}:null;draw();
     });
    }
    view.motion=null;view.stepLanding=null;
   }else if(event.kind==='hit'||event.kind==='heal'){
    const heal=event.kind==='heal',ranged=heal||!actor||Math.abs(actor.x-target.x)+Math.abs(actor.y-target.y)>1||['bow','mage','shooter'].includes(actor.type);
    const dx=actor?target.x-actor.x:0,dy=actor?target.y-actor.y:0,length=Math.max(1,Math.abs(dx)+Math.abs(dy));
    onCombat(before,before,event,'windup');
    onMessage(`${actor?.name||'砲撃'}${event.counter?'の反撃':''} → ${target.name} ${heal?'+':'−'}${event.amount}`);
    if(!heal)sound.play(['bow','shooter'].includes(actor?.type)?'bow':actor?.type==='mage'?'magic':ranged?'range':'swing');
    await tween(duration(['bow','shooter'].includes(actor?.type)?320:200),p=>{
     view.animation={...event,stage:'windup',progress:p};
     if(actor&&!ranged)view.motion={id:actor.id,x:actor.x+dx/length*.23*p,y:actor.y+dy/length*.23*p};
     else if(actor)view.projectile={from:actor,to:target,progress:p,heal,type:actor.type};draw();
    });
    view.projectile=null;
    const afterTarget=state.units.find(u=>u.id===target.id);
    const armoured=!heal&&!!(target.def||target.guard||target.specialty==='guard'&&target.command);
    const plan=gemPlan(target.hp,afterTarget?.hp??target.hp,event.amount,{heal,armoured,ally:target.team==='ally'});
    const speed=gemSchedule(plan,isFast(),isReduced());
    const style=feedbackStyle({...plan,fast:isFast(),reduced:isReduced()});
    const impactPosition={id:target.id,x:target.x,y:target.y,dx:actor?Math.sign(target.x-actor.x):0,dy:actor?Math.sign(target.y-actor.y):0,style};
    const showImpact=(kind,progress)=>{view.impact={...impactPosition,kind,progress};draw();};
    const animate=ms=>tween(document.hidden?0:ms,()=>{});
    // Hit-stop interrupts the first impact, not the per-jewel rhythm.
    if(!heal){
     sound.play('gem-impact',event.amount,plan.lethal,{heavy:plan.heavy,armoured:plan.armoured,ally:plan.ally});
     if(speed.hitStopMs){
      await tween(document.hidden?0:speed.hitStopMs,p=>{
       view.animation={...event,stage:'hitstop',progress:p};
       view.jewel={id:target.id,hp:plan.start,index:-1,progress:p,hitStop:true,heavy:true,armoured};
       view.flash={id:target.id,amount:Math.max(0,.6-p*.3),heal:false};showImpact('hit',p);
      });
     }
    }
    if(plan.count){
     // The first impact gets an actual visual reaction before gems start to fall.
     await tween(document.hidden?0:speed.firstDelayMs,p=>showImpact(heal?'heal':'hit',p));
     sound.play('gem-chain',plan.count,plan.lethal,{...plan,intervalMs:speed.intervalMs});
     for(let i=1;i<=plan.count;i++){
      const hp=gemHP(plan,i),visual={...before,units:before.units.map(u=>u.id===target.id?{...u,hp}:u)};
      onCombat(before,visual,event,'shard');
      await tween(document.hidden?0:speed.intervalMs,p=>{
       view.animation={...event,stage:heal?'reform':'shatter',index:i,progress:p};
       view.jewel={id:target.id,hp,index:heal?plan.start+i-1:plan.start-i,progress:p,heal,heavy:plan.heavy,armoured,ally:plan.ally,count:plan.count};
       view.flash={id:target.id,amount:isReduced()?0:Math.max(0,(1-p)*(plan.heavy?.42:plan.count===2?.37:.25)),heal};
       view.effect={x:target.x,y:target.y,text:`${heal?'+':'−'}${event.amount}`,progress:(i-1+p)/plan.count,heal};
       showImpact(heal?'heal':'shard',p);
      });
     }
    }
    setState(state);onCombat(before,state,event,'impact');view.jewel=null;
    view.flash=null;view.effect=null;view.impact=null;
    if(plan.lethal){
     sound.play('gem-finish',plan.count,true,{ally:plan.ally,heavy:plan.heavy});
     view.ghost={unit:{...target,hp:0},alpha:1,shatter:true,progress:0};
     await tween(document.hidden?0:speed.finishMs+48,p=>{
      view.animation={...event,stage:'collapse',progress:p};
      view.ghost.progress=p;view.ghost.alpha=1-p;draw();
     });
    }else if(plan.count){
     await animate(speed.finishMs);
    }

   }
   clear();draw();await tween(duration(25,0,20),()=>{});
  }
  clear();draw();
 }
 return {play,clear};
}

