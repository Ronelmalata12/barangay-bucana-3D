import * as THREE from 'three';
import { materials, box, beam, label } from './primitives.js';

const FLOOR_Y = 0.24;
const COURT_CENTER = -2.0;
const COURT_HALF_LENGTH = 11.0;
const COURT_HALF_WIDTH = 6.95;
const ARC_HALF_WIDTH = 8.55;

function archHeight(x) {
  return 5.92 + 2.45 * (1 - (x / ARC_HALF_WIDTH) ** 2);
}

function ribbon(parent, points, width, material, y = FLOOR_Y + 0.018) {
  const positions = [];
  const indices = [];
  for (let i = 0; i < points.length; i++) {
    const previous = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next[0] - previous[0];
    const dz = next[1] - previous[1];
    const length = Math.hypot(dx, dz) || 1;
    const nx = (-dz / length) * width * 0.5;
    const nz = (dx / length) * width * 0.5;
    positions.push(points[i][0] + nx, y, points[i][1] + nz);
    positions.push(points[i][0] - nx, y, points[i][1] - nz);
    if (i < points.length - 1) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function arc(parent, x, z, radius, start, end, material, width = 0.065) {
  const count = Math.max(20, Math.ceil(Math.abs(end - start) * 22));
  const points = [];
  for (let i = 0; i <= count; i++) {
    const angle = start + ((end - start) * i) / count;
    points.push([x + Math.cos(angle) * radius, z + Math.sin(angle) * radius]);
  }
  return ribbon(parent, points, width, material);
}

function instancedBars(parent, bars, radius, material) {
  const geometry = new THREE.CylinderGeometry(radius, radius, 1, 7);
  const mesh = new THREE.InstancedMesh(geometry, material, bars.length);
  const up = new THREE.Vector3(0, 1, 0);
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const delta = new THREE.Vector3();
  const center = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  bars.forEach(([a, b], index) => {
    start.fromArray(a);
    end.fromArray(b);
    delta.subVectors(end, start);
    center.addVectors(start, end).multiplyScalar(0.5);
    rotation.setFromUnitVectors(up, delta.clone().normalize());
    scale.set(1, delta.length(), 1);
    matrix.compose(center, rotation, scale);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCourtMarkings(parent) {
  const white = new THREE.MeshStandardMaterial({ color: '#f6f4e9', roughness: 0.82, side: THREE.DoubleSide });
  const line = (x1, z1, x2, z2, width = 0.065) => ribbon(parent, [[x1, z1], [x2, z2]], width, white);
  const front = COURT_CENTER - COURT_HALF_LENGTH;
  const back = COURT_CENTER + COURT_HALF_LENGTH;
  const left = -COURT_HALF_WIDTH;
  const right = COURT_HALF_WIDTH;

  ribbon(parent, [[left, front], [right, front], [right, back], [left, back], [left, front]], 0.075, white);
  line(left, COURT_CENTER, right, COURT_CENTER);
  arc(parent, 0, COURT_CENTER, 1.7, 0, Math.PI * 2, white);

  for (const sign of [-1, 1]) {
    const baseline = COURT_CENTER + sign * COURT_HALF_LENGTH;
    const basketZ = baseline - sign * 1.1;
    const freeThrowZ = baseline - sign * 4.55;
    const keyHalfWidth = 2.2;
    line(-keyHalfWidth, baseline, -keyHalfWidth, freeThrowZ);
    line(keyHalfWidth, baseline, keyHalfWidth, freeThrowZ);
    line(-keyHalfWidth, freeThrowZ, keyHalfWidth, freeThrowZ);
    const arcStart = sign < 0 ? 0 : Math.PI;
    const arcEnd = sign < 0 ? Math.PI : Math.PI * 2;
    arc(parent, 0, freeThrowZ, 1.72, arcStart, arcEnd, white);
    for (let i = 0; i < 10; i++) {
      const segmentStart = arcEnd + (Math.PI * i) / 10;
      arc(parent, 0, freeThrowZ, 1.72, segmentStart, segmentStart + 0.16, white, 0.045);
    }
    // A regulation-style three point arc meeting two short corner lines.
    const radius = 6.05;
    const cornerX = 5.85;
    const angle = Math.acos(cornerX / radius);
    if (sign < 0) {
      arc(parent, 0, basketZ, radius, angle, Math.PI - angle, white);
    } else {
      arc(parent, 0, basketZ, radius, Math.PI + angle, Math.PI * 2 - angle, white);
    }
    const meetZ = basketZ - sign * Math.sqrt(radius ** 2 - cornerX ** 2);
    line(-cornerX, baseline, -cornerX, meetZ);
    line(cornerX, baseline, cornerX, meetZ);
    // Restricted area and small lane markers.
    arc(parent, 0, basketZ, 1.05, arcStart, arcEnd, white, 0.05);
    for (const laneX of [-keyHalfWidth, keyHalfWidth]) {
      for (let j = 0; j < 3; j++) {
        const laneZ = baseline - sign * (1.55 + j * 0.92);
        line(laneX, laneZ, laneX + Math.sign(laneX) * 0.3, laneZ, 0.055);
      }
    }
  }
}

function addBasket(parent, sign) {
  const baseline = COURT_CENTER + sign * COURT_HALF_LENGTH;
  const rimZ = baseline - sign * 1.1;
  const backboardZ = rimZ + sign * 0.45;
  const postZ = baseline + sign * 0.38;
  const rimY = FLOOR_Y + 3.05;
  const orange = new THREE.MeshStandardMaterial({ color: '#e67535', metalness: 0.6, roughness: 0.4 });
  const backboardMaterial = new THREE.MeshStandardMaterial({ color: '#dcece7', metalness: 0.08, roughness: 0.16, transparent: true, opacity: 0.75 });
  const padding = new THREE.MeshStandardMaterial({ color: '#164d39', roughness: 0.95 });
  box(parent, 0.8, 0.17, 0.8, materials.concrete, 0, FLOOR_Y + 0.085, postZ);
  box(parent, 0.18, 3.9, 0.18, materials.metal, 0, FLOOR_Y + 1.95, postZ);
  box(parent, 0.36, 1.65, 0.36, padding, 0, FLOOR_Y + 0.87, postZ);
  beam(parent, [0, FLOOR_Y + 3.75, postZ], [0, rimY + 0.57, backboardZ], 0.11, materials.metal);
  beam(parent, [0, FLOOR_Y + 2.5, postZ], [0, rimY + 0.1, backboardZ], 0.065, materials.metal);
  box(parent, 1.8, 1.08, 0.065, backboardMaterial, 0, rimY + 0.48, backboardZ);
  box(parent, 1.91, 0.055, 0.085, materials.white, 0, rimY + 1.045, backboardZ);
  box(parent, 1.91, 0.065, 0.085, padding, 0, rimY - 0.085, backboardZ);
  for (const x of [-0.935, 0.935]) box(parent, 0.055, 1.15, 0.085, materials.white, x, rimY + 0.48, backboardZ);
  const faceZ = backboardZ - sign * 0.045;
  box(parent, 0.59, 0.035, 0.015, materials.white, 0, rimY + 0.53, faceZ);
  box(parent, 0.59, 0.035, 0.015, materials.white, 0, rimY + 0.095, faceZ);
  for (const x of [-0.277, 0.277]) box(parent, 0.035, 0.46, 0.015, materials.white, x, rimY + 0.312, faceZ);
  box(parent, 0.16, 0.065, 0.36, orange, 0, rimY, rimZ + sign * 0.27);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.018, 8, 32), orange);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, rimY, rimZ);
  ring.castShadow = true;
  parent.add(ring);
  // Open diamond net: two sloping threads per rim attachment and two net rings.
  const netBars = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const nextAngle = ((i + 0.5) / 12) * Math.PI * 2;
    const lowerAngle = ((i - 0.5) / 12) * Math.PI * 2;
    const top = [Math.cos(angle) * 0.22, rimY - 0.025, rimZ + Math.sin(angle) * 0.22];
    const middle = [Math.cos(nextAngle) * 0.17, rimY - 0.22, rimZ + Math.sin(nextAngle) * 0.17];
    const middleOther = [Math.cos(lowerAngle) * 0.17, rimY - 0.22, rimZ + Math.sin(lowerAngle) * 0.17];
    const bottom = [Math.cos(angle) * 0.12, rimY - 0.43, rimZ + Math.sin(angle) * 0.12];
    netBars.push([top, middle], [top, middleOther], [middle, bottom], [middleOther, bottom]);
  }
  instancedBars(parent, netBars, 0.006, materials.white);
}

function addStage(parent, lights) {
  const stageZ = 11.9;
  const top = FLOOR_Y + 0.9;
  box(parent, 8, 0.9, 4, materials.concrete, 0, FLOOR_Y + 0.45, stageZ);
  box(parent, 8.1, 0.035, 4.08, materials.stucco, 0, top + 0.017, stageZ);
  box(parent, 8.08, 0.12, 0.1, materials.green, 0, top - 0.12, stageZ - 2.03);
  box(parent, 8.4, 2.72, 0.22, materials.stucco, 0, top + 1.36, 13.8);
  box(parent, 8.42, 0.22, 0.25, materials.green, 0, top + 2.64, 13.8);
  for (const x of [-4.1, 4.1]) box(parent, 0.2, 2.72, 0.27, materials.green, x, top + 1.36, 13.8);
  const title = label(parent, 'BARANGAY BUCANA', 6.7, 0.76, 0, top + 1.82, 13.65, { background: '#1c6b38', color: '#ffffff', fontSize: 140 });
  title.rotation.y = Math.PI;
  const subtitle = label(parent, 'EVACUATION CENTER  /  COMMUNITY STAGE', 6.7, 0.42, 0, top + 1.11, 13.645, { background: '#1c6b38', color: '#e3e9d9', fontSize: 140 });
  subtitle.rotation.y = Math.PI;
  // Side access steps leave the central stage apron clear for events.
  for (let i = 0; i < 4; i++) {
    const height = 0.225 * (i + 1);
    box(parent, 2.35, height, 0.48, materials.concrete, 5.17, FLOOR_Y + height * 0.5, 10.625 + i * 0.45);
    box(parent, 2.37, 0.02, 0.055, materials.white, 5.17, FLOOR_Y + height + 0.012, 10.405 + i * 0.45);
  }
  beam(parent, [6.36, FLOOR_Y + 1.05, 10.42], [6.36, top + 0.95, 12.2], 0.035, materials.metal);
  beam(parent, [6.36, FLOOR_Y, 10.42], [6.36, FLOOR_Y + 1.05, 10.42], 0.035, materials.metal);
  beam(parent, [6.36, FLOOR_Y + 0.9, 12.2], [6.36, top + 0.95, 12.2], 0.035, materials.metal);
  // Lectern and a pair of stage speakers make the evacuation stage usable.
  box(parent, 0.72, 1, 0.5, materials.wood, -2.85, top + 0.5, 12.65);
  const lecternTop = box(parent, 0.89, 0.095, 0.65, materials.wood, -2.85, top + 1.04, 12.6);
  lecternTop.rotation.x = -0.15;
  beam(parent, [-2.8, top + 1.12, 12.58], [-2.8, top + 1.48, 12.57], 0.013, materials.dark);
  for (const x of [-3.35, 3.35]) {
    box(parent, 0.48, 0.9, 0.38, materials.dark, x, top + 0.45, 13.17);
    const speaker = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), materials.metal);
    speaker.rotation.y = Math.PI;
    speaker.position.set(x, top + 0.38, 12.97);
    parent.add(speaker);
  }
  const stageLight = new THREE.PointLight('#ffe0af', 0.7, 13, 2);
  stageLight.position.set(0, 5.4, 11.9);
  stageLight.userData.dayIntensity = 0.7;
  stageLight.userData.nightIntensity = 28;
  parent.add(stageLight);
  lights.push(stageLight);
}

function addStructure(parent, roof, lights) {
  const trussZs = [-13.8, -8.28, -2.76, 2.76, 8.28, 13.8];
  const bars = [];
  const divisions = 18;
  for (const z of trussZs) {
    for (const x of [-8.04, 8.04]) {
      const columnTop = archHeight(x) - 0.18;
      box(parent, 0.34, 0.4, 0.48, materials.concrete, x, 0.2, z);
      box(parent, 0.19, columnTop - 0.22, 0.19, materials.green, x, (columnTop + 0.22) * 0.5, z);
      box(parent, 0.38, 0.085, 0.34, materials.metal, x, columnTop - 0.045, z);
      beam(parent, [x, 4.6, z], [x - Math.sign(x) * 1.45, archHeight(x - Math.sign(x) * 1.45) - 0.46, z], 0.065, materials.green);
    }
    for (let i = 0; i < divisions; i++) {
      const x1 = -8.05 + (16.1 * i) / divisions;
      const x2 = -8.05 + (16.1 * (i + 1)) / divisions;
      const y1 = archHeight(x1) - 0.1;
      const y2 = archHeight(x2) - 0.1;
      bars.push([[x1, y1, z], [x2, y2, z]]);
      bars.push([[x1, y1 - 0.46, z], [x2, y2 - 0.46, z]]);
      bars.push([[x1, y1, z], [x1, y1 - 0.46, z]]);
      bars.push(i % 2 === 0 ? [[x1, y1 - 0.46, z], [x2, y2, z]] : [[x1, y1, z], [x2, y2 - 0.46, z]]);
    }
    bars.push([[8.05, archHeight(8.05) - 0.1, z], [8.05, archHeight(8.05) - 0.56, z]]);
  }
  // Purlins and wind braces are batched into the same efficient structural mesh.
  for (const x of [-7.8, -5.2, -2.6, 0, 2.6, 5.2, 7.8]) {
    bars.push([[x, archHeight(x) - 0.035, -14.45], [x, archHeight(x) - 0.035, 14.45]]);
  }
  for (const x of [-8.04, 8.04]) {
    bars.push([[x, 5.1, -13.8], [x, 5.1, 13.8]]);
    for (const [front, back] of [[-13.8, -8.28], [8.28, 13.8]]) {
      bars.push([[x, 3.5, front], [x, 5.65, back]], [[x, 5.65, front], [x, 3.5, back]]);
    }
  }
  instancedBars(parent, bars, 0.047, materials.metal);

  // A continuous arched sheet with actual corrugation, constructed in one mesh.
  const xSegments = 64;
  const zSegments = 248;
  const positions = [];
  const indices = [];
  const uvs = [];
  for (let zi = 0; zi <= zSegments; zi++) {
    const z = -14.55 + (29.1 * zi) / zSegments;
    const corrugation = 0.028 * Math.cos((z + 14.55) * (Math.PI * 2 / 0.235));
    for (let xi = 0; xi <= xSegments; xi++) {
      const x = -ARC_HALF_WIDTH + (ARC_HALF_WIDTH * 2 * xi) / xSegments;
      positions.push(x, archHeight(x) + 0.075 + corrugation, z);
      uvs.push(xi / xSegments, zi / zSegments);
      if (zi < zSegments && xi < xSegments) {
        const a = zi * (xSegments + 1) + xi;
        const b = a + xSegments + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const roofing = new THREE.MeshStandardMaterial({ color: '#1c6b38', metalness: 0.5, roughness: 0.49, side: THREE.DoubleSide });
  const sheet = new THREE.Mesh(geometry, roofing);
  sheet.castShadow = true;
  sheet.receiveShadow = true;
  roof.add(sheet);
  for (const x of [-ARC_HALF_WIDTH, ARC_HALF_WIDTH]) box(roof, 0.16, 0.17, 29.25, materials.darkGreen, x, archHeight(x) + 0.015, 0);
  for (const z of [-14.57, 14.57]) {
    const edgeBars = [];
    for (let i = 0; i < 40; i++) {
      const x1 = -ARC_HALF_WIDTH + (2 * ARC_HALF_WIDTH * i) / 40;
      const x2 = -ARC_HALF_WIDTH + (2 * ARC_HALF_WIDTH * (i + 1)) / 40;
      edgeBars.push([[x1, archHeight(x1) + 0.055, z], [x2, archHeight(x2) + 0.055, z]]);
    }
    instancedBars(roof, edgeBars, 0.075, materials.darkGreen);
  }
  for (const x of [-7.45, 7.45]) {
    for (const z of [-9.6, -3.2, 3.2, 9.6]) {
      const y = archHeight(x) - 0.65;
      beam(parent, [x, y + 0.55, z], [x, y + 0.13, z], 0.028, materials.metal);
      const fixture = box(parent, 0.64, 0.16, 0.42, materials.dark, x, y, z);
      fixture.rotation.z = Math.sign(x) * -0.42;
      const lens = box(parent, 0.56, 0.025, 0.34, new THREE.MeshStandardMaterial({ color: '#f9edcc', emissive: '#fff2c2', emissiveIntensity: 0.22, roughness: 0.35 }), x - Math.sign(x) * 0.035, y - 0.083, z);
      lens.rotation.z = Math.sign(x) * -0.42;
      const light = new THREE.SpotLight('#fff0ce', 1.4, 22, Math.PI / 3.0, 0.5, 2);
      light.position.set(x - Math.sign(x) * 0.1, y - 0.12, z);
      light.target.position.set(Math.sign(x) * 1.5, FLOOR_Y, z + 0.3);
      light.userData.dayIntensity = 1.4;
      light.userData.nightIntensity = 70;
      parent.add(light, light.target);
      lights.push(light);
    }
  }
}

export function createCoveredCourt() {
  const group = new THREE.Group();
  group.name = 'Bucana covered court and evacuation stage';
  const roof = new THREE.Group();
  roof.name = 'Corrugated arched court roof';
  const lights = [];
  const evergreen = new THREE.MeshStandardMaterial({ color: '#397453', roughness: 0.87 });
  const keyGreen = new THREE.MeshStandardMaterial({ color: '#295841', roughness: 0.89 });
  box(group, 16, 0.2, 28, materials.concrete, 0, 0.1, 0);
  box(group, 15.9, 0.035, 27.9, materials.terracotta, 0, FLOOR_Y - 0.0175, 0);
  box(group, 14.45, 0.008, 22.65, evergreen, 0, FLOOR_Y + 0.004, COURT_CENTER);
  for (const sign of [-1, 1]) {
    box(group, 4.4, 0.005, 4.55, keyGreen, 0, FLOOR_Y + 0.0105, COURT_CENTER + sign * (COURT_HALF_LENGTH - 2.275));
  }
  addCourtMarkings(group);
  addBasket(group, -1);
  addBasket(group, 1);
  addStage(group, lights);
  addStructure(group, roof, lights);
  group.add(roof);
  // Small seating blocks line the sides without obstructing the playing surface.
  for (const x of [-7.45, 7.45]) {
    for (const z of [-6.5, 0, 6.5]) {
      box(group, 0.47, 0.095, 2.35, materials.wood, x, FLOOR_Y + 0.46, z);
      for (const legZ of [z - 0.86, z + 0.86]) box(group, 0.35, 0.42, 0.12, materials.green, x, FLOOR_Y + 0.21, legZ);
    }
  }
  const frontTitle = label(group, 'BUCANA  /  COVERED COURT', 10.4, 0.68, 0, 5.23, -13.88, { background: '#1c6b38', color: '#fffdf1', fontSize: 140 });
  frontTitle.rotation.y = Math.PI;
  group.userData.description = '16 × 28 m sports hall with arched steel trusses, basketball facilities and an elevated evacuation stage.';
  return {
    group,
    roof,
    lights,
    setView(mode) {
      roof.visible = mode !== 'court';
    },
  };
}
