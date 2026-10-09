/* NEO SYSTEMS — Direction A (v2): main visual slideshow, header, drawer, news tabs, reveals, counters */
(function(){
  var root=document.documentElement;
  root.classList.remove('no-js');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- header shadow + page-top ----------
  var hdr=document.querySelector('.hdr'), tt=document.querySelector('.totop');
  function onScroll(){
    hdr.classList.toggle('is-sc',scrollY>4);
    if(tt)tt.classList.toggle('show',scrollY>600);
  }
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  if(tt)tt.addEventListener('click',function(){scrollTo({top:0,behavior:reduce?'auto':'smooth'})});

  // ---------- main visual: slow photo crossfade ----------
  var imgs=[].slice.call(document.querySelectorAll('.mv__ph img'));
  var cur=document.querySelector('.mv__ctrl .cur'), bar=document.querySelector('.mv__bar i');
  if(imgs.length>1){
    var i=0;
    function show(n){
      imgs.forEach(function(im){im.classList.remove('prev')});
      imgs[i].classList.remove('on');imgs[i].classList.add('prev');
      i=n;imgs[i].classList.add('on');
      if(cur)cur.textContent=('0'+(i+1)).slice(-2);
      if(bar){bar.classList.remove('run');void bar.offsetWidth;bar.classList.add('run')}
    }
    if(!reduce){
      if(bar)bar.classList.add('run');
      setInterval(function(){show((i+1)%imgs.length)},7000);
    }
  }

  // ---------- mega menu: close on Escape ----------
  addEventListener('keydown',function(e){
    if(e.key==='Escape'&&document.activeElement&&document.activeElement.closest('.gnav'))document.activeElement.blur();
  });

  // ---------- phone drawer ----------
  var burger=document.querySelector('.blk--menu'), drw=document.querySelector('.drw');
  function setMenu(open){
    root.classList.toggle('menu-open',open);
    burger.setAttribute('aria-expanded',open);
    burger.setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');
    drw.setAttribute('aria-hidden',!open);
  }
  if(burger&&drw){
    burger.addEventListener('click',function(){setMenu(!root.classList.contains('menu-open'))});
    drw.addEventListener('click',function(e){if(e.target.closest('a'))setMenu(false)});
    addEventListener('keydown',function(e){if(e.key==='Escape'&&root.classList.contains('menu-open')){setMenu(false);burger.focus()}});
  }

  // ---------- news tabs ----------
  var tabs=document.querySelectorAll('.ntabs button');
  tabs.forEach(function(b){
    b.addEventListener('click',function(){
      tabs.forEach(function(x){x.classList.remove('on');x.setAttribute('aria-selected','false')});
      b.classList.add('on');b.setAttribute('aria-selected','true');
      var c=b.dataset.cat;
      document.querySelectorAll('.nlist li').forEach(function(li){li.classList.toggle('hide',c!=='all'&&li.dataset.cat!==c)});
    });
  });

  // ---------- scroll reveal ----------
  var rvs=document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'});
    rvs.forEach(function(el){io.observe(el)});
  }else rvs.forEach(function(el){el.classList.add('in')});

  // ---------- count-up numbers ----------
  var nums=document.querySelectorAll('[data-count]');
  if('IntersectionObserver' in window&&!reduce){
    var co=new IntersectionObserver(function(es){es.forEach(function(e){
      if(!e.isIntersecting)return;co.unobserve(e.target);
      var el=e.target,to=+el.dataset.count,t0=null,d=1400;
      function fmt(v){return el.dataset.sep!==undefined?v.toLocaleString('ja-JP'):String(v)}
      function step(t){if(!t0)t0=t;var p=Math.min(1,(t-t0)/d);el.textContent=fmt(Math.round(to*(1-Math.pow(1-p,3))));if(p<1)requestAnimationFrame(step)}
      el.textContent='0';requestAnimationFrame(step);
    })},{threshold:.6});
    nums.forEach(function(n){co.observe(n)});
  }

  // ---------- mockup: lower pages not built yet ----------
  document.querySelectorAll('a[href]').forEach(function(a){
    var h=a.getAttribute('href');
    if(a.dataset.soon===undefined&&(/^https?:|^tel:|^#/.test(h)||/(^|\/)index\.html$/.test(h)))return;
    a.addEventListener('click',function(e){e.preventDefault();alert(a.dataset.soon||'モックアップのため、下層ページは未作成です。')});
  });
})();
