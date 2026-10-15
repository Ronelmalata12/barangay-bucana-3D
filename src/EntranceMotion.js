import * as THREE from 'three';
import {box,label} from './models/primitives.js';

/** Detects movement of the virtual visitor near the main door, not webcam activity. */
export function createEntranceMotion({model,onMotion=()=>{}}) {
  const group=new THREE.Group();
  group.name='Main-door motion sensor';group.position.set(0,2.59,-3.79);
  group.userData.simulationOnly=true;model.group.add(group);
  const shell=new THREE.MeshStandardMaterial({color:'#f0f3f5',roughness:0.48});
  box(group,0.29,0.22,0.11,shell);
  const lens=new THREE.Mesh(new THREE.SphereGeometry(0.085,16,12),new THREE.MeshStandardMaterial({color:'#dce6ee',roughness:0.35}));
  lens.scale.set(1,0.8,0.65);lens.position.set(0,-0.025,0.07);group.add(lens);
  const indicator=new THREE.MeshBasicMaterial({color:'#3ad6a0',toneMapped:false});
  box(group,0.055,0.025,0.015,indicator,0,0.072,0.063);
  label(group,'MOTION SENSOR',0.46,0.07,0,-0.19,0.06,{background:'#263e54',color:'#fff',fontSize:100});
  let previous=null,lastDetection=null,count=0,cooldownUntil=0;
  const inZone=p=>Math.abs(p.x)<=0.82&&p.z>=-3.9&&p.z<=-3.02;
  function resetTracking(){previous=null;}
  function reset(){resetTracking();cooldownUntil=performance.now()+3000;lastDetection=null;indicator.color.set('#3ad6a0');}
  function update(time,walker,viewer) {
    indicator.color.set(lastDetection&&time-lastDetection.time<2000?'#ff3048':'#3ad6a0');
    if(!walker.active||walker.paused||walker.floor!==0){resetTracking();return;}
    const p=viewer.position;
    if(previous) {
      const distance=previous.distanceToSquared(p);
      // Ignore looking, standing still, large jumps and room shortcuts.
      if(distance>0.000025&&distance<0.25&&time>=cooldownUntil&&(inZone(p)||inZone(previous))) {
        lastDetection={time,at:Date.now(),position:p.toArray(),number:++count};
        cooldownUntil=time+3000;indicator.color.set('#ff3048');onMotion(lastDetection);
      }
    }
    previous??=new THREE.Vector3();previous.copy(p);
  }
  return {group,update,reset,resetTracking,get lastDetection(){return lastDetection;},get count(){return count;}};
}
