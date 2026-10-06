import * as THREE from 'three';
import { box, beam, cylinder, materials } from './primitives.js';

// Photo-inspired upper storey attached to the viewer's left (+X) when facing
// the entrance at negative Z. The construction coordinates are mirrored on X.
// coordinate frame matches the main hall, so both floors join at Y = 3.03 m.
export function createLeftAnnex() {
  const group=new THREE.Group();group.name='Raised left second-floor wing';
  const supports=new THREE.Group();supports.name='Open passage and stone-clad supporting columns';
  const roof=new THREE.Group();roof.name='Left wing navy gable roof and broad soffits';
  const frontWall=new THREE.Group();frontWall.name='Left wing two-window front facade';group.add(frontWall);
  const material=(color,roughness=0.85,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const blue=material('#99c1df'), columnBlue=material('#6c9fc5');
  const soffit=material('#f2eddf'), navy=material('#1e4f85',0.48,0.3);
  navy.side=THREE.DoubleSide;soffit.side=THREE.DoubleSide;
  const dark=material('#222e34',0.48,0.35), grout=material('#636c72');
  const stones=['#a0a7ac','#89959e','#b1b6b8','#75838d'].map(color=>material(color));
  const glass=new THREE.MeshStandardMaterial({color:'#42596c',roughness:0.18,metalness:0.2,transparent:true,opacity:0.67,depthWrite:false});
  const floorY=3.03, wallTop=5.65, centerX=-8.7;
  const lights=[],obstacles=[];
  const obstacle=(minX,maxX,minZ,maxZ)=>obstacles.push({floor:1,minX,maxX,minZ,maxZ});

  for(const x of [-11.20,-6.20]) {
    for(const z of [-3.58,3.58]) {
      box(supports,0.54,0.13,0.54,materials.concrete,x,0.009,z);
      box(supports,0.34,2.73,0.34,columnBlue,x,1.43,z);
      box(supports,0.42,0.18,0.42,blue,x,2.78,z);
      if(z<0) {
        box(supports,0.285,2.48,0.026,grout,x,1.33,z-0.181);
        // Individual horizontal tiles capture the striped stone veneer in the photo.
        for(let row=0;row<22;row++) {
          const y=0.146+row*0.108;
          const split=row%2?0.105:0.175;
          box(supports,split-0.007,0.089,0.034,stones[row%4],x-0.1425+split/2,y,z-0.190);
          box(supports,0.285-split-0.007,0.089,0.034,stones[(row+1)%4],x+split/2,y,z-0.191);
        }
      }
    }
  }
  for(const z of [-3.58,3.58]) box(supports,5.25,0.24,0.32,columnBlue,centerX,2.77,z);
  for(const x of [-11.2,-6.2]) box(supports,0.28,0.24,7.38,columnBlue,x,2.77,0);
  beam(supports,[-11.2,2.82,-3.58],[-6.2,2.82,3.58],0.045,materials.metal);
  box(group,5.4,0.19,7.6,materials.concrete,centerX,2.935,0);
  box(group,5.16,0.015,7.35,soffit,centerX,3.0225,0);
  box(group,5.43,0.15,0.15,columnBlue,centerX,2.975,-3.84);

  const windows=[-10.1,-7.3],windowWidth=1.44,sill=3.97,head=5.27;
  let cursor=-11.4;
  for(const x of windows) {
    const left=x-windowWidth/2,right=x+windowWidth/2;
    box(frontWall,left-cursor,wallTop-floorY,0.18,blue,(left+cursor)/2,(wallTop+floorY)/2,-3.8);
    box(frontWall,windowWidth,sill-floorY,0.18,blue,x,(sill+floorY)/2,-3.8);
    box(frontWall,windowWidth,wallTop-head,0.18,blue,x,(head+wallTop)/2,-3.8);
    for(const side of [-1,1]) box(frontWall,0.06,1.42,0.12,dark,x+side*(windowWidth/2+0.005),4.62,-3.905);
    for(const y of [sill-0.045,head+0.045]) box(frontWall,1.55,0.065,0.12,dark,x,y,-3.905);
    box(frontWall,0.035,1.30,0.085,dark,x,4.62,-3.942);
    for(let blade=0;blade<8;blade++) {
      const louver=box(frontWall,1.36,0.139,0.022,glass,x,sill+0.079+blade*0.158,-3.945);
      louver.name='Front jalousie glass blade';louver.rotation.x=-0.30;louver.castShadow=false;
      box(frontWall,1.37,0.015,0.034,dark,x,sill+0.017+blade*0.158,-3.942);
    }
    cursor=right;
  }
  box(frontWall,-6-cursor,wallTop-floorY,0.18,blue,(-6+cursor)/2,(wallTop+floorY)/2,-3.8);
  box(group,0.18,wallTop-floorY,7.6,blue,-11.4,(wallTop+floorY)/2,0);
  box(group,5.4,wallTop-floorY,0.18,blue,centerX,(wallTop+floorY)/2,3.8);
  // The right wall has a full-height opening that aligns with the hall doorway.
  box(group,0.18,wallTop-floorY,6.15,blue,-6,(wallTop+floorY)/2,0.725);
  box(group,0.18,wallTop-floorY,0.35,blue,-6,(wallTop+floorY)/2,-3.625);
  box(group,0.18,0.42,1.10,blue,-6,5.44,-2.9);
  for(const x of [-11.30,-6.10]) box(frontWall,0.17,wallTop-floorY,0.22,columnBlue,x,(wallTop+floorY)/2,-3.81);

  const eave=5.8,ridge=6.78,leftX=-11.95,rightX=-5.95,zFront=-4.34,zBack=4.34;
  function panel(vertices,mat,parent=roof) {
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));
    geo.setIndex(vertices.length===3?[0,1,2]:[0,1,2,0,2,3]);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  for(const endZ of [-3.8,3.8]) {
    panel([[-11.4,wallTop,endZ],[-6,wallTop,endZ],[centerX,ridge-0.10,endZ]],soffit);
  }
  for(const edgeX of [leftX,rightX]) {
    const positions=[],indices=[],segmentsX=16,segmentsZ=168;
    for(let zi=0;zi<=segmentsZ;zi++) {
      const z=zFront+(zBack-zFront)*zi/segmentsZ;
      for(let xi=0;xi<=segmentsX;xi++) {
        const t=xi/segmentsX,x=edgeX+(centerX-edgeX)*t;
        const y=eave+(ridge-eave)*t+0.017*Math.cos((z-zFront)*Math.PI*2/0.215);
        positions.push(x,y,z);
        if(zi<segmentsZ&&xi<segmentsX){const a=zi*(segmentsX+1)+xi,b=a+segmentsX+1;indices.push(a,b,a+1,a+1,b,b+1);}
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
    const sheet=new THREE.Mesh(geo,navy);sheet.castShadow=true;sheet.receiveShadow=true;roof.add(sheet);
    panel([[edgeX,eave-0.08,zFront],[centerX,ridge-0.08,zFront],[centerX,ridge-0.08,zBack],[edgeX,eave-0.08,zBack]],soffit);
    box(roof,0.12,0.16,zBack-zFront+0.12,navy,edgeX,eave-0.025,0);
    for(const z of [zFront,zBack]) {
      beam(roof,[edgeX,eave+0.006,z],[centerX,ridge+0.006,z],0.058,navy,8);
      beam(roof,[edgeX,eave-0.085,z],[centerX,ridge-0.085,z],0.025,materials.wood,6);
    }
  }
  beam(roof,[centerX,ridge+0.01,zFront],[centerX,ridge+0.01,zBack],0.053,navy,8);
  box(roof,5.36,0.075,7.54,soffit,centerX,5.625,0);
  const vent=material('#927957');
  for(const endZ of [-3.908,3.908]) {
    box(roof,0.83,0.22,0.027,vent,centerX,5.995,endZ);
    for(let i=0;i<5;i++)box(roof,0.79,0.018,0.035,materials.wood,centerX,5.916+i*0.039,endZ);
  }
  for(const x of [-11.34,-6.58]) {
    box(roof,0.46,0.014,0.41,vent,x,5.695,-3.93);
    for(let i=0;i<5;i++)box(roof,0.43,0.020,0.022,materials.wood,x,5.682,-4.095+i*0.076);
  }

  // Neutral furnishings leave the new wing's purpose open while keeping it explorable.
  box(group,1.8,0.085,0.85,materials.wood,-9.1,floorY+0.79,-0.45);
  for(const x of [-9.85,-8.35])for(const z of [-0.75,-0.15])box(group,0.065,0.75,0.065,materials.dark,x,floorY+0.375,z);
  box(group,0.26,0.03,0.34,soffit,-9.34,floorY+0.85,-0.46);
  box(group,0.24,0.06,0.32,materials.green,-8.94,floorY+0.85,-0.36);
  function chair(x,z,rotation=0) {
    const g=new THREE.Group();g.position.set(x,floorY,z);g.rotation.y=rotation;group.add(g);
    box(g,0.46,0.10,0.46,materials.green,0,0.46,0);
    box(g,0.46,0.44,0.08,materials.green,0,0.72,0.19);
    for(const dx of [-0.18,0.18])for(const dz of [-0.18,0.18])cylinder(g,0.021,0.021,0.42,materials.metal,dx,0.21,dz,6);
    obstacle(x-0.25,x+0.25,z-0.27,z+0.27);
  }
  chair(-9.65,0.55);chair(-8.55,0.55);chair(-10.9,1.75,Math.PI/2);chair(-10.9,2.65,Math.PI/2);
  obstacle(-10.0,-8.2,-0.88,-0.02);
  obstacle(-11.49,-11.31,-3.8,3.8);obstacle(-11.4,-6.0,-3.89,-3.71);obstacle(-11.4,-6.0,3.71,3.89);
  obstacle(-6.09,-5.91,-3.8,-3.45);obstacle(-6.09,-5.91,-2.35,3.8);
  const glow=new THREE.MeshStandardMaterial({color:'#fff5dc',emissive:'#ffddb3',emissiveIntensity:0.3});
  const fixture=cylinder(group,0.20,0.20,0.045,glow,centerX,5.535,0,20);fixture.userData.nightGlow=true;
  const light=new THREE.PointLight('#ffe3bd',6,9,2);light.position.set(centerX,5.40,0);light.userData.dayIntensity=6;light.userData.nightIntensity=14;group.add(light);lights.push(light);
  group.scale.x=-1;supports.scale.x=-1;roof.scale.x=-1;
  const bounds={minX:5.99,maxX:11.1,minZ:-3.5,maxZ:3.5};
  const room={id:'annex',name:'Left Second-Floor Wing',floor:1,position:[7.4,4.63,-2.9],yaw:-2.534,pitch:-0.10,description:'The pale blue upper wing sits above an open passage and connects to the main hall.',bounds};
  const worldObstacles=obstacles.map(o=>({...o,minX:-o.maxX,maxX:-o.minX}));
  return {group,supports,roof,frontWall,lights,room,obstacles:worldObstacles,bounds};
}
