import * as T from './vendor/three.module.mjs';

// Sculpted silhouettes, layered tailoring and articulated hands for the three heroes.
// Cross-section meshes share vertices; ornaments have no individual black outlines.
const palette=new Map();
const weave=typeof document!=='undefined'?new T.TextureLoader().load(new URL('./art-04/damask.png',import.meta.url).href):null;
if(weave){weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.colorSpace=T.SRGBColorSpace;weave.anisotropy=8;}
const gradient=new T.DataTexture(new Uint8Array([95,155,212,250]),4,1,T.RedFormat);
gradient.minFilter=gradient.magFilter=T.NearestFilter;gradient.needsUpdate=true;
const outline=new T.MeshBasicMaterial({color:0x272334,side:T.BackSide});
function mat(c,kind='cloth'){
 const key=`${c}:${kind}`;if(!palette.has(key)){
  const m=kind==='metal'?new T.MeshStandardMaterial({color:c,metalness:.62,roughness:.33}):kind==='light'?new T.MeshBasicMaterial({color:c}):new T.MeshStandardMaterial({color:c,metalness:0,roughness:kind==='hair'?.72:.96});
  if(kind==='cloth'&&[0x4f2039,0x762941,0x304358,0x486278,0x226c71,0x399496].includes(c)&&weave){m.map=weave;m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','vec4 woven=texture2D(map,vMapUv);diffuseColor.rgb*=0.73+woven.rgb*.65;');};m.customProgramCacheKey=()=> 'woven04';}
  palette.set(key,m);
 }return palette.get(key);
}
function mesh(p,g,c,pos=[0,0,0],scale=[1,1,1],kind='cloth',ink=false){const m=new T.Mesh(g,mat(c,kind));m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=false;p.add(m);if(ink){const edge=new T.Mesh(g,outline);edge.scale.setScalar(1.012);m.add(edge);}return m;}
const group=(p,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;};
const sphere=(p,c,pos,scale,kind='cloth')=>mesh(p,new T.SphereGeometry(1,28,20),c,pos,scale,kind);
const ring=(p,c,pos,r,t=.012,kind='metal')=>mesh(p,new T.TorusGeometry(r,t,8,40),c,pos,[1,1,1],kind);
function curve(p,c,points,r=.009,kind='cloth'){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a))),24,r,6,false),c,undefined,undefined,kind);}
function plate(p,c,points,pos=[0,0,0],depth=.025,kind='cloth'){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return mesh(p,new T.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:true,bevelSize:.012,bevelThickness:.008,bevelSegments:3}),c,pos,undefined,kind);}
// Rows: height, half-width, half-depth, optional depth offset. Useful for chin, waist, cuffs.
function sculpt(p,c,rows,{segments=40,folds=0,kind='cloth',ink=true}={}){
 const source=rows;rows=[];
 for(let j=0;j<source.length-1;j++){for(let k=0;k<4;k++){const t=k/4,row=[];for(let d=0;d<4;d++){const a=source[Math.max(0,j-1)][d]||0,b=source[j][d]||0,c=source[j+1][d]||0,e=source[Math.min(source.length-1,j+2)][d]||0;const m=(c-a)*.5,n=(e-b)*.5;let v=(2*t*t*t-3*t*t+1)*b+(t*t*t-2*t*t+t)*m+(-2*t*t*t+3*t*t)*c+(t*t*t-t*t)*n;if(d===1||d===2)v=Math.max(.001,v);row.push(v);}rows.push(row);}}rows.push(source.at(-1));
 const v=[],uv=[],idx=[];rows.forEach(([y,x,z,cz=0],j)=>{for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,f=1+folds*Math.cos(a*10)*(1-j/(rows.length+1));v.push(Math.sin(a)*x*f,y,Math.cos(a)*z*f+cz);uv.push(i/segments,j/(rows.length-1));}});
 for(let j=0;j<rows.length-1;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;idx.push(a,a+1,b,a+1,b+1,b);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return mesh(p,g,c,undefined,undefined,kind,ink);
}
// Tapered, flattened swept volumes instead of constant-width tubes for hair and fur.
function lock(p,c,points,width,depth=.042){
 const path=new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a))),v=[],idx=[],N=16,S=8;
 for(let j=0;j<=N;j++){const t=j/N,q=path.getPoint(t),tangent=path.getTangent(t),side=new T.Vector3(tangent.y,-tangent.x,0).normalize();if(side.lengthSq()<.1)side.set(1,0,0);const f=Math.pow(Math.sin(Math.PI*(.12+t*.88)),.65);for(let i=0;i<=S;i++){const a=i/S*Math.PI*2;v.push(q.x+side.x*Math.cos(a)*width*f,q.y+side.y*Math.cos(a)*width*f,q.z+Math.sin(a)*depth*f);}}
 for(let j=0;j<N;j++)for(let i=0;i<S;i++){const a=j*(S+1)+i,b=a+S+1;idx.push(a,b,a+1,a+1,b,b+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();return mesh(p,g,c,undefined,undefined,'hair');
}
function button(p,c,x,y,z,r=.018){sphere(p,c,[x,y,z],[r,r,r*.45],'metal');}
function buckle(p,c,x,y,z,w=.12){const g=group(p,x,y,z);const r=ring(g,c,[0,0,0],w*.5,.013);r.scale.y=.72;curve(g,c,[[0,-w*.34,.008],[0,w*.34,.008]],.009,'metal');return g;}
function gem(p,c,pos,size){return mesh(p,new T.OctahedronGeometry(size,0),c,pos,[.75,1,.42],'metal');}
function eyes(p,color,wolf=false){const result=[];for(const side of [-1,1]){
 const x=side*(wolf?.177:.148),y=wolf?.075:.014,z=wolf?.315:.346;
 const eye=group(p,x,y,z);eye.rotation.y=side*.18;const s=new T.Shape();s.moveTo(-.095,0);s.bezierCurveTo(-.045,.077,.049,.071,.092,.012);s.bezierCurveTo(.055,-.042,-.049,-.052,-.095,0);
 mesh(eye,new T.ShapeGeometry(s,18),0xf4e8db,[0,0,0],undefined,'light');sphere(eye,color,[side*.007,.006,.008],[wolf?.033:.039,.047,.009],'light');sphere(eye,0x202537,[side*.007,.006,.016],[wolf?.009:.017,.032,.005],'light');sphere(eye,0xffffff,[-.012,.029,.022],[.012,.012,.002],'light');sphere(eye,0xb8e8d6,[.024,-.018,.021],[.006,.006,.002],'light');
 curve(eye,0x342936,[[-.098,0,.005],[-.05,.052,.005],[.015,.059,.005],[.065,.04,.005],[.1,.016,.004]],wolf?.014:.010);curve(eye,wolf?0x344351:0x886752,[[-.075,.088,-.006],[.005,.104,-.008],[.082,.080,-.006]],wolf?.021:.012);result.push(eye);
 }return result;}
// Layered pointed hair ribbons follow the skull; longitudinal highlights are actual narrow meshes.
function hair(head,type){const human=type==='human',base=human?0x44302a:0x8a8996,mid=human?0x6e4634:0xbfc1ce,light=human?0x986343:0xdce0e5;
 const scalp=new T.SphereGeometry(1,40,28,0,Math.PI*2,0,1.43);scalp.scale(.411,.435,.363);mesh(head,scalp,base,[0,.015,-.025],undefined,'hair');
 for(let i=0;i<26;i++){const a=.77+i/25*4.75,x=Math.sin(a),z=Math.cos(a);lock(head,i%3?mid:base,[[x*.13,.40,z*.12-.03],[x*.36,.22,z*.31-.03],[x*.415,-.02,z*.355-.04],[x*.34,-(human?.34:.31),z*.28-.025]],.050,.025);}
 const paths=human?[
 [[-.08,.43,.02],[-.24,.29,.31],[-.35,.04,.28]],[[.00,.44,.02],[-.10,.29,.365],[-.22,.13,.35]],[[.08,.43,.02],[.12,.28,.36],[.075,.16,.37]],[[.15,.40,.03],[.28,.20,.325],[.34,-.17,.22]]
 ]:[[[.05,.44,.02],[-.11,.33,.32],[-.30,.07,.31]],[[.10,.42,.02],[.04,.30,.38],[-.12,.16,.36]],[[.16,.39,.01],[.22,.26,.33],[.17,.14,.36]],[[.21,.34,0],[.35,.16,.25],[.36,-.20,.17]]];
 paths.forEach((pts,i)=>{lock(head,i%2?mid:light,pts,.084,.023);for(let j=0;j<4;j++){const off=(j-1.5)*.026,ps=pts.map((v,k)=>[v[0]+off*(1-k*.20),v[1]-(j%2)*.012,v[2]+.026]);lock(head,j%2?light:mid,ps,.010,.006);}});
 for(const side of [-1,1])for(let j=0;j<5;j++)lock(head,j%2?light:mid,[[side*.29,.31-j*.017,.12-j*.034],[side*.405,.055,.19-j*.065],[side*(.335+j*.012),-.27-j*.018,.15-j*.067]],.031,.017);
}
const faceMap=typeof document!=='undefined'?new T.TextureLoader().load(new URL('./art-04/face-atlas.png',import.meta.url).href):null;
if(faceMap){faceMap.colorSpace=T.SRGBColorSpace;faceMap.anisotropy=8;}
function paintedSkin(type){const m=new T.MeshStandardMaterial({color:0xedcdb9,roughness:1});if(!faceMap)return m;
 m.onBeforeCompile=s=>{s.uniforms.faceMap={value:faceMap};s.vertexShader='varying vec3 facePosition;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfacePosition=position;');
 s.fragmentShader='uniform sampler2D faceMap;varying vec3 facePosition;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec2 fuv=vec2(clamp(facePosition.x/.88+.5,.003,.997)*.5+${type==='human'?'0.5':'0.0'},clamp((facePosition.y+.37)/.59,.003,.997));vec4 paint=texture2D(faceMap,fuv);float mask=paint.a*smoothstep(.04,.27,facePosition.z);diffuseColor.rgb=mix(diffuseColor.rgb,paint.rgb,mask);`);};m.customProgramCacheKey=()=>type+'painted04';return m;
}
function humanFace(head,type){const human=type==='human';const face=sculpt(head,0xedcdb9,[[-.37,.025,.065,.07],[-.32,.16,.15,.025],[-.24,.28,.235,.005],[-.12,.365,.31],[.035,.38,.35],[.18,.37,.335],[.31,.27,.25],[.37,.10,.10],[.38,.001,.001]],{kind:'skin'});face.material=paintedSkin(type);face.userData.ownedMaterial=true;
 for(const side of [-1,1]){sphere(head,human?0xd89d83:0xd1aa97,[side*.365,-.08,0],[.067,.095,.045]);sphere(head,human?0xefbb9c:0xe9cdb8,[side*.375,-.07,.018],[.038,.064,.024]);}
 return [];
}

const wolfMap=typeof document!=='undefined'?new T.TextureLoader().load(new URL('./art-04/wolf-face.png',import.meta.url).href):null;
if(wolfMap){wolfMap.colorSpace=T.SRGBColorSpace;wolfMap.anisotropy=8;}
function wolfFace(head){
 const face=sculpt(head,0x798087,[[-.36,.02,.06],[-.29,.22,.20],[-.13,.34,.295],[.075,.365,.318],[.25,.28,.26],[.34,.13,.13],[.36,.001,.001]],{kind:'hair'});
 const pos=face.geometry.attributes.position;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);if(z>0){const bridge=Math.exp(-x*x/.022-(y+.14)*(y+.14)/.014)*.24;pos.setZ(i,z+bridge);}}pos.needsUpdate=true;face.geometry.computeVertexNormals();
 const fur=new T.MeshStandardMaterial({color:0x798087,roughness:1});
 if(wolfMap){fur.onBeforeCompile=sh=>{sh.uniforms.wolfMap={value:wolfMap};sh.vertexShader='varying vec3 furPosition;\n'+sh.vertexShader;sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfurPosition=position;');sh.fragmentShader='uniform sampler2D wolfMap;varying vec3 furPosition;\n'+sh.fragmentShader;sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>','vec2 furUV=vec2(clamp(furPosition.x/.76+.5,.003,.997),clamp((furPosition.y+.36)/.64,.003,.997));vec4 paint=texture2D(wolfMap,furUV);diffuseColor.rgb=mix(diffuseColor.rgb,paint.rgb,smoothstep(.01,.22,furPosition.z));');};fur.customProgramCacheKey=()=> 'wolfPaint04';}
 face.material=fur;face.userData.ownedMaterial=true;
 for(const side of [-1,1]){
  const ear=group(head,side*.26,.255,-.07);ear.rotation.z=-side*.12;
  plate(ear,0x59626b,[[-.115,-.045],[-.105,.13],[.012,.36],[.145,.10],[.14,-.06]],[0,0,0],.085);
  plate(ear,0x9f9795,[[-.053,.04],[.012,.255],[.088,.06]],[0,0,.105],.007);
  for(let j=0;j<7;j++){lock(head,j%2?0x9da5a5:0x7a868d,[[side*.29,.075-j*.026,.19],[side*(.37+j*.005),-.005-j*.029,.17],[side*(.38+j*.003),-.11-j*.027,.12]],.025,.016);}
 }
 for(let i=0;i<6;i++)lock(head,i%2?0x919a9f:0x6d7982,[[.14-i*.042,.30,-.04],[.11-i*.04,.38,.09],[.035-i*.028,.285,.23]],.026,.016);
 return [];
}
function boots(rig,limbs,c,wolf){for(const side of [-1,1]){const leg=group(rig,side*(wolf?.20:.155),.57,0);sculpt(leg,c.pants,[[-.20,.10,.11],[-.07,.115,.125],[.08,.125,.13],[.14,.105,.10]],{segments:24});
 const boot=group(leg,0,-.21,0);sculpt(boot,c.leather,[[-.24,.11,.12,.04],[-.16,.116,.13,.025],[.035,.13,.13],[.09,.143,.14]],{segments:28});sphere(boot,c.leather,[0,-.205,.10],[.127,.085,.22]);sphere(boot,0x242837,[0,-.26,.105],[.13,.030,.226]);
 const cuff=ring(boot,c.trim,[0,.04,0],.132,.012);cuff.rotation.x=Math.PI/2;for(let j=0;j<3;j++){curve(boot,0x9a8670,[[-.055,-.045-j*.045,.128],[.055,-.065-j*.045,.128]],.007);}
 buckle(boot,c.trim,side*.095,-.02,.108,.069);limbs[side<0?'leftLeg':'rightLeg']=leg;}}
function arms(rig,limbs,c,wolf){for(const side of [-1,1]){const arm=group(rig,side*(wolf?.42:.315),1.245,0);arm.rotation.z=side*.13;
 sculpt(arm,c.coat,[[-.29,.105,.11],[-.19,.122,.13],[-.06,wolf?.17:.143,.15],[.06,.11,.115]],{segments:28});const fore=group(arm,side*.022,-.26,.006);fore.rotation.x=-.17;
 sculpt(fore,c.coat,[[-.205,.073,.075],[-.14,.10,.102],[.025,.095,.10]],{segments:28});sculpt(fore,c.leather,[[-.205,.085,.084],[-.155,.104,.105],[-.10,.104,.10]],{segments:28});const rim=ring(fore,c.trim,[0,-.117,0],.104,.009);rim.rotation.x=Math.PI/2;
 const hand=group(fore,0,-.22,.017);sphere(hand,c.glove,[0,-.028,0],[.073,.09,.072]);for(let j=0;j<4;j++){sphere(hand,c.glove,[-.047+j*.029,-.065,.040],[.018,.040,.028]);curve(hand,c.seam,[[-.047+j*.029,-.070,.062],[-.047+j*.029,-.04,.067]],.0035);}sphere(hand,c.glove,[-side*.063,-.024,.052],[.029,.047,.028]);
 limbs[side<0?'leftArm':'rightArm']=arm;limbs[side<0?'leftElbow':'rightElbow']=fore;limbs[side<0?'leftHand':'rightHand']=hand;
 }}
function coat(rig,c,type){const wolf=type==='wolf';sculpt(rig,c.coat,[[.52,.27,.195],[.60,.285,.20],[.79,.235,.18],[.99,.285,.215],[1.17,wolf?.38:.29,.22],[1.27,.18,.135]],{folds:.035});
 // Split skirt panels, with a cinched waist and shaped lapels.
 for(const side of [-1,1]){plate(rig,c.coat,[[side*.025,.76],[side*.23,.80],[side*.33,.34],[side*.075,.405]],[0,0,.19],.055);curve(rig,c.trim,[[side*.034,.745,.257],[side*.065,.46,.265],[side*.27,.39,.254]],.010,'metal');
 plate(rig,c.lapel,[[side*.085,1.285],[side*.275,1.20],[side*.10,.935],[side*.03,1.10]],[0,0,.215],.035);curve(rig,c.trim,[[side*.087,1.30,.25],[side*.27,1.20,.262],[side*.105,.951,.285]],.008,'metal');}
 sculpt(rig,c.leather,[[.737,.253,.205],[.80,.248,.204]],{segments:40,ink:false});buckle(rig,c.trim,.025,.768,.238);
 for(const side of [-1,1])for(let i=0;i<3;i++)button(rig,c.trim,side*.135,1.08-i*.108,.256,.018);
}
function mantle(rig,c){const g=group(rig,0,1.20,-.105),v=[],idx=[],N=18,M=28;
 for(let j=0;j<=N;j++){const t=j/N;for(let i=0;i<=M;i++){const u=i/M,a=.02+u*Math.PI*.98,r=.26+t*.25;v.push(Math.cos(a)*r,-t*.98+Math.sin(u*Math.PI)*.07*t,-Math.sin(a)*r-.02-Math.sin(t*Math.PI)*.08+Math.cos(u*Math.PI*12)*.014*t);}}
 for(let j=0;j<N;j++)for(let i=0;i<M;i++){const a=j*(M+1)+i,b=a+M+1;idx.push(a,b,a+1,a+1,b,b+1);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setIndex(idx);geo.computeVertexNormals();const cloth=mat(c.coat).clone();cloth.side=T.DoubleSide;const m=new T.Mesh(geo,cloth);m.userData.ownedMaterial=true;m.castShadow=true;g.add(m);
 for(const row of [N-1,N])curve(g,c.trim,Array.from({length:M+1},(_,i)=>v.slice((row*(M+1)+i)*3,(row*(M+1)+i)*3+3)),.008,'metal');
 for(const side of [-1,1]){const x=side*.31;for(let k=0;k<3;k++)curve(g,c.trim,[[x*.5,-.24-k*.14,-.35],[x*.85,-.29-k*.14,-.40],[x,-.24-k*.14,-.40]],.005,'metal');}return g;
}
function noble(rig,head,limbs,c){limbs.cape=mantle(rig,c);
 for(const side of [-1,1]){plate(rig,0x69273f,[[side*.14,1.26],[side*.26,1.50],[side*.37,1.23]],[0,0,-.14],.045);curve(rig,c.trim,[[side*.145,1.27,-.09],[side*.26,1.5,-.09],[side*.37,1.235,-.09]],.008,'metal');
 for(let k=0;k<3;k++)curve(rig,c.trim,[[side*.19,.61-k*.075,.259],[side*.22,.58-k*.075,.260],[side*.20,.55-k*.075,.260],[side*.17,.575-k*.075,.261]],.005,'metal');}
 for(let i=0;i<5;i++){const ruffle=plate(rig,0xf0e1c5,[[-.075+i*.005,.035],[.07-i*.005,.035],[.075,-.005],[.033,-.042],[0,-.02],[-.031,-.043],[-.075,-.01]],[0,1.26-i*.043,.283+i*.007],.007);ruffle.rotation.x=-.13;}
 ring(rig,c.trim,[0,1.065,.340],.057,.010);gem(rig,0x9e3154,[0,1.065,.346],.060);curve(rig,c.trim,[[-.24,1.225,.23],[-.15,1.18,.29],[0,1.17,.31],[.15,1.18,.29],[.24,1.225,.23]],.010,'metal');
}
function soldier(rig,head,limbs,c){for(const side of [-1,1]){
 for(let j=0;j<6;j++)lock(rig,j%2?0xb3bab2:0x8b9c9f,[[side*(.12+j*.034),1.32,.02],[side*(.14+j*.05),1.23,.20],[side*(.13+j*.048),1.12,.22]],.055,.055);
 const shoulder=group(limbs[side<0?'leftArm':'rightArm'],0,.005,0);for(let j=0;j<3;j++){const shell=sculpt(shoulder,j%2?0x748b9d:0x526a7c,[[-.08-j*.072,.18-j*.022,.19-j*.015],[.02-j*.072,.21-j*.015,.235-j*.015],[.12-j*.072,.08,.13]],{segments:24,kind:'metal'});shell.position.x=side*j*.035;curve(shoulder,c.trim,[[side*(-.14+j*.035),-.07-j*.072,.145],[side*j*.035,-.065-j*.072,.205],[side*(.14+j*.035),-.07-j*.072,.145]],.010,'metal');}
 for(let j=0;j<3;j++)button(shoulder,c.trim,-.085+j*.085,.04,.202,.014);
 }curve(rig,c.leather,[[-.27,1.25,.255],[-.13,1.08,.30],[.12,.85,.245],[.23,.79,.24]],.036);buckle(rig,c.trim,-.045,1.005,.33,.10);
 plate(rig,0xc6b58d,[[-.050,.04],[0,.079],[.050,.04],[.036,-.038],[0,-.072],[-.036,-.038]],[.19,1.07,.287],.014,'metal');plate(rig,0x34475b,[[-.023,.025],[0,.041],[.023,.025],[0,-.035]],[.19,1.07,.31],.005);
 const tail=group(rig,0,.65,-.19);lock(tail,0x728c9c,[[0,0,0],[.04,-.13,-.30],[.14,-.04,-.57],[.25,.13,-.77]],.13,.11);lock(tail,0xc7c8b8,[[.15,-.035,-.57],[.25,.13,-.77],[.23,.26,-.86]],.105,.085);limbs.tail=tail;
}
function engineer(rig,head,limbs,c){const goggles=group(head,0,.325,.335);for(const side of [-1,1]){const g=group(goggles,side*.16,0,0);const frame=ring(g,c.trim,[0,0,0],.103,.022);sphere(g,0x26525b,[0,0,0],[.082,.082,.023],'metal');sphere(g,0x82d4d0,[0,0,.024],[.064,.064,.008],'metal');curve(g,0xe2f6dc,[[-.043,.035,.034],[-.01,.050,.035],[.015,.052,.034]],.007,'light');for(let j=0;j<4;j++){const a=j*Math.PI/2;button(g,0xe0c088,Math.sin(a)*.10,Math.cos(a)*.10,.012,.008);}}
 curve(goggles,c.leather,[[-.40,-.02,-.10],[-.30,0,0],[-.26,0,.01]],.021);curve(goggles,c.leather,[[.26,0,.01],[.31,0,0],[.40,-.02,-.10]],.021);curve(goggles,c.trim,[[-.06,0,0],[0,.013,.018],[.06,0,0]],.012,'metal');
 const scarf=ring(rig,0xdfb476,[0,1.27,0],.171,.043,'cloth');scarf.rotation.x=Math.PI/2;plate(rig,0xdfb476,[[-.07,.06],[.07,.06],[.09,-.29],[.015,-.26],[-.065,-.33]],[-.04,1.20,.287],.019);curve(rig,0xf1d099,[[-.082,1.17,.320],[-.078,.96,.32]],.006);
 for(const side of [-1,1]){curve(rig,c.leather,[[side*.19,1.24,.185],[side*.16,1.03,.265],[side*.18,.83,.22]],.027);buckle(rig,c.trim,side*.165,1.045,.300,.074);const pouch=group(rig,side*.29,.665,.18);sculpt(pouch,0x82573d,[[-.11,.077,.049],[.04,.088,.056],[.08,.078,.047]],{segments:20,ink:false});plate(pouch,0xa17450,[[-.084,.05],[.084,.05],[.071,-.021],[0,-.038],[-.071,-.021]],[0,0,.058],.015);button(pouch,c.trim,0,-.007,.080,.012);}
 const pack=group(rig,0,1.00,-.235);sculpt(pack,0x694936,[[-.26,.22,.10],[-.18,.23,.12],[.17,.23,.12],[.25,.17,.075]],{segments:28});for(const x of [-.14,.14])curve(pack,c.leather,[[x,.18,-.10],[x,0,-.13],[x,-.25,-.10]],.022);for(const side of [-1,1]){const can=group(pack,side*.27,.035,-.035);sculpt(can,0x547f82,[[-.19,.055,.055],[-.15,.073,.073],[.15,.073,.073],[.19,.048,.048]],{kind:'metal',segments:24});for(const y of [-.14,.13]){const r=ring(can,c.trim,[0,y,0],.075,.009);r.rotation.x=Math.PI/2;}}
 curve(pack,c.trim,[[.27,.23,-.03],[.31,.32,-.03],[.20,.38,-.05],[.16,.24,-.09]],.014,'metal');
}
function weapon(hand,type,c){const w=group(hand,0,-.034,.065); // grip origin is the palm
 if(type==='human'){
 sculpt(w,0x614936,[[-.77,.029,.029],[.74,.029,.029]],{segments:16,ink:false});for(let j=0;j<8;j++){const r=ring(w,c.trim,[0,-.55+j*.16,0],.033,.009);r.rotation.x=Math.PI/2;}
 const crown=group(w,0,.85,0);ring(crown,c.trim,[0,0,0],.202,.019);const orbit=ring(crown,0x80dfd2,[0,0,0],.247,.007,'light');orbit.rotation.y=.8;gem(crown,0x4bbcac,[0,0,0],.155);gem(crown,0xb5ffe1,[-.016,.025,.03],.074);for(const side of [-1,1])curve(crown,c.trim,[[side*.02,-.25,0],[side*.19,-.12,0],[side*.18,.12,0],[side*.07,.24,0]],.018,'metal');w.userData.crystal=crown;w.rotation.z=-.45;
 }else{const wolf=type==='wolf';sculpt(w,c.leather,[[-.13,wolf?.043:.027,wolf?.043:.027],[.13,wolf?.043:.027,wolf?.043:.027]],{segments:20,ink:false});for(let j=0;j<5;j++){const r=ring(w,c.trim,[0,-.10+j*.043,0],wolf?.045:.030,.005);r.rotation.x=Math.PI/2;}
 const length=wolf?1.0:1.17,width=wolf?.12:.033;plate(w,0x9bafc0,[[-width,.15],[width,.15],[width*.77,length],[0,length+.18],[-width*.77,length]],[0,0,-.018],wolf?.038:.02,'metal');plate(w,0xd9e5e8,[[0,.17],[width*.85,.17],[width*.62,length],[0,length+.16]],[0,0,.022],.004,'metal');
 curve(w,c.trim,[[-(wolf?.23:.14),.145,.005],[-.09,.18,.015],[0,.15,.025],[.09,.18,.015],[wolf?.23:.14,.145,.005]],wolf?.021:.014,'metal');if(!wolf){curve(w,c.trim,[[-.04,.16,.05],[-.14,.08,.09],[-.13,-.11,.07],[0,-.15,.02]],.013,'metal');const cage=ring(w,c.trim,[0,.13,.02],.085,.009);cage.rotation.x=Math.PI/2;}gem(w,wolf?0x567b8e:0xa83155,[0,-.18,0],wolf?.055:.042);w.rotation.z=wolf?-.23:-.31;
 }return w;}
export function makeDetailedHero(type){const wolf=type==='wolf',human=type==='human';const c={coat:wolf?0x304358:human?0x226c71:0x4f2039,lapel:wolf?0x486278:human?0x399496:0x762941,pants:wolf?0x293a4a:0x34333d,leather:wolf?0x303642:human?0x593d2e:0x35303a,trim:wolf?0xb5a17b:0xc1a069,glove:wolf?0x495664:human?0x8b6042:0xe4d8c3,seam:0x554b46};
 const root=new T.Group(),rig=group(root),limbs={};root.name=type;boots(rig,limbs,c,wolf);coat(rig,c,type);arms(rig,limbs,c,wolf);
 if(human){sculpt(rig,0xe5d8bc,[[.33,.325,.225],[.39,.34,.23],[.54,.27,.20],[.76,.21,.18]],{folds:.055});for(const side of [-1,1]){sphere(rig,0xdbb798,[side*.155,.38,.012],[.106,.13,.11],'skin');}}

 const head=group(rig,0,1.70,.015);limbs.head=head;const eyeParts=wolf?wolfFace(head):humanFace(head,type);if(!wolf)hair(head,type);
 if(wolf)soldier(rig,head,limbs,c);else if(human)engineer(rig,head,limbs,c);else noble(rig,head,limbs,c);
 for(const side of [-1,1])for(let j=0;j<3;j++){const x=side*.19,y=.55+j*.16;curve(rig,c.trim,[[x-.04,y,.273],[x,y+.03,.279],[x+.04,y,.273],[x,y-.03,.279],[x-.04,y,.273]],.0035,'metal');}
 limbs.weapon=weapon(limbs.rightHand,type,c);root.scale.setScalar(1.13);root.userData={rig,limbs,eyes:eyeParts,type,height:wolf?2.38:2.14,phase:0};return root;
}
