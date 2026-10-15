import * as THREE from 'three';
import {HALL_STAIRS} from './models/HallLayout.js';

const SVG='http://www.w3.org/2000/svg';
const COLORS={surveillance:'#176f98',access:'#315eae',emergency:'#bd3549',egress:'#218265',storage:'#9b7023',barrier:'#596e83'};

/** Screen-space callouts anchored to the actual 3D equipment in each floor view. */
export function createSecurityLabels({model,camera,cctv,emergency,security,access,motion,getView,onRequestFloor,onFocus,onReset}) {
  const layer=document.querySelector('#security-annotations');
  const toolbar=document.querySelector('#annotation-toolbar');
  const select=document.querySelector('#annotation-feature');
  const toggle=document.querySelector('#labels-toggle');
  const features=[];
  const anchor=(object,offset=[0,0,0])=>({object,offset:new THREE.Vector3(...offset)});
  const fixed=position=>({position:new THREE.Vector3(...position)});
  const add=(floor,name,detail,type,anchors)=>{
    const number=features.filter(f=>f.floor===floor).length+1;
    features.push({id:`${floor+1}-${String(number).padStart(2,'0')}`,floor,number,name,detail,type,anchors});
  };
  for(const floor of [0,1]) {
    for(const feed of cctv.feeds.filter(f=>f.floor===floor)) {
      add(floor,`CCTV camera ${feed.id}`,feed.label.toLowerCase().replaceAll('_',' '),'surveillance',[anchor(feed.group)]);
    }
    if(floor===0) {
      add(0,'Security detector','Entrance · virtual weapon screening','access',[anchor(security.group,[0,1.75,0])]);
      const cabinet=model.interactions.find(i=>i.id==='tanod-records-lock');
      add(0,'Locked filing cabinet','Tanod office · demo key lock','storage',[anchor(cabinet.moving)]);
      add(0,'Emergency button','First floor · activates both floors','emergency',[anchor(emergency.button)]);
      add(0,'Red warning light','First floor · emergency alert','emergency',[anchor(emergency.beacons[0].group)]);
      const exit=model.interactions.find(i=>i.id==='fire-exit-door');
      add(0,'Fire exit door','Rear push bar · outward opening','egress',[anchor(exit.moving,[0.7,1.4,0])]);
      const grilles=[];
      model.group.traverse(o=>{if(o.userData.windowGrille)grilles.push(anchor(o));});
      add(0,'Window security grilles','8 ground-floor windows','barrier',grilles);
      add(0,'Stair safety rails','Clear route to the second floor','egress',[
        fixed([HALL_STAIRS.railLeft,2.4,1.2]),fixed([HALL_STAIRS.railRight,2.4,1.2]),
      ]);
      add(0,'Main-door motion sensor','Movement alert · virtual visitor','access',[anchor(motion.group)]);
    } else {
      add(1,'CCTV monitoring screen','Captain’s office · five live views','surveillance',[anchor(cctv.monitor.group,[0,0,0.06])]);
      for(const area of access.areas) {
        add(1,'RFID card reader',area.name,'access',[anchor(area.group)]);
        const p=area.door.obstacle;
        const center=new THREE.Vector3((p.minX+p.maxX)/2,4.4,(p.minZ+p.maxZ)/2);
        const offset=area.door.moving.worldToLocal(center).toArray();
        // Mark the access point even when its facade is removed by the cutaway.
        add(1,'RFID-controlled door',area.name,'access',[{...anchor(area.door.moving,offset),cutaway:true}]);
      }
      const cabinet=model.interactions.find(i=>i.id==='captain-records-lock');
      add(1,'Locked records cabinet','Captain’s office · demo key lock','storage',[anchor(cabinet.moving)]);
      add(1,'Red warning light','Second floor · emergency alert','emergency',[anchor(emergency.beacons[1].group)]);
      add(1,'Stairwell safety rails','Guards the open stairwell','egress',[fixed([4.55,4.05,HALL_STAIRS.openingFront])]);
    }
  }

  const svg=document.createElementNS(SVG,'svg');
  svg.setAttribute('aria-hidden','true');
  svg.classList.add('annotation-lines');
  const defs=document.createElementNS(SVG,'defs');
  for(const [type,color] of Object.entries(COLORS)) {
    const marker=document.createElementNS(SVG,'marker');
    for(const [key,value] of Object.entries({id:`callout-arrow-${type}`,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:6,markerHeight:6,orient:'auto'}))marker.setAttribute(key,String(value));
    const arrow=document.createElementNS(SVG,'path');arrow.setAttribute('d','M 0 1 L 9 5 L 0 9 Z');arrow.setAttribute('fill',color);
    marker.append(arrow);defs.append(marker);
  }
  svg.append(defs);layer.append(svg);
  for(const f of features) {
    const card=document.createElement('div');card.className='security-callout';card.dataset.feature=f.id;
    card.style.setProperty('--callout-color',COLORS[f.type]);
    const badge=document.createElement('span');badge.className='callout-number';badge.textContent=f.id;
    const text=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('small');
    name.textContent=f.name;detail.textContent=f.detail;text.append(name,detail);card.append(badge,text);
    card.setAttribute('role','listitem');layer.append(card);f.card=card;
    f.lines=f.anchors.map(()=>{
      const group=document.createElementNS(SVG,'g'),line=document.createElementNS(SVG,'path'),dot=document.createElementNS(SVG,'circle');
      line.setAttribute('fill','none');line.setAttribute('stroke',COLORS[f.type]);line.setAttribute('stroke-width','1.5');
      line.setAttribute('marker-end',`url(#callout-arrow-${f.type})`);
      dot.setAttribute('r','3');dot.setAttribute('fill','#fff');dot.setAttribute('stroke',COLORS[f.type]);dot.setAttribute('stroke-width','1.5');
      group.append(line,dot);svg.append(group);return {group,line,dot};
    });
  }
  let enabled=true,selection='all',previousMode='',lastTime=-Infinity,lastMeasured=-Infinity;
  let ui={};
  const point=new THREE.Vector3(),projected=new THREE.Vector3();
  const visible=object=>{for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;};
  const worldPoint=(a,out)=>a.object?a.object.localToWorld(out.copy(a.offset)):out.copy(a.position);
  const compact=()=>innerWidth<1100||innerHeight<620;
  const floorForView=()=>getView()==='ground'?0:getView()==='session'?1:null;

  function rebuild(floor) {
    const list=features.filter(f=>f.floor===floor);
    selection=compact()?list[0].id:'all';
    select.replaceChildren();
    if(!compact())select.add(new Option('All security features','all'));
    for(const f of list)select.add(new Option(`${f.id} · ${f.name} — ${f.detail}`,f.id));
    select.value=selection;
    document.querySelector('#annotation-floor').textContent=`${floor===0?'FIRST':'SECOND'} FLOOR · ${list.length} FEATURES`;
  }
  select.addEventListener('change',()=>{
    selection=select.value;
    const feature=features.find(f=>f.id===selection);
    if(feature)onFocus(worldPoint(feature.anchors.find(a=>!a.object||visible(a.object))??feature.anchors[0],new THREE.Vector3()));else onReset();
  });
  function setEnabled(value) {enabled=Boolean(value);lastTime=-Infinity;}
  toggle.addEventListener('click',()=>{
    if(floorForView()===null) {setEnabled(true);onRequestFloor();}
    else setEnabled(!enabled);
  });
  function hideFeature(f) {f.card.hidden=true;for(const l of f.lines)l.group.style.display='none';}

  function update(time) {
    if(time-lastTime<33) return;lastTime=time;
    const floor=floorForView(),active=enabled&&floor!==null;
    toggle.setAttribute('aria-pressed',String(active));
    toggle.setAttribute('aria-label',active?'Hide security feature labels':'Show security feature labels');
    toggle.title=active?'Hide security callouts':'Show a labeled floor view';
    layer.hidden=toolbar.hidden=!active;
    if(!active)return;
    const mode=`${floor}:${compact()}`;
    if(mode!==previousMode){rebuild(floor);previousMode=mode;lastMeasured=-Infinity;}
    const w=innerWidth,h=innerHeight;
    if(time-lastMeasured>200) {
      lastMeasured=time;
      const explorer=document.querySelector('.explorer').getBoundingClientRect();
      const actions=document.querySelector('.top-actions').getBoundingClientRect();
      const mobile=w<=760,left=mobile?14:explorer.right+16;
      const rowSpace=actions.left-left-12;
      const top=mobile?67:rowSpace>=280?26:84;
      const width=mobile?w-28:Math.min(320,w-left-20,rowSpace>=280?rowSpace:320);
      toolbar.style.left=`${left}px`;toolbar.style.top=`${top}px`;toolbar.style.width=`${width}px`;
      ui={left:mobile?14:explorer.right+16,top:top+88};
    }
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const candidates=[];
    camera.updateMatrixWorld();
    for(const f of features) {
      hideFeature(f);
      if(f.floor!==floor||(selection!=='all'&&f.id!==selection))continue;
      const points=[];
      f.anchors.forEach((a,index)=>{
        if(a.object&&!a.cutaway&&!visible(a.object))return;
        worldPoint(a,point);projected.copy(point).project(camera);
        if(projected.z<=-1||projected.z>=1||Math.abs(projected.x)>1||Math.abs(projected.y)>1)return;
        points.push({x:(projected.x+1)*w/2,y:(1-projected.y)*h/2,index});
      });
      if(points.length)candidates.push({f,points,x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length});
    }
    const cardWidth=compact()?Math.min(270,w-ui.left-14):Math.min(202,(w-ui.left-50)/3);
    const cardHeight=52,gap=9,minY=ui.top,maxY=h-76;
    function place(item,x,y,side) {
      const f=item.f;f.card.hidden=false;f.card.style.width=`${cardWidth}px`;f.card.style.transform=`translate(${x}px,${y}px)`;
      for(const p of item.points) {
        const line=f.lines[p.index];line.group.style.display='';
        const startX=side==='left'?x+cardWidth:side==='right'?x:x+cardWidth/2;
        const startY=side==='top'?y+cardHeight:y+cardHeight/2;
        const elbowX=startX+(side==='left'?18:side==='right'?-18:0);
        const elbowY=side==='top'?startY+14:startY;
        line.line.setAttribute('d',`M${startX},${startY} L${elbowX},${elbowY} L${p.x},${p.y}`);
        line.dot.setAttribute('cx',String(p.x));line.dot.setAttribute('cy',String(p.y));
      }
    }
    if(compact()) {
      if(candidates[0])place(candidates[0],ui.left+(w-ui.left-14-cardWidth)/2,minY,'top');
    } else {
      candidates.sort((a,b)=>a.x-b.x);
      const split=Math.ceil(candidates.length/2);
      for(const [side,list] of [['left',candidates.slice(0,split)],['right',candidates.slice(split)]]) {
        list.sort((a,b)=>a.y-b.y);
        const ys=[];
        for(let i=0;i<list.length;i++)ys[i]=Math.max(minY,Math.min(maxY-cardHeight,list[i].y-cardHeight/2),i?ys[i-1]+cardHeight+gap:minY);
        for(let i=list.length-1;i>=0;i--)ys[i]=Math.min(ys[i],i===list.length-1?maxY-cardHeight:ys[i+1]-cardHeight-gap);
        list.forEach((item,i)=>place(item,side==='left'?ui.left:w-cardWidth-18,ys[i],side));
      }
    }
  }
  return {features,update,setEnabled,get enabled(){return enabled;},get selected(){return selection;}};
}
