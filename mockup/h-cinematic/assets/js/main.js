/* NEO SYSTEMS — Direction H
   Opening film + a story driven by the scroll position: each pinned
   scene reads how far the page has scrolled through it (0 → 1) and
   draws that frame. One scroll gesture autoplays to the next beat. */
(function(){
  var root=document.documentElement;
  var isStatic=root.classList.contains('static');
  function $(s,c){return (c||document).querySelector(s)}
  function $$(s,c){return [].slice.call((c||document).querySelectorAll(s))}
  function clamp(v,a,b){return v<a?a:v>b?b:v}
  function seg(p,a,b){return clamp((p-a)/(b-a),0,1)}

  /* ---------- opening film ---------- */
  var film=$('#film'), filmTimer=0;
  var skipTypes=['wheel','touchstart','keydown'];
  function splitChars(el){
    var i=0;
    [].slice.call(el.childNodes).forEach(function(n){
      if(n.nodeType!==3)return;
      var frag=document.createDocumentFragment();
      n.textContent.split('').forEach(function(ch){
        var s=document.createElement('span');
        s.className='ch';s.style.setProperty('--i',i++);s.textContent=ch;
        frag.appendChild(s);
      });
      n.parentNode.replaceChild(frag,n);
    });
  }
  function onSkip(e){
    if(e.type==='keydown'&&(e.key==='Tab'||e.key==='Shift'))return;
    endFilm();
  }
  function endFilm(){
    if(!film||film.classList.contains('is-out'))return;
    clearTimeout(filmTimer);
    film.classList.add('is-out');
    root.classList.remove('awaiting');
    try{sessionStorage.setItem('neo-film','1')}catch(e){}
    skipTypes.forEach(function(t){removeEventListener(t,onSkip)});
    var f=film;film=null;
    setTimeout(function(){if(f.parentNode)f.parentNode.removeChild(f)},600);
  }
  if(film){
    if(root.classList.contains('no-film')){film.parentNode.removeChild(film);film=null}
    else{
      $$('[data-split]',film).forEach(splitChars);
      filmTimer=setTimeout(endFilm,7600);
      setTimeout(function(){skipTypes.forEach(function(t){addEventListener(t,onSkip,{passive:true})})},300);
      $('.film__skip',film).addEventListener('click',endFilm);
    }
  }
  $$('[data-replay]').forEach(function(b){
    b.addEventListener('click',function(){
      try{sessionStorage.removeItem('neo-film')}catch(e){}
      root.style.scrollBehavior='auto';
      scrollTo(0,0);
      location.href=location.pathname;
    });
  });

  /* ---------- scene updaters: p = 0…1 through each pinned scene ---------- */
  var U={};

  // 02 — code types itself → architecture assembles → services spotlight
  var sysEl=$('[data-scene="sys"]');
  if(sysEl){
    var sysWrap=$('.sys',sysEl), arch=$('.arch',sysEl);
    var lines=$$('.cl',sysEl).map(function(cl){var tx=$('.tx',cl);return{cl:cl,tx:tx,len:tx.textContent.length,c:-1}});
    var acc=0;lines.forEach(function(l){l.start=acc;acc+=l.len+4});
    var total=acc;
    var core=$('.core',arch), biz=$('.biz',arch), mods=$$('.mod',arch), svcs=$$('.svc',sysEl);
    var lastCur=-2, lastIdx=-2, lastPhase='';
    var done=function(i){return lines[i].c>=lines[i].len};
    U.sys=function(p){
      var typed=Math.round(seg(p,.02,.40)*total), cur=0;
      lines.forEach(function(l,i){
        var c=clamp(typed-l.start,0,l.len);
        if(c!==l.c){l.c=c;l.tx.style.setProperty('--c',c)}
        if(typed>=l.start)cur=i;
      });
      if(cur!==lastCur){if(lines[lastCur])lines[lastCur].cl.classList.remove('cur');lines[cur].cl.classList.add('cur');lastCur=cur}
      core.classList.toggle('on',done(7));
      mods.forEach(function(m,k){m.classList.toggle('on',done(9+k))});
      biz.classList.toggle('on',done(18));
      sysEl.style.setProperty('--wire',seg(p,.40,.47).toFixed(3));
      arch.classList.toggle('live',p>.47);
      var mv=seg(p,.48,.57);
      sysEl.style.setProperty('--mv',mv.toFixed(3));
      var phase=mv>.5?'svc':'code';
      if(phase!==lastPhase){lastPhase=phase;sysWrap.dataset.phase=phase}
      var idx=p<.57?-1:Math.min(4,Math.floor((p-.57)/.086));
      if(idx!==lastIdx){
        lastIdx=idx;
        if(idx<0)arch.removeAttribute('data-active');else arch.setAttribute('data-active',idx);
        svcs.forEach(function(s,k){s.classList.toggle('on',k===idx)});
      }
    };
  }

  // 03 — dawn wipe, then the deploy pipeline runs
  var depEl=$('[data-scene="dep"]');
  if(depEl){
    var stgs=$$('.stg',depEl), logs=$$('.log li',depEl), pctEl=$('.pct span',depEl), lastPct=-1;
    var step=.66/6;
    U.dep=function(p){
      var w=seg(p,.02,.18);
      depEl.style.setProperty('--wp',w.toFixed(3));
      depEl.dataset.theme=w>.55?'light':'dark';
      var prog=seg(p,.24,.90);
      depEl.style.setProperty('--prog',prog.toFixed(3));
      var pc=Math.round(prog*100);
      if(pc!==lastPct){lastPct=pc;pctEl.textContent=pc}
      stgs.forEach(function(s,k){
        var t0=.24+k*step, dn=p>=t0+step;
        s.classList.toggle('done',dn);
        s.classList.toggle('run',!dn&&p>=t0);
      });
      logs.forEach(function(l,k){
        l.classList.toggle('on',k===0?p>=.2:k<=6?p>=.24+k*step:p>=.92);
      });
    };
  }

  // 04 — shield draws, checks pass one by one
  var trEl=$('[data-scene="trust"]');
  if(trEl){
    var tests=$$('.tests li',trEl), tsum=$('.tsum',trEl);
    U.trust=function(p){
      trEl.style.setProperty('--draw',seg(p,.04,.42).toFixed(3));
      trEl.style.setProperty('--ck',seg(p,.42,.52).toFixed(3));
      tests.forEach(function(t,k){t.classList.toggle('pass',p>=.22+k*.12)});
      tsum.classList.toggle('on',p>=.78);
    };
  }

  // 05 — credits: one title card at a time, each holding still long enough to read
  var crEl=$('[data-scene="cred"]'), cards=[], pips=[], lastCard=-2;
  if(crEl){
    cards=$$('.card',crEl);pips=$$('.cdots li',crEl);
    U.cred=function(p){
      var i=p<.36?0:p<.7?1:2;
      if(i===lastCard)return;
      lastCard=i;
      cards.forEach(function(c,k){c.classList.toggle('on',k===i);c.classList.toggle('past',k<i)});
      pips.forEach(function(d,k){d.classList.toggle('on',k<=i)});
    };
  }

  /* ---------- engine ---------- */
  var scenes=$$('[data-scene]').map(function(el){return{el:el,fn:U[el.dataset.scene],p:-1}});
  var themed=$$('[data-theme]');
  var chapters=$$('.rail a').map(function(a){return{a:a,t:document.getElementById(a.getAttribute('href').slice(1)),n:a.dataset.n,label:a.dataset.label}});
  var chipN=$('.chip b'), chipT=$('.chip .chip__t'), lastChap=null, ticking=false;

  function update(){
    ticking=false;
    var vh=innerHeight, max=root.scrollHeight-vh;
    root.style.setProperty('--sp',(max>0?scrollY/max:0).toFixed(4));
    if(!isStatic){
      scenes.forEach(function(s){
        var r=s.el.getBoundingClientRect(), dist=r.height-vh;
        var p=dist>0?clamp(-r.top/dist,0,1):0;
        if(Math.abs(p-s.p)>.0004){s.p=p;s.el.style.setProperty('--p',p.toFixed(4));if(s.fn)s.fn(p)}
      });
    }
    // header colours follow whatever is under it
    var t='dark';
    themed.forEach(function(el){var r=el.getBoundingClientRect();if(r.top<=36&&r.bottom>36)t=el.dataset.theme});
    if(root.dataset.ui!==t)root.dataset.ui=t;
    // current chapter
    var cur=chapters[0];
    chapters.forEach(function(c){if(c.t&&c.t.getBoundingClientRect().top<=vh*.5)cur=c});
    if(cur!==lastChap){
      lastChap=cur;
      chapters.forEach(function(c){
        c.a.classList.toggle('on',c===cur);
        if(c===cur)c.a.setAttribute('aria-current','true');else c.a.removeAttribute('aria-current');
      });
      if(chipN){chipN.textContent=cur.n;chipT.textContent=cur.label}
    }
  }
  function onScroll(){if(!ticking){ticking=true;requestAnimationFrame(update)}}
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',function(){scenes.forEach(function(s){s.p=-1});onScroll()});
  addEventListener('load',function(){scenes.forEach(function(s){s.p=-1});onScroll()});

  if(isStatic){
    // calm version: show every scene in its final state
    if(U.sys)U.sys(1);
    if(U.dep)U.dep(1);
    if(U.trust)U.trust(1);
  }
  update();

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
      var lin=o.linear||(chained&&performance.now()<ffUntil); // express: constant speed straight through the beats
      anim={y0:y0,y1:t.y,k:0,dur:!chained&&t.ms?t.ms:o.dur(px),ease:lin?null:chained?easeO:easeIO,lin:lin&&!o.linear};
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
      xp+=((fast?1:0)-xp)*.1;
      // entering express mid-beat: carry on at constant speed; leaving it: ease into the next beat
      if(fast&&anim.ease&&!anim.lin)retarget(null,true);
      else if(!fast&&anim.lin&&anim.k<.98)retarget(easeO,false);
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
    function retarget(e,lin){ // same target, from where we are now, with a new easing (no second loop)
      var y0=scrollY;anim={y0:y0,y1:anim.y1,k:0,dur:o.dur(Math.max(2,Math.abs(anim.y1-y0))),ease:e,lin:lin};
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

  if(!isStatic){
    var sceneY=function(n,p){var el=$('[data-scene="'+n+'"]'),t=el.getBoundingClientRect().top+scrollY;return Math.round(t+p*(el.offsetHeight-innerHeight))};
    var hap=autoplay({
      // the beats of the story; ms = how long that leg plays
      stops:function(){
        var s=[{y:0},{y:sceneY('sys',.47),ms:4200}];                             // code types itself, the system assembles
        [.613,.699,.785,.871,1].forEach(function(p){s.push({y:sceneY('sys',p),ms:2000})}); // the five services, one by one
        s.push({y:sceneY('dep',.2),ms:3000},{y:sceneY('dep',.93),ms:4500},     // dawn, then the deploy runs
               {y:sceneY('trust',.85),ms:4000},                                // checks pass
               {y:sceneY('cred',.18),ms:2600},{y:sceneY('cred',.53),ms:1800},{y:sceneY('cred',1),ms:2200}); // credits: company, now casting, starring
        return s;
      },
      dur:function(px){return clamp(1500*Math.sqrt(px/innerHeight),900,5000)},
      hold:function(){return root.classList.contains('awaiting')}, // the opening film is still playing
      skip:$('.skip'), skipTo:'#contact'
    });
  }

  // the chapter rail (and the phone menu's chapters) jump through the story instead of a plain smooth scroll
  if(!isStatic)document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('.rail a[href^="#"],.menu__chap a[href^="#"]');if(!a||!hap)return;
    var t=document.getElementById(a.getAttribute('href').slice(1));if(!t)return;
    e.preventDefault();
    hap.to(Math.round(t.getBoundingClientRect().top+scrollY));
  });

  /* ---------- MOTION switch (persists, then reloads at the same chapter) ---------- */
  $$('[data-motion]').forEach(function(b){
    b.setAttribute('aria-pressed',String(!isStatic));
    var st=$('.motion__st',b);if(st)st.textContent=isStatic?'OFF':'ON';
    b.addEventListener('click',function(){
      var next=isStatic?'on':'off';
      try{localStorage.setItem('neo-motion',next)}catch(e){}
      var id=lastChap&&lastChap.t?lastChap.t.id:'top';
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

  /* ---------- mockup: lower pages are not built yet ---------- */
  $$('a[href]').forEach(function(a){
    var h=a.getAttribute('href');
    if(a.dataset.soon===undefined&&(/^https?:|^tel:|^mailto:|^#/.test(h)||/(^|\/)index\.html$/.test(h)))return;
    a.addEventListener('click',function(e){e.preventDefault();alert(a.dataset.soon||'モックアップのため、下層ページは未作成です。')});
  });
})();
