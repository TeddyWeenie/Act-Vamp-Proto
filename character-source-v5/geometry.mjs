import * as T from '../dist/vendor/three.module.mjs';
export {T};
export const vec=a=>new T.Vector3(...a);
// New V5 mesh authoring primitives. Every vertex is assigned normalized skin weights.
export class MeshBuilder{
 constructor(bones){this.bones=bones;this.batches=new Map();}
 add(geo,material,weights,transform=new T.Matrix4()){
  const g=geo.clone().applyMatrix4(transform);if(!g.attributes.normal)g.computeVertexNormals();const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;
  const batch=this.batches.get(material)||{p:[],n:[],uv:[],j:[],w:[],idx:[]};const offset=batch.p.length/3;
  for(let i=0;i<p.count;i++){const point=[p.getX(i),p.getY(i),p.getZ(i)],skin=typeof weights==='function'?weights(point):[[weights,1]];let sum=skin.reduce((a,v)=>a+v[1],0);batch.p.push(...point);batch.n.push(n.getX(i),n.getY(i),n.getZ(i));batch.uv.push(u?u.getX(i):0,u?u.getY(i):0);for(let k=0;k<4;k++){batch.j.push(skin[k]?this.bones.findIndex(b=>b.name===skin[k][0]):0);batch.w.push(skin[k]?skin[k][1]/sum:0);}}
  const idx=g.index?.array||Array.from({length:p.count},(_,i)=>i);for(const i of idx)batch.idx.push(i+offset);this.batches.set(material,batch);g.dispose();
 }
 ellipsoid(center,size,mat,bone,segments=20){const geo=new T.SphereGeometry(1,segments,14);this.add(geo,mat,bone,new T.Matrix4().compose(vec(center),new T.Quaternion(),vec(size)));}
 box(center,size,mat,bone,rot=[0,0,0]){this.add(new T.BoxGeometry(...size),mat,bone,new T.Matrix4().compose(vec(center),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1)));}
 tube(points,r,mat,bone){const g=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(vec)),Math.max(8,points.length*5),r,5,false);this.add(g,mat,bone);}
 ring(center,r,thickness,mat,bone,rot=[0,0,0],scale=[1,1,1]){const g=new T.TorusGeometry(r,thickness,6,32);this.add(g,mat,bone,new T.Matrix4().compose(vec(center),new T.Quaternion().setFromEuler(new T.Euler(...rot)),vec(scale)));}
 // A closed, continuous cross-section surface. Rows are [x,y,z,width,depth].
 loft(rows,mat,weights,axis='y',segments=24){const p=[],uv=[],idx=[],N=rows.length-1;
  for(let j=0;j<rows.length;j++){const [x,y,z,w,d]=rows[j];for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;p.push(x+(axis==='y'?Math.sin(a)*w:0),y+(axis==='x'?Math.sin(a)*w:0),z+Math.cos(a)*d);uv.push(i/segments,j/N);}}
  for(let j=0;j<N;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;const order=axis==='y'?[a,a+1,b,a+1,b+1,b]:[a,b,a+1,a+1,b,b+1];idx.push(...order);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();this.add(g,mat,weights);return g;
 }
 panel(points,mat,bone,depth=.025){const s=new T.Shape();points.forEach((a,i)=>i?s.lineTo(a[0],a[1]):s.moveTo(a[0],a[1]));s.closePath();const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.012,bevelThickness:.007,bevelSegments:2});this.add(geo,mat,bone,new T.Matrix4().makeTranslation(0,0,points[0][2]));}
 // Flattened blade-shaped hair lock; elliptical cross-section has a ridged middle and tapered tip.
 blade(points,width,mat,bone,depth=.025){const path=new T.CatmullRomCurve3(points.map(vec)),p=[],uv=[],idx=[],N=14,S=8;
  for(let j=0;j<=N;j++){const t=j/N,q=path.getPoint(t),tangent=path.getTangent(t),side=new T.Vector3(tangent.y,-tangent.x,0).normalize();if(side.lengthSq()<.1)side.set(1,0,0);const f=Math.max(.005,Math.pow(1-t,.58))*(.72+.28*Math.sin(t*Math.PI));for(let i=0;i<=S;i++){const a=i/S*Math.PI*2;p.push(q.x+side.x*Math.cos(a)*width*f,q.y+side.y*Math.cos(a)*width*f,q.z+Math.sin(a)*depth*f);uv.push(i/S,t);}}
  for(let j=0;j<N;j++)for(let i=0;i<S;i++){const a=j*(S+1)+i,b=a+S+1;idx.push(a,b,a+1,a+1,b,b+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();this.add(g,mat,bone);
 }
}
export const smooth=(a,b,x)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
