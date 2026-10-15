import * as THREE from 'three';
import {box, label, materials} from './primitives.js';

export const FIRE_EXIT = Object.freeze({width:1.4, z:4, landingEnd:6.3});

/** Rear-wall local +Z faces indoors; the leaf swings out toward local -Z. */
export function createFireExitDoor(parent, interactions, floorY) {
  const green = new THREE.MeshStandardMaterial({color:'#247557',roughness:0.6,metalness:0.2});
  const moving = new THREE.Group();
  moving.name = 'Outward swinging rear fire exit';
  moving.position.set(-FIRE_EXIT.width / 2, floorY, 0);
  moving.userData.interactive = true;
  parent.add(moving);
  const width = FIRE_EXIT.width, height = 2.25;
  box(moving, width - 0.05, height, 0.065, green, width / 2, height / 2);
  for(const x of [0.18,width-0.18]) box(moving, 0.065, 0.12, 0.08, materials.metal, x, 1.03, 0.06);
  box(moving, width-0.3, 0.055, 0.055, materials.metal, width/2, 1.03, 0.115);
  label(moving, 'PUSH BAR TO OPEN', 0.93, 0.12, width/2, 1.25, 0.039, {background:'#247557',fontSize:120});
  label(moving, 'FIRE EXIT', 0.9, 0.22, width/2, 1.75, 0.039, {background:'#176044',fontSize:125});
  const outside = label(moving, 'FIRE EXIT\nKEEP CLEAR', 0.86, 0.28, width/2, 1.55, -0.039, {background:'#176044',fontSize:90});
  outside.rotation.y = Math.PI;
  const interaction = {
    id:'fire-exit-door',label:'Rear fire exit',kind:'door',floor:0,moving,hitMeshes:[],amount:0,target:0,blocking:true,
    obstacle:{floor:0,minX:-width/2,maxX:width/2,minZ:3.88,maxZ:4.12},
    actionLabels:['Push open fire exit','Close fire exit'],
    actionMessages:['Closing the fire exit.','Fire exit opened outward. The rear landing is accessible.'],
    apply(amount) { moving.rotation.y = amount * Math.PI * 0.55; },
  };
  moving.traverse(part => {
    part.userData.interactivePart = true;
    part.userData.interactionId = interaction.id;
    if(part.isMesh) interaction.hitMeshes.push(part);
  });
  interactions.push(interaction);
  for(const side of [-1,1]) {
    const sign = label(parent, 'FIRE EXIT', 1.25, 0.17, 0, floorY+2.43, side*0.15, {background:'#176044',fontSize:130});
    if(side<0) sign.rotation.y = Math.PI;
  }
}

export function createExitLanding(parent, floorY) {
  box(parent, 2.0, floorY, FIRE_EXIT.landingEnd-4.08, materials.concrete, 0, floorY/2, (4.08+FIRE_EXIT.landingEnd)/2);
  const green = new THREE.MeshBasicMaterial({color:'#2d9065',side:THREE.DoubleSide});
  for(const z of [1.8,2.6,3.35,4.7,5.5]) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([
      -.15,floorY+.006,z-.09, .15,floorY+.006,z-.09, 0,floorY+.006,z+.20,
    ],3));
    const arrow = new THREE.Mesh(geometry,green);
    arrow.name = 'Rear exit route arrow';
    parent.add(arrow);
  }
}
