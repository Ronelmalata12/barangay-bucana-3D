import * as THREE from 'three';
import { box, cylinder, materials } from './primitives.js';

const paper = new THREE.MeshStandardMaterial({ color: '#faf6e9', roughness: 0.94 });
const folder = new THREE.MeshStandardMaterial({ color: '#c1ab73', roughness: 0.87 });

function register(interactions, options, moving, apply) {
  const interaction = { ...options, moving, hitMeshes: [], amount: 0, target: 0, apply };
  moving.name = options.label;
  moving.traverse(part => {
    part.userData.interactivePart = true;
    part.userData.interactive = true;
    part.userData.interactionId = options.id;
    if (part.isMesh) interaction.hitMeshes.push(part);
  });
  interactions.push(interaction);
  apply(0);
  return interaction;
}

// Drawers contain a real open-top tray and documents rather than a sliding slab.
// The origin is the centre of the closed drawer face; +Z points into the cabinet.
export function createDrawer(parent, interactions, {
  id, label, floor, position, width = 0.5, height = 0.17,
  depth = 0.4, travel = 0.32, frontMaterial = materials.wood,
  trayMaterial = materials.wood, handleMaterial = materials.metal,
}) {
  const moving = new THREE.Group();
  moving.position.set(...position);
  parent.add(moving);
  box(moving, width, height, 0.036, frontMaterial);
  box(moving, width - 0.028, 0.022, depth, trayMaterial, 0, -height / 2 + 0.016, depth / 2);
  for (const side of [-1, 1])
    box(moving, 0.018, height * 0.72, depth - 0.036, trayMaterial,
      side * (width / 2 - 0.018), -height * 0.12, depth / 2 + 0.014);
  box(moving, width - 0.028, height * 0.72, 0.018, trayMaterial, 0, -height * 0.12, depth - 0.012);
  box(moving, width * 0.28, 0.024, 0.037, handleMaterial, 0, 0.018, -0.038);
  // Documents move with the drawer and become visible as it is pulled out.
  box(moving, width * 0.7, 0.018, depth * 0.68, folder, 0, -height / 2 + 0.037, depth * 0.53);
  box(moving, width * 0.64, 0.035, depth * 0.6, paper, 0.009, -height / 2 + 0.063, depth * 0.53);
  box(moving, width * 0.2, 0.006, depth * 0.1, folder,
    -width * 0.16, -height / 2 + 0.084, depth * 0.82);
  const closedZ = moving.position.z;
  return register(interactions, { id, label, kind: 'drawer', floor }, moving,
    amount => { moving.position.z = closedZ - Math.max(0, Math.min(1, amount)) * travel; });
}

// A cupboard panel swings about its left-hand hinge, revealing shelves and files.
export function createCabinetDoor(parent, interactions, {
  id, label, floor, position, width = 0.44, height = 0.64,
  doorMaterial = materials.white, handleMaterial = materials.metal,
}) {
  const moving = new THREE.Group();
  moving.position.set(position[0] - width / 2, position[1], position[2]);
  parent.add(moving);
  box(moving, width, height, 0.028, doorMaterial, width / 2, 0, 0);
  box(moving, 0.024, 0.14, 0.038, handleMaterial, width - 0.074, height * 0.26, -0.038);
  for (const y of [-height * 0.35, height * 0.35])
    cylinder(moving, 0.015, 0.015, 0.07, handleMaterial, 0.016, y, -0.003, 8);
  return register(interactions, { id, label, kind: 'cabinet', floor }, moving,
    amount => { moving.rotation.y = Math.max(0, Math.min(1, amount)) * Math.PI * 0.53; });
}

// The office door lies in the X-normal partition and opens into the session hall.
export function createCaptainOfficeDoor(parent, interactions, floorY, glassMaterial) {
  const id = 'captain-office-door';
  const moving = new THREE.Group();
  moving.position.set(1.14, floorY, 2.16);
  parent.add(moving);
  const width = 1.02;
  const height = 2.14;
  box(moving, 0.056, 0.81, width, materials.white, 0, 0.445, -width / 2);
  const glazing = box(moving, 0.02, 1.08, width - 0.11, glassMaterial, 0, 1.405, -width / 2);
  glazing.castShadow = false;
  for (const z of [-0.025, -width + 0.025])
    box(moving, 0.065, height, 0.05, materials.green, 0, height / 2 + 0.025, z);
  for (const y of [0.05, 0.87, height])
    box(moving, 0.065, 0.055, width, materials.green, 0, y, -width / 2);
  // Handles on both sides allow opening from the landing or inside the office.
  for (const side of [-1, 1]) {
    box(moving, 0.04, 0.17, 0.028, materials.metal, side * 0.059, 1.0, -width + 0.13);
    box(moving, 0.03, 0.028, 0.13, materials.metal, side * 0.078, 1.06, -width + 0.18);
  }
  return register(interactions, {
    id, label: "Captain's office door", kind: 'door', floor: 1, blocking: true,
    obstacle: { floor: 1, minX: 1.105, maxX: 1.175, minZ: 1.14, maxZ: 2.16 },
  }, moving, amount => { moving.rotation.y = Math.max(0, Math.min(1, amount)) * Math.PI / 2; });
}
