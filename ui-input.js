// One gesture, one optional tap. A drag that returns to its origin is still a drag.
export function createGesture(threshold=10){
 let start=null,ids=new Set();
 return {
  down(id,x,y,left=0,top=0){ids.add(id);if(ids.size===1)start={id,x,y,left,top,moved:false,multi:false};else if(start)start.multi=true;},
  move(id,x,y){if(start?.id===id&&Math.hypot(x-start.x,y-start.y)>threshold)start.moved=true;},
  up(id,x,y,left=0,top=0){const ok=!!start&&id===start.id&&ids.size===1&&!start.multi&&!start.moved&&Math.hypot(x-start.x,y-start.y)<=threshold&&Math.abs(left-start.left)<2&&Math.abs(top-start.top)<2;ids.delete(id);if(!ids.size)start=null;return ok;},
  cancel(id){ids.delete(id);if(start)start.multi=true;if(!ids.size)start=null;},
  reset(){ids.clear();start=null;}
 };
}
// All battlefield gestures are owned by the game from pointerdown, including pan.
// This prevents Safari/Chrome from claiming a slide before selection is established.
export function bindMapInput(viewport,onTap,begin=()=>({pan:true})){
 const g=createGesture(),ids=new Set();let active=null,blocked=false,edgeFrame=null;
 const stopEdge=()=>{if(edgeFrame!==null)cancelAnimationFrame(edgeFrame);edgeFrame=null;};
 const cancel=()=>{stopEdge();active?.interaction.cancel?.();active=null;};
 // A second finger can land on the preview window, outside the viewport.
 // Cancel before that button receives a usable click and track its release too.
 document.addEventListener('pointerdown',e=>{
  if(active&&e.pointerType==='touch'&&e.pointerId!==active.id){e.preventDefault();ids.add(e.pointerId);g.down(e.pointerId,e.clientX,e.clientY);blocked=true;cancel();}
 },{capture:true,passive:false});
 const outsideRelease=e=>{if(!viewport.contains(e.target)){ids.delete(e.pointerId);g.cancel(e.pointerId);if(!ids.size)blocked=false;}};
 document.addEventListener('pointerup',outsideRelease);document.addEventListener('pointercancel',outsideRelease);
 const edgeScroll=()=>{
  edgeFrame=null;const a=active;if(!a||!a.moved||a.interaction.pan||blocked)return;
  const r=viewport.getBoundingClientRect(),edge=28;
  const speed=(n,min,max)=>n<min+edge?-Math.min(8,(min+edge-n)*.24):n>max-edge?Math.min(8,(n-max+edge)*.24):0;
  const left=viewport.scrollLeft,top=viewport.scrollTop;
  viewport.scrollLeft+=speed(a.clientX,r.left,r.right);viewport.scrollTop+=speed(a.clientY,r.top,r.bottom);
  if(left!==viewport.scrollLeft||top!==viewport.scrollTop)a.interaction.move?.(a.clientX,a.clientY);
  edgeFrame=requestAnimationFrame(edgeScroll);
 };
 viewport.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;e.preventDefault();ids.add(e.pointerId);g.down(e.pointerId,e.clientX,e.clientY,viewport.scrollLeft,viewport.scrollTop);
  if(ids.size>1){blocked=true;cancel();return;}
  if(blocked)return;const interaction=begin(e.clientX,e.clientY)||{pan:true};
  active={id:e.pointerId,x:e.clientX,y:e.clientY,clientX:e.clientX,clientY:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false,interaction};
  viewport.setPointerCapture(e.pointerId);
 },{passive:false});
 viewport.addEventListener('pointermove',e=>{
  g.move(e.pointerId,e.clientX,e.clientY);if(!active||active.id!==e.pointerId||blocked)return;e.preventDefault();
  active.clientX=e.clientX;active.clientY=e.clientY;
  if(Math.hypot(e.clientX-active.x,e.clientY-active.y)>10)active.moved=true;
  if(!active.moved)return;
  if(active.interaction.pan){viewport.scrollLeft=active.left+active.x-e.clientX;viewport.scrollTop=active.top+active.y-e.clientY;}
  else{active.interaction.move?.(e.clientX,e.clientY);if(edgeFrame===null)edgeFrame=requestAnimationFrame(edgeScroll);}
 },{passive:false});
 viewport.addEventListener('pointerup',e=>{
  e.preventDefault();stopEdge();const tap=g.up(e.pointerId,e.clientX,e.clientY,viewport.scrollLeft,viewport.scrollTop),a=active;
  ids.delete(e.pointerId);if(a?.id===e.pointerId)active=null;
  if(!blocked){if(a?.moved){if(!a.interaction.pan)a.interaction.end?.(e.clientX,e.clientY);}else if(tap){if(a?.interaction.tap)a.interaction.tap(e.clientX,e.clientY);else onTap(e.clientX,e.clientY);}}
  if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
  if(!ids.size)blocked=false;
 },{passive:false});
 const abort=e=>{g.cancel(e.pointerId);ids.delete(e.pointerId);if(active?.id===e.pointerId)cancel();if(!ids.size)blocked=false;};
 viewport.addEventListener('pointercancel',abort);
 viewport.addEventListener('lostpointercapture',e=>{if(active?.id===e.pointerId)abort(e);});
 for(const type of ['contextmenu','dragstart','selectstart'])viewport.addEventListener(type,e=>e.preventDefault());
 const reset=()=>{cancel();ids.clear();blocked=false;g.reset();};
 window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 return {reset};
}

/** A destination is armed only after it remains the current legal tile for delay ms.
 * Changing tile or cancelling invalidates the timer (including late callbacks). */
export function createHoldLock(delay=200,onArm=()=>{}){
 let timer=null,cell=null,armed=false;
 const reset=()=>{if(timer!==null)clearTimeout(timer);timer=null;cell=null;armed=false;};
 const enter=next=>{
  if(next===cell)return;
  reset();if(next===null)return;cell=next;
  timer=setTimeout(()=>{timer=null;if(cell!==next)return;armed=true;onArm(next);},delay);
 };
 return {enter,reset,get armed(){return armed;},get cell(){return cell;}};
}
