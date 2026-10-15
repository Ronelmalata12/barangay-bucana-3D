import * as THREE from 'three';
import {box,cylinder,label,materials} from './primitives.js';
import {createCabinetDoor} from './InteractiveFurniture.js';

/** Furnish the annex in its original, X-mirrored construction coordinates. */
export function createPrivateMeetingRoom({parent,floorY,obstacle}) {
  const group=new THREE.Group();group.name="Captain's private meeting room furnishings";
  parent.add(group);
  const interactions=[];
  const mat=(color,roughness=.7,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const oak=mat('#b99166'),oakEdge=mat('#92704e'),navy=mat('#29465e'),fabric=mat('#385770',.94);
  const graphite=mat('#35414b',.45,.3),paper=mat('#f7f4e9'),stone=mat('#d9e0e2');
  const brass=mat('#b4a078',.4,.45),leaf=mat('#527c58'),soil=mat('#454036');
  const cx=-8.7,cz=.35;
  function named(mesh,name){mesh.name=name;return mesh;}
  function plaque(text,w,h,x,y,z,options={}) {
    const mesh=label(group,text,w,h,x,y,z,options);
    // The annex is mirrored on X. Counter-mirror lettering so it reads normally.
    mesh.rotation.y=Math.PI;mesh.scale.x=-1;
    return mesh;
  }

  // A flat rug defines the meeting zone without introducing a walking obstacle.
  box(group,3.34,.008,3.85,mat('#a9bbc5'),cx,floorY+.008,cz);
  box(group,3.22,.009,3.73,mat('#d5dfe3'),cx,floorY+.012,cz);
  const shape=new THREE.Shape(),w=1.6,d=2.85,r=.2;
  shape.moveTo(-w/2+r,-d/2);shape.lineTo(w/2-r,-d/2);
  shape.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);shape.lineTo(w/2,d/2-r);
  shape.quadraticCurveTo(w/2,d/2,w/2-r,d/2);shape.lineTo(-w/2+r,d/2);
  shape.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);shape.lineTo(-w/2,-d/2+r);
  shape.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
  const top=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.075,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,curveSegments:8}),oak);
  top.rotation.x=-Math.PI/2;top.position.set(cx,floorY+.735,cz);
  top.castShadow=top.receiveShadow=true;named(top,'Rounded oak six-person meeting table');group.add(top);
  for(const z of [cz-.89,cz+.89]) {
    box(group,.72,.68,.12,oakEdge,cx,floorY+.37,z);
    box(group,.92,.045,.42,graphite,cx,floorY+.047,z);
  }
  obstacle(cx-.81,cx+.81,cz-1.44,cz+1.44);
  // A recessed cable cover and aligned place settings keep the tabletop uncluttered.
  box(group,.14,.009,.58,graphite,cx,floorY+.821,cz);
  for(const side of [-1,1])for(const z of [cz-.95,cz,cz+.95]) {
    const setting=new THREE.Group();setting.position.set(cx+side*.47,floorY+.825,z);
    setting.rotation.y=side*Math.PI/2;group.add(setting);
    box(setting,.36,.008,.3,navy);
    box(setting,.25,.012,.21,paper,-.025,.011,-.015);
    box(setting,.012,.014,.18,brass,.135,.014,-.015);
  }
  function chair(x,z,rotation) {
    const g=new THREE.Group();g.name='Navy upholstered meeting chair';
    g.position.set(x,floorY,z);g.rotation.y=rotation;group.add(g);
    box(g,.51,.1,.5,fabric,0,.47);
    box(g,.5,.5,.075,fabric,0,.77,.215);
    for(const side of [-1,1]) {
      box(g,.035,.23,.035,graphite,side*.255,.59,.10);
      box(g,.065,.035,.34,navy,side*.255,.71,.005);
      for(const zz of [-.18,.18])cylinder(g,.018,.023,.42,graphite,side*.205,.23,zz,8);
    }
    obstacle(x-.31,x+.31,z-.32,z+.32);
  }
  for(const side of [-1,1])for(const z of [cz-.95,cz,cz+.95])chair(cx+side*1.23,z,side*Math.PI/2);

  // Rear presentation wall, with a low cabinet that can be opened by the visitor.
  box(group,2.95,2.30,.045,navy,cx,floorY+1.29,3.675);
  for(const side of [-1,1])for(let i=0;i<4;i++)box(group,.045,2.27,.025,oak,cx+side*(1.19+i*.075),floorY+1.29,3.64);
  const display=named(box(group,1.92,1.02,.065,graphite,cx,floorY+1.73,3.61),'Private meeting room wall display');
  plaque('BARANGAY BUCANA\nPRIVATE MEETING ROOM',1.78,.65,cx,floorY+1.83,3.57,{background:'#17344d',color:'#eff5fa',fontSize:48});
  plaque('COMMUNITY SERVICES  /  PROJECT UPDATES  /  NEXT STEPS',1.78,.16,cx,floorY+1.45,3.568,{background:'#254b66',color:'#c6dce8',fontSize:72});
  const cabinet=new THREE.Group();cabinet.name='Meeting supplies credenza';group.add(cabinet);
  for(const y of [.12,.43,.80])box(cabinet,2.48,.045,.46,oak,cx,floorY+y,3.40);
  box(cabinet,2.48,.68,.025,oakEdge,cx,floorY+.46,3.62);
  for(const x of [cx-1.22,cx,cx+1.22])box(cabinet,.045,.68,.44,oakEdge,x,floorY+.46,3.40);
  for(const x of [cx-.98,cx+.98])for(const z of [3.24,3.56])box(cabinet,.06,.10,.06,graphite,x,floorY+.05,z);
  for(const [i,x] of [cx-.61,cx+.61].entries()) {
    createCabinetDoor(cabinet,interactions,{id:`meeting-cabinet-${i+1}`,label:`Meeting supplies cabinet ${i+1}`,floor:1,
      position:[x,floorY+.46,3.155],width:1.16,height:.62,doorMaterial:stone,handleMaterial:brass});
    for(let j=0;j<4;j++)box(cabinet,.07,.22,.25,j%2?navy:stone,x-.32+j*.09,floorY+.57,3.40);
    box(cabinet,.46,.07,.28,paper,x,floorY+.18,3.40);
  }
  obstacle(cx-1.26,cx+1.26,3.14,3.66);
  // A small tray on the sideboard holds meeting supplies away from the table.
  box(group,.54,.025,.29,navy,cx+.58,floorY+.842,3.37);
  for(const x of [cx+.44,cx+.59,cx+.74]) {
    cylinder(group,.048,.043,.11,paper,x,floorY+.909,3.37,16);
    cylinder(group,.038,.038,.004,graphite,x,floorY+.966,3.37,16);
  }
  function plant(x,z) {
    const p=new THREE.Group();p.name='Meeting room corner planter';p.position.set(x,floorY,z);group.add(p);
    cylinder(p,.22,.16,.38,stone,0,.19,0,20);cylinder(p,.195,.195,.008,soil,0,.383,0,20);
    for(let i=0;i<7;i++) {
      const angle=i*Math.PI*2/7,height=.72+(i%3)*.13;
      cylinder(p,.009,.012,height-.35,oakEdge,Math.cos(angle)*.045,(height+.35)/2,Math.sin(angle)*.045,6);
      const blade=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),leaf);
      blade.position.set(Math.cos(angle)*.16,height,Math.sin(angle)*.16);
      blade.scale.set(.095,.25,.045);blade.rotation.set(Math.sin(angle)*.48,angle,Math.cos(angle)*.48);blade.castShadow=true;p.add(blade);
    }
    obstacle(x-.25,x+.25,z-.25,z+.25);
  }
  plant(-10.75,2.98);plant(-10.75,-2.95);
  // The doorway and entire front cross-aisle remain free of furniture.
  return {group,interactions,display};
}
