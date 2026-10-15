import * as THREE from 'three';
import {box, cylinder, beam} from './primitives.js';

/** Parted, tied-back fabric curtains on the indoor (+Z) face of a facade. */
export function createWindowCurtains(parent, {x, floorY, width, bottom, top}) {
  const group = new THREE.Group();
  group.name = 'Captain office window curtains';
  group.userData.windowCurtains = true;
  group.position.set(x, 0, 0.27);
  parent.add(group);
  const fabric = new THREE.MeshStandardMaterial({color:'#ebe2d0',roughness:1,side:THREE.DoubleSide});
  const metal = new THREE.MeshStandardMaterial({color:'#526270',roughness:0.4,metalness:0.65});
  const trim = new THREE.MeshStandardMaterial({color:'#b69c66',roughness:0.6,metalness:0.2});
  const rodY = floorY + top + 0.18;
  const rodLength = width + 0.38;
  const rod = cylinder(group,0.018,0.018,rodLength,metal,0,rodY,0,12);
  rod.rotation.z = Math.PI/2;
  for(const side of [-1,1]) {
    beam(group,[side*(width/2+0.13),rodY,-0.16],[side*(width/2+0.13),rodY,0],0.012,metal,8);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.034,12,8),metal);
    finial.position.set(side*(rodLength/2+0.015),rodY,0);
    group.add(finial);
    const panel = new THREE.Group();
    panel.name = `${side<0?'Left':'Right'} gathered curtain panel`;
    group.add(panel);
    const panelWidth = 0.53;
    const outerX = side*(width/2+0.10);
    const panelTop = rodY-0.035;
    const hemY = floorY+bottom-0.015;
    const height = panelTop-hemY;
    const vertices=[],indices=[],uvs=[];
    const columns=40,rows=16;
    for(let row=0;row<=rows;row++) {
      const v=row/rows;
      const pinch=Math.exp(-Math.pow((v-0.73)/0.14,2));
      for(let col=0;col<=columns;col++) {
        const u=col/columns;
        vertices.push(outerX-side*u*panelWidth*(1-0.3*pinch),
          panelTop-v*height-0.006*Math.sin(u*Math.PI*10)*v,
          0.034*Math.cos(u*Math.PI*10)*(1-0.5*pinch)+0.015*Math.sin(v*Math.PI));
        uvs.push(u,1-v);
        if(row<rows&&col<columns) {
          const a=row*(columns+1)+col,b=a+columns+1;
          indices.push(a,b,a+1,a+1,b,b+1);
        }
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    const cloth=new THREE.Mesh(geometry,fabric);
    cloth.name='Pleated ivory curtain fabric';
    cloth.castShadow=true;cloth.receiveShadow=true;
    panel.add(cloth);
    const tieWidth=panelWidth*0.7;
    box(panel,tieWidth+0.015,0.035,0.055,trim,outerX-side*tieWidth/2,panelTop-height*0.73,0.03);
    for(let i=0;i<6;i++) {
      const ring=new THREE.Mesh(new THREE.TorusGeometry(0.024,0.004,6,12),metal);
      ring.rotation.y=Math.PI/2;
      ring.position.set(outerX-side*panelWidth*(i+0.5)/6,rodY-0.01,0);
      panel.add(ring);
    }
  }
  return group;
}
