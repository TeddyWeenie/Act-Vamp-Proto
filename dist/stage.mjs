import * as T from './vendor/three.module.mjs';

// A modular town kit. UVs describe metres; each atlas quadrant repeats independently.
const loader=new T.TextureLoader();
const atlas=typeof document!=='undefined'?loader.load(new URL('./art-04/material-atlas.png',import.meta.url).href):new T.Texture();
atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=8;
const materials=new Map();
function material(color,kind='solid'){
 const key=kind+color;if(materials.has(key))return materials.get(key);
 const m=new T.MeshStandardMaterial({color,roughness:.91,metalness:kind==='metal'?.55:0});
 if(['stone','roof','plaster','wood'].includes(kind)){
  m.map=atlas;const cell={stone:[0,.5],roof:[.5,.5],plaster:[0,0],wood:[.5,0]}[kind];
  m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec2 tileUV=fract(vMapUv)*0.497+vec2(${cell[0]+.0015},${cell[1]+.0015});\nvec4 sampledDiffuseColor=texture2D(map,tileUV);diffuseColor*=sampledDiffuseColor;`);};
  m.customProgramCacheKey=()=>kind;
 }
 materials.set(key,m);return m;
}
let seed=81429;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const colors={stone:0xc6bda7,wood:0xb3a18a,cream:0xfff0d1,iron:0x35403e,gold:0xb99a5e,slate:0xb2c4cf};
function mesh(parent,geo,mat,x=0,y=0,z=0){const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function uvScale(geo,x,y){const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++){uv.setXY(i,uv.getX(i)*x,uv.getY(i)*y);}return geo;}
function box(p,w,h,d,c,x=0,y=0,z=0,kind='solid'){
 const geo=new T.BoxGeometry(w,h,d);if(kind!=='solid'&&kind!=='metal'){const uv=geo.attributes.uv;for(let f=0;f<6;f++){const a=f<2?d:w,b=f===2||f===3?d:h;for(let i=f*4;i<f*4+4;i++)uv.setXY(i,uv.getX(i)*a/2,uv.getY(i)*b/2);}}
 return mesh(p,geo,material(c,kind),x,y,z);
}
function cyl(p,r1,r2,h,c,x=0,y=0,z=0,kind='solid',n=16){return mesh(p,uvScale(new T.CylinderGeometry(r1,r2,h,n),r2*2,h/2),material(c,kind),x,y,z);}
function ball(p,r,c,x,y,z){return mesh(p,new T.IcosahedronGeometry(r,1),material(c),x,y,z);}
function beam(p,a,b,width,c=colors.wood,kind='wood'){
 const start=new T.Vector3(...a),end=new T.Vector3(...b),o=box(p,width,start.distanceTo(end),width,c,...start.clone().add(end).multiplyScalar(.5).toArray(),kind);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());return o;
}
function tube(p,points,r,c=colors.gold){const path=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));return mesh(p,new T.TubeGeometry(path,24,r,7,false),material(c,'metal'));}
function torus(p,r,t,c,x,y,z,rx=0){const m=mesh(p,new T.TorusGeometry(r,t,6,48),material(c,'metal'),x,y,z);m.rotation.x=rx;return m;}
function group(p,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;}
function arch(p,w,h,depth,c,x,y,z,kind='stone'){
 const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(-w/2,h-w/2);shape.absarc(0,h-w/2,w/2,Math.PI,0,true);shape.lineTo(w/2,0);shape.closePath();
 return mesh(p,new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:18}),material(c,kind),x,y,z);
}
function windowKit(p,x,y,z,w=.78,h=1.25){
 arch(p,w+.22,h+.12,.15,0xd7c5a2,x,y-.07,z-.04);arch(p,w,h,.17,0x303c3e,x,y,z+.035,'solid');
 const glass=arch(p,w-.15,h-.15,.018,0xe0ad61,x,y+.06,z+.22,'solid');glass.material=material(0xf5c77c);glass.material.emissive=new T.Color(0x765122);glass.material.emissiveIntensity=.25;
 for(const side of [-1,1])box(p,.055,h-.2,.06,colors.wood,x+side*w*.22,y+h*.47,z+.27);
 box(p,w-.08,.055,.06,colors.wood,x,y+h*.49,z+.27);box(p,w+.3,.13,.4,colors.stone,x,y-.06,z+.17,'stone');
 for(const side of [-1,1]){const sh=box(p,w*.24,h*.75,.09,0x64817a,x+side*(w*.68),y+h*.38,z+.13,'wood');sh.rotation.y=side*.20;}
}
function planter(p,x,y,z,w=1){box(p,w,.25,.34,colors.wood,x,y,z,'wood');box(p,w-.08,.035,.27,0x3e4132,x,y+.14,z);for(let i=0;i<16;i++){const a=x+(rand()-.5)*w,zz=z+(rand()-.5)*.32;ball(p,.10,0x536e40,a,y+.24+rand()*.12,zz);if(i%2===0)ball(p,.055,i%4?0xe8c983:0xba5960,a,y+.35+rand()*.09,zz);}}
function roof(p,w,d,h,y,color=colors.slate){
 const rise=h,half=w/2+.35,len=Math.hypot(half,rise);
 for(const side of [-1,1]){const geo=uvScale(new T.PlaneGeometry(d+.75,len), (d+.75)/2,len/2);const r=mesh(p,geo,material(color,'roof'),side*half/2,y+rise/2,0);r.rotation.set(-Math.atan2(half,rise),0,side===1?Math.PI/2:-Math.PI/2); // replaced by explicit roof quads below
  p.remove(r);
  const v=side===1?[0,y+rise,-d/2-.38,0,y+rise,d/2+.38,half,y,d/2+.38,half,y,-d/2-.38]:[-half,y,-d/2-.38,-half,y,d/2+.38,0,y+rise,d/2+.38,0,y+rise,-d/2-.38];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute([0,len/2,(d+.76)/2,len/2,(d+.76)/2,0,0,0],2));g.setIndex(side===1?[0,1,2,0,2,3]:[0,1,2,0,2,3]);g.computeVertexNormals();mesh(p,g,material(color,'roof'));
  for(const zz of [-d/2-.4,d/2+.4])beam(p,[0,y+rise+.03,zz],[side*half,y,zz],.14,colors.wood);
  beam(p,[side*half,y,-d/2-.4],[side*half,y,d/2+.4],.13,colors.wood);
 }
 beam(p,[0,y+rise+.05,-d/2-.5],[0,y+rise+.05,d/2+.5],.18,0x777f81,'solid');
 for(const zz of [-d/2-.025,d/2+.025]){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(0,h);s.closePath();const g=uvScale(new T.ShapeGeometry(s),1,1);const m=mesh(p,g,material(colors.cream,'plaster'),0,y,zz);if(zz<0)m.rotation.y=Math.PI;beam(p,[0,y,zz+(zz>0?.06:-.06)],[0,y+h-.1,zz+(zz>0?.06:-.06)],.13);}
}
function building(p,world,{x,z,w,d,h,type='house',rot=0,solid=true}){
 const g=group(p,x,0,z);g.rotation.y=rot;if(solid)world.colliders.push({x,z,w:w+.6,d:d+.6});
 box(g,w+.24,.55,d+.22,colors.stone,0,.22,0,'stone');box(g,w,h,d,type==='manor'?0xe0d9c8:colors.cream,0,h/2+.4,0,'plaster');
 const eave=h+.4,roofColor=type==='manor'?0xb4a1bc:type==='workshop'?0x8faeb1:colors.slate;
 const level=h*.52+.35;box(g,w+.22,.20,d+.22,colors.wood,0,level,0,'wood');box(g,w+.32,.16,d+.32,colors.wood,0,eave,0,'wood');
 for(const xx of [-w/2,0,w/2]){box(g,.16,h+.1,d+.1,colors.wood,xx,h/2+.4,0,'wood');}
 for(const side of [-1,1]){box(g,w+.16,h*.045,.16,colors.wood,0,1.8,side*d/2,'wood');for(let i=0;i<4;i++){const xx=-w/2+i*w/4;beam(g,[xx,level+.1,side*(d/2+.055)],[xx+w/4,eave-.14,side*(d/2+.055)],.095);}}
 roof(g,w,d,type==='manor'?2.6:2,eave,roofColor);
 for(const side of [-1,1]){windowKit(g,side*w*.28,level+.28,d/2,.72,1.12);planter(g,side*w*.28,level+.12,d/2+.35,.94);}
 arch(g,1.1,1.85,.12,colors.stone,0,.40,d/2+.04);arch(g,.86,1.65,.15,0x9b8065,0,.4,d/2+.16,'wood');torus(g,.065,.015,colors.gold,.25,1.14,d/2+.34);
 for(let i=0;i<3;i++)box(g,1.24+i*.23,.12,.28,colors.stone,0,.36-i*.12,d/2+.37+i*.25,'stone');
 for(const side of [-1,1])windowKit(g,side*w*.30,.64,d/2,.66,1.02);
 // Windows continue around both side walls, readable while rotating the camera.
 for(const side of [-1,1]){const wall=group(g,side*(w/2+.035),0,0);wall.rotation.y=side*Math.PI/2;for(const zz of [-d*.26,d*.26])windowKit(wall,zz,level+.27,0,.65,1.1);}
 const chimney=group(g,w*.29,eave+1,-d*.22);box(chimney,.58,2.25,.63,colors.stone,0,0,0,'stone');box(chimney,.73,.18,.77,colors.stone,0,1.12,0,'stone');box(chimney,.4,.04,.43,0x39403c,0,1.22,0);
 // Projecting front dormer with its own gable.
 const dorm=group(g,0,eave+.4,d*.21);box(dorm,1.15,.95,1.05,colors.cream,0,.47,0,'plaster');roof(dorm,1.15,1.08,.85,.94,roofColor);windowKit(dorm,0,.09,.54,.48,.77);
 if(type==='manor')for(const side of [-1,1]){const b=box(g,.58,2.25,.035,0x682d49,side*w*.43,2.2,d/2+.30);beam(g,[side*w*.43-.36,3.36,d/2+.35],[side*w*.43+.36,3.36,d/2+.35],.05,colors.gold,'metal');const insignia=mesh(g,new T.OctahedronGeometry(.21),material(colors.gold,'metal'),side*w*.43,2.52,d/2+.34);insignia.scale.z=.14;}
 if(type==='workshop'){
  const wheel=group(g,w/2+.35,1.15,0);wheel.rotation.y=Math.PI/2;const turn=group(wheel);world.waterwheel=turn;turn.userData.dynamic=true;
  torus(turn,1.08,.10,0x745438,0,0,0);torus(turn,.82,.045,colors.iron,0,0,.18);for(let j=0;j<12;j++){const a=j*Math.PI/6;beam(turn,[0,0,0],[Math.cos(a),Math.sin(a),0],.09);const paddle=box(turn,.37,.14,.72,0x94704b,Math.cos(a)*1.07,Math.sin(a)*1.07,0,'wood');paddle.rotation.z=a;}cyl(turn,.14,.14,.72,colors.gold,0,0,0,'metal').rotation.x=Math.PI/2;
  for(const side of [-1,1]){tube(g,[[side*.70,2.2,d/2+.3],[side*.70,3.2,d/2+.3],[side*.70,3.45,d/2+.1],[side*.70,3.45,d/2-.4]],.09);cyl(g,.16,.16,1.0,0x3b9e9b,side*.70,2.2,d/2+.25,'metal');for(const yy of [1.7,2.7])cyl(g,.23,.23,.13,colors.gold,side*.70,yy,d/2+.25,'metal');}
 }
 return g;
}
function barrel(p,x,z,size=.45){const g=group(p,x,0,z);cyl(g,size*.82,size,.9,0xbc9670,0,.45,0,'wood');for(const y of [.14,.72])torus(g,size*.95,.035,colors.iron,0,y,0,Math.PI/2);cyl(g,size*.78,size*.78,.035,0x987853,0,.92,0,'wood');return g;}
function market(p,world,x,z,color=0xa95754){const g=group(p,x,0,z);world.colliders.push({x,z,w:2.75,d:1.7});
 box(g,2.65,.88,1.15,0xa58964,0,.44,0,'wood');for(const xx of [-1.3,1.3])for(const zz of [-.6,.6])cyl(g,.045,.06,2.4,colors.wood,xx,1.2,zz,'wood',8);
 for(let j=0;j<10;j++){const x0=-1.42+j*.284,v=[],uv=[],idx=[];for(let k=0;k<=10;k++){const t=k/10;v.push(x0,2.65-.48*t-.13*Math.sin(t*Math.PI),-.8+t*1.8,x0+.284,2.65-.48*t-.13*Math.sin(t*Math.PI),-.8+t*1.8);uv.push(0,t,1,t);if(k<10){const a=k*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();const m=material(j%2?0xe5d6b4:color);m.side=T.DoubleSide;mesh(g,geo,m);const valance=box(g,.282,.21,.025,j%2?0xe5d6b4:color,x0+.142,2.06,1);}
 for(let i=0;i<4;i++){box(g,.57,.17,.72,0x795e42,-.93+i*.62,.96,0,'wood');for(let j=0;j<9;j++)ball(g,.09,[0xb25343,0xc9a65f,0x80904d,0xb77343][i],-.93+i*.62+(rand()-.5)*.42,1.09+rand()*.10,(rand()-.5)*.55);}
 barrel(p,x+1.7,z+.1,.34);const crate=box(p,.68,.65,.68,0xc09c6c,x-1.72,.325,z,'wood');beam(p,[x-2,.10,z+.36],[x-1.45,.57,z+.36],.07);return g;
}
function lantern(p,x,z){const g=group(p,x,0,z);cyl(g,.085,.17,.28,colors.iron,0,.14,0);cyl(g,.045,.08,2.45,colors.iron,0,1.48,0,'metal',8);tube(g,[[0,2.64,0],[0,2.93,0],[.3,3.02,0],[.47,2.83,0]],.035,colors.iron);
 const l=group(g,.47,2.42,0);box(l,.31,.47,.28,0xe9bd70);for(const xx of [-.17,.17])for(const zz of [-.16,.16])beam(l,[xx,-.26,zz],[xx*.75,.28,zz*.75],.027,colors.iron,'metal');cyl(l,.02,.29,.24,colors.iron,0,.38,0,'metal',4);cyl(l,.25,.04,.18,colors.iron,0,-.34,0,'metal',4);
}
const leafShape=()=>{const s=new T.Shape();s.moveTo(0,-.16);s.quadraticCurveTo(.15,-.01,.01,.20);s.quadraticCurveTo(-.13,.03,0,-.16);return new T.ShapeGeometry(s,3);};
function tree(p,world,x,z,scale=1){const g=group(p,x,0,z);g.scale.setScalar(scale);world.colliders.push({x,z,w:.65,d:.65});cyl(g,.13,.26,2.9,0x8a7757,0,1.45,0,'wood',9);
 for(let k=0;k<7;k++){const a=k*2.4;beam(g,[0,1.4,0],[Math.cos(a)*.9,2.5+rand(),Math.sin(a)*.85],.10,0x8a7757);}
 const geo=leafShape();for(let i=0;i<270;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*1.4,yy=2.85+Math.sqrt(Math.max(0,1-r*r/2))*1.3+(rand()-.5)*.65;const o=mesh(g,geo,material([0x5f7650,0x7f8f56,0x9ea46a,0x748556][i%4]),Math.cos(a)*r,yy,Math.sin(a)*r);o.material.side=T.DoubleSide;o.rotation.set(rand()*Math.PI,rand()*6,rand()*6);o.scale.setScalar(1+rand()*.75);o.castShadow=false;}
}
function fountain(p,world,x,z){world.colliders.push({x,z,w:2.9,d:2.9});cyl(p,1.5,1.57,.22,colors.stone,x,.11,z,'stone',24);cyl(p,1.34,1.40,.38,colors.stone,x,.32,z,'stone',24);cyl(p,1.22,1.22,.025,0x6b9591,x,.52,z,'metal',40);torus(p,1.34,.085,0xcdc1a8,x,.55,z,Math.PI/2);cyl(p,.22,.46,.95,colors.stone,x,.98,z,'stone');cyl(p,.62,.43,.15,colors.stone,x,1.46,z,'stone',24);cyl(p,.52,.52,.025,0x78b4ad,x,1.55,z,'metal',32);ball(p,.22,0xb2bca7,x,1.85,z);for(let i=0;i<8;i++){const a=i*Math.PI/4;tube(p,[[x+Math.sin(a)*.45,1.52,z+Math.cos(a)*.45],[x+Math.sin(a)*.73,1.3,z+Math.cos(a)*.73],[x+Math.sin(a)*.85,.54,z+Math.cos(a)*.85]],.014,0x96c5ba);}}
// Merge static kit geometry by material, keeping animated parts as independent objects.
function batchStatic(root){root.updateMatrixWorld(true);const batches=new Map(),remove=[];root.traverse(o=>{if(!o.isMesh)return;let ancestor=o;while(ancestor&&ancestor!==root){if(ancestor.userData.dynamic)return;ancestor=ancestor.parent;}const g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!g.attributes.normal)g.computeVertexNormals();const a=batches.get(o.material)||[];a.push(g);batches.set(o.material,a);remove.push(o);});for(const o of remove)o.removeFromParent();
 for(const [mat,geos]of batches){const pos=[],norm=[],uv=[],indices=[];let offset=0;for(const g of geos){pos.push(...g.attributes.position.array);norm.push(...g.attributes.normal.array);const tex=g.attributes.uv;if(tex)uv.push(...tex.array);else for(let i=0;i<g.attributes.position.count;i++)uv.push(0,0);const idx=g.index?.array||Array.from({length:g.attributes.position.count},(_,i)=>i);for(const n of idx)indices.push(n+offset);offset+=g.attributes.position.count;g.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);mesh(root,g,mat);}
}
export function buildTown(world){seed=81429;const p=group(world.scene);p.name='Graybell modular town';
 box(p,90,.55,90,0x6e7959,0,-.42,-5);box(p,48,.10,48,0xc3beb0,0,-.04,-2,'stone');
 // Grass verges, deep curb edging, a canal and two visible bridges.
 for(const side of [-1,1]){box(p,3,.07,26,0x73815b,side*13,.025,-2);for(let z=-14;z<11;z+=.68)box(p,.22,.16,.63,colors.stone,side*11.45,.11,z,'stone');}
 box(p,2.3,.03,34,0x325a5f,10.8,.012,-3);world.water=box(p,2.22,.018,34,0x588c8c,10.8,.045,-3,'metal');
 for(const x of [9.5,12.05]){box(p,.38,.45,33,colors.stone,x,.11,-3,'stone');for(let z=-17;z<12;z+=1.5){cyl(p,.08,.12,.76,colors.iron,x,.69,z,'metal',8);ball(p,.105,colors.gold,x,1.10,z);}beam(p,[x,.94,-17],[x,.94,12],.035,colors.iron,'metal');}
 for(const z of [1,-9]){for(let j=0;j<10;j++)box(p,.31,.17,1.6,0xbeb7a0,9.4+j*.31,.22+Math.sin(j/9*Math.PI)*.21,z,'stone');for(const side of [-1,1])tube(p,[[9.35,.7,z+side*.85],[10.8,1.05,z+side*.85],[12.35,.7,z+side*.85]],.075,colors.stone);}
 building(p,world,{x:-8.1,z:-6.4,w:4.5,d:4,h:4.6,type:'manor'});
 building(p,world,{x:6.8,z:-5.8,w:4.3,d:3.8,h:3.8,type:'workshop'});
 building(p,world,{x:-10,z:3.9,w:3.2,d:3.3,h:3.4});
 building(p,world,{x:7.1,z:7.2,w:3.4,d:3,h:3.3});
 building(p,world,{x:-8.8,z:10.8,w:3.5,d:3.1,h:3.8});
 // Neighbouring rooflines continue past the playable square.
 for(const o of [{x:-14,z:-7,w:4,d:4,h:4},{x:-14,z:0,w:4,d:4,h:3.4},{x:-8,z:-17,w:4,d:4,h:5},{x:8,z:-18,w:4,d:4,h:4.3},{x:15,z:-6,w:4,d:4,h:4.1},{x:15,z:3,w:4,d:4,h:3.3},{x:-4,z:15,w:4,d:3,h:3.3}])building(p,world,{...o,solid:false});
 // The gate has a true open arch, stepped masonry and inset arrow slits.
 for(const side of [-1,1]){const x=side*3.3;box(p,9,3.9,1.0,colors.stone,side*8.7,1.95,-12.9,'stone');for(let i=0;i<12;i++)box(p,.55,.55,1.15,colors.stone,side*8.7-4.2+i*.77,4.15,-12.9,'stone');cyl(p,1.08,1.20,5.3,colors.stone,x,2.65,-12,'stone',12);cyl(p,1.23,1.12,.45,colors.stone,x,5.2,-12,'stone',12);cyl(p,0,1.55,2.6,colors.slate,x,6.70,-12,'roof',12);for(let i=0;i<8;i++){const a=i*Math.PI/4;box(p,.20,.75,.12,0x324342,x+Math.sin(a)*1.09,3.7,-12+Math.cos(a)*1.09);}box(p,.60,1.60,.04,0x3b5263,x,2.1,-10.87);mesh(p,new T.OctahedronGeometry(.19),material(colors.gold,'metal'),x,2.27,-10.81);}
 for(let i=0;i<=16;i++){const a=i/16*Math.PI;const block=box(p,.38,.5,1.05,colors.stone,Math.cos(a)*2.14,3.0+Math.sin(a)*2.14,-12.18,'stone');block.rotation.z=a-Math.PI/2;}box(p,4.4,.4,1.1,colors.stone,0,5.4,-12.18,'stone');
 for(const x of [-2.12,2.12])box(p,.42,3,1.05,colors.stone,x,1.5,-12.18,'stone');
 // Brass observatory engine, with animated armillary bands.
 cyl(p,1.32,1.55,.22,colors.stone,0,.11,-7.6,'stone',16);cyl(p,.85,1.03,.37,colors.stone,0,.4,-7.6,'stone',12);cyl(p,.46,.66,.70,0x3d6467,0,.84,-7.6,'metal');for(let i=0;i<6;i++){const a=i*Math.PI/3;beam(p,[Math.sin(a)*.73,.57,-7.6+Math.cos(a)*.73],[Math.sin(a)*.55,1.27,-7.6+Math.cos(a)*.55],.075,colors.gold,'metal');}
 world.crystal=mesh(p,new T.OctahedronGeometry(.60),material(0x6bbdb5,'metal'),0,1.75,-7.6);world.crystal.userData.dynamic=true;world.reactorArcs=group(p,0,1.77,-7.6);world.reactorArcs.userData.dynamic=true;for(let i=0;i<3;i++){const r=torus(world.reactorArcs,.90,.025,colors.gold,0,0,0);r.rotation.set(.55+i*.67,i*.4,.3);}world.crystalRing=torus(p,1.02,.023,colors.gold,0,1.3,-7.6,Math.PI/2);world.colliders.push({x:0,z:-7.6,w:2.1,d:2.1});
 fountain(p,world,2,2.5);
 // Concentric paving accent around the fountain uses actual stone geometry.
 for(let row=0;row<3;row++){const rad=1.7+row*.3,n=Math.round(rad*18);for(let i=0;i<n;i++){const a=i/n*Math.PI*2,o=box(p,.29,.045,.26,row%2?0x827e6c:0xc5bca6,2+Math.cos(a)*rad,.065,2.5+Math.sin(a)*rad,'stone');o.rotation.y=-a;}}
 market(p,world,-6.8,2.1);market(p,world,6.8,2.7,0x597d78);market(p,world,-5.7,-10.3,0x9c7151);
 for(const [x,z]of [[-5.4,5.5],[4.3,-3.6],[-4.7,-8.5],[8.5,.5],[-11,0],[4.8,6.6]])lantern(p,x,z);
 for(const [x,z,s]of [[-12,-10,1],[-12,7,1],[-6.2,8.3,.88],[5.2,10.7,1],[13.5,-11,1.1],[13.6,8,1.1],[-15,-14,1.2],[17,0,1.1],[-16,8,1.3],[-10,-18,1.2]])tree(p,world,x,z,s);
 for(const [x,z]of [[-6,-3.1],[5,-2.5],[-4.4,7],[4.8,5.4]])planter(p,x,.35,z,1.05);
 for(const [x,z]of [[-10.9,-3.5],[8.8,-2.9],[-8,6.2],[-9.2,-9]]){barrel(p,x,z);barrel(p,x+.68,z+.17,.32);}
 // Low boundary gardens avoid large empty patches while leaving the approach free.
 for(let i=0;i<85;i++){const x=(rand()>.5?1:-1)*(11.8+rand()*4),z=rand()*30-17;ball(p,.18+rand()*.25,0x6e8250,x,.18,z);}
 batchStatic(p);
 const positions=[];for(let i=0;i<65;i++)positions.push(rand()*24-12,rand()*4+.7,rand()*25-14);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));world.motes=new T.Points(geo,new T.PointsMaterial({color:0xffdfac,size:.035,transparent:true,opacity:.65}));world.scene.add(world.motes);
}
