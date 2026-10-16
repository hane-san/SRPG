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
export function bindMapInput(viewport,onTap){
 const g=createGesture();
 viewport.addEventListener('pointerdown',e=>{if(e.button!==0)return;g.down(e.pointerId,e.clientX,e.clientY,viewport.scrollLeft,viewport.scrollTop);});
 viewport.addEventListener('pointermove',e=>g.move(e.pointerId,e.clientX,e.clientY));
 viewport.addEventListener('pointerup',e=>{if(g.up(e.pointerId,e.clientX,e.clientY,viewport.scrollLeft,viewport.scrollTop)){e.preventDefault();onTap(e.clientX,e.clientY);}});
 viewport.addEventListener('pointercancel',e=>g.cancel(e.pointerId));
 viewport.addEventListener('pointerleave',e=>{if(e.buttons)g.cancel(e.pointerId);});
 window.addEventListener('blur',()=>g.reset());
 document.addEventListener('visibilitychange',()=>g.reset());
}
