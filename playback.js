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
 const clear=()=>{for(const k of ['motion','projectile','effect','flash','ghost','active','animation'])view[k]=null;};
 async function play(frames){
  let lastActor=null;
  for(const {state,event} of frames){
   const before=getState(),actor=before.units.find(u=>u.id===event.actor),target=before.units.find(u=>u.id===event.target);
   view.active=event.actor;view.animation={...event,stage:'start',progress:0};
   if(event.actor!==lastActor&&!event.counter){
    const who=event.kind==='deploy'&&actor?{...actor,...event.origin}:actor||target;onMessage(`${who.team==='enemy'?'敵軍':'味方'} ${who.label}・${who.name} (${who.x+1},${who.y+1})`);
    view.animation={...event,stage:'ready',progress:0};draw();await tween(duration(160,0,100),()=>{});lastActor=event.actor;
   }
   if(event.kind==='deploy'){
    setState(state);onMessage(`${actor.name}が本城から出撃`);draw();
   }else if(event.kind==='move'){
    setState(state);onMessage(`${actor.name}が移動`);
    for(let i=1;i<event.path.length;i++){
     const a=event.path[i-1],b=event.path[i];if(!isFast())sound.play('step');
     await tween(duration(95),p=>{view.animation={...event,stage:'move',segment:i,progress:p};view.motion={id:event.actor,x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p,bob:Math.sin(p*Math.PI)*.06};draw();});
    }
    view.motion=null;
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
    setState(state);onCombat(before,state,event,'impact');view.projectile=null;sound.play(heal?'heal':'hit',event.amount,!state.units.find(u=>u.id===target.id)?.alive);
    if(!state.units.find(u=>u.id===target.id)?.alive)view.ghost={unit:target,alpha:1};
    await tween(duration(380,isReduced()?35:20,220),p=>{
     view.animation={...event,stage:'impact',progress:p};view.flash={id:target.id,amount:1-p,heal};view.effect={x:target.x,y:target.y,text:`${heal?'+':'−'}${event.amount}`,progress:p,heal};
     if(actor&&!ranged)view.motion={id:actor.id,x:actor.x+dx/length*.23*(1-p),y:actor.y+dy/length*.23*(1-p)};
     if(view.ghost)view.ghost.alpha=1-p;draw();
    });
   }
   clear();draw();await tween(duration(75,0,80),()=>{});
  }
  clear();draw();
 }
 return {play,clear};
}

