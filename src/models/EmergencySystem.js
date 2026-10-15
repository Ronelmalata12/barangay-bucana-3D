import * as THREE from 'three';
import { box, cylinder, label } from './primitives.js';

/** A first-floor call point and synchronized warning beacons between rear windows. */
export function createEmergencySystem({ model, reducedMotion = false, onChange = () => {} }) {
  const charcoal = new THREE.MeshStandardMaterial({color:'#28313b', roughness:0.55, metalness:0.3});
  const yellow = new THREE.MeshStandardMaterial({color:'#f1bf35', roughness:0.58});
  const red = new THREE.MeshStandardMaterial({color:'#bd1726', roughness:0.38, metalness:0.12});
  const button = new THREE.Group();
  button.name = 'First-floor emergency alarm call point between windows';
  button.position.set(1.65, 1.51, 3.82);
  button.rotation.y = Math.PI;
  button.scale.setScalar(0.8);
  button.userData.interactive = true;
  model.group.add(button);
  box(button, 0.46, 0.58, 0.12, charcoal);
  box(button, 0.42, 0.54, 0.025, yellow, 0, 0, 0.067);
  const collar = cylinder(button, 0.145, 0.145, 0.035, charcoal, 0, -0.015, 0.095, 24);
  collar.rotation.x = Math.PI / 2;
  const plunger = new THREE.Group();
  plunger.name = 'Pressable red emergency button';
  plunger.position.set(0, -0.015, 0.125);
  button.add(plunger);
  const cap = cylinder(plunger, 0.117, 0.117, 0.075, red, 0, 0, 0, 28);
  cap.rotation.x = Math.PI / 2;
  cap.name = 'Emergency button red mushroom cap';
  label(button, 'EMERGENCY', 0.38, 0.065, 0, 0.198, 0.084,
    {background:'#f1bf35', color:'#371315', fontSize:100});
  label(button, 'PUSH / RESET', 0.35, 0.052, 0, -0.208, 0.084,
    {background:'#f1bf35', color:'#371315', fontSize:90});

  const beacons = [0, 1].map(floor => {
    const group = new THREE.Group();
    group.name = `${floor === 0 ? 'First' : 'Second'}-floor red emergency warning light`;
    group.position.set(1.65, floor === 0 ? 2.38 : 5.25, 3.82);
    group.rotation.y = Math.PI;
    (floor === 0 ? model.group : model.upperFloor).add(group);
    box(group, 0.39, 0.34, 0.075, charcoal);
    const base = cylinder(group, 0.167, 0.167, 0.04, charcoal, 0, 0, 0.061, 24);
    base.rotation.x = Math.PI / 2;
    // Keep the warning lens saturated red under bright room lighting.
    const material = new THREE.MeshBasicMaterial({color:'#6e0b18', toneMapped:false});
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.143, 24, 16), material);
    lens.name = `${group.name} red lens`;
    lens.scale.z = 0.66;
    lens.position.z = 0.11;
    group.add(lens);
    label(group, 'WARNING', 0.34, 0.065, 0, -0.231, 0.048,
      {background:'#f3e5d9', color:'#9e1321', fontSize:100});
    const light = new THREE.PointLight('#ff182b', 0, 10, 2);
    light.name = `${group.name} illumination`;
    light.position.z = 0.42;
    light.visible = false;
    group.add(light);
    return {floor, group, lens, light};
  });

  let active = false;
  const interaction = {
    id:'emergency-button', label:'Emergency alarm', kind:'button', floor:0,
    moving:plunger, hitMeshes:[], amount:0, target:0,
    actionLabels:['Activate emergency alarm', 'Reset emergency alarm'],
    actionMessages:['Emergency alarm reset.', 'Emergency alarm activated on both floors.'],
    apply(amount) { this.amount = amount; plunger.position.z = 0.125 - amount * 0.035; },
    onToggle(value) { setActive(value); },
  };
  button.traverse(object => {
    if (object.isMesh) {
      object.userData.interactionId = interaction.id;
      interaction.hitMeshes.push(object);
    }
  });
  model.interactions.push(interaction);

  function update(time) {
    // A gentle synchronized 1 Hz pulse; reduced-motion users get steady red lights.
    const pulse = reducedMotion ? 0.8 : 0.5 + 0.5 * Math.sin(time * Math.PI * 2 / 1000);
    for (const beacon of beacons) {
      beacon.lens.material.color.set(active ? '#ff2135' : '#6e0b18');
      if (active) beacon.lens.material.color.multiplyScalar(0.55 + pulse * 0.45);
      beacon.light.intensity = active ? 10 + pulse * 22 : 0;
      beacon.light.visible = active;
    }
  }

  function setActive(value) {
    active = Boolean(value);
    interaction.target = active ? 1 : 0;
    update(performance.now());
    onChange(active);
  }

  return { button, beacons, interaction, update, setActive, get active() { return active; } };
}
