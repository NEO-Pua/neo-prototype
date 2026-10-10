/* NEO SYSTEMS — Direction J「NEO LINE ― White Model」
   The NEO LINE journey as a white architectural model in real-time 3D.
   This file runs the page: the journey maths, autoplay between stations,
   the station panel and the route strip. The 3D world (world.js, Three.js)
   reads the shared state in window.NEOLINE and draws each frame. */
(function(){
  var root=document.documentElement;
  var isStatic=root.classList.contains('static');
  function $(s,c){return (c||document).querySelector(s)}
  function $$(s,c){return [].slice.call((c||document).querySelectorAll(s))}
  function clamp(v,a,b){return v<a?a:v>b?b:v}
  function seg(p,a,b){return clamp((p-a)/(b-a),0,1)}

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
  var SX=[0,470,940,1410,1880,2350,2820]; // metres along the line where the train's nose stops
  var P0=.035, TRAVEL=.135, DWELL=.02, LEG=TRAVEL+DWELL, ACC=.3, ARR=P0+5*LEG+TRAVEL;
  function arrTime(k){var m=k*4;return '09:'+(m<10?'0':'')+m}

  // where along the line is the train at scroll progress p?
  function journey(p){
    var o={x:0,v:0,k:1,i:0,tt:0,state:'dep',rf:0};
    if(p<P0)return o;
    var i=Math.min(5,Math.floor((p-P0)/LEG)), t=(p-P0-i*LEG)/TRAVEL;
    o.k=i+1;o.i=i;
    if(t>=1){o.x=SX[i+1];o.tt=1;o.state='stop';o.rf=(i+1)/6;return o}
    // accelerate, cruise, brake (trapezoid speed profile)
    var vm=1/(1-ACC), f, v;
    if(t<ACC){f=.5*vm*t*t/ACC;v=t/ACC}
    else if(t>1-ACC){var u=1-t;f=1-.5*vm*u*u/ACC;v=u/ACC}
    else{f=.5*vm*ACC+vm*(t-ACC);v=1}
    o.x=SX[i]+(SX[i+1]-SX[i])*f;o.v=v;o.tt=t;o.rf=(i+f)/6;
    o.state=t>.68?'soon':'next';
    return o;
  }
  // the resting point at each station: the end of its dwell, just before departure
  function stopAt(k){return k<=0?0:k>=6?1:P0+k*LEG-.002}
  // express (while fast-forwarding): constant speed straight through the stations.
  // It meets the normal stop-and-go journey exactly at every station stop, so the two blend seamlessly.
  function express(p){
    var i=0;while(i<5&&p>stopAt(i+1))i++;
    var u=seg(p,stopAt(i),stopAt(i+1));
    return{x:SX[i]+(SX[i+1]-SX[i])*u,v:1,i:i,k:i+1,tt:u,state:'pass',rf:(i+u)/6};
  }
  var lastPos=null, backward=false; // rewinding: the next station is the one behind us
  function runAt(p,xp){
    var J=blend(p,xp);
    if(lastPos!==null){if(J.x<lastPos-.5)backward=true;else if(J.x>lastPos+.5)backward=false}
    lastPos=J.x;
    if(backward&&J.state!=='stop'&&J.state!=='dep'){J.k=J.i;if(J.state!=='pass')J.state=J.tt<.32?'soon':'next'}
    return J;
  }
  function blend(p,xp){
    var J=journey(p);
    if(xp<.002)return J;
    var E=express(p);
    J.x+=(E.x-J.x)*xp;J.v+=(1-J.v)*xp;J.rf+=(E.rf-J.rf)*xp;
    if(E.i===J.i)J.tt+=(E.tt-J.tt)*xp;else if(xp>.5){J.i=E.i;J.tt=E.tt}
    if(xp>.5){J.state='pass';J.k=E.k}
    J.xp=xp;return J;
  }

  // shared with the 3D world (world.js)
  var S=window.NEOLINE={x:0,v:0,i:0,tt:0,xp:0,p:0,dirty:true,visible:true,static:isStatic};
  var ap=null;

  /* ---------- split-flap departure board and the headline ---------- */
  (function(){
    var pool='アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789:';
    $$('.tiles').forEach(function(el,row){
      el.dataset.to.split('').forEach(function(ch,i){
        var b=document.createElement('b');
        el.appendChild(b);
        if(isStatic){b.textContent=ch;return}
        b.textContent=pool[Math.floor(Math.random()*pool.length)];
        var n=8+i*2+row*4, k=0, t=setInterval(function(){
          if(++k>=n){b.textContent=ch;clearInterval(t);return}
          b.textContent=pool[Math.floor(Math.random()*pool.length)];
        },60);
      });
    });
    var h=$('[data-flip]'), i=0;
    if(h&&!isStatic)h.innerHTML=h.innerHTML.split('<br>').map(function(line){
      return '<span class="w">'+line.split('').map(function(c){return '<span class="c" style="--i:'+(i++)+'">'+c+'</span>'}).join('')+'</span>';
    }).join('<br>');
  })();
  function flip(el,text){
    el.innerHTML=text.split('').map(function(c,i){return '<span class="c" style="--i:'+i+'">'+c+'</span>'}).join('');
  }

  /* ---------- the UI around the ride ---------- */
  var stage=$('.stage'), ride=$('.ride');
  var sp=$('.sp'), spState=$('.sp__state',sp), spNo=$('.sp__name .rd b',sp), spJp=$('.sp__jp',sp), spEn=$('.sp__en',sp),
      spTime=$('.sp__time',sp), spKm=$('.sp__km',sp), spBody=$('.sp__body',sp), spImg=$('.sp__ph img',sp);
  var IMG='https://www.neo-systems.co.jp/wp-content/uploads/';
  var PHOTO=[null,IMG+'2023/03/advantages-and-disadvantages-of-cloud-service.jpg',IMG+'2023/06/cropped-dx-3.jpg',IMG+'2023/03/B004.jpg',
             IMG+'2023/10/cropped-cropped-pixta_69012043_M-1200x675-1.jpg',IMG+'2021/11/cropped-Rectangle-602-1.jpg',null];
  PHOTO.forEach(function(u){if(u){var im=new Image();im.src=u}});
  spImg.addEventListener('load',function(){spImg.classList.remove('ld')});
  var arrive=$('.arrive'), rstrip=$('.rstrip'), rItems=$$('.rstrip li');
  // the station panel reads each station's text from the route map below
  var bodies=SX.map(function(_,k){var b=$('.rt__st[data-st="'+k+'"] .rt__body');if(!b)return'';b=b.cloneNode(true);var h=$('h3',b);if(h)h.parentNode.removeChild(h);return b.innerHTML});
  var LBL={dep:'次は',next:'次は',soon:'まもなく',stop:'ただいま',pass:'通過'};
  var U={hf:-1,k:-1,st:'',sp:null,ar:null,rb:null,on:-1,mv:null,full:null,read:null};
  function ui(p,J){
    var hf=seg(p,.004,.03);
    if(hf!==U.hf){U.hf=hf;stage.style.setProperty('--hf',hf.toFixed(3));stage.classList.toggle('departed',hf>=1)}
    stage.style.setProperty('--rf',J.rf.toFixed(4));
    var rb=innerWidth>1100||hf>.9;if(rb!==U.rb){U.rb=rb;rstrip.classList.toggle('on',rb)}
    var mv=J.state==='next'||J.state==='soon'||J.state==='pass';if(mv!==U.mv){U.mv=mv;rstrip.classList.toggle('moving',mv)}
    var on=J.state==='dep'?0:J.k;
    if(on!==U.on){U.on=on;rItems.forEach(function(li,i){li.classList.toggle('on',i===on);li.classList.toggle('done',i<on)})}
    var showP=hf>.6&&p<ARR-.004, showA=p>=ARR-.002;
    if(showP!==U.sp){U.sp=showP;sp.classList.toggle('on',showP)}
    if(showA!==U.ar){U.ar=showA;arrive.classList.toggle('on',showA)}
    var k=J.k, st=J.state;
    if(k!==U.k){
      U.k=k;
      spNo.textContent='0'+(k+1);flip(spJp,ST[k].jp);spEn.textContent=ST[k].en;
      spTime.textContent=arrTime(k)+' 着';spKm.textContent='日本橋から '+(SX[k]/1000).toFixed(1)+' km';
      spBody.innerHTML=k<6?bodies[k]:'';
      sp.classList.toggle('no-ph',!PHOTO[k]);
      if(PHOTO[k]&&spImg.src!==PHOTO[k]){spImg.classList.add('ld');spImg.src=PHOTO[k]}
      sp.classList.remove('swap');void sp.offsetWidth;sp.classList.add('swap');
    }
    if(st!==U.st){U.st=st;spState.textContent=st==='soon'&&k===6?'まもなく 終点':LBL[st];spState.classList.toggle('soon',st==='soon');spState.classList.toggle('pass',st==='pass')}
    // travel to watch, arrive to read: the card opens and the scene steps back while the train stands at a station
    var full=st==='stop', read=full||showA;
    if(full!==U.full){U.full=full;sp.classList.toggle('full',full)}
    if(read!==U.read){U.read=read;stage.classList.toggle('reading',read);S.read=read;S.dirty=true}
    sp.style.setProperty('--lt',(J.state==='stop'?1:J.state==='dep'?0:J.tt).toFixed(3));
  }

  /* ---------- engine ---------- */
  var ticking=false, lastP=-1;
  function update(){
    ticking=false;
    var r=ride.getBoundingClientRect(), vh=innerHeight, dist=r.height-vh;
    S.visible=r.bottom>0&&r.top<vh;
    if(isStatic)return;
    var p=dist>0?clamp(-r.top/dist,0,1):0;
    if(p===lastP)return;
    lastP=p;
    var xp=ap?ap.xp():0, J=runAt(p,xp);
    S.x=J.x;S.v=J.v;S.i=J.i;S.tt=J.tt;S.xp=xp;S.p=p;S.dirty=true;
    ui(p,J);
  }
  function onScroll(){if(!ticking){ticking=true;requestAnimationFrame(update)}}
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',function(){lastP=-1;S.dirty=true;onScroll()});
  update();
  // if the 3D world cannot load (old device, blocked CDN), keep the page calm
  setTimeout(function(){if(!root.classList.contains('gl-ready'))root.classList.add('no-gl')},15000);

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

  function rideStops(){var t=ride.getBoundingClientRect().top+scrollY, d=ride.offsetHeight-innerHeight;return SX.map(function(_,k){return{y:Math.round(t+stopAt(k)*d)}})}
  ap=isStatic?null:autoplay({
    stops:rideStops,
    dur:function(px){return clamp(3600*Math.sqrt(px/(LEG*(ride.offsetHeight-innerHeight))),500,9000)}, // ~3.6s a station
    linear:true, // the train brings its own acceleration and braking
    skip:$('.skip'), skipTo:'#route'
  });

  // station buttons: the train rides there (several stations play faster)
  $$('[data-go]').forEach(function(b){
    b.addEventListener('click',function(){
      var k=+b.dataset.go;
      if(isStatic){var t=$('.rt__st[data-st="'+k+'"]');if(t)t.scrollIntoView({block:'start'});return}
      ap.to(rideStops()[k].y);
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

  /* ---------- mockup: lower pages are not built yet (delegated, so the panel's copied links work too) ---------- */
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;
    var h=a.getAttribute('href');
    if(a.dataset.soon===undefined&&(/^https?:|^tel:|^mailto:|^#/.test(h)||/(^|\/)index\.html$/.test(h)))return;
    e.preventDefault();alert(a.dataset.soon||'モックアップのため、下層ページは未作成です。');
  });
})();
