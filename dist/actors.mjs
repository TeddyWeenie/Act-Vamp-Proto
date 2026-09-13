import * as T from './vendor/three.module.mjs';
import {createCharacter} from './characters-v5.mjs';
export {createModelViewer} from './characters-v5.mjs';

// Art pass 02: original articulated 2.7-head characters; all forms are real 3D.
const ramp=new T.DataTexture(new Uint8Array([85,165,230,255]),4,1,T.RedFormat);
ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=T.NearestFilter;
const materials=new Map();
const ink=new T.MeshBasicMaterial({color:0x20222e,side:T.BackSide});
function material(color,glow=false){const key=color+':'+glow;if(!materials.has(key))materials.set(key,glow?new T.MeshBasicMaterial({color}):new T.MeshToonMaterial({color,gradientMap:ramp}));return materials.get(key);}
function add(parent,geo,color,pos=[0,0,0],scale=[1,1,1],outline=true,glow=false){const m=new T.Mesh(geo,material(color,glow));m.position.set(...pos);m.scale.set(...scale);m.castShadow=!glow;m.receiveShadow=!glow;parent.add(m);if(outline){const o=new T.Mesh(geo,ink);o.scale.setScalar(1.025);m.add(o);}return m;}
const ball=(p,c,pos,sc,outline=true)=>add(p,new T.SphereGeometry(1,20,14),c,pos,sc,outline);
const box=(p,c,pos,sc,outline=true)=>add(p,new T.BoxGeometry(1,1,1),c,pos,sc,outline);
const cylinder=(p,c,pos,top,bottom,height,n=16)=>add(p,new T.CylinderGeometry(top,bottom,height,n),c,pos);
function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
function tube(p,points,r,c){return add(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),14,r,6,false),c);}
function panel(p,points,depth,color,pos=[0,0,0]){const s=new T.Shape();points.forEach((v,i)=>i?s.lineTo(...v):s.moveTo(...v));s.closePath();return add(p,new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.018,bevelThickness:.01,bevelSegments:1,steps:1}),color,pos);}
function torus(p,c,pos,r,t=.025){return add(p,new T.TorusGeometry(r,t,6,24),c,pos,undefined,false);}
function gem(p,c,pos,size=.10){return add(p,new T.OctahedronGeometry(size),c,pos,[.8,1.1,.45],true,true);}
function hairLock(p,start,end,width,color){const mid=[(start[0]+end[0])/2+.025,(start[1]+end[1])/2,(start[2]+end[2])/2+.07];const mesh=add(p,new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(...start),new T.Vector3(...mid),new T.Vector3(...end)]),8,width,5,false),color);return mesh;}
function cape(p,color,lining){const verts=[],ids=[],rows=8,cols=14;for(let j=0;j<=rows;j++){let v=j/rows;for(let i=0;i<=cols;i++){const u=i/cols,angle=.22+u*2.70,r=.22+v*.39;verts.push(Math.cos(angle)*r,1.38-v*1.03+Math.sin(u*Math.PI*6)*.045*v,-Math.sin(angle)*r-.07);if(j<rows&&i<cols){const a=j*(cols+1)+i;ids.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}}}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(ids);geo.computeVertexNormals();const front=material(color).clone();front.side=T.DoubleSide;const m=new T.Mesh(geo,front);m.castShadow=true;p.add(m);const hem=[];for(let i=0;i<=cols;i++){const k=(rows*(cols+1)+i)*3;hem.push(verts.slice(k,k+3));}tube(p,hem,.018,lining);return m;}
function eyes(head,color,wolf=false,old=false){const parts=[];for(const side of [-1,1]){const x=side*(wolf?.20:.16),y=wolf?.06:.00,z=wolf?.352:.376;const pivot=group(head,x,y,z);ball(pivot,0xf5e7d3,[0,0,0],[.100,old?.061:.084,.039],false);ball(pivot,color,[.012,-.003,.032],[.046,.066,.016],false);ball(pivot,0x17262e,[.014,-.002,.045],[wolf?.012:.020,.051,.007],false);ball(pivot,0xffffff,[-.005,.025,.052],[.015,.019,.005],false);tube(head,[[x-.10,y+.08,z+.01],[x,y+.105,z+.005],[x+.095,y+.07,z+.005]],.013,wolf?0x53606c:0x54433e);parts.push(pivot);}return parts;}
function weapon(hand,type){const g=group(hand,0,-.10,.05);if(type==='vampire'){const blade=panel(g,[[-.034,0],[.034,0],[.022,1.04],[0,1.24],[-.022,1.04]],.035,0xdce6ef,[0,-.38,0]);cylinder(g,0x704859,[0,-.51,.015],.034,.034,.26);torus(g,0xd9b76c,[0,-.36,.015],.13,.025).rotation.x=Math.PI/2;tube(g,[[.0,-.35,0],[.15,-.38,.01],[.16,-.63,.01],[0,-.64,0]],.022,0xd9b76c);gem(g,0xef789f,[0,-.69,.01],.055);}
 else if(type==='wolf'){panel(g,[[-.14,0],[.14,0],[.12,1.1],[0,1.30],[-.12,1.1]],.065,0xb9ccd6,[0,-.22,0]);box(g,0xf1dfac,[0,.37,.069],[.035,.87,.015],false);box(g,0xcbb07d,[0,-.22,.03],[.51,.105,.14]);cylinder(g,0x3c3039,[0,-.43,.035],.062,.062,.33);ball(g,0xccb184,[0,-.63,.025],[.09,.075,.075]);for(let i=0;i<4;i++)torus(g,0xa98b60,[0,-.34-i*.065,.03],.064,.008).rotation.x=Math.PI/2;}
 else{cylinder(g,0x604b37,[0,.17,0],.038,.052,1.47);for(let y=-.40;y<.55;y+=.17)cylinder(g,0xb99557,[0,y,0],.047,.047,.045);const crown=group(g,0,1.0,0);torus(crown,0xdeb66f,[0,0,0],.23,.035);const orbit=torus(crown,0x80deda,[0,0,0],.31,.012);orbit.rotation.y=.9;gem(crown,0x71e8df,[0,0,.025],.18);for(const side of [-1,1])tube(crown,[[side*.08,-.27,0],[side*.24,-.07,0],[side*.18,.22,0]],.025,0xd8b16e);g.userData.crystal=crown;}
 g.rotation.z=type==='wolf'?-.14:type==='vampire'?-.20:.12;return g;}
function makeHero(type){const root=new T.Group(),rig=group(root),wolf=type==='wolf',human=type==='human',old=type==='archivist';const c={skin:old?0xddc5a8:wolf?0x8d99a4:0xf1d7bd,coat:wolf?0x34414e:human?0x277c7d:old?0x465c51:0x592338,hair:wolf?0x8295a1:human?0x9c693c:old?0x777b75:0xe4dfd1,gold:0xd2ae6e,leather:0x654736};
 root.name=type;const limbs={};for(const side of [-1,1]){const leg=group(rig,side*.18,.50,0);ball(leg,0x39404a,[0,-.16,0],[.135,.26,.14]);ball(leg,0x292b35,[0,-.37,.07],[.15,.14,.22]);box(leg,c.leather,[0,-.25,.01],[.27,.12,.27]);box(leg,c.gold,[side*.115,-.25,.05],[.045,.07,.1],false);limbs[side<0?'leftLeg':'rightLeg']=leg;}
 const coat=add(rig,new T.LatheGeometry([new T.Vector2(.36,.37),new T.Vector2(.39,.45),new T.Vector2(.29,.90),new T.Vector2(.35,1.13),new T.Vector2(.27,1.27)],20),c.coat);coat.scale.z=.77;
 box(rig,old?0xd0c5a0:0xeee0bb,[0,.94,.28],[.15,.60,.09],false);box(rig,c.leather,[0,.78,.02],[.66,.105,.55]);box(rig,c.gold,[.05,.78,.306],[.16,.125,.055]);box(rig,0x4c3840,[.05,.78,.34],[.095,.063,.02],false);
 const head=group(rig,0,1.64,.015);ball(head,c.skin,[0,0,0],wolf?[.44,.39,.37]:[.41,.40,.37]);limbs.head=head;const eyeParts=eyes(head,wolf?0xdba147:human?0x43a9a0:old?0x74868a:0xb43b62,wolf,old);
 if(!wolf){for(const side of [-1,1])ball(head,c.skin,[side*.407,-.03,.005],[.072,.11,.062]);ball(head,c.hair,[0,.17,-.06],[.42,.31,.35]);for(let i=0;i<7;i++){const x=(i-3)*.10;hairLock(head,[x*.65,.37,.06],[x,(i<3?.02:.13)+Math.abs(i-3)*.01,.335],.068,c.hair);}for(const side of [-1,1]){hairLock(head,[side*.31,.25,-.02],[side*.37,-.24,.08],.10,c.hair);ball(head,c.hair,[side*.33,-.10,-.17],[.10,human?.23:.19,.17]);}ball(head,c.skin,[0,-.075,.371],[.037,.047,.04],false);tube(head,[[-.08,-.19,.327],[0,-.205,.348],[.07,-.185,.335]],.009,0x8d5f5a);}
 for(const side of [-1,1]){const arm=group(rig,side*.38,1.18,0);ball(arm,c.coat,[side*.04,-.18,0],[.14,.26,.15]);box(arm,c.gold,[side*.055,-.34,.005],[.23,.055,.25],false);ball(arm,old?c.skin:human?c.leather:0xe9dcca,[side*.06,-.43,.035],[.10,.12,.10]);arm.rotation.z=side*.09;limbs[side<0?'leftArm':'rightArm']=arm;}
 if(wolf){
  for(const side of [-1,1]){panel(head,[[0,0],[.21,.40],[.37,-.03]],.15,c.hair,[side<0?-.40:.03,.20,-.07]);const inner=panel(head,[[0,0],[.09,.24],[.19,-.01]],.015,0x536578,[side<0?-.31:.10,.26,.075]);ball(head,0xc0c6bf,[side*.20,-.12,.27],[.20,.18,.14]);for(let i=0;i<3;i++){const tuft=add(head,new T.ConeGeometry(.1,.23,5),i===0?0xd1d1c5:c.hair,[side*(.32+i*.04),-.04-i*.075,.04]);tuft.rotation.z=side*1.2;}}
  ball(head,0xb3bbb9,[0,-.16,.34],[.245,.17,.25]);ball(head,0x26313d,[0,-.095,.54],[.115,.073,.075]);tube(head,[[-.17,-.24,.44],[0,-.26,.49],[.17,-.24,.44]],.012,0x41424a);for(const side of [-1,1])add(head,new T.ConeGeometry(.028,.09,6),0xf7eccd,[side*.125,-.26,.463]).rotation.z=Math.PI;
  tube(head,[[.20,.17,.36],[.22,.08,.391],[.25,-.01,.373]],.013,0xc9bcb0);
  for(const side of [-1,1]){for(let i=0;i<3;i++)ball(rig,0xb8c0b8,[side*(.17+i*.07),1.28-i*.025,.10],[.11,.10,.19]);for(let j=0;j<3;j++)ball(rig,j%2?0x92a6b4:0x697e91,[side*(.43+j*.055),1.23-j*.06,-.01],[.24-j*.028,.115,.245]);box(rig,c.gold,[side*.51,1.25,.14],[.17,.055,.10],false);for(let y=.90;y<1.2;y+=.12)ball(rig,c.gold,[side*.16,y,.29],[.025,.025,.016],false);}
  tube(rig,[[-.31,1.25,.22],[0,.98,.30],[.27,.74,.23]],.038,c.leather);panel(rig,[[-.075,.09],[.0,.14],[.075,.09],[0,-.12]],.025,c.gold,[-.18,1.08,.325]);
  const tail=group(rig,0,.56,-.24);tube(tail,[[0,0,0],[.12,-.05,-.28],[.20,.09,-.52],[.15,.28,-.70]],.115,0x8c9ba3);ball(tail,0xc8cabe,[.15,.25,-.69],[.10,.13,.12]);limbs.tail=tail;
 }else if(human){
  const goggles=group(head,0,.25,.21);tube(goggles,[[-.40,-.005,-.10],[-.22,0,.04],[.20,0,.04],[.40,-.005,-.10]],.025,c.leather);for(const side of [-1,1]){cylinder(goggles,c.gold,[side*.17,0,.04],.125,.125,.08).rotation.x=Math.PI/2;ball(goggles,0x66c9d2,[side*.17,0,.09],[.091,.092,.030],false);ball(goggles,0xd2fff1,[side*.19,.025,.116],[.025,.033,.004],false);}box(goggles,c.gold,[0,0,.07],[.10,.03,.04],false);
  const scarf=torus(rig,0xe6bd75,[0,1.25,.02],.255,.071);scarf.rotation.x=Math.PI/2;panel(rig,[[0,0],[.18,.01],[.15,-.46],[.04,-.39]],.03,0xe6bd75,[-.17,1.22,.25]);
  tube(rig,[[-.27,1.23,.20],[0,1.01,.34],[.26,.75,.25]],.04,c.leather);for(const side of [-1,1]){box(rig,0x866240,[side*.30,.62,.25],[.20,.22,.15]);box(rig,c.gold,[side*.30,.66,.34],[.08,.055,.025],false);}box(rig,0x674a37,[0,.96,-.30],[.55,.51,.28]);box(rig,c.gold,[0,1.2,-.30],[.58,.035,.3]);cylinder(rig,0x74a49a,[.34,1.03,-.3],.095,.095,.48);for(const y of [.81,1.23])cylinder(rig,c.gold,[.34,y,-.3],.11,.11,.055);
 }else if(old){
  for(const side of [-1,1])torus(head,0xd7b982,[side*.16,-.015,.416],.105,.013);box(head,c.gold,[0,-.015,.43],[.12,.02,.03],false);ball(head,0xadb0a5,[0,-.24,.25],[.22,.15,.15]);tube(head,[[-.18,-.14,.36],[0,-.125,.40],[.17,-.14,.36]],.029,0xc6c8b8);panel(rig,[[-.09,.1],[.09,.1],[.15,-.52],[-.10,-.48]],.03,0xd7ccb1,[0,1.20,.31]);const book=group(limbs.leftArm,-.03,-.25,.19);box(book,0x794f37,[0,0,0],[.34,.38,.11]);box(book,0xd7c799,[0,0,.05],[.30,.34,.026]);book.rotation.z=-.2;
 }else{
  limbs.cape=cape(rig,0x6b263f,0xc59b60);for(const side of [-1,1]){panel(rig,[[0,0],[side*.20,.35],[side*.35,-.13]],.05,0x762c49,[side*.12,1.22,-.14]);tube(rig,[[side*.12,1.2,.28],[side*.27,1.13,.28],[side*.22,.84,.32],[side*.36,.40,.26]],.015,c.gold);for(let j=0;j<4;j++)ball(rig,c.gold,[side*.12,1.11-j*.12,.32],[.02,.02,.018],false);}
  for(let i=0;i<4;i++)ball(rig,0xf1e8cb,[0,1.25-i*.065,.31+i*.01],[.105-i*.014,.052,.075]);gem(rig,0xd74676,[0,1.06,.404],.083);torus(rig,c.gold,[0,1.06,.398],.09,.012);for(const side of [-1,1])add(head,new T.ConeGeometry(.016,.06,5),0xffffdc,[side*.063,-.20,.34]).rotation.z=Math.PI;
 }
 if(!old)limbs.weapon=weapon(limbs.rightArm,type);
 root.userData={rig,limbs,eyes:eyeParts,height:wolf?2.36:2.1,type,phase:Math.random()*Math.PI*2};root.scale.setScalar(1.13);return root;
}
function makeEnemy(type){const root=new T.Group(),rig=group(root),boss=type==='boss',metal=boss?0x444459:0x587785,gold=0xb6915c,magic=boss?0xf489a6:0x70e4dc;const limbs={};for(const side of [-1,1]){const leg=group(rig,side*.26,.5,0);box(leg,metal,[0,-.20,0],[.29,.45,.31]);box(leg,gold,[0,-.14,.18],[.20,.20,.07]);box(leg,0x303342,[0,-.41,.075],[.32,.16,.46]);limbs[side<0?'leftLeg':'rightLeg']=leg;const arm=group(rig,side*.53,1.22,0);ball(arm,metal,[0,0,0],[.24,.19,.29]);box(arm,metal,[side*.03,-.29,0],[.28,.43,.30]);torus(arm,gold,[side*.03,-.25,.18],.085,.017);box(arm,gold,[side*.04,-.52,.05],[.25,.20,.28]);limbs[side<0?'leftArm':'rightArm']=arm;}
 cylinder(rig,metal,[0,.99,0],.43,.32,.69,10);for(const side of [-1,1])panel(rig,[[0,0],[side*.25,.14],[side*.30,-.43],[0,-.30]],.07,gold,[side*.22,1.20,.19]);const reactor=gem(rig,magic,[0,1.04,.38],.21);torus(rig,gold,[0,1.04,.41],.245,.035);limbs.reactor=reactor;
 const head=group(rig,0,1.60,0);ball(head,metal,[0,0,0],[.35,.33,.31]);box(head,0x1c2838,[0,-.035,.27],[.55,.18,.10]);box(head,magic,[0,-.02,.329],[.43,.045,.019],false);box(head,gold,[0,.23,.13],[.065,.28,.16]);if(boss){limbs.cape=cape(rig,0x4c2749,0xb58a5c);for(let i=0;i<5;i++){const a=-1.1+i*.55;add(head,new T.ConeGeometry(.085,.35+(i===2?.2:0),4),gold,[Math.sin(a)*.32,.38,Math.cos(a)*.12]);}const ring=torus(rig,magic,[0,1.80,-.33],.60,.016);ring.rotation.y=.3;limbs.halo=ring;root.scale.setScalar(1.65);}else root.scale.setScalar(1.08);root.userData={rig,limbs,type,height:2.1,phase:0};return root;}
export function character(type){return type==='enemy'||type==='boss'?makeEnemy(type):type==='archivist'?makeHero(type):createCharacter(type);}
export function animateCharacter(root,time,walking=false,attack=0){
 const {rig,limbs={},eyes=[],phase=0}=root.userData,stride=Math.sin(time*8+phase)*(walking?.52:0);
 if(limbs.leftLeg)limbs.leftLeg.rotation.x=stride;
 if(limbs.rightLeg)limbs.rightLeg.rotation.x=-stride;
 if(limbs.leftArm){limbs.leftArm.rotation.x=-stride*.5;limbs.leftArm.rotation.z=-.10;}
 if(limbs.rightArm){limbs.rightArm.rotation.x=stride*.45-attack*1.45;limbs.rightArm.rotation.z=.13-attack*.5;}
 if(limbs.rightElbow)limbs.rightElbow.rotation.x=-.17-attack*.7;
 if(limbs.leftElbow)limbs.leftElbow.rotation.x=-.17-Math.abs(stride)*.15;
 if(limbs.head){limbs.head.rotation.z=Math.sin(time*1.5+phase)*.016;limbs.head.rotation.y=-attack*.15;}
 if(limbs.tail)limbs.tail.rotation.y=Math.sin(time*2.8)*.16;
 if(limbs.cape)limbs.cape.rotation.x=Math.sin(time*2)*.022+Math.abs(stride)*.10+attack*.1;
 if(limbs.halo)limbs.halo.rotation.z=time*.3;
 if(limbs.reactor)limbs.reactor.rotation.y=time*.7;
 if(limbs.weapon?.userData.crystal)limbs.weapon.userData.crystal.rotation.y=time*.55;
 const blink=(time+phase)%5.2>5.04?.08:1;eyes.forEach(eye=>eye.scale.y=blink);
 if(rig){rig.position.y=.011+Math.sin(time*(walking?16:2)+phase)*(walking?.017:.009);rig.rotation.y=Math.sin(time*8)* (walking?.035:0)-attack*.10;}
}
