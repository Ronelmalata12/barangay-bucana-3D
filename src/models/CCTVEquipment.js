import * as THREE from 'three';
import { box, cylinder, beam, label } from './primitives.js';
import { CAPTAIN_MONITOR } from './HallLayout.js';

const shell = new THREE.MeshStandardMaterial({ color: '#e5ebef', roughness: 0.46, metalness: 0.17 });
const dark = new THREE.MeshStandardMaterial({ color: '#15212d', roughness: 0.4, metalness: 0.38 });
const bracket = new THREE.MeshStandardMaterial({ color: '#9aaeba', roughness: 0.34, metalness: 0.74 });
const lensGlass = new THREE.MeshStandardMaterial({ color: '#081929', roughness: 0.13, metalness: 0.62 });
const green = new THREE.MeshBasicMaterial({ color: '#4dff9b', toneMapped: false });
const infrared = new THREE.MeshBasicMaterial({ color: '#b83b4f', toneMapped: false });

function ownGeometry(mesh) {
  mesh.userData.cctvOwnedGeometry = true;
  mesh.geometry.userData.cctvOwned = true;
  return mesh;
}

/** A mounted bullet camera; the optical direction is local -Z. */
export function createSecurityCamera({ id, label: cameraLabel, position, target, mountPosition, ceilingY = position[1] + 0.43 }) {
  const group = new THREE.Group();
  group.name = `CCTV ${id} ${cameraLabel}`;
  group.userData.cctvCamera = id;
  group.position.fromArray(position);
  group.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(
    new THREE.Vector3(...position), new THREE.Vector3(...target), new THREE.Vector3(0, 1, 0),
  ));

  // Keep the housing, weather hood, and lens ring behind the capture viewpoint.
  box(group, 0.235, 0.19, 0.36, shell, 0, 0, 0.2);
  box(group, 0.255, 0.025, 0.41, shell, 0, 0.108, 0.175);
  box(group, 0.221, 0.175, 0.027, dark, 0, 0, 0.007);
  box(group, 0.196, 0.014, 0.24, bracket, 0, -0.102, 0.22);
  const ring = cylinder(group, 0.077, 0.077, 0.026, bracket, 0, 0.012, -0.011, 24);
  ring.rotation.x = Math.PI / 2;
  const lens = cylinder(group, 0.057, 0.057, 0.016, lensGlass, 0, 0.012, -0.029, 24);
  lens.rotation.x = Math.PI / 2;
  lens.name = `${group.name} optical lens`;
  for (let index = 0; index < 6; index++) {
    const angle = index * Math.PI / 3;
    const diode = ownGeometry(new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), infrared));
    diode.position.set(Math.cos(angle) * 0.067, 0.012 + Math.sin(angle) * 0.067, -0.027);
    group.add(diode);
  }
  const status = ownGeometry(new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), green));
  status.position.set(0.095, -0.054, -0.013);
  status.name = `${group.name} live status`;
  group.add(status);
  const channel = label(group, `CAM ${id}`, 0.105, 0.034, -0.023, -0.067, -0.009,
    { background: '#15212d', color: '#dcebf4', fontSize: 78 });
  ownGeometry(channel);
  channel.rotation.y = Math.PI;

  // Ceiling stems stay world-vertical; exterior brackets meet the actual facade.
  const inverse = group.quaternion.clone().invert();
  const bodyMount = new THREE.Vector3(0, 0.11, 0.27);
  const mountingOffset = bodyMount.clone().applyQuaternion(group.quaternion);
  mountingOffset.y = ceilingY - position[1];
  const mountLocal = mountPosition
    ? new THREE.Vector3(...mountPosition).sub(group.position).applyQuaternion(inverse)
    : mountingOffset.applyQuaternion(inverse);
  beam(group, bodyMount, mountLocal, 0.027, bracket, 10);
  const swivel = ownGeometry(new THREE.Mesh(new THREE.SphereGeometry(0.047, 12, 8), bracket));
  swivel.position.copy(bodyMount);
  group.add(swivel);
  const plate = cylinder(group, 0.095, 0.095, 0.024, shell, 0, 0, 0, 16);
  plate.position.copy(mountLocal);
  plate.quaternion.copy(inverse);
  if (mountPosition) plate.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));

  const camera = new THREE.PerspectiveCamera(88, 1.2, 0.04, 80);
  camera.name = `${group.name} live capture`;
  camera.position.set(0, 0, -0.055);
  group.add(camera);
  return { group, camera, lens };
}

/** A wall-mounted 16:9 display on the right-hand office wall. */
export function createSecurityMonitor({ texture, overlayTexture }) {
  const group = new THREE.Group();
  group.name = 'Captain office five-channel CCTV monitoring station';
  group.userData.cctvMonitor = true;
  group.position.set(CAPTAIN_MONITOR.x, CAPTAIN_MONITOR.y, CAPTAIN_MONITOR.z);
  group.rotation.y = CAPTAIN_MONITOR.rotationY;

  const casing = new THREE.MeshStandardMaterial({ color: '#101b27', roughness: 0.37, metalness: 0.33 });
  const trim = new THREE.MeshStandardMaterial({ color: '#334a5f', roughness: 0.3, metalness: 0.72 });
  box(group, 2.43, 1.43, 0.14, casing, 0, 0, -0.023);
  box(group, 2.325, 1.3275, 0.011, trim, 0, 0, 0.049);

  const mount = box(group, 0.72, 0.42, 0.025, bracket, 0, 0, -0.12);
  mount.name = 'CCTV television wall mounting plate';
  for (const x of [-0.24, 0.24]) box(group, 0.04, 0.30, 0.07, trim, x, 0, -0.09);

  const surfaces = new THREE.Group();
  surfaces.name = 'Live CCTV display surfaces';
  group.add(surfaces);
  const screen = ownGeometry(new THREE.Mesh(new THREE.PlaneGeometry(2.28, 1.2825),
    new THREE.MeshBasicMaterial({ map: texture, color: '#ffffff', toneMapped: true })));
  screen.name = 'Five live CCTV camera views';
  screen.position.z = 0.06;
  screen.userData.cctvScreen = true;
  surfaces.add(screen);
  if (overlayTexture) {
    const overlay = ownGeometry(new THREE.Mesh(new THREE.PlaneGeometry(2.28, 1.2825),
      new THREE.MeshBasicMaterial({ map: overlayTexture, transparent: true, depthWrite: false, toneMapped: false })));
    overlay.name = 'Live CCTV channel names and live indicators';
    overlay.position.z = 0.062;
    overlay.renderOrder = 1;
    surfaces.add(overlay);
  }
  ownGeometry(label(group, 'BUCANA CCTV', 0.52, 0.045, 0, -0.679, 0.061,
    { background: '#101b27', color: '#9db7c8', fontSize: 90 }));
  const power = ownGeometry(new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), green));
  power.position.set(1.098, -0.677, 0.063);
  group.add(power);
  return { group, screen, surfaces };
}
