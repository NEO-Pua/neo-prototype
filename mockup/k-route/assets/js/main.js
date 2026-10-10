/* NEO SYSTEMS — Direction K「NEO LINE ― Route Map」
   The NEO LINE journey told on a railway line map. The view glides and zooms
   along the line while a train marker travels between the station roundels
   and the left panel tells each station's story. The map is SVG built from
   data (vector, so it stays crisp at any zoom); station markers and labels are
   HTML placed over it. One scroll gesture plays on to the next station. */
(function(){
  var root=document.documentElement;
  var isStatic=root.classList.contains('static');
  function $(s,c){return (c||document).querySelector(s)}
  function $$(s,c){return [].slice.call((c||document).querySelectorAll(s))}
  function clamp(v,a,b){return v<a?a:v>b?b:v}
  function seg(p,a,b){return clamp((p-a)/(b-a),0,1)}
  function smooth(t){return t*t*(3-2*t)}

  /* ---------- the line (fictional: 09:00 departure, four minutes between stations) ---------- */
  var ST=[
    {jp:'日本橋',en:'Nihombashi'},
    {jp:'クラウド',en:'Cloud Solution'},
    {jp:'DX支援',en:'DX Support'},
    {jp:'ITコンサルティング',en:'IT Consulting'},
    {jp:'SES',en:'System Engineering Service'},
    {jp:'受託開発',en:'Custom Development'},
    {jp:'あなたのビジネス',en:'Your Business'}
  ];
  var IMG='https://www.neo-systems.co.jp/wp-content/uploads/';
  var PHOTO=[null,IMG+'2023/03/advantages-and-disadvantages-of-cloud-service.jpg',IMG+'2023/06/cropped-dx-3.jpg',IMG+'2023/03/B004.jpg',
             IMG+'2023/10/cropped-cropped-pixta_69012043_M-1200x675-1.jpg',IMG+'2021/11/cropped-Rectangle-602-1.jpg',null];
  // the route: an octilinear polyline in metres; every station sits on a vertex
  var P=[[700,820],[1180,820],[1300,820],[1520,1040],[1640,1040],[1900,1040],[2060,880],[2200,880],
         [2380,880],[2540,1040],[2540,1180],[2540,1340],[2420,1460],[2240,1460],[1820,1460]];
  var SV=[0,1,4,7,10,13,14];
  var CUM=[0];for(var i=1;i<P.length;i++)CUM.push(CUM[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));
  var LEN=CUM[CUM.length-1], SL=SV.map(function(v){return CUM[v]}); // distance along the line to each station
  function at(L){
    L=clamp(L,0,LEN);var i=1;while(i<CUM.length-1&&CUM[i]<L)i++;
    var a=P[i-1],b=P[i],t=(L-CUM[i-1])/((CUM[i]-CUM[i-1])||1);
    return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  }
  function ang(L){var a=at(L-12),b=at(L+12);return Math.atan2(b[1]-a[1],b[0]-a[0])}

  var P0=.035, TRAVEL=.135, DWELL=.02, LEG=TRAVEL+DWELL, ACC=.3, ARR=P0+5*LEG+TRAVEL;
  function journey(p){
    var o={L:0,v:0,k:1,i:0,f:0,tt:0,state:'dep'};
    if(p<P0)return o;
    var i=Math.min(5,Math.floor((p-P0)/LEG)), t=(p-P0-i*LEG)/TRAVEL;
    o.k=i+1;o.i=i;
    if(t>=1){o.L=SL[i+1];o.f=1;o.tt=1;o.state='stop';return o}
    var vm=1/(1-ACC), f, v;
    if(t<ACC){f=.5*vm*t*t/ACC;v=t/ACC}
    else if(t>1-ACC){var u=1-t;f=1-.5*vm*u*u/ACC;v=u/ACC}
    else{f=.5*vm*ACC+vm*(t-ACC);v=1}
    o.L=SL[i]+(SL[i+1]-SL[i])*f;o.v=v;o.f=f;o.tt=t;
    o.state=t>.68?'soon':'next';
    return o;
  }
  function stopAt(k){return k<=0?0:k>=6?1:P0+k*LEG-.002}
  // express (while fast-forwarding): constant speed straight through the stations.
  // It meets the normal stop-and-go journey exactly at every station stop, so the two blend seamlessly.
  function express(p){
    var i=0;while(i<5&&p>stopAt(i+1))i++;
    var u=seg(p,stopAt(i),stopAt(i+1));
    return{L:SL[i]+(SL[i+1]-SL[i])*u,v:1,i:i,k:i+1,tt:u,state:'pass'};
  }
  var lastPos=null, backward=false; // rewinding: the next station is the one behind us
  function runAt(p,xp){
    var J=blend(p,xp);
    if(lastPos!==null){if(J.L<lastPos-.5)backward=true;else if(J.L>lastPos+.5)backward=false}
    lastPos=J.L;
    if(backward&&J.state!=='stop'&&J.state!=='dep'){J.k=J.i;if(J.state!=='pass')J.state=J.tt<.32?'soon':'next'}
    return J;
  }
  function blend(p,xp){
    var J=journey(p);
    if(xp<.002)return J;
    var E=express(p);
    J.L+=(E.L-J.L)*xp;J.v+=(1-J.v)*xp;
    if(E.i===J.i)J.tt+=(E.tt-J.tt)*xp;else if(xp>.5){J.i=E.i;J.tt=E.tt}
    if(xp>.5){J.state='pass';J.k=E.k}
    J.xp=xp;return J;
  }
  function minutesAt(L){for(var k=0;k<6;k++)if(L<=SL[k+1])return 4*(k+(L-SL[k])/(SL[k+1]-SL[k]));return 24}
  function hm(min){min=Math.round(min);return '09:'+(min<10?'0':'')+min}

  /* ---------- drawing the map ---------- */
  var SVGNS='http://www.w3.org/2000/svg', stage=$('.stage'), ride=$('.ride'), map=$('.lmap'), marks=$('.marks');
  function el(tag,a,parent){var e=document.createElementNS(SVGNS,tag);for(var k in a)e.setAttribute(k,a[k]);parent.appendChild(e);return e}
  var seed=20230401;
  function R(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
  function distLine(x,y){ // distance from a point to the NEO LINE
    var best=1e9;
    for(var i=1;i<P.length;i++){
      var a=P[i-1],b=P[i],dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1);
      best=Math.min(best,Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t));
    }
    return best;
  }
  function inRiver(x,y){return Math.abs(x-(y<600?1340+(y-200)*.12:y<1000?1420:1360))<70}
  var shapes=0;
  (function(){
    var g=$('.grid',map),x,y,k;
    for(x=0;x<=3600;x+=200)el('line',{x1:x,y1:0,x2:x,y2:2600},g);
    for(y=0;y<=2600;y+=200)el('line',{x1:0,y1:y,x2:3600,y2:y},g);
    var blk=$('.blk',map);
    function block(x,y,w,h,clear){if(distLine(x+w/2,y+h/2)<clear+Math.max(w,h)/2||inRiver(x+w/2,y+h/2)||y+h>1590)return;el('rect',{x:x.toFixed(0),y:y.toFixed(0),width:w.toFixed(0),height:h.toFixed(0),rx:2},blk);shapes++}
    // the city: blocks between avenues
    for(x=240;x<1360;x+=92)for(y=430;y<1320;y+=80){
      if(R()<.1)continue;
      if(R()<.35){block(x+3,y+3,38,30,26);block(x+44,y+3,38,30,26);block(x+3,y+36,79,34,26)}
      else block(x+R()*4,y+R()*4,80-R()*12,68-R()*10,26);
    }
    // homes: small plots in rows
    for(x=1660;x<2400;x+=26)for(y=560;y<1220;y+=24){
      if((Math.floor((x-1660)/26)%6===5)||(Math.floor((y-560)/24)%5===4)||R()<.18)continue;
      if(x>2060&&x<2250&&y>600&&y<740)continue; // the park
      block(x,y,17+R()*3,15+R()*2,22);
    }
    // the coast town
    for(x=1700;x<2520;x+=34)for(y=1330;y<1580;y+=30){if(R()<.35)continue;block(x,y,24,20,26)}
    // fields, hatched like a survey map
    var farm=$('.farm',map);
    for(x=2340;x<3080;x+=78)for(y=900;y<1460;y+=62){
      var cx=x+36,cy=y+28;
      if(distLine(cx,cy)<70||(x<2420&&y<1000)||R()<.12)continue;
      el('rect',{x:x,y:y,width:70,height:54,fill:R()<.5?'url(#k-farm1)':'url(#k-farm2)'},farm);shapes++;
    }
    var d='M'+P.map(function(q){return q[0]+' '+q[1]}).join('L');
    $('.ln--case',map).setAttribute('d',d);$('.ln--base',map).setAttribute('d',d);
  })();
  // each station card below gets a tile cut from this map, centred on its station
  $$('[data-tile]').forEach(function(t){
    var k=+t.dataset.tile, v=P[SV[k]], c=map.cloneNode(true), dn=c.querySelector('.ln--done');
    c.setAttribute('class','tile');c.setAttribute('viewBox',(v[0]-300)+' '+(v[1]-300)+' 600 600');c.setAttribute('preserveAspectRatio','xMidYMid slice');
    if(dn)dn.parentNode.removeChild(dn);
    el('circle',{cx:v[0],cy:v[1],r:30,'class':'tile__st'},c);
    t.appendChild(c);
  });
  var lnCase=$('.ln--case',map), lnBase=$('.ln--base',map), lnDone=$('.ln--done',map);
  function partial(L){ // the line from 日本橋 up to distance L
    var s='M'+P[0][0]+' '+P[0][1];
    for(var i=1;i<P.length&&CUM[i]<L;i++)s+='L'+P[i][0]+' '+P[i][1];
    var q=at(L);return s+'L'+q[0].toFixed(1)+' '+q[1].toFixed(1);
  }

  /* markers and labels over the map */
  function mark(cls,html){var e=document.createElement('span');e.className=cls;e.innerHTML=html;marks.appendChild(e);return e}
  var areas=[[470,470,'CITY','日本橋'],[1070,690,'BUSINESS DISTRICT',''],[2010,520,'RESIDENTIAL',''],[2730,960,'COUNTRYSIDE',''],[2150,1730,'COAST','海岸']].map(function(a){
    return{el:mark('area','<span>'+a[2]+(a[3]?'<small>'+a[3]+'</small>':'')+'</span>'),x:a[0],y:a[1]};
  });
  areas.push({el:mark('area area--river','<span>RIVER</span>'),x:1452,y:600});
  var dists=[];
  for(var s=1;s<7;s++){var Lm=(SL[s-1]+SL[s])/2,q=at(Lm);dists.push({el:mark('dist','<span>'+Math.round(SL[s]-SL[s-1])+' m</span>'),x:q[0],y:q[1],a:ang(Lm)})}
  var LAB=['b','b','b','t','r','b','l'];
  var stations=SV.map(function(v,k){
    var b=document.createElement('button');
    b.type='button';b.className='st'+(k===6?' st--end':'');b.dataset.go=k;b.dataset.lab=LAB[k];b.style.setProperty('--i',k);
    b.setAttribute('aria-label','NS0'+(k+1)+' '+ST[k].jp+'（この駅まで移動）');
    b.innerHTML='<span class="rd"><i>NS</i><b>0'+(k+1)+'</b></span><span class="st__nm">'+ST[k].jp+(k===6?'<span>終点</span>':'')+'<small>'+ST[k].en+'</small></span>';
    marks.appendChild(b);
    return{el:b,x:P[v][0],y:P[v][1]};
  });
  var tm=mark('tm','<i></i><b>09:00</b>'), tmBody=tm.firstChild, tmClock=tm.lastChild;
  var dc=$('[data-count]');if(dc)dc.textContent='約'+Math.round(shapes/50)*50;

  /* ---------- camera: the whole line at both ends; in between, follow the train ---------- */
  var BB=[440,700,2880,1600], V={}, hh=72;
  function layout(){
    var W=stage.clientWidth,H=stage.clientHeight,pr=$('.panel').getBoundingClientRect();
    hh=parseFloat(getComputedStyle(root).getPropertyValue('--hh'))||72;
    V.W=W;V.H=H;V.phone=W<=900;
    if(V.phone){V.fx=W/2;V.fy=H*.75;V.vw=W-40;V.vh=H*.36}
    else{var left=pr.right+30;V.fx=(left+W)/2;V.fy=hh+(H-hh-80)/2;V.vw=W-left-50;V.vh=H-hh-170}
    V.zo=Math.min(V.vw/(BB[2]-BB[0]),V.vh/(BB[3]-BB[1]));      // zoom showing the whole line
    V.zs=V.vw/(V.phone?560:860);                                 // zoom at a station
  }
  function camera(p,J){
    var moving=J.state==='next'||J.state==='soon'||J.state==='pass';
    var ahead=at(J.L+(moving?70*J.v:0));
    var z=V.zs*(1-.34*Math.max(Math.sin(Math.PI*clamp(J.tt,0,1))*(moving?1:0),J.xp||0)); // pull back mid-leg (and all through an express run)
    var w0=p<P0?1:J.i===0&&J.state!=='stop'?1-smooth(seg(J.tt,0,.45)):0; // leaving the overview
    var w1=smooth(seg(p,ARR+.004,1));                                       // back to it at the terminus
    var w=Math.max(w0,w1), ox=(BB[0]+BB[2])/2, oy=(BB[1]+BB[3])/2;
    return{x:ahead[0]+(ox-ahead[0])*w, y:ahead[1]+(oy-ahead[1])*w, z:Math.exp(Math.log(z)+(Math.log(V.zo)-Math.log(z))*w)};
  }
  var sc=$('.scale'), scB=$('.scale b'), lastScale='', lastClock='', lastFar=null, lastOn=-1, lastHere=null;
  var lastL=0, heading=1; // which way the train is moving along the line (+1 towards the terminus)
  function draw(p,J){
    var C=camera(p,J), z=C.z, vx=C.x-V.fx/z, vy=C.y-V.fy/z;
    map.setAttribute('viewBox',vx.toFixed(2)+' '+vy.toFixed(2)+' '+(V.W/z).toFixed(2)+' '+(V.H/z).toFixed(2));
    function put(o,x,y,dx,dy){o.style.transform='translate3d('+((x-vx)*z+(dx||0)).toFixed(1)+'px,'+((y-vy)*z+(dy||0)).toFixed(1)+'px,0)'}
    stations.forEach(function(s){put(s.el,s.x,s.y)});
    areas.forEach(function(a){put(a.el,a.x,a.y)});
    dists.forEach(function(d){put(d.el,d.x,d.y,-Math.sin(d.a)*24,Math.cos(d.a)*24)});
    // the marker faces the way it is travelling (and keeps facing that way when it stops)
    if(J.L<lastL-.5)heading=-1;else if(J.L>lastL+.5)heading=1;
    lastL=J.L;
    var q=at(J.L);put(tm,q[0],q[1]);tmBody.style.transform='rotate('+(ang(J.L)+(heading<0?Math.PI:0)).toFixed(3)+'rad)';
    lnDone.setAttribute('d',partial(J.L));
    var ck=hm(minutesAt(J.L));if(ck!==lastClock){lastClock=ck;tmClock.textContent=ck}
    var far=z<V.zs*.62;if(far!==lastFar){lastFar=far;marks.classList.toggle('far',far)}
    // live scale bar
    var steps=[50,100,200,500,1000],n=steps[0];for(var i=0;i<steps.length;i++)if(steps[i]*z<=150)n=steps[i];
    var key=n+'|'+Math.round(n*z);if(key!==lastScale){lastScale=key;sc.style.setProperty('--sw',Math.round(n*z)+'px');scB.textContent=n>=1000?n/1000+' km':n+' m'}
    // station states: passed, the one we are at or heading for, the one we are standing at
    var on=J.state==='dep'?0:J.k, here=J.state==='stop'||J.state==='dep';
    if(on!==lastOn||here!==lastHere){lastOn=on;lastHere=here;stations.forEach(function(s,k){s.el.classList.toggle('on',k===on&&k<6);s.el.classList.toggle('done',k<on);s.el.classList.toggle('here',k===on&&here)})}
  }

  /* ---------- the panel and the pager ---------- */
  var panel=$('.panel'), pSt=$('.pn--st'), pImg=$('.pn__ph img'), pCap=$('.pn__cap'), pState=$('.pn__state'), pNo=$('.pn__name .rd b'),
      pJp=$('.pn__jp'), pEn=$('.pn__en'), pTime=$('.pn__time'), pKm=$('.pn__km'), pBody=$('.pn__body');
  var pgNow=$('.pager__now'), pgItems=$$('.pager li');
  var bodies=SV.map(function(_,k){var b=$('[data-st="'+k+'"] .gd__body');if(!b)return'';b=b.cloneNode(true);var h=$('h3',b);if(h)h.parentNode.removeChild(h);return b.innerHTML});
  PHOTO.forEach(function(u){if(u){var im=new Image();im.src=u}});
  pImg.addEventListener('load',function(){pImg.classList.remove('ld')});
  var LBL={dep:'次は',next:'次は',soon:'まもなく',stop:'ただいま',pass:'通過'}, U={mode:'hero',k:-1,st:'',dep:null,on:-1};
  function ui(p,J){
    var hf=seg(p,.004,.03), dep=hf>=.6;
    if(dep!==U.dep){U.dep=dep;stage.classList.toggle('departed',dep)}
    var mode=!dep?'hero':p>=ARR-.002?'end':'st';
    if(mode!==U.mode){panel.classList.remove('mode-'+U.mode);panel.classList.add('mode-'+mode);U.mode=mode}
    var on=J.state==='dep'?0:J.k;
    if(on!==U.on){U.on=on;pgNow.innerHTML='<b>NS0'+(on+1)+'</b>'+ST[on].jp;pgItems.forEach(function(li,i){li.classList.toggle('on',i===on);li.classList.toggle('done',i<on)})}
    var k=J.k, st=J.state;
    if(k!==U.k){
      U.k=k;
      pSt.classList.toggle('no-ph',!PHOTO[k]);
      if(PHOTO[k]&&pImg.src!==PHOTO[k]){pImg.classList.add('ld');pImg.src=PHOTO[k]}
      pCap.textContent='NS0'+(k+1)+' · '+ST[k].en.toUpperCase();
      pNo.textContent='0'+(k+1);pJp.textContent=ST[k].jp;pEn.textContent=ST[k].en;
      pTime.textContent=hm(k*4)+' 着';pKm.textContent='日本橋から '+(SL[k]/1000).toFixed(1)+' km';
      pBody.innerHTML=k<6?bodies[k]:'';
      pSt.classList.remove('swap');void pSt.offsetWidth;pSt.classList.add('swap');
    }
    // standing at a station: the card steps forward
    // travel to watch, arrive to read: standing at a station the full card opens and steps forward
    if((st==='stop')!==U.strong){U.strong=st==='stop';pSt.classList.toggle('strong',U.strong);pSt.classList.toggle('full',U.strong)}
    pSt.style.setProperty('--lt',(st==='stop'?1:st==='dep'?0:J.tt).toFixed(3));
    if(st!==U.st){U.st=st;pState.textContent=st==='soon'&&k===6?'まもなく 終点':LBL[st];pState.classList.toggle('soon',st==='soon');pState.classList.toggle('pass',st==='pass')}
  }

  /* ---------- engine ---------- */
  var ticking=false, lastP=-1, dirty=true, ap=null;
  function update(){
    ticking=false;
    var r=ride.getBoundingClientRect(), vh=innerHeight, dist=r.height-vh;
    if(r.bottom<0||r.top>vh)return;
    var p=isStatic?0:(dist>0?clamp(-r.top/dist,0,1):0);
    if(p===lastP&&!dirty)return;
    lastP=p;dirty=false;
    var J=runAt(p,ap?ap.xp():0);
    draw(p,J);
    if(!isStatic)ui(p,J);
  }
  function onScroll(){if(!ticking){ticking=true;requestAnimationFrame(update)}}
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',function(){layout();dirty=true;onScroll()});
  layout();update();
  // the line draws itself in on arrival
  if(!isStatic){
    var t0=performance.now(), Lfull=LEN;
    (function intro(now){
      var k=Math.min(1,((now||t0)-t0)/1800), e=1-Math.pow(1-k,3), d=partial(Lfull*e);
      lnCase.setAttribute('d',d);lnBase.setAttribute('d',d);
      if(k<1)requestAnimationFrame(intro);
    })(t0);
  }

  /* ---------- autoplay: one scroll gesture plays the story on to the next stop ----------
     A deliberate wheel turn, swipe or arrow key makes the page scroll itself to the next
     stop. Small nudges do nothing, and extra nudges while it plays are ignored, so nothing
     gets skipped by accident. Keep scrolling (or hold an arrow key) to fast-forward
     through the stops; stop scrolling and it settles at the next one. The scenes still
     read the real scroll position, so the scrollbar, links and back button keep working,
     and grabbing the scrollbar stops the playback. Outside the story, and after the last
     stop, scrolling is completely normal. */
  function autoplay(o){
    var anim=null, raf=0, lastSet=-1, prevT=0, rate=1, ffUntil=0, queue=0, restUntil=0, xp=0, jumpEdge=null, jdir=0, skip=o.skip; // xp: 0 → 1 into express mode
    var g={last:0,d:0,acc:0,used:false}, ty=null, tUsed=false;
    var badge=document.createElement('div');
    badge.className='ffwd';badge.setAttribute('aria-hidden','true');badge.innerHTML='<i></i><i></i><b>早送り</b><b>巻き戻し</b>';
    document.body.appendChild(badge);
    function easeIO(k){return k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2}
    function easeO(k){return 1-Math.pow(1-k,3)}
    function zone(d){
      var s=o.stops(), y=scrollY, a=s[0].y, b=s[s.length-1].y;
      return d>0?y>=a-4&&y<b-4:y>a+4&&y<=b+4;
    }
    function nextStop(d,from){
      var s=o.stops(), i;
      for(i=d>0?0:s.length-1;i>=0&&i<s.length;i+=d)if(d>0?s[i].y>from+4:s[i].y<from-4)return s[i];
      return null;
    }
    function dirOf(a){return a.y1>a.y0?1:-1}
    function go(d){
      var t;
      if(anim){
        if(dirOf(anim)===d)return;           // already heading that way: a nudge doesn't skip ahead
        queue=0;jumpEdge=null;t=nextStop(d,scrollY);if(t)start(t,true);return; // reverse
      }
      if(performance.now()<restUntil)return;
      t=nextStop(d,scrollY);if(t)start(t,false);
    }
    function more(d,ms){ // fast-forward for a moment (refreshed while the scrolling continues)
      if(!anim||dirOf(anim)!==d)return;
      ffUntil=Math.max(ffUntil,performance.now()+ms);
    }
    function start(t,chained){
      var y0=scrollY, px=Math.abs(t.y-y0);
      if(px<2)return false;
      anim={y0:y0,y1:t.y,k:0,dur:!chained&&t.ms?t.ms:o.dur(px),ease:o.linear?null:chained?easeO:easeIO};
      root.style.scrollBehavior='auto';lastSet=-1;
      if(!raf){prevT=0;raf=requestAnimationFrame(step)}
      return true;
    }
    function step(now){
      raf=0;
      if(!anim)return;
      // the visitor grabbed the scrollbar (or something else scrolled): let them have it
      if(lastSet>=0&&Math.abs(scrollY-lastSet)>3){halt();return}
      // a jump from the station buttons runs express until the stop before its destination
      var dt=prevT?Math.min(50,now-prevT):16, fast=now<ffUntil||(jumpEdge!==null&&(jdir>0?scrollY<jumpEdge-4:scrollY>jumpEdge+4));
      prevT=now;
      root.classList.toggle('ff-on',fast);badge.classList.toggle('rev',fast&&dirOf(anim)<0);
      rate+=((fast?5:queue?2:1)-rate)*.14;
      xp+=((fast?1:0)-xp)*.1; // express: the train runs through the stations while the scrolling goes on
      anim.k=Math.min(1,anim.k+dt*rate/anim.dur);
      var e=anim.ease?anim.ease(anim.k):anim.k;
      lastSet=Math.round(anim.y0+(anim.y1-anim.y0)*e);
      scrollTo(0,lastSet);
      if(anim.k<1){raf=requestAnimationFrame(step);return}
      if(fast||queue){ // keep going while the visitor keeps scrolling
        if(queue)queue--;
        var t=nextStop(dirOf(anim),anim.y1);
        if(t&&start(t,true))return;
      }
      halt();restUntil=now+150;
    }
    function halt(){anim=null;lastSet=-1;rate=1;ffUntil=0;queue=0;xp=0;jumpEdge=null;root.classList.remove('ff-on');root.style.scrollBehavior=''}

    var run={t0:0,last:0,d:0,ev:[]}; // a run of scrolling one way (short pauses between wheel strokes allowed)
    addEventListener('wheel',function(e){
      if(e.ctrlKey||!e.deltaY||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
      var d=e.deltaY>0?1:-1, now=performance.now(), px=Math.abs(e.deltaY)*(e.deltaMode===1?40:e.deltaMode===2?800:1);
      var rec=run.ev.slice(-3), avg=rec.length?rec.reduce(function(a,v){return a+v},0)/rec.length:0;
      // a pause, or a sudden jump in speed (a fresh swipe over a dying trackpad momentum) = a new gesture
      if(now-g.last>180||d!==g.d||(rec.length===3&&px>=12&&px>avg*3))g={last:now,d:d,acc:0,used:false};
      g.last=now;g.acc+=px;
      if(now-run.last>500||d!==run.d)run={t0:now,last:now,d:d,ev:[]};
      run.last=now;run.ev.push(px);if(run.ev.length>8)run.ev.shift();
      if(o.hold&&o.hold()){e.preventDefault();g.used=true;return}
      if(!anim&&!zone(d))return;
      e.preventDefault();
      // trackpad momentum = a tail of ever-smaller (in the end, tiny) deltas; that is not the visitor scrolling
      var ev=run.ev, sum=ev.reduce(function(a,v){return a+v},0);
      var fading=ev.length>=6&&(sum/ev.length<6||ev[ev.length-1]<ev[0]*.8&&ev.every(function(v,i){return !i||v<=ev[i-1]}));
      var keen=now-run.t0>450&&!fading; // has kept on scrolling for a while, on purpose
      if(anim){
        if(dirOf(anim)!==d){if(!g.used&&g.acc>=40){g.used=true;go(d)}return} // reverse
        if(keen){more(d,450);return} // keep scrolling = fast-forward
        // a fresh scroll near the end of a beat queues the next one; an extra nudge just after it started does nothing
        if(!g.used&&g.acc>=20&&anim.k>.65){g.used=true;queue=Math.max(queue,1)}
        return;
      }
      if(!g.used&&g.acc>=20){g.used=true;go(d);return} // one deliberate gesture = one stop
      if(keen&&performance.now()>restUntil)go(d);       // still scrolling after a stop: carry on
    },{passive:false});
    addEventListener('touchstart',function(e){ty=e.touches.length===1?e.touches[0].clientY:null;tUsed=false},{passive:true});
    addEventListener('touchmove',function(e){
      if(ty===null||!e.cancelable||(o.hold&&o.hold()))return;
      var dy=ty-e.touches[0].clientY, d=dy>0?1:-1;
      if(!anim&&!zone(d))return;
      e.preventDefault();
      if(tUsed||Math.abs(dy)<20)return;
      tUsed=true;
      if(anim&&dirOf(anim)===d)queue=Math.min(2,queue+1); // another swipe while playing: carry on to the next stop, faster
      else go(d);
    },{passive:false});
    addEventListener('keydown',function(e){
      if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey)return;
      var t=e.target, k=e.key;
      if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
      if(k===' '&&t&&t.closest&&t.closest('a,button'))return;
      var d=k==='ArrowDown'||k==='PageDown'||(k===' '&&!e.shiftKey)?1:k==='ArrowUp'||k==='PageUp'||(k===' '&&e.shiftKey)?-1:0;
      if(!d||(o.hold&&o.hold()))return;
      if(!anim&&!zone(d))return;
      e.preventDefault();
      if(e.repeat)more(d,160);       // key held down: fast-forward
      else if(anim&&dirOf(anim)===d)queue=Math.min(2,queue+1);
      else go(d);
    });
    // "skip" button: shown inside the story (until the final leg), jumps straight past it
    if(skip){
      var on=null;
      addEventListener('scroll',function(){
        var s=o.stops(), y=scrollY, v=y>=s[0].y-4&&y<s[s.length-2].y+4;
        if(v!==on){on=v;skip.classList.toggle('on',v)}
      },{passive:true});
      skip.addEventListener('click',function(){
        var t=document.querySelector(o.skipTo);
        halt();if(!t)return;
        root.style.scrollBehavior='auto';
        t.scrollIntoView({block:'start'});
        setTimeout(function(){root.style.scrollBehavior=''},50);
      });
    }
    function jump(y){ // straight to a stop: express past the ones in between, then brake onto it
      queue=0;ffUntil=0;jumpEdge=null;
      var s=o.stops(), y0=scrollY, d=y>y0?1:-1;
      var mid=s.filter(function(t){return d>0?t.y>y0+4&&t.y<y-4:t.y<y0-4&&t.y>y+4});
      if(mid.length){jumpEdge=mid[d>0?mid.length-1:0].y;jdir=d}
      start({y:y},!!anim);
    }
    return{to:jump,halt:halt,xp:function(){return xp}};
  }

  function rideStops(){var t=ride.getBoundingClientRect().top+scrollY, d=ride.offsetHeight-innerHeight;return SV.map(function(_,k){return{y:Math.round(t+stopAt(k)*d)}})}
  ap=isStatic?null:autoplay({
    stops:rideStops,
    dur:function(px){return clamp(3400*Math.sqrt(px/(LEG*(ride.offsetHeight-innerHeight))),500,9000)}, // ~3.4s a station
    linear:true, // the train brings its own acceleration and braking
    skip:$('.skip'), skipTo:'#route'
  });

  // station buttons (on the map, in the pager): the train rides there
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-go]');if(!b)return;
    var k=+b.dataset.go;
    if(isStatic){var t=$('[data-st="'+k+'"]');if(t)t.scrollIntoView({block:'start'});return}
    ap.to(rideStops()[k].y);
  });

  /* ---------- MOTION switch (persists, then reloads at the same section) ---------- */
  $$('[data-motion]').forEach(function(b){
    b.setAttribute('aria-pressed',String(!isStatic));
    var st=$('.motion__st',b);if(st)st.textContent=isStatic?'OFF':'ON';
    b.addEventListener('click',function(){
      var next=isStatic?'on':'off', id='top';
      try{localStorage.setItem('neo-motion',next)}catch(e){}
      $$('main>section').forEach(function(s){if(s.getBoundingClientRect().top<=innerHeight*.4)id=s.id});
      location.href=location.pathname+'?motion='+next+'#'+id;
    });
  });

  /* ---------- phone menu ---------- */
  var burger=$('.burger'), menu=$('#menu');
  function setMenu(open){
    root.classList.toggle('menu-open',open);
    burger.setAttribute('aria-expanded',open);
    burger.setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');
    menu.setAttribute('aria-hidden',!open);
  }
  if(burger&&menu){
    burger.addEventListener('click',function(){setMenu(!root.classList.contains('menu-open'))});
    menu.addEventListener('click',function(e){if(e.target.closest('a'))setMenu(false)});
    addEventListener('keydown',function(e){if(e.key==='Escape'&&root.classList.contains('menu-open')){setMenu(false);burger.focus()}});
  }

  /* ---------- mockup: lower pages are not built yet (delegated, so the panel's copied links work too) ---------- */
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;
    var h=a.getAttribute('href');
    if(a.dataset.soon===undefined&&(/^https?:|^tel:|^mailto:|^#/.test(h)||/(^|\/)index\.html$/.test(h)))return;
    e.preventDefault();alert(a.dataset.soon||'モックアップのため、下層ページは未作成です。');
  });
})();
