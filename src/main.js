import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'dat.gui';
import { createAdminBuilding } from './models/AdminBuilding.js';
import { createWalkthrough } from './Walkthrough.js';
import { createInteractions } from './Interactions.js';
import { createCCTVSystem } from './CCTVSystem.js';
import { createEmergencySystem } from './models/EmergencySystem.js';
import './style.css';

const parameters = { night:false, autoRotate:false, shadows:true, rooftops:true };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const viewContent = {
  overview:{camera:[24,14,-28],target:[2.6,2.6,0]},
  ground:{camera:[13,13,-14],target:[0,1.2,0]},
  session:{camera:[15,16,-18],target:[2,3.9,0]},
};
const container = document.querySelector('#scene-container');
let activeView = 'overview';
let transition = null;
let renderer, scene, camera, controls, admin, walkthrough, interactions, cctv, emergency, sun, hemisphere, ambient, sky;
let actionTimer;
let lastTime = 0;
let ready = false;

function showError(error) {
  console.error(error);
  document.querySelector('#loading-screen').hidden=true;
  document.querySelector('#error-screen').hidden=false;
  document.querySelector('#error-message').textContent='Use a browser with WebGL 2 and hardware acceleration enabled, then reload. '+(error?.message||'The graphics context is unavailable.');
}
document.querySelector('#retry-button').addEventListener('click',()=>location.reload());

function createSky() {
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(220,24,16),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{top:{value:new THREE.Color('#95c4e5')},horizon:{value:new THREE.Color('#edf3f7')},bottom:{value:new THREE.Color('#dce5ed')}},
    vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vDirection; void main(){float y=normalize(vDirection).y;vec3 c=mix(bottom,horizon,smoothstep(-0.4,0.0,y));c=mix(c,top,smoothstep(0.0,0.9,y));gl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  }));
  mesh.name='Sky';
  mesh.renderOrder=-100;
  mesh.frustumCulled=false;
  return mesh;
}

function setLighting(night) {
  parameters.night=night;
  const inside=walkthrough?.active;
  document.body.classList.toggle('night',night);
  sun.color.set(night?'#a4c1f5':'#fff3e4');
  sun.intensity=night?0.45:2.8;
  sun.position.set(night?-14:-16,night?20:26,night?10:-15);
  hemisphere.color.set(night?'#809dc1':'#e0efff');
  hemisphere.groundColor.set(night?'#1e2c3e':'#aab8c8');
  hemisphere.intensity=night?0.65:1.7;
  ambient.intensity=night?0.24:inside?0.55:0.32;
  scene.fog.color.set(night?'#1c3048':'#e4ebf1');
  sky.material.uniforms.top.value.set(night?'#081627':'#95c4e5');
  sky.material.uniforms.horizon.value.set(night?'#29465f':'#edf3f7');
  sky.material.uniforms.bottom.value.set(night?'#203246':'#dce5ed');
  renderer.toneMappingExposure=night?1.18:1.05;
  for(const light of admin.lights) {
    const day=light.userData.dayIntensity??4;
    const evening=light.userData.nightIntensity??12;
    light.intensity=night?evening:inside?Math.max(day,evening*0.8):day;
    light.visible=light.intensity>0;
  }
  scene.traverse(object=>{
    if(object.userData.nightGlow&&object.material?.emissive) object.material.emissiveIntensity=night||inside?1.1:0.2;
  });
  const button=document.querySelector('#lighting-toggle');
  button.setAttribute('aria-pressed',String(night));
  button.setAttribute('aria-label',night?'Switch to daylight':'Switch to night lighting');
  document.querySelector('#lighting-label').textContent=night?'Evening':'Daylight';
  document.querySelector('#lighting-icon').textContent=night?'☾':'☀';
  cctv?.invalidate();
}

function applySections() {
  admin.setView(activeView);
  if(activeView!=='walk'&&!parameters.rooftops) admin.roof.visible=false;
}

function updateModeUI(inside) {
  document.body.classList.toggle('walking',inside);
  for(const id of ['room-navigation','exit-button','walk-controls','crosshair','object-controls']) document.querySelector(`#${id}`).hidden=!inside;
  document.querySelector('#enter-button').hidden=inside;
  document.querySelector('.orientation').hidden=inside;
  document.querySelector('#interaction-hints').textContent=inside?'WASD to walk · Drag to look · Click / E to interact':'Drag to orbit · Scroll to zoom · Right-drag to pan';
  renderer.domElement.setAttribute('aria-label',inside?'Inside Barangay Bucana. Drag to look, use WASD to walk, and click nearby doors, drawers or the emergency button. Press E to operate the object you are looking at.':'Barangay Bucana exterior. Drag to orbit, scroll to zoom, right-drag to pan.');
}

function leaveWalk() {
  if(!walkthrough.active) return;
  walkthrough.exit();
  controls.enabled=true;
  controls.autoRotate=parameters.autoRotate;
  camera.fov=43;
  camera.near=0.1;
  camera.far=300;
  camera.rotation.order='XYZ';
  updateModeUI(false);
  resize();
  setLighting(parameters.night);
}

function selectView(view,immediate=false) {
  if(!viewContent[view]) return;
  leaveWalk();
  activeView=view;
  applySections();
  const content=viewContent[view];
  document.querySelectorAll('.view-button').forEach(button=>{
    const selected=button.dataset.view===view;
    button.classList.toggle('active',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  const destination=new THREE.Vector3(...content.camera);
  const target=new THREE.Vector3(...content.target);
  if(innerWidth<760) destination.sub(target).multiplyScalar(Math.max(1.35,innerHeight/innerWidth*1.1)).add(target);
  controls.minDistance=4;
  controls.maxDistance=innerWidth<760?180:70;
  controls.maxPolarAngle=Math.PI*0.485;
  if(immediate||reducedMotion) {
    camera.position.copy(destination);
    controls.target.copy(target);
    transition=null;
    controls.update();
  } else {
    transition={from:camera.position.clone(),fromTarget:controls.target.clone(),to:destination,target,start:performance.now(),duration:950};
  }
}

function updateRoom(room) {
  const name=room?.name||'Entrance';
  const floor=room?.floor??walkthrough?.floor??0;
  document.querySelector('#room-status').textContent=`${floor===1?'Second':'First'} floor · ${name}`;
  document.querySelectorAll('[data-room]').forEach(button=>{
    const selected=button.dataset.room===room?.id;
    button.classList.toggle('active',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
}

function enterHall(roomId=null) {
  transition=null;
  controls.enabled=false;
  controls.autoRotate=false;
  activeView='walk';
  camera.fov=72;
  camera.near=0.035;
  camera.far=300;
  camera.clearViewOffset();
  camera.updateProjectionMatrix();
  applySections();
  updateModeUI(true);
  document.querySelectorAll('.view-button').forEach(button=>{button.classList.remove('active');button.setAttribute('aria-pressed','false');});
  walkthrough.enter(roomId);
  setLighting(parameters.night);
  resize();
  renderer.domElement.focus({preventScroll:true});
}

function visitRoom(id) {
  if(!walkthrough.active) enterHall(id);
  else walkthrough.goToRoom(id);
}

function createSettings() {
  const gui=new GUI({autoPlace:false,width:232,hideable:false});
  document.querySelector('#gui-container').append(gui.domElement);
  gui.add(parameters,'autoRotate').name('Exterior rotation').onChange(value=>{controls.autoRotate=value&&!walkthrough.active;transition=null;});
  gui.add(parameters,'shadows').name('Sun shadows').onChange(value=>{
    renderer.shadowMap.enabled=value;
    scene.traverse(object=>{if(object.material) (Array.isArray(object.material)?object.material:[object.material]).forEach(material=>material.needsUpdate=true);});
  });
  gui.add(parameters,'rooftops').name('Exterior roof').onChange(applySections);
  document.querySelector('#settings-toggle').addEventListener('click',event=>{
    const expanded=event.currentTarget.getAttribute('aria-expanded')!=='true';
    event.currentTarget.setAttribute('aria-expanded',String(expanded));
    document.querySelector('#gui-container').hidden=!expanded;
    document.querySelector('#settings-chevron').textContent=expanded?'−':'+';
  });
}

function initialize() {
  scene=new THREE.Scene();
  scene.fog=new THREE.Fog('#e4ebf1',70,180);
  camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,0.1,300);
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.domElement.tabIndex=0;
  container.append(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();showError(new Error('The graphics context was interrupted.'));});
  controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;
  controls.dampingFactor=0.065;
  controls.minPolarAngle=0.08;
  controls.maxPolarAngle=Math.PI*0.485;
  controls.screenSpacePanning=false;
  controls.autoRotateSpeed=0.45;
  controls.zoomSpeed=0.8;
  controls.addEventListener('start',()=>{transition=null;});
  sky=createSky();
  scene.add(sky);
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),new THREE.MeshStandardMaterial({color:'#d4dfe9',roughness:1}));
  backdrop.name='Neutral shadow backdrop';
  backdrop.rotation.x=-Math.PI/2;
  backdrop.position.y=-0.058;
  backdrop.receiveShadow=true;
  scene.add(backdrop);
  sun=new THREE.DirectionalLight('#fff3e4',2.8);
  sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-18,right:18,top:16,bottom:-16,near:1,far:85});
  sun.shadow.normalBias=0.025;
  sun.shadow.bias=-0.00012;
  hemisphere=new THREE.HemisphereLight('#e0efff','#aab8c8',1.7);
  ambient=new THREE.AmbientLight('#ffffff',0.32);
  scene.add(sun,hemisphere,ambient);
  admin=createAdminBuilding();
  admin.group.position.set(0,0,0);
  scene.add(admin.group);
  cctv=createCCTVSystem({renderer,scene,model:admin,sky});
  emergency=createEmergencySystem({model:admin,reducedMotion,onChange:active=>{
    document.querySelector('#emergency-banner').hidden=!active;
    document.body.classList.toggle('emergency-active',active);
    cctv.invalidate();
  }});
  walkthrough=createWalkthrough({camera,domElement:renderer.domElement,model:admin,onRoomChange:updateRoom,onFloorChange:()=>updateRoom(walkthrough.room),onLockChange:locked=>{
    document.querySelector('#walk-hint').textContent=locked?'Move the mouse to look · E to interact · Esc frees the cursor':'Drag to look · L locks the mouse · E to interact';
  }});
  interactions=createInteractions({camera,domElement:renderer.domElement,model:admin,walkthrough,
    onTargetChange:(item,prompt)=>{
      const button=document.querySelector('#interact-button');
      button.disabled=!item;
      button.setAttribute('aria-pressed',String(Boolean(item?.target)));
      document.querySelector('#interact-label').textContent=prompt||'Aim at an interactive object';
      document.querySelector('#crosshair').classList.toggle('can-interact',Boolean(item));
    },
    onAction:message=>{
      clearTimeout(actionTimer);
      document.querySelector('#object-status').textContent=message;
      actionTimer=setTimeout(()=>{document.querySelector('#object-status').textContent='';},2200);
    },
  });
  document.querySelector('#interact-button').addEventListener('click',()=>interactions.interact());
  createSettings();
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>selectView(button.dataset.view)));
  document.querySelectorAll('[data-room]').forEach(button=>button.addEventListener('click',()=>visitRoom(button.dataset.room)));
  document.querySelector('#enter-button').addEventListener('click',()=>enterHall());
  document.querySelector('#exit-button').addEventListener('click',()=>selectView('overview'));
  document.querySelector('#lighting-toggle').addEventListener('click',()=>setLighting(!parameters.night));
  document.querySelectorAll('[data-move]').forEach(button=>{
    const release=()=>{walkthrough.setMove(button.dataset.move,false);button.classList.remove('pressed');};
    button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);walkthrough.setMove(button.dataset.move,true);button.classList.add('pressed');});
    button.addEventListener('pointerup',release);
    button.addEventListener('pointercancel',release);
    button.addEventListener('lostpointercapture',release);
    button.addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();walkthrough.setMove(button.dataset.move,true);button.classList.add('pressed');}});
    button.addEventListener('keyup',release);
    button.addEventListener('blur',release);
  });
  const fullButton=document.querySelector('#fullscreen-button');
  fullButton.hidden=!document.fullscreenEnabled;
  fullButton.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('#app').requestFullscreen();}catch(error){console.warn(error.message);}});
  document.addEventListener('fullscreenchange',()=>fullButton.setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
  window.addEventListener('keydown',event=>{
    if(event.target.matches('input,textarea,select')||event.ctrlKey||event.metaKey||event.altKey) return;
    const view={1:'overview',2:'ground',3:'session'}[event.key];
    if(view) selectView(view);
    if(event.key.toLowerCase()==='n') setLighting(!parameters.night);
    if(event.key==='Home'){event.preventDefault();selectView('overview');}
  });
  window.addEventListener('resize',resize);
  window.addEventListener('blur',()=>document.querySelectorAll('[data-move]').forEach(button=>button.classList.remove('pressed')));
  updateModeUI(false);
  setLighting(false);
  selectView('overview',true);
  resize();
  ready=true;
  window.bucana={scene,camera,renderer,controls,admin,walkthrough,interactions,cctv,emergency,selectView,enterHall,visitRoom,setLighting,get view(){return activeView;},get settings(){return {...parameters};}};
  requestAnimationFrame(animate);
}

function resize() {
  camera.aspect=container.clientWidth/container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth,container.clientHeight);
  if(walkthrough?.active) camera.clearViewOffset();
  else if(innerWidth>760) camera.setViewOffset(innerWidth,innerHeight,-innerWidth*0.075,0,innerWidth,innerHeight);
  else camera.setViewOffset(innerWidth,innerHeight,0,innerHeight*0.07,innerWidth,innerHeight);
}

const scaleA=new THREE.Vector3();
const scaleB=new THREE.Vector3();
function updateHUD() {
  if(walkthrough.active) return;
  document.querySelector('#compass-arrow').style.transform=`rotate(${-THREE.MathUtils.radToDeg(controls.getAzimuthalAngle())}deg)`;
  scaleA.copy(controls.target).project(camera);
  scaleB.copy(controls.target).add(new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion).multiplyScalar(2)).project(camera);
  const pixels=Math.abs(scaleB.x-scaleA.x)*innerWidth*0.5;
  document.querySelector('#scale-label').textContent='2 m';
  document.querySelector('#scale-line').style.width=`${Math.min(130,Math.max(15,pixels))}px`;
}

function animate(time) {
  if(!ready) return;
  const delta=Math.min((time-lastTime)/1000,0.05);
  lastTime=time;
  interactions.update(delta);
  emergency.update(time);
  if(walkthrough.active) walkthrough.update(delta);
  else {
    if(transition){
      const t=Math.min((time-transition.start)/transition.duration,1);
      const ease=t*t*(3-2*t);
      camera.position.lerpVectors(transition.from,transition.to,ease);
      controls.target.lerpVectors(transition.fromTarget,transition.target,ease);
      if(t===1)transition=null;
    }
    controls.update(delta);
    controls.target.x=THREE.MathUtils.clamp(controls.target.x,-12,12);
    controls.target.y=THREE.MathUtils.clamp(controls.target.y,0.5,7);
    controls.target.z=THREE.MathUtils.clamp(controls.target.z,-12,12);
    camera.position.y=Math.max(0.4,camera.position.y);
    updateHUD();
  }
  sky.position.copy(camera.position);
  renderer.render(scene,camera);
  cctv.update(time,camera);
  const loading=document.querySelector('#loading-screen');
  if(!loading.classList.contains('loaded')){loading.classList.add('loaded');setTimeout(()=>{loading.hidden=true;},550);}
  requestAnimationFrame(animate);
}

try{initialize();}catch(error){showError(error);}
