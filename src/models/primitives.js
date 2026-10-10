import * as THREE from 'three';

const material = (color, roughness = 0.8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
export const materials = {
  concrete: material('#c9cdc8'), stucco: material('#3478c6'),
  green: material('#1e4f85', 0.55, 0.15), darkGreen: material('#173c65', 0.55),
  metal: material('#b7c7c9', 0.3, 0.8), dark: material('#24302f', 0.55, 0.25),
  glass: new THREE.MeshStandardMaterial({color:'#518b93',roughness:0.18,metalness:0.35,transparent:true,opacity:0.42,depthWrite:false,side:THREE.DoubleSide}),
  wood: material('#b58b59', 0.6), white: material('#fbfaf1', 0.8),
  terracotta: material('#b96a51'), asphalt: material('#444b4d'),
  leaf: material('#3d7746'), trunk: material('#816649'),
};
const cube = new THREE.BoxGeometry(1, 1, 1);
const cylinderCache = new Map();

export function box(parent, w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(cube, mat);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function cylinder(parent, radiusTop, radiusBottom, height, mat, x = 0, y = 0, z = 0, segments = 16) {
  const key = `${radiusTop}:${radiusBottom}:${height}:${segments}`;
  if (!cylinderCache.has(key)) cylinderCache.set(key, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments));
  const mesh = new THREE.Mesh(cylinderCache.get(key), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const up = new THREE.Vector3(0, 1, 0);
export function beam(parent, start, end, radius, mat, segments = 8) {
  const a = start.isVector3 ? start : new THREE.Vector3(...start);
  const b = end.isVector3 ? end : new THREE.Vector3(...end);
  const direction = new THREE.Vector3().subVectors(b, a);
  const mesh = cylinder(parent, radius, radius, 1, mat, 0, 0, 0, segments);
  mesh.scale.y = direction.length();
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(up, direction.normalize());
  return mesh;
}

export function label(parent, text, width, height, x, y, z, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(2048, Math.max(512, Math.round(width / height * 256)));
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const {background = '#183e2b', color = '#ffffff', fontSize = 64} = options;
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  const lines = String(text).split('\n');
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = fontSize;
  ctx.font = `600 ${size}px Arial, sans-serif`;
  while (size > 10 && lines.some(line => ctx.measureText(line).width > canvas.width * 0.92)) { size -= 2; ctx.font = `600 ${size}px Arial, sans-serif`; }
  lines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, canvas.height / 2 + (i - (lines.length - 1) / 2) * size * 1.25));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
  mesh.position.set(x,y,z);
  parent.add(mesh);
  return mesh;
}
