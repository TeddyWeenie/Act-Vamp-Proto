import * as T from './vendor/three.module.mjs';
import {playAction,resetCharacter}from'./characters-v5.mjs';

// Presentation owns a separate clock: modal/visibility pauses cannot move a
// contact event ahead of the pose that causes it. One action can hit many targets.
export class CombatPerformance{
 constructor(world){this.world=world;this.queue=[];this.active=null;}
 get busy(){return !!this.active||this.queue.length>0;}
 clear(){this.queue=[];this.active=null;for(const a of Object.values(this.world.actors)){a.userData.presentationDead=false;a.userData.combatMoving=false;a.userData.legacyAttack=0;if(a.userData.edition===5)resetCharacter(a);}}
 enqueue(actor,targets,kind,onContact,onDone){this.queue.push({actor,targets,kind,onContact,onDone});}
 start(s){const w=this.world,a=w.actors[s.actor],b=w.actors[s.targets[0]];if(!a){s.onContact?.();s.onDone?.();return;}
  const motion=s.kind==='support'||s.kind==='potion'?'cast':s.kind==='guard'?'guard':s.kind==='skill'?'skill':'attack',ranged=s.actor==='human'||['support','potion','guard'].includes(s.kind);
  const from=a.position.clone(),to=from.clone();if(b&&!ranged){const dir=b.position.clone().sub(from).setY(0).normalize(),reach=a.userData.edition===5?1.85:1.2;to.copy(b.position).addScaledVector(dir,-reach);}
  const travel=from.distanceTo(to),approach=travel>.05?travel/7:0,duration=a.userData.meta?.[motion]?.duration||.85;
  this.active={...s,a,b,from,to,motion,time:0,approach,duration,returnTime:approach,contact:duration*(a.userData.meta?.[motion]?.contact||.35),hit:false,started:false};
  if(b){const d=b.position.clone().sub(a.position);a.rotation.y=Math.atan2(d.x,d.z);}a.userData.combatMoving=approach>0;
 }
 update(dt){if(!this.active&&this.queue.length)this.start(this.queue.shift());const s=this.active;if(!s)return;s.time+=dt;const {a,b,from,to}=s,w=this.world;
  if(s.time<s.approach){a.position.lerpVectors(from,to,s.time/s.approach);return;}
  if(!s.started){s.started=true;a.position.copy(to);a.userData.combatMoving=false;if(a.userData.edition===5)playAction(a,s.motion);}
  const actionTime=s.time-s.approach;if(a.userData.edition!==5)a.userData.legacyAttack=Math.sin(Math.min(1,actionTime/s.duration)*Math.PI);
  if(!s.hit&&actionTime>=s.contact){s.hit=true;s.onContact?.();for(const id of s.targets){const target=w.actors[id];if(!target)continue;w.impact(id,['support','potion'].includes(s.kind));if(target.userData.edition===5){playAction(target,target.userData.presentationDead?'death':'hit');}else target.userData.recoil=.25;}}
  if(actionTime>=s.duration){const t=actionTime-s.duration;a.userData.legacyAttack=0;
   if(t<s.returnTime){a.userData.combatMoving=true;const d=from.clone().sub(to);a.rotation.y=Math.atan2(d.x,d.z);a.position.lerpVectors(to,from,t/s.returnTime);}
   else{a.position.copy(from);a.userData.combatMoving=false;if(b){const d=b.position.clone().sub(from);a.rotation.y=Math.atan2(d.x,d.z);}this.active=null;s.onDone?.();}
  }
 }
}
