import assert from 'node:assert/strict';
import {newGame,choose,startBattle,tick,action,reward,damage,enhance,rest,serialize,restore,totalBp} from '../dist/core.mjs';
let checks=0;const check=(condition,msg)=>{assert.ok(condition,msg);checks++;};
let t={hp:80,bp:20,ap:70};let d=damage(t,30);check(t.hp===70&&t.bp===0&&d.broken&&t.ap===42,'BP absorbs damage and breaking delays');
t={hp:80,bp:20,ap:70};damage(t,30,{pierce:true});check(t.hp===50&&t.bp===20,'Piercing bypasses BP');
t={hp:80,bp:40,ap:70};damage(t,20,{breaker:true});check(t.hp===80&&t.bp===0,'Breaker spends amplified damage on BP');
let s=newGame();choose(s,'wolf');check(s.party[0].maxBp===48&&s.affinity.wolf===1,'Choice effect applied');check(!choose(s,'human'),'Choice cannot reward twice');
startBattle(s);s.active=0;const clock=s.clock,ap=s.party[1].ap;tick(s,5);check(s.clock===clock&&s.party[1].ap===ap,'Command selection freezes time');s.party[0].mp=0;const before=serialize(s);check(!action(s,'skill').ok&&serialize(s)===before,'Insufficient MP consumes no turn or resource');
s.active=2;s.party[0].hp=0;s.party[2].mp=30;check(action(s,'support').ok&&s.party[0].hp===48,'Support revives fallen ally');
s=newGame();let gold=s.gold;check(enhance(s,0).ok&&s.gold===gold-50&&s.party[0].upgrade===1,'Upgrade charges correct resources');s.gold=0;const noMoney=serialize(s);check(!enhance(s,0).ok&&serialize(s)===noMoney,'Insufficient currency leaves state unchanged');
check(restore(serialize(s))?.party.length===3,'Valid save round trips');check(restore('{bad')===null,'Malformed save rejected');s.phase='battle';check(restore(serialize(s))===null,'Mid-battle save rejected');
const runs=[];
for(const choice of ['human','wolf','vampire']){
 s=newGame();choose(s,choice);let actions=0;
 for(const battle of [1,2]){
  if(battle===2){for(let i=0;i<3;i++)enhance(s,i);rest(s);}
  startBattle(s,battle);
  for(let i=0;i<20000&&s.phase==='battle';i++){
   tick(s,.05);if(s.active===null)continue;
   const h=s.party[s.active];let skill='skill';s.target=s.enemies.findIndex(e=>e.hp>0);
   if(h.id==='human'&&s.party.some(p=>p.hp/p.maxHp<.5))skill='support';
   if(h.id==='wolf'&&s.enemies[s.target].bp<=0)skill='attack';
   if(h.mp<12)skill='attack';
   const result=action(s,skill);assert.ok(result.ok);actions++;
  }
  check(s.phase==='victory',`${choice}, battle ${battle} must be winnable`);
  const rewardGold=s.gold;check(reward(s),'Reward resolves');check(!reward(s)&&s.gold>rewardGold,'Rewards not duplicated');
 }
 check(s.ending&&s.chapter===3&&s.party.every(h=>h.level>=2),'Progression reaches ending');runs.push({choice,actions,levels:s.party.map(h=>h.level),gold:s.gold});
}
console.log(JSON.stringify({checks,runs},null,2));
