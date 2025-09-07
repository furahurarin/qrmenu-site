// demo.js — 多言語メニュー用 最終版

// ====== 設定 ======
const CSV_URL = "./menu/menu_demo.csv";
const LOCALES = { ja:"ja-JP", en:"en-US", zh:"zh-CN", ko:"ko-KR" };
const I18N = {
  ja:{ title:"メニュー（デモ）", back:"LPに戻る", searchPH:"キーワード検索（料理名・説明・アレルゲン）", searchAria:"検索",
       loading:"読み込み中…", error:"読み込みエラー：", itemsShown:"品を表示", langLabel:"言語", langName:"日本語",
       allergens:"アレルゲン", others:"その他", nohit:"該当するメニューがありません" },
  en:{ title:"Menu (Demo)", back:"Back to LP", searchPH:"Search (dish, description, allergens)", searchAria:"Search",
       loading:"Loading…", error:"Load error: ", itemsShown:"items shown", langLabel:"Lang", langName:"English",
       allergens:"Allergens", others:"Others", nohit:"No matching items" },
  zh:{ title:"菜单（演示）", back:"返回首页", searchPH:"搜索（菜名/说明/过敏原）", searchAria:"搜索",
       loading:"加载中…", error:"读取错误：", itemsShown:"项", langLabel:"语言", langName:"中文",
       allergens:"过敏原", others:"其他", nohit:"未找到符合条件的菜品" },
  ko:{ title:"메뉴(데모)", back:"LP로 돌아가기", searchPH:"검색(요리/설명/알레르겐)", searchAria:"검색",
       loading:"불러오는 중…", error:"불러오기 오류: ", itemsShown:"개 표시", langLabel:"언어", langName:"한국어",
       allergens:"알레르겐", others:"기타", nohit:"일치하는 메뉴가 없습니다" },
};

// UTM 等のパラメータを LP に戻すリンクへも伝播
(function propagate(){
  const KEYS=["src","utm_source","utm_medium","utm_campaign","utm_content"];
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('a[href]').forEach(a=>{
      const h=a.getAttribute('href'); if(!h||h.startsWith('#')||h.startsWith('mailto:')||h.startsWith('tel:')) return;
      try{
        const url=new URL(h,location.origin), from=new URL(location.href);
        let changed=false; KEYS.forEach(k=>{ const v=from.searchParams.get(k); if(v && !url.searchParams.has(k)){ url.searchParams.set(k,v); changed=true; }});
        if(changed) a.setAttribute('href', url.toString());
      }catch(_){}
    });
  });
})();

// ====== CSV ユーティリティ ======
function parseCSV(t){
  const rows=[]; let i=0,f="",row=[],q=false;
  while(i<t.length){ const c=t[i];
    if(c=='"'){ if(q && t[i+1]=='"'){ f+='"'; i+=2; continue; } q=!q; i++; continue; }
    if(!q && (c==','||c=='\n'||c=='\r')){ row.push(f); f=""; if(c==','){i++; continue;} if(c=='\r'&&t[i+1]=='\n') i++; rows.push(row); row=[]; i++; continue; }
    f+=c; i++; }
  if(f.length||row.length){ row.push(f); rows.push(row); }
  return rows;
}
let rows=[], headers=[];
const idx = (n)=> headers.indexOf(n);
function colIndex(base, lang){ const candidates = [`${base}_${lang}`, base]; for(const k of candidates){ const i=idx(k); if(i!==-1) return i; } return -1; }
function getCell(r, base, lang, fallbackLang="ja"){
  let i = colIndex(base, lang);
  if(i===-1 && fallbackLang){ i = colIndex(base, fallbackLang); }
  return i!==-1 ? (r[i]||"") : "";
}

// ====== 描画 ======
let currentLang = localStorage.getItem("demo_lang") || (new URL(location.href).searchParams.get("lang") || "ja");
const tabs = document.querySelectorAll(".tab");
const qInput = document.getElementById("q");
const statusEl = document.getElementById("status");
const titleEl = document.getElementById("title");
const backEl = document.getElementById("back");

function setLangUI(lang){
  currentLang = lang;
  localStorage.setItem("demo_lang", lang);
  document.documentElement.lang = lang;
  tabs.forEach(b => {
    const active = b.dataset.lang === lang;
    b.classList.toggle("active", active);
    b.setAttribute("aria-selected", active ? "true":"false");
  });
  const t = I18N[lang] || I18N.ja;
  titleEl.textContent = t.title;
  backEl.textContent = t.back;
  qInput.placeholder = t.searchPH;
  qInput.setAttribute("aria-label", t.searchAria);
  if(statusEl.dataset.loading==="1"){ statusEl.textContent = t.loading; }
  document.title = t.title;
}

function fmtPrice(val){
  const n = Number(String(val).replace(/[,￥¥\s]/g,""));
  if(Number.isFinite(n)){
    try{ return new Intl.NumberFormat(LOCALES[currentLang]||"ja-JP", {style:"currency", currency:"JPY", maximumFractionDigits:0}).format(n); }
    catch(_){ return "¥"+n.toLocaleString("ja-JP"); }
  }
  return val || "";
}

function animateCards(){ document.querySelectorAll('.card').forEach((el,ix)=>{ setTimeout(()=>el.classList.add('show'), 18*ix); }); }

function render(lang="ja", query=""){
  const t = I18N[lang] || I18N.ja;
  const data = rows.slice(1).map(r => {
    const name = getCell(r,"name",lang) || getCell(r,"name","ja");
    const desc = getCell(r,"desc",lang) || getCell(r,"desc","ja");
    const category = getCell(r,"category",lang) || getCell(r,"category","ja") || getCell(r,"category","");
    const allergens = getCell(r,"allergens",lang) || getCell(r,"allergens","ja") || getCell(r,"allergens","");
    const flagsRaw = getCell(r,"flags",lang) || getCell(r,"flags","ja") || getCell(r,"flags","");
    const price = getCell(r,"price",lang) || getCell(r,"price","");
    const img = getCell(r,"img_url",lang) || getCell(r,"img_url","");
    const flags = String(flagsRaw).split(/\s*,\s*/).filter(Boolean);
    return {category,name,desc,price,allergens,flags,img};
  });

  const q = (query||"").toLowerCase();
  const filtered = q
    ? data.filter(d => [d.category,d.name,d.desc,d.allergens].join(" ").toLowerCase().includes(q))
    : data;

  const byCat = {};
  for(const d of filtered){ (byCat[d.category || t.others] ||= []).push(d); }

  const menu = document.getElementById("menu");
  menu.innerHTML = "";
  const frag = document.createDocumentFragment();

  const cats = Object.keys(byCat).sort((a,b)=> String(a).localeCompare(String(b)));
  if(cats.length===0){
    const p=document.createElement("p"); p.className="status"; p.textContent=t.nohit; menu.appendChild(p);
    statusEl.textContent = `0 ${t.itemsShown}（${t.langLabel}: ${t.langName}）`;
    statusEl.dataset.loading="0"; return;
  }

  cats.forEach(cat=>{
    const h = document.createElement("h2"); h.className="cat"; h.textContent = cat || t.others; frag.appendChild(h);
    const grid = document.createElement("div"); grid.className = "grid";
    byCat[cat].forEach(item=>{
      const card = document.createElement("div"); card.className="card";
      if(item.img){ const img=document.createElement("img"); img.src=item.img; img.alt=item.name; card.appendChild(img); }
      const nm = document.createElement("div"); nm.className="name"; nm.textContent = item.name;
      const desc = document.createElement("div"); desc.className="desc"; desc.textContent = item.desc;
      const meta = document.createElement("div"); meta.className="meta";
      const parts = [];
      if(item.allergens) parts.push(`${t.allergens}: ${item.allergens}`);
      if(item.price) parts.push(fmtPrice(item.price));
      meta.textContent = parts.join(" / ");
      const badges = document.createElement("div"); badges.className="badges";
      (item.flags||[]).forEach(fl => { const b=document.createElement("span"); b.className="badge"; b.textContent=fl; badges.appendChild(b); });
      card.appendChild(nm); card.appendChild(desc); card.appendChild(meta); card.appendChild(badges);
      grid.appendChild(card);
    });
    frag.appendChild(grid);
  });

  document.getElementById("skel").style.display="none";
  menu.appendChild(frag);
  animateCards();
  const count = Object.values(byCat).reduce((a,b)=>a+b.length,0);
  statusEl.textContent = `${count} ${t.itemsShown}（${t.langLabel}: ${t.langName}）`;
  statusEl.dataset.loading = "0";
}

// ====== 起動 ======
setLangUI(currentLang);
statusEl.dataset.loading = "1";
statusEl.textContent = I18N[currentLang].loading;

fetch(CSV_URL,{cache:"no-store"})
  .then(r=>{ if(!r.ok) throw new Error("CSV not found"); return r.text(); })
  .then(t=>{ const m=parseCSV(t); headers=m[0]; rows=m; render(currentLang, ""); })
  .catch(e=>{ statusEl.textContent=(I18N[currentLang]||I18N.ja).error + e.message; document.getElementById("skel").style.display="none"; statusEl.dataset.loading="0"; });

document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const lang = btn.dataset.lang;
    setLangUI(lang);
    render(lang, qInput.value);
  });
});
qInput.addEventListener("input",(e)=>{ render(currentLang, e.target.value); });
