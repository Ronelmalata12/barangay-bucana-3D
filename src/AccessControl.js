import * as THREE from 'three';
import {box, label} from './models/primitives.js';
import {CAPTAIN_PARTITION} from './models/HallLayout.js';

export const RFID_CARDS = Object.freeze({
  visitor:{name:'Visitor', rooms:[]},
  staff:{name:'Barangay staff', rooms:['session']},
  captain:{name:'Barangay Captain', rooms:['session','annex']},
  expired:{name:'Expired staff card', rooms:[]},
});
const UNLOCK_MS = 8000;

/** Virtual RFID access within the model; no hardware or real authentication. */
export function createAccessControl({model, camera, getWalker, onStatus = () => {}}) {
  let card = 'visitor';
  let lastBlockedAt = -Infinity;
  const areas = [
    {id:'session', name:'Session Hall', doorId:'captain-office-door',
      position:[1.28,4.39,0.82], rotation:Math.PI/2,
      entry:{id:'rfid-session-entry',name:'Session Hall RFID reader',floor:1,position:[2.15,4.63,0.82],yaw:Math.PI/2,pitch:-0.24},
      contains:p => p.x < CAPTAIN_PARTITION.x && p.x >= -6.1 && p.z >= -4.1 && p.z <= 4.1},
    {id:'annex', name:'Left Upper Wing', doorId:'annex-door',
      // Keep the reader between the clock and entrance, facing into the office.
      position:[5.12,4.39,-3.855], rotation:0,
      entry:{id:'rfid-annex-entry',name:'Upper Wing RFID reader',floor:1,position:[5.12,4.63,-2.95],yaw:0,pitch:-0.24},
      contains:p => p.x > 6 && p.x <= 11.5 && p.z >= -3.8 && p.z <= 3.8},
  ];
  const permitted = area => RFID_CARDS[card].rooms.includes(area.id);
  const walkerInside = area => getWalker()?.active && getWalker().floor === 1 && area.contains(camera.position);
  const inDoorway = area => {
    const b=area.door.obstacle, p=camera.position, w=getWalker();
    return w?.active && w.floor===1 && p.x>b.minX-.25 && p.x<b.maxX+.25 && p.z>b.minZ-.25 && p.z<b.maxZ+.25;
  };
  const hasGrant = (area,time=performance.now()) => permitted(area) && area.grantCard===card && area.until>time;
  const report = (message,state='ready') => onStatus({message,state,card});

  function readerBody(area) {
    const group=new THREE.Group();
    group.name=`${area.name} simulated RFID card reader`;
    group.userData.interactive=true;
    group.position.set(...area.position);
    group.rotation.y=area.rotation;
    model.upperFloor.add(group);
    const dark=new THREE.MeshStandardMaterial({color:'#172d43',roughness:.48,metalness:.3});
    box(group,.22,.34,.065,dark);
    const ledMaterial=new THREE.MeshBasicMaterial({color:'#69baff',toneMapped:false});
    box(group,.15,.014,.012,ledMaterial,0,.133,.039);
    const canvas=document.createElement('canvas');canvas.width=384;canvas.height=256;
    const ctx=canvas.getContext('2d'), texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    const face=new THREE.Mesh(new THREE.PlaneGeometry(.18,.16),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
    face.position.set(0,.013,.034);group.add(face);
    label(group,'TAP RFID CARD',.18,.035,0,-.112,.034,{background:'#172d43',fontSize:130});
    label(group,`RESTRICTED · ${area.name.toUpperCase()}`,.55,.095,0,.255,.035,{background:'#173f62',fontSize:100});
    area.setState = state => {
      if(area.state===state) return;
      area.state=state;
      const color=state==='granted'?'#51e3a3':state==='denied'?'#ff5162':'#69baff';
      ledMaterial.color.set(color);
      ctx.fillStyle='#0b1d2e';ctx.fillRect(0,0,384,256);
      ctx.strokeStyle=color;ctx.lineWidth=6;
      for(const r of [20,39,58]) {
        ctx.beginPath();ctx.arc(185,85,r,-.8,.8);ctx.stroke();
      }
      ctx.fillStyle=color;ctx.font='bold 32px Arial';ctx.textAlign='center';
      ctx.fillText(state==='granted'?'ACCESS GRANTED':state==='denied'?'ACCESS DENIED':state==='exit'?'FREE EXIT':'SCAN CARD',192,193);
      ctx.fillStyle='#adc6db';ctx.font='19px Arial';ctx.fillText('RFID SIMULATION',192,232);
      texture.needsUpdate=true;
    };
    const reader={id:`rfid-${area.id}-reader`,label:`${area.name} RFID reader`,kind:'reader',floor:1,
      moving:group,hitMeshes:[],amount:0,target:0,apply() {},
      getPrompt:()=>`Scan ${RFID_CARDS[card].name.toLowerCase()} card · ${area.name}`,
      onActivate:()=>scan(area),
    };
    group.traverse(part=>{
      part.userData.interactivePart=true;part.userData.interactionId=reader.id;
      if(part.isMesh) reader.hitMeshes.push(part);
    });
    model.interactions.push(reader);
    area.reader=reader;area.group=group;area.setState('ready');
  }

  function scan(area) {
    const now=performance.now();
    if(!permitted(area)) {
      area.deniedUntil=now+3000;
      area.setState('denied');
      const message=card==='expired'?'Access denied: this demo card has expired.'
        :`Access denied: ${RFID_CARDS[card].name} is not authorized for ${area.name}.`;
      report(message,'denied');return message;
    }
    area.grantCard=card;area.until=now+UNLOCK_MS;area.deniedUntil=0;
    area.door.target=1;area.setState('granted');
    const message=`Access granted: ${area.name} unlocked for 8 seconds. Walk through the door.`;
    report(message,'granted');return message;
  }

  for(const area of areas) {
    area.door=model.interactions.find(item=>item.id===area.doorId);
    if(!area.door) throw new Error(`Missing RFID doorway: ${area.doorId}`);
    area.until=0;area.deniedUntil=0;area.exitUntil=0;area.grantCard=null;
    const previousCheck=area.door.beforeToggle, previousToggle=area.door.onToggle;
    area.door.beforeToggle=()=>{
      const blocked=previousCheck?.();if(blocked) return blocked;
      if(area.door.target===1 || walkerInside(area) || hasGrant(area)) return null;
      const message=`${area.name} is locked. Present an authorized card to its RFID reader.`;
      area.deniedUntil=performance.now()+3000;area.setState('denied');report(message,'denied');return message;
    };
    area.door.onToggle=open=>{
      previousToggle?.(open);
      if(open && !hasGrant(area)) {area.exitUntil=performance.now()+UNLOCK_MS;area.setState('exit');}
      if(!open) {area.until=0;area.exitUntil=0;area.grantCard=null;area.setState('ready');}
    };
    area.door.getPrompt=()=>area.door.target?'Close restricted door'
      :walkerInside(area)?'Open door to exit · no card needed'
      :hasGrant(area)?`Open ${area.name}`:'RFID locked · scan the wall reader';
    model.rooms.push(area.entry);
    readerBody(area);
  }

  function setCard(value) {
    if(!Object.hasOwn(RFID_CARDS,value)) return;
    card=value;
    for(const area of areas) {
      area.until=0;area.exitUntil=0;area.grantCard=null;area.deniedUntil=0;
      if(!inDoorway(area)) area.door.target=0;
      area.setState('ready');
    }
    report(`${RFID_CARDS[card].name} card selected. Visit a reader and tap it to request entry.`);
  }

  function resolveRoom(id) {
    const area=areas.find(candidate=>candidate.id===id);
    if(!area || walkerInside(area) || hasGrant(area)) return id;
    report(`RFID required for ${area.name}. You are at its reader; scan an authorized card.`,'denied');
    return area.entry.id;
  }

  function canMoveTo(from,to,floor) {
    if(floor!==1) return true;
    const area=areas.find(candidate=>!candidate.contains(from) && candidate.contains(to));
    if(!area || hasGrant(area)) return true;
    const now=performance.now();
    if(now-lastBlockedAt>1800) {
      lastBlockedAt=now;
      report(`Entry blocked: scan an authorized RFID card for ${area.name}.`,'denied');
    }
    return false;
  }

  function update(time) {
    for(const area of areas) {
      // Finish an already authorized crossing before relocking around the visitor.
      if(area.until && area.until<=time && inDoorway(area) && permitted(area) && area.grantCard===card) area.until=time+250;
      if(area.until && area.until<=time) {
        area.until=0;area.grantCard=null;
        report(`${area.name} access window ended. The door will relock when the doorway is clear.`);
      }
      const unlocked=hasGrant(area,time) || area.exitUntil>time;
      if(!unlocked && area.door.target===1 && !inDoorway(area)) area.door.target=0;
      area.setState(area.deniedUntil>time?'denied':hasGrant(area,time)?'granted':area.exitUntil>time?'exit':'ready');
    }
  }
  const api={areas,setCard,resolveRoom,canMoveTo,update,get card(){return card;}};
  model.accessControl=api;
  setCard('visitor');
  return api;
}
