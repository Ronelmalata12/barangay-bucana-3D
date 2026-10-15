import * as THREE from 'three';

/** Nearby objects are operated by the visitor, with real moving 3D parts. */
export function createInteractions({ camera, domElement, model, walkthrough, onTargetChange = () => {}, onAction = () => {} }) {
  const items = model.interactions ?? [];
  const owners = new WeakMap();
  const raycaster = new THREE.Raycaster();
  raycaster.far = 3.1;
  const pointer = new THREE.Vector2();
  const center = new THREE.Vector2();
  const box = new THREE.Box3();
  const partBox = new THREE.Box3();
  const highlight = new THREE.Box3Helper(box, '#ffd28a');
  highlight.name = 'Nearby interactive object outline';
  highlight.material.transparent = true;
  highlight.material.opacity = 0.85;
  highlight.visible = false;
  model.group.add(highlight);
  let current = null;
  let lastPrompt = '';
  let pointerInside = false;
  let down = null;

  for (const item of items) {
    item.amount ??= 0;
    item.target ??= 0;
    item.apply(item.amount);
    for (const object of item.hitMeshes) {
      object.traverse(child => { if (child.isMesh) owners.set(child, item); });
    }
  }

  function visible(object) {
    for (let node = object; node; node = node.parent) if (!node.visible) return false;
    return true;
  }

  function ndc(clientX, clientY) {
    const rect = domElement.getBoundingClientRect();
    return pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
  }

  function pick(point = center) {
    if (!walkthrough.active) return null;
    model.group.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(point, camera);
    const hits = raycaster.intersectObject(model.group, true);
    for (const hit of hits) {
      if (!hit.object.isMesh || !visible(hit.object)) continue;
      const item = owners.get(hit.object);
      if (item && item.floor === walkthrough.floor) return item;
      // The nearest solid surface blocks interaction with objects behind it.
      // Decorative text overlays do not hide their door or cabinet face.
      if (hit.object.material?.map && hit.object.material.transparent && hit.object.geometry.type === 'PlaneGeometry') continue;
      return null;
    }
    return null;
  }

  function playerInDoorway(item) {
    const obstacle = item.obstacle;
    return item.blocking && obstacle && walkthrough.active && obstacle.floor === walkthrough.floor
      && camera.position.x > obstacle.minX - 0.23 && camera.position.x < obstacle.maxX + 0.23
      && camera.position.z > obstacle.minZ - 0.23 && camera.position.z < obstacle.maxZ + 0.23;
  }

  function toggle(item) {
    if (!item || !walkthrough.active || item.floor !== walkthrough.floor) return false;
    if (item.target === 1 && playerInDoorway(item)) {
      onAction('Step clear of the doorway before closing it.');
      return false;
    }
    item.target = item.target === 1 ? 0 : 1;
    item.onToggle?.(Boolean(item.target));
    onAction(item.actionMessages?.[item.target] ?? `${item.target ? 'Opening' : 'Closing'} ${item.label.toLowerCase()}`);
    return true;
  }

  function refreshTarget() {
    current = walkthrough.active
      ? pick(!walkthrough.locked && pointerInside && !down ? pointer : center)
      : null;
    const prompt = current ? (current.actionLabels?.[current.target ? 1 : 0]
      ?? `${current.target ? 'Close' : 'Open'} ${current.label}`) : '';
    if (prompt !== lastPrompt) { lastPrompt = prompt; onTargetChange(current, prompt); }
    highlight.visible = Boolean(current);
    if (current) {
      box.makeEmpty();
      for (const mesh of current.hitMeshes) box.union(partBox.setFromObject(mesh));
      box.expandByScalar(0.015);
      highlight.updateMatrixWorld(true);
    }
  }

  function update(delta) {
    for (const item of items) {
      if (item.target === 0 && item.amount > 0.82 && playerInDoorway(item)) {
        item.target = 1;
        onAction('Step clear of the doorway before closing it.');
      }
      if (item.amount === item.target) continue;
      item.amount = THREE.MathUtils.damp(item.amount, item.target, 8.5, Math.min(delta, 0.05));
      if (Math.abs(item.amount - item.target) < 0.002) item.amount = item.target;
      item.apply(item.amount);
    }
    refreshTarget();
  }

  function interact() {
    refreshTarget();
    return toggle(current);
  }

  function pointerDown(event) {
    if (!walkthrough.active || event.button !== 0 || down
      || (event.pointerType !== 'touch' && event.isPrimary === false)) return;
    down = { id: event.pointerId, x: event.clientX, y: event.clientY, travel: 0 };
  }

  function pointerMove(event) {
    pointerInside = event.pointerType === 'mouse';
    if (!walkthrough.locked) ndc(event.clientX, event.clientY);
    if (down?.id === event.pointerId) {
      down.travel += Math.hypot(event.movementX || event.clientX - down.x, event.movementY || event.clientY - down.y);
      down.x = event.clientX;
      down.y = event.clientY;
    }
  }

  function pointerUp(event) {
    if (down?.id !== event.pointerId) return;
    const clicked = down.travel < 7;
    down = null;
    if (clicked) toggle(pick(walkthrough.locked ? center : ndc(event.clientX, event.clientY)));
  }

  function clearPointer() { pointerInside = false; down = null; }
  function pointerLeave() { pointerInside = false; }
  function keyDown(event) {
    if (!walkthrough.active || event.code !== 'KeyE' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.matches('input, textarea, select'))) return;
    event.preventDefault();
    interact();
  }

  domElement.addEventListener('pointerdown', pointerDown, true);
  domElement.addEventListener('pointermove', pointerMove, true);
  domElement.addEventListener('pointerup', pointerUp, true);
  domElement.addEventListener('pointercancel', clearPointer);
  domElement.addEventListener('pointerleave', pointerLeave);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('blur', clearPointer);

  return {
    update, interact, pick,
    get target() { return current; },
    get items() { return items; },
    dispose() {
      domElement.removeEventListener('pointerdown', pointerDown, true);
      domElement.removeEventListener('pointermove', pointerMove, true);
      domElement.removeEventListener('pointerup', pointerUp, true);
      domElement.removeEventListener('pointercancel', clearPointer);
      domElement.removeEventListener('pointerleave', pointerLeave);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('blur', clearPointer);
      highlight.removeFromParent();
      highlight.geometry.dispose();
      highlight.material.dispose();
    },
  };
}
