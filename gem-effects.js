// Presentation-only timing for the six HP jewels. No combat rules here.
export function gemPlan(beforeHP,afterHP,amount,{heal=false,armoured=false,ally=false}={}){
 const start=Math.max(0,Math.min(6,Number(beforeHP)||0)),end=Math.max(0,Math.min(6,Number(afterHP)||0));
 const count=heal?Math.max(0,end-start):Math.max(0,start-end);
 const heavy=!heal&&Number(amount)>=4;
 return {
  count,start,end,heal,heavy,armoured:!!armoured,ally:!!ally,
  lethal:!heal&&count>0&&end===0,
  hitStopMs:heavy?66:0,
  firstDelayMs:heal?25:heavy?10:25,
  intervalMs:heavy?49:heal?83:74,
  finishMs:heal?38:heavy?70:54
 };
}
export function gemHP(plan,step){
 const i=Math.min(plan.count,Math.max(0,Math.floor(step)));
 return plan.heal?Math.min(plan.end,plan.start+i):Math.max(plan.end,plan.start-i);
}
// An "overkill" strike of 5 against HP2 is still a heavy attack, but only two jewels break.
export function gemSchedule(plan,fast=false,reduced=false){
 return {
  hitStopMs:fast||reduced?0:plan.hitStopMs,
  firstDelayMs:fast||reduced?0:plan.firstDelayMs,
  intervalMs:fast?32:reduced?24:plan.intervalMs,
  finishMs:fast?20:reduced?16:plan.finishMs
 };
}
