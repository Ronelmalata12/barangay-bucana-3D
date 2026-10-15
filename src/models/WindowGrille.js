import * as THREE from 'three';
import {box} from './primitives.js';

/** Exterior steel grille in facade coordinates, where -Z faces outdoors. */
export function createWindowGrille(parent, {x, y, width, height, material}) {
  const group = new THREE.Group();
  group.name = 'Ground-floor window security grille';
  group.userData.windowGrille = true;
  group.userData.floor = 0;
  group.position.set(x, y, -0.235);
  parent.add(group);
  const frame = 0.04;
  for (const side of [-1, 1]) {
    box(group, frame, height + frame, 0.045, material, side * width / 2);
    box(group, width, frame, 0.045, material, 0, side * height / 2);
    for (const end of [-1, 1]) {
      // Standoffs connect the grille to the existing window trim.
      box(group, 0.065, 0.07, 0.12, material,
        side * width / 2, end * (height / 2 - 0.12), 0.055);
    }
  }
  const bays = Math.ceil((width - frame) / 0.15);
  for (let i = 1; i < bays; i++) {
    const barX = -width / 2 + frame / 2 + (width - frame) * i / bays;
    box(group, 0.018, height - frame, 0.018, material, barX);
  }
  box(group, width - frame, 0.025, 0.025, material, 0, 0, -0.008);
  return group;
}
