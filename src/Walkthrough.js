import * as THREE from 'three';

/** First-person hall navigation, shared by keyboard, drag look, and touch controls. */
export function createWalkthrough({
  camera,
  domElement,
  model,
  onRoomChange = () => {},
  onFloorChange = () => {},
  onLockChange = () => {},
}) {
  const data = model.walkData;
  const floors = data.floors;
  const bounds = data.bounds;
  const walkableAreas = data.walkableAreas ?? [
    { floor:0, ...bounds }, { floor:1, ...bounds },
  ];
  const stairs = data.stairs;
  const obstacles = data.obstacles ?? [];
  const doors = (model.interactions ?? []).filter(item => item.blocking && item.obstacle);
  const rooms = model.rooms ?? [];
  const eyeHeight = 1.6;
  const radius = 0.2;
  const lookSensitivity = 0.0027;
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const pressedKeys = new Set();
  const touchMoves = new Set();
  const motionKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
  let active = false;
  let floor = 0;
  let yaw = Math.PI;
  let pitch = 0;
  let onStairs = false;
  let currentRoom = null;
  let dragPointer = null;
  let previousX = 0;
  let previousY = 0;
  let reportedLock = false;

  const clamp = THREE.MathUtils.clamp;
  const stairProgress = (z) => (z - stairs.bottomZ) / (stairs.topZ - stairs.bottomZ);
  const inStairFootprint = (x, z) => (
    x >= stairs.minX - radius && x <= stairs.maxX + radius
    && z > Math.min(stairs.bottomZ, stairs.topZ) && z < Math.max(stairs.bottomZ, stairs.topZ)
  );
  const inStairWidth = (x) => x >= stairs.minX + radius && x <= stairs.maxX - radius;

  function orientCamera() {
    euler.set(pitch, yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
  }

  function look(dx, dy) {
    if (!active) return;
    yaw -= dx * lookSensitivity;
    pitch = clamp(pitch - dy * lookSensitivity, -1.22, 1.22);
    orientCamera();
  }

  function containsObstacle(x, z, obstacle, extra = radius) {
    return x > obstacle.minX - extra && x < obstacle.maxX + extra
      && z > obstacle.minZ - extra && z < obstacle.maxZ + extra;
  }

  function collisionFree(x, z, previous = null) {
    // Upstairs railings border the open stairwell; they are above a descending
    // player's head once the player has left the top landing.
    const collisionFloor = onStairs && stairProgress(camera.position.z) < 0.95 ? 0 : floor;
    // Floor-specific areas join through the upstairs portal. The ground-floor
    // footprint stays inside the main hall, beneath the raised open passage.
    if (!walkableAreas.some(area => area.floor === collisionFloor
      && x >= area.minX && x <= area.maxX && z >= area.minZ && z <= area.maxZ)) return false;
    const activeObstacles = [...obstacles, ...doors.filter(door => door.amount < 0.82).map(door => door.obstacle)];
    for (const obstacle of activeObstacles) {
      if (obstacle.floor !== collisionFloor || !containsObstacle(x, z, obstacle)) continue;
      // If a model is edited around the player, allow escape from the overlap.
      if (previous && containsObstacle(previous.x, previous.z, obstacle)) {
        const centerX = (obstacle.minX + obstacle.maxX) * 0.5;
        const centerZ = (obstacle.minZ + obstacle.maxZ) * 0.5;
        const oldDistance = Math.hypot(previous.x - centerX, previous.z - centerZ);
        if (Math.hypot(x - centerX, z - centerZ) > oldDistance + 0.00001) continue;
      }
      return false;
    }
    return true;
  }

  function announceRoom(room) {
    if (room?.id === currentRoom?.id) return;
    currentRoom = room ?? null;
    onRoomChange(currentRoom);
  }

  function nearestRoom() {
    if (onStairs) return;
    let nearest = null;
    let distance = Infinity;
    for (const room of rooms) {
      if (room.floor !== floor) continue;
      const zone = room.bounds ?? room.zone;
      if (zone) {
        if (camera.position.x >= zone.minX && camera.position.x <= zone.maxX
          && camera.position.z >= zone.minZ && camera.position.z <= zone.maxZ) {
          announceRoom(room);
          return;
        }
        continue;
      }
      const d = Math.hypot(camera.position.x - room.position[0], camera.position.z - room.position[2]);
      if (d < distance) {
        distance = d;
        nearest = room;
      }
    }
    announceRoom(nearest);
  }

  function changeFloor(nextFloor) {
    if (floor === nextFloor) return;
    floor = nextFloor;
    onFloorChange(floor);
    nearestRoom();
  }

  function clearMoves() {
    pressedKeys.clear();
    touchMoves.clear();
    dragPointer = null;
  }

  function safeSpawn(x, z) {
    const areas = walkableAreas.filter(area => area.floor === floor);
    if (!areas.some(area => x >= area.minX && x <= area.maxX && z >= area.minZ && z <= area.maxZ)) {
      let closest = null;
      let distance = Infinity;
      for (const area of areas) {
        const point = { x:clamp(x, area.minX, area.maxX), z:clamp(z, area.minZ, area.maxZ) };
        const d = Math.hypot(point.x-x, point.z-z);
        if (d < distance) { closest=point; distance=d; }
      }
      if (closest) { x=closest.x; z=closest.z; }
    }
    const valid = (candidateX, candidateZ) => collisionFree(candidateX, candidateZ)
      && !inStairFootprint(candidateX, candidateZ);
    if (valid(x, z)) return { x, z };
    for (let distance = 0.25; distance <= 2; distance += 0.25) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const candidateX = x + Math.cos(angle) * distance;
        const candidateZ = z + Math.sin(angle) * distance;
        if (valid(candidateX, candidateZ)) return { x: candidateX, z: candidateZ };
      }
    }
    return { x, z };
  }

  function goToRoom(id) {
    const room = rooms.find((candidate) => candidate.id === id);
    if (!room) return false;
    clearMoves();
    onStairs = false;
    const changedFloor = floor !== room.floor;
    floor = room.floor;
    const spawn = safeSpawn(room.position[0], room.position[2]);
    camera.position.set(spawn.x, floors[floor] + eyeHeight, spawn.z);
    yaw = room.yaw ?? Math.PI;
    pitch = room.pitch ?? 0;
    orientCamera();
    if (changedFloor) onFloorChange(floor);
    announceRoom(room);
    return true;
  }

  function enter(roomId = null) {
    active = true;
    clearMoves();
    onStairs = false;
    floor = 0;
    if (!roomId || !goToRoom(roomId)) {
      const spawn = safeSpawn(0, -3.1);
      camera.position.set(spawn.x, floors[0] + eyeHeight, spawn.z);
      yaw = Math.PI;
      pitch = 0;
      orientCamera();
      nearestRoom();
    }
    onFloorChange(floor);
    reportLock();
  }

  function exit() {
    active = false;
    clearMoves();
    onStairs = false;
    if (document.pointerLockElement === domElement) document.exitPointerLock?.();
    reportLock();
  }

  function canTakeStep(x, z) {
    const previous = camera.position;
    if (!collisionFree(x, z, previous)) return false;
    const progress = stairProgress(z);
    if (onStairs) {
      // Rails prevent stepping out of the open stairwell halfway up.
      if (progress > 0 && progress < 1 && !inStairWidth(x)) return false;
      if (progress <= 0) {
        onStairs = false;
        changeFloor(0);
      } else if (progress >= 1) {
        onStairs = false;
        changeFloor(1);
      }
      return true;
    }
    if (!inStairFootprint(x, z)) return true;
    if (!inStairWidth(x)) return false;
    const previousProgress = stairProgress(previous.z);
    const enteringBottom = floor === 0 && previousProgress <= 0.04 && progress <= 0.16;
    const enteringTop = floor === 1 && previousProgress >= 0.96 && progress >= 0.84;
    if (!enteringBottom && !enteringTop) return false;
    onStairs = true;
    return true;
  }

  function moveStep(dx, dz) {
    // Independent axes let the player slide along walls and furniture.
    if (dx && canTakeStep(camera.position.x + dx, camera.position.z)) camera.position.x += dx;
    if (dz && canTakeStep(camera.position.x, camera.position.z + dz)) camera.position.z += dz;
  }

  function update(delta) {
    if (!active) return;
    const dt = clamp(delta, 0, 0.05);
    const forward = Number(pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp') || touchMoves.has('forward'))
      - Number(pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown') || touchMoves.has('backward'));
    const sideways = Number(pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight') || touchMoves.has('right'))
      - Number(pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft') || touchMoves.has('left'));
    if (forward || sideways) {
      const length = Math.hypot(forward, sideways);
      const speed = pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight') ? 3.1 : 1.85;
      const distance = speed * dt / length;
      const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * sideways) * distance;
      const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * sideways) * distance;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.06));
      for (let step = 0; step < steps; step += 1) moveStep(dx / steps, dz / steps);
    }
    const targetHeight = onStairs
      ? THREE.MathUtils.lerp(floors[0], floors[1], clamp(stairProgress(camera.position.z), 0, 1)) + eyeHeight
      : floors[floor] + eyeHeight;
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetHeight, 18, dt);
    nearestRoom();
  }

  function setMove(direction, value) {
    const aliases = { up: 'forward', down: 'backward', back: 'backward' };
    const name = aliases[direction] ?? direction;
    if (!['forward', 'backward', 'left', 'right'].includes(name)) return;
    if (active && value) touchMoves.add(name);
    else touchMoves.delete(name);
  }

  function keyDown(event) {
    if (active && event.code === 'KeyL' && !event.repeat && !event.ctrlKey && !event.metaKey
      && !(event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.matches('input, textarea, select')))) {
      event.preventDefault();
      lockMouse();
      return;
    }
    if (!active || !motionKeys.has(event.code)) return;
    if (event.target instanceof HTMLElement
      && (event.target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName))) return;
    event.preventDefault();
    pressedKeys.add(event.code);
  }

  function keyUp(event) {
    if (active && motionKeys.has(event.code)) event.preventDefault();
    pressedKeys.delete(event.code);
  }

  function reportLock() {
    const locked = active && document.pointerLockElement === domElement;
    if (locked === reportedLock) return;
    reportedLock = locked;
    dragPointer = null;
    onLockChange(locked);
  }

  function pointerDown(event) {
    if (!active || event.button !== 0 || dragPointer !== null
      || (event.pointerType !== 'touch' && event.isPrimary === false)) return;
    event.preventDefault();
    dragPointer = event.pointerId;
    previousX = event.clientX;
    previousY = event.clientY;
    try { domElement.setPointerCapture(event.pointerId); } catch { /* Capture is optional. */ }
  }

  function lockMouse() {
    if (active && domElement.requestPointerLock && document.pointerLockElement !== domElement) {
      // Explicit mouse-lock control leaves normal clicks available for objects.
      try {
        const request = domElement.requestPointerLock();
        request?.catch?.(() => {});
      } catch {
        // Dragging remains available in browsers that restrict pointer lock.
      }
    }
  }

  function pointerMove(event) {
    if (!active || document.pointerLockElement === domElement || event.pointerId !== dragPointer) return;
    look(event.clientX - previousX, event.clientY - previousY);
    previousX = event.clientX;
    previousY = event.clientY;
  }

  function pointerUp(event) {
    if (event.pointerId !== dragPointer) return;
    dragPointer = null;
    try { domElement.releasePointerCapture(event.pointerId); } catch { /* It may already be released. */ }
  }

  function mouseMove(event) {
    if (active && document.pointerLockElement === domElement) look(event.movementX, event.movementY);
  }

  function contextMenu(event) {
    if (active) event.preventDefault();
  }

  function visibilityChange() {
    if (document.hidden) clearMoves();
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', clearMoves);
  document.addEventListener('visibilitychange', visibilityChange);
  document.addEventListener('pointerlockchange', reportLock);
  document.addEventListener('mousemove', mouseMove);
  domElement.addEventListener('pointerdown', pointerDown);
  domElement.addEventListener('pointermove', pointerMove);
  domElement.addEventListener('pointerup', pointerUp);
  domElement.addEventListener('pointercancel', pointerUp);
  domElement.addEventListener('contextmenu', contextMenu);

  return {
    enter,
    goToRoom,
    exit,
    update,
    look,
    setMove,
    lockMouse,
    get active() { return active; },
    get locked() { return active && document.pointerLockElement === domElement; },
    get floor() { return floor; },
    get room() { return currentRoom; },
    dispose() {
      exit();
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', clearMoves);
      document.removeEventListener('visibilitychange', visibilityChange);
      document.removeEventListener('pointerlockchange', reportLock);
      document.removeEventListener('mousemove', mouseMove);
      domElement.removeEventListener('pointerdown', pointerDown);
      domElement.removeEventListener('pointermove', pointerMove);
      domElement.removeEventListener('pointerup', pointerUp);
      domElement.removeEventListener('pointercancel', pointerUp);
      domElement.removeEventListener('contextmenu', contextMenu);
    },
  };
}
