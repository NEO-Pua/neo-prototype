/* NEO SYSTEMS — Direction F (People-first)
   header island · audience switch · language menu · drawer · reveals · counters */
(function(){
  var root=document.documentElement;
  root.classList.remove('no-js');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- lower pages / other languages are not built in this mockup ----------
  document.querySelectorAll('a[href]').forEach(function(a){
    var h=a.getAttribute('href');
    if(a.dataset.soon===undefined&&(/^https?:|^tel:|^mailto:|^#/.test(h)||/(^|\/)index\.html$/.test(h)))return;
    a.addEventListener('click',function(e){e.preventDefault();alert(a.dataset.soon||'モックアップのため、下層ページは未作成です。')});
  });

  // ---------- header: compact state on scroll ----------
  var hdr=document.querySelector('.hdr');
  function onScroll(){
    if(hdr)hdr.classList.toggle('is-sc',window.scrollY>8);
    spy();
  }

  // ---------- audience switch (はたらきたい方 | 企業の方) ----------
  var aud=document.querySelector('.aud');
  var audBtns=aud?[].slice.call(aud.querySelectorAll('.aud__btn')):[];
  var biz=document.getElementById('business');
  var current='recruit';
  function placeThumb(){
    if(!aud||!aud.offsetParent)return;
    var on=aud.querySelector('.aud__btn.is-on');
    if(!on)return;
    aud.style.setProperty('--x',on.offsetLeft+'px');
    aud.style.setProperty('--w',on.offsetWidth+'px');
  }
  function setDoor(d){
    if(!aud)return;
    current=d;
    aud.dataset.active=d;
    audBtns.forEach(function(b){b.classList.toggle('is-on',b.dataset.door===d)});
    placeThumb();
  }
  var lock=0;
  function spy(){
    if(!aud||!biz||Date.now()<lock)return;
    var r=biz.getBoundingClientRect(), mid=window.innerHeight*0.45;
    var d=(r.top<mid&&r.bottom>mid)?'business':'recruit';
    if(d!==current)setDoor(d);
  }
  audBtns.forEach(function(b){
    b.addEventListener('click',function(){lock=Date.now()+1200;setDoor(b.dataset.door)});
  });
  if(aud){
    // place without the slide on first paint
    var thumb=aud.querySelector('.aud__thumb');
    if(thumb)thumb.style.transition='none';
    setDoor('recruit');
    requestAnimationFrame(function(){requestAnimationFrame(function(){if(thumb)thumb.style.transition=''})});
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(placeThumb);
    window.addEventListener('resize',placeThumb);
  }
  window.addEventListener('scroll',onScroll,{passive:true});
  onScroll();

  // ---------- language menu ----------
  var lang=document.querySelector('.lang'), lbtn=lang&&lang.querySelector('.lang__btn');
  function setLang(open){
    if(!lang)return;
    lang.classList.toggle('is-open',open);
    lbtn.setAttribute('aria-expanded',String(open));
  }
  if(lbtn){
    lbtn.addEventListener('click',function(e){e.stopPropagation();setLang(!lang.classList.contains('is-open'))});
    document.addEventListener('click',function(e){if(!lang.contains(e.target))setLang(false)});
    lang.addEventListener('focusout',function(e){if(!lang.contains(e.relatedTarget))setLang(false)});
  }

  // ---------- drawer (below 1020px) ----------
  var menuBtn=document.querySelector('.hdr__menu'), drw=document.getElementById('drawer');
  var mq=window.matchMedia('(max-width: 1019px)');
  function focusables(){
    return [menuBtn].concat([].slice.call(drw.querySelectorAll('a[href],button:not([disabled])')));
  }
  function setMenu(open,silent){
    if(!menuBtn||!drw)return;
    root.classList.toggle('menu-open',open);
    menuBtn.setAttribute('aria-expanded',String(open));
    menuBtn.setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');
    drw.setAttribute('aria-hidden',String(!open));
    if(open){drw.removeAttribute('inert');drw.scrollTop=0;setTimeout(function(){var f=drw.querySelector('a[href]');if(f)f.focus({preventScroll:true})},60)}
    else{drw.setAttribute('inert','');if(!silent)menuBtn.focus({preventScroll:true})}
  }
  if(menuBtn&&drw){
    drw.setAttribute('inert','');
    menuBtn.addEventListener('click',function(){setMenu(!root.classList.contains('menu-open'))});
    drw.addEventListener('click',function(e){var a=e.target.closest('a[href^="#"]');if(a)setMenu(false,true)});
    document.addEventListener('keydown',function(e){
      if(!root.classList.contains('menu-open'))return;
      if(e.key==='Tab'){
        var f=focusables(), first=f[0], last=f[f.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
      }
    });
    var onMq=function(){if(!mq.matches&&root.classList.contains('menu-open'))setMenu(false,true)};
    if(mq.addEventListener)mq.addEventListener('change',onMq);else if(mq.addListener)mq.addListener(onMq);
  }

  // ---------- Escape closes menus ----------
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    if(root.classList.contains('menu-open')){setMenu(false);return}
    if(lang&&lang.classList.contains('is-open')){setLang(false);lbtn.focus()}
  });

  // ---------- back to top ----------
  var toTop=document.querySelector('.totop');
  if(toTop)toTop.addEventListener('click',function(){
    window.scrollTo({top:0,behavior:reduce?'auto':'smooth'});
    var logo=document.querySelector('.hdr__logo');if(logo)logo.focus({preventScroll:true});
  });

  // ---------- scroll reveals (staggered inside [data-stagger]) ----------
  document.querySelectorAll('[data-stagger]').forEach(function(g){
    [].slice.call(g.children).forEach(function(el,i){if(el.classList.contains('rv'))el.style.setProperty('--d',(i%6)*90+'ms')});
  });
  // hero content is above the fold: play its entrance on load instead of waiting for the observer
  var hero=document.querySelector('.hero');
  var heroRv=hero?[].slice.call(hero.querySelectorAll('.rv')):[];
  heroRv.forEach(function(el,i){el.style.setProperty('--d',(80+i*90)+'ms')});
  requestAnimationFrame(function(){requestAnimationFrame(function(){heroRv.forEach(function(el){el.classList.add('in')})})});
  var rvs=[].slice.call(document.querySelectorAll('.rv')).filter(function(el){return heroRv.indexOf(el)<0});
  if('IntersectionObserver' in window&&!reduce){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}});
    },{rootMargin:'0px 0px -8% 0px',threshold:.06});
    rvs.forEach(function(el){io.observe(el)});
  }else rvs.forEach(function(el){el.classList.add('in')});

  // ---------- yellow marker: draw when its heading is in view ----------
  var mks=[].slice.call(document.querySelectorAll('.mk'));
  if('IntersectionObserver' in window&&!reduce){
    var mo=new IntersectionObserver(function(es){
      es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('on');mo.unobserve(e.target)}});
    },{threshold:.9});
    mks.forEach(function(m){mo.observe(m)});
  }else mks.forEach(function(m){m.classList.add('on')});

  // ---------- count-up numbers ----------
  var nums=[].slice.call(document.querySelectorAll('[data-count]'));
  if('IntersectionObserver' in window&&!reduce){
    var co=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting)return;
        co.unobserve(e.target);
        var el=e.target,to=+el.dataset.count,t0=null,dur=1300;
        el.textContent='0';
        (function step(t){
          if(!t0)t0=t;
          var p=Math.min(1,(t-t0)/dur);
          el.textContent=String(Math.round(to*(1-Math.pow(1-p,3))));
          if(p<1)requestAnimationFrame(step);
        })(performance.now());
      });
    },{threshold:.6});
    nums.forEach(function(n){co.observe(n)});
  }
})();
