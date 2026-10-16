import * as THREE from 'three';
import {box,cylinder,label} from './models/primitives.js';

/** Ceiling smoke alarms with a visitor-operated simulation of smoke detection. */
export function createSmokeAlarm({model,onAlarm=()=>{},onStatus=()=>{}}) {
  const shell=new THREE.MeshStandardMaterial({color:'#f1f0e9',roughness:.65});
  const vents=new THREE.MeshStandardMaterial({color:'#57616a',roughness:.7});
  const detectors=[
    {id:'ground',name:'First floor',floor:0,position:[0,2.80,.4]},
    {id:'session',name:'Session Hall',floor:1,position:[-1.7,5.61,.25]},
    {id:'meeting',name:'Private meeting room',floor:1,position:[8.2,5.52,-1.5]},
  ];
  let pending=null;
  const publish=message=>onStatus({message,testing:Boolean(pending),alarmed:detectors.some(d=>d.state==='alarm')});
  function setState(detector,state) {
    detector.state=state;
    detector.indicator.color.set(state==='alarm'?'#ff263e':state==='testing'?'#ffbd45':'#3ad6a0');
    detector.interaction.target=state==='alarm'?1:0;
  }
  for(const detector of detectors) {
    const group=new THREE.Group();group.name=`Smoke detector · ${detector.name}`;
    group.position.set(...detector.position);group.userData.interactive=true;group.userData.simulationOnly=true;
    (detector.floor===0?model.group:model.upperFloor).add(group);detector.group=group;
    cylinder(group,.19,.19,.035,shell,0,.025,0,32);
    cylinder(group,.165,.15,.07,shell,0,-.025,0,32);
    cylinder(group,.144,.144,.014,vents,0,-.065,0,32);
    cylinder(group,.14,.14,.013,shell,0,-.078,0,32);
    for(let i=0;i<16;i++) {
      const angle=i*Math.PI/8;
      const slot=box(group,.013,.026,.014,vents,Math.sin(angle)*.157,-.03,Math.cos(angle)*.157);
      slot.rotation.y=angle;
    }
    const indicator=new THREE.MeshBasicMaterial({color:'#3ad6a0',toneMapped:false});detector.indicator=indicator;
    cylinder(group,.012,.012,.006,indicator,-.067,-.088,-.038,12);
    const button=cylinder(group,.027,.027,.014,vents,.068,-.091,-.025,16);
    button.name=`${detector.name} smoke detector test button`;
    const text=label(group,'SMOKE / TEST',.16,.04,0,-.086,.055,{background:null,color:'#35495c',fontSize:100});
    text.rotation.x=Math.PI/2;
    const interaction={id:`smoke-${detector.id}`,label:`${detector.name} smoke detector`,kind:'button',floor:detector.floor,
      moving:group,hitMeshes:[],amount:0,target:0,apply(){},
      getPrompt:()=>detector.state==='alarm'?'Smoke alarm active · use emergency reset':detector.state==='testing'?'Smoke detector test in progress':`Test smoke detector · ${detector.name}`,
      onActivate:()=>test(detector.id),
    };
    detector.interaction=interaction;
    group.traverse(part=>{if(part.isMesh){part.userData.interactionId=interaction.id;interaction.hitMeshes.push(part);}});
    model.interactions.push(interaction);setState(detector,'ready');
  }
  function test(id) {
    const detector=detectors.find(d=>d.id===id);
    if(!detector)return 'Choose a smoke detector to test.';
    if(pending)return 'A smoke detector test is already in progress.';
    if(detectors.some(d=>d.state==='alarm'))return 'Reset the emergency alarm before starting another smoke test.';
    pending={detector,finishAt:performance.now()+1100};setState(detector,'testing');
    const message=`Testing ${detector.name} smoke detector…`;publish(message);return message;
  }
  function update(time) {
    if(!pending||time<pending.finishAt)return;
    const detector=pending.detector;pending=null;setState(detector,'alarm');onAlarm(detector);
    publish(`Simulated smoke detected · ${detector.name}. Siren and warning lights activated on both floors. Reset the emergency alarm to clear.`);
  }
  function reset() {
    pending=null;for(const detector of detectors)setState(detector,'ready');
    publish('All three smoke detectors are ready. Select a unit or press its test button in the model.');
  }
  reset();
  return {detectors,test,update,reset,get testing(){return Boolean(pending);},get alarmed(){return detectors.some(d=>d.state==='alarm');}};
}
