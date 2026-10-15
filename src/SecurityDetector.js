import * as THREE from 'three';
import { box, label } from './models/primitives.js';

const ITEMS = Object.freeze({none:'No weapon', gun:'Gun', knife:'Knife'});
const PORTAL = Object.freeze({x:-0.1, z:-2.65, halfOpening:0.61});

/** Demonstration only: checks a visitor-selected virtual item, never real objects. */
export function createSecurityDetector({model, reducedMotion = false, onResult = () => {}, onThreat = () => {}}) {
  const group = new THREE.Group();
  group.name = 'Main entrance simulated security detector';
  group.userData.simulationOnly = true;
  group.position.set(PORTAL.x, model.walkData.floors[0], PORTAL.z);
  model.group.add(group);
  const shell = new THREE.MeshStandardMaterial({color:'#e0e7ed', roughness:0.45, metalness:0.35});
  const dark = new THREE.MeshStandardMaterial({color:'#152c42', roughness:0.55, metalness:0.35});
  const indicator = new THREE.MeshBasicMaterial({color:'#49baff', toneMapped:false});
  for (const side of [-1, 1]) {
    const x = side * 0.72;
    box(group, 0.22, 2.18, 0.58, shell, x, 1.09);
    box(group, 0.30, 0.055, 0.64, dark, x, 0.0275);
    box(group, 0.15, 1.86, 0.018, dark, x, 1.1, -0.30);
    for (let i = 0; i < 8; i++) box(group, 0.065, 0.065, 0.02, indicator, x, 0.42 + i * 0.2, -0.315);
    model.walkData.obstacles.push({floor:0, minX:PORTAL.x+x-0.15, maxX:PORTAL.x+x+0.15, minZ:PORTAL.z-0.32, maxZ:PORTAL.z+0.32});
  }
  box(group, 1.88, 0.28, 0.60, dark, 0, 2.29);
  box(group, 1.55, 0.025, 0.61, indicator, 0, 2.443);
  box(group, 1.22, 0.022, 0.60, dark, 0, 0.011);
  label(group, 'SECURITY CHECK · SIMULATION', 1.42, 0.085, 0, 2.38, -0.309,
    {background:'#152c42', color:'#e8f2fb', fontSize:130}).rotation.y = Math.PI;

  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const display = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.115), new THREE.MeshBasicMaterial({map:texture, toneMapped:false}));
  display.position.set(0, 2.25, -0.309);
  display.rotation.y = Math.PI;
  display.name = 'Security detector status display';
  group.add(display);
  const sweep = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.045), new THREE.MeshBasicMaterial({color:'#49baff', transparent:true, opacity:0.45, side:THREE.DoubleSide, depthWrite:false, toneMapped:false}));
  sweep.name = 'Simulated scan indicator';
  group.add(sweep);
  // Start before the arch, with enough room to walk through its clear opening.
  model.walkData.entrance = {x:PORTAL.x, z:-3.63, yaw:Math.PI, pitch:0.10};
  let carriedItem = 'none';
  let state = 'ready';
  let pending = null;
  let lastScan = null;
  let scanCount = 0;
  let resultUntil = 0;
  let previous = null;

  function publish() {
    const color = state === 'alert' ? '#ff3048' : state === 'clear' ? '#53e0a4' : '#49baff';
    indicator.color.set(color);
    const text = state === 'scanning' ? 'SCANNING…' : state === 'clear' ? 'CLEAR · NO WEAPON'
      : state === 'alert' ? `${ITEMS[lastScan.item].toUpperCase()} DETECTED · DEMO` : 'READY FOR SCREENING';
    context.fillStyle = '#102234';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = color;
    context.font = 'bold 42px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    texture.needsUpdate = true;
    const message = state === 'alert' ? `Demo: ${ITEMS[lastScan.item].toLowerCase()} detected. Warning lights active on both floors. Reset before screening again.`
      : state === 'clear' ? 'Clear scan: no virtual weapon detected.'
      : state === 'scanning' ? 'Screening the selected virtual item…'
      : `${ITEMS[carriedItem]} selected. Walk forward through the arch to scan.`;
    onResult({state, carriedItem, lastScan, scanCount, message});
  }

  function resetTracking() { previous = null; }
  function reset() {
    state = 'ready';
    pending = null;
    lastScan = null;
    resultUntil = 0;
    sweep.visible = false;
    resetTracking();
    publish();
  }
  function setCarriedItem(item) {
    if (!Object.hasOwn(ITEMS, item)) return;
    carriedItem = item;
    publish();
  }
  function update(time, walker, viewer) {
    if (pending && time >= pending.finishAt) {
      lastScan = {item:pending.item, at:Date.now(), number:++scanCount};
      pending = null;
      state = lastScan.item === 'none' ? 'clear' : 'alert';
      resultUntil = time + 4000;
      publish();
      if (state === 'alert') onThreat(lastScan.item);
    }
    if (state === 'clear' && time >= resultUntil) { state = 'ready'; publish(); }
    sweep.visible = state === 'scanning';
    sweep.position.y = reducedMotion ? 1.1 : 0.35 + (time % 650) / 650 * 1.65;
    if (!walker.active || walker.floor !== 0) { resetTracking(); return; }
    const position = viewer.position;
    // Inward crossing only. Teleports and room shortcuts do not count as scans.
    if (previous && previous.distanceToSquared(position) < 1 && !pending && state !== 'alert'
      && previous.z < PORTAL.z && position.z >= PORTAL.z) {
      const progress = (PORTAL.z - previous.z) / (position.z - previous.z);
      const crossingX = THREE.MathUtils.lerp(previous.x, position.x, progress);
      if (Math.abs(crossingX - PORTAL.x) <= PORTAL.halfOpening - 0.2) {
        pending = {item:carriedItem, finishAt:time + 650};
        state = 'scanning';
        publish();
      }
    }
    previous ??= new THREE.Vector3();
    previous.copy(position);
  }
  reset();
  return {group, portal:PORTAL, update, setCarriedItem, reset, resetTracking,
    get state() { return state; }, get carriedItem() { return carriedItem; },
    get lastScan() { return lastScan; }, get scanCount() { return scanCount; }};
}
