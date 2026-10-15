import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, cylinder, beam, label, materials } from './primitives.js';
import { createDrawer, createCabinetDoor, createCaptainOfficeDoor } from './InteractiveFurniture.js';
import { HALL_STAIRS, CAPTAIN_WORKSPACE } from './HallLayout.js';

// Merge static furniture by material once; retain glazed partitions and text as separate meshes.
// This keeps a richly furnished hall inexpensive to draw without changing its cutaway groups.
function consolidateFurniture(parent) {
  parent.updateMatrixWorld(true);
  const inverse = parent.matrixWorld.clone().invert();
  const batches = new Map();
  parent.traverse(mesh => {
    if (!mesh.isMesh || Array.isArray(mesh.material) || mesh.material.transparent || mesh.material.map || mesh.userData.nightGlow || mesh.userData.preserveIndividual || mesh.userData.interactivePart) return;
    const key = mesh.material.uuid;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(mesh);
  });
  for (const meshes of batches.values()) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map(mesh => mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld)));
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach(item => item.dispose());
    if (!geometry) continue;
    geometry.computeBoundingSphere();
    const merged = new THREE.Mesh(geometry, meshes[0].material);
    merged.name = 'Batched interior furniture';
    merged.castShadow = true;
    merged.receiveShadow = true;
    for (const mesh of meshes) mesh.removeFromParent();
    parent.add(merged);
  }
}

// All measurements are metres. The hall's entrance faces local -Z.
export function createInteriorDetails() {
  const group = new THREE.Group();
  group.name = 'Administration hall interiors';
  const groundFloor = new THREE.Group();
  const upperFloor = new THREE.Group();
  groundFloor.name = 'Public services and mediation';
  upperFloor.name = 'Session hall and captain office';
  group.add(groundFloor, upperFloor);
  const lights = [];
  const interactions = [];
  const cream = new THREE.MeshStandardMaterial({ color: '#e6edf5', roughness: 0.86 });
  const upholstery = new THREE.MeshStandardMaterial({ color: '#315b88', roughness: 0.86 });
  const leather = new THREE.MeshStandardMaterial({ color: '#433932', roughness: 0.75 });
  const paper = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.95 });
  const acrylic = new THREE.MeshPhysicalMaterial({ color: '#d8efea', transparent: true, opacity: 0.2, roughness: 0.08, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  const brass = new THREE.MeshStandardMaterial({ color: '#b99b59', roughness: 0.33, metalness: 0.65 });
  const redBook = new THREE.MeshStandardMaterial({ color: '#93423e', roughness: 0.9 });
  const blueBook = new THREE.MeshStandardMaterial({ color: '#31566c', roughness: 0.9 });
  const floorY = 0.16;
  const upperY = 3.03;

  function chair(parent, x, z, rotation = 0, y = floorY, executive = false) {
    const assembly = new THREE.Group();
    assembly.position.set(x, y, z);
    assembly.rotation.y = rotation;
    parent.add(assembly);
    const mat = executive ? leather : upholstery;
    box(assembly, 0.48, 0.105, 0.48, mat, 0, 0.46, 0);
    box(assembly, 0.48, executive ? 0.68 : 0.46, 0.085, mat, 0, executive ? 0.85 : 0.74, 0.205);
    if (executive) {
      cylinder(assembly, 0.045, 0.045, 0.4, materials.metal, 0, 0.23, 0, 8);
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        const px = Math.cos(a) * 0.28, pz = Math.sin(a) * 0.28;
        beam(assembly, new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(px, 0.075, pz), 0.025, materials.metal);
        const wheel = cylinder(assembly, 0.045, 0.045, 0.04, materials.dark, px, 0.055, pz, 8);
        wheel.rotation.z = Math.PI / 2;
      }
      for (const side of [-1, 1]) {
        box(assembly, 0.07, 0.07, 0.34, mat, side * 0.285, 0.67, 0.035);
        box(assembly, 0.035, 0.2, 0.035, materials.metal, side * 0.285, 0.56, 0.1);
      }
    } else {
      for (const dx of [-0.19, 0.19]) for (const dz of [-0.18, 0.18])
        cylinder(assembly, 0.022, 0.022, 0.43, materials.metal, dx, 0.215, dz, 6);
    }
    return assembly;
  }

  function desk(parent, x, z, width, depth, y = floorY) {
    const assembly = new THREE.Group();
    assembly.position.set(x, y, z);
    parent.add(assembly);
    box(assembly, width, 0.095, depth, materials.wood, 0, 0.76, 0);
    box(assembly, width - 0.14, 0.48, 0.075, materials.wood, 0, 0.44, depth * 0.34);
    for (const dx of [-width / 2 + 0.09, width / 2 - 0.09]) {
      box(assembly, 0.085, 0.73, depth - 0.15, materials.wood, dx, 0.365, 0);
    }
    return assembly;
  }

  function deskDrawers(assembly, prefix, floor, width, depth) {
    const drawerWidth = 0.52;
    const x = -width / 2 + 0.38;
    const frontZ = -depth / 2 + 0.025;
    // A slim pedestal supports three independent drawers under the desktop.
    for (const side of [-1, 1])
      box(assembly, 0.025, 0.57, depth - 0.075, materials.wood,
        x + side * (drawerWidth / 2 + 0.01), 0.385, 0.012);
    box(assembly, drawerWidth + 0.04, 0.035, depth - 0.075, materials.wood, x, 0.113, 0.012);
    for (let row = 0; row < 3; row++) {
      createDrawer(assembly, interactions, {
        id: `${prefix}-drawer-${row + 1}`, label: `${prefix === 'captain' ? 'Captain desk' : 'Tanod desk'} drawer ${row + 1}`,
        floor, position: [x, 0.22 + row * 0.177, frontZ], width: drawerWidth, height: 0.155,
        depth: Math.min(0.45, depth - 0.17), travel: 0.34,
      });
    }
  }

  function book(parent, x, y, z, cover = blueBook, angle = 0) {
    const assembly = new THREE.Group();
    assembly.position.set(x, y, z);
    assembly.rotation.y = angle;
    parent.add(assembly);
    box(assembly, 0.24, 0.014, 0.32, cover, 0, 0, 0);
    box(assembly, 0.218, 0.045, 0.295, paper, 0.004, 0.027, 0);
    box(assembly, 0.24, 0.014, 0.32, cover, 0, 0.056, 0);
    box(assembly, 0.025, 0.06, 0.32, cover, -0.115, 0.026, 0);
    box(assembly, 0.1, 0.003, 0.09, brass, 0.025, 0.065, -0.01);
  }

  function computer(parent, x, z, y = 0.81, rotation = 0) {
    const assembly = new THREE.Group();
    assembly.position.set(x, y, z);
    assembly.rotation.y = rotation;
    parent.add(assembly);
    box(assembly, 0.25, 0.018, 0.19, materials.dark, 0, 0.013, 0.03);
    box(assembly, 0.04, 0.14, 0.04, materials.dark, 0, 0.09, 0.065);
    box(assembly, 0.44, 0.29, 0.038, materials.dark, 0, 0.29, 0.065);
    label(assembly, 'BUCANA  |  SERVICES', 0.395, 0.24, 0, 0.29, 0.087, { background: '#153b66', color: '#e0efff', fontSize: 34 });
    box(assembly, 0.35, 0.024, 0.13, materials.dark, 0, 0.024, 0.25);
    for (let row = 0; row < 3; row++) box(assembly, 0.28, 0.006, 0.006, materials.metal, 0, 0.039, 0.205 + row * 0.03);
  }

  function plant(parent, x, z, y = floorY, scale = 1) {
    const assembly = new THREE.Group();
    assembly.position.set(x, y, z);
    assembly.scale.setScalar(scale);
    parent.add(assembly);
    cylinder(assembly, 0.19, 0.135, 0.28, cream, 0, 0.14, 0, 14);
    cylinder(assembly, 0.164, 0.164, 0.025, materials.dark, 0, 0.277, 0, 14);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      const h = 0.35 + (i % 3) * 0.09;
      const tip = new THREE.Vector3(Math.cos(a) * 0.2, 0.28 + h, Math.sin(a) * 0.2);
      beam(assembly, new THREE.Vector3(0, 0.28, 0), tip, 0.011, materials.leaf, 5);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 5), materials.leaf);
      leaf.position.copy(tip);
      leaf.scale.set(0.6, 2.1, 0.7);
      leaf.rotation.z = Math.cos(a) * 0.6;
      leaf.rotation.x = Math.sin(a) * 0.6;
      leaf.castShadow = true;
      assembly.add(leaf);
    }
  }

  function frontPlaque(parent, text, width, height, x, y, z, small = false) {
    const plaque = label(parent, text, width, height, x, y, z, { background: small ? '#e5edf5' : '#1e4f85', color: small ? '#1e4f85' : '#ffffff', fontSize: 140 });
    plaque.rotation.y = Math.PI;
    return plaque;
  }

  function wallClock(parent, x, y, z) {
    const clock = cylinder(parent, 0.23, 0.23, 0.045, brass, x, y, z, 28);
    clock.rotation.x = Math.PI / 2;
    const face = cylinder(parent, 0.204, 0.204, 0.052, paper, x, y, z - 0.013, 28);
    face.rotation.x = Math.PI / 2;
    beam(parent, new THREE.Vector3(x, y, z - 0.048), new THREE.Vector3(x, y + 0.145, z - 0.048), 0.008, materials.dark, 5);
    beam(parent, new THREE.Vector3(x, y, z - 0.049), new THREE.Vector3(x + 0.095, y - 0.04, z - 0.049), 0.009, materials.dark, 5);
  }

  function ceilingLight(parent, x, z, y, intensity) {
    const fixture = cylinder(parent, 0.21, 0.21, 0.04, materials.white, x, y, z, 16);
    fixture.material = new THREE.MeshStandardMaterial({ color: '#fff2ce', emissive: '#ffddb0', emissiveIntensity: 0.55 });
    fixture.userData.nightGlow = true;
    const light = new THREE.PointLight('#ffdfb0', intensity, 8, 2);
    light.position.set(x, y - 0.1, z);
    light.userData.dayIntensity = intensity * 0.42;
    light.userData.nightIntensity = intensity;
    parent.add(light);
    lights.push(light);
  }

  // Ground-floor service counter: solid cabinetry, raised acrylic screens and transaction slots.
  box(groundFloor, 4.05, 0.94, 0.78, cream, -3.1, floorY + 0.47, -1.75);
  box(groundFloor, 4.16, 0.09, 0.88, materials.wood, -3.1, floorY + 0.97, -1.75);
  box(groundFloor, 4.03, 0.15, 0.018, materials.green, -3.1, floorY + 0.69, -2.149);
  for (let i = 0; i < 3; i++) {
    const x = -4.45 + i * 1.34;
    box(groundFloor, 1.28, 0.57, 0.018, acrylic, x, floorY + 1.47, -2.02).castShadow = false;
    box(groundFloor, 0.022, 0.74, 0.022, materials.metal, x - 0.66, floorY + 1.39, -2.02);
    computer(groundFloor, x + 0.05, -1.61, floorY + 1.025);
    chair(groundFloor, x, -0.91, 0, floorY, true);
    box(groundFloor, 0.2, 0.015, 0.26, paper, x - 0.42, floorY + 1.031, -1.91);
  }
  box(groundFloor, 0.022, 0.74, 0.022, materials.metal, -1.09, floorY + 1.39, -2.02);
  frontPlaque(groundFloor, 'PUBLIC ASSISTANCE / CLEARANCE', 3.65, 0.2, -3.1, floorY + 0.69, -2.168);
  for (let i = 0; i < 4; i++) chair(groundFloor, -4.77 + i * 0.71, -3.21, Math.PI);
  frontPlaque(groundFloor, 'CITIZEN SERVICES', 2.48, 0.23, -3.1, 2.41, -0.48, true);

  // Rear tanod station, separated by low walls and glazing to keep the interior readable.
  box(groundFloor, 5.2, 0.96, 0.095, cream, -3.0, floorY + 0.48, 0.63);
  box(groundFloor, 3.16, 0.82, 0.018, acrylic, -4.0, floorY + 1.4, 0.63).castShadow = false;
  box(groundFloor, 0.045, 1.84, 0.065, materials.green, -2.38, floorY + 0.92, 0.63);
  frontPlaque(groundFloor, 'TANOD / BLOTTER DESK', 2.6, 0.22, -3.65, floorY + 0.72, 0.572);
  const tanodDesk = desk(groundFloor, -3.5, 2.13, 2.5, 0.88);
  deskDrawers(tanodDesk, 'tanod', 0, 2.5, 0.88);
  book(tanodDesk, -0.66, 0.82, -0.13, redBook, -0.08);
  book(tanodDesk, -0.41, 0.82, 0.13, blueBook, 0.1);
  computer(tanodDesk, 0.57, 0.09);
  box(tanodDesk, 0.36, 0.013, 0.25, paper, 0.0, 0.823, -0.2);
  chair(groundFloor, -3.5, 3.0, 0, floorY, true);
  chair(groundFloor, -4.08, 1.22, Math.PI);
  chair(groundFloor, -2.93, 1.22, Math.PI);
  // Hollow file cabinet: opening a drawer exposes a tray of records.
  for (const side of [-1, 1])
    box(groundFloor, 0.032, 1.6, 0.44, materials.dark, -5.3 + side * 0.394, floorY + 0.8, 3.34);
  box(groundFloor, 0.82, 1.6, 0.028, materials.dark, -5.3, floorY + 0.8, 3.548);
  for (const y of [0.018, 1.582])
    box(groundFloor, 0.82, 0.036, 0.44, materials.dark, -5.3, floorY + y, 3.34);
  for (let i = 0; i < 4; i++) {
    createDrawer(groundFloor, interactions, {
      id: `tanod-file-drawer-${i + 1}`, label: `Tanod file cabinet drawer ${i + 1}`, floor: 0,
      position: [-5.3, floorY + 0.25 + i * 0.35, 3.1], width: 0.75, height: 0.31,
      depth: 0.405, travel: 0.34, frontMaterial: materials.metal,
      trayMaterial: materials.dark, handleMaterial: materials.dark,
    });
  }
  wallClock(groundFloor, -2.1, 2.26, 3.83);

  // Lupon mediation area, with an oval table, six seats and privacy partition.
  box(groundFloor, 0.095, 1.08, 3.0, cream, 0.81, floorY + 0.54, -1.96);
  box(groundFloor, 0.018, 0.91, 3.0, acrylic, 0.81, floorY + 1.535, -1.96).castShadow = false;
  box(groundFloor, 0.09, 0.055, 3.05, materials.green, 0.81, floorY + 2.025, -1.96);
  const mediationTop = cylinder(groundFloor, 1, 1, 0.1, materials.wood, 3.0, floorY + 0.79, -1.85, 44);
  mediationTop.scale.set(0.92, 1, 1.21);
  for (const z of [-2.45, -1.25]) cylinder(groundFloor, 0.16, 0.28, 0.7, materials.dark, 3.0, floorY + 0.35, z);
  chair(groundFloor, 3.0, -3.35, Math.PI);
  chair(groundFloor, 1.65, 0.05, -Math.PI / 2);
  for (const z of [-2.37, -1.4]) {
    chair(groundFloor, 1.65, z, -Math.PI / 2);
    chair(groundFloor, 4.35, z, Math.PI / 2);
  }
  book(groundFloor, 3.18, floorY + 0.85, -1.58, redBook);
  box(groundFloor, 0.24, 0.01, 0.32, paper, 2.7, floorY + 0.85, -2.0);
  frontPlaque(groundFloor, 'LUPON TAGAPAMAYAPA', 2.4, 0.22, 3.0, 2.38, 0.45, true);
  plant(groundFloor, -5.28, -2.97, floorY, 1.1);
  plant(groundFloor, 5.22, -3.1, floorY, 1.1);

  // A 2.2 m stair flight opens onto a clear 1.35 m-deep rear landing.
  const stairX = (HALL_STAIRS.minX + HALL_STAIRS.maxX) / 2;
  const stairWidth = HALL_STAIRS.maxX - HALL_STAIRS.minX;
  const steps = HALL_STAIRS.steps;
  const run = HALL_STAIRS.topZ - HALL_STAIRS.bottomZ;
  const rise = (upperY - floorY) / steps;
  const tread = run / steps;
  for (let i = 0; i < steps; i++) {
    const h = rise * (i + 1);
    const z = HALL_STAIRS.bottomZ + (i + 0.5) * tread;
    box(groundFloor, stairWidth, h, tread + 0.012, cream, stairX, floorY + h / 2, z);
    box(groundFloor, stairWidth + 0.04, 0.025, 0.032, materials.green, stairX, floorY + h + 0.013, HALL_STAIRS.bottomZ + i * tread);
  }
  for (const x of [HALL_STAIRS.railLeft, HALL_STAIRS.railRight]) {
    const start = new THREE.Vector3(x, floorY + 1.04, HALL_STAIRS.bottomZ - 0.05);
    const end = new THREE.Vector3(x, upperY + 1.04, HALL_STAIRS.topZ - 0.05);
    beam(groundFloor, start, end, 0.036, materials.metal);
    for (let i = 0; i < steps; i += 2) {
      const h = rise * (i + 1);
      const z = HALL_STAIRS.bottomZ + (i + 0.5) * tread;
      beam(groundFloor, new THREE.Vector3(x, floorY + h, z), new THREE.Vector3(x, floorY + h + 0.98, z), 0.018, materials.metal, 6);
    }
  }
  frontPlaque(groundFloor, '2F  SESSION HALL  /  CAPTAIN', 1.8, 0.18, stairX, 2.56, 3.74, true);

  // Upstairs oval session table and nine council seats, plus the presiding chair.
  const conferenceTop = cylinder(upperFloor, 1, 1, 0.12, materials.wood, -2.25, upperY + 0.81, -0.12, 56);
  conferenceTop.scale.set(1.38, 1, 2.42);
  for (const z of [-1.56, 1.32]) {
    cylinder(upperFloor, 0.16, 0.34, 0.73, materials.dark, -2.25, upperY + 0.365, z, 12);
  }
  for (const z of [-1.73, -0.65, 0.45, 1.51]) {
    chair(upperFloor, -4.02, z, -Math.PI / 2, upperY, true);
    chair(upperFloor, -0.48, z, Math.PI / 2, upperY, true);
  }
  chair(upperFloor, -2.25, 2.76, 0, upperY, true);
  chair(upperFloor, -2.25, -2.98, Math.PI, upperY, true);
  for (let i = 0; i < 4; i++) {
    const z = -1.66 + i * 1.1;
    for (const side of [-1, 1]) {
      box(upperFloor, 0.24, 0.014, 0.32, paper, -2.25 + side * 0.99, upperY + 0.879, z);
      cylinder(upperFloor, 0.036, 0.028, 0.12, materials.white, -2.25 + side * 0.93, upperY + 0.94, z + 0.25, 10);
      beam(upperFloor, new THREE.Vector3(-2.25 + side * 0.66, upperY + 0.875, z), new THREE.Vector3(-2.25 + side * 0.59, upperY + 1.07, z), 0.011, materials.dark, 5);
    }
  }
  frontPlaque(upperFloor, 'SANGGUNIANG BARANGAY', 3.85, 0.32, -2.25, upperY + 1.87, 3.79);
  frontPlaque(upperFloor, 'SESSION HALL', 1.58, 0.19, -2.25, upperY + 1.57, 3.8, true);
  plant(upperFloor, 0.35, -3.0, upperY, 1.23);
  plant(upperFloor, -5.24, -2.98, upperY, 1.15);

  // Captain's office and a glazed separating wall with an open doorway to the landing.
  box(upperFloor, 0.105, 1.0, 4.65, cream, 1.14, upperY + 0.5, -1.275);
  box(upperFloor, 0.018, 1.32, 4.65, acrylic, 1.14, upperY + 1.67, -1.275).castShadow = false;
  box(upperFloor, 0.105, 0.075, 4.65, materials.green, 1.14, upperY + 2.355, -1.275);
  box(upperFloor, 0.105, 2.35, 0.08, materials.green, 1.14, upperY + 1.175, 1.1);
  box(upperFloor, 0.105, 2.35, 0.08, materials.green, 1.14, upperY + 1.175, 2.2);
  box(upperFloor, 0.105, 0.18, 1.15, materials.green, 1.14, upperY + 2.27, 1.65);
  createCaptainOfficeDoor(upperFloor, interactions, upperY, acrylic);
  const captainX = CAPTAIN_WORKSPACE.x;
  const captainDesk = desk(upperFloor, captainX, CAPTAIN_WORKSPACE.deskZ, 2.24, 1.02, upperY);
  captainDesk.name = 'Captain executive desk and belongings';
  deskDrawers(captainDesk, 'captain', 1, 2.24, 1.02);
  computer(captainDesk, 0.57, 0.03, 0.81, Math.PI);
  book(captainDesk, -0.72, 0.825, 0.12, blueBook, 0.08);
  box(captainDesk, 0.31, 0.012, 0.25, paper, -0.22, 0.82, -0.22);
  const deskName = frontPlaque(captainDesk, 'PUNONG BARANGAY', 0.83, 0.13, -0.29, 0.88, 0.43);
  deskName.rotation.y = 0;
  const captainChair = chair(upperFloor, captainX, CAPTAIN_WORKSPACE.chairZ, Math.PI, upperY, true);
  captainChair.name = 'Captain executive chair';
  CAPTAIN_WORKSPACE.visitorZs.forEach((z, index) => {
    const visitor = chair(upperFloor, CAPTAIN_WORKSPACE.visitorX, z, Math.PI / 2, upperY);
    visitor.name = `Captain office visitor chair ${index + 1} beside plant`;
  });
  // Low credenza and vertical files along the front wall.
  // The credenza is a hollow cupboard with shelves and four hinged doors.
  // Storage stays away from the stairs and right-hand visitor seating.
  const credenza = new THREE.Group();
  credenza.name = 'Captain front-wall storage cupboard';
  credenza.position.set(captainX + 3.58, 0, -2.93);
  credenza.rotation.y = Math.PI;
  upperFloor.add(credenza);
  for (const y of [0.0275, 0.405, 0.8225])
    box(credenza, 2.18, 0.055, 0.42, materials.wood, 3.58, upperY + y, 0.57);
  box(credenza, 2.18, 0.795, 0.032, materials.wood, 3.58, upperY + 0.425, 0.764);
  for (const x of [2.515, 3.06, 3.58, 4.1, 4.645])
    box(credenza, 0.05, 0.795, 0.4, materials.wood, x, upperY + 0.425, 0.57);
  for (let i = 0; i < 4; i++) {
    const x = 2.8 + i * 0.52;
    createCabinetDoor(credenza, interactions, {
      id: `captain-cupboard-door-${i + 1}`, label: `Captain cupboard door ${i + 1}`, floor: 1,
      position: [x, upperY + 0.45, 0.342], width: 0.44, height: 0.64,
      doorMaterial: cream, handleMaterial: brass,
    });
    for (let file = 0; file < 3; file++)
      box(credenza, 0.065, 0.25, 0.24, file % 2 ? redBook : blueBook,
        x - 0.11 + file * 0.08, upperY + 0.565, 0.565);
    box(credenza, 0.34, 0.09, 0.24, paper, x, upperY + 0.11, 0.565);
  }
  for (let i = 0; i < 7; i++) box(credenza, 0.07, 0.31 + (i % 3) * 0.025, 0.22, i % 2 ? redBook : blueBook, 2.91 + i * 0.09, upperY + 1.025, 0.55);
  // Keep the space between the office doorway and stair railing open.
  plant(upperFloor, 5.35, -0.4, upperY, 1.18);
  const captainName = frontPlaque(upperFloor, 'PUNONG BARANGAY', 1.9, 0.16, captainX, 4.06, -3.87);
  captainName.rotation.y = 0;
  const clockMount = new THREE.Group();
  clockMount.position.set(captainX + 1.88, upperY + 1.9, -3.84);
  clockMount.rotation.y = Math.PI;
  upperFloor.add(clockMount);
  wallClock(clockMount, 0, 0, 0);

  // Upper landing balustrade guards the stair opening.
  beam(upperFloor, new THREE.Vector3(HALL_STAIRS.railLeft, upperY + 1.02, HALL_STAIRS.openingFront), new THREE.Vector3(HALL_STAIRS.railRight, upperY + 1.02, HALL_STAIRS.openingFront), 0.035, materials.metal);
  beam(upperFloor, new THREE.Vector3(HALL_STAIRS.railLeft, upperY + 1.02, HALL_STAIRS.openingFront), new THREE.Vector3(HALL_STAIRS.railLeft, upperY + 1.02, HALL_STAIRS.topZ), 0.035, materials.metal);
  for (let z = HALL_STAIRS.openingFront; z <= HALL_STAIRS.topZ; z += 0.34) cylinder(upperFloor, 0.018, 0.018, 1.0, materials.metal, HALL_STAIRS.railLeft, upperY + 0.5, z, 6);
  for (let x = HALL_STAIRS.railLeft; x <= HALL_STAIRS.railRight; x += 0.34) cylinder(upperFloor, 0.018, 0.018, 1.0, materials.metal, x, upperY + 0.5, HALL_STAIRS.openingFront, 6);

  ceilingLight(groundFloor, -3.0, -1.5, 2.64, 12);
  ceilingLight(groundFloor, -3.4, 2.2, 2.64, 10);
  ceilingLight(groundFloor, 3.0, -1.5, 2.64, 10);
  ceilingLight(groundFloor, 4.5, -0.5, 2.64, 8);
  ceilingLight(upperFloor, -2.25, -1.55, 5.58, 14);
  ceilingLight(upperFloor, -2.25, 1.55, 5.58, 14);
  ceilingLight(upperFloor, captainX, CAPTAIN_WORKSPACE.deskZ, 5.58, 11);
  consolidateFurniture(groundFloor);
  consolidateFurniture(upperFloor);

  // Safe, eye-level starting points face the furniture in each furnished room.
  // Yaw follows Three.js camera direction: (-sin(yaw), 0, -cos(yaw)).
  const rooms = [
    { id: 'assistance', name: 'Public Assistance', floor: 0, position: [-0.45, 1.76, -2.8], yaw: 1.948, pitch: -0.1, description: 'Clearance counter, acrylic partitions, service computers and waiting chairs.' },
    { id: 'tanod', name: 'Tanod / Blotter Desk', floor: 0, position: [-1.3, 1.76, 1.4], yaw: 1.891, pitch: -0.12, description: 'Visit the blotter desk, logbooks and filing cabinet. Open the desk and file drawers to see the records inside.' },
    { id: 'mediation', name: 'Lupon Mediation Room', floor: 0, position: [2.5, 1.76, 0.55], yaw: -0.237, pitch: -0.12, description: 'Explore the six-seat mediation table, case documents and privacy partition.' },
    { id: 'session', name: 'Session Hall', floor: 1, position: [-4.95, 4.63, -2.32], yaw: -2.254, pitch: -0.08, description: 'The council chamber has an oval table, ten council seats, microphones and meeting papers.' },
    { id: 'captain', name: 'Punong Barangay Office', floor: 1, position: [captainX, 4.63, 1.8], yaw: -0.86, pitch: 0.065, description: 'The captain sits on the front side of the desk. Visitor chairs sit beside the right-hand plant, below the live CCTV display.' },
  ];

  const obstacles = [];
  function obstacle(floor, minX, maxX, minZ, maxZ) {
    obstacles.push({ floor, minX, maxX, minZ, maxZ });
  }
  // Architectural partitions use their exact extents. Open doorways and the
  // central ground-floor aisle remain traversable.
  obstacle(0, -5.6, -0.4, 0.5825, 0.6775);
  obstacle(0, 0.7625, 0.8575, -3.46, -0.46);
  obstacle(1, 1.0875, 1.1925, -3.6, 1.05);
  obstacle(1, 1.0875, 1.1925, 1.06, 1.14);
  obstacle(1, 1.0875, 1.1925, 2.16, 2.24);
  // Upper landing rails guard the real stair opening. The north end opens
  // directly onto the landing so visitors can walk up and down the flight.
  obstacle(1, HALL_STAIRS.railLeft - 0.03, HALL_STAIRS.railLeft + 0.03, HALL_STAIRS.openingFront - 0.03, HALL_STAIRS.topZ);
  obstacle(1, HALL_STAIRS.railLeft - 0.03, HALL_STAIRS.railRight + 0.03, HALL_STAIRS.openingFront - 0.03, HALL_STAIRS.openingFront + 0.03);

  obstacle(0, -5.18, -1.02, -2.19, -1.31);
  for (let i = 0; i < 3; i++) obstacle(0, -4.77 + i * 1.34, -4.13 + i * 1.34, -1.23, -0.59);
  for (let i = 0; i < 4; i++) obstacle(0, -5.01 + i * 0.71, -4.53 + i * 0.71, -3.45, -2.97);
  obstacle(0, -4.75, -2.25, 1.69, 2.57);
  obstacle(0, -3.82, -3.18, 2.68, 3.32);
  for (const x of [-4.08, -2.93]) obstacle(0, x - 0.24, x + 0.24, 0.98, 1.46);
  obstacle(0, -5.71, -4.89, 3.12, 3.56);
  obstacle(0, 2.08, 3.92, -3.06, -0.64);
  obstacle(0, 2.76, 3.24, -3.59, -3.11);
  obstacle(0, 1.41, 1.89, -0.19, 0.29);
  for (const z of [-2.37, -1.4]) {
    obstacle(0, 1.41, 1.89, z - 0.24, z + 0.24);
    obstacle(0, 4.11, 4.59, z - 0.24, z + 0.24);
  }
  for (const x of [-5.28, 5.22]) obstacle(0, x - 0.22, x + 0.22, -3.32, -2.75);

  obstacle(1, -3.63, -0.87, -2.54, 2.3);
  for (const z of [-1.73, -0.65, 0.45, 1.51]) {
    obstacle(1, -4.34, -3.7, z - 0.32, z + 0.32);
    obstacle(1, -0.8, -0.16, z - 0.32, z + 0.32);
  }
  for (const z of [-2.98, 2.76]) obstacle(1, -2.57, -1.93, z - 0.32, z + 0.32);
  obstacle(1, captainX - 1.12, captainX + 1.12, -1.81, -0.79);
  obstacle(1, captainX - 0.32, captainX + 0.32, CAPTAIN_WORKSPACE.chairZ - 0.32, CAPTAIN_WORKSPACE.chairZ + 0.32);
  for (const z of CAPTAIN_WORKSPACE.visitorZs)
    obstacle(1, CAPTAIN_WORKSPACE.visitorX - 0.25, CAPTAIN_WORKSPACE.visitorX + 0.25, z - 0.24, z + 0.24);
  obstacle(1, captainX - 1.09, captainX + 1.09, -3.71, -3.29);
  obstacle(1, -5.46, -5.02, -3.2, -2.76);
  obstacle(1, 0.10, 0.60, -3.25, -2.75);
  obstacle(1, 5.1, 5.6, -0.65, -0.15);

  const walkData = {
    floors: [floorY, upperY],
    bounds: { minX: -5.7, maxX: 5.7, minZ: -3.7, maxZ: 3.7 },
    stairs: { ...HALL_STAIRS, minZ:HALL_STAIRS.bottomZ, maxZ:HALL_STAIRS.topZ },
    obstacles,
  };
  return { group, lights, groundFloor, upperFloor, rooms, walkData, interactions };
}
