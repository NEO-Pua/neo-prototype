/* NEO SYSTEMS — Direction B: header state, menu, reveals, counters, news filter */
(function(){
  var root=document.documentElement;
  root.classList.remove('no-js');

  // ---------- header: transparent over hero, solid after ----------
  var hdr=document.querySelector('.hdr'), hero=document.querySelector('.hero');
  function hstate(){hdr.classList.toggle('is-solid',scrollY>(hero?hero.offsetHeight-90:10))}
  addEventListener('scroll',hstate,{passive:true});hstate();

  // ---------- full-screen menu ----------
  var burger=document.querySelector('.burger'), ovl=document.querySelector('.ovl');
  function setMenu(open){
    root.classList.toggle('menu-open',open);
    burger.setAttribute('aria-expanded',open);burger.setAttribute('aria-label',open?'メニューを閉じる':'メニュー');
    ovl.setAttribute('aria-hidden',!open);
  }
  if(burger&&ovl){
    burger.addEventListener('click',function(){setMenu(!root.classList.contains('menu-open'))});
    ovl.addEventListener('click',function(e){if(e.target.closest('a'))setMenu(false)});
    addEventListener('keydown',function(e){if(e.key==='Escape'&&root.classList.contains('menu-open')){setMenu(false);burger.focus()}});
  }

  // ---------- scroll reveal ----------
  var rvs=document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'});
    rvs.forEach(function(el){io.observe(el)});
  }else rvs.forEach(function(el){el.classList.add('in')});

  // ---------- count-up numbers ----------
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nums=document.querySelectorAll('[data-count]');
  if('IntersectionObserver' in window&&!reduce){
    var co=new IntersectionObserver(function(es){es.forEach(function(e){
      if(!e.isIntersecting)return;co.unobserve(e.target);
      var el=e.target,to=+el.dataset.count,t0=null,d=1400;
      function step(t){if(!t0)t0=t;var p=Math.min(1,(t-t0)/d),v=Math.round(to*(1-Math.pow(1-p,3)));el.textContent=v;if(p<1)requestAnimationFrame(step)}
      el.textContent='0';requestAnimationFrame(step);
    })},{threshold:.6});
    nums.forEach(function(n){co.observe(n)});
  }

  // ---------- news filter ----------
  var tabs=document.querySelectorAll('.ntabs button');
  tabs.forEach(function(b){
    b.addEventListener('click',function(){
      tabs.forEach(function(x){x.classList.remove('on');x.setAttribute('aria-pressed','false')});
      b.classList.add('on');b.setAttribute('aria-pressed','true');
      var c=b.dataset.cat;
      document.querySelectorAll('.nlist li').forEach(function(li){li.classList.toggle('hide',c!=='all'&&li.dataset.cat!==c)});
    });
  });

  // ---------- mockup: lower pages not built yet ----------
  document.querySelectorAll('a[href]').forEach(function(a){
    var h=a.getAttribute('href');
    if(a.dataset.soon===undefined&&(/^https?:|^tel:|^#/.test(h)||/(^|\/)index\.html$/.test(h)))return;
    a.addEventListener('click',function(e){e.preventDefault();alert(a.dataset.soon||'モックアップのため、下層ページは未作成です。')});
  });
})();
