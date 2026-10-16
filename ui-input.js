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
// Selected-unit gestures use capture; other map drags keep native scrolling.
// begin() returns {move,end,cancel} for routes or {pan:true} outside the range.
export function bindMapInput(viewport,onTap,begin=()=>null){
 const g=createGesture(),ids=new Set();let active=null,blocked=false;
 const cancel=()=>{active?.interaction.cancel?.();active=null;};
 viewport.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;ids.add(e.pointerId);g.down(e.pointerId,e.clientX,e.clientY,viewport.scrollLeft,viewport.scrollTop);
  if(ids.size>1){blocked=true;cancel();return;}
  if(blocked)return;const interaction=begin(e.clientX,e.clientY);
  if(interaction){active={id:e.pointerId,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false,interaction};viewport.setPointerCapture(e.pointerId);e.preventDefault();}
 });
 viewport.addEventListener('pointermove',e=>{
  g.move(e.pointerId,e.clientX,e.clientY);if(!active||active.id!==e.pointerId||blocked)return;
  if(Math.hypot(e.clientX-active.x,e.clientY-active.y)>10)active.moved=true;
  if(!active.moved)return;e.preventDefault();
  if(active.interaction.pan){viewport.scrollLeft=active.left+active.x-e.clientX;viewport.scrollTop=active.top+active.y-e.clientY;}
  else active.interaction.move?.(e.clientX,e.clientY);
 });
 viewport.addEventListener('pointerup',e=>{
  const tap=g.up(e.pointerId,e.clientX,e.clientY,viewport.scrollLeft,viewport.scrollTop),a=active;
  ids.delete(e.pointerId);if(a?.id===e.pointerId)active=null;
  if(!blocked){if(a?.moved){if(!a.interaction.pan)a.interaction.end?.(e.clientX,e.clientY);e.preventDefault();}else if(tap){e.preventDefault();onTap(e.clientX,e.clientY);}}
  if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
  if(!ids.size)blocked=false;
 });
 const abort=e=>{g.cancel(e.pointerId);ids.delete(e.pointerId);if(active?.id===e.pointerId)cancel();if(!ids.size)blocked=false;};
 viewport.addEventListener('pointercancel',abort);
 viewport.addEventListener('lostpointercapture',e=>{if(active?.id===e.pointerId)abort(e);});
 viewport.addEventListener('pointerleave',e=>{if(e.buttons&&!viewport.hasPointerCapture(e.pointerId))abort(e);});
 const reset=()=>{cancel();ids.clear();blocked=false;g.reset();};
 window.addEventListener('blur',reset);document.addEventListener('visibilitychange',reset);
 return {reset};
}
