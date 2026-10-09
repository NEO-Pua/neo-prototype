/* NEO SYSTEMS — Direction C: header shadow, drawer, reveals, floating CTA */
(function(){
  var root=document.documentElement;
  root.classList.remove('no-js');

  // ---------- header shadow + floating CTA ----------
  var hdr=document.querySelector('.hdr'), fab=document.querySelector('.fab');
  function onScroll(){
    hdr.classList.toggle('is-sc',scrollY>8);
    if(fab)fab.classList.toggle('show',scrollY>600);
  }
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  if(fab)fab.querySelector('button').addEventListener('click',function(){scrollTo({top:0,behavior:'smooth'})});

  // ---------- phone drawer ----------
  var burger=document.querySelector('.burger'), drw=document.querySelector('.drw');
  function setMenu(open){
    root.classList.toggle('menu-open',open);
    burger.setAttribute('aria-expanded',open);burger.setAttribute('aria-label',open?'メニューを閉じる':'メニュー');
    drw.setAttribute('aria-hidden',!open);
  }
  if(burger&&drw){
    burger.addEventListener('click',function(){setMenu(!root.classList.contains('menu-open'))});
    drw.addEventListener('click',function(e){if(e.target.closest('a'))setMenu(false)});
    addEventListener('keydown',function(e){if(e.key==='Escape'&&root.classList.contains('menu-open')){setMenu(false);burger.focus()}});
  }

  // ---------- scroll reveal ----------
  var rvs=document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'});
    rvs.forEach(function(el){io.observe(el)});
  }else rvs.forEach(function(el){el.classList.add('in')});

  // ---------- FAQ: one open at a time ----------
  var qs=document.querySelectorAll('.faq details');
  qs.forEach(function(d){d.addEventListener('toggle',function(){if(d.open)qs.forEach(function(o){if(o!==d)o.open=false})})});

  // ---------- mockup: lower pages not built yet ----------
  document.querySelectorAll('a[href]').forEach(function(a){
    var h=a.getAttribute('href');
    if(a.dataset.soon===undefined&&(/^https?:|^tel:|^#/.test(h)||/(^|\/)index\.html$/.test(h)))return;
    a.addEventListener('click',function(e){e.preventDefault();alert(a.dataset.soon||'モックアップのため、下層ページは未作成です。')});
  });
})();
