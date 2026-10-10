/* NEO SYSTEMS — Direction J: the 3D world (Three.js)
   A white architectural model of the NEO LINE, generated entirely in code:
   no model files, textures or photos (only the station signs are drawn on a
   canvas). Each frame it reads the journey that main.js writes to
   window.NEOLINE, places the train, moves the camera to that leg's shot and
   sets the light for the time of day: morning at 日本橋, low sun at the end. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const S=window.NEOLINE||{x:0,v:0,i:0,tt:0,dirty:true,visible:true,static:true};
const root=document.documentElement;
const stage=document.querySelector('.stage');
const canvas=document.querySelector('.gl');

/* ---------- the line (metres) ---------- */
const SX=[0,470,940,1410,1880,2350,2820], END=SX[6], LINE_END=END+92;
const RIV0=650, RIV1=850, BR=[660,720,780,840]; // the river and its truss bridge (three spans)
const CAR=20, GAP=.6, W=2.9, H=3.7, TRAIN=3*CAR+2*GAP;
// track-bed height: a viaduct through the city, then down to an embankment for the homes and fields
function deckY(x){if(x<1060)return 8;if(x<1260){const t=(x-1060)/200;return 8-5.5*t*t*(3-2*t)}return 2.5}
function slope(x){return (deckY(x+2)-deckY(x-2))/4}
function zone(x){return x<300?0:x<650?1:x<1000?2:x<1600?3:x<2150?4:x<2650?5:6}
let seed=20230401;
function R(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
const nearStation=x=>SX.some(X=>x>X-80&&x<X+16);
const stationLot=(x,z)=>z<0&&z>-58&&SX.some(X=>x>X-104&&x<X+36); // ground kept clear behind each platform
const smooth=t=>t*t*(3-2*t), smoother=t=>t*t*t*(t*(t*6-15)+10);
const mixv=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);

async function main(){
  const phone=matchMedia('(max-width: 700px)').matches;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,phone?1.5:1.75));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.outputColorSpace=THREE.SRGBColorSpace;

  const scene=new THREE.Scene();
  const pmrem=new THREE.PMREMGenerator(renderer);
  scene.environment=pmrem.fromScene(new RoomEnvironment(renderer),.04).texture;
  scene.fog=new THREE.Fog(0xe6edf5,330,780);
  const hemi=new THREE.HemisphereLight(0xffffff,0xc9d1dc,.5);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff1e0,2.6);sun.castShadow=true;
  const SM=phone?2048:4096, SB=190;
  sun.shadow.mapSize.set(SM,SM);sun.shadow.bias=-.00025;sun.shadow.normalBias=.18;
  Object.assign(sun.shadow.camera,{left:-SB,right:SB,top:SB,bottom:-SB,near:1,far:1000});
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun,sun.target);

  /* materials: matte "clay" whites; colour only where it carries meaning */
  const M=(c,r=.9,m=0,env=.4)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,envMapIntensity:env});
  const mat={
    clay:M(0xf3f3f1), clay2:M(0xe9ebed), clay3:M(0xdfe2e6), ground:M(0xe9ecef,.96,0,.3), road:M(0xe0e3e7,.96,0,.3),
    field1:M(0xe2e7da,.96), field2:M(0xd7ded0,.96), row:M(0xcbd4c2,.96), tree:M(0xf0f1ee,.85), sand:M(0xefeae1,.96),
    water:M(0xb4c8da,.32,0,.45), glass:M(0x4b5a74,.18,.5,1), glass2:M(0xb3bfcd,.15,.4,1), steel:M(0xb9bfc8,.4,.6,.8), dark:M(0x3a404b,.7),
    body:M(0xf7f7f5,.32,.05,1), navy:M(0x22348c,.5,0,.6), tactile:M(0xe6c24f,.7),
    cyan:new THREE.MeshStandardMaterial({color:0x00a0e0,emissive:0x00a0e0,emissiveIntensity:.4,roughness:.5})
  };

  /* geometry, shared by thousands of instances */
  const box=new THREE.BoxGeometry(1,1,1);
  const house=(()=>{ // walls + a gable roof on a 1×1 footprint, 1 high
    const w=new THREE.BoxGeometry(1,.62,1).toNonIndexed();w.translate(0,.31,0);
    const sh=new THREE.Shape();sh.moveTo(-.56,0);sh.lineTo(.56,0);sh.lineTo(0,.38);sh.closePath();
    const r=new THREE.ExtrudeGeometry(sh,{depth:1.06,bevelEnabled:false});r.translate(0,.62,-.53);
    return mergeGeometries([w,r]);
  })();
  const tree=(()=>{ // the architectural-model tree: a sphere on a stick
    const c=new THREE.IcosahedronGeometry(.55,1);c.translate(0,1.25,0);
    const t=new THREE.CylinderGeometry(.05,.07,.8,6).toNonIndexed();t.translate(0,.4,0);
    return mergeGeometries([c,t]);
  })();
  const pine=(()=>{
    const c=new THREE.ConeGeometry(.5,1.5,7).toNonIndexed();c.translate(0,1.25,0);
    const t=new THREE.CylinderGeometry(.05,.06,.6,5).toNonIndexed();t.translate(0,.3,0);
    return mergeGeometries([c,t]);
  })();
  const slab=new THREE.CylinderGeometry(1,1,1,44); // one layer of a contour-model hill
  const emb=(()=>{ // embankment cross-section (16 m base, 11.2 m top), extruded 1 m along the line
    const sh=new THREE.Shape();sh.moveTo(-8,0);sh.lineTo(8,0);sh.lineTo(5.6,1);sh.lineTo(-5.6,1);sh.closePath();
    const g=new THREE.ExtrudeGeometry(sh,{depth:1,bevelEnabled:false});g.rotateY(-Math.PI/2);g.translate(.5,0,0);return g;
  })();
  const TYPES={ // geometry, material, casts shadow?
    b1:[box,mat.clay], b2:[box,mat.clay2], b3:[box,mat.clay3], road:[box,mat.road,0], house:[house,mat.clay],
    tree:[tree,mat.tree], pine:[pine,mat.tree], hill:[slab,mat.clay3], f1:[box,mat.field1], f2:[box,mat.field2], row:[box,mat.row,0],
    sand:[box,mat.sand,0], deck:[box,mat.clay], pier:[box,mat.clay2], emb:[emb,mat.clay2], bal:[box,mat.clay3],
    rail:[box,mat.steel,0], par:[box,mat.clay], cy:[box,mat.cyan,0], pole:[box,mat.steel], wire:[box,mat.dark,0],
    truss:[box,mat.clay2], tact:[box,mat.tactile,0], glass:[box,mat.glass2]
  };
  // instances are bucketed by type and by 350 m stretch of line, so off-screen stretches are culled
  const B=new Map();let total=0;
  function add(t,it){const k=t+'|'+Math.floor((it[0]+1100)/350);let b=B.get(k);if(!b)B.set(k,b={t,items:[]});b.items.push(it);total++}
  const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_p=new THREE.Vector3(),_s=new THREE.Vector3(),_e=new THREE.Euler();
  function build(){
    for(const b of B.values()){
      const [geo,mt,cast]=TYPES[b.t], im=new THREE.InstancedMesh(geo,mt,b.items.length);
      b.items.forEach((o,i)=>{_p.set(o[0],o[1],o[2]);_e.set(0,o[6]||0,o[7]||0);_q.setFromEuler(_e);_s.set(o[3],o[4],o[5]);_m.compose(_p,_q,_s);im.setMatrixAt(i,_m)});
      im.castShadow=cast!==0;im.receiveShadow=true;im.computeBoundingSphere();scene.add(im);
    }
  }
  function plane(w,d,m,x,y,z){const g=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m);g.rotation.x=-Math.PI/2;g.position.set(x,y,z);g.receiveShadow=true;scene.add(g);return g}

  /* ---------- ground, river, sea ---------- */
  plane(9000,4000,mat.ground,1400,0,0);
  plane(RIV1-RIV0,4000,mat.water,(RIV0+RIV1)/2,.06,0);
  plane(4000,2000,mat.water,4130,.06,1024);   // the sea, on the near side from the coast on
  plane(3000,400,mat.water,4485,.06,-176);    // and wrapping round the end of the line
  add('pier',[RIV0-2,.7,0,1.4,1.4,4000]);add('pier',[RIV1+2,.7,0,1.4,1.4,4000]); // river walls

  /* ---------- the line: viaduct / embankment, track, parapet with the cyan line, overhead wire ---------- */
  for(let x=-1100;x<LINE_END;x+=10){
    const xc=x+5, h=deckY(xc), pz=Math.atan(slope(xc)), L=10.06, onBridge=xc>BR[0]&&xc<BR[3];
    if(h>3.4)add('deck',[xc,h-.75,0,L,1.5,onBridge?9.4:11,0,pz]);else add('emb',[xc,0,0,L,h,1,0,pz]);
    add('bal',[xc,h+.17,0,L,.35,4.4,0,pz]);
    add('rail',[xc,h+.44,-.75,L,.18,.12,0,pz]);add('rail',[xc,h+.44,.75,L,.18,.12,0,pz]);
    add('par',[xc,h+.55,5.25,L,1.1,.4,0,pz]);add('cy',[xc,h+.96,5.47,L,.14,.05,0,pz]);
    if(!nearStation(xc))add('par',[xc,h+.55,-5.25,L,1.1,.4,0,pz]);
    add('wire',[xc,h+6.6,0,L,.05,.05,0,pz]);
  }
  for(let x=-1100;x<1270;x+=14){const h=deckY(x);if(h<3.6||(x>BR[0]-12&&x<BR[3]+12))continue;add('pier',[x,(h-1.5)/2,0,1.6,h-1.5,7])}
  for(const x of BR)add('pier',[x,3.25,0,4,6.5,10.5]);
  for(let s=0;s<3;s++)truss(BR[s],BR[s+1]);
  for(let x=-1100;x<LINE_END;x+=50){if(x>BR[0]-6&&x<BR[3]+6)continue;const h=deckY(x);add('pole',[x,h+3.9,5.8,.3,7.8,.3]);add('pole',[x,h+7.1,3.1,.18,.18,5.6])}
  add('b1',[END+82,deckY(END)+1.2,0,2.4,1.6,3.2]);add('cy',[END+82,deckY(END)+2.06,0,2.5,.12,3.3]); // buffer stop

  function member(x1,y1,x2,y2,z,t=.45){const dx=x2-x1,dy=y2-y1;add('truss',[(x1+x2)/2,(y1+y2)/2,z,Math.hypot(dx,dy),t,t,0,Math.atan2(dy,dx)])}
  function truss(a,b){ // a Warren truss span with a gently cambered top chord
    const h=deckY(a), n=8, dx=(b-a)/n, top=j=>h+9+.7*Math.sin(Math.PI*(j+.5)/n);
    for(const z of [-4.6,4.6]){
      for(let j=0;j<n;j++){
        member(a+dx*j,h+.3,a+dx*(j+.5),top(j),z);
        member(a+dx*(j+.5),top(j),a+dx*(j+1),h+.3,z);
        if(j<n-1)member(a+dx*(j+.5),top(j),a+dx*(j+1.5),top(j+1),z,.6);
      }
      member(a,h+.3,b,h+.3,z,.7);
    }
    for(let j=0;j<n;j++)add('truss',[a+dx*(j+.5),top(j)+.1,0,.35,.35,9.2]);
  }

  /* ---------- the city and the business district ---------- */
  const roadZ=[-64,-152,-242,-334], roadX=[];
  for(let x=-1100;x<1000;x+=96)roadX.push(x);
  for(const z of roadZ)add('road',[-50,.02,z,2100,.04,8]);
  for(const x of roadX)if(x<RIV0-40||x>RIV1+40)add('road',[x,.02,-200,7,.04,330]);
  for(let x=-1100;x<1000;x+=17)for(let z=-28;z>-372;z-=17){
    const xx=x+R()*5, zz=z-R()*5, zn=zone(xx), deep=zz<-100;
    if(roadZ.some(r=>Math.abs(zz-r)<10)||roadX.some(r=>Math.abs(xx-r)<9))continue;
    if(xx>RIV0-36&&xx<RIV1+36)continue;
    if(stationLot(xx,zz)||R()<.22)continue;
    const h=zn===0?(deep?14+Math.pow(R(),1.5)*46+(R()<.08?55+R()*70:0):8+R()*20)
           :zn===1?(deep?24+Math.pow(R(),1.2)*80+(R()<.18?60+R()*90:0):12+R()*34)
           :6+R()*16;
    const w=9+R()*6, d=9+R()*6;
    add(['b1','b2','b3'][Math.floor(R()*3)],[xx,h/2,zz,w,h,d]);
    if(h>60&&R()<.5)add('b2',[xx,h+2.5,zz,w*.62,5,d*.62]);
  }
  for(let x=-1100;x<1000;x+=16)for(let z=30;z<330;z+=16){ // the near side stays low, so the camera sees over it
    const xx=x+R()*4, zz=z+R()*4;
    if((xx>RIV0-36&&xx<RIV1+36)||R()<.5)continue;
    const h=1.6+R()*(zone(xx)===1?6:4.5);add(R()<.5?'b1':'b2',[xx,h/2,zz,7+R()*4,h,6+R()*4]);
  }

  /* ---------- homes ---------- */
  for(let x=1000;x<1600;x+=13)for(const sd of [-1,1])for(let z=24;z<300;z+=13){
    const xx=x+R()*3, zz=sd*(z+R()*3);
    if(xx<RIV1+34||stationLot(xx,zz)||(sd>0&&z<44))continue;
    const q=R();
    if(q<.22)continue;
    if(q<.32){if(sd>0&&z<70)continue;const s=6+R()*4;add('tree',[xx,0,zz,s,s,s]);continue}
    if(q<.38&&sd<0){const h=9+R()*8;add('b1',[xx,h/2,zz,20,h,11,R()<.5?0:Math.PI/2]);continue}
    add('house',[xx,0,zz,7+R()*2,6+R()*2.5,8+R()*2,R()<.5?0:Math.PI/2]);
  }

  /* ---------- fields, tree lines and contour hills ---------- */
  for(let x=1600;x<2150;x+=38)for(const sd of [-1,1])for(let z=26;z<300;z+=30){
    const xx=x+19, zz=sd*(z+15);
    if(stationLot(xx,zz)||(sd>0&&xx>2110))continue;
    const h=.25+R()*.45, rot=R()<.5;add(rot?'f1':'f2',[xx,h/2,zz,34,h,26]);
    for(let r=-10;r<=10;r+=4)rot?add('row',[xx,h+.15,zz+r,32,.3,.9]):add('row',[xx+r*1.3,h+.15,zz,.9,.3,24]);
    if(R()<.12)add('house',[xx+R()*10-5,h,zz+R()*8-4,9,8,10,R()<.5?0:Math.PI/2]);
  }
  for(let x=1600;x<2150;x+=9)for(const zz of [-58,-148,-238,118,208]){if(R()<.35||(zz>0&&x>2110))continue;const s=5+R()*3;add('tree',[x+R()*3,0,zz,s,s,s])}
  function hills(x0,x1,z0,z1,n){ // stacked contour layers, as on a site model
    for(let i=0;i<n;i++){
      const cx=x0+R()*(x1-x0), cz=z0+R()*(z1-z0), r=55+R()*65, L=4+Math.floor(R()*4);
      for(let l=0;l<L;l++){const rr=r*Math.pow(.8,l);add('hill',[cx,l*3.4+1.7,cz,rr,3.4,rr*.72])}
    }
  }
  hills(1680,2160,-215,-390,7);

  /* ---------- the coast and the end of the line ---------- */
  add('sand',[3565,.07,18,2870,.14,12]);add('pier',[3565,.6,12.4,2870,1.2,.8]);
  for(let x=2150;x<2990;x+=7)for(let z=-14;z>-72;z-=8){if(R()<.45)continue;const xx=x+R()*4,zz=z-R()*4;if(stationLot(xx,zz))continue;const s=6+R()*4;add('pine',[xx,0,zz,s,s*1.2,s])}
  for(let x=2150;x<2980;x+=15)for(let z=-82;z>-196;z-=15){if(R()<.6)continue;add('house',[x+R()*4,0,z-R()*4,7+R()*2,6+R()*2,8+R()*2,R()<.5?0:Math.PI/2])}
  hills(2200,3260,-205,-400,10);
  add('b1',[3010,.45,0,100,.9,26]); // promenade pier beyond the terminus
  for(const [bx,bz] of [[2250,96],[2420,84],[2600,100],[2780,90]])add('pier',[bx,.8,bz,64,1.6,3.2]); // breakwaters
  for(let i=0;i<9;i++){const bx=2200+R()*1000, bz=130+R()*260, ry=R()*Math.PI;add('b1',[bx,.7,bz,9,1.2,2.6,ry]);add('b1',[bx,1.7,bz,3.6,1.2,2,ry])}
  {
    const lh=new THREE.Group();
    const parts=[[new THREE.CylinderGeometry(1.1,1.6,16,24),mat.clay,8],[new THREE.CylinderGeometry(1.3,1.3,2.2,16),mat.glass,17.1],[new THREE.ConeGeometry(1.6,1.6,16),mat.clay,19]];
    for(const [g,m,y] of parts){const o=new THREE.Mesh(g,m);o.position.y=y;o.castShadow=o.receiveShadow=true;lh.add(o)}
    lh.position.set(3056,.9,0);scene.add(lh);
  }

  /* ---------- stations ---------- */
  const signs=[];
  SX.forEach((X,k)=>{
    const h=deckY(X), px=X-32;
    if(h<3.4)add('b1',[px,h/2,-4.25,88,h,5.1]); // at ground level the platform stands on its own base
    add('b1',[px,h+.55,-4.25,88,1.1,5.1]);
    add('tact',[px,h+1.12,-2,88,.04,.35]);
    if(k<6){ // a thin canopy on slender columns
      add('b1',[X-34,h+7.25,-4.5,72,.3,6.6]);
      add('cy',[X-34,h+7.05,-1.25,72,.08,.12]);
      for(let x=X-68;x<=X;x+=11)add('pole',[x,h+4.1,-6.3,.35,6.2,.35]);
    }
    building(k,X,h);
    for(const sx of [X-18,X-54])signs.push([sx,h,k]);
  });
  function building(k,X,h){
    switch(k){
      case 0:add('b2',[X-36,7.5,-30,72,15,22]);add('glass',[X-36,9.4,-18.9,68,2.2,.2]);add('b1',[X-36,15.4,-30,74,.8,24]);add('b1',[X-48,18.5,-33,30,5.4,12]);break;
      case 1:add('b2',[X-30,9,-25,62,18,20]);add('b1',[X-46,48,-34,24,96,24]);add('glass',[X-46,48,-21.9,20,92,.2]);break;
      case 2:add('b2',[X-30,6.5,-22,48,13,16]);add('glass',[X-30,9.6,-13.9,44,2.4,.2]);break;
      case 3:add('house',[X-30,0,-16,26,9.5,12]);break;
      case 4:add('b1',[X-24,h+2.7,-5.4,12,3.2,3.4]);break;
      case 5:add('b2',[X-30,5,-17,32,10,12]);add('glass',[X-30,6,-10.9,28,2.2,.2]);break;
      case 6:ribs(X,h);add('b2',[X+112,6,0,34,12,52]);add('glass',[X+94.9,6,0,.2,3,46]);break;
    }
  }
  function ribs(X,h){ // the terminus: a ribbed vault, open so the train stays in view
    const g=new THREE.TorusGeometry(14,.28,6,40,Math.PI);g.rotateY(Math.PI/2);
    const im=new THREE.InstancedMesh(g,mat.clay,11);let i=0;
    for(let x=X-72;x<=X+8;x+=8){_m.makeTranslation(x,h-1.5,-2);im.setMatrixAt(i++,_m)}
    im.castShadow=im.receiveShadow=true;im.computeBoundingSphere();scene.add(im);total+=i;
    add('b1',[X-32,h+12.4,-2,82,.4,.4]);add('b1',[X-32,h+7.2,-1.62,82,.25,.25]);
  }

  build();
  const dc=document.querySelector('[data-count]');if(dc)dc.textContent='約'+(Math.round(total/100)*100).toLocaleString('ja-JP');

  /* station signs (canvas textures, once the fonts are in) */
  const NM=['日本橋','クラウド','DX支援','ITコンサルティング','SES','受託開発','あなたのビジネス'];
  const EN=['Nihombashi','Cloud Solution','DX Support','IT Consulting','System Engineering Service','Custom Development','Your Business'];
  const short=n=>n.replace('ITコンサルティング','ITコンサル');
  function signTex(k){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d');
    x.fillStyle='#fff';x.fillRect(0,0,1024,256);
    x.fillStyle='#22348c';x.fillRect(0,204,1024,52);x.fillStyle='#00a0e0';x.fillRect(0,198,1024,8);
    x.lineWidth=14;x.strokeStyle='#00a0e0';x.beginPath();x.arc(118,100,60,0,7);x.stroke();
    x.fillStyle='#111827';x.textAlign='center';x.font='600 28px Inter';x.fillText('NS',118,90);x.font='600 44px Inter';x.fillText('0'+(k+1),118,136);
    x.font='700 '+(NM[k].length>6?62:92)+'px "Noto Sans JP"';x.fillText(NM[k],572,128);
    x.font='500 28px Inter';x.fillStyle='#4b5563';x.fillText(EN[k],572,176);
    x.fillStyle='#fff';x.font='500 26px "Noto Sans JP"';
    if(k>0){x.textAlign='left';x.fillText('← '+short(NM[k-1]),24,240)}
    x.textAlign='right';x.fillText(k<6?short(NM[k+1])+' →':'終点',1000,240);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
  }
  document.fonts.load('700 92px "Noto Sans JP"',NM.join('')+'終点←→').then(()=>document.fonts.load('600 44px Inter','NS0123456789')).catch(()=>{}).then(()=>{
    const geo=new THREE.PlaneGeometry(7,1.75), mats=[];
    for(const [sx,h,k] of signs){
      const m=mats[k]||(mats[k]=new THREE.MeshStandardMaterial({map:signTex(k),roughness:.6,envMapIntensity:.4}));
      const o=new THREE.Mesh(geo,m);o.position.set(sx,h+6.12,-1.62);scene.add(o);
    }
    S.dirty=true;
  });

  /* ---------- the train: extruded side profile, a continuous glass band, the NEO LINE stripes ---------- */
  function carShape(nose){
    const s=new THREE.Shape();
    s.moveTo(.4,0);
    if(nose){s.lineTo(CAR-4.5,0);s.bezierCurveTo(CAR-1.2,0,CAR,.6,CAR,1.5);s.bezierCurveTo(CAR,2.6,CAR-1.6,H,CAR-4.8,H)}
    else{s.lineTo(CAR-.4,0);s.quadraticCurveTo(CAR,0,CAR,.4);s.lineTo(CAR,H-.5);s.quadraticCurveTo(CAR,H,CAR-.5,H)}
    s.lineTo(.5,H);s.quadraticCurveTo(0,H,0,H-.5);s.lineTo(0,.4);s.quadraticCurveTo(0,0,.4,0);
    return s;
  }
  const cars=[];
  for(let i=0;i<3;i++){
    const nose=i!==1, c=new THREE.Group();
    const g=new THREE.ExtrudeGeometry(carShape(nose),{depth:W,bevelEnabled:true,bevelSize:.12,bevelThickness:.12,bevelSegments:4,curveSegments:20});
    g.translate(-CAR/2,0,-W/2);
    c.add(new THREE.Mesh(g,mat.body));
    const x0=-CAR/2+.7, len=nose?CAR-5.6:CAR-1.4;
    for(const sd of [1,-1]){
      const z=sd*(W/2+.135);
      const part=(w,hh,y,m,x)=>{const p=new THREE.Mesh(new THREE.BoxGeometry(w,hh,.05),m);p.position.set(x+w/2,y,z);c.add(p)};
      part(len,.95,2.25,mat.glass,x0);
      part(CAR-.8,.22,1.32,mat.navy,-CAR/2+.4);
      part(CAR-.8,.07,1.15,mat.cyan,-CAR/2+.4);
    }
    if(nose){const ws=new THREE.Mesh(new THREE.BoxGeometry(2.2,1,W+.1),mat.glass);ws.position.set(CAR/2-2.2,2.55,0);ws.rotation.z=-.62;c.add(ws)}
    for(const bx of [-CAR/2+3.4,CAR/2-3.4]){const b=new THREE.Mesh(new THREE.BoxGeometry(3.6,.7,2.4),mat.dark);b.position.set(bx,-.25,0);c.add(b)}
    const roof=new THREE.Mesh(new THREE.BoxGeometry(5,.45,1.8),mat.clay2);roof.position.set(0,H+.25,0);c.add(roof);
    if(i===1){ // pantograph, touching the wire
      for(const a of [-.5,.5]){const arm=new THREE.Mesh(new THREE.BoxGeometry(2.1,.08,.08),mat.steel);arm.position.set(-3+a*1.6,H+1.15,0);arm.rotation.z=-a*1.1;c.add(arm)}
      const head=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,2.2),mat.steel);head.position.set(-3,H+1.7,0);c.add(head);
    }
    c.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true});
    if(i===2)c.scale.x=-1; // the rear car faces backwards
    const holder=new THREE.Group();holder.add(c);scene.add(holder);cars.push(holder);
  }
  function placeTrain(x){
    for(let i=0;i<3;i++){const xc=x-CAR/2-i*(CAR+GAP),h=deckY(xc);cars[i].position.set(xc,h+1.25,0);cars[i].rotation.z=Math.atan(slope(xc))}
  }

  /* ---------- camera: a composed shot at each station, a different move along each leg ---------- */
  // [camera offset from the train's centre x,y,z, look-at offset x,y,z, vertical lens in degrees]
  const SHOT=[
    [50,56,212, 3,2,0, 17],      // 日本橋: establishing shot over the city
    [-52,12,118, 6,9,-20, 26],   // クラウド: low, the towers rising behind
    [-140,50,156, -26,2,0, 23],  // DX支援: high on the river side, the bridge behind
    [74,40,112, -12,0,0, 24],    // ITコンサルティング: three-quarter front over the homes
    [-50,64,120, 0,0,-16, 25],   // SES: high over the fields
    [-22,26,172, 0,6,-22, 22],   // 受託開発: from over the sea
    [64,48,206, -12,4,0, 21]     // あなたのビジネス: wide, low sun
  ];
  const MID=[ // halfway along each leg
    [-10,16,112, 0,3,0, 28],     // tracking alongside
    [-64,74,156, 0,0,0, 26],     // crane up over the river
    [-116,34,46, 40,0,0, 27],    // chasing down the ramp
    [80,18,60, -30,2,0, 28],     // low, the train coming at us
    [-40,70,110, 10,0,-10, 28],  // a high oblique across the fields
    [-64,20,126, 0,0,0, 26]      // along the shore
  ];
  function shot(i,tt){
    if(tt<=0)return SHOT[i];
    if(tt>=1)return SHOT[i+1];
    return tt<.5?mixv(SHOT[i],MID[i],smooth(tt*2)):mixv(MID[i],SHOT[i+1],smooth(tt*2-1));
  }
  const centre=k=>SX[k]-TRAIN/2;
  const camera=new THREE.PerspectiveCamera(20,1,1,2400);
  let portrait=false;
  function resize(){
    const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
    renderer.setSize(w,h,false);camera.aspect=w/h;portrait=w/h<.9;
    // landscape: the train sits right of the copy; portrait: below it
    if(portrait)camera.setViewOffset(w,h,0,-h*.17,w,h);else camera.setViewOffset(w,h,-w*.15,0,w,h);
    camera.updateProjectionMatrix();S.dirty=true;
  }
  addEventListener('resize',resize);resize();

  /* ---------- time of day: only the light changes; the model stays white ---------- */
  const TOD=[
    {dir:[-1,.72,.9],    sun:[1,.95,.89], si:2.6, sky:[1,1,1],     gnd:[.79,.82,.86], hi:.5,  top:[243,246,250], hor:[230,237,245]},
    {dir:[-.25,1.5,.55], sun:[1,1,1],     si:2.4, sky:[1,1,1],     gnd:[.8,.83,.87],  hi:.55, top:[244,247,250], hor:[233,238,244]},
    {dir:[1.1,.42,.8],   sun:[1,.8,.6],   si:2.5, sky:[1,.94,.88], gnd:[.78,.75,.8],  hi:.45, top:[246,241,236], hor:[238,226,216]}
  ];
  const dir=new THREE.Vector3(), focus=new THREE.Vector3(), UP=new THREE.Vector3(0,1,0), lr=new THREE.Vector3(), lu=new THREE.Vector3();
  let skyKey='';
  function light(t,cx,cy){
    const a=t<.5?TOD[0]:TOD[1], b=t<.5?TOD[1]:TOD[2], f=smooth(t<.5?t*2:(t-.5)*2), L={};
    for(const k of ['dir','sun','sky','gnd','top','hor'])L[k]=mixv(a[k],b[k],f);
    sun.color.setRGB(L.sun[0],L.sun[1],L.sun[2],THREE.SRGBColorSpace);sun.intensity=a.si+(b.si-a.si)*f;
    hemi.color.setRGB(L.sky[0],L.sky[1],L.sky[2],THREE.SRGBColorSpace);hemi.groundColor.setRGB(L.gnd[0],L.gnd[1],L.gnd[2],THREE.SRGBColorSpace);hemi.intensity=a.hi+(b.hi-a.hi)*f;
    scene.fog.color.setRGB(L.hor[0]/255,L.hor[1]/255,L.hor[2]/255,THREE.SRGBColorSpace);
    const top=L.top.map(Math.round), hor=L.hor.map(Math.round), key=top+'|'+hor;
    if(key!==skyKey){skyKey=key;stage.style.setProperty('--sky1','rgb('+top+')');stage.style.setProperty('--sky2','rgb('+hor+')')}
    // the sun follows the view; snapped to shadow texels so shadows do not shimmer as the camera moves
    dir.set(L.dir[0],L.dir[1],L.dir[2]).normalize();
    focus.set(cx,cy,-20);
    lr.crossVectors(dir,UP).normalize();lu.crossVectors(lr,dir).normalize();
    const tx=2*SB/SM, p=focus.dot(lr), q=focus.dot(lu);
    focus.addScaledVector(lr,Math.round(p/tx)*tx-p).addScaledVector(lu,Math.round(q/tx)*tx-q);
    sun.target.position.copy(focus);sun.position.copy(focus).addScaledVector(dir,450);
  }

  function update(now){
    const i=Math.max(0,Math.min(5,S.i|0)), tt=Math.max(0,Math.min(1,S.tt||0)), x=S.x||0;
    placeTrain(x);
    const xp=S.xp||0, tc=x-TRAIN/2, ty=deckY(tc);
    // express: no settling into each station's shot; drift between the moving shots instead
    let sh=shot(i,tt);
    if(xp>0)sh=mixv(sh,mixv(MID[i],MID[Math.min(5,i+1)],smooth(tt)),xp);
    let cx=centre(i)+(centre(i+1)-centre(i))*smoother(tt);cx+=(tc-cx)*xp;
    const cy=deckY(cx);
    const k=portrait?1.3:1, still=S.static?0:1-(S.v||0), t=now*.001;
    camera.position.set(cx+sh[0]*k+Math.sin(t*.11)*6*still, cy+sh[1]*k+Math.sin(t*.08)*1.8*still, sh[2]*k);
    camera.lookAt(tc+sh[3],ty+sh[4],sh[5]);
    camera.fov=sh[6]+(portrait?7:0);camera.updateProjectionMatrix();
    light(Math.min(1,Math.max(0,x/END)),tc,ty);
  }

  /* ---------- render loop: only while the stage is on screen ---------- */
  let first=true, n=0;
  function loop(now){
    requestAnimationFrame(loop);
    if(!first&&!S.visible)return;
    if(S.static&&!S.dirty&&!first)return;
    const idle=!S.dirty&&!(S.v>0);
    if(!first&&idle&&(++n&1))return; // a gentle drift needs no more than 30 fps
    S.dirty=false;
    update(now);renderer.render(scene,camera);
    if(first){first=false;root.classList.add('gl-ready')}
  }
  requestAnimationFrame(loop);
}

main().catch(e=>{console.error(e);root.classList.add('no-gl')});
