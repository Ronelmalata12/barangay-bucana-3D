import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, cylinder, beam, label, materials } from './primitives.js';
import { createInteriorDetails } from './InteriorDetails.js';
import { createLeftAnnex } from './LeftAnnex.js';
import { HALL_STAIRS } from './HallLayout.js';

// Consolidate within each original group so roof, floor and facade cutaways stay independent.
function batchStaticSection(parent) {
  // Interactive assemblies keep their original meshes and local transforms so
  // raycast targets and manually animated door leaves remain intact.
  if (parent.userData.interactive) return;
  for (const child of [...parent.children]) if (child.isGroup) batchStaticSection(child);
  const batches = new Map();
  for (const mesh of parent.children) {
    if (!mesh.isMesh || Array.isArray(mesh.material) || mesh.material.transparent || mesh.material.map || mesh.userData.nightGlow || mesh.userData.interactive || mesh.userData.interactivePart || mesh.userData.preserveIndividual) continue;
    const attributes = Object.keys(mesh.geometry.attributes).sort().join(',');
    const key = `${mesh.material.uuid}:${attributes}:${Boolean(mesh.geometry.index)}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(mesh);
  }
  for (const meshes of batches.values()) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map(mesh => {
      mesh.updateMatrix();
      return mesh.geometry.clone().applyMatrix4(mesh.matrix);
    });
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach(item => item.dispose());
    if (!geometry) continue;
    geometry.computeBoundingSphere();
    const merged = new THREE.Mesh(geometry, meshes[0].material);
    merged.name = 'Batched architectural section';
    merged.castShadow = true;
    merged.receiveShadow = true;
    for (const mesh of meshes) mesh.removeFromParent();
    parent.add(merged);
  }
}

export function createAdminBuilding() {
  const group = new THREE.Group();
  group.name = 'Two-storey Barangay Bucana administration hall';
  const roof = new THREE.Group();
  roof.name = 'Navy blue hip roof';
  const upperFloor = new THREE.Group();
  upperFloor.name = 'Second-storey structure and furnishing';
  const frontGround = new THREE.Group();
  const frontUpper = new THREE.Group();
  const rightGround = new THREE.Group();
  const rightUpper = new THREE.Group();
  const cutawayWalls = [frontGround, frontUpper, rightGround, rightUpper];
  group.add(roof, upperFloor, frontGround, rightGround);
  upperFloor.add(frontUpper, rightUpper);
  const warmTile = new THREE.MeshStandardMaterial({ color: '#e8e1d0', roughness: 0.82 });
  const darkGlass = new THREE.MeshPhysicalMaterial({ color: '#6389a2', transparent: true, opacity: 0.39, roughness: 0.12, metalness: 0.12, side: THREE.DoubleSide, depthWrite: false });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: '#1e4f85', metalness: 0.32, roughness: 0.54, side: THREE.DoubleSide });
  const roofSeams = new THREE.MeshStandardMaterial({ color: '#4274aa', metalness: 0.4, roughness: 0.43 });
  const paleBlue = new THREE.MeshStandardMaterial({ color: '#d8e7f6', roughness: 0.87 });
  const interactions = [];
  const handleHitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const seamMaterial = new THREE.LineBasicMaterial({ color: '#c7c1b3', transparent: true, opacity: 0.45 });

  box(group, 12.38, 0.18, 8.38, materials.concrete, 0, 0.035, 0);
  box(group, 12.0, 0.14, 8.0, warmTile, 0, 0.09, 0);
  box(group, 12.16, 0.12, 0.13, materials.green, 0, 0.18, -4.04);
  box(group, 12.16, 0.12, 0.13, materials.green, 0, 0.18, 4.04);
  for (const x of [-6.04, 6.04]) box(group, 0.13, 0.12, 8.14, materials.green, x, 0.18, 0);

  function floorGrid(parent, y, minX, maxX, minZ, maxZ, spacing = 0.8) {
    const vertices = [];
    for (let x = minX; x < maxX + 0.01; x += spacing) vertices.push(x, y, minZ, x, y, maxZ);
    for (let z = minZ; z < maxZ + 0.01; z += spacing) vertices.push(minX, y, z, maxX, y, z);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    parent.add(new THREE.LineSegments(geometry, seamMaterial));
  }
  floorGrid(group, 0.161, -5.9, 5.9, -3.9, 3.9);

  // A facade is built around its openings, so cutaway views reveal the actual furnished rooms.
  function facade(parent, width, height, yBase, openings, x, z, rotation = 0) {
    const wall = new THREE.Group();
    wall.position.set(x, 0, z);
    wall.rotation.y = rotation;
    parent.add(wall);
    let cursor = -width / 2;
    const ordered = [...openings].sort((a, b) => a.x - b.x);
    for (const opening of ordered) {
      const left = opening.x - opening.w / 2;
      const right = opening.x + opening.w / 2;
      if (left > cursor) box(wall, left - cursor, height, 0.22, materials.stucco, (left + cursor) / 2, yBase + height / 2, 0);
      const bottom = opening.door ? 0 : 0.82;
      const top = opening.door ? 2.28 : 2.13;
      if (bottom > 0) box(wall, opening.w, bottom, 0.22, materials.stucco, opening.x, yBase + bottom / 2, 0);
      box(wall, opening.w, height - top, 0.22, materials.stucco, opening.x, yBase + (top + height) / 2, 0);
      if (opening.door) {
        // Manual doors share one interaction, while their two leaves slide
        // independently into the solid wall beside the clear opening.
        const moving = new THREE.Group();
        const id = opening.interactionId || `door-${interactions.length + 1}`;
        const doorLabel = opening.doorLabel || 'Door';
        moving.name = `${doorLabel} sliding leaves`;
        moving.userData.interactive = true;
        moving.userData.interactionId = id;
        wall.add(moving);
        const leaves = [];
        const leafWidth = opening.w / 2;
        for (const side of [-1, 1]) {
          const leaf = new THREE.Group();
          leaf.name = `${doorLabel} ${side < 0 ? 'left' : 'right'} leaf`;
          const closedX = opening.x + side * leafWidth / 2;
          leaf.position.x = closedX;
          moving.add(leaf);
          const pane = box(leaf, leafWidth - 0.06, top - 0.06, 0.036, darkGlass, 0, yBase + top / 2, -0.016);
          pane.name = `${leaf.name} clickable glass`;
          pane.castShadow = false;
          for (const dx of [-leafWidth / 2, leafWidth / 2]) box(leaf, 0.045, top, 0.085, materials.dark, dx, yBase + top / 2, -0.005);
          for (const y of [yBase + 0.03, yBase + top - 0.03]) box(leaf, leafWidth, 0.045, 0.085, materials.dark, 0, y, -0.005);
          // Project each pull beyond both faces of the 22 cm wall. Even when
          // the glass slides into its wall pocket, these visible handles can
          // still be picked to close the door from either side.
          for (const face of [-1, 1]) {
            const handleZ = face * 0.19;
            const handleX = -side * (leafWidth / 2 - 0.11);
            const pull = cylinder(leaf, 0.029, 0.029, 0.42, materials.metal, handleX, yBase + 1.04, handleZ, 10);
            pull.name = `${leaf.name} ${face < 0 ? 'outside' : 'inside'} exposed pull handle`;
            for (const handleY of [yBase + 0.875, yBase + 1.205]) {
              box(leaf, 0.039, 0.039, 0.175, materials.metal, handleX, handleY, face * 0.1025);
            }
            // A modest invisible tolerance around the actual handle makes
            // mouse and touch selection practical without covering the wall.
            const target = box(leaf, 0.15, 0.54, 0.06, handleHitMaterial, handleX, yBase + 1.04, face * 0.18);
            target.name = `${pull.name} selection target`;
            target.castShadow = false;
            target.receiveShadow = false;
          }
          leaves.push({ leaf, closedX, openX: closedX + side * (leafWidth - 0.03) });
        }
        const hitMeshes = [];
        moving.traverse(mesh => {
          if (!mesh.isMesh) return;
          mesh.userData.interactionId = id;
          hitMeshes.push(mesh);
        });
        const points = [];
        for (const edgeX of [left, right]) for (const edgeZ of [-0.12, 0.12]) {
          points.push({
            x: x + edgeX * Math.cos(rotation) + edgeZ * Math.sin(rotation),
            z: z - edgeX * Math.sin(rotation) + edgeZ * Math.cos(rotation),
          });
        }
        const floor = yBase > 2 ? 1 : 0;
        const interaction = {
          id, label: doorLabel, kind: 'door', floor, moving, hitMeshes,
          amount: 0, target: 0, blocking: true,
          obstacle: {
            floor,
            minX: Math.min(...points.map(point => point.x)),
            maxX: Math.max(...points.map(point => point.x)),
            minZ: Math.min(...points.map(point => point.z)),
            maxZ: Math.max(...points.map(point => point.z)),
          },
          apply(amount) {
            this.amount = THREE.MathUtils.clamp(amount, 0, 1);
            for (const door of leaves) door.leaf.position.x = THREE.MathUtils.lerp(door.closedX, door.openX, this.amount);
          },
        };
        interactions.push(interaction);
        for (const dx of [-opening.w / 2, opening.w / 2]) box(wall, 0.045, top, 0.085, materials.dark, opening.x + dx, yBase + top / 2, -0.005);
        box(wall, opening.w + 0.08, 0.06, 0.12, materials.green, opening.x, yBase + top + 0.03, -0.02);
      } else {
        const openingHeight = top - bottom;
        const glass = box(wall, opening.w - 0.04, openingHeight - 0.025, 0.035, darkGlass, opening.x, yBase + (bottom + top) / 2, -0.007);
        glass.castShadow = false;
        for (const dx of [-opening.w / 2, opening.w / 2]) box(wall, 0.12, openingHeight + 0.19, 0.29, materials.green, opening.x + dx, yBase + (bottom + top) / 2, -0.028);
        for (const dy of [bottom, top]) box(wall, opening.w + 0.12, 0.11, 0.3, materials.green, opening.x, yBase + dy, -0.03);
        const panes = opening.w > 2.4 ? 3 : 2;
        for (let pane = 1; pane < panes; pane++) box(wall, 0.038, openingHeight, 0.075, materials.dark, opening.x - opening.w / 2 + opening.w * pane / panes, yBase + (bottom + top) / 2, -0.028);
        box(wall, opening.w, 0.035, 0.075, materials.dark, opening.x, yBase + bottom + openingHeight * 0.63, -0.028);
        box(wall, opening.w + 0.18, 0.075, 0.39, materials.stucco, opening.x, yBase + bottom - 0.07, -0.075);
      }
      cursor = right;
    }
    if (cursor < width / 2) box(wall, width / 2 - cursor, height, 0.22, materials.stucco, (width / 2 + cursor) / 2, yBase + height / 2, 0);
    box(wall, width + 0.04, 0.13, 0.24, materials.green, 0, yBase + 0.18, -0.015);
    return wall;
  }

  const frontOpenings = [{ x: -3.58, w: 2.7 }, { x: 0, w: 2.24, door: true, interactionId: 'entrance-door', doorLabel: 'Main entrance' }, { x: 3.58, w: 2.7 }];
  facade(frontGround, 12, 2.59, 0.16, frontOpenings, 0, -4, 0);
  // A solid front office wall backs the storage cupboard and captain's chair.
  facade(frontUpper, 12, 2.67, 3.03, [{ x: -3.58, w: 2.7 }], 0, -4, 0);
  facade(group, 12, 2.59, 0.16, [{ x: -3.7, w: 2.5 }, { x: 0, w: 1.6 }, { x: 3.7, w: 2.5 }], 0, 4, Math.PI);
  facade(upperFloor, 12, 2.67, 3.03, [{ x: -3.7, w: 2.5 }, { x: 0, w: 1.6 }, { x: 3.7, w: 2.5 }], 0, 4, Math.PI);
  facade(group, 8, 2.59, 0.16, [{ x: -2.05, w: 2.1 }, { x: 2.05, w: 2.1 }], -6, 0, Math.PI / 2);
  facade(upperFloor, 8, 2.67, 3.03, [{ x: -2.05, w: 2.1 }, { x: 2.05, w: 2.1 }], -6, 0, Math.PI / 2);
  facade(rightGround, 8, 2.59, 0.16, [{ x: -2.05, w: 2.1 }, { x: 2.05, w: 2.1 }], 6, 0, -Math.PI / 2);
  // From the entrance, +X is the viewer's left. This doorway opens into
  // the attached wing beside the captain's office, clear of the rear stairs.
  facade(rightUpper, 8, 2.67, 3.03, [{ x: -2.9, w: 1.1, door: true, interactionId: 'annex-door', doorLabel: 'Second-floor wing door' }, { x: 2.05, w: 2.1 }], 6, 0, -Math.PI / 2);

  // Split second-floor slab leaves an actual opening over the stair flight.
  const stairLeft = HALL_STAIRS.railLeft, stairRight = HALL_STAIRS.railRight;
  const openingFront = HALL_STAIRS.openingFront, openingBack = HALL_STAIRS.topZ;
  box(upperFloor, stairLeft + 6, 0.17, 8.0, warmTile, (stairLeft - 6) / 2, 2.945, 0);
  box(upperFloor, 6 - stairLeft, 0.17, openingFront + 4, warmTile, (stairLeft + 6) / 2, 2.945, (openingFront - 4) / 2);
  box(upperFloor, 6 - stairRight, 0.17, openingBack - openingFront, warmTile, (stairRight + 6) / 2, 2.945, (openingFront + openingBack) / 2);
  box(upperFloor, 6 - stairLeft, 0.17, 4 - openingBack, warmTile, (stairLeft + 6) / 2, 2.945, (openingBack + 4) / 2);
  floorGrid(upperFloor, 3.031, -5.9, stairLeft - 0.1, -3.9, 3.9);
  floorGrid(upperFloor, 3.031, stairLeft + 0.1, 5.9, -3.9, openingFront - 0.1);
  floorGrid(upperFloor, 3.031, stairLeft + 0.1, 5.9, openingBack + 0.1, 3.9);
  for (const z of [-4.05, 4.05]) box(upperFloor, 12.22, 0.2, 0.24, materials.green, 0, 2.83, z);
  for (const x of [-6.05, 6.05]) box(upperFloor, 0.24, 0.2, 8.24, materials.green, x, 2.83, 0);
  for (const x of [-5.85, 5.85]) for (const z of [-3.85, 3.85]) {
    box(group, 0.25, 2.6, 0.25, materials.stucco, x, 1.455, z);
    box(upperFloor, 0.25, 2.68, 0.25, materials.stucco, x, 4.37, z);
  }

  // Sheltered portico, modest columns, accessible threshold and civic signage.
  box(group, 4.42, 0.16, 1.72, materials.concrete, 0, 0.08, -4.78);
  box(group, 4.65, 0.13, 1.86, paleBlue, 0, 2.57, -4.72);
  box(group, 4.7, 0.28, 0.12, materials.green, 0, 2.49, -5.61);
  for (const x of [-1.98, 1.98]) {
    box(group, 0.19, 2.39, 0.19, paleBlue, x, 1.355, -5.42);
    box(group, 0.3, 0.25, 0.3, materials.green, x, 0.285, -5.42);
    box(group, 0.32, 0.1, 0.32, materials.green, x, 2.51, -5.42);
  }
  const name = label(group, 'BARANGAY BUCANA', 4.24, 0.255, 0, 2.49, -5.68, { background: '#1e4f85', color: '#ffffff', fontSize: 140 });
  name.rotation.y = Math.PI;
  const town = label(group, 'NASUGBU  ·  BATANGAS', 3.25, 0.17, 0, 2.23, -4.145, { background: '#d8e7f6', color: '#1e4f85', fontSize: 140 });
  town.rotation.y = Math.PI;
  const level = label(frontUpper, 'ADMINISTRATION HALL', 2.6, 0.2, 0, 3.43, -4.135, { background: '#d8e7f6', color: '#1e4f85', fontSize: 140 });
  level.rotation.y = Math.PI;

  const sealCanvas = document.createElement('canvas');
  sealCanvas.width = 512;
  sealCanvas.height = 512;
  const ctx = sealCanvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = '#e9e2bd';
  ctx.beginPath(); ctx.arc(256, 256, 242, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1e4f85'; ctx.lineWidth = 19;
  ctx.beginPath(); ctx.arc(256, 256, 226, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#1e4f85'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('BARANGAY', 256, 120); ctx.fillText('BUCANA', 256, 414);
  ctx.fillStyle = '#deb451'; ctx.beginPath(); ctx.arc(256, 226, 49, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#deb451'; ctx.lineWidth = 8;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(256 + Math.cos(a) * 59, 226 + Math.sin(a) * 59); ctx.lineTo(256 + Math.cos(a) * 82, 226 + Math.sin(a) * 82); ctx.stroke(); }
  ctx.fillStyle = '#1e4f85'; ctx.beginPath(); ctx.moveTo(150, 320); ctx.lineTo(204, 263); ctx.lineTo(258, 307); ctx.lineTo(311, 271); ctx.lineTo(362, 320); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#397b89'; ctx.lineWidth = 9;
  for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(152, 331 + i * 15); ctx.bezierCurveTo(210, 312 + i * 15, 280, 349 + i * 15, 360, 329 + i * 15); ctx.stroke(); }
  const sealTexture = new THREE.CanvasTexture(sealCanvas);
  sealTexture.colorSpace = THREE.SRGBColorSpace;
  const seal = new THREE.Mesh(new THREE.CircleGeometry(0.53, 36), new THREE.MeshStandardMaterial({ map: sealTexture, transparent: true, roughness: 0.74 }));
  seal.position.set(0, 4.42, -4.135);
  seal.rotation.y = Math.PI;
  frontUpper.add(seal);

  // Four real hip-roof faces, ridge, drip edges and raised standing seams.
  const eaveY = 5.78, ridgeY = 6.5, halfW = 6.48, halfD = 4.47, ridgeHalf = 2.05;
  // A real ceiling makes enclosed rooms readable from eye level.
  box(roof, 11.98, 0.1, 7.98, paleBlue, 0, 5.73, 0);
  function roofFace(vertices, indices) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const panel = new THREE.Mesh(geometry, roofMaterial);
    panel.castShadow = true;
    panel.receiveShadow = true;
    roof.add(panel);
  }
  const a = [-halfW, eaveY, -halfD], b = [halfW, eaveY, -halfD];
  const c = [halfW, eaveY, halfD], d = [-halfW, eaveY, halfD];
  const l = [-ridgeHalf, ridgeY, 0], r = [ridgeHalf, ridgeY, 0];
  roofFace([a, b, r, l], [0, 2, 1, 0, 3, 2]);
  roofFace([d, c, r, l], [0, 1, 2, 0, 2, 3]);
  roofFace([a, d, l], [0, 1, 2]);
  roofFace([b, c, r], [0, 2, 1]);
  for (const z of [-halfD, halfD]) {
    box(roof, halfW * 2, 0.16, 0.12, materials.darkGreen, 0, eaveY - 0.045, z);
    for (let x = -halfW + 0.21; x < halfW; x += 0.46) {
      const ridgeX = THREE.MathUtils.clamp(x, -ridgeHalf, ridgeHalf);
      beam(roof, new THREE.Vector3(x, eaveY + 0.018, z), new THREE.Vector3(ridgeX, ridgeY + 0.008, 0), 0.012, roofSeams, 5);
    }
  }
  for (const side of [-1, 1]) {
    box(roof, 0.12, 0.16, halfD * 2, materials.darkGreen, side * halfW, eaveY - 0.045, 0);
    for (let z = -halfD + 0.4; z < halfD; z += 0.48)
      beam(roof, new THREE.Vector3(side * halfW, eaveY + 0.016, z), new THREE.Vector3(side * ridgeHalf, ridgeY + 0.008, 0), 0.011, roofSeams, 5);
    for (const z of [-halfD, halfD]) beam(roof, new THREE.Vector3(side * halfW, eaveY + 0.01, z), new THREE.Vector3(side * ridgeHalf, ridgeY + 0.025, 0), 0.035, materials.darkGreen);
  }
  beam(roof, new THREE.Vector3(-ridgeHalf, ridgeY + 0.015, 0), new THREE.Vector3(ridgeHalf, ridgeY + 0.015, 0), 0.045, materials.darkGreen);
  for (const x of [-5.9, 5.9]) cylinder(group, 0.043, 0.043, 5.56, materials.green, x, 2.98, 4.15, 8);

  const interiors = createInteriorDetails();
  interactions.push(...(interiors.interactions || []));
  group.add(interiors.groundFloor);
  upperFloor.add(interiors.upperFloor);
  const annex = createLeftAnnex();
  group.add(annex.supports);
  upperFloor.add(annex.group);
  roof.add(annex.roof);
  cutawayWalls.push(annex.frontWall);
  const lights = [...interiors.lights, ...annex.lights];
  const rooms = [...interiors.rooms, annex.room];
  const hallBounds = interiors.walkData.bounds;
  const walkData = {
    ...interiors.walkData,
    walkableAreas: [
      {floor:0, ...hallBounds},
      {floor:1, ...hallBounds},
      {floor:1, minX:5.55, maxX:6.25, minZ:-3.23, maxZ:-2.57},
      {floor:1, ...annex.bounds},
    ],
    obstacles: [
      ...interiors.walkData.obstacles,
      ...annex.obstacles,
      // A shared wall remains solid on either side of the connecting doorway.
      {floor:1, minX:5.88, maxX:6.12, minZ:-4, maxZ:-3.45},
      {floor:1, minX:5.88, maxX:6.12, minZ:-2.35, maxZ:4},
    ],
  };
  batchStaticSection(group);

  function setView(mode) {
    const inside = mode === 'ground' || mode === 'session';
    roof.visible = !inside;
    upperFloor.visible = mode !== 'ground';
    for (const wall of cutawayWalls) wall.visible = !inside;
    // Camera and cutaway controls preserve every manually chosen door state.
  }
  setView('overview');
  return { group, roof, upperFloor, cutawayWalls, lights, setView, rooms, walkData, annex, interactions };
}
