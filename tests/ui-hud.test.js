import test from 'node:test';
import assert from 'node:assert/strict';
import {hudSignals,routeIntent,PHASE_LABELS} from '../ui-hud.js';
test('P1 to P4 display exactly one current phase while battles run',()=>{
 assert.deepEqual(PHASE_LABELS,['Ⅰ 味方','Ⅱ 敵軍','Ⅲ 待機支援','Ⅳ 戦場']);
 for(let phase=1;phase<=4;phase++)assert.equal(hudSignals({phase,status:'playing'}).active,phase);
 for(const status of ['victory','defeat'])assert.equal(hudSignals({phase:4,status}).active,0);
 assert.equal(hudSignals({phase:0,status:'playing'}).active,0);
 assert.equal(hudSignals({phase:5,status:'playing'}).active,0);
 assert.equal(hudSignals({phase:1.5,status:'playing'}).active,0);
});
test('a cannon strike overrides reinforcements and weather in the warning hierarchy',()=>{
 assert.equal(hudSignals({weatherCycle:[1]}).level,'weather');
 assert.equal(hudSignals({map:{weatherCycle:['light','heavy']}}).level,'weather','real state nests the cycle on map');
 assert.equal(hudSignals({warnings:[{kind:'reinforce'}],weatherCycle:[1]}).level,'reinforcement');
 assert.equal(hudSignals({warnings:[{kind:'reinforcement'}]}).level,'reinforcement');
 assert.equal(hudSignals({warnings:[{kind:'reinforce'},{kind:'cannon'}],weatherCycle:[1]}).level,'cannon');
 assert.equal(hudSignals({warnings:[{kind:'cannon'}]}).level,'cannon');
 assert.equal(hudSignals({}).level,'none');
});
test('dragging intention has a clear precedence: invalid > attack > locked > route',()=>{
 assert.equal(routeIntent({}),'route');
 assert.equal(routeIntent({moveArmed:true}),'locked');
 assert.equal(routeIntent({target:'e',moveArmed:true}),'attack');
 assert.equal(routeIntent({attackError:'射程外',target:'e',moveArmed:true}),'invalid');
});
