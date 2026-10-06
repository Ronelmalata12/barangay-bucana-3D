import * as THREE from 'three';
import { box, beam } from './primitives.js';

// A representative, seated office figure. Its local origin is the floor under
// the executive chair and its face points toward the desk at negative Z.
export function createCaptainFigure() {
  const group = new THREE.Group();
  group.name = 'Seated barangay captain';
  const mat = color => new THREE.MeshStandardMaterial({color,roughness:0.83});
  const skin=mat('#b9835d'), shirt=mat('#a9d1e7'), pants=mat('#293950');
  const hair=mat('#342c28'), shoes=mat('#20262c'), white=mat('#f9f6ed');
  const dark=mat('#26282b'), tie=mat('#244f7e');
  const sphere=new THREE.SphereGeometry(1,16,12);
  function rounded(material,x,y,z,sx,sy,sz) {
    const mesh=new THREE.Mesh(sphere,material);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    return mesh;
  }
  rounded(pants,0,0.585,-0.025,0.195,0.12,0.185);
  rounded(shirt,0,0.925,-0.015,0.218,0.285,0.124);
  rounded(skin,0,1.197,-0.025,0.063,0.071,0.059);
  rounded(skin,0,1.351,-0.025,0.121,0.152,0.108);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(1,16,10,0,Math.PI*2,0,Math.PI*0.57),hair);
  cap.position.set(0,1.369,-0.020);cap.scale.set(0.126,0.143,0.113);cap.castShadow=true;group.add(cap);
  for(const side of [-1,1]) {
    rounded(skin,side*0.126,1.345,-0.020,0.023,0.041,0.022);
    rounded(white,side*0.041,1.375,-0.121,0.026,0.015,0.009);
    rounded(dark,side*0.041,1.374,-0.130,0.008,0.009,0.004);
    beam(group,[side*0.019,1.400,-0.124],[side*0.064,1.402,-0.122],0.0045,hair,6);
    // Thighs rest horizontally on the seat; shins and shoes reach the floor.
    beam(group,[side*0.101,0.549,-0.030],[side*0.126,0.518,-0.365],0.081,pants,10);
    rounded(pants,side*0.126,0.515,-0.365,0.081,0.082,0.081);
    beam(group,[side*0.126,0.504,-0.366],[side*0.136,0.111,-0.395],0.059,pants,10);
    rounded(shoes,side*0.137,0.069,-0.466,0.084,0.057,0.146);
    // Bent arms end just above the executive desktop, with palms facing down.
    beam(group,[side*0.179,1.097,-0.033],[side*0.257,0.892,-0.222],0.065,shirt,10);
    rounded(shirt,side*0.257,0.892,-0.222,0.064,0.064,0.064);
    beam(group,[side*0.257,0.883,-0.229],[side*0.181,0.847,-0.541],0.045,shirt,10);
    rounded(skin,side*0.181,0.847,-0.571,0.050,0.026,0.078);
    for(let finger=0;finger<3;finger++) {
      beam(group,[side*0.181+(finger-1)*0.023,0.846,-0.594],[side*0.181+(finger-1)*0.023,0.841,-0.639],0.009,skin,6);
    }
  }
  rounded(skin,0,1.344,-0.136,0.022,0.025,0.022);
  beam(group,[-0.027,1.301,-0.117],[0.027,1.301,-0.117],0.0045,hair,6);
  box(group,0.048,0.236,0.014,tie,0,1.023,-0.128);
  for(const side of [-1,1]) {
    const collar=box(group,0.058,0.029,0.019,white,side*0.040,1.158,-0.095);
    collar.rotation.z=side*0.48;
  }
  for(const y of [0.85,0.93]) rounded(white,0,y,-0.135,0.007,0.007,0.004);
  group.traverse(object=>{if(object.isMesh)object.userData.preserveIndividual=true;});
  return group;
}
