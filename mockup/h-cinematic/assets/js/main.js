/* NEO SYSTEMS — Direction H
   Opening film + a story driven by native scrolling.
   The page is never scroll-jacked: each pinned scene reads how far
   the visitor has scrolled through it (0 → 1) and draws that frame. */
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

  // 05 — credits roll
  var crEl=$('[data-scene="cred"]'), roll, ccta, rollH=0;
  if(crEl){
    roll=$('.roll',crEl);ccta=$('.cred__cta',crEl);
    U.cred=function(p){
      if(!rollH)rollH=roll.offsetHeight;
      var vh=innerHeight, y0=vh*.6, y1=vh*.5-rollH;
      var y=y0+(y1-y0)*seg(p,0,.9);
      roll.style.transform='translate3d(0,'+y.toFixed(1)+'px,0)';
      // show the buttons only once the last credit has rolled clear of them
      ccta.classList.toggle('on',y+rollH<vh-ccta.offsetHeight-48);
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
  addEventListener('resize',function(){rollH=0;scenes.forEach(function(s){s.p=-1});onScroll()});
  addEventListener('load',function(){rollH=0;scenes.forEach(function(s){s.p=-1});onScroll()});

  if(isStatic){
    // calm version: show every scene in its final state
    if(U.sys)U.sys(1);
    if(U.dep)U.dep(1);
    if(U.trust)U.trust(1);
    if(ccta)ccta.classList.add('on');
  }
  update();

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
