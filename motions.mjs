import fs from 'node:fs';
import * as T from '../dist/vendor/three.module.mjs';

// Read the creator's CC0 clips, sample their world-space joint rotations, then
// transfer those rotations onto our independently authored proportions.
export function readReference(path){
 const b=fs.readFileSync(path),len=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+len)),bin=b.subarray(28+len);
 const size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
 const accessor=i=>{const a=j.accessors[i],v=j.bufferViews[a.bufferView],n=size[a.type],stride=v.byteStride||n*4,off=(v.byteOffset||0)+(a.byteOffset||0),out=[];for(let k=0;k<a.count;k++)for(let c=0;c<n;c++)out.push(bin.readFloatLE(off+k*stride+c*4));return out;};
 const nodes=j.nodes.map(n=>{const o=new T.Object3D();o.name=n.name||'';if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
 j.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));const roots=nodes.filter(n=>!n.parent),update=()=>roots.forEach(n=>n.updateMatrixWorld(true));update();
 const rest=nodes.map(n=>({p:n.position.clone(),q:n.quaternion.clone(),s:n.scale.clone(),wq:n.getWorldQuaternion(new T.Quaternion()),wp:n.getWorldPosition(new T.Vector3())}));
 const map=Object.fromEntries(nodes.map((n,i)=>[n.name,i]));
 function sample(name,time){
  nodes.forEach((n,i)=>{n.position.copy(rest[i].p);n.quaternion.copy(rest[i].q);n.scale.copy(rest[i].s);});
  const a=j.animations.find(a=>a.name===name);if(!a)throw Error('Missing reference clip '+name);
  for(const c of a.channels){const s=a.samplers[c.sampler],times=accessor(s.input),values=accessor(s.output),n=c.target.path==='rotation'?4:3;let k=0;while(k<times.length-2&&times[k+1]<time)k++;const z=Math.min(k+1,times.length-1),f=T.MathUtils.clamp((time-times[k])/(times[z]-times[k]||1),0,1),o=nodes[c.target.node];
   if(c.target.path==='rotation')o.quaternion.fromArray(values,k*n).slerp(new T.Quaternion().fromArray(values,z*n),f);
   else (c.target.path==='translation'?o.position:o.scale).fromArray(values,k*n).lerp(new T.Vector3().fromArray(values,z*n),f);
  }update();
  const deltas={};for(const [name,i]of Object.entries(map))deltas[name]=nodes[i].getWorldQuaternion(new T.Quaternion()).multiply(rest[i].wq.clone().invert()).toArray();
  const hip=nodes[map.hips].getWorldPosition(new T.Vector3()).sub(rest[map.hips].wp).toArray();return {deltas,hip};
 }
 const names=['Idle','Walking_A','Running_A','1H_Melee_Attack_Stab','1H_Melee_Attack_Slice_Diagonal','1H_Melee_Attack_Chop','2H_Melee_Attack_Slice','Spellcast_Shoot','Spellcast_Raise','Hit_A','Block','Death_A'];
 return Object.fromEntries(names.map(name=>{const a=j.animations.find(a=>a.name===name);if(!a)throw Error(name);const duration=Math.max(...a.samplers.map(s=>accessor(s.input).at(-1))),frames=Math.ceil(duration*30);return [name,{duration,samples:Array.from({length:frames+1},(_,k)=>({time:k/frames*duration,...sample(name,k/frames*duration)}))}];}));
}

export function retarget(model,reference){
 const source={idle:'Idle',walk:'Walking_A',run:'Running_A',attack:model.type==='wolf'?'1H_Melee_Attack_Slice_Diagonal':model.type==='human'?'Spellcast_Shoot':'1H_Melee_Attack_Stab',skill:model.type==='wolf'?'1H_Melee_Attack_Chop':model.type==='human'?'Spellcast_Raise':'1H_Melee_Attack_Stab',cast:'Spellcast_Raise',hit:'Hit_A',guard:'Block',death:'Death_A'};
 const bones=model.bones,index=Object.fromEntries(bones.map((b,i)=>[b.name,i]));
 return Object.entries(source).map(([name,ref])=>{
  const clip=reference[ref],rotations=bones.map(()=>[]),hips=[],times=[];
  for(const sample of clip.samples){const world=[],positions=[],local=[];
   bones.forEach((b,i)=>{const parent=index[b.parent],pq=world[parent]||new T.Quaternion(),sourceName=b.name.startsWith('hand.')?b.name.replace('hand.','wrist.'):b.name;let q;
    if(sample.deltas[sourceName])q=new T.Quaternion().fromArray(sample.deltas[sourceName]);else q=pq.clone();
    let l=pq.clone().invert().multiply(q);
    // Cloth is secondary animation, separate from the captured locomotion.
    if(/^(coat|cape|capeTip|tail)/.test(b.name)){const phase=sample.time/clip.duration*Math.PI*2,walk=name==='walk'||name==='run',side=b.name.endsWith('.r')?-1:1;l.setFromEuler(new T.Euler((walk?.12:.025)*Math.sin(phase+side*.6),.025*Math.sin(phase),side*.018));q=pq.clone().multiply(l);}
    world[i]=q;local[i]=l;
    const base=new T.Vector3().fromArray(b.position);if(parent!==undefined)base.sub(new T.Vector3().fromArray(bones[parent].position)).applyQuaternion(pq).add(positions[parent]);
    if(b.name==='hips')base.add(new T.Vector3(0,sample.hip[1]*1.55,0));positions[i]=base;
   });
   // Solve the support foot against the floor after adapting leg lengths.
   let lift=0;if(name!=='death'){
    let low=Infinity;for(const side of ['l','r']){const i=index['foot.'+side];for(const p of [[0,-.155,-.12],[0,-.155,.36]])low=Math.min(low,new T.Vector3(...p).applyQuaternion(world[i]).add(positions[i]).y);}
    lift=-low+.015;
   }
   const hip=bones[index.hips],parent=bones[index[hip.parent]];hips.push(hip.position[0]-parent.position[0],hip.position[1]-parent.position[1]+sample.hip[1]*1.55+lift,hip.position[2]-parent.position[2]);times.push(sample.time);
   local.forEach((q,i)=>{const prev=rotations[i].slice(-4);if(prev.length&&q.dot(new T.Quaternion(...prev))<0)q.set(-q.x,-q.y,-q.z,-q.w);rotations[i].push(...q.toArray());});
  }
  return {name,duration:clip.duration,times,rotations,hips,contact:name==='attack'?(model.type==='vampire'?.32:model.type==='wolf'?.40:.33):name==='skill'?.38:.55,source:ref};
 });
}
