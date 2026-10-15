import * as THREE from 'three';
import { createSecurityCamera, createSecurityMonitor } from './models/CCTVEquipment.js';

const LOCATIONS = [
  { id:'01', label:'FIRST FLOOR', position:[-5.48,2.43,3.48], target:[-0.2,1.0,-1.4], ceilingY:2.84, floor:0 },
  { id:'02', label:'SECOND FLOOR', position:[-5.48,5.39,3.48], target:[-1.5,3.85,-1.3], ceilingY:5.66, floor:1 },
  { id:'03', label:'FRONT EXTERIOR', position:[-5.48,2.48,-4.35], target:[1.0,0.8,-5.0], mountPosition:[-5.72,2.68,-4.125], floor:0 },
  { id:'04', label:'BACK EXTERIOR', position:[5.48,2.48,4.35], target:[-1.0,0.8,5.0], mountPosition:[5.72,2.68,4.125], floor:0 },
  { id:'05', label:'SEPARATE UPPER ROOM', position:[10.95,5.34,3.42], target:[8.4,3.9,-1.6], ceilingY:5.57, floor:1 },
];

/** Five real scene cameras share a GPU atlas displayed by the office monitor. */
export function createCCTVSystem({ renderer, scene, model, sky }) {
  const tileWidth = matchMedia('(max-width: 760px)').matches ? 256 : 384;
  const tileHeight = tileWidth * 27 / 32;
  const width = tileWidth * 3, height = tileHeight * 2;
  const scale = tileWidth / 384;
  const margin = 8 * scale, header = 30 * scale, footer = 20 * scale;
  const target = new THREE.WebGLRenderTarget(width, height, {
    type:THREE.HalfFloatType, minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter,
    generateMipmaps:false, depthBuffer:true, stencilBuffer:false,
  });
  target.texture.name = 'Live five-camera CCTV atlas';
  target.texture.colorSpace = THREE.LinearSRGBColorSpace;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  const overlayTexture = new THREE.CanvasTexture(canvas);
  overlayTexture.colorSpace = THREE.SRGBColorSpace;
  overlayTexture.generateMipmaps = false;
  overlayTexture.minFilter = THREE.LinearFilter;
  overlayTexture.name = 'CCTV channel names and live timestamps';

  const feeds = LOCATIONS.map((location, index) => {
    const equipment = createSecurityCamera(location);
    (location.floor === 1 ? model.upperFloor : model.group).add(equipment.group);
    const column = index % 3, row = Math.floor(index / 3);
    const viewport = new THREE.Vector4(
      column * tileWidth + margin,
      height - (row + 1) * tileHeight + footer,
      tileWidth - margin * 2,
      tileHeight - header - footer,
    );
    equipment.camera.aspect = viewport.z / viewport.w;
    equipment.camera.updateProjectionMatrix();
    return { ...location, ...equipment, viewport, frames:0, lastUpdate:-Infinity, capturedAt:null };
  });
  const monitor = createSecurityMonitor({texture:target.texture, overlayTexture});
  model.upperFloor.add(monitor.group);

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone:'Asia/Manila', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false,
  });
  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone:'Asia/Manila', day:'2-digit', month:'short', year:'numeric',
  });
  let initialized = false, nextFeed = 0, lastOverlaySecond = -1, disposed = false;
  let lastShadowCapture = -Infinity;
  const shadowCaches = [];
  scene.traverse(object => {
    if (object.isDirectionalLight && object.castShadow) shadowCaches.push({light:object, map:null});
  });
  const clearColor = new THREE.Color(), skyPosition = new THREE.Vector3();
  const monitorPosition = new THREE.Vector3(), monitorForward = new THREE.Vector3(), viewerOffset = new THREE.Vector3();

  function drawOverlay() {
    context.clearRect(0, 0, width, height);
    context.save();
    context.scale(scale, scale);
    for (let index = 0; index < 6; index++) {
      const x = index % 3 * 384, y = Math.floor(index / 3) * 324;
      context.strokeStyle = '#31475e'; context.lineWidth = 2;
      context.strokeRect(x + 2, y + 2, 380, 320);
      if (index === 5) continue;
      const feed = feeds[index];
      context.fillStyle = '#0c1b2a'; context.fillRect(x + 3, y + 3, 378, 27);
      context.fillStyle = '#d8e8f5'; context.font = 'bold 13px Arial';
      context.fillText(`CAM ${feed.id}  ${feed.label}`, x + 12, y + 21);
      context.fillStyle = '#0c1b2a'; context.fillRect(x + 3, y + 304, 378, 17);
      context.fillStyle = feed.frames ? '#5ae0ac' : '#deb96d';
      context.beginPath(); context.arc(x + 15, y + 312, 3, 0, Math.PI * 2); context.fill();
      context.font = '11px monospace';
      context.fillText(feed.frames ? 'LIVE' : 'CONNECTING', x + 24, y + 316);
      context.fillStyle = '#a9c5dc'; context.textAlign = 'right';
      context.fillText(feed.capturedAt ? formatter.format(feed.capturedAt) + ' PHT' : '--:--:--', x + 370, y + 316);
      context.textAlign = 'left';
    }
    const x = 768, y = 324;
    context.fillStyle = '#0b1826'; context.fillRect(x + 3, y + 3, 378, 318);
    context.fillStyle = '#75ddbd'; context.font = 'bold 12px Arial';
    context.fillText('BARANGAY BUCANA', x + 22, y + 31);
    context.fillStyle = '#e7f2ff'; context.font = 'bold 23px Arial';
    context.fillText('CCTV MONITORING', x + 22, y + 62);
    context.fillStyle = '#99b3cc'; context.font = '12px Arial';
    context.fillText(dateFormatter.format(new Date()) + '  ·  ' + formatter.format(new Date()), x + 22, y + 85);
    for (let index = 0; index < feeds.length; index++) {
      const feed = feeds[index], lineY = y + 123 + index * 29;
      context.fillStyle = feed.frames ? '#5ae0ac' : '#deb96d';
      context.beginPath(); context.arc(x + 27, lineY - 4, 4, 0, Math.PI * 2); context.fill();
      context.fillStyle = '#d3e2ef'; context.font = '12px Arial';
      context.fillText(`${feed.id}  ${feed.label}`, x + 42, lineY);
    }
    context.strokeStyle = '#31475e'; context.beginPath(); context.moveTo(x + 22, y + 275); context.lineTo(x + 362, y + 275); context.stroke();
    context.fillStyle = '#75ddbd'; context.font = 'bold 12px Arial';
    context.fillText(`${feeds.filter(feed => feed.frames).length} / 5 CAMERAS ONLINE`, x + 22, y + 297);
    context.fillStyle = '#99b3cc'; context.font = '10px Arial';
    context.fillText('LIVE 3D SCENE', x + 263, y + 297);
    context.restore();
    overlayTexture.needsUpdate = true;
  }

  function capture(batch, time) {
    const previousTarget = renderer.getRenderTarget();
    const previousFace = renderer.getActiveCubeFace();
    const previousMip = renderer.getActiveMipmapLevel();
    renderer.getClearColor(clearColor);
    const previousAlpha = renderer.getClearAlpha();
    const previousAutoClear = renderer.autoClear;
    const previousShadowAuto = renderer.shadowMap.autoUpdate;
    const previousShadowUpdate = renderer.shadowMap.needsUpdate;
    const previousShadowMaps = shadowCaches.map(cache => cache.light.shadow.map);
    const previousSurfaces = monitor.surfaces.visible;
    const outline = scene.getObjectByName('Nearby interactive object outline');
    const outlineVisible = outline?.visible;
    const sections = [model.roof, model.upperFloor, ...model.cutawayWalls];
    const visibility = sections.map(object => object.visible);
    skyPosition.copy(sky.position);
    try {
      // Feeds keep real walls and ceilings even when the visitor uses a cutaway.
      sections.forEach(object => { object.visible = true; });
      monitor.surfaces.visible = false; // Never sample an atlas while writing into it.
      if (outline) outline.visible = false;
      renderer.autoClear = false;
      renderer.shadowMap.autoUpdate = false;
      // A separate, shared shadow cache keeps feed lighting independent of cutaways.
      const refreshShadows = renderer.shadowMap.enabled
        && (time - lastShadowCapture >= 500 || shadowCaches.some(cache => !cache.map));
      shadowCaches.forEach(cache => { cache.light.shadow.map = cache.map; });
      renderer.shadowMap.needsUpdate = refreshShadows;
      renderer.setClearColor('#08131f', 1);
      if (!initialized) {
        target.viewport.set(0, 0, width, height);
        target.scissorTest = false;
        renderer.setRenderTarget(target);
        renderer.clear();
      }
      for (const feed of batch) {
        target.viewport.copy(feed.viewport);
        target.scissor.copy(feed.viewport);
        target.scissorTest = true;
        renderer.setRenderTarget(target);
        renderer.clear();
        feed.camera.getWorldPosition(sky.position);
        renderer.render(scene, feed.camera);
        if (refreshShadows) shadowCaches.forEach(cache => { cache.map = cache.light.shadow.map; });
        feed.lastUpdate = time;
        feed.capturedAt = new Date();
        feed.frames++;
      }
      initialized = true;
      if (refreshShadows) lastShadowCapture = time;
    } finally {
      sections.forEach((object, index) => { object.visible = visibility[index]; });
      monitor.surfaces.visible = previousSurfaces;
      if (outline) outline.visible = outlineVisible;
      sky.position.copy(skyPosition);
      renderer.autoClear = previousAutoClear;
      renderer.shadowMap.autoUpdate = previousShadowAuto;
      renderer.shadowMap.needsUpdate = previousShadowUpdate;
      shadowCaches.forEach((cache, index) => { cache.light.shadow.map = previousShadowMaps[index]; });
      renderer.setClearColor(clearColor, previousAlpha);
      renderer.setRenderTarget(previousTarget, previousFace, previousMip);
    }
  }

  function update(time, viewer) {
    if (disposed || document.hidden) return;
    monitor.group.getWorldPosition(monitorPosition);
    monitor.group.getWorldDirection(monitorForward);
    viewerOffset.copy(viewer.position).sub(monitorPosition);
    const nearby = viewer.position.y > 3 && viewerOffset.dot(monitorForward) > 0
      && viewerOffset.lengthSq() < 100;
    // One capture per frame, up to 10 fps/channel near the office, 2 fps elsewhere.
    const interval = nearby ? 100 : 500;
    if (!initialized) capture(feeds, time);
    else {
      const feed = feeds[nextFeed];
      if (time - feed.lastUpdate >= interval) {
        capture([feed], time);
        nextFeed = (nextFeed + 1) % feeds.length;
      }
    }
    const second = Math.floor(time / 1000);
    if (second !== lastOverlaySecond) { drawOverlay(); lastOverlaySecond = second; }
  }

  function invalidate() {
    feeds.forEach(feed => { feed.lastUpdate = -Infinity; });
    lastOverlaySecond = -1;
    lastShadowCapture = -Infinity;
  }

  function dispose() {
    disposed = true;
    target.dispose();
    shadowCaches.forEach(cache => cache.map?.dispose());
    const geometries = new Set(), materials = new Set(), textures = new Set([overlayTexture]);
    for (const root of [...feeds.map(feed => feed.group), monitor.group]) {
      root.removeFromParent();
      root.traverse(object => {
        // Box/cylinder helpers cache geometry shared with the building.
        if (object.geometry && object.userData.cctvOwnedGeometry) geometries.add(object.geometry);
        if (object.material) materials.add(object.material);
      });
    }
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => { if (material.map && material.map !== target.texture) textures.add(material.map); material.dispose(); });
    textures.forEach(texture => texture.dispose());
  }

  drawOverlay();
  return { feeds, monitor, target, overlayTexture, update, invalidate, dispose };
}
