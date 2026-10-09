/* NEO SYSTEMS — Direction G「和モダン・JAPAN BLUE（藍）」
   hero intro, header, drawer, 屏風 panels, reveals, scroll-spy */
(function(){
  'use strict';
  var d=document, root=d.documentElement, w=window;
  root.classList.remove('no-js');
  root.classList.add('js');
  var reduce=w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover=w.matchMedia('(hover: hover) and (pointer: fine)');
  var mqDesk=w.matchMedia('(min-width: 960px)');
  var mqMenu=w.matchMedia('(max-width: 1019px)');
  function each(sel,fn,ctx){Array.prototype.forEach.call((ctx||d).querySelectorAll(sel),fn)}

  // ---------- split the hero statement into characters (for the slow ink-in) ----------
  each('[data-split]',function(el){
    var i=0;
    (function walk(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(n){
        if(n.nodeType===3){
          var frag=d.createDocumentFragment();
          Array.from(n.textContent).forEach(function(ch){
            var s=d.createElement('span');
            s.className='ch';s.style.setProperty('--i',i++);s.textContent=ch;
            frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag,n);
        }else if(n.nodeType===1){walk(n)}
      });
    })(el);
  });

  // ---------- hero intro: start once webfonts are ready (no vertical-text reflow) ----------
  var started=false;
  function start(){
    if(started)return;started=true;
    // a short timer (not rAF) so the intro also completes in background tabs
    setTimeout(function(){root.classList.add('is-ready')},60);
  }
  if(reduce){start()}
  else{
    if(d.fonts&&d.fonts.ready){d.fonts.ready.then(start)}else{start()}
    setTimeout(start,1500);
  }

  // ---------- header: washi + hairline after scrolling ----------
  var hdr=d.querySelector('.hdr');
  function onScroll(){hdr.classList.toggle('is-sc',w.scrollY>8)}
  w.addEventListener('scroll',onScroll,{passive:true});onScroll();

  // ---------- drawer menu ----------
  var menuBtn=d.querySelector('.hdr__menu'), drawer=d.getElementById('drawer');
  var outside=[d.querySelector('main'),d.querySelector('footer')];
  function setMenu(open,focusBack){
    root.classList.toggle('is-menu',open);
    menuBtn.setAttribute('aria-expanded',String(open));
    menuBtn.setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');
    drawer.setAttribute('aria-hidden',String(!open));
    if(open){drawer.removeAttribute('inert')}else{drawer.setAttribute('inert','')}
    outside.forEach(function(el){if(!el)return;if(open){el.setAttribute('inert','')}else{el.removeAttribute('inert')}});
    if(open){
      var first=drawer.querySelector('a');
      setTimeout(function(){if(first)first.focus({preventScroll:true})},80);
    }else if(focusBack){menuBtn.focus()}
  }
  if(menuBtn&&drawer){
    menuBtn.addEventListener('click',function(){setMenu(!root.classList.contains('is-menu'))});
    drawer.addEventListener('click',function(e){if(e.target.closest('a'))setMenu(false)});
    d.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&root.classList.contains('is-menu')){setMenu(false,true)}
    });
    var onMq=function(){if(!mqMenu.matches&&root.classList.contains('is-menu'))setMenu(false)};
    if(mqMenu.addEventListener)mqMenu.addEventListener('change',onMq);else mqMenu.addListener(onMq);
  }

  // ---------- 屏風 folding-screen panels (desktop) / accordion rows (mobile) ----------
  var byobu=d.querySelector('[data-byobu]');
  if(byobu){
    var panels=Array.prototype.slice.call(byobu.querySelectorAll('.byobu__p')), timer=null;
    var set=function(p,on){
      p.classList.toggle('is-open',on);
      p.querySelector('.byobu__btn').setAttribute('aria-expanded',String(on));
    };
    var open=function(p){panels.forEach(function(q){set(q,q===p)})};
    panels.forEach(function(p){
      var btn=p.querySelector('.byobu__btn');
      btn.addEventListener('click',function(){
        if(!mqDesk.matches&&p.classList.contains('is-open')){set(p,false);return}
        open(p);
      });
      p.addEventListener('mouseenter',function(){
        if(!mqDesk.matches||!canHover.matches)return;
        clearTimeout(timer);timer=setTimeout(function(){open(p)},110);
      });
      p.addEventListener('mouseleave',function(){clearTimeout(timer)});
      p.addEventListener('focusin',function(){if(mqDesk.matches&&!p.classList.contains('is-open'))open(p)});
    });
    var onDesk=function(){if(mqDesk.matches&&!byobu.querySelector('.byobu__p.is-open'))open(panels[0])};
    if(mqDesk.addEventListener)mqDesk.addEventListener('change',onDesk);else mqDesk.addListener(onDesk);
  }

  // ---------- scroll reveals (fade + slight blur) and ink-spreading images ----------
  var rvs=d.querySelectorAll('.rv,.ink:not(.hero__photo)');
  if(reduce||!('IntersectionObserver' in w)){
    Array.prototype.forEach.call(rvs,function(el){el.classList.add('in')});
  }else{
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}});
    },{rootMargin:'0px 0px -10% 0px',threshold:.06});
    Array.prototype.forEach.call(rvs,function(el){io.observe(el)});
  }

  // ---------- scroll-spy for the global navigation ----------
  var navLinks=d.querySelectorAll('.gnav a[href^="#"]');
  if('IntersectionObserver' in w&&navLinks.length){
    var map={};
    Array.prototype.forEach.call(navLinks,function(a){var s=d.querySelector(a.getAttribute('href'));if(s)map[s.id]=a});
    var spy=new IntersectionObserver(function(es){
      es.forEach(function(e){
        var a=map[e.target.id];if(!a)return;
        if(e.isIntersecting){Array.prototype.forEach.call(navLinks,function(x){x.classList.remove('is-cur')});a.classList.add('is-cur')}
        else{a.classList.remove('is-cur')}
      });
    },{rootMargin:'-45% 0px -50% 0px'});
    Object.keys(map).forEach(function(id){spy.observe(d.getElementById(id))});
  }

  // ---------- mockup: lower pages not built yet ----------
  document.querySelectorAll('a[href]').forEach(function(a){
    var h=a.getAttribute('href');
    if(a.dataset.soon===undefined&&(/^https?:|^tel:|^mailto:|^#/.test(h)||/(^|\/)index\.html$/.test(h)))return;
    a.addEventListener('click',function(e){e.preventDefault();alert(a.dataset.soon||'モックアップのため、下層ページは未作成です。')});
  });
})();
