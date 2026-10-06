import * as THREE from 'three';
import { box, cylinder, beam, label, materials as M } from './primitives.js';

const TAU = Math.PI * 2;
const groundLevel = 0.45;
const ringGeometries = new Map();

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...options });
}

function ring(parent, radius, tube, mat, x, y, z) {
  const key = `${radius}:${tube}`;
  if (!ringGeometries.has(key)) ringGeometries.set(key, new THREE.TorusGeometry(radius, tube, 8, 72));
  const mesh = new THREE.Mesh(ringGeometries.get(key), mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function instanceRepeatedMeshes(parent, animatedMesh) {
  parent.updateMatrixWorld(true);
  const batches = new Map();
  parent.traverse((mesh) => {
    if (!mesh.isMesh || mesh === animatedMesh || Array.isArray(mesh.material)) return;
    const key = `${mesh.geometry.uuid}:${mesh.material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(mesh);
  });
  for (const meshes of batches.values()) {
    if (meshes.length < 4) continue;
    const first = meshes[0];
    const batch = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
    batch.name = 'Repeated landscape details';
    batch.castShadow = first.castShadow;
    batch.receiveShadow = first.receiveShadow;
    meshes.forEach((mesh, index) => {
      batch.setMatrixAt(index, mesh.matrixWorld);
      mesh.removeFromParent();
    });
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingSphere();
    parent.add(batch);
  }
}

function fence(parent, start, end) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const length = Math.hypot(dx, dz);
  const group = new THREE.Group();
  group.position.set((start[0] + end[0]) / 2, 0, (start[1] + end[1]) / 2);
  group.rotation.y = -Math.atan2(dz, dx);
  parent.add(group);
  box(group, length, 0.9, 0.18, M.stucco, 0, groundLevel + 0.45, 0);
  box(group, length, 0.08, 0.24, M.green, 0, 1.37, 0);
  box(group, length, 0.06, 0.065, M.green, 0, 2.21, 0);
  box(group, length, 0.045, 0.065, M.green, 0, 1.51, 0);
  const count = Math.ceil(length / 0.38);
  for (let i = 0; i <= count; i++) {
    cylinder(group, 0.026, 0.026, 0.81, M.green, -length / 2 + (i / count) * length, 1.8, 0, 6);
  }
  const posts = Math.ceil(length / 2.5);
  for (let i = 0; i <= posts; i++) {
    const x = -length / 2 + (i / posts) * length;
    box(group, 0.14, 1.9, 0.14, M.green, x, 1.4, 0);
    box(group, 0.22, 0.06, 0.22, M.darkGreen, x, 2.36, 0);
  }
}

function bench(parent, x, z, angle = 0) {
  const group = new THREE.Group();
  group.position.set(x, groundLevel, z);
  group.rotation.y = angle;
  parent.add(group);
  for (const side of [-0.7, 0.7]) {
    box(group, 0.08, 0.5, 0.62, M.dark, side, 0.25, 0);
    beam(group, [side, 0.28, 0.23], [side, 1, 0.34], 0.038, M.dark);
  }
  for (let i = 0; i < 4; i++) {
    box(group, 1.9, 0.065, 0.12, M.wood, 0, 0.53, -0.22 + i * 0.15);
    const back = box(group, 1.9, 0.13, 0.06, M.wood, 0, 0.75 + i * 0.14, 0.33);
    back.rotation.x = -0.11;
  }
}

function palm(parent, x, z, height, phase = 0) {
  const group = new THREE.Group();
  group.position.set(x, groundLevel, z);
  parent.add(group);
  cylinder(group, 1.06, 1.12, 0.28, M.stucco, 0, 0.14, 0, 32);
  cylinder(group, 0.95, 0.95, 0.04, M.dark, 0, 0.285, 0, 32);
  cylinder(group, 0.94, 0.94, 0.035, material('#62815b'), 0, 0.31, 0, 32);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.3, 0),
    new THREE.Vector3(0.04, height * 0.35, 0.06),
    new THREE.Vector3(0.19, height * 0.75, 0.01),
    new THREE.Vector3(0.36, height, -0.1),
  ]);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.135, 8, false), M.trunk);
  trunk.castShadow = true;
  group.add(trunk);
  for (let i = 1; i < 15; i++) {
    const point = curve.getPoint(i / 15);
    ring(group, 0.139, 0.014, M.wood, point.x, point.y, point.z);
  }
  for (let f = 0; f < 11; f++) {
    const angle = phase + (f / 11) * TAU;
    const reach = 2.05 + (f % 3) * 0.19;
    const verts = [];
    const indices = [];
    const segments = 22;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const radial = reach * t;
      const rise = Math.sin(t * Math.PI) * 0.64 - t * t * 0.83;
      const width = Math.sin(t * Math.PI) * 0.31 * (i % 2 ? 0.68 : 1);
      const px = 0.36 + Math.cos(angle) * radial;
      const pz = -0.1 + Math.sin(angle) * radial;
      for (const side of [-1, 1]) {
        verts.push(px - Math.sin(angle) * width * side, height + rise, pz + Math.cos(angle) * width * side);
      }
      if (i < segments) {
        const k = i * 2;
        indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const leaf = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: f % 3 ? '#366746' : '#608954', side: THREE.DoubleSide, roughness: 0.88 }));
    leaf.castShadow = true;
    group.add(leaf);
  }
  for (let i = 0; i < 3; i++) {
    const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), M.wood);
    coconut.position.set(0.36 + Math.cos(i * 2.1) * 0.21, height - 0.22, -0.1 + Math.sin(i * 2.1) * 0.2);
    coconut.castShadow = true;
    group.add(coconut);
  }
}

function shrub(parent, x, z, radius = 0.5) {
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), M.leaf);
    mesh.position.set(x + Math.cos(i * 2.1) * radius * 0.45, 0.55 + radius * 0.45, z + Math.sin(i * 2.1) * radius * 0.4);
    mesh.scale.y = 0.83;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
}

function groundLabel(parent, text, width, height, x, z, color = '#f6f2df') {
  const mesh = label(parent, text, width, height, x, groundLevel + 0.075, z, { background: null, color, fontSize: 185 });
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function roadVehicle(parent, x, z, ambulance = false) {
  const group = new THREE.Group();
  group.position.set(x, groundLevel, z);
  parent.add(group);
  const paint = material(ambulance ? '#f4f3e9' : '#e9eeeb', { roughness: 0.35, metalness: 0.2 });
  const rubber = material('#202a2a', { roughness: 0.95 });
  const window = material('#305868', { roughness: 0.2, metalness: 0.35 });
  const red = material('#ba3f3b', { roughness: 0.5 });
  const blue = material('#368ba4', { emissive: '#256d9b', emissiveIntensity: 0.25 });
  const width = ambulance ? 2.0 : 1.78;
  const length = ambulance ? 4.55 : 4.12;
  box(group, width, 0.64, length, paint, 0, 0.65, 0);
  box(group, width + 0.035, 0.16, length + 0.08, M.dark, 0, 0.4, 0);
  if (ambulance) {
    box(group, width - 0.08, 1.25, 2.8, paint, 0, 1.49, 0.75);
    box(group, width - 0.2, 0.75, 1.4, paint, 0, 1.2, -1.3);
    box(group, width - 0.34, 0.59, 0.025, window, 0, 1.38, -2.014);
    for (const side of [-1, 1]) {
      box(group, 0.022, 0.54, 0.9, window, side * (width / 2 + 0.013), 1.43, -1.25);
      box(group, 0.032, 0.16, 3.9, red, side * (width / 2 + 0.013), 0.94, 0.15);
      const cross = new THREE.Group();
      cross.position.set(side * (width / 2 + 0.026), 1.54, 0.67);
      cross.rotation.y = side * Math.PI / 2;
      group.add(cross);
      box(cross, 0.57, 0.18, 0.018, red);
      box(cross, 0.18, 0.57, 0.02, red);
    }
    box(group, 1.3, 0.24, 0.42, red, 0, 2.2, -0.65);
    box(group, 0.1, 0.95, 0.03, M.metal, 0, 1.52, length / 2 + 0.018);
    const text = label(group, 'AMBULANCE', 1.75, 0.23, 0, 1.3, -2.293, { background: null, color: '#bd3f38', fontSize: 160 });
    text.rotation.y = Math.PI;
  } else {
    box(group, 1.55, 0.66, 2.25, paint, 0, 1.26, 0.12);
    box(group, 1.36, 0.49, 0.025, window, 0, 1.29, -1.015);
    box(group, 1.36, 0.47, 0.025, window, 0, 1.29, 1.26);
    for (const side of [-1, 1]) {
      box(group, 0.022, 0.47, 1.94, window, side * 0.79, 1.29, 0.12);
      box(group, 0.03, 0.08, 1.96, M.dark, side * 0.81, 1.07, 0.12);
      box(group, 0.03, 0.51, 0.06, M.dark, side * 0.81, 1.31, 0.16);
      box(group, 0.03, 0.2, 3.7, M.green, side * (width / 2 + 0.01), 0.78, 0);
      const text = label(group, 'BARANGAY PATROL', 1.8, 0.24, side * (width / 2 + 0.035), 0.87, 0, { background: null, color: '#174b36', fontSize: 145 });
      text.rotation.y = side * Math.PI / 2;
    }
    box(group, 1.17, 0.09, 0.34, M.dark, 0, 1.66, 0.1);
    box(group, 0.5, 0.2, 0.31, blue, -0.29, 1.77, 0.1);
    box(group, 0.5, 0.2, 0.31, red, 0.29, 1.77, 0.1);
  }
  for (const side of [-1, 1]) {
    for (const axle of [-length * 0.31, length * 0.31]) {
      const wheel = cylinder(group, 0.34, 0.34, 0.23, rubber, side * width / 2, 0.37, axle, 18);
      wheel.rotation.z = Math.PI / 2;
      const rim = cylinder(group, 0.18, 0.18, 0.24, M.metal, side * (width / 2 + 0.02), 0.37, axle, 14);
      rim.rotation.z = Math.PI / 2;
    }
    box(group, 0.38, 0.18, 0.045, M.white, side * width * 0.34, 0.78, -length / 2 - 0.025);
    box(group, 0.27, 0.18, 0.045, red, side * width * 0.35, 0.78, length / 2 + 0.025);
    box(group, 0.17, 0.13, 0.3, M.dark, side * (width / 2 + 0.15), 1.15, -1.2);
  }
  box(group, width * 0.48, 0.21, 0.045, M.dark, 0, 0.65, -length / 2 - 0.027);
  box(group, 0.48, 0.11, 0.046, M.white, 0, 0.47, -length / 2 - 0.052);
}

function motorbike(parent, x, z, color) {
  const group = new THREE.Group();
  group.position.set(x, groundLevel, z);
  group.rotation.y = -0.12;
  parent.add(group);
  const paint = material(color, { metalness: 0.25, roughness: 0.4 });
  for (const axle of [-0.7, 0.7]) {
    const wheel = cylinder(group, 0.28, 0.28, 0.16, M.dark, 0, 0.3, axle, 18);
    wheel.rotation.z = Math.PI / 2;
    const rim = cylinder(group, 0.17, 0.17, 0.175, M.metal, 0, 0.3, axle, 14);
    rim.rotation.z = Math.PI / 2;
  }
  box(group, 0.46, 0.23, 0.83, paint, 0, 0.63, 0);
  box(group, 0.42, 0.14, 0.81, M.dark, 0, 0.82, 0.13);
  box(group, 0.46, 0.48, 0.2, paint, 0, 0.75, -0.61);
  beam(group, [-0.11, 0.32, -0.7], [-0.11, 0.92, -0.55], 0.045, M.metal);
  beam(group, [0.11, 0.32, -0.7], [0.11, 0.92, -0.55], 0.045, M.metal);
  beam(group, [-0.35, 1.04, -0.56], [0.35, 1.04, -0.56], 0.033, M.dark);
  box(group, 0.27, 0.18, 0.035, M.white, 0, 0.93, -0.73);
  beam(group, [0.16, 0.62, 0.36], [0.3, 0.05, 0.43], 0.028, M.metal);
}

function createFlagTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0038a8';
  ctx.fillRect(0, 0, 1200, 300);
  ctx.fillStyle = '#ce1126';
  ctx.fillRect(0, 300, 1200, 300);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(520, 300);
  ctx.lineTo(0, 600);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fcd116';
  ctx.beginPath();
  ctx.arc(177, 300, 45, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    ctx.save();
    ctx.translate(177, 300);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(48, -10);
    ctx.lineTo(80, -6);
    ctx.lineTo(90, 0);
    ctx.lineTo(80, 6);
    ctx.lineTo(48, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  for (const [x, y, angle] of [[61, 80, -0.45], [61, 520, 0.45], [430, 300, Math.PI / 2]]) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? 27 : 11;
      const a = -Math.PI / 2 + angle + i * Math.PI / 5;
      const px = x + Math.cos(a) * radius;
      const py = y + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createLandscapeSite() {
  const group = new THREE.Group();
  group.name = 'Landscape and civic plaza';
  const lights = [];
  const warmPaving = material('#ddd7c6');
  const palePaving = material('#e8e3d5');
  const grass = material('#879f74');
  const drainMat = material('#475653');
  const stainless = material('#d7dfde', { metalness: 0.88, roughness: 0.26 });

  box(group, 64, 0.25, 78, grass, 0, -0.62, 0);
  box(group, 40, 0.65, 50, M.concrete, 0, 0.125, 0);
  box(group, 39.4, 0.025, 49.4, warmPaving, 0, groundLevel + 0.0125, 0);
  // Subtle slab joints make the compound's scale readable from every camera.
  for (let x = -16; x <= 16; x += 4) box(group, 0.018, 0.005, 49, palePaving, x, 0.48, 0);
  for (let z = -21; z <= 23; z += 4) box(group, 39, 0.005, 0.018, palePaving, 0, 0.48, z);

  for (const x of [-19.5, 19.5]) {
    box(group, 0.25, 0.18, 49.2, M.concrete, x, 0.54, 0);
    box(group, 0.13, 0.025, 48.8, drainMat, x + (x < 0 ? 0.25 : -0.25), 0.466, 0);
    for (let z = -24; z <= 24; z += 0.5) box(group, 0.15, 0.03, 0.045, M.metal, x + (x < 0 ? 0.25 : -0.25), 0.477, z);
  }
  box(group, 39.2, 0.18, 0.25, M.concrete, 0, 0.54, 24.5);
  for (const x of [-11.8, 11.8]) box(group, 15.4, 0.18, 0.25, M.concrete, x, 0.54, -24.5);
  fence(group, [-19.8, -24.8], [-4.45, -24.8]);
  fence(group, [4.45, -24.8], [19.8, -24.8]);
  fence(group, [-19.8, -24.8], [-19.8, 24.8]);
  fence(group, [19.8, -24.8], [19.8, 24.8]);
  fence(group, [-19.8, 24.8], [19.8, 24.8]);

  // A continuous entrance ramp rises from the outside apron to the +0.45 m slab.
  const ramp = new THREE.Mesh(new THREE.BufferGeometry(), M.concrete);
  const rampVertices = [-4, 0, -28, 4, 0, -28, -4, 0.45, -24.3, 4, 0.45, -24.3, -4, -0.15, -28, 4, -0.15, -28, -4, -0.15, -24.3, 4, -0.15, -24.3];
  ramp.geometry.setAttribute('position', new THREE.Float32BufferAttribute(rampVertices, 3));
  ramp.geometry.setIndex([0, 2, 1, 1, 2, 3, 0, 1, 4, 1, 5, 4, 0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5, 2, 6, 3, 3, 6, 7]);
  ramp.geometry.computeVertexNormals();
  ramp.castShadow = true;
  ramp.receiveShadow = true;
  group.add(ramp);
  for (let z = -27.5; z < -24.5; z += 0.35) {
    const y = ((z + 28) / 3.7) * 0.45 + 0.008;
    box(group, 7.7, 0.01, 0.025, palePaving, 0, y, z);
  }
  for (const x of [-4.3, 4.3]) {
    box(group, 0.72, 3.05, 0.72, M.stucco, x, 1.975, -24.75);
    box(group, 0.88, 0.18, 0.88, M.green, x, 3.48, -24.75);
    box(group, 0.85, 0.22, 0.85, M.concrete, x, 0.57, -24.75);
    box(group, 0.47, 1.6, 0.025, M.green, x, 1.85, -25.13);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 8), M.white);
    cap.position.set(x, 3.76, -24.75);
    group.add(cap);
    const light = new THREE.PointLight('#ffdba0', 0, 8, 2);
    light.position.set(x, 3.79, -24.7);
    light.userData.dayIntensity = 0;
    light.userData.nightIntensity = 7;
    group.add(light);
    lights.push(light);
  }
  box(group, 9.4, 0.76, 0.4, M.darkGreen, 0, 3.54, -24.75);
  const gateTitle = label(group, 'BARANGAY BUCANA, NASUGBU, BATANGAS', 8.9, 0.52, 0, 3.54, -24.961, { background: null, color: '#fff8d9', fontSize: 130 });
  gateTitle.rotation.y = Math.PI;
  label(group, 'WELCOME TO BARANGAY BUCANA', 8.4, 0.5, 0, 3.54, -24.535, { background: null, color: '#fff8d9', fontSize: 150 });
  for (const side of [-1, 1]) {
    const gate = new THREE.Group();
    gate.position.set(side * 3.95, 0, -24.6);
    gate.rotation.y = side * 1.4;
    group.add(gate);
    box(gate, 3.55, 0.075, 0.075, M.green, -side * 1.775, 2.15, 0);
    box(gate, 3.55, 0.075, 0.075, M.green, -side * 1.775, 0.72, 0);
    for (let i = 0; i <= 11; i++) box(gate, 0.055, 1.45, 0.055, M.green, -side * (i / 11) * 3.55, 1.435, 0);
  }

  // Entrance routes terminate at the two building approaches, keeping their footprints clear.
  box(group, 5.3, 0.035, 12.3, palePaving, 0, 0.478, -18.3);
  box(group, 19, 0.035, 2.3, palePaving, -1.7, 0.481, -11.1);
  box(group, 3, 0.035, 12, palePaving, -10, 0.482, -5.5);
  cylinder(group, 5.15, 5.15, 0.035, palePaving, -10, 0.479, -6.8, 80);
  ring(group, 4.75, 0.055, warmPaving, -10, 0.513, -6.8);
  cylinder(group, 1.7, 1.7, 0.14, M.concrete, -10, 0.52, -7, 48);
  cylinder(group, 1.35, 1.35, 0.17, M.stucco, -10, 0.675, -7, 48);
  cylinder(group, 0.95, 1.05, 0.38, M.concrete, -10, 0.94, -7, 48);
  ring(group, 1.035, 0.035, M.green, -10, 0.93, -7);
  cylinder(group, 0.058, 0.08, 9, stainless, -10, 5.6, -7, 16);
  cylinder(group, 0.13, 0.16, 0.25, stainless, -10, 1.215, -7, 16);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 10), stainless);
  finial.position.set(-10, 10.15, -7);
  group.add(finial);
  beam(group, [-9.94, 1.25, -7], [-9.94, 9.98, -7], 0.008, M.white, 5);
  const flagGeometry = new THREE.PlaneGeometry(2.15, 1.075, 32, 16);
  const flag = new THREE.Mesh(flagGeometry, new THREE.MeshStandardMaterial({ map: createFlagTexture(), side: THREE.DoubleSide, roughness: 0.78 }));
  flag.position.set(-8.925, 9.35, -7.015);
  flag.castShadow = true;
  flag.name = 'Waving Philippine flag';
  group.add(flag);
  const restPositions = flagGeometry.attributes.position.array.slice();

  // Three clearly designated parking bays, populated with municipal vehicles.
  box(group, 15, 0.036, 7, M.asphalt, -10.5, 0.489, -18.5);
  for (const x of [-18, -13.5, -9, -3]) box(group, 0.08, 0.008, 6.5, M.white, x, 0.515, -18.5);
  for (const z of [-21.75, -15.25]) box(group, 15, 0.008, 0.08, M.white, -10.5, 0.515, z);
  groundLabel(group, 'PATROL', 3.2, 0.38, -15.75, -15.66);
  groundLabel(group, 'AMBULANCE', 3.8, 0.38, -11.25, -15.66);
  groundLabel(group, 'MOTORBIKES', 4.8, 0.38, -6, -15.66);
  for (const x of [-7.5, -6, -4.5]) box(group, 0.055, 0.008, 4.6, M.white, x, 0.515, -19.0);
  roadVehicle(group, -15.75, -18.65);
  roadVehicle(group, -11.25, -18.7, true);
  motorbike(group, -8.2, -18.1, '#4e7965');
  motorbike(group, -6.7, -18.7, '#bc6650');
  motorbike(group, -5.2, -18.3, '#5c7890');
  for (const x of [-17.5, -13.0, -8.6, -3.5]) box(group, 0.52, 0.09, 0.24, M.concrete, x, 0.55, -21.35);

  // Tropical garden courts and seating occupy the perimeter and the administration garden.
  box(group, 12, 0.08, 8, M.concrete, -10.5, 0.5, 18.7);
  box(group, 11.65, 0.07, 7.65, grass, -10.5, 0.535, 18.7);
  box(group, 1.5, 0.06, 7.7, palePaving, -10.5, 0.58, 18.7);
  box(group, 11.7, 0.06, 1.4, palePaving, -10.5, 0.583, 18.7);
  palm(group, -18, 12, 5.4, 0.2);
  palm(group, -17.8, 21.2, 6.1, 0.65);
  palm(group, -7.0, 21.7, 5.3, 0.35);
  palm(group, 18, 21.9, 6.4, 0.7);
  palm(group, 18.1, -17.7, 5.6, 0.12);
  palm(group, 18.1, -4.6, 5.9, 0.47);
  palm(group, -18.05, -7, 5.1, 0.3);
  bench(group, -16.4, -1.3, Math.PI / 2);
  bench(group, -5.5, -5.2, -Math.PI / 2);
  bench(group, -13.1, 16.2, 0);
  bench(group, -7.8, 16.2, 0);
  bench(group, -13.1, 21.2, Math.PI);
  bench(group, -7.8, 21.2, Math.PI);
  for (const [x, z] of [[-18.0, 2], [-18.0, 5], [-18.0, 8], [-15.3, 22.2], [-12.8, 22.2], [-5.6, 19.8], [18.15, 3], [18.15, 7], [18.15, 11], [18.15, 15], [12, -22.1], [15, -22.1]]) {
    box(group, 1.4, 0.25, 1.1, M.concrete, x, 0.575, z);
    shrub(group, x, z, 0.55);
  }
  for (const x of [-17.3, -2.7, 17.3]) {
    cylinder(group, 0.24, 0.27, 0.68, M.green, x, 0.79, -12.6, 16);
    cylinder(group, 0.28, 0.28, 0.075, M.darkGreen, x, 1.16, -12.6, 16);
    box(group, 0.22, 0.09, 0.06, M.dark, x, 1.19, -12.86);
  }
  for (const [x, z] of [[-2.9, -21], [-2.9, -15], [-5.0, -11.7], [-14.0, -11.7], [-14.1, -2.3], [-4.9, -2.3], [-17.7, 16], [-3.1, 17], [17.7, 8], [17.7, 17]]) {
    cylinder(group, 0.075, 0.09, 0.93, M.darkGreen, x, 0.915, z, 10);
    const glowMat = material('#fff5d3', { emissive: '#ffd293', emissiveIntensity: 0.6 });
    cylinder(group, 0.12, 0.12, 0.2, glowMat, x, 1.38, z, 12);
    cylinder(group, 0.15, 0.15, 0.07, M.darkGreen, x, 1.515, z, 12);
    const light = new THREE.PointLight('#ffdc9f', 0, 6, 2);
    light.position.set(x, 1.42, z);
    light.userData.dayIntensity = 0;
    light.userData.nightIntensity = 3.1;
    group.add(light);
    lights.push(light);
  }

  function animate(time) {
    const positions = flagGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = restPositions[i * 3];
      const y = restPositions[i * 3 + 1];
      const t = (x + 1.075) / 2.15;
      positions.setXYZ(i, x, y + Math.sin(time * 2.9 - t * 6.5) * 0.025 * t, Math.sin(time * 3.4 - t * 7.5 + y * 2) * 0.14 * t + Math.sin(time * 1.7 - t * 3) * 0.04 * t);
    }
    positions.needsUpdate = true;
    flagGeometry.computeVertexNormals();
  }

  instanceRepeatedMeshes(group, flag);
  return { group, flag, animate, lights };
}
