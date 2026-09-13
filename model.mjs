import {T,MeshBuilder,vec,smooth} from './geometry.mjs';

export function buildCharacter(type){
 const wolf=type==='wolf',eda=type==='human',wide=wolf?1.23:1;
 const bones=[];const add=(name,parent,position)=>{bones.push({name,parent,position});};
 add('root',null,[0,0,0]);add('hips','root',[0,1.08,0]);add('spine','hips',[0,1.48,0]);add('chest','spine',[0,1.82,0]);add('neck','chest',[0,2.03,0]);add('head','neck',[0,2.48,0]);
 for(const [s,side]of [[1,'l'],[-1,'r']]){
  add('upperarm.'+side,'chest',[s*.39*wide,1.84,0]);add('lowerarm.'+side,'upperarm.'+side,[s*.78*wide,1.84,0]);add('hand.'+side,'lowerarm.'+side,[s*1.10*wide,1.84,0]);
  add('upperleg.'+side,'hips',[s*.19*wide,1.08,0]);add('lowerleg.'+side,'upperleg.'+side,[s*.19*wide,.61,.025]);add('foot.'+side,'lowerleg.'+side,[s*.19*wide,.18,0]);add('toes.'+side,'foot.'+side,[s*.19*wide,.095,.24]);
  add('coat.'+side,'hips',[s*.24,1.12,-.02]);add('cape.'+side,'chest',[s*.28,1.88,-.16]);add('capeTip.'+side,'cape.'+side,[s*.40,1.02,-.36]);
 }
 add('tail','hips',[0,1.04,-.20]);add('tailTip','tail',[0,.68,-.76]);
 const materials={
  skin:{color:eda?0xe6c2a8:0xead2be},face:{color:0xffffff,texture:eda?'face-eda':'face-lucien'},fur:{color:0x778087},wolfFace:{color:0xffffff,texture:'wolf-face'},
  coat:{color:wolf?0x293848:eda?0x1f6769:0x481e31,texture:'damask'},lining:{color:wolf?0x445565:eda?0x418585:0x773249},
  dark:{color:0x292a35},leather:{color:eda?0x674331:0x37303a},gold:{color:0xc1a36d,metalness:.6,roughness:.37},steel:{color:0x728591,metalness:.65,roughness:.34},edge:{color:0xbccbd1,metalness:.65,roughness:.3},
  ivory:{color:0xe7ddc3},lace:{color:0xf0e4ce},hair:{color:eda?0x56382a:0xb9bdca},hairLight:{color:eda?0x926047:0xdee2e8},hairDark:{color:eda?0x392b26:0x858b9d},
  gem:{color:eda?0x4fc5b7:0x9c3a60,metalness:.25,emissive:eda?0x19483e:0x23000c},glass:{color:0x509d9e,metalness:.35},seam:{color:0x8e7759}
 };
 const m=new MeshBuilder(bones);
 const torsoWeights=p=>{const a=smooth(1.08,1.48,p[1]),b=smooth(1.48,1.80,p[1]);return [['hips',1-a],['spine',a*(1-b)],['chest',b]];};
 // Slim waist and shaped chest; this is one continuous weighted surface.
 m.loft([[0,1.02,0,.27*wide,.19],[0,1.12,0,.29*wide,.21],[0,1.31,0,.24*wide,.19],[0,1.51,0,.29*wide,.23],[0,1.70,0,.37*wide,.25],[0,1.86,0,.33*wide,.21],[0,1.98,0,.15,.12]],'coat',torsoWeights);
 m.loft([[0,1.90,0,.13,.11],[0,2.14,0,.12,.11]],'skin','neck');
 for(const [s,side]of [[1,'l'],[-1,'r']]){
  const thigh='upperleg.'+side,knee='lowerleg.'+side,foot='foot.'+side,arm='upperarm.'+side,fore='lowerarm.'+side,hand='hand.'+side,x=s*.19*wide;
  const legWeights=p=>{const a=smooth(.51,.71,p[1]);return [[thigh,a],[knee,1-a]];};
  m.loft([[x,.18,0,.09,.11],[x,.32,0,.105,.105],[x,.50,.015,.105,.12],[x,.61,.025,.115,.12],[x,.78,.015,.135,.14],[x,1.03,0,.14,.155],[x,1.12,0,.13,.14]],eda?'skin':'dark',legWeights);
  if(eda)m.loft([[x,.22,0,.105,.113],[x,.50,.02,.114,.125],[x,.77,.016,.137,.147]],'dark',legWeights);
  m.loft([[x,.09,.015,.125,.15],[x,.20,0,.12,.13],[x,.38,0,.125,.126],[x,.45,0,.13,.135]],'leather',p=>[[foot,1-smooth(.22,.41,p[1])],[knee,smooth(.22,.41,p[1])]]);
  m.ellipsoid([x,.115,.15],[.14,.11,.26],'leather',foot);m.box([x,.048,.12],[.28,.055,.45],'dark',foot);
  for(let j=0;j<4;j++)m.tube([[x-.07,.27-j*.038,.12],[x+.07,.25-j*.038,.13]],.007,'seam',foot);
  m.ring([x,.40,0],.127,.009,'gold',knee,[Math.PI/2,0,0]);
  // T-pose sleeves, continuous elbow loop and forearm skin blending.
  const armRows=Array.from({length:13},(_,i)=>{const q=.35+i/12*.74;return [s*q*wide,1.84,0,(q<.57?.15:q<.81?.115:.10)*(wolf?1.15:1),q<.57?.16:.12];});
  if(s<0)armRows.reverse();
  const armWeights=p=>{const f=smooth(.69*wide,.87*wide,Math.abs(p[0]));return [[arm,1-f],[fore,f]];};
  m.loft(armRows,'coat',armWeights,'x');
  m.loft([[s*.98*wide,1.84,0,.11,.13],[s*1.08*wide,1.84,0,.114,.132]].sort((a,b)=>a[0]-b[0]),eda?'ivory':'leather',fore,'x');
  m.ellipsoid([s*1.18*wide,1.84,0],[.14,.085,.102],eda?'leather':'ivory',hand);
  for(let k=0;k<4;k++)m.ellipsoid([s*1.255*wide,1.805,-.064+k*.043],[.047,.045,.024],eda?'leather':'ivory',hand,12);
  m.ellipsoid([s*1.14*wide,1.80,.096],[.055,.045,.044],eda?'leather':'ivory',hand,12);
  m.ring([s*1.02*wide,1.84,0],.12,.012,'gold',fore,[0,Math.PI/2,0]);
  // Fitted lapels and embroidered borders.
  m.panel([[s*.11,1.97,.22],[s*.34*wide,1.83,.22],[s*.13,1.52,.22],[s*.06,1.77,.22]],'lining','chest',.032);
  m.tube([[s*.11,1.975,.261],[s*.335*wide,1.83,.263],[s*.13,1.525,.271]],.009,'gold','chest');
  for(let j=0;j<4;j++)m.ellipsoid([s*.13,1.67-j*.13,.245],[.025,.025,.012],'gold',torsoWeights,12);
 }
 m.loft([[0,1.125,0,.288*wide,.214],[0,1.20,0,.274*wide,.21]],'leather','hips');m.ring([0,1.16,.238],.065,.014,'gold','hips',[0,0,0],[1.2,.72,1]);
 // The head shell is a newly modelled front/back grid with its own planar face UVs.
 const headRows=[[-.47,.045,.09],[-.42,.20,.18],[-.31,.34,.27],[-.15,.405,.325],[.03,.425,.355],[.21,.395,.34],[.37,.29,.27],[.46,.12,.12],[.48,.003,.003]];
 for(const front of [true,false]){
  const p=[],uv=[],idx=[],N=40;
  headRows.forEach(([yy,ww,dd],j)=>{for(let i=0;i<=N;i++){const a=(front?-Math.PI/2:Math.PI/2)+i/N*Math.PI,x=Math.sin(a)*ww,y=2.48+yy;let z=Math.cos(a)*dd;
   if(front){const nose=wolf?.21:.022;z+=Math.exp(-x*x/(wolf?.022:.002)-(yy+(wolf?.18:.16))**2/(wolf?.017:.003))*nose;}
   p.push(x,y,z);let u=x/.90+.5,v=(yy+.44)/.75;if(wolf){u=x/.85+.5;v=(yy+.46)/.81;}uv.push(T.MathUtils.clamp(u,.005,.995),T.MathUtils.clamp(v,.005,.995));}});
  for(let j=0;j<headRows.length-1;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i,b=a+N+1;idx.push(a,a+1,b,a+1,b+1,b);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();m.add(g,front?(wolf?'wolfFace':'face'):(wolf?'fur':'skin'),'head');
  if(front&&!wolf)m.add(g.clone().translate(0,0,-.004),'skin','head');
 }
 if(wolf){
  for(const side of [-1,1]){m.panel([[side*.21,2.78,-.035],[side*.46,3.24,-.035],[side*.50,2.70,-.035]],'fur','head',.11);m.panel([[side*.29,2.81,.084],[side*.446,3.115,.084],[side*.449,2.77,.084]],'leather','head',.008);
   for(let j=0;j<9;j++)m.blade([[side*.30,2.60-j*.034,.22],[side*(.43+j*.004),2.49-j*.031,.18],[side*.43,2.35-j*.025,.095]],.038,j%2?'hairDark':'fur','head',.018);
  }
  for(let j=0;j<7;j++)m.blade([[.16-j*.048,2.91,-.03],[.10-j*.044,2.99,.13],[.03-j*.034,2.78,.29]],.049,'fur','head',.026);
 }else{
  for(const side of [-1,1])m.ellipsoid([side*.405,2.39,-.005],[.065,.10,.047],'skin','head',16);
  const cap=new T.SphereGeometry(1,32,18,0,Math.PI*2,0,1.2);m.add(cap,'hairDark','head',new T.Matrix4().compose(vec([0,2.48,-.035]),new T.Quaternion(),vec([.435,.51,.385])));
  for(let i=0;i<22;i++){const a=.88+i/21*4.53,x=Math.sin(a),z=Math.cos(a);m.blade([[x*.20,2.92,z*.16-.04],[x*.405,2.72,z*.36-.04],[x*.43,2.38,z*.36-.025],[x*.36,eda?2.12:2.20,z*.27]],.074,i%3?'hair':'hairDark','head',.023);}
  const bangs=eda?[
   [[-.11,2.98,.045],[-.30,2.76,.30],[-.36,2.40,.29]],[[0,2.99,.06],[-.08,2.78,.39],[-.20,2.62,.365]],[[.10,2.97,.06],[.15,2.80,.36],[.10,2.60,.386]],[[.18,2.93,.05],[.33,2.70,.30],[.36,2.32,.22]]
  ]:[[[.06,2.99,.045],[-.13,2.84,.35],[-.32,2.50,.32]],[[.12,2.98,.03],[.07,2.81,.40],[-.14,2.63,.38]],[[.19,2.94,.04],[.24,2.80,.35],[.16,2.65,.37]],[[.23,2.88,.02],[.37,2.65,.26],[.36,2.20,.18]]];
  for(const [i,path]of bangs.entries()){m.blade(path,.105,i%2?'hair':'hairLight','head',.03);for(let j=0;j<3;j++)m.blade(path.map((p,k)=>[p[0]+(j-1)*.033*(1-k*.25),p[1],p[2]+.029]),.008,'hairLight','head',.004);}
 }
 // Independent cut garment panels, with long coat / short tunic / cloak silhouettes.
 for(const [side,suffix]of [[1,'l'],[-1,'r']]){
  const bone='coat.'+suffix;
  if(!eda){const pts=[[side*.025,1.15,.20],[side*.28*wide,1.19,.20],[side*.41*wide,.48,.20],[side*.095,.57,.20]];m.panel(pts,'coat',bone,.04);m.tube([[side*.035,1.13,.25],[side*.105,.59,.25],[side*.385*wide,.51,.25]],.010,'gold',bone);
   for(let k=0;k<3;k++){const x=side*(.20+k*.018),y=.91-k*.125;m.tube([[x-.03,y,.257],[x,y+.045,.26],[x+.03,y,.257],[x,y-.045,.26],[x-.03,y,.257]],.005,'gold',bone);}}
 }
 if(eda){
  const rows=[];for(let j=0;j<9;j++){const t=j/8;rows.push([0,.73+t*.43,0,.40-t*.13,.275-t*.07]);}m.loft(rows,'ivory',p=>[['hips',.7],['coat.'+(p[0]>0?'l':'r'),.3]],'y',48);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;m.tube([[Math.sin(a)*.39,.75,Math.cos(a)*.27],[Math.sin(a)*.30,1.08,Math.cos(a)*.217]],.006,'seam','hips');}
  for(const side of [-1,1]){m.tube([[side*.24,1.91,.19],[side*.20,1.65,.265],[side*.21,1.23,.23]],.033,'leather','chest');m.box([side*.35,1.10,.15],[.19,.24,.17],'leather','hips');m.panel([[side*.26,1.20,.248],[side*.44,1.20,.248],[side*.42,1.09,.248],[side*.28,1.09,.248]],'seam','hips',.012);}
  for(const side of [-1,1]){m.ring([side*.175,2.92,.26],.115,.026,'gold','head',[.3,0,side*.12]);m.ellipsoid([side*.175,2.92,.267],[.091,.091,.035],'glass','head');}
  m.tube([[-.30,2.91,.22],[-.44,2.82,-.04],[0,2.78,-.4],[.44,2.82,-.04],[.30,2.91,.22]],.027,'leather','head');
  m.box([0,1.59,-.33],[.52,.58,.28],'leather','chest');for(const side of [-1,1]){m.loft([[side*.31,1.27,-.36,.092,.092],[side*.31,1.73,-.36,.092,.092]],'glass','chest');for(const yy of [1.29,1.70])m.ring([side*.31,yy,-.36],.096,.025,'gold','chest',[Math.PI/2,0,0]);}m.ring([0,1.60,-.49],.16,.024,'gold','chest');
 }else if(wolf){
  for(const [side,suffix]of [[1,'l'],[-1,'r']]){for(let j=0;j<3;j++){m.ellipsoid([side*(.44+j*.07),1.86-j*.065,0],[.27-j*.035,.16,.28-j*.028],j%2?'edge':'steel','upperarm.'+suffix);m.tube([[side*(.32+j*.045),1.81-j*.065,.22],[side*(.48+j*.07),1.78-j*.065,.25],[side*(.65+j*.055),1.82-j*.065,.17]],.013,'gold','upperarm.'+suffix);}
   for(let j=0;j<5;j++)m.blade([[side*(.12+j*.035),2.03,.045],[side*(.14+j*.044),1.91,.22],[side*(.17+j*.042),1.82,.235]],.047,'fur','chest',.035);
  }m.tube([[-.34,1.90,.22],[-.10,1.55,.31],[.28,1.21,.24]],.037,'leather','chest');m.panel([[.18,1.78,.284],[.27,1.70,.284],[.25,1.57,.284],[.15,1.57,.284],[.12,1.70,.284]],'gold','chest');
  m.blade([[0,1.02,-.17],[0,.76,-.46],[.13,.64,-.83],[.22,.92,-1.02]],.19,'fur',p=>[['tail',1-smooth(.5,.95,-p[2])],['tailTip',smooth(.5,.95,-p[2])]],.145);
 }else{
  // Cape is a weighted surface with two shoulder and two hem joints.
  const p=[],uv=[],idx=[],N=16,M=32;for(let j=0;j<=N;j++){const t=j/N;for(let i=0;i<=M;i++){const u=i/M,a=.05+u*(Math.PI-.10),r=.39+t*.38;p.push(Math.cos(a)*r,1.93-t*1.58,-Math.sin(a)*r-.10-.10*Math.sin(t*Math.PI)+Math.sin(u*Math.PI*12)*.025*t);uv.push(u,t);}}
  for(let j=0;j<N;j++)for(let i=0;i<M;i++){const a=j*(M+1)+i,b=a+M+1;idx.push(a,b,a+1,a+1,b,b+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();m.add(g,'lining',p=>{const side=p[0]>0?'l':'r',f=smooth(1.75,.75,p[1]);return [['cape.'+side,1-f],['capeTip.'+side,f]];});materials.lining.doubleSided=true;
  for(const [side,suffix]of [[1,'l'],[-1,'r']]){m.panel([[side*.12,1.94,-.14],[side*.25,2.23,-.14],[side*.40,1.92,-.14]],'lining','chest',.04);m.tube([[side*.125,1.95,-.09],[side*.25,2.23,-.09],[side*.40,1.93,-.09]],.011,'gold','chest');}
  for(let j=0;j<6;j++){const w=.11-j*.006,y=1.93-j*.068;m.panel([[-w,y,.285],[w,y,.285],[w+.02,y-.048,.285],[.025,y-.072,.285],[0,y-.05,.285],[-.035,y-.077,.285],[-w-.02,y-.04,.285]],'lace','chest',.012);}
  m.ellipsoid([0,1.55,.32],[.07,.085,.028],'gem','chest');m.ring([0,1.55,.315],.08,.009,'gold','chest',[0,0,0],[.85,1.08,1]);
 }
 // Hand-held geometry is authored in the right hand's bind space and weighted to its joint.
 const grip=vec([-1.17*wide,1.84,0]);
 const weapon=new MeshBuilder(bones);const P=a=>vec(a).add(grip).toArray();
 if(eda){weapon.tube([P([0,-.75,0]),P([0,1.11,0])],.035,'leather','hand.r');for(let j=0;j<8;j++)weapon.ring(P([0,-.6+j*.19,0]),.039,.012,'gold','hand.r',[Math.PI/2,0,0]);weapon.ring(P([0,1.19,0]),.22,.025,'gold','hand.r');weapon.ring(P([0,1.19,0]),.245,.010,'gold','hand.r',[0,.9,0]);weapon.ellipsoid(P([0,1.19,0]),[.115,.21,.10],'gem','hand.r');for(const side of [-1,1])weapon.tube([P([side*.02,.90,0]),P([side*.20,1.04,0]),P([side*.17,1.35,0])],.022,'gold','hand.r');}
 else{const width=wolf?.12:.035,len=wolf?1.12:1.28;weapon.tube([P([0,-.12,0]),P([0,.15,0])],wolf?.043:.028,'leather','hand.r');weapon.panel([P([-width,.17,-.012]),P([width,.17,-.012]),P([width*.70,len,-.012]),P([0,len+.18,-.012]),P([-width*.70,len,-.012])],'edge','hand.r',.025);weapon.tube([P([-.22,.16,.015]),P([0,.18,.04]),P([.22,.16,.015])],.022,'gold','hand.r');if(!wolf){weapon.ring(P([0,.12,0]),.115,.014,'gold','hand.r',[Math.PI/2,0,0]);for(const a of [-1,0,1])weapon.tube([P([-.09,.13,a*.06]),P([-.15,-.02,a*.06]),P([0,-.15,0])],.010,'gold','hand.r');}}
 const weaponRotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),eda?0:Math.PI/2);
 for(const [mat,batch]of weapon.batches){for(let i=0;i<batch.p.length;i+=3){const p=vec(batch.p.slice(i,i+3)).sub(grip).applyQuaternion(weaponRotation).add(grip),n=vec(batch.n.slice(i,i+3)).applyQuaternion(weaponRotation);batch.p.splice(i,3,...p.toArray());batch.n.splice(i,3,...n.toArray());}const target=m.batches.get(mat)||{p:[],n:[],uv:[],j:[],w:[],idx:[]},offset=target.p.length/3;for(const k of ['p','n','uv','j','w'])target[k].push(...batch[k]);target.idx.push(...batch.idx.map(i=>i+offset));m.batches.set(mat,target);}
 return {type,bones,materials,batches:m.batches,headUnit:1,height:3,weaponTip:vec([0,eda?1.43:wolf?1.30:1.46,0]).applyQuaternion(weaponRotation).add(grip).toArray()};
}
