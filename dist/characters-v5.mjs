import * as T from './vendor/three.module.mjs';
import {GLTFLoader}from'./vendor/loaders/GLTFLoader.mjs';
import {clone}from'./vendor/utils/SkeletonUtils.mjs';
const assets=new Map();let loading;
export function preloadCharacters(){return loading??=Promise.all(['vampire','wolf','human'].map(async type=>{const gltf=await new GLTFLoader().loadAsync(new URL('./models-v5/'+type+'.glb',import.meta.url).href);gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;if(o.material.map)o.material.map.anisotropy=4;}});assets.set(type,gltf);}));}
export function createCharacter(type){
 const asset=assets.get(type);if(!asset)throw Error('Character assets must finish loading: '+type);
 const root=new T.Group(),model=clone(asset.scene);root.add(model);const mixer=new T.AnimationMixer(model),actions=Object.fromEntries(asset.animations.map(c=>[c.name,mixer.clipAction(c)]));
 root.userData={type,height:type==='wolf'?3.24:3,edition:5,mixer,actions,model,current:null,locked:false,remaining:0,meta:asset.parser.json.extras.clips};
 setMotion(root,'idle',0);mixer.update(0);return root;
}
export function setMotion(root,name,fade=.16,once=false){
 const d=root.userData,next=d.actions?.[name];if(!next)return 0;
 if(d.current===name&&!once)return next.getClip().duration;
 const previous=d.actions[d.current];next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).setLoop(once?T.LoopOnce:T.LoopRepeat,once?1:Infinity);next.clampWhenFinished=once;next.play();if(previous&&previous!==next)previous.crossFadeTo(next,fade,false);
 d.current=name;d.locked=once;d.remaining=next.getClip().duration;return d.remaining;
}
export function animateV5(root,dt,speed=0){
 const d=root.userData;if(!d.mixer)return;
 if(d.locked){d.remaining-=dt;if(d.remaining<=0&&d.current!=='death'){d.locked=false;setMotion(root,speed>.1?(speed>3?'run':'walk'):'idle');}}
 else{const name=speed>.1?(speed>3?'run':'walk'):'idle';setMotion(root,name);if(name!=='idle')d.actions[name].setEffectiveTimeScale(T.MathUtils.clamp(speed/(name==='run'?4:2),.65,1.55));}
 d.mixer.update(dt);
}
export function playAction(root,name){return setMotion(root,name,.10,true);}
export function resetCharacter(root){const d=root.userData;d.locked=false;d.actions.death.stop();setMotion(root,'idle',0);d.mixer.update(0);root.rotation.x=root.rotation.z=0;root.visible=true;}

export function createModelViewer(container,type){
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;container.append(renderer.domElement);
 const scene=new T.Scene(),model=createCharacter(type);scene.add(model);scene.add(new T.HemisphereLight(0xe4edff,0x70717c,1.8));
 const key=new T.DirectionalLight(0xffe7cf,3);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-4,right:4,top:5,bottom:-3,near:.1,far:20});key.shadow.normalBias=.012;scene.add(key);const rim=new T.DirectionalLight(0xb4d5ff,2);rim.position.set(4,3,-4);scene.add(rim);
 const floor=new T.Mesh(new T.CylinderGeometry(1.5,1.55,.08,64),new T.MeshStandardMaterial({color:0x445362,roughness:.86}));floor.position.y=-.05;floor.receiveShadow=true;scene.add(floor);
 const cam=new T.PerspectiveCamera(32,1,.1,40);let distance=7.4,rot=.12,mode='idle',disposed=false,raf,prev=performance.now(),drag=false,lastX=0,lastY=0,tilt=.08,playing=true,speed=1;
 const controls=document.createElement('div');controls.className='model-controls v5-controls';
 controls.innerHTML='<label>동작 <select aria-label="모델 동작"><option value="idle">대기</option><option value="walk">걷기</option><option value="run">달리기</option><option value="attack">기본 공격</option><option value="skill">고유 기술</option><option value="cast">시전</option><option value="guard">방어</option><option value="hit">피격</option><option value="death">쓰러짐</option></select></label><button type="button" aria-label="동작 일시 정지">일시 정지</button><button type="button" aria-label="동작 다시 재생">다시 재생</button><label>속도 <select aria-label="재생 속도"><option value="1">1×</option><option value="0.35">0.35×</option></select></label><button type="button" aria-label="모델 정면">정면</button><label class="motion-timeline"><span>동작 구간</span><input aria-label="동작 구간" type="range" min="0" max="1000" value="0"><output>0.00 s</output></label>';
 const selects=controls.querySelectorAll('select'),buttons=controls.querySelectorAll('button'),slider=controls.querySelector('input'),out=controls.querySelector('output');
 function restart(){model.userData.mixer.stopAllAction();model.userData.current=null;setMotion(model,mode,0,false);const a=model.userData.actions[mode];a.reset().setLoop(T.LoopRepeat,Infinity).play();model.userData.locked=false;}
 selects[0].onchange=()=>{mode=selects[0].value;restart();};selects[1].onchange=()=>speed=+selects[1].value;
 buttons[0].onclick=()=>{playing=!playing;buttons[0].textContent=playing?'일시 정지':'재생';buttons[0].setAttribute('aria-label',playing?'동작 일시 정지':'동작 재생');};buttons[1].onclick=()=>{restart();playing=true;buttons[0].textContent='일시 정지';};buttons[2].onclick=()=>{rot=0;tilt=.08;distance=7.4;};
 slider.oninput=()=>{playing=false;buttons[0].textContent='재생';const d=model.userData;d.actions[mode].time=+slider.value/1000*d.actions[mode].getClip().duration;d.mixer.update(0);};container.append(controls);
 const resize=()=>{const r=container.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height));cam.aspect=Math.max(1,r.width)/Math.max(1,r.height);cam.updateProjectionMatrix();};const ro=new ResizeObserver(resize);ro.observe(container);resize();
 renderer.domElement.onpointerdown=e=>{drag=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);};renderer.domElement.onpointermove=e=>{if(drag){rot+=(e.clientX-lastX)*.010;tilt=T.MathUtils.clamp(tilt+(e.clientY-lastY)*.004,-.25,.65);lastX=e.clientX;lastY=e.clientY;}};renderer.domElement.onpointerup=renderer.domElement.onpointercancel=()=>drag=false;renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();distance=T.MathUtils.clamp(distance+e.deltaY*.004,4.2,11);},{passive:false});
 function loop(now){if(disposed)return;const dt=Math.min(.05,(now-prev)/1000);prev=now;if(playing&&!document.hidden)model.userData.mixer.update(dt*speed);model.rotation.y=rot;cam.position.set(0,1.46+Math.sin(tilt)*distance,Math.cos(tilt)*distance);cam.lookAt(0,1.46,0);renderer.render(scene,cam);const a=model.userData.actions[mode];if(document.activeElement!==slider)slider.value=a.time/a.getClip().duration*1000;out.value=a.time.toFixed(2)+' s';container.dataset.motion=mode;raf=requestAnimationFrame(loop);}raf=requestAnimationFrame(loop);
 return ()=>{disposed=true;cancelAnimationFrame(raf);ro.disconnect();model.userData.mixer.stopAllAction();floor.geometry.dispose();floor.material.dispose();renderer.dispose();renderer.forceContextLoss();container.replaceChildren();};
}
