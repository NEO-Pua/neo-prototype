/* NEO SYSTEMS — Direction E「ミニマル・エディトリアル」
   hero reveal, scroll progress, rule draw-in, reveals, scrollspy, clock,
   changelog filter, full-screen menu, mockup link guard */
(function(){
  var root=document.documentElement;
  root.classList.remove('no-js');root.classList.add('js');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- hero headline: reveal once the fonts are in (max 1.2s wait) ----------
  var started=false;
  function start(){if(started)return;started=true;setTimeout(function(){root.classList.add('is-loaded')},40)}
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(start);
  setTimeout(start,1200);

  // ---------- scroll progress (1px cyan line under the header) ----------
  var prog=document.querySelector('.hd__prog'),ticking=false;
  function progress(){
    ticking=false;
    var max=root.scrollHeight-window.innerHeight;
    if(prog)prog.style.transform='scaleX('+(max>0?Math.min(1,window.scrollY/max):0).toFixed(4)+')';
  }
  window.addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(progress)}},{passive:true});
  window.addEventListener('resize',progress);progress();

  // ---------- reveals + chapter rules drawing in ----------
  var rv=document.querySelectorAll('.rv,.rule');
  if('IntersectionObserver' in window&&!reduce){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target)}});
    },{rootMargin:'0px 0px -8% 0px'});
    rv.forEach(function(el){io.observe(el)});
  }else{rv.forEach(function(el){el.classList.add('is-in')})}

  // ---------- scrollspy for the global nav ----------
  var navLinks=[].slice.call(document.querySelectorAll('.gnav a[href^="#"]'));
  if('IntersectionObserver' in window&&navLinks.length){
    var spy=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting)return;
        navLinks.forEach(function(a){
          var on=a.getAttribute('href')==='#'+e.target.id;
          a.classList.toggle('is-cur',on);
          if(on)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
        });
      });
    },{rootMargin:'-45% 0px -54% 0px'});
    document.querySelectorAll('main > section[id]').forEach(function(s){spy.observe(s)});
  }

  // ---------- Tokyo clock in the hero meta row ----------
  var clocks=document.querySelectorAll('[data-clock]');
  if(clocks.length&&window.Intl){
    try{
      var fmt=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false});
      var tick=function(){var t=fmt.format(new Date());clocks.forEach(function(c){c.textContent=t})};
      tick();setInterval(tick,15000);
    }catch(err){}
  }

  // ---------- changelog filter ----------
  var fbtns=[].slice.call(document.querySelectorAll('.nf button'));
  fbtns.forEach(function(b){
    b.addEventListener('click',function(){
      var f=b.dataset.f;
      fbtns.forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});
      document.querySelectorAll('.log li[data-cat]').forEach(function(li){li.hidden=!(f==='all'||li.dataset.cat===f)});
      document.querySelectorAll('.log__grp').forEach(function(g){g.hidden=!g.querySelector('li[data-cat]:not([hidden])')});
    });
  });

  // ---------- full-screen menu (< 1020px) ----------
  var burger=document.querySelector('.burger'),menu=document.getElementById('menu');
  function isOpen(){return root.classList.contains('menu-open')}
  function setMenu(open,restoreFocus){
    root.classList.toggle('menu-open',open);
    burger.setAttribute('aria-expanded',String(open));
    burger.setAttribute('aria-label',open?'CLOSE メニューを閉じる':'MENU メニューを開く');
    if(open){var first=menu.querySelector('a');if(first)setTimeout(function(){first.focus({preventScroll:true})},60)}
    else if(restoreFocus)burger.focus();
  }
  if(burger&&menu){
    burger.addEventListener('click',function(){setMenu(!isOpen(),false)});
    menu.addEventListener('click',function(e){
      var a=e.target.closest('a');
      if(a&&a.getAttribute('href').charAt(0)==='#')setMenu(false,false);
    });
    document.addEventListener('keydown',function(e){
      if(!isOpen())return;
      if(e.key==='Escape'){setMenu(false,true);return}
      if(e.key==='Tab'){ // keep focus inside [burger + menu]
        var f=[burger].concat([].slice.call(menu.querySelectorAll('a,button')));
        var i=f.indexOf(document.activeElement);
        if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}
        else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}
      }
    });
    var mq=window.matchMedia('(min-width: 1020px)');
    var onMq=function(m){if(m.matches&&isOpen())setMenu(false,false)};
    if(mq.addEventListener)mq.addEventListener('change',onMq);else if(mq.addListener)mq.addListener(onMq);
  }

  // ---------- mockup: lower pages are not built yet ----------
  document.querySelectorAll('a[href]').forEach(function(a){
    var h=a.getAttribute('href');
    if(a.dataset.soon===undefined&&(/^https?:|^tel:|^mailto:|^#/.test(h)||/(^|\/)index\.html$/.test(h)))return;
    a.addEventListener('click',function(e){e.preventDefault();alert(a.dataset.soon||'モックアップのため、下層ページは未作成です。')});
  });
})();
