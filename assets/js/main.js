// ---- Campaign param propagation
const CAMPAIGN_KEYS = ["src","utm_source","utm_medium","utm_campaign","utm_content"];
function withParams(href){
  try{
    const url=new URL(href,location.origin), from=new URL(location.href);
    let changed=false;
    CAMPAIGN_KEYS.forEach(k=>{ const v=from.searchParams.get(k); if(v && !url.searchParams.has(k)){ url.searchParams.set(k,v); changed=true; } });
    return changed?url.toString():href;
  }catch(_){ return href; }
}
function propagateParams(){
  document.querySelectorAll('a[href]').forEach(a=>{
    const h=a.getAttribute('href'); if(!h||h.startsWith('#')||h.startsWith('mailto:')||h.startsWith('tel:'))return;
    a.setAttribute('href',withParams(h));
  });
}

// ---- Reveal
function ioReveal(){
  const els=[...document.querySelectorAll('.reveal')];
  if(!('IntersectionObserver' in window)){ els.forEach(e=>e.classList.add('on')); return; }
  const io=new IntersectionObserver((ents)=>{ ents.forEach(en=>{ if(en.isIntersecting) en.target.classList.add('on'); }) },{ rootMargin:'-10% 0px -5% 0px', threshold:.1 });
  els.forEach(e=>io.observe(e));
}

// ---- Progress & ToTop
function onScroll(){
  const h=document.documentElement;
  const p=(h.scrollTop)/(h.scrollHeight - h.clientHeight) * 100;
  document.documentElement.style.setProperty('--w', (p>0?p:0)+'%');
  const tt=document.getElementById('toTop'); if(tt) tt.classList.toggle('on', h.scrollTop>600);
}

// ---- ScrollSpy
function scrollSpy(){
  const map={};
  document.querySelectorAll('.navlinks a[href^="#"]').forEach(a=>{ const id=a.getAttribute('href').slice(1); map[id]=a; });
  const targets=Object.keys(map).map(id=>document.getElementById(id)).filter(Boolean);
  if(!('IntersectionObserver' in window) || !targets.length) return;
  const io=new IntersectionObserver((ents)=>{
    ents.forEach(en=>{
      if(en.isIntersecting){
        Object.values(map).forEach(a=>a.removeAttribute('aria-current'));
        const id=en.target.id; map[id]?.setAttribute('aria-current','true');
      }
    });
  },{ rootMargin:'-30% 0px -60% 0px', threshold:.1 });
  targets.forEach(t=>io.observe(t));
}

// ---- Dialog
function initFlowDialog(){
  const dlg=document.getElementById('flow');
  if(!dlg) return;
  document.querySelectorAll('[data-open="flow"]').forEach(btn=>btn.addEventListener('click', ()=>dlg.showModal()));
  dlg.querySelector('[data-close]')?.addEventListener('click', ()=>dlg.close());
  dlg.addEventListener('cancel', (e)=>{ e.preventDefault(); dlg.close(); });
}

// ---- ROI mini calc
function initCalc(){
  const $=id=>document.getElementById(id);
  if(!$('c_scans')) return;
  const calc=()=>{
    const scans=+$('c_scans').value||0;
    const uplift=(+$('c_uplift').value||0)/100;
    const ticket=(+$('c_ticket').value||0);
    const spend=(+$('c_spend').value||0);
    const add = Math.round(scans * uplift);
    const rev = add * ticket;
    const roi = spend>0 ? Math.round((rev-spend)/spend*100) : 0;
    $('c_out').textContent = `${add}人の来店増（推定）／追加売上 約¥${rev.toLocaleString()} ／ ROI ${roi}%`;
  };
  document.querySelectorAll('.calc input').forEach(i=>i.addEventListener('input', calc));
  calc();
}

document.addEventListener('DOMContentLoaded',()=>{
  propagateParams(); ioReveal(); scrollSpy(); onScroll(); initFlowDialog(); initCalc();
  document.addEventListener('scroll', onScroll, {passive:true});
  document.getElementById('toTop')?.addEventListener('click', ()=>{
    const opt = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? {behavior:'auto'} : {behavior:'smooth'};
    window.scrollTo({top:0, ...opt});
  });
});
