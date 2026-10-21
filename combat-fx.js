// Deterministic combat presentation: no game state, clocks, canvas or audio.
export function feedbackStyle({heal=false,heavy=false,armoured=false,count=0,ally=false,fast=false,reduced=false}={}){
 const calm=!!(fast||reduced),hits=Math.max(0,Math.min(6,Number(count)||0));
 return {
  heal:!!heal,heavy:!!heavy,armoured:!!armoured,ally:!!ally,
  recoil:heal||calm?0:heavy?2:hits===2?1.35:hits>=3?1.1:.75,
  radius:heal?9:heavy?14:armoured?8:hits===2?11:8,
  rays:heal?4:heavy?8:hits===2?6:4,
  glow:reduced?0:heal?.38:heavy?.58:hits===2?.46:.30,
  dust:calm?0:.28
 };
}
// Smooth, bounded and fully vanished at progress=1; reduced motion has no kick.
export function impactFrame(style,progress=0){
 const p=Math.max(0,Math.min(1,Number(progress)||0)),fade=(1-p)*(1-p);
 return {alpha:fade,ring:style.radius*(.48+.52*p),recoil:style.recoil*fade,glow:style.glow*fade,rays:style.rays};
}
export function landingFrame(progress=0,reduced=false,fast=false){
 const p=Math.max(0,Math.min(1,Number(progress)||0));
 return {alpha:reduced||fast?0:(1-p)*.27,spread:3+6*p};
}
