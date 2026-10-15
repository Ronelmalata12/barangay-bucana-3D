import * as THREE from 'three';
import {box, cylinder, label, materials} from './primitives.js';

// Fictional examples only; no real resident, case or financial data is bundled.
export const SAMPLE_RECORDS = Object.freeze({
  residents:{title:'Resident registry', reference:'DEMO-REG-001', entries:[['Resident','Sample Resident A'],['Household','DEMO-HH-001'],['Zone','Sample Purok 1'],['Purpose','Example household and residency record'],['Custodian','Barangay Secretary']]},
  clearances:{title:'Clearance applications', reference:'DEMO-CLR-001', entries:[['Applicant','Sample Applicant B'],['Document','Barangay clearance application'],['Purpose','Sample employment requirement'],['Status','For review — example only'],['Custodian','Public Assistance Desk']]},
  blotter:{title:'Tanod incident log', reference:'DEMO-LOG-001', entries:[['Entry','Training exercise'],['Incident','Sample lost-property report'],['Action','Record received; referred to the duty officer'],['Status','Fictional example; no active case'],['Custodian','Tanod Records Officer']]},
  mediation:{title:'Lupon mediation files', reference:'DEMO-LUP-001', entries:[['Case','Fictional neighborhood concern'],['Parties','Sample Party A / Sample Party B'],['Proceeding','Example mediation scheduling record'],['Status','Sample file for demonstration'],['Custodian','Lupon Secretary']]},
  resolutions:{title:'Barangay resolutions', reference:'DEMO-RES-001', entries:[['Subject','Sample community clean-up activity'],['Record','Example resolution and session minutes'],['Status','Demonstration draft'],['Attachments','Sample attendance sheet and agenda'],['Custodian','Barangay Secretary']]},
  budget:{title:'Budget and disbursement files', reference:'DEMO-BUD-001', entries:[['Program','Sample maintenance activity'],['Amount','PHP 1,000.00 — fictional illustration'],['Documents','Example voucher and supporting receipt'],['Status','Demonstration only; not an actual expense'],['Custodian','Barangay Treasurer']]},
  plans:{title:'Emergency response plans', reference:'DEMO-DRR-001', entries:[['Route','Use the stairs from the second floor, then the rear fire exit'],['Exit','Green push-bar door on the first-floor rear wall'],['Alert','Red emergency button activates both floors’ warning lights'],['Reminder','Keep the central aisle and exit landing clear'],['Record type','Model walkthrough example']]},
  inventory:{title:'Property inventory', reference:'DEMO-INV-001', entries:[['Assets','Sample computer, radio and office supplies'],['Register','Example asset and equipment log'],['Inspection','Training entry; not an official audit'],['Status','Fictional sample inventory'],['Custodian','Designated Property Custodian']]},
});

/** One visitor-operated demo key controls every drawer/panel of this cabinet. */
export function secureCabinet(parent, interactions, {id, floor, position, panels}) {
  const mount = new THREE.Group();
  mount.position.set(...position);
  mount.name = `${id} gold demo key lock`;
  mount.userData.interactive = true;
  parent.add(mount);
  const brass = new THREE.MeshStandardMaterial({color:'#d5ae51', roughness:0.35, metalness:0.6});
  box(mount, 0.22, 0.12, 0.025, materials.dark);
  const key = new THREE.Group();
  mount.add(key);
  const core = cylinder(key, 0.045, 0.045, 0.025, brass, 0, 0, -0.026, 24);
  core.rotation.x = Math.PI / 2;
  box(key, 0.009, 0.045, 0.012, materials.dark, 0, 0, -0.044);
  const lockedText = label(mount, 'LOCKED · DEMO KEY', 0.48, 0.085, 0, 0.125, -0.03, {background:'#7b2732',fontSize:95});
  const unlockedText = label(mount, 'UNLOCKED · DEMO KEY', 0.48, 0.085, 0, 0.125, -0.03, {background:'#1c654b',fontSize:95});
  lockedText.rotation.y = unlockedText.rotation.y = Math.PI;
  let locked = true;
  const lock = {
    id:`${id}-lock`, label:'Records cabinet demo key', kind:'lock', floor, moving:key,
    amount:0, target:0, hitMeshes:[],
    actionLabels:['Unlock records cabinet with demo key','Lock records cabinet'],
    actionMessages:['Records cabinet locked.','Records cabinet unlocked. Open a drawer or panel to view sample files.'],
    beforeToggle() {
      return !locked && panels.some(panel => panel.target || panel.amount > 0.01)
        ? 'Close every cabinet drawer and panel before locking.' : null;
    },
    onToggle(unlocked) { locked = !unlocked; lockedText.visible = locked; unlockedText.visible = !locked; },
    apply(amount) { key.rotation.z = amount * Math.PI / 2; },
    get locked() { return locked; },
  };
  unlockedText.visible = false;
  mount.traverse(part => {
    part.userData.interactivePart = true;
    part.userData.interactionId = lock.id;
    if(part.isMesh) lock.hitMeshes.push(part);
  });
  for(const panel of panels) {
    panel.beforeToggle = () => locked ? 'This cabinet is locked. Use its gold demo key lock first.' : null;
    panel.getPrompt = () => locked ? 'Locked cabinet · use the gold demo key'
      : `${panel.target ? 'Close' : 'Open'} ${panel.label}`;
  }
  interactions.push(lock);
  return lock;
}

/** A readable file remains physically behind its locked drawer or door. */
export function addSampleFile(parent, interactions, {id, floor, position, width, height, rotationX = 0, panel, lock, record, extraHitMeshes = []}) {
  const mesh = label(parent, `${record.title}\nSAMPLE · READ FILE`, width, height, ...position,
    {background:'#f4ead3',color:'#183e63',fontSize:58});
  mesh.rotation.x = rotationX;
  if(!rotationX) mesh.rotation.y = Math.PI;
  mesh.name = `${record.title} sample file`;
  mesh.userData.interactivePart = true;
  mesh.userData.interactionId = id;
  interactions.push({id, label:`sample ${record.title.toLowerCase()}`, kind:'record', floor,
    moving:mesh, hitMeshes:[mesh,...extraHitMeshes], amount:0, target:0, apply() {}, record,
    getPrompt:() => lock.locked ? 'Locked sample file · use the gold demo key'
      : panel.amount < 0.85 ? 'Open this compartment before reading its sample file' : `Read sample ${record.title.toLowerCase()}`,
    actionLabels:[`Read sample ${record.title.toLowerCase()}`],
    beforeToggle:() => lock.locked || panel.amount < 0.85 ? 'Unlock and fully open this cabinet compartment first.' : null,
  });
}
