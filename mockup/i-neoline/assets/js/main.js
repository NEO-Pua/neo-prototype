/* NEO SYSTEMS — Direction I「NEO LINE」
   A train journey driven by native scrolling. Nothing is hijacked: the
   page scrolls normally, and how far you have scrolled through the pinned
   stage (0 → 1) becomes how far the train has travelled.
   Scenery: <canvas>, redrawn each frame from seeded data (no images).
   Train: SVG — the wheels turn with the distance travelled and the lights
   follow the time of day. Station signs: real HTML text in the same world. */
(function(){
  var root=document.documentElement;
  var isStatic=root.classList.contains('static');
  function $(s,c){return (c||document).querySelector(s)}
  function $$(s,c){return [].slice.call((c||document).querySelectorAll(s))}
  function clamp(v,a,b){return v<a?a:v>b?b:v}
  function seg(p,a,b){return clamp((p-a)/(b-a),0,1)}
  function sstep(a,b,v){var t=seg(v,a,b);return t*t*(3-2*t)}

  /* ---------- the line ---------- */
  var ST=[
    {jp:'日本橋',en:'Nihombashi',sh:'日本橋'},
    {jp:'クラウド',en:'Cloud Solution',sh:'クラウド'},
    {jp:'DX支援',en:'DX Support',sh:'DX支援'},
    {jp:'ITコンサルティング',en:'IT Consulting',sh:'ITコンサル'},
    {jp:'SES',en:'System Engineering Service',sh:'SES'},
    {jp:'受託開発',en:'Custom Development',sh:'受託開発'},
    {jp:'あなたのビジネス',en:'Your Business',sh:'あなたのビジネス'}
  ];
  var SX=[0,3200,6600,10000,13400,16800,20400]; // where the train's nose stops (world units)
  var END=SX[6], TRAIN=1096, BR0=5250, BR1=6250, SEA=15300;
  // share of the scroll: a dwell at 日本橋, then 6 legs of (travel + dwell)
  var P0=.05, TRAVEL=.105, DWELL=.05, LEG=TRAVEL+DWELL, ACC=.3;

  // where along the line is the train at scroll progress p?
  function journey(p){
    var o={x:0,v:0,k:1,state:'dep',rf:0,done:-1};
    if(p<P0)return o;
    var i=Math.min(5,Math.floor((p-P0)/LEG)), t=(p-P0-i*LEG)/TRAVEL;
    o.k=i+1;
    if(t>=1){o.x=SX[i+1];o.state='stop';o.rf=(i+1)/6;o.done=i+1;return o}
    // accelerate, cruise, brake (trapezoid speed profile)
    var vm=1/(1-ACC), f, v;
    if(t<ACC){f=.5*vm*t*t/ACC;v=t/ACC}
    else if(t>1-ACC){var u=1-t;f=1-.5*vm*u*u/ACC;v=u/ACC}
    else{f=.5*vm*ACC+vm*(t-ACC);v=1}
    o.x=SX[i]+(SX[i+1]-SX[i])*f;o.v=v;o.rf=(i+f)/6;o.done=i;
    o.state=t>.68?'soon':'next';
    return o;
  }
  function stopAt(k){return k<=0?0:P0+(k-1)*LEG+TRAVEL+.02}

  /* ---------- colour ---------- */
  function hx(h){var n=parseInt(h.slice(1),16);return[n>>16,n>>8&255,n&255]}
  function mix(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}
  function shade(c,f){return f>1?mix(c,[255,255,255],f-1):mix([0,0,0],c,f)}
  function rgb(c,a){return a==null||a>=1?'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')':'rgba('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+','+(a<0?0:a).toFixed(3)+')'}
  // time of day along the line: dawn at 日本橋 → day → golden hour → sunset at the terminal
  var KEYS=['top','mid','hor','sun','cloud','far','mid2','near','grd','trk','sea'];
  var TOD=[
    [0,  '#1b2552','#6a5f97','#f2a98f','#ffcf9e','#e7a3a8','#5d5f8f','#3f4677','#2c3360','#262c4c','#3a3c52','#4a5d96',.85],
    [.13,'#3a7bc8','#8ab8e6','#ffe0c2','#fff1d6','#fff4ea','#8ea4c4','#6681a8','#4a6286','#4c6b3e','#6e6a66','#4f89c4',.1],
    [.38,'#2f86de','#7cc0f2','#d9f0ff','#ffffff','#ffffff','#9fbad8','#7896bb','#57749a','#5b8048','#7d7974','#3f8fd0',0],
    [.62,'#3b7ccc','#8db8e0','#f4e6c8','#fff0c4','#fff6e6','#a2b0c8','#7a8eae','#59698c','#66793f','#807a70','#4a87c0',0],
    [.82,'#3e5aa6','#d79a86','#ffc98a','#ffd88a','#ffd0a0','#a48ea6','#7a6a90','#4f4a72','#555434','#6a5e58','#6a78b0',.22],
    [1,  '#242c6c','#a95a86','#ff8f5e','#ffb46e','#ff9f80','#7b5d86','#533f6e','#372f56','#2c2a42','#3f3848','#5a4f8c',.7]
  ].map(function(r){var o={t:r[0],dark:r[12]};KEYS.forEach(function(k,i){o[k]=hx(r[i+1])});return o});
  function palette(t){
    var i=0;while(i<TOD.length-2&&t>TOD[i+1].t)i++;
    var a=TOD[i],b=TOD[i+1],f=sstep(a.t,b.t,t),o={t:t,dark:a.dark+(b.dark-a.dark)*f};
    KEYS.forEach(function(k){o[k]=mix(a[k],b[k],f)});
    return o;
  }

  /* ---------- the train (SVG, built once) ---------- */
  var trainEl=$('.train');
  var DOORS=[20,106,192,278], WINS=[[64,36],[150,36],[236,36],[4,11]];
  function car(kind){ // kind: 'cab' (nose at the right end) or 'mid'
    var cab=kind==='cab', g='', gl='', i;
    g+=cab?'<path class="tb" d="M0 18Q0 10 8 10H322Q340 10 348 20L356 42Q360 50 360 60V118Q360 122 356 122H4Q0 122 0 118Z"/>'
          :'<rect class="tb" x="0" y="10" width="360" height="112" rx="6"/>';
    g+='<rect x="6" y="5" width="'+(cab?318:348)+'" height="7" rx="3" fill="#b9c0cb"/><rect x="116" y="0" width="58" height="7" rx="2" fill="#a2aab7"/><rect x="214" y="0" width="40" height="7" rx="2" fill="#a2aab7"/>';
    var wins=WINS.concat([cab?[322,16]:[322,32]]);
    wins.forEach(function(w){gl+='<rect x="'+w[0]+'" y="30" width="'+w[1]+'" height="40" rx="2"/>'});
    DOORS.forEach(function(d){
      g+='<rect class="td" x="'+d+'" y="22" width="38" height="98" rx="1.5"/><path d="M'+(d+19)+' 22V120" stroke="#98a1b0" stroke-width=".8"/>';
      gl+='<rect x="'+(d+4)+'" y="32" width="11" height="36" rx="1.5"/><rect x="'+(d+23)+'" y="32" width="11" height="36" rx="1.5"/>';
    });
    if(cab)gl+='<path d="M340 16H344Q349 16 351 22L356 44Q357 50 352 50H340Z"/>';
    g+='<g class="gl">'+gl+'</g><g class="lit">'+gl+'</g>';
    // NEO LINE livery: navy band with a cyan stripe
    g+='<rect x="0" y="76" width="360" height="10" fill="#22348c"/><rect x="0" y="86" width="360" height="3" fill="#00a0e0"/>';
    g+='<rect x="96" y="122" width="44" height="9" rx="1.5" fill="#3a404d"/><rect x="152" y="122" width="76" height="10" rx="1.5" fill="#313744"/><rect x="238" y="122" width="22" height="8" rx="1.5" fill="#3a404d"/>';
    if(cab)g+='<path d="M334 122H360L356 134H338Z" fill="#2f3440"/>';
    return g;
  }
  function buildTrain(){
    var s='<svg viewBox="0 -40 1096 180" width="1096" height="180" aria-hidden="true" focusable="false"><defs>'+
      '<linearGradient id="nl-tb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--tb0,#f4f6fa)"/><stop offset=".6" style="stop-color:var(--tb1,#e2e7ee)"/><stop offset="1" style="stop-color:var(--tb2,#c6ceda)"/></linearGradient>'+
      '<linearGradient id="nl-tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4d5e82"/><stop offset="1" stop-color="#232c44"/></linearGradient>'+
      '<linearGradient id="nl-bm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff4d6" stop-opacity=".34"/><stop offset="1" stop-color="#fff4d6" stop-opacity="0"/></linearGradient>'+
      '</defs>';
    s+='<path class="beam" d="M1094 95L1580 58V156L1094 101Z" fill="url(#nl-bm)"/>';
    // bogies and wheels stay on the rails
    for(var c=0;c<3;c++)[62,298].forEach(function(b){
      var cx=c*368+b;
      s+='<rect x="'+(cx-31)+'" y="123" width="62" height="10" rx="3" fill="#2a2f3a"/>';
      [-17,17].forEach(function(o){var x=cx+o;
        s+='<g class="wh"><circle cx="'+x+'" cy="131" r="9" fill="#1f232c"/><circle cx="'+x+'" cy="131" r="6.2" fill="none" stroke="#4d5566" stroke-width="1.2"/><circle cx="'+x+'" cy="125.4" r="1.5" fill="#a3acbd"/><circle cx="'+x+'" cy="131" r="2.2" fill="#8a93a5"/></g>';
      });
    });
    // gangways
    s+='<rect x="360" y="22" width="8" height="94" fill="#3a404f"/><rect x="728" y="22" width="8" height="94" fill="#3a404f"/>';
    // car bodies ride on their own suspension (they bob a little at speed)
    s+='<g style="transform:translateY(var(--b0,0px))"><g transform="translate(360 0) scale(-1 1)">'+car('cab')+'<rect x="352" y="101" width="7" height="6" rx="1.5" fill="#ff3b30"/></g></g>';
    s+='<g style="transform:translateY(var(--b1,0px))"><g transform="translate(368 0)">'+car('mid')+
      '<rect x="160" y="1" width="44" height="5" rx="1.5" fill="#5d6574"/>'+
      '<g fill="none" stroke="#4a5161" stroke-linecap="round"><path d="M166 3L200 3M196 3L176 -16L190 -34" stroke-width="2.2"/><path d="M172 -36H208" stroke-width="2.8"/><path d="M172 -36q-5 0-6 4M208 -36q5 0 6 4" stroke-width="1.6"/></g>'+
      '<text class="tlogo" x="180" y="107" text-anchor="middle">NEO LINE</text></g></g>';
    s+='<g style="transform:translateY(var(--b2,0px))"><g transform="translate(736 0)">'+car('cab')+'<rect class="hl" x="352" y="93" width="7" height="6" rx="1.5" fill="#fffbe6"/></g></g>';
    trainEl.innerHTML=s+'</svg>';
  }
  buildTrain();
  var trainSvg=trainEl.firstChild;

  /* ---------- station signs (駅名標) ---------- */
  var signsEl=$('.signs');
  var signs=SX.map(function(x,k){
    var d=document.createElement('div');
    d.className='sign'+(ST[k].jp.length>6?' sign--long':'');
    d.innerHTML='<div class="sign__bd"><span class="sign__no">NS<b>0'+(k+1)+'</b></span><span class="sign__nm"><b>'+ST[k].jp+'</b><small>'+ST[k].en+'</small></span></div>'+
      '<div class="sign__nav"><span>'+(k>0?'← '+ST[k-1].sh:'')+'</span><span>'+(k<6?ST[k+1].sh+' →':'終点')+'</span></div>';
    signsEl.appendChild(d);
    return{el:d,wx:x-290,on:false};
  });

  /* ---------- the world (generated once from a fixed seed) ----------
     Every object has an anchor wx: the train position at which the object is
     level with the train's nose. On screen: x = nose + (wx - trainX) × depth × scale,
     so far layers (small depth) drift slowly and near ones rush past. */
  var Z=[1600,5000,8400,11800,15200,18600]; // city | offices | river | homes | fields | coast | terminal
  function zone(wx){var i=0;while(i<Z.length&&wx>=Z[i])i++;return i}
  function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function nearStation(wx,before,after){for(var k=0;k<7;k++)if(wx>SX[k]-before&&wx<SX[k]+after)return true;return false}
  var WD={};
  (function gen(){
    var R=rng(20230401);
    function r(a,b){return a+(b-a)*R()}
    function ri(a,b){return Math.floor(r(a,b+1))}
    function lights(cols,rows,share){var a=[],n=Math.min(36,Math.round(cols*rows*share));for(var i=0;i<n;i++)a.push(ri(0,cols-1),ri(0,rows-1));return a}
    var wx,i,z,o;
    // clouds (depth .03)
    WD.cloud=[];
    for(wx=-62000;wx<72000;wx+=r(5600,10500)){
      var parts=[],n=ri(3,6);
      for(i=0;i<n;i++)parts.push([r(-64,64),r(-9,2),r(14,30)]);
      WD.cloud.push({wx:wx,y:r(.04,.62),k:r(.75,1.45),parts:parts});
    }
    // stars (screen space, only at dawn/dusk)
    WD.star=[];for(i=0;i<70;i++)WD.star.push([R(),Math.pow(R(),1.6)*.7,r(.6,1.6)]);
    // far skyline (depth .09): Tokyo, slowly sinking behind us
    WD.far=[];
    for(wx=-32000;wx<6600;){
      z=zone(wx+r(-300,300));
      var w=r(16,44),h=z===0?r(40,130):z===1?r(60,190):r(30,90);
      if(R()<.12)h*=1.45;
      WD.far.push({wx:wx,w:w,h:h,v:ri(0,4),ant:h>140&&R()<.6,lt:lights(4,8,.18)});
      wx+=w/.09*r(.5,1);
    }
    // mid layer (depth .22)
    WD.mid=[];
    for(wx=-10000;wx<26000;){
      z=zone(wx+r(-400,400));o={wx:wx,v:ri(0,4)};
      if(z<=1||(z===2&&wx<5600)){o.t='tower';o.w=r(36,84);o.h=z===0?r(80,190):r(120,290);if(R()<.15)o.h*=1.25}
      else if(z===2){o.t='tower';o.w=r(40,90);o.h=r(46,130)}
      else if(z===3){o.t=R()<.55?'apt':'low';o.w=o.t==='apt'?r(70,130):r(40,80);o.h=o.t==='apt'?r(44,84):r(20,38)}
      else if(z===4){o.t='hill';o.w=r(220,420);o.h=r(40,90)}
      else o=null;
      if(o){
        if(o.t!=='hill')o.lt=lights(Math.max(1,Math.floor(o.w/7)),Math.max(1,Math.floor(o.h/10)),.1);
        WD.mid.push(o);wx+=o.w/.22*(o.t==='hill'?r(.45,.8):r(.55,1.05));
      }else wx+=r(300,500);
    }
    WD.mid.push({wx:6050,t:'tvt',w:44,h:262,v:2},{wx:16700,t:'isle',w:300,h:28,v:2},{wx:16200,t:'boat',w:26,h:20,v:2},
                {wx:21000,t:'boat',w:22,h:16,v:2},{wx:18900,t:'cape',w:340,h:36,v:2},{wx:19260,t:'lh',w:12,h:62,v:2});
    WD.mid.sort(function(a,b){return a.wx-b.wx});
    // near layer (depth .45)
    WD.near=[];WD.pole=[];
    for(wx=-6000;wx<24000;){
      z=zone(wx+r(-200,200));o={wx:wx,v:ri(0,4)};
      if(wx>4200&&wx<7300){ // river: open water, trees on the banks
        if(wx<4700||wx>6950){o.t='tree';o.w=r(24,40);o.h=r(30,46)}else o=null;
      }
      else if(z===0){if(R()<.75){o.t='shop';o.w=r(70,130);o.h=r(50,96);o.c=ri(0,3)}else{o.t='bldg';o.w=r(90,140);o.h=r(110,170)}}
      else if(z===1){if(R()<.7){o.t='bldg';o.w=r(90,160);o.h=r(110,230)}else{o.t='shop';o.w=r(70,120);o.h=r(50,90);o.c=ri(0,3)}}
      else if(z===2){o.t=R()<.5?'shop':'house';o.w=r(56,96);o.h=r(36,70);o.c=ri(0,3)}
      else if(z===3){var q=R();if(q<.6){o.t='house';o.w=r(46,72);o.h=r(30,40)}else if(q<.85){o.t='apt';o.w=r(90,130);o.h=r(60,92)}else{o.t='tree';o.w=r(24,40);o.h=r(30,48)}}
      else if(z===4){var q2=R();if(q2<.25){o.t='farm';o.w=r(70,100);o.h=r(34,44)}else if(q2<.6){o.t='tree';o.w=r(24,44);o.h=r(30,56)}else o=null}
      else{var q3=R();if(q3<.7){o.t='pine';o.w=r(40,70);o.h=r(40,70)}else if(q3<.85){o.t='house';o.w=r(46,70);o.h=r(30,38)}else o=null}
      if(o){
        if(o.t==='bldg'||o.t==='apt')o.lt=lights(Math.max(1,Math.floor(o.w/8)),Math.max(1,Math.floor(o.h/11)),.12);
        WD.near.push(o);wx+=o.w/.45*r(.75,1.35);
      }else wx+=r(140,320);
    }
    for(wx=8300;wx<15400;wx+=r(320,440))WD.pole.push(wx);
    // ground strips under the near layer
    WD.ng=[[-1e6,4250,'urban'],[4250,4750,'bank'],[4750,6900,'water'],[6900,7400,'bank'],[7400,11800,'grass'],[11800,15200,'paddy'],[15200,1e6,'sand']];
    // track level (depth 1)
    WD.mast=[];for(wx=-7040;wx<END+300;wx+=640)if(!(wx>BR0-80&&wx<BR1+80))WD.mast.push(wx);
    WD.tg=[[-1e6,4900,'wall'],[4900,BR0,'grass'],[BR0,BR1,'water'],[BR1,1e6,'grass']];
    // foreground: utility poles rushing past (depth 1.35) and grass (depth 1.6)
    WD.fgp=[];for(wx=-4000;wx<END+3000;wx+=r(820,1250))if(!nearStation(wx,1800,600)&&!(wx>BR0-700&&wx<BR1+700))WD.fgp.push(wx);
    WD.grass=[];for(wx=-6000;wx<END+4000;wx+=r(30,64))WD.grass.push({wx:wx,h:r(8,22),n:ri(3,5),y:R(),l:r(-4,4)});
  })();

  /* ---------- drawing ---------- */
  var stage=$('.stage'), ride=$('.ride'), cvb=$('.cv--bg'), cvf=$('.cv--fg'), cb=cvb.getContext('2d'), cf=cvf.getContext('2d');
  var V={W:0,H:0,s:1,F:0,yt:0,hh:72,dpr:1,phone:false,sunX:0};
  var TAU=Math.PI*2, SIGNC=[[198,78,66],[56,118,188],[224,160,56],[64,148,108]], WARM=[255,212,138];
  function sxOf(wx,d,x){return V.F+(wx-x)*d*V.s}
  function view(d,x,m){var k=d*V.s;return[x+(-m-V.F)/k,x+(V.W+m-V.F)/k]}
  function first(a,wx){var lo=0,hi=a.length;while(lo<hi){var m=lo+hi>>1;if(a[m].wx<wx)lo=m+1;else hi=m}return lo}
  function shades(c){return[.86,.93,1,1.07,1.14].map(function(f){return rgb(shade(c,f))})}
  function litWin(c,o,x0,y0,dx,dy,w,h,col){c.fillStyle=col;var L=o.lt;for(var j=0;j<L.length;j+=2)c.fillRect(x0+L[j]*dx,y0+L[j+1]*dy,w,h)}
  function glow(c,x,y,r,a){var g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,236,190,'+a.toFixed(2)+')');g.addColorStop(1,'rgba(255,236,190,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}

  function draw(J,P){
    var c=cb, x=J.x, s=V.s, yh=V.yt-200*s;
    c.setTransform(V.dpr,0,0,V.dpr,0,0);
    var g=c.createLinearGradient(0,0,0,yh);
    g.addColorStop(0,rgb(P.top));g.addColorStop(.6,rgb(P.mid));g.addColorStop(1,rgb(P.hor));
    c.fillStyle=g;c.fillRect(0,0,V.W,yh+1);
    c.fillStyle=rgb(mix(P.far,P.hor,.25));c.fillRect(0,yh,V.W,V.H-yh);
    if(P.dark>.3)stars(c,P,yh);
    sun(c,P,yh);
    clouds(c,P,x,yh);
    ridge(c,P,x,yh);
    farCity(c,P,x);
    sea(c,P,x,yh);
    midLayer(c,P,x,yh);
    nearGround(c,P,x);
    nearLayer(c,P,x);
    track(c,P,J);
  }
  function stars(c,P,yh){
    var a=(P.dark-.3)*1.6;c.fillStyle='#fff';
    WD.star.forEach(function(t){c.globalAlpha=clamp(a*(1-t[1]*1.3),0,1)*.85;c.fillRect(t[0]*V.W,6+t[1]*yh,t[2],t[2])});
    c.globalAlpha=1;
  }
  function sun(c,P,yh){
    var t=P.t, s=V.s, e=Math.sin(Math.PI*t), sx=V.W*(.1+.76*t), top=Math.min(yh*.45,110*s+60);
    var sy=yh+10*s-e*(yh-top);V.sunX=sx;
    var R=Math.max(V.W,V.H)*.6, g=c.createRadialGradient(sx,sy,0,sx,sy,R);
    g.addColorStop(0,rgb(P.sun,.5+.3*(1-e)));g.addColorStop(.22,rgb(P.sun,.15+.13*(1-e)));g.addColorStop(1,rgb(P.sun,0));
    c.fillStyle=g;c.fillRect(0,0,V.W,yh+1);
    c.fillStyle=rgb(mix(P.sun,[255,255,255],.45));c.beginPath();c.arc(sx,sy,24*s,0,TAU);c.fill();
  }
  function blob(c,p,cx,cy,k){
    c.beginPath();
    for(var j=0;j<p.length;j++){var px=cx+p[j][0]*k,py=cy+p[j][1]*k,r=p[j][2]*k;c.moveTo(px+r*1.3,py);c.ellipse(px,py,r*1.3,r*.52,0,0,TAU)}
    c.fill();
  }
  function clouds(c,P,x,yh){
    var d=.03, s=V.s, vw=view(d,x,260), a=WD.cloud, i=first(a,vw[0]);
    var top=V.hh*.7, bot=yh-110*s, lit=rgb(P.cloud,.8), dk=rgb(mix(P.cloud,P.mid,.4),.5);
    for(;i<a.length&&a[i].wx<vw[1];i++){
      var o=a[i], cx=sxOf(o.wx,d,x), cy=top+(bot-top)*o.y, k=o.k*s;
      c.fillStyle=dk;blob(c,o.parts,cx,cy+3.5*k,k);
      c.fillStyle=lit;blob(c,o.parts,cx,cy,k);
    }
  }
  function ridge(c,P,x,yh){
    var s=V.s, k=.05*s, fx=sxOf(14500,.05,x), fh=190*s, fw=340*s, j;
    c.beginPath();c.moveTo(-10,yh+1);
    for(var sx=-10;sx<=V.W+10;sx+=8){
      var wx=x+(sx-V.F)/k;
      var env=24+66*sstep(2000,13000,wx)-90*sstep(17500,22000,wx);
      var h=env*s*(.62+.22*Math.sin(wx*.00021+1.3)+.16*Math.sin(wx*.00057+.4)+.08*Math.sin(wx*.0013+2)+.04*Math.sin(wx*.0041));
      var dx=Math.abs(sx-fx);if(dx<fw){var fu=fh*Math.pow(1-dx/fw,1.6);if(fu>h)h=fu}
      c.lineTo(sx,yh-h);
    }
    c.lineTo(V.W+10,yh+1);c.closePath();c.fillStyle=rgb(P.far);c.fill();
    if(fx>-fw&&fx<V.W+fw){ // snow on the tallest peak
      var cw=fw*(1-Math.pow(.7,1/1.6));
      c.beginPath();
      for(j=0;j<=10;j++){var u=(j/5-1)*cw;c.lineTo(fx+u,yh-fh*Math.pow(1-Math.abs(u)/fw,1.6))}
      for(j=10;j>=0;j--){var u2=(j/5-1)*cw;c.lineTo(fx+u2,yh-fh*.7+(j%2?7:-1)*s*(1-Math.abs(j/5-1)))}
      c.closePath();c.fillStyle=rgb(mix([250,252,255],P.far,.25+P.dark*.35));c.fill();
    }
  }
  function farCity(c,P,x){
    var d=.09, s=V.s, yb=V.yt-190*s, vw=view(d,x,80), a=WD.far, i=first(a,vw[0]);
    var cols=shades(mix(P.far,P.mid2,.4)), wl=P.dark>.05?rgb(WARM,Math.min(1,P.dark*1.1)):null;
    for(;i<a.length&&a[i].wx<vw[1];i++){
      var o=a[i], sink=sstep(1500,11000,x-o.wx), h=o.h*s*(1-sink*.85);
      if(h<2)continue;
      var bx=sxOf(o.wx,d,x), w=o.w*s, y=yb-h;
      c.globalAlpha=1-sink*.45;
      c.fillStyle=cols[o.v];c.fillRect(bx,y,w,h+12*s);
      if(o.ant)c.fillRect(bx+w*.4,y-14*s,1.6*s,14*s);
      if(wl&&sink<.7){c.fillStyle=wl;for(var j=0;j<o.lt.length;j+=2)c.fillRect(bx+(o.lt[j]+.5)*w/4.5,y+(o.lt[j+1]+.6)*h/8.6,1.8*s,1.8*s)}
    }
    c.globalAlpha=1;
  }
  function sea(c,P,x,yh){
    var s=V.s, ax=sxOf(SEA,.22,x);if(ax>V.W)return;
    var x0=Math.max(0,ax), g=c.createLinearGradient(0,yh,0,V.yt);
    g.addColorStop(0,rgb(mix(P.sea,P.hor,.55)));g.addColorStop(.35,rgb(P.sea));g.addColorStop(1,rgb(shade(P.sea,.8)));
    c.fillStyle=g;c.fillRect(x0,yh,V.W-x0,V.H-yh);
    c.fillStyle=rgb(mix(P.hor,[255,255,255],.3),.7);c.fillRect(x0,yh,V.W-x0,1.5*s);
    for(var j=0;j<16;j++){ // the sun's glitter on the water
      var y=yh+4*s+(j*j*.55+j*2)*s, half=(28-j*1.2)*s*(1+(j*37%7)/7), gx=V.sunX+Math.sin(j*12.9+x*.0004)*(10+j*3)*s;
      if(gx+half<x0)continue;
      c.fillStyle=rgb(mix(P.sun,[255,255,255],.5),.55*(1-j/16));c.fillRect(Math.max(x0,gx-half),y,half*2,1.6*s);
    }
  }
  function midLayer(c,P,x,yh){
    var d=.22, s=V.s, yb=V.yt-168*s, vw=view(d,x,200), a=WD.mid, i=first(a,vw[0]-2000);
    var base=mix(P.mid2,P.hor,.12), cols=shades(base), grid=rgb(shade(base,1.18),.55);
    var wl=P.dark>.05?rgb(WARM,Math.min(1,P.dark*1.15)):null, sx0=sxOf(SEA,d,x), gx, gy;
    if(sx0>0){ // land up to the coast
      c.fillStyle=rgb(mix(P.mid2,P.grd,.4));c.beginPath();c.moveTo(-10,yb);c.lineTo(sx0,yb);c.lineTo(sx0+90*s,V.yt-120*s);c.lineTo(sx0+90*s,V.H);c.lineTo(-10,V.H);c.fill();
    }
    for(;i<a.length&&a[i].wx<vw[1];i++){
      var o=a[i], bx=sxOf(o.wx,d,x), w=o.w*s, h=o.h*s, y=yb-h;
      if(bx+w<-60)continue;
      switch(o.t){
      case 'tower':
        c.fillStyle=cols[o.v];c.fillRect(bx,y,w,h+2);c.fillRect(bx+w*.25,y-5*s,w*.3,5*s);
        c.fillStyle=grid;for(gx=bx+4*s;gx<bx+w-2*s;gx+=7*s)c.fillRect(gx,y+5*s,Math.max(1,.8*s),h-5*s);
        if(wl)litWin(c,o,bx+2*s,y+7*s,7*s,10*s,3.4*s,4*s,wl);
        if(o.h>210&&P.dark>.1){c.fillStyle='#ff5b4d';c.fillRect(bx+w*.4-1.5*s,y-8*s,3*s,3*s)}
        break;
      case 'apt':
        c.fillStyle=cols[o.v];c.fillRect(bx,y,w,h+2);
        c.fillStyle=grid;for(gy=y+8*s;gy<yb-4*s;gy+=9*s)c.fillRect(bx,gy,w,Math.max(1,1.2*s));
        if(wl)litWin(c,o,bx+3*s,y+3*s,7*s,10*s,4*s,4*s,wl);
        break;
      case 'low':
        c.fillStyle=cols[o.v];c.fillRect(bx,y,w,h+2);c.fillStyle=cols[Math.max(0,o.v-1)];c.fillRect(bx-2*s,y,w+4*s,3*s);
        if(wl)litWin(c,o,bx+3*s,y+6*s,7*s,10*s,4*s,3*s,wl);
        break;
      case 'hill':
        c.fillStyle=rgb(mix(P.mid2,P.grd,.55));c.beginPath();c.moveTo(bx,yb+2);c.quadraticCurveTo(bx+w*.5,yb-h*2,bx+w,yb+2);c.fill();
        break;
      case 'tvt': // a broadcast tower on the far bank
        c.fillStyle=rgb(shade(base,1.22));c.beginPath();c.moveTo(bx-22*s,yb);c.lineTo(bx-3*s,y);c.lineTo(bx+3*s,y);c.lineTo(bx+22*s,yb);c.fill();
        c.fillRect(bx-1*s,y-30*s,2*s,30*s);c.fillRect(bx-14*s,yb-h*.58,28*s,10*s);c.fillRect(bx-9*s,yb-h*.76,18*s,7*s);
        if(wl){c.fillStyle=wl;c.fillRect(bx-12*s,yb-h*.58+4*s,24*s,2*s);c.fillStyle='#ff5b4d';c.fillRect(bx-1.5*s,y-33*s,3*s,3*s)}
        break;
      case 'isle':
        gy=yh+6*s;c.fillStyle=rgb(mix(P.mid2,P.sea,.35));c.beginPath();c.moveTo(bx,gy);c.quadraticCurveTo(bx+w*.35,gy-h*2.2,bx+w*.6,gy-h*.8);c.quadraticCurveTo(bx+w*.8,gy-h*.2,bx+w,gy);c.fill();
        break;
      case 'boat':
        gy=yh+(o.w>24?22:14)*s;c.fillStyle=rgb(shade(P.near,.8));c.beginPath();c.moveTo(bx,gy);c.lineTo(bx+w,gy);c.lineTo(bx+w*.85,gy+4*s);c.lineTo(bx+w*.12,gy+4*s);c.fill();
        c.fillStyle=rgb(mix([255,255,255],P.hor,.35));c.beginPath();c.moveTo(bx+w*.45,gy-1*s);c.lineTo(bx+w*.45,gy-h);c.lineTo(bx+w*.9,gy-1*s);c.fill();
        break;
      case 'cape':
        gy=yh+12*s;c.fillStyle=rgb(shade(mix(P.mid2,P.grd,.35),.78));c.beginPath();c.moveTo(bx,gy+60*s);c.lineTo(bx,gy);c.quadraticCurveTo(bx+w*.3,gy-h*1.6,bx+w*.75,gy-h*.6);c.quadraticCurveTo(bx+w*.9,gy-h*.2,bx+w,gy+4*s);c.lineTo(bx+w,gy+60*s);c.fill();
        break;
      case 'lh': // lighthouse on the cape
        var lb=yh-14*s, lt=lb-h;
        c.fillStyle=rgb(mix([248,248,244],P.near,.2+P.dark*.3));c.beginPath();c.moveTo(bx-6*s,lb);c.lineTo(bx-4*s,lt);c.lineTo(bx+4*s,lt);c.lineTo(bx+6*s,lb);c.fill();
        c.fillStyle=rgb(mix([200,60,50],P.near,.3));c.fillRect(bx-4.6*s,lt+12*s,9.2*s,5*s);
        c.fillStyle=rgb(shade(P.near,.7));c.fillRect(bx-5*s,lt-8*s,10*s,8*s);c.fillRect(bx-6*s,lt,12*s,2*s);
        if(P.dark>.1){
          glow(c,bx,lt-4*s,60*s,Math.min(.9,P.dark));
          c.fillStyle='rgba(255,244,200,'+(P.dark*.2).toFixed(2)+')';c.beginPath();c.moveTo(bx,lt-4*s);c.lineTo(bx-280*s,lt-36*s);c.lineTo(bx-280*s,lt+20*s);c.fill();
        }
        break;
      }
    }
  }
  function nearGround(c,P,x){
    var d=.45, s=V.s, yb=V.yt-120*s, vw=view(d,x,40);
    WD.ng.forEach(function(g){
      if(g[1]<vw[0]||g[0]>vw[1])return;
      var a=Math.max(-10,sxOf(g[0],d,x)), b=Math.min(V.W+10,sxOf(g[1],d,x)), w=b-a, t=g[2], j;
      if(t==='water'){
        var wg=c.createLinearGradient(0,yb,0,V.yt);wg.addColorStop(0,rgb(mix(P.hor,P.sea,.45)));wg.addColorStop(1,rgb(shade(mix(P.sea,P.near,.3),.85)));
        c.fillStyle=wg;c.fillRect(a,yb-6*s,w,V.H-yb+6*s);
        c.fillStyle=rgb(mix(P.hor,[255,255,255],.35),.5);
        for(j=0;j<6;j++){var ry=yb+(4+j*j*2.6)*s;for(var rx=a+((j*53)%90)*s;rx<b;rx+=(120+j*20)*s)c.fillRect(rx,ry,(26+j*6)*s,1.2*s)}
        return;
      }
      var col=t==='urban'?mix(P.near,P.trk,.45):t==='bank'?mix(P.grd,P.near,.2):t==='paddy'?mix(P.grd,[150,170,90],.18):t==='sand'?mix([205,190,150],P.near,.3+P.dark*.45):mix(P.grd,P.near,.18);
      c.fillStyle=rgb(col);c.fillRect(a,yb,w,V.H-yb);
      if(t==='paddy'){ // flooded rice fields mirror the sky
        c.fillStyle=rgb(mix(P.mid,P.hor,.5),.5);for(var py=yb+10*s;py<V.yt;py+=14*s)c.fillRect(a,py,w,3*s);
        c.fillStyle=rgb(shade(col,.82));for(j=Math.ceil(Math.max(g[0],vw[0])/150)*150;j<Math.min(g[1],vw[1]);j+=150)c.fillRect(sxOf(j,d,x),yb,2*s,V.yt-yb);
      }
    });
  }
  function nearLayer(c,P,x){
    var d=.45, s=V.s, yb=V.yt-120*s, vw=view(d,x,200), a=WD.near, i=first(a,vw[0]-500), gy, gx, e;
    var base=mix(P.near,P.hor,.06), cols=shades(base), grid=rgb(shade(base,1.2),.5), dk=rgb(shade(base,.72));
    var wl=P.dark>.05?rgb(WARM,Math.min(1,P.dark*1.2)):null, tree=mix(P.grd,P.near,.45), roof=rgb(mix(base,[40,52,92],.35));
    for(;i<a.length&&a[i].wx<vw[1];i++){
      var o=a[i], bx=sxOf(o.wx,d,x), w=o.w*s, h=o.h*s, y=yb-h;
      if(bx+w<-20)continue;
      switch(o.t){
      case 'shop':
        c.fillStyle=cols[o.v];c.fillRect(bx,y,w,h+2);
        c.fillStyle=rgb(mix(SIGNC[o.c],base,.35-P.dark*.2));c.fillRect(bx+4*s,y+5*s,w-8*s,11*s);
        c.fillStyle=wl||grid;c.fillRect(bx+6*s,yb-20*s,w-12*s,14*s);
        c.fillStyle=grid;for(gy=y+22*s;gy<yb-28*s;gy+=14*s)for(gx=bx+8*s;gx<bx+w-12*s;gx+=16*s)c.fillRect(gx,gy,9*s,7*s);
        break;
      case 'bldg':
        c.fillStyle=cols[o.v];c.fillRect(bx,y,w,h+2);c.fillRect(bx+w*.15,y-6*s,w*.25,6*s);
        c.fillStyle=grid;for(gy=y+8*s;gy<yb;gy+=11*s)c.fillRect(bx+3*s,gy,w-6*s,Math.max(1,1.4*s));
        if(wl)litWin(c,o,bx+4*s,y+10*s,8*s,11*s,5*s,4*s,wl);
        break;
      case 'apt':
        c.fillStyle=cols[o.v];c.fillRect(bx,y,w,h+2);
        c.fillStyle=grid;for(gy=y+10*s;gy<yb;gy+=11*s)c.fillRect(bx,gy,w,2*s);
        if(wl)litWin(c,o,bx+4*s,y+3*s,8*s,11*s,5*s,5*s,wl);
        break;
      case 'house':case 'farm':
        var wh=h*.62, ry=yb-wh, rh=o.t==='farm'?h*.75:h*.45;
        c.fillStyle=cols[o.v];c.fillRect(bx,ry,w,wh+2);
        c.fillStyle=roof;c.beginPath();c.moveTo(bx-4*s,ry);c.lineTo(bx+w*.2,ry-rh);c.lineTo(bx+w*.8,ry-rh);c.lineTo(bx+w+4*s,ry);c.fill();
        c.fillStyle=wl||grid;c.fillRect(bx+w*.2,ry+wh*.3,w*.22,wh*.3);
        break;
      case 'tree':
        c.fillStyle=dk;c.fillRect(bx+w*.46,yb-h*.42,w*.08,h*.42);
        c.fillStyle=rgb(tree);c.beginPath();
        [[.5,.62,.42],[.3,.45,.3],[.7,.48,.3]].forEach(function(L){c.moveTo(bx+w*L[0]+w*L[2],yb-h*L[1]);c.arc(bx+w*L[0],yb-h*L[1],w*L[2],0,TAU)});
        c.fill();
        break;
      case 'pine':
        c.strokeStyle=dk;c.lineWidth=3*s;c.beginPath();c.moveTo(bx+w*.45,yb);c.quadraticCurveTo(bx+w*.62,yb-h*.5,bx+w*.4,yb-h*.88);c.stroke();
        c.fillStyle=rgb(shade(tree,.82));c.beginPath();
        [[.4,.92,.44],[.62,.68,.36],[.28,.56,.3]].forEach(function(L){c.moveTo(bx+w*L[0]+w*L[2],yb-h*L[1]);c.ellipse(bx+w*L[0],yb-h*L[1],w*L[2],h*.1,0,0,TAU)});
        c.fill();
        break;
      }
    }
    // the elevated expressway through the city
    var e0=sxOf(-6500,d,x), e1=sxOf(1300,d,x);
    if(e1>0&&e0<V.W){
      var ey=yb-66*s, ea=Math.max(-10,e0), eb=Math.min(V.W+10,e1);
      c.fillStyle=rgb(shade(base,.9));
      for(e=-6500;e<=1300;e+=420){var ex=sxOf(e,d,x);if(ex>-20&&ex<V.W+20)c.fillRect(ex-5*s,ey,10*s,66*s)}
      c.fillStyle=rgb(mix(base,P.hor,.25),.85);c.fillRect(ea,ey-21*s,eb-ea,9*s);
      c.fillStyle=rgb(shade(base,1.08));c.fillRect(ea,ey-12*s,eb-ea,12*s);
      c.fillStyle=rgb(shade(base,.8));c.fillRect(ea,ey,eb-ea,3*s);
    }
    // utility poles (電柱) and their sagging wires
    var pv=view(d,x,40), prev=null, top=yb-104*s;
    c.fillStyle=dk;c.strokeStyle=dk;c.lineWidth=Math.max(1,.9*s);
    for(var p=0;p<WD.pole.length;p++){
      var pw=WD.pole[p];
      if(pw<pv[0]-500||pw>pv[1]+500){prev=null;continue}
      var px=sxOf(pw,d,x);
      c.fillRect(px-1.3*s,top,2.6*s,104*s);c.fillRect(px-9*s,top+8*s,18*s,2*s);
      if(prev!==null){c.beginPath();c.moveTo(prev-8*s,top+9*s);c.quadraticCurveTo((prev+px)/2,top+27*s,px-8*s,top+9*s);c.moveTo(prev+8*s,top+9*s);c.quadraticCurveTo((prev+px)/2,top+29*s,px+8*s,top+9*s);c.stroke()}
      prev=px;
    }
  }

  function station(c,P,x,k,conc){
    var s=V.s, yt=V.yt, X=SX[k], term=k===6, lw, lx;
    var a=sxOf(X-1190,1,x), b=sxOf(X+(term?240:90),1,x);
    // station building behind the platform
    var b0=sxOf(X-(term?1150:940),1,x), b1=sxOf(X-(term?260:400),1,x), bt=yt-(term?186:170)*s, wallc=shade(conc,.9);
    c.fillStyle=rgb(wallc);c.fillRect(b0,bt,b1-b0,yt-40*s-bt);
    c.fillStyle=rgb(shade(P.near,.85));
    if(term){c.beginPath();c.moveTo(b0-14*s,bt);c.lineTo((b0+b1)/2,bt-34*s);c.lineTo(b1+14*s,bt);c.fill()}
    else c.fillRect(b0-8*s,bt-7*s,b1-b0+16*s,8*s);
    c.fillStyle=P.dark>.08?rgb(WARM,Math.min(1,P.dark*1.2)):rgb(shade(wallc,.8));
    for(lx=b0+14*s;lx<b1-30*s;lx+=34*s)c.fillRect(lx,bt+12*s,22*s,14*s);
    // platform: top, tactile strip (点字ブロック), face
    c.fillStyle=rgb(conc);c.fillRect(a,yt-42*s,b-a,24*s);
    c.fillStyle=rgb(mix([236,196,40],P.near,.2+P.dark*.35));c.fillRect(a,yt-22*s,b-a,3*s);
    c.fillStyle=rgb(shade(conc,.68));c.fillRect(a,yt-19*s,b-a,17*s);
    // lamp posts
    for(lw=X-1130;lw<=X+40;lw+=236){
      lx=sxOf(lw,1,x);if(lx<-60||lx>V.W+60)continue;
      c.fillStyle=rgb(shade(conc,.6));c.fillRect(lx-1.6*s,yt-198*s,3.2*s,158*s);c.fillRect(lx-10*s,yt-200*s,20*s,4*s);
      if(P.dark>.06)glow(c,lx,yt-194*s,46*s,Math.min(.9,P.dark));
    }
    // a vending machine just past the train's nose
    lx=sxOf(X+30,1,x);
    c.fillStyle=rgb(mix([196,44,52],P.near,.22+P.dark*.25));c.fillRect(lx,yt-76*s,20*s,34*s);
    c.fillStyle=P.dark>.06?'rgba(255,248,226,.95)':rgb(mix([240,244,250],P.near,.2));c.fillRect(lx+3*s,yt-72*s,14*s,12*s);
    c.fillStyle=rgb(shade(conc,.6));c.fillRect(lx+3*s,yt-56*s,14*s,3*s);
  }
  function bridge(c,P,x,front){
    var s=V.s, yt=V.yt, a=sxOf(BR0,1,x), b=sxOf(BR1,1,x);
    if(b<-40||a>V.W+40)return;
    var col=mix([66,86,128],P.near,.28+P.dark*.42);if(front)col=shade(col,.8);
    c.strokeStyle=rgb(col);c.lineJoin='round';c.lineCap='round';
    [[BR0,5750],[5750,BR1]].forEach(function(sp){ // two Warren truss spans
      var sa=sxOf(sp[0],1,x), sb=sxOf(sp[1],1,x), n=8, dx=(sb-sa)/n, bot=yt+3*s, i;
      function ty(i){return yt-170*s-20*s*Math.sin(Math.PI*(i+.5)/n)}
      c.lineWidth=(front?5.5:4)*s;c.beginPath();
      for(i=0;i<n;i++){c.moveTo(sa+dx*i,bot);c.lineTo(sa+dx*(i+.5),ty(i));c.lineTo(sa+dx*(i+1),bot)}
      c.stroke();
      c.lineWidth=(front?8:6)*s;c.beginPath();c.moveTo(sa+dx*.5,ty(0));for(i=1;i<n;i++)c.lineTo(sa+dx*(i+.5),ty(i));
      c.moveTo(sa,bot);c.lineTo(sb,bot);c.stroke();
    });
  }
  function track(c,P,J){
    var x=J.x, v=J.v, s=V.s, yt=V.yt, W=V.W, H=V.H, vw=view(1,x,80), k, j, q;
    var endX=sxOf(END+170,1,x), conc=mix([196,200,208],P.near,.32+P.dark*.38);
    // the ground on our side of the line
    WD.tg.forEach(function(g){
      if(g[1]<vw[0]||g[0]>vw[1])return;
      var a=Math.max(-10,sxOf(g[0],1,x)), b=Math.min(W+10,sxOf(g[1],1,x)), w=b-a, y0=yt+14*s;
      if(g[2]==='water'){
        var wg=c.createLinearGradient(0,y0,0,H);wg.addColorStop(0,rgb(mix(P.hor,P.sea,.5)));wg.addColorStop(1,rgb(shade(mix(P.sea,P.near,.4),.75)));
        c.fillStyle=wg;c.fillRect(a,y0,w,H-y0);
        c.fillStyle=rgb(mix(P.hor,[255,255,255],.4),.45);
        for(j=0;j<7;j++)for(var rx=Math.ceil(vw[0]/170)*170+j*37;rx<g[1]&&rx<vw[1];rx+=170)if(rx>g[0])c.fillRect(sxOf(rx,1,x),y0+(10+j*j*4)*s,(30+j*8)*s,1.4*s);
      }else if(g[2]==='wall'){ // through the city the line runs on a viaduct, with little shops under the arches (ガード下)
        var wc=mix(conc,P.near,.18), lamp=P.dark>.08;
        c.fillStyle=rgb(wc);c.fillRect(a,y0,w,H-y0);
        c.fillStyle=rgb(shade(wc,1.1));c.fillRect(a,y0,w,4*s);
        c.fillStyle=rgb(shade(wc,.85));c.fillRect(a,y0+20*s,w,3*s);
        for(q=Math.floor(Math.max(g[0],vw[0]-300)/300)*300;q<Math.min(g[1],vw[1]+300);q+=300){
          var xl=sxOf(q,1,x)+15*s, xr=sxOf(q+300,1,x)-15*s, ay=y0+30*s, sc=SIGNC[((q/300|0)%4+4)%4];
          if(xr<-10||xl>W+10)continue;
          c.fillStyle=rgb(shade(mix(wc,P.near,.5),.42));
          c.beginPath();c.moveTo(xl,H);c.lineTo(xl,ay+20*s);c.quadraticCurveTo(xl,ay,xl+20*s,ay);c.lineTo(xr-20*s,ay);c.quadraticCurveTo(xr,ay,xr,ay+20*s);c.lineTo(xr,H);c.fill();
          c.fillStyle=rgb(mix(sc,P.near,.3-P.dark*.15));c.fillRect(xl+16*s,ay+8*s,xr-xl-32*s,12*s);
          c.fillStyle=lamp?rgb(WARM,.85):rgb(shade(wc,.72));c.fillRect(xl+16*s,ay+26*s,xr-xl-32*s,50*s);
          c.fillStyle=rgb(mix(sc,[30,30,40],.35));for(var nx=xl+20*s;nx<xr-30*s;nx+=16*s)c.fillRect(nx,ay+26*s,13*s,18*s);
          for(j=0;j<3;j++){ // paper lanterns (提灯)
            var lx2=xl+26*s+(xr-xl-52*s)*j/2;
            if(lamp)glow(c,lx2,ay+30*s,24*s,Math.min(.8,P.dark));
            c.fillStyle=lamp?'#ff7a4a':rgb(mix([200,70,60],P.near,.3));c.beginPath();c.ellipse(lx2,ay+30*s,5*s,7*s,0,0,TAU);c.fill();
          }
        }
      }else{
        var gg=c.createLinearGradient(0,y0,0,H);gg.addColorStop(0,rgb(mix(P.grd,P.near,.08)));gg.addColorStop(1,rgb(shade(mix(P.grd,P.near,.2),.7)));
        c.fillStyle=gg;c.fillRect(a,y0,w,H-y0);
        c.fillStyle=rgb(shade(P.grd,.8));c.fillRect(a,y0,w,6*s);
      }
    });
    for(k=0;k<7;k++)if(SX[k]+600>vw[0]&&SX[k]-1300<vw[1])station(c,P,x,k,conc);
    // fence on the far side of the line
    c.fillStyle=rgb(shade(mix(P.near,P.trk,.5),.85));
    for(q=Math.ceil(vw[0]/56)*56;q<vw[1];q+=56){
      if(q>BR0-60&&q<BR1+60||nearStation(q,1210,130)||q>END+300)continue;
      var fx=sxOf(q,1,x);c.fillRect(fx,yt-26*s,2*s,22*s);c.fillRect(fx,yt-23*s,56*s,1.6*s);
    }
    // overhead line: masts, messenger wire with droppers, contact wire
    var msx=[];c.fillStyle=rgb(mix([150,158,170],P.near,.3+P.dark*.45));
    WD.mast.forEach(function(m){
      if(m<vw[0]-700||m>vw[1]+700)return;
      var px=sxOf(m,1,x);msx.push(px);
      if(px<-40||px>W+40)return;
      c.fillRect(px-2.6*s,yt-212*s,5.2*s,214*s);c.fillRect(px,yt-204*s,30*s,2.6*s);c.fillRect(px,yt-186*s,30*s,2*s);c.fillRect(px+27*s,yt-206*s,2*s,32*s);
    });
    var cw=yt-176*s, mw=yt-200*s;
    c.strokeStyle=rgb(shade(mix(P.near,P.trk,.4),.6),.9);c.lineWidth=Math.max(1,1.1*s);c.beginPath();
    c.moveTo(-10,cw);c.lineTo(Math.min(W+10,sxOf(END+150,1,x)),cw);
    for(j=0;j+1<msx.length;j++){
      var a2=msx[j]+28*s, b2=msx[j+1]+28*s;if(b2<-20||a2>W+20)continue;
      var sag=10*s*(b2-a2)/(640*s);
      c.moveTo(a2,mw);c.quadraticCurveTo((a2+b2)/2,mw+sag*2,b2,mw);
      for(q=1;q<6;q++){var u=q/6, dxp=a2+(b2-a2)*u;c.moveTo(dxp,mw+4*sag*u*(1-u));c.lineTo(dxp,cw)}
    }
    c.stroke();
    // the river bridge: far truss, deck, piers
    var ba=sxOf(BR0,1,x), bb=sxOf(BR1,1,x), onBr=bb>-40&&ba<W+40;
    if(onBr){
      bridge(c,P,x,false);
      c.fillStyle=rgb(conc);[BR0,5750,BR1].forEach(function(pw){var px=sxOf(pw,1,x);c.fillRect(px-21*s,yt+14*s,42*s,6*s);c.fillRect(px-17*s,yt+14*s,34*s,H)});
      c.fillStyle=rgb(shade(mix([66,86,128],P.near,.3+P.dark*.42),.7));c.fillRect(ba,yt+2*s,bb-ba,14*s);
    }
    // ballast, sleepers (they blur with speed) and rails
    var ex=Math.min(W+10,endX);
    if(ex>-10){
      c.fillStyle=rgb(mix(P.trk,[128,120,110],.18));
      if(onBr){c.fillRect(-10,yt-3*s,Math.max(0,ba+10),17*s);if(ex>bb)c.fillRect(bb,yt-3*s,ex-bb,17*s)}
      else c.fillRect(-10,yt-3*s,ex+10,17*s);
      var sa1=1-v*.85;
      if(sa1>.04){c.fillStyle=rgb(shade(P.trk,.55),sa1);for(q=Math.ceil(vw[0]/24)*24;q<vw[1]&&q<END+170;q+=24)c.fillRect(sxOf(q,1,x),yt+1*s,9*s,5*s)}
      if(v>.05){c.fillStyle=rgb(shade(P.trk,.68),v*.55);c.fillRect(-10,yt+1*s,ex+10,5*s)}
      c.fillStyle=rgb(shade(P.trk,.5));c.fillRect(-10,yt+.5*s,ex+10,1.6*s);
      c.fillStyle=rgb(mix([214,220,230],P.hor,.3));c.fillRect(-10,yt-2*s,ex+10,2.6*s);
    }
    if(endX<W+20){ // end of the line: buffer stop
      c.fillStyle=rgb(mix(P.grd,P.near,.08));c.fillRect(endX,yt-3*s,W-endX+10,17*s);
      var x0=endX-16*s;
      c.fillStyle=rgb(mix([210,60,52],P.near,.25));c.fillRect(x0,yt-30*s,10*s,30*s);
      c.fillStyle=rgb(mix([250,250,250],P.near,.3));for(j=0;j<3;j++)c.fillRect(x0,yt-27*s+j*9*s,10*s,4*s);
      c.fillStyle=P.dark>.1?'#ff4b3e':rgb(mix([200,50,40],P.near,.3));c.beginPath();c.arc(x0+5*s,yt-36*s,4*s,0,TAU);c.fill();
    }
  }
  function drawFG(J,P){
    var c=cf, x=J.x, v=J.v, s=V.s, yt=V.yt, H=V.H;
    c.setTransform(V.dpr,0,0,V.dpr,0,0);c.clearRect(0,0,V.W,H);
    bridge(c,P,x,true);
    // utility poles rushing past, closer than the track
    var col=rgb(shade(mix(P.near,[20,24,44],.5),.9)), w=13*s;
    c.fillStyle=col;
    var pc=shade(mix(P.near,[20,24,44],.5),.9);
    WD.fgp.forEach(function(wx){
      var px=sxOf(wx,1.35,x);if(px<-200||px>V.W+200)return;
      if(v>.05){ // motion blur: a soft smear either side of the pole
        var sw=w/2+v*110*s, lg=c.createLinearGradient(px-sw,0,px+sw,0);
        lg.addColorStop(0,rgb(pc,0));lg.addColorStop(.5,rgb(pc,.3*v));lg.addColorStop(1,rgb(pc,0));
        c.globalAlpha=1;c.fillStyle=lg;c.fillRect(px-sw,-10,sw*2,H+20);
      }
      c.fillStyle=col;c.globalAlpha=.9-v*.6;c.fillRect(px-w/2,-10,w,H+20);c.fillRect(px-26*s,V.hh+18*s,52*s,6*s);
    });
    c.globalAlpha=1;
    // grass at our feet
    var d=1.6, vw=view(d,x,40), a=WD.grass, i=first(a,vw[0]), y0=yt+40*s;
    c.strokeStyle=rgb(shade(mix(P.grd,P.near,.2),.72));c.lineWidth=Math.max(1,1.6*s);c.lineCap='round';c.globalAlpha=1-v*.55;c.beginPath();
    for(;i<a.length&&a[i].wx<vw[1];i++){
      var o=a[i], tw=x+(o.wx-x)*d; // the track position this tuft stands in front of
      if(tw<4950||tw>BR0-40&&tw<BR1+40)continue;
      var gx=sxOf(o.wx,d,x), gy=y0+o.y*(H-y0), h=o.h*s;
      for(var b=0;b<o.n;b++){var bx=gx+b*3*s;c.moveTo(bx,gy);c.quadraticCurveTo(bx+o.l*s,gy-h*.6,bx+(o.l*2+(b-o.n/2)*2.4)*s,gy-h)}
    }
    c.stroke();c.globalAlpha=1;
  }

  /* ---------- train & signs, per frame ---------- */
  var tst=trainEl.style;
  function trainFrame(J,P){
    var x=J.x, amb=mix([255,255,255],P.hor,.18), dim=P.dark*.55;
    tst.setProperty('--rot',(x/9*57.2958%360).toFixed(1)+'deg');
    for(var k=0;k<3;k++)tst.setProperty('--b'+k,(Math.sin(x*.045+k*1.9)*.9*J.v).toFixed(2)+'px');
    tst.setProperty('--lit',sstep(.3,.75,P.dark).toFixed(3));
    tst.setProperty('--tb0',rgb(mix(mix([246,248,251],amb,.3),P.near,dim)));
    tst.setProperty('--tb1',rgb(mix(mix([226,231,238],amb,.25),P.near,dim)));
    tst.setProperty('--tb2',rgb(mix(mix([198,206,218],amb,.2),P.near,dim)));
    tst.setProperty('--td',rgb(mix(mix([220,226,234],amb,.25),P.near,dim)));
  }
  function signFrame(x){
    var s=V.s, top=V.yt-232*s;
    signs.forEach(function(g){
      var left=sxOf(g.wx,1,x)-160*s, on=left<V.W+10&&left+320*s>-10;
      if(on!==g.on){g.on=on;g.el.classList.toggle('on',on)}
      if(on)g.el.style.transform='translate3d('+left.toFixed(1)+'px,'+top.toFixed(1)+'px,0) scale('+s.toFixed(3)+')';
    });
  }
  function layout(){
    var w=stage.clientWidth, h=stage.clientHeight;
    if(!w||!h)return false;
    V.W=w;V.H=h;V.phone=w<700;
    V.hh=parseFloat(getComputedStyle(root).getPropertyValue('--hh'))||72;
    V.s=clamp(Math.max(w/1440,h/1250),.5,1.15);
    V.yt=Math.round(h*(V.phone?.7:.76));
    V.F=Math.round(w*(V.phone?.94:.8));
    V.dpr=Math.min(window.devicePixelRatio||1,V.phone?1.5:2);
    [cvb,cvf].forEach(function(cv){cv.width=Math.round(w*V.dpr);cv.height=Math.round(h*V.dpr)});
    stage.style.setProperty('--yt',V.yt+'px');
    trainSvg.setAttribute('width',(TRAIN*V.s).toFixed(1));trainSvg.setAttribute('height',(180*V.s).toFixed(1));
    tst.transform='translate3d('+(V.F-TRAIN*V.s).toFixed(1)+'px,'+(V.yt-180*V.s).toFixed(1)+'px,0)';
    return true;
  }

  /* ---------- the UI around the ride ---------- */
  var lcd=$('.lcd'), lcdMain=$('.lcd__main',lcd), lcdState=$('.lcd__state',lcd), lcdNo=$('.lcd__no',lcd), lcdName=$('.lcd__name b',lcd), lcdEn=$('.lcd__name small',lcd), lcdBody=$('.lcd__body',lcd), lcdSpd=$('.lcd__spd b',lcd);
  var ticket=$('.ticket'), rbar=$('.rbar'), rItems=$$('.rbar li');
  // the in-car display reads each station's text from the route map below
  var bodies=SX.map(function(_,k){var b=$('.rt__st[data-st="'+k+'"] .rt__body');if(!b)return'';b=b.cloneNode(true);var h=$('h3',b);if(h)h.parentNode.removeChild(h);return b.innerHTML});
  var LBL={dep:'次は',next:'次は',soon:'まもなく',stop:'ただいま'};
  var U={hf:-1,k:-1,st:'',spd:-1,lcd:null,tk:null,rb:null,on:-1};
  function ui(p,J){
    var hf=seg(p,.004,.03);
    if(hf!==U.hf){U.hf=hf;stage.style.setProperty('--hf',hf.toFixed(3));stage.classList.toggle('departed',hf>=1)}
    stage.style.setProperty('--rf',J.rf.toFixed(4));
    var rb=V.W>1100||hf>.9;if(rb!==U.rb){U.rb=rb;rbar.classList.toggle('on',rb)}
    var on=J.state==='dep'?0:J.k;
    if(on!==U.on){U.on=on;rItems.forEach(function(li,i){li.classList.toggle('on',i===on);li.classList.toggle('done',i<on)})}
    var showL=hf>.6&&p<.935, showT=p>=.94;
    if(showL!==U.lcd){U.lcd=showL;lcd.classList.toggle('on',showL)}
    if(showT!==U.tk){U.tk=showT;ticket.classList.toggle('on',showT)}
    var k=J.k, st=J.state;
    if(k!==U.k){
      U.k=k;
      lcdNo.innerHTML='NS<b>0'+(k+1)+'</b>';lcdName.textContent=ST[k].jp;lcdEn.textContent=ST[k].en;lcdBody.innerHTML=k<6?bodies[k]:'';
      lcdMain.classList.remove('swap');void lcdMain.offsetWidth;lcdMain.classList.add('swap');
    }
    if(st!==U.st){U.st=st;lcdState.textContent=st==='soon'&&k===6?'まもなく 終点':LBL[st];lcdState.classList.toggle('soon',st==='soon')}
    var spd=Math.round(J.v*110);if(spd!==U.spd){U.spd=spd;lcdSpd.textContent=spd}
  }

  /* ---------- engine ---------- */
  var themed=$$('[data-theme]'), ticking=false, lastP=-1, dirty=true, ready=false;
  function render(p){
    var J=journey(p), P=palette(clamp(J.x/END,0,1));
    draw(J,P);drawFG(J,P);trainFrame(J,P);signFrame(J.x);
    if(!isStatic)ui(p,J);
  }
  function update(){
    ticking=false;
    var vh=innerHeight;
    if(ready){
      var r=ride.getBoundingClientRect(), dist=r.height-vh, p=isStatic?0:(dist>0?clamp(-r.top/dist,0,1):0);
      if(r.bottom>0&&r.top<vh&&(dirty||p!==lastP)){lastP=p;dirty=false;render(p)}
    }
    // header colours follow whatever is under it
    var t='dark';
    themed.forEach(function(el){var b=el.getBoundingClientRect();if(b.top<=36&&b.bottom>36)t=el.dataset.theme});
    if(root.dataset.ui!==t)root.dataset.ui=t;
  }
  function onScroll(){if(!ticking){ticking=true;requestAnimationFrame(update)}}
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',function(){if(stage.clientWidth!==V.W||stage.clientHeight!==V.H){ready=layout();dirty=true}onScroll()});
  ready=layout();
  update();

  // station buttons: scroll (natively) to where the train stops there
  $$('[data-go]').forEach(function(b){
    b.addEventListener('click',function(){
      var k=+b.dataset.go;
      if(isStatic){var t=$('.rt__st[data-st="'+k+'"]');if(t)t.scrollIntoView({block:'start'});return}
      var top=ride.getBoundingClientRect().top+scrollY, dist=ride.offsetHeight-innerHeight;
      scrollTo({top:Math.round(top+stopAt(k)*dist),behavior:'smooth'});
    });
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

  /* ---------- mockup: lower pages are not built yet (delegated, so the LCD's copied links work too) ---------- */
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;
    var h=a.getAttribute('href');
    if(a.dataset.soon===undefined&&(/^https?:|^tel:|^mailto:|^#/.test(h)||/(^|\/)index\.html$/.test(h)))return;
    e.preventDefault();alert(a.dataset.soon||'モックアップのため、下層ページは未作成です。');
  });
})();
