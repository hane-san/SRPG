import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {campaign} from './audit-balance.mjs';
import {ROSTER,MAPS,positions} from '../data.js';
import {readSave,writeSave} from '../save.js';
test('chapter two starts with a base defender, adjacent healer and a real eastern cavalry route',()=>{
 const s=E.createGame(1),u=id=>s.units.find(u=>u.id===id);assert.equal(E.dist(u('a1'),s.map.base),0);assert.equal(E.dist(u('a5'),s.map.base),1);assert(u('a6').x>=12&&u('a7').x>=12);assert.equal(s.map.maxWaves,3);
});
test('fallen captains do not shift surviving specialists into another deployment slot; reserves never collide',()=>{
 for(let map=0;map<MAPS.length;map++)for(const lost of [['a2'],ROSTER.slice(0,7).map(u=>u.id)]){
  const s=E.createGame(map,{},lost),p=positions(map);for(const [i,r]of ROSTER.entries())if(!lost.includes(r.id)){const u=s.units.find(u=>u.id===r.id);assert.deepEqual([u.x,u.y],p[i]);}
  const cells=E.alive(s,'ally').map(E.key);assert.equal(new Set(cells).size,cells.length);assert(cells.length>=4);assert(!s.units.some(u=>lost.includes(u.id)));
 }
});
test('standard line troops reward coordinated attacks, and the low-HP shooter stays fragile',()=>{
 for(const m of MAPS){const s=E.createGame(m.id),sword=s.units.find(u=>u.id==='a2');for(const e of E.alive(s,'enemy').filter(e=>e.id!=='boss')){const hits=Math.ceil(e.hp/E.damage(s,sword,e));assert(hits>=2&&hits<=4,`${m.id} ${e.id}: ${hits}`);}assert.equal(s.units.find(u=>u.id==='a9').maxHp,10);}
});
test('0.6 accepts stable older rosters without changing their saved HP, position or acted flag',()=>{
 for(const release of ['0.2.0','0.3.0','0.4.0','0.5.0','0.5.1','0.5.2'])for(const m of MAPS){let value;const storage={getItem:()=>value,setItem:(_k,v)=>value=v},s=E.createGame(m.id);s.units.find(u=>u.id==='e1'||u.id.startsWith('extra-')).maxHp=26;s.units.find(u=>u.id==='e1'||u.id.startsWith('extra-')).hp=23;E.act(s,'a1',s.units[0],'wait');writeSave(storage,release,s,true);assert.deepEqual(readSave(storage,'0.6.0',MAPS).state,s);}
});
test('leaving the chapter-two base undefended has a real announced southern threat',()=>{
 const s=E.createGame(1);E.act(s,'a1',{x:7,y:15},'wait');for(let i=0;i<4&&s.status==='playing';i++)E.endTurn(s);assert.equal(s.status,'defeat');assert(s.log.some(l=>l.includes('本陣陥落')));
});
test('base and healing duties pass to living survivors without reviving a fallen captain',()=>{
 const s=E.createGame(1,{},['a1','a5']),defender=E.at(s,s.map.base);assert(defender&&defender.team==='ally');assert(!s.units.some(u=>['a1','a5'].includes(u.id)));assert(E.alive(s,'ally').some(u=>u.skill==='heal'&&E.dist(u,s.map.base)===1));assert.equal(new Set(E.alive(s).map(E.key)).size,E.alive(s).length);assert(s.log.some(l=>l.includes('引き継ぎ')));
});
test('a classic campaign with permanent losses and a casual campaign both remain completable by the same garrison example',()=>{
 for(const mode of ['classic','casual']){const c=campaign(mode);assert.equal(c.chapters.length,3);assert(c.chapters.every(r=>r.status==='victory'&&r.turn<=24&&r.alive>=4),JSON.stringify(c));if(mode==='casual')assert.deepEqual(c.lost,[]);else assert(c.lost.length>0);}
});
test('reinforcements share the line-troop profile and difficulty, and arrive without dealing damage',()=>{
 for(const enemyAttack of [-2,0,2]){const s=E.createGame(1,{enemyAttack}),line=s.units.find(u=>u.id==='e2'),hp=s.units.filter(u=>u.team==='ally').map(u=>u.hp);s.turn=4;s.phase=4;s.warnings=[{kind:'spawn',turn:4,cells:s.map.spawns}];E.eventPhase(s);const wave=s.units.find(u=>u.id==='reinforcement-4-0');assert(wave);assert.equal(wave.hp,wave.maxHp);for(const field of ['maxHp','atk','def','move'])assert.equal(wave[field],line[field]);assert.deepEqual(s.units.filter(u=>u.team==='ally').map(u=>u.hp),hp);}
});
