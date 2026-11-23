  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = n => String(Math.round(n*10)/10);

  /* ---------- workshop settings ---------- */
  const SENDER_KEYS = ["senderName","senderPhone","senderCity","senderAddr","econtMode"];   // изпращач за Еконт (текст) + откъде е цената
  const DEFAULTS = { senderName:"", senderPhone:"", senderCity:"", senderAddr:"", econtMode:"demo", bd90:3, bd180:2, weldPerCm:0.5, topEdge:30, topReturn:12, shelfEdge:20, shelfReturn:12, topCut:8, shelfCut:16, stretch:2, splashHem:20, legInset:30, shelfGap:15, shelfGapW:25, feet:0, tubeWall:1.5, frameGap:2,
                     tubeStock:6000, kerf:3, offMin:100, sheetW:2000, sheetH:1000, sheetPrice:90, sheet2W:2500, sheet2H:1250, sheet2Price:140, tubePrice:40 };
  const SETTINGS = [
    ["topEdge","Работен плот — челна дъска","мм, огъната надолу"],
    ["topReturn","Работен плот — обратно огъване","мм, навътре под плота"],
    ["shelfEdge","Долни плотове — челна дъска","мм, огъната надолу"],
    ["shelfReturn","Долни плотове — обратно огъване","мм, навътре"],
    ["legInset","Отстъп на краката","мм от страничния и предния ръб на плота"],
    ["shelfGap","Долен плот — намаление дълбочина","мм (за влизане между краката / заварка)"],
    ["shelfGapW","Долен плот — намаление ширина","мм, общо (за влизане между краката / заварка)"],
    ["frameGap","Рамка — краката от ръба на тавата","мм (рамката влиза в тавата; при „рамка от профил“)"],
    ["feet","Регулируеми крачета","мм височина; 0 = без"],
    ["stretch","Удължение на перото при огъване","мм — перото излиза с толкова по-дълго (в заготовката: перо − това)"],
    ["splashHem","Борд — подгъвка горе","мм, назад към стената; 0 = без"],
    ["bd90","Конструктор — корекция на огъване 90°","мм на огъване (по подразбиране за детайлите)"],
    ["bd180","Конструктор — корекция на подгъвка 180°","мм на подгъвка"],
    ["weldPerCm","Конструктор — заварка","€ на см (сглобки)"],
    ["topCut","Работен плот — намаление на заготовката","мм от външния габарит (дължина и ширина)"],
    ["shelfCut","Долни плотове — намаление на заготовката","мм от външния габарит (дължина и ширина)"],
    ["tubeWall","Стена на тръбата","мм, за теглото"],
    ["tubeStock","Дължина на прът тръба","мм"],
    ["kerf","Загуба при рязане","мм на рез"],
    ["offMin","Най-тясна фира","мм — по-тясна ивица не се пази"],
    ["sheetW","Лист 1 — дължина","мм"],
    ["sheetH","Лист 1 — ширина","мм"],
    ["sheetPrice","Лист 1 — цена","€ за брой; 0 = сравнение по площ"],
    ["sheet2W","Лист 2 — дължина","мм; 0 = не се ползва"],
    ["sheet2H","Лист 2 — ширина","мм"],
    ["sheet2Price","Лист 2 — цена","€ за брой"],
    ["tubePrice","Тръба — цена","€ за прът (6 м)"],
  ];
  const KEY = "mpr-admin-settings-v1";
  let S = loadSettings();
  function loadSettings(){
    let s;
    try{ s = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch(e){ s = Object.assign({}, DEFAULTS); }
    // a 0 material price means it was never set on this device — use the real defaults
    ["sheetPrice","sheet2Price","tubePrice"].forEach(k => { if(!(+s[k] > 0)) s[k] = DEFAULTS[k]; });
    // v2: returns 10 → 12 мм, blanks smaller by 8 (top) / 16 (shelves) — replaces the old per-bend correction
    if(!(+s.v >= 2)){
      if(+s.topReturn === 10) s.topReturn = DEFAULTS.topReturn;
      if(+s.shelfReturn === 10) s.shelfReturn = DEFAULTS.shelfReturn;
      delete s.bendDed; s.v = 2;
      try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){}
    }
    // v3: shelves 5 мм smaller in length and depth (10 → 15, 20 → 25)
    if(!(+s.v >= 3)){
      if(+s.shelfGap === 10) s.shelfGap = DEFAULTS.shelfGap;
      if(+s.shelfGapW === 20) s.shelfGapW = DEFAULTS.shelfGapW;
      s.v = 3;
      try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){}
    }
    if(migrateSettings(s)) try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){}
    return s;
  }
  // v4: welds half the price (1 → 0.5 €/см for the designer's assemblies; the tables' weld is in PRICE)
  function migrateSettings(s){
    if(+s.v >= 4) return false;
    if(+s.weldPerCm === 1) s.weldPerCm = 0.5;
    s.v = 4; return true;
  }
  function saveSettings(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} cloudDirty(); }
  function buildSettings(){
    buildSender();
    $("settings").innerHTML = SETTINGS.map(([k,l,h]) =>
      '<label>'+esc(l)+'<input type="number" step="any" min="0" data-k="'+k+'" value="'+esc(S[k])+'"><span class="hint">'+esc(h)+'</span></label>').join("");
    $("settings").querySelectorAll("input").forEach(inp => inp.addEventListener("input", () => {
      const v = parseFloat(inp.value);
      if(!isNaN(v) && v >= 0){ S[inp.dataset.k] = v; saveSettings(); recompute(); }
    }));
  }
  $("resetSettings").addEventListener("click", () => {
    const keep = {}; SENDER_KEYS.forEach(k => keep[k] = S[k]);           // the sender is not a workshop setting
    S = Object.assign({}, DEFAULTS, keep); saveSettings(); buildSettings(); recompute(); });
  // sender for Econt: typed once, kept with the settings (and in the cloud)
  function buildSender(){
    [["snd-name","senderName"],["snd-phone","senderPhone"],["snd-city","senderCity"],["snd-addr","senderAddr"],["snd-mode","econtMode"]].forEach(([id, k]) => {
      const inp = $(id); if(!inp) return;
      if(document.activeElement !== inp) inp.value = S[k] || "";
      if(!inp.dataset.bound){ inp.dataset.bound = "1"; inp.addEventListener("input", () => { S[k] = inp.value; saveSettings(); }); }
    });
  }

  /* ---------- order data ---------- */
  const TABLE_DEFAULT = { qty:1, L:1200, D:600, H:850, thickness:1.5, legProfile:30, splashOn:true, splashH:100,
                          legBack:70, baseOn:true, baseH:150, midOn:false, notes:"",
                          // допълнителни (0 = стандартно, от „Настройки“); shelfEdge — от по-стари поръчки (основа и междинен)
                          advOn:false, topEdge:0, shelfEdge:0, baseEdge:0, midEdge:0, topRet:0, baseRet:0, midRet:0,
                          legSpan:0, legFL:0, legFR:0, legBL:0, legBR:0,
                          legs6:false, shelfSide:"left", bayL:0, rails:false, railH:0, sideL:0, sideR:0, frame:false, gn:false, gnLevels:0, gnPitch:0, gnSide:"left",   // gn: стелаж за GN 1/1 в празната част   // frame: рамка от профил + тави отгоре   // rails: профили в празната част, railH от пода   // 6 крака: долните плотове в лявата/дясната част, bayL = до средните крака (външно)
                          hemDir:"", hem:0 };   // подгъвка на борда: wall/front/none; "" = стара поръчка (към стената, извън дълбочината)
  function normTable(t){
    const n = Object.assign({}, TABLE_DEFAULT);
    for(const k in TABLE_DEFAULT){
      if(!t || t[k] === undefined || t[k] === null) continue;
      const d = TABLE_DEFAULT[k];
      n[k] = typeof d === "number" ? (+t[k] || 0) : typeof d === "boolean" ? !!t[k] : String(t[k]);
    }
    n.qty = Math.max(1, Math.round(n.qty || 1));
    return n;
  }
  // same formula as the customer form: halfway between the base and the underside of the top
  const mid2H = t => Math.round((t.baseH + Math.max(0, t.H - 40)) / 2);

  /* ===== ЦЕНА ЗА КЛИЕНТА — ДРЪЖ ИДЕНТИЧНО с site/app.js =====
     Цена = (лист + тръба + заварки + огъвания + тапички) × (1 + надценка%).
     Лист: всяка маса — цели НОВИ листове (pSheets), без приспадане на фирата; разкроят ползва фирата отделно. */
  const PRICE = {
    sheetM2: 45,        // € за м² — само за детайлите от Конструктора и за заготовка, по-голяма от всеки лист
    sheets: [[2000, 1000, 90], [2500, 1250, 140]],   // нови листове: дължина, ширина (мм), цена (€)
    fullSheetAt: 2/3,
    gnWeldShare: 0.3,   // заварките на винкелите за GN — 70% отстъпка: 30% от обикновената цена (4 шева на ниво)   // над тази част от листа се плаща целият лист; под нея — само използваната ламарина
    kerf: 3,            // мм между заготовките при рязане
    angleM: 25/6,       // € за метър винкел 20×20 (прът 6 м ≈ 25€) — за стелажа за GN
    tubeM: 40/6,        // € за метър тръба 30×30 (прът 6 м = 40€)
    weldPerFloor: 24,   // € за етаж (плот): 12 см × 4 крака × 0.5€/см
    bend: 1,            // € за огъване (90°)
    capEach: 3,         // € за тапичка на крак (4 на маса)
    markupPct: 120,     // надценка % върху целия труд и материалите (клиентска цена = себестойност × 2.2)
    topEdge:30, topReturn:12, shelfEdge:20, shelfReturn:12, topCut:8, shelfCut:16, stretch:2, splashHem:20, legInset:30, shelfGap:15, shelfGapW:25, thickness:1.5, frameGap:2
  };
  const pFloors = t => (isFrame(t) ? tableGeo(t,PRICE).frameJoints/4 : (has6(t)?1.5:1) + (t.baseOn?1:0) + (t.midOn?1:0)) + (()=>{ const g=tableGeo(t,PRICE); return g.railJoints/4 + (g.gnAngle ? g.gnLevels * PRICE.gnWeldShare : 0); })();   // профили: 2 на парче; GN: 2 винкела × 2 края на ниво, на половин цена   // 1 етаж = 4 заварки; рамка: 2 на царга
  const pBends  = t => isFrame(t) ? (3 + (t.splashOn?(tableGeo(t,PRICE).hem>0?2:1):1)) + 4*((t.baseOn?1:0)+(t.midOn?1:0))   // тави: по 1 огъване на страна
                               : (6 + (t.splashOn?(tableGeo(t,PRICE).hem>0?2:1):2)) + 8*((t.baseOn?1:0)+(t.midOn?1:0));
  // заготовките на една маса (мм): плот и долните плотове
  function pBlanks(t){
    const P=PRICE, g=tableGeo(t,P), cT=P.topCut/(g.frame?4:2), cS=P.shelfCut/(g.frame?4:2);
    const fl=(e,r,c)=>e+(r>0?r-P.stretch:0)-c, ft=fl(g.eT,g.rT,cT);
    const back = t.splashOn ? (+t.splashH||0)+g.hem-cT : ft;
    const out=[[t.L+2*ft, g.Dp+ft+back]];
    const shelf=(e,r)=>{ const f=fl(e,r,cS)+g.shPad; if(g.shL>0&&g.shD>0) out.push([g.shL+2*f, g.shD+2*f]); };
    if(t.baseOn) shelf(g.eB,g.rB);
    if(t.midOn) shelf(g.eM,g.rM);
    return out.filter(([w,h])=>w>0&&h>0);
  }
  const pBlankM2 = t => pBlanks(t).reduce((a,[w,h])=>a+w*h,0)/1e6;
  // one rectangle into a sheet (MaxRects, best short side, may turn); false if it does not fit
  function pPut(s,w,h){
    let b=null;
    s.free.forEach(r=>[[w,h],[h,w]].forEach(([pw,ph])=>{ if(pw>r.w||ph>r.h) return;
      const sc=Math.min(r.w-pw,r.h-ph); if(!b||sc<b.sc) b={x:r.x,y:r.y,w:pw,h:ph,sc}; }));
    if(!b) return false;
    const out=[];
    s.free.forEach(f=>{
      if(b.x>=f.x+f.w||b.x+b.w<=f.x||b.y>=f.y+f.h||b.y+b.h<=f.y){ out.push(f); return; }
      if(b.x>f.x) out.push({x:f.x,y:f.y,w:b.x-f.x,h:f.h});
      if(b.x+b.w<f.x+f.w) out.push({x:b.x+b.w,y:f.y,w:f.x+f.w-b.x-b.w,h:f.h});
      if(b.y>f.y) out.push({x:f.x,y:f.y,w:f.w,h:b.y-f.y});
      if(b.y+b.h<f.y+f.h) out.push({x:f.x,y:b.y+b.h,w:f.w,h:f.y+f.h-b.y-b.h});
    });
    s.free=out.filter((a,i)=>!out.some((c,j)=>j!==i&&a.x>=c.x&&a.y>=c.y&&a.x+a.w<=c.x+c.w&&a.y+a.h<=c.y+c.h&&(j<i||a.w!==c.w||a.h!==c.h||a.x!==c.x||a.y!==c.y)));
    return true;
  }
  // the sheet of one table, as if it were cut from new sheets: whole sheets, the cheapest choice
  function pSheets(t){
    const K=PRICE.kerf, th=(+t.thickness||1.5)/1.5;
    const types=PRICE.sheets.map(([W,H,p])=>({W:Math.max(W,H),H:Math.min(W,H),p})).filter(x=>x.W>0&&x.H>0);
    const fitsAny=([w,h])=>types.some(x=>(w<=x.W&&h<=x.H)||(h<=x.W&&w<=x.H));
    const pcs=pBlanks(t).filter(fitsAny).sort((a,b)=>b[0]*b[1]-a[0]*a[1]);
    const big=pBlanks(t).filter(b=>!fitsAny(b));   // по-голяма от всеки лист — по площ
    let best=null;
    const n=pcs.length, combos=Math.pow(types.length, n);
    for(let c=0;c<combos;c++){
      const seq=[]; let v=c; for(let i=0;i<n;i++){ seq.push(types[v%types.length]); v=Math.floor(v/types.length); }
      const sheets=[]; let ok=true;
      for(const [w,h] of pcs){
        const s0=sheets.find(s=>pPut(s,w+K,h+K));
        if(s0){ s0.used+=w*h; continue; }
        const ty=seq[sheets.length], s={ty,free:[{x:0,y:0,w:ty.W+K,h:ty.H+K}],used:w*h};
        if(!pPut(s,w+K,h+K)){ ok=false; break; }
        sheets.push(s);
      }
      if(!ok) continue;
      // повече от 2/3 от листа → цял лист; по-малко → само използваната ламарина (по цената на м² от този лист)
      const sheetCost=s=>{ const f=s.used/(s.ty.W*s.ty.H); return f>PRICE.fullSheetAt ? s.ty.p : f*s.ty.p; };
      const cost=sheets.reduce((a,s)=>a+sheetCost(s),0);
      if(!best||cost<best.cost) best={cost,list:sheets.map(s=>s.ty.W+"×"+s.ty.H+(s.used/(s.ty.W*s.ty.H)>PRICE.fullSheetAt?"":" ("+Math.round(s.used/(s.ty.W*s.ty.H)*100)+"%)"))};
    }
    const bigCost=big.reduce((a,[w,h])=>a+w*h/1e6*PRICE.sheetM2,0);
    return { cost:((best?best.cost:0)+bigCost)*th, sheets:best?best.list:[], count:best?best.list.length:0 };
  }
  const pTubeM = t => { const g=tableGeo(t,PRICE); return (g.legs.reduce((a,l)=>a+Math.max(0,l),0) + (g.legs6?2*Math.max(0,g.legAuto):0) + 2*g.gnPosts.length*Math.max(0,g.legAuto) + g.railLen + g.railXs.length*(g.rails?g.railD:0) + g.frameLen)/1000; };
  const pAngleM = t => { const g=tableGeo(t,PRICE); return g.gnAngle ? 2*g.gnLevels*g.gnAngle/1000 : 0; };   // винкели 20×20 за GN
  function priceParts(t){
    const mat=pSheets(t).cost, tube=pTubeM(t)*PRICE.tubeM + pAngleM(t)*PRICE.angleM,
          weld=pFloors(t)*PRICE.weldPerFloor, bend=pBends(t)*PRICE.bend;
    const caps=((has6(t)?6:4)+(tableGeo(t,PRICE).gnPosts.length?2:0))*PRICE.capEach;   // тапички на краката (и на стойките за GN)
    return { mat, tube, weld, bend, caps, base:mat+tube+weld+bend };
  }
  function priceFor(order){
    if(!order||!order.tables||!order.tables.length) return null;
    const m=1+PRICE.markupPct/100; let total=0; const lines=[];
    order.tables.forEach((t,i)=>{ const q=t.qty||1, pp=priceParts(t), per=(pp.base+pp.caps)*m;
      total+=per*q; lines.push({label:"Маса "+(i+1)+(q>1?" × "+q:""), amount:per*q}); });
    const pc=promoOf(order.promo);
    if(pc){ const d=total*pc.pct/100; lines.push({label:"Отстъпка "+pc.pct+"% (промокод "+pc.code+")", amount:-d}); total-=d;
      return { total, currency:"€", lines, promo:pc.code, discountPct:pc.pct, discount:d }; }
    return { total, currency:"€", lines };
  }
  // промокодове (без значение главни/малки букви) → отстъпка % върху цялата поръчка
  const PROMOS = { INOX15:15 };
  function promoOf(code){ const c=String(code||"").trim().toUpperCase(); return PROMOS[c] ? { code:c, pct:PROMOS[c] } : null; }
  const eur2 = v => (v==null?"—":(Math.round(v*100)/100).toFixed(2)+" €");
  let PRICING = null; // latest computed pricing for the loaded order (set in recompute)

  /* ---------- orders: Разкрой (new) → В обработка (processing) → Архив (archived) ----------
     Every order is one record in localStorage; its PDF lives in IndexedDB under the same id.
     The old archive (mpr-admin-orders-v1) is copied in once as archived orders and left as it was, as a backup. */
  const ORD_KEY = "mpr-admin-orders-v2", OLD_ARCH_KEY = "mpr-admin-orders-v1";
  const STAGES = { new:"Разкрой", processing:"В обработка", archived:"Архив" };
  let ORD = loadOrders();
  function loadOrders(){
    try{
      const d = JSON.parse(localStorage.getItem(ORD_KEY) || "null");
      if(d && Array.isArray(d.orders)) return { orders:d.orders, next:Math.max(1, +d.next || 1) };
    }catch(e){}
    const o = { orders:[], next:1 };
    try{
      const old = JSON.parse(localStorage.getItem(OLD_ARCH_KEY) || "null");
      if(old && Array.isArray(old.orders)){
        o.orders = old.orders.filter(r => r && r.id).map(r => Object.assign({}, r, { stage:"archived", archivedAt:r.archivedAt || r.savedAt || "" }));
        o.next = Math.max(1, +old.next || 1, 1 + Math.max(0, ...o.orders.map(r => +r.serial || 0)));
        localStorage.setItem(ORD_KEY, JSON.stringify(o));
      }
    }catch(e){}
    return o;
  }
  let saveTimer = null;
  function saveOrders(){
    clearTimeout(saveTimer); saveTimer = null;
    try{ localStorage.setItem(ORD_KEY, JSON.stringify(ORD)); cloudDirty(); return true; }
    catch(e){ setStatus("⚠ Браузърът не позволява запазване — свалете резервно копие от „Архив“.", "bad"); return false; }
  }
  const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveOrders, 400); };
  window.addEventListener("pagehide", () => { if(saveTimer) saveOrders(); });

  const byStage = st => ORD.orders.filter(o => o.stage === st);
  const findOrder = id => ORD.orders.find(o => o.id === id) || null;
  const newId = () => "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const orderSerial = n => "№ " + String(n).padStart(4, "0");
  const serTxt = o => o && o.serial ? orderSerial(o.serial) : "без №";
  const nTablesOf = o => (o.tables || []).reduce((a, t) => a + (+t.qty || 1), 0);
  // what an order holds, for the lists: "2", "2 + 3 дет.", "3 дет."
  const itemsTxt = o => { const t = nTablesOf(o), d = (o.parts || []).reduce((a, p) => a + (+p.qty || 1), 0), e = (o.assemblies || []).reduce((a, x) => a + (+x.qty || 1), 0);
    const bits = [t ? String(t) : "", d ? d + " дет." : "", e ? e + " ел." : ""].filter(Boolean); return bits.length ? bits.join(" + ") : "0"; };
  const fmtDate = s => { const d = s ? new Date(s) : null; return d && !isNaN(d) ? d.toLocaleDateString("bg-BG") : ""; };
  const fmtDT = s => { const d = s ? new Date(s) : null; return d && !isNaN(d) ? d.toLocaleString("bg-BG", { dateStyle:"short", timeStyle:"short" }) : ""; };
  const idsTxt = list => list.length ? list.join(", ") : "—";
  const clientPriceOf = o => orderClientPrice(o);

  // the same order loaded twice is recognised by its client number, or by its content
  function fingerprint(o){
    const s = JSON.stringify([o.name || "", o.phone || "", o.created || "", (o.tables || []).map(t =>
      [+t.qty || 1, +t.L || 0, +t.D || 0, +t.H || 0, !!t.splashOn, +t.splashH || 0, +t.legBack || 0, !!t.baseOn, +t.baseH || 0, !!t.midOn]
        .concat(["topEdge","shelfEdge","baseEdge","midEdge","topRet","baseRet","midRet","legSpan","legFL","legFR","legBL","legBR","hem"].map(k => +t[k] || 0), [t.hemDir || ""],
          +t.sideL || +t.sideR ? [+t.sideL || 0, +t.sideR || 0] : [], isFrame(t) ? ["frame"] : [],
          t.legs6 ? [true, t.shelfSide || "left", +t.bayL || 0, !!t.rails, +t.railH || 0, +t.gnLevels || 0, +t.gnPitch || 0] : [], t.gn ? ["gn", t.gnSide || "left", +t.gnLevels || 0, +t.gnPitch || 0] : []))]);
    let h = 5381; for(let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36) + s.length.toString(36);
  }
  const findDuplicate = rec => ORD.orders.find(o => o !== rec && ((rec.orderNo && o.orderNo === rec.orderNo) || fingerprint(o) === fingerprint(rec)));

  // the customer form stores "MPR1:<base64 JSON>" in the PDF
  function decodeOrderFromPdf(buf){
    const raw = new TextDecoder("latin1").decode(new Uint8Array(buf));
    if(!raw.startsWith("%PDF")) throw new Error("not_pdf");
    const m = raw.match(/MPR1:([A-Za-z0-9+\/=]+)/);
    if(!m) return null;
    const bin = atob(m[1]);
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    if(!data || !Array.isArray(data.tables) || !data.tables.length) throw new Error("bad_data");
    return data;
  }

  const SEL = { work:null, processing:null };   // the open order on each page
  let PAGE = "work", TAB = "print";
  let order = null;                             // the open order record (on the current page)

  function setStatus(msg, kind){ $("status").className = "status " + (kind || ""); $("status").textContent = msg; }
  function procMsg(msg, kind){ $("procStatus").className = "status " + (kind || ""); $("procStatus").textContent = msg; }

  // доставка от клиентската форма: { type:"address"|"office"|"pickup", city, address }
  const DLV = { address:"до адрес", office:"до офис на Еконт", pickup:"взимане от нас" };
  function normDelivery(x){
    const t = x && DLV[x.type] ? x.type : "address";
    return { type:t, city:String((x && x.city) || "").trim(), address:String((x && x.address) || "").trim() };
  }
  function deliveryText(x){
    if(!x) return "";
    if(x.type === "pickup") return "взимане от нас";
    const where = [x.city, x.address].filter(Boolean).join(", ");
    return where ? DLV[x.type] + " — " + where : "";
  }
  function makeRecord(data, source){
    const d = data || {};
    const delivery = d.delivery ? normDelivery(d.delivery) : null;
    return { id:newId(), stage:"new", serial:null, addedAt:new Date().toISOString(),
      name:d.name || "", phone:d.phone || "", created:d.created || "", source:source || "", orderNo:d.orderNo || "",
      promo:(promoOf(d.promo) || {}).code || "", priceFromPdf:d.price || null, tables:(d.tables && d.tables.length ? d.tables : [{ hemDir:"wall" }]).map(normTable),
      hasDoc:false, docName:"", cut:null, clientPrice:null, cost:null, costMaterials:null, price:null, place:"", deliveryDate:"", delivery };
  }
  async function readOrderFile(file){
    if(/\.json$/i.test(file.name)){
      const data = JSON.parse(await file.text());
      if(!data || !Array.isArray(data.tables) || !data.tables.length) throw new Error("bad_json");
      return { data, doc:null };
    }
    const buf = await file.arrayBuffer();
    return { data:decodeOrderFromPdf(buf), doc:new Blob([buf], { type:"application/pdf" }) };
  }
  // one or more files → new orders in Разкрой; the first new one is opened
  async function loadFiles(fileList){
    const files = Array.from(fileList || []).filter(Boolean);
    if(!files.length) return;
    const msgs = [], rank = { ok:0, warn:1, bad:2 };
    let kind = "ok", first = null;
    const flag = k => { if(rank[k] > rank[kind]) kind = k; };
    for(const file of files){
      try{
        const { data, doc } = await readOrderFile(file);
        const rec = makeRecord(data, file.name);
        const dup = data ? findDuplicate(rec) : null;
        if(dup && dup.stage !== "archived"){
          msgs.push("„" + file.name + "“ вече е заредена (" + STAGES[dup.stage] + (dup.serial ? ", " + orderSerial(dup.serial) : "") + ").");
          flag("warn");
          if(dup.stage === "new" && !first) first = dup;
          continue;
        }
        if(doc){ try{ await docPut(rec.id, doc, file.name); rec.hasDoc = true; rec.docName = file.name; }catch(e){} }
        if(!data) rec.noData = true;
        ORD.orders.push(rec);
        if(!first) first = rec;
        if(!data){ msgs.push("⚠ В „" + file.name + "“ няма данни за поръчката — въведете размерите в „Маси — редакция“."); flag("warn"); }
        else msgs.push("✓ „" + file.name + "“: " + rec.tables.length + (rec.tables.length === 1 ? " маса" : " маси") +
          (dup ? " — внимание: същата поръчка вече е в архива (" + serTxt(dup) + ")" : "") + ".");
        if(dup) flag("warn");
      }catch(e){
        msgs.push(e && e.message === "not_pdf" ? "✕ „" + file.name + "“ не е PDF файл." :
                  /\.json$/i.test(file.name) ? "✕ „" + file.name + "“ не е файл с поръчка." : "✕ „" + file.name + "“ не може да бъде прочетен.");
        flag("bad");
      }
    }
    saveOrders();
    if(first){ SEL.work = first.id; TAB = first.noData ? "edit" : "print"; }
    showPage("work");
    setStatus(msgs.join(" "), kind);
    if(first) $("viewer").scrollIntoView({ behavior:"smooth", block:"start" });
  }

  const drop = $("drop");
  drop.addEventListener("click", () => $("file").click());
  drop.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); $("file").click(); } });
  $("file").addEventListener("change", () => { const f = Array.from($("file").files); $("file").value = ""; loadFiles(f); });
  ["dragenter","dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave","drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => loadFiles(e.dataTransfer.files));
  $("manual").addEventListener("click", () => {
    const rec = makeRecord(null, ""); ORD.orders.push(rec); saveOrders();
    SEL.work = rec.id; TAB = "edit"; showPage("work");
    setStatus("Ръчна поръчка — въведете данните в „Маси — редакция“.", "");
    $("viewer").scrollIntoView({ behavior:"smooth", block:"start" });
  });

  /* ---------- viewer: one open order, two views (print / edit) and the bottom bar ---------- */
  function openViewer(){
    const host = PAGE === "work" ? $("workHost") : PAGE === "processing" ? $("procHost") : null;
    const want = PAGE === "work" ? "new" : "processing";
    const rec = host && SEL[PAGE] ? findOrder(SEL[PAGE]) : null;
    order = rec && rec.stage === want ? rec : null;
    if(host && !order) SEL[PAGE] = null;
    const v = $("viewer");
    if(!order){ v.hidden = true; CURRENT = null; PRICING = null; return; }
    order.tables = order.tables.map(normTable);
    order.parts = (order.parts || []).map(normPart);
    order.assemblies = (order.assemblies || []).map(x => normAsm(x));
    host.appendChild(v); v.hidden = false;
    setTab(TAB);
    renderHead(); renderEdit(); recompute();
  }
  function setTab(tab){
    TAB = tab === "edit" ? "edit" : "print";
    $("viewer").dataset.tab = TAB;
    document.querySelectorAll("#viewer .tab").forEach(b => b.classList.toggle("active", b.dataset.tab === TAB));
  }
  document.querySelectorAll("#viewer .tab").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));
  $("vClose").addEventListener("click", () => { SEL[PAGE] = null; openViewer(); renderLists(); });
  $("vDoc").addEventListener("click", () => { if(order) openDoc(order.id, m => (PAGE === "work" ? setStatus : procMsg)(m, "warn")); });

  function renderHead(){
    const o = order;
    $("vTitle").innerHTML = '<div class="vt"><b>' + esc(o.serial ? "Поръчка " + orderSerial(o.serial) : "Нова поръчка") + '</b> · ' + esc(o.name || "без име") +
      (o.phone ? ' · ' + esc(o.phone) : '') + ' <span class="stage st-' + o.stage + '">' + esc(STAGES[o.stage]) + '</span></div>' +
      '<div class="muted">' + esc(o.source ? "Файл: " + o.source : "Ръчно въведена") + (o.addedAt ? " · заредена " + esc(fmtDT(o.addedAt)) : "") +
      (o.confirmedAt ? " · потвърдена " + esc(fmtDT(o.confirmedAt)) : "") + '</div>' +
      (deliveryText(o.delivery) ? '<div class="muted"><b>Доставка:</b> ' + esc(deliveryText(o.delivery)) + '</div>' : '') +
      (promoOf(o.promo) ? '<div class="muted"><b>Промокод:</b> ' + esc(promoOf(o.promo).code) + ' — отстъпка ' + promoOf(o.promo).pct + '%</div>' : '');
    $("vDoc").hidden = !o.hasDoc;
  }
  // after any change to the open order: keep it, refresh the lists and the title
  function edited(){ saveSoon(); renderLists(); renderHead(); }

  /* ---------- edit view: the tables like on the customer's document (3D drawing + fields) ---------- */
  const FIELDS = [
    ["qty","Брой еднакви маси","бр."], ["L","Дължина","мм"], ["D","Дълбочина","мм"], ["H","Височина","мм"],
    ["legBack","Задни крака от ръба","мм"], ["splashH","Височина на борда","мм"], ["baseH","Долна основа от пода","мм"],
  ];
  // допълнителни настройки: празно = стандартно (стандартът се вижда в полето)
  const ADV_FIELDS = [
    ["topEdge","Челно лице — работен плот"], ["baseEdge","Челно лице — долна основа"], ["midEdge","Челно лице — междинен плот"],
    ["topRet","Сгъвка навътре — работен плот"], ["baseRet","Сгъвка навътре — долна основа"], ["midRet","Сгъвка навътре — междинен плот"],
    ["legSpan","Предни–задни крака (външно)"], ["sideL","Крака от левия ръб (външно)"], ["sideR","Крака от десния ръб (външно)"],
    ["legFL","Крак преден ляв"], ["legFR","Крак преден десен"], ["legBL","Крак заден ляв"], ["legBR","Крак заден десен"],
  ];
  // the standard value of an advanced field (shown as the placeholder)
  function advAuto(t, k){
    const g = tableGeo(Object.assign({}, t, { [k]:0 }, k === "baseEdge" || k === "midEdge" ? { shelfEdge:0 } : {}), S);
    return { topEdge:g.eT, baseEdge:g.eB, midEdge:g.eM, topRet:g.rT, baseRet:g.rB, midRet:g.rM, legSpan:Math.round(g.span * 10) / 10,
             legFL:g.legAuto, legFR:g.legAuto, legBL:g.legAuto, legBR:g.legAuto, sideL:g.sideStd, sideR:g.sideStd }[k];
  }
  function renderEdit(){
    const o = order, ro = o.stage !== "new", dis = ro ? " disabled" : "";
    let h = '<div class="card"><h2>Клиент</h2>' +
      (ro ? '<div class="note" style="margin:0 0 12px">Разкроят е потвърден, затова полетата са заключени. За промяна на размерите натиснете „Върни в Разкрой“ най-долу.</div>' : '') +
      '<div class="grid"><label>Име<input type="text" id="o-name" value="' + esc(o.name) + '"' + dis + '></label>' +
      '<label>Телефон<input type="text" id="o-phone" value="' + esc(o.phone) + '"' + dis + '></label>' +
      '<label>Промокод <span class="u" id="o-promoMsg">' + esc(promoOf(o.promo) ? "−" + promoOf(o.promo).pct + "%" : "") + '</span><input type="text" id="o-promo" value="' + esc(o.promo || "") + '"' + dis + '></label>' +
      '<label>Доставка<select id="o-dlvType"' + dis + '>' + Object.keys(DLV).map(k => '<option value="' + k + '"' + ((o.delivery ? o.delivery.type : "address") === k ? " selected" : "") + '>' + DLV[k] + '</option>').join("") + '</select></label>' +
      '<label>Населено място<input type="text" id="o-dlvCity" value="' + esc(o.delivery ? o.delivery.city : "") + '"' + dis + '></label>' +
      '<label>Адрес / офис на Еконт<input type="text" id="o-dlvAddr" value="' + esc(o.delivery ? o.delivery.address : "") + '"' + dis + '></label>' +
      '</div></div>';
    o.tables.forEach((t, i) => {
      h += '<div class="card tbl" data-i="' + i + '"><h2 class="tablehead"><span class="name">Маса ' + (i + 1) + '</span>' +
        ((o.tables.length > 1 || o.parts.length || o.assemblies.length) && !ro ? '<button class="btn danger" data-act="del" type="button">✕ Премахни</button>' : '') + '</h2>' +
        '<div class="tgrid"><div class="drawbox"><svg class="draw" viewBox="0 0 560 420" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif"></svg></div>' +
        '<div><div class="grid">' +
        FIELDS.map(([k,l,u]) => '<label>' + esc(l) + ' <span class="u">(' + u + ')</span><input type="number" min="0" step="1" data-k="' + k + '" value="' + esc(t[k]) + '"' + dis + '></label>').join("") +
        '</div><div class="chks">' +
        '<label class="chk"><input type="checkbox" data-k="splashOn"' + (t.splashOn ? " checked" : "") + dis + '> Борд</label>' +
        '<span class="hemctl"><label>Подгъвка на борда<select data-k="hemDir"' + dis + '>' +
          [["wall","към стената (в дълбочината)"],["front","напред"],["none","без"]].concat(!t.hemDir ? [["","към стената, извън дълбочината (стара поръчка)"]] : [])
            .map(([v,l]) => '<option value="' + v + '"' + ((t.hemDir || "") === v ? " selected" : "") + '>' + l + '</option>').join("") + '</select></label>' +
        '<label>Подгъвка <span class="u">(мм)</span><input type="number" min="0" step="1" data-k="hem" value="' + esc(+t.hem > 0 ? t.hem : "") + '"' + dis + '></label></span>' +
        '<label class="chk"><input type="checkbox" data-k="frame"' + (isFrame(t) ? " checked" : "") + (dis || (has6(t) || +t.L > 1500 ? " disabled" : "")) + '> Рамка от профил, плотовете — тави отгоре (без сгъвка навътре)</label>' +
        '<label class="chk"><input type="checkbox" data-k="legs6"' + (has6(t) ? " checked" : "") + (dis || (has6(t) && !t.legs6 ? " disabled" : "")) + '> 6 крака</label>' +
        '<span class="legs6ctl"><label>Долните плотове<select data-k="shelfSide"' + dis + '>' + [["left","в лявата част"],["right","в дясната част"]]
            .map(([v,l]) => '<option value="' + v + '"' + ((t.shelfSide || "left") === v ? " selected" : "") + '>' + l + '</option>').join("") + '</select></label>' +
          '<label>До средните крака <span class="u">(мм, външно)</span><input type="number" min="0" step="any" data-k="bayL" value="' + esc(+t.bayL > 0 ? t.bayL : "") + '"' + dis + '></label>' +
          '<label class="chk"><input type="checkbox" data-k="rails"' + (t.rails ? " checked" : "") + dis + '> Профили в празната част (отзад и отстрани)</label>' +
          '<label>Профили от пода <span class="u">(мм, долен ръб)</span><input type="number" min="0" step="any" data-k="railH" value="' + esc(+t.railH > 0 ? t.railH : "") + '"' + dis + '></label></span>' +
        '<label class="chk"><input type="checkbox" data-k="gn"' + (t.gn ? " checked" : "") + dis + '> Стелаж за GN 1/1</label>' +
        '<span class="legs6ctl gnctl"><label class="gnSideL">Стелажът е<select data-k="gnSide"' + dis + '>' + [["left","вляво"],["right","вдясно"]]
            .map(([v,l]) => '<option value="' + v + '"' + ((t.gnSide || "left") === v ? " selected" : "") + '>' + l + '</option>').join("") + '</select></label>' +
          '<label>GN — брой нива <span class="u">(празно = колкото се събират)</span><input type="number" min="0" step="1" data-k="gnLevels" value="' + esc(+t.gnLevels > 0 ? t.gnLevels : "") + '"' + dis + '></label>' +
          '<label>GN — стъпка между нивата <span class="u">(мм)</span><input type="number" min="0" step="1" data-k="gnPitch" value="' + esc(+t.gnPitch > 0 ? t.gnPitch : "") + '"' + dis + '></label></span>' +
        '<label class="chk"><input type="checkbox" data-k="baseOn"' + (t.baseOn ? " checked" : "") + dis + '> Долна основа (плот)</label>' +
        '<label class="chk"><input type="checkbox" data-k="midOn"' + (t.midOn ? " checked" : "") + dis + '> Втори междинен плот <span class="u mid2info"></span></label>' +
        '</div><div class="muted" style="margin-top:6px">Ламарина 1.5 мм · профил на краката 30×30 мм</div>' +
        '<h3>Допълнителни настройки <span class="u">(мм; празно = стандартно — вижда се в полето)</span></h3><div class="grid advgrid">' +
        ADV_FIELDS.map(([k,l]) => '<label data-adv="' + k + '">' + esc(l) + '<input type="number" min="0" step="any" data-k="' + k + '" value="' + esc(+t[k] > 0 ? t[k] : (k === "baseEdge" || k === "midEdge") && +t.shelfEdge > 0 ? t.shelfEdge : "") + '"' + dis + '></label>').join("") +
        '</div>' +
        '<label style="margin-top:10px">Бележки на клиента<textarea rows="2" data-k="notes"' + dis + '>' + esc(t.notes) + '</textarea></label></div></div>' +
        '<h3>Размери — изглед отпред и отстрани</h3><div class="viewsHost"></div></div>';
    });
    o.parts.forEach((p, j) => {
      const g = partGeo(p);
      h += '<div class="card partcard" data-j="' + j + '"><h2 class="tablehead"><span class="name">' + esc("Д" + (j + 1) + " · " + p.name) + '</span>' +
        '<button class="btn small" data-pact="edit" type="button">' + (ro ? 'Виж в конструктора' : 'Редактирай в конструктора') + '</button>' +
        '<button class="btn small" data-pact="lib" type="button">Запази в библиотеката</button>' +
        (ro ? '' : '<button class="btn danger" data-pact="del" type="button">✕ Премахни</button>') + '</h2>' +
        '<div class="muted">дъно ' + fmt(p.L) + ' × ' + fmt(p.W) + ' мм · лист ' + p.th + ' мм · ' + p.qty + ' бр. · заготовка ' + fmt(g.BW) + ' × ' + fmt(g.BH) + ' мм · огъвания ' + g.bends + '</div>' +
        '<div class="schemes" style="margin-top:8px">' + partSvg(p, g) + '</div></div>';
    });
    o.assemblies.forEach((a, j) => {
      const r = asmSvg(a, { yaw:-0.55, pitch:0.62 }, { tags:a.items.map((x, k) => asmTag(j, k)), VW:640, VH:300 });
      h += '<div class="card asmcard" data-aj="' + j + '"><h2 class="tablehead"><span class="name">' + esc("Е" + (j + 1) + " · " + a.name) + (a.qty > 1 ? ' × ' + a.qty : '') + '</span>' +
        '<button class="btn small" data-aact2="edit" type="button">' + (ro ? 'Виж в конструктора' : 'Редактирай в конструктора') + '</button>' +
        '<button class="btn small" data-aact2="lib" type="button">Запази в библиотеката</button>' +
        (ro ? '' : '<button class="btn danger" data-aact2="del" type="button">✕ Премахни</button>') + '</h2>' +
        '<div class="muted">' + a.items.length + ' детайла · габарит ' + (r.size || [0, 0, 0]).map(v => fmt(v)).join(" × ") + ' мм · заварки ' + asmJoints(a).filter(x => x.on).length + '</div>' +
        (r.svg ? '<figure class="scheme"><svg viewBox="0 0 ' + r.VW + ' ' + r.VH + '" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif" style="background:#f8fafc">' + r.svg + '</svg></figure>' : '') + '</div>';
    });
    if(!ro) h += '<div class="row" style="margin:-4px 0 16px"><button class="btn" id="addT" type="button">➕ Добави маса</button>' +
      '<button class="btn" id="addP" type="button">➕ Добави детайл (конструктор)</button>' +
      '<button class="btn" id="addA" type="button">➕ Добави елемент (сглобка)</button></div>';
    $("order").innerHTML = h;
    o.tables.forEach((t, i) => drawTable(i));
    document.querySelectorAll("#order .partcard").forEach(card => {
      const j = +card.dataset.j, p = o.parts[j];
      card.querySelector('[data-pact="edit"]').addEventListener("click", () => openDesigner({ orderId:o.id, pid:p.pid }));
      const lb = card.querySelector('[data-pact="lib"]');
      lb.addEventListener("click", () => {
        const copy = normPart(JSON.parse(JSON.stringify(p))); copy.pid = newPid(); LIB.items.push(copy); saveLib();
        lb.textContent = "✓ В библиотеката"; lb.disabled = true;
      });
      const del = card.querySelector('[data-pact="del"]');
      if(del) del.addEventListener("click", () => {
        if(del.dataset.armed !== "1"){ del.dataset.armed = "1"; del.textContent = "Сигурно? Натисни пак"; return; }
        o.parts.splice(j, 1); renderEdit(); recompute(); edited();
      });
    });
    document.querySelectorAll("#order .asmcard").forEach(card => {
      const j = +card.dataset.aj, a = o.assemblies[j];
      card.querySelector('[data-aact2="edit"]').addEventListener("click", () => openAsm({ orderId:o.id, aid:a.aid }));
      const lb = card.querySelector('[data-aact2="lib"]');
      lb.addEventListener("click", () => { const c = normAsm(JSON.parse(JSON.stringify(a))); c.aid = newAid(); LIB.assemblies.push(c); saveLib(); lb.textContent = "✓ В библиотеката"; lb.disabled = true; });
      const del = card.querySelector('[data-aact2="del"]');
      if(del) del.addEventListener("click", () => {
        if(del.dataset.armed !== "1"){ del.dataset.armed = "1"; del.textContent = "Сигурно? Натисни пак"; return; }
        o.assemblies.splice(j, 1); renderEdit(); recompute(); edited();
      });
    });
    if(ro) return;
    $("addA").addEventListener("click", () => {
      const na = normAsm({ name:"Елемент" }); o.assemblies.push(na); edited();
      openAsm({ orderId:o.id, aid:na.aid });
    });
    $("addP").addEventListener("click", () => {
      const np = normPart(JSON.parse(JSON.stringify(PART_TEMPLATES[0][1]))); o.parts.push(np); edited();
      openDesigner({ orderId:o.id, pid:np.pid });
    });

    $("o-name").addEventListener("input", e => { o.name = e.target.value; recompute(); edited(); });
    $("o-phone").addEventListener("input", e => { o.phone = e.target.value; recompute(); edited(); });
    $("o-promo").addEventListener("input", e => { const pc = promoOf(e.target.value); o.promo = pc ? pc.code : e.target.value.trim();
      $("o-promoMsg").textContent = pc ? "−" + pc.pct + "%" : e.target.value.trim() ? "невалиден" : ""; recompute(); edited(); });
    [["o-dlvType","type"],["o-dlvCity","city"],["o-dlvAddr","address"]].forEach(([id, k]) => $(id).addEventListener("input", e => {
      o.delivery = normDelivery(Object.assign({}, o.delivery, { [k]:e.target.value })); recompute(); edited(); }));
    $("addT").addEventListener("click", () => { o.tables.push(normTable({ hemDir:"wall" })); renderEdit(); recompute(); edited(); });
    document.querySelectorAll("#order .tbl").forEach(card => {
      const i = +card.dataset.i, t = o.tables[i];
      card.querySelectorAll("[data-k]").forEach(inp => {
        inp.addEventListener("input", () => {
          const k = inp.dataset.k;
          if(inp.type === "checkbox"){
            t[k] = inp.checked;
            // same rule as the customer form: the second shelf needs the base
            if(k === "midOn" && t.midOn){ t.baseOn = true; card.querySelector('[data-k="baseOn"]').checked = true; }
            if(k === "baseOn" && !t.baseOn){ t.midOn = false; card.querySelector('[data-k="midOn"]').checked = false; }
          }else if(inp.tagName === "TEXTAREA" || inp.tagName === "SELECT"){ t[k] = inp.value; }
          else{ t[k] = k === "qty" ? Math.max(1, Math.round(+inp.value || 1)) : (+inp.value || 0); }
          if((k === "baseEdge" || k === "midEdge") && +t.shelfEdge > 0){
            ["baseEdge","midEdge"].forEach(x => { if(x !== k && !(+t[x] > 0)) t[x] = +t.shelfEdge; }); t.shelfEdge = 0; }
          if(ADV_FIELDS.some(([x]) => x === k)) t.advOn = ADV_FIELDS.some(([x]) => +t[x] > 0);
          drawTable(i); recompute(); edited();
        });
      });
      const del = card.querySelector('[data-act="del"]');
      if(del) del.addEventListener("click", () => {
        if(del.dataset.armed !== "1"){ del.dataset.armed = "1"; del.textContent = "Сигурно? Натисни пак"; return; }
        o.tables.splice(i, 1); renderEdit(); recompute(); edited();
      });
    });
  }
  /* ---------- изгледи с всички размери: отпред и отстрани (за цеха) ----------
     Отпред: дължината, отстоянието на краката от ръба, между краката (и до средните), височини на
     плотовете, светло между долния и работния плот, профилите. Отстрани: дълбочината, предни/задни крака,
     борд и подгъвка, профилите. Всичко в мм. */
  function tableViews(t, split){
    const g = tableGeo(t, S), th = +t.thickness || 1.5, prof = g.prof, H = +t.H || 0, L = +t.L || 0;
    const base = t.baseOn ? +t.baseH || 0 : 0, mid = t.midOn ? mid2H(t) : 0, spl = t.splashOn ? +t.splashH || 0 : 0;
    const topU = H - g.eT;                          // долният ръб на челната дъска
    const r1 = n => String(Math.round(n * 10) / 10);
    function view(W, Hh, draw, title){
      const padL = 290, padR = 70, padT = 40, padB = 140;
      const k = Math.min((1200 - padL - padR) / Math.max(1, W), 600 / Math.max(1, Hh + spl)), VW = Math.round(W * k + padL + padR);
      const VH = Math.round((Hh + spl) * k + padT + padB);
      const X = x => (padL + x * k).toFixed(1), Y = y => (padT + (Hh + spl - y) * k).toFixed(1);
      const out = [];
      const rect = (x, y, w, h, st) => out.push('<rect x="' + X(x) + '" y="' + Y(y + h) + '" width="' + Math.max(0.5, w * k).toFixed(1) + '" height="' + Math.max(0.5, h * k).toFixed(1) + '" ' + st + '/>');
      const S1 = 'fill="#dbe4ee" stroke="#334155" stroke-width="1.2"', S2 = 'fill="#eef2f7" stroke="#64748b" stroke-width="1" stroke-dasharray="5 3"', S3 = 'fill="#c7d2fe" stroke="#3730a3" stroke-width="1.3"';
      // horizontal dimension at height-level `y` (px offset `off` below the floor when y === null)
      const hdim = (a, b, py, txt, small) => { if(Math.abs(b - a) < 0.5) return;
        const x1 = +X(a), x2 = +X(b);
        out.push('<line x1="' + x1 + '" y1="' + py + '" x2="' + x2 + '" y2="' + py + '" stroke="#1552c7" stroke-width="1.2" marker-start="url(#ar)" marker-end="url(#ar)"/>' +
          '<line x1="' + x1 + '" y1="' + (py - 8) + '" x2="' + x1 + '" y2="' + (py + 8) + '" stroke="#1552c7"/><line x1="' + x2 + '" y1="' + (py - 8) + '" x2="' + x2 + '" y2="' + (py + 8) + '" stroke="#1552c7"/>' +
          '<text x="' + ((x1 + x2) / 2).toFixed(1) + '" y="' + (py - 5) + '" text-anchor="middle" font-size="' + (small ? 14 : 17) + '" font-weight="700" fill="#1552c7" style="paint-order:stroke;stroke:#fff;stroke-width:3px">' + esc(txt) + '</text>'); };
      const vdim = (a, b, px, txt, side) => { if(Math.abs(b - a) < 0.5) return;
        const y1 = +Y(a), y2 = +Y(b);
        out.push('<line x1="' + px + '" y1="' + y1 + '" x2="' + px + '" y2="' + y2 + '" stroke="#1552c7" stroke-width="1.2" marker-start="url(#ar)" marker-end="url(#ar)"/>' +
          '<line x1="' + (px - 8) + '" y1="' + y1 + '" x2="' + (px + 8) + '" y2="' + y1 + '" stroke="#1552c7"/><line x1="' + (px - 8) + '" y1="' + y2 + '" x2="' + (px + 8) + '" y2="' + y2 + '" stroke="#1552c7"/>' +
          '<text x="' + (px + (side < 0 ? -6 : 6)) + '" y="' + ((y1 + y2) / 2 + 4).toFixed(1) + '" text-anchor="' + (side < 0 ? "end" : "start") + '" font-size="16" font-weight="700" fill="#1552c7" style="paint-order:stroke;stroke:#fff;stroke-width:3px">' + esc(txt) + '</text>'); };
      const note = (x, y, txt) => out.push('<text x="' + X(x) + '" y="' + Y(y) + '" font-size="14" fill="#7c3aed" font-weight="600" style="paint-order:stroke;stroke:#fff;stroke-width:3px">' + esc(txt) + '</text>');
      draw({ rect, hdim, vdim, note, X, Y, S1, S2, S3, floor:+Y(0), k, VW, padL, padR });
      out.unshift('<line x1="' + (padL - 30) + '" y1="' + Y(0) + '" x2="' + (VW - padR + 30) + '" y2="' + Y(0) + '" stroke="#94a3b8" stroke-width="2"/>');
      return '<figure class="scheme"><svg viewBox="0 0 ' + VW + ' ' + VH + '" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif" style="width:100%;max-width:' + Math.round(Math.min(VW * 0.8, VW * 360 / VH)) + 'px;height:auto;background:#fff">' +
        '<defs><marker id="ar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,2 L5,5 L0,8" fill="none" stroke="#1552c7" stroke-width="1.5"/></marker></defs>' +
        out.join("") + '</svg><figcaption>' + esc(title) + '</figcaption></figure>';
    }
    // ---- отпред ----
    const front = view(L, H, d => {
      if(spl) d.rect(0, H, L, spl, d.S2);                                        // бордът (отзад)
      if(g.rails) d.rect(g.railX0, g.railH, g.railX1 - g.railX0, prof, d.S3);   // профилът отзад (и отпред при GN)
      const legX = [g.sideL, L - g.sideR - prof].concat(g.legs6 ? [g.midX] : [], g.gnPosts);
      if(g.gnAngle){ const a = g.gnA, b = g.gnB, n = g.gnZ.length;   // GN: винкелите
        g.gnZ.forEach(z => { d.rect(a, z - 20, 20, 20, d.S3); d.rect(b - 20, z - 20, 20, 20, d.S3); });
        if(n > 1) d.vdim(g.gnZ[n - 1], g.gnZ[n - 2], +d.X(a + (b - a) * 0.3), g.gnPitch + " стъпка", 1);
        d.vdim(0, g.gnZ[n - 1], +d.X(a + (b - a) * 0.72), r1(g.gnZ[n - 1]) + " долу", 1);
        d.vdim(g.gnZ[0], g.gnZ[0] + 40, +d.X(a + (b - a) * 0.7), "40", 1); }
      legX.forEach(x => d.rect(x, 0, prof, H - th, d.S1));
      const shelf = (at, e) => d.rect(g.shX, at - e, g.shL, e, d.S1);
      if(t.baseOn) shelf(base, g.eB);
      if(t.midOn) shelf(mid, g.eM);
      d.rect(0, topU, L, g.eT, d.S1);                                           // плотът (челната дъска)
      // по дължина: ръб → крака → (средни) → крака → ръб
      const pts = [0, g.sideL].concat(g.legs6 ? (g.right ? [g.shX] : [g.shX + g.shL]) : [], g.gnPosts.map(x => g.right ? x + prof : x), [L - g.sideR, L]).sort((p1, p2) => p1 - p2);
      for(let i = 0; i + 1 < pts.length; i++) d.hdim(pts[i], pts[i + 1], d.floor + 34, r1(pts[i + 1] - pts[i]), pts[i + 1] - pts[i] < 120);
      if(g.legs6){ if(g.right) d.hdim(0, g.midX, d.floor + 70, r1(g.midX) + " от левия ръб до средните крака");
        else d.hdim(g.midX + prof, L, d.floor + 70, r1(L - g.midX - prof) + " от средните крака до десния ръб"); }
      d.hdim(0, L, d.floor + 108, L + " — дължина");
      // празната част: при стелаж за GN — стелажът (345) и останалото светло; иначе цялото светло
      const gl6 = g.legs6 && g.gnPosts.length;
      const restA = gl6 ? (g.right ? g.gnX + prof : g.railX0) : g.railX0, restB = gl6 ? (g.right ? g.railX1 : g.gnX) : g.railX1;
      if(g.legs6) d.hdim(restA, restB, +d.Y(topU) + 40, "светло " + r1(restB - restA), false);
      if(g.gnAngle) d.hdim(g.gnA, g.gnB, +d.Y(topU) + 40, r1(g.gnB - g.gnA) + " GN 1/1", false);
      // височини (вляво): работен плот, бордът, долният и междинният плот
      const xl = d.padL - 24;
      d.vdim(0, H, xl - 110, H + " височина", -1);
      if(spl) d.vdim(H, H + spl, xl - 110, spl + " борд", -1);
      if(t.baseOn) d.vdim(0, base, xl, base + " долен плот", -1);
      if(t.midOn) d.vdim(base, mid, xl, r1(mid - base), -1);
      // вдясно: от долния (междинния) плот до работния плот и светлото под челната дъска
      // над долния (междинния) плот: до работния плот и светлото под челната дъска — в средата на долния плот
      const xr = +d.X(g.shX + g.shL * 0.35), upper = t.midOn ? mid : base;
      if(t.baseOn){ d.vdim(upper, H, xr, r1(H - upper) + " до плота", 1); d.vdim(upper, topU, xr + 120, r1(topU - upper) + " светло", 1); }
      else if(!(g.gnAngle && !g.legs6)) d.vdim(0, topU, xr, r1(topU) + " под плота", 1);   // тясна маса с GN: нивата казват всичко
      if(g.rails){ const cx = (restA + restB) / 2 - 60;
        d.vdim(0, g.railH, +d.X(cx), r1(g.railH) + " профили", 1);
        if(g.legs6) d.vdim(g.railH + prof, topU, +d.X(cx) + 70, r1(topU - g.railH - prof) + " над профилите", 1); }
      d.note(0, H + spl + 8, "челна дъска " + g.eT + " мм" + (t.baseOn ? " · долен плот: кант " + g.eB + " мм" : "") + " · крака " + prof + "×" + prof);
    }, "Изглед отпред — размерите са в мм (външни страни на краката)");
    // ---- отстрани (отляво: отпред е вляво, стената — вдясно) ----
    const Dtot = g.Dp + g.hemIn;
    const side = view(Dtot, H, d => {
      const fx = g.front, bx = g.front + g.span - prof;
      d.rect(fx, 0, prof, H - th, d.S1); d.rect(bx, 0, prof, H - th, d.S1);
      if(g.rails) d.rect(fx + prof, g.railH, g.railD, prof, d.S3);
      const shelf = (at, e) => d.rect(g.front, at - e, g.span, e, d.S1);
      if(t.baseOn) shelf(base, g.eB);
      if(t.midOn) shelf(mid, g.eM);
      d.rect(0, topU, g.Dp, g.eT, d.S1);
      if(spl){ d.rect(g.Dp - 3, H, 3, spl, d.S1);
        if(g.hem) d.rect(g.hemDir === "front" ? g.Dp - g.hem : g.Dp, H + spl - 3, g.hem, 3, d.S1); }
      const pts = [0, g.front, g.front + g.span, g.Dp].concat(g.hemIn ? [Dtot] : []);
      for(let i = 0; i + 1 < pts.length; i++) d.hdim(pts[i], pts[i + 1], d.floor + 34, r1(pts[i + 1] - pts[i]), pts[i + 1] - pts[i] < 120);
      d.hdim(0, Dtot, d.floor + 78, t.D + " — дълбочина" + (g.hemIn ? " (с подгъвката)" : ""));
      d.vdim(0, H, d.padL - 110, H + " височина", -1);
      if(spl) d.vdim(H, H + spl, d.padL - 110, spl + " борд", -1);
      if(t.baseOn) d.vdim(0, base, d.padL - 24, base + " долен плот", -1);
      if(g.rails) d.vdim(0, g.railH, +d.X(g.front + g.span / 2), r1(g.railH) + " профил", 1);
      d.note(0, H + spl + 8, "крака: " + r1(g.front) + " мм отпред, " + r1(g.back) + " мм отзад");
    }, "Изглед отстрани — отпред е вляво, стената вдясно");
    return split ? { front, side } : '<div class="views2">' + front + side + '</div>';
  }
  function drawTable(i){
    const card = document.querySelector('#order .tbl[data-i="' + i + '"]'); if(!card) return;
    const t = order.tables[i];
    drawBlueprint(Object.assign({}, t, { mid2H:mid2H(t) }), card.querySelector(".draw"), S);
    const vh = card.querySelector(".viewsHost"); if(vh) vh.innerHTML = tableViews(t);
    ADV_FIELDS.forEach(([k]) => { const inp = card.querySelector('[data-k="' + k + '"]'); if(inp) inp.placeholder = advAuto(t, k); });
    card.querySelectorAll('[data-adv="baseEdge"],[data-adv="baseRet"]').forEach(e => e.hidden = !t.baseOn);
    const hc = card.querySelector(".hemctl"); if(hc) hc.hidden = !t.splashOn;
    const g6 = tableGeo(t, S);
    const rc = card.querySelector('[data-k="rails"]'); if(rc){ rc.checked = !!t.rails || !!t.gn; rc.disabled = order.stage !== "new" || !!t.gn; rc.title = t.gn ? "При GN рамката долу е задължителна" : ""; }
    const rh = card.querySelector('[data-k="railH"]'); if(rh) rh.placeholder = t.gn ? "150" : "100";
    const l6 = card.querySelector('[data-k="legs6"]'), forced6 = !!t.gn && !isGnNarrow(t);   // GN на по-широка маса → 6 крака
    if(l6){ l6.checked = has6(t); l6.disabled = order.stage !== "new" || forced6; l6.title = forced6 ? "При стелаж за GN масата е с 6 крака" : ""; }
    const lc = card.querySelector(".legs6ctl:not(.gnctl)"); if(lc){ lc.hidden = !has6(t); const bi = lc.querySelector('[data-k="bayL"]');
      if(bi){ bi.placeholder = t.gn ? "за GN: " + g6.shL : "по средата " + g6.bayAuto; bi.disabled = order.stage !== "new" || !!t.gn; } }
    const gc = card.querySelector(".gnctl"); if(gc){ gc.hidden = !t.gn;   // GN: страната се избира само при широка маса с 4 крака (със стойки)
      gc.querySelector(".gnSideL").hidden = true;
      gc.querySelector('[data-k="gnLevels"]').placeholder = String(g6.gnLevels); gc.querySelector('[data-k="gnPitch"]').placeholder = "120"; }
    const hi = card.querySelector('[data-k="hem"]'); if(hi){ hi.placeholder = S.splashHem; hi.disabled = order.stage !== "new" || t.hemDir === "none"; }
    card.querySelectorAll('[data-adv="midEdge"],[data-adv="midRet"]').forEach(e => e.hidden = !t.midOn);
    const fc = card.querySelector('[data-k="frame"]');   // при 6 крака рамката е задължителна
    if(fc){ fc.checked = isFrame(t); fc.disabled = order.stage !== "new" || has6(t) || +t.L > 1500; fc.title = has6(t) || +t.L > 1500 ? "Масата с 6 крака или над 1500 мм е винаги с рамка от профил" : ""; }
    if(isFrame(t)) card.querySelectorAll('[data-adv="topRet"],[data-adv="baseRet"],[data-adv="midRet"]').forEach(e => e.hidden = true);   // тави: без сгъвка навътре
    card.querySelector(".mid2info").textContent = t.midOn ? "(≈ " + mid2H(t) + " мм от пода)" : "";
    // с борд задният ръб не опира в стената — отстоянието на задните крака не се ползва
    const lb = card.querySelector('[data-k="legBack"]');
    if(lb){ lb.disabled = order.stage !== "new" || t.splashOn || +t.legSpan > 0;
      lb.title = t.splashOn ? "Не се ползва при борд" : +t.legSpan > 0 ? "Задава се от разстоянието между краката" : ""; }
  }

  /* ===== ГЕОМЕТРИЯ НА МАСАТА — ДРЪЖ ИДЕНТИЧНО в site/app.js и site/admin/admin.js =====
     D = стандартните стойности (PRICE в клиента, „Настройки“ в админа).
     Полетата на масата със стойност 0 / празно = стандартно.
     - челни лица (височина на канта) и сгъвки навътре: отделно за работния плот, долната основа и междинния плот;
     - краката стоят зад сгъвката на работния плот: по-дълга сгъвка ги мести навътре (отпред и отстрани);
     - долните плотове са между краката: очертанието им = външните страни на краката;
     - разстояние предни–задни крака = външно = дълбочината на долните плотове; задава мястото на задните крака;
     - всеки крак може да е по-къс (стъпва на подложка) — плотът остава хоризонтален;
     - борд: подгъвка горе към стената / напред / без; към стената тя е част от общата дълбочина D,
       т.е. плотът е D − подгъвката (стари поръчки без посока: към стената, но извън D);
     - 6 крака (legs6): още един чифт крака между крайните; долните плотове са само в лявата или дясната част
       (shelfSide), дълги bayL = външно от крайните до средните крака (0 = средните крака са по средата);
       профили (rails) в празната част: отзад между средния и крайния заден крак + отстрани между предния и задния
       крак (при средните и при крайните) — отпред е отворено; railH = от пода до долния ръб на профилите;
     - рамка (frame): цялата конструкция е рамка от профил (царги между краката под работния плот и под всеки
       долен плот), а плотовете се захлупват отгоре като тави — само челна дъска надолу, БЕЗ сгъвка навътре;
       краката са на D.frameGap от ръба (рамката влиза в тавата), огъването е едно на страна → половината от
       намалението на заготовката (topCut/shelfCut). */
  const LEG_KEYS = ["legFL","legFR","legBL","legBR"];
  // рамка от профил: избрана в админа, или винаги при маса с 6 крака
  // GN 1/1: направо между два крака само при тясна маса (до ≈ 585 мм); иначе масата е с 6 крака — стелажът е в празната част
  const isGnNarrow = t => !!(t && t.gn) && ((+t.L || 0) - 2 * (+t.legProfile || 30) - 345) < 180;
  const has6 = t => !!(t && (t.legs6 || (t.gn && !isGnNarrow(t))));
  const isFrame = t => !!(t && (t.frame || has6(t) || (+t.L || 0) > 1500));   // рамка: избрана, при 6 крака, или маса над 1500 мм
  const LEG_NAMES = ["преден ляв","преден десен","заден ляв","заден десен"];
  function tableGeo(t, D){
    const num = v => (+v > 0 ? +v : 0);
    const eT = num(t.topEdge) || D.topEdge;
    const eB = num(t.baseEdge) || num(t.shelfEdge) || D.shelfEdge;
    const eM = num(t.midEdge) || num(t.shelfEdge) || D.shelfEdge;
    const frame = isFrame(t), fg = +D.frameGap || 2;
    const rT = frame ? 0 : num(t.topRet) || D.topReturn, rB = frame ? 0 : num(t.baseRet) || D.shelfReturn, rM = frame ? 0 : num(t.midRet) || D.shelfReturn;
    const hemDir = t.splashOn ? (t.hemDir === "wall" || t.hemDir === "front" || t.hemDir === "none" ? t.hemDir : "legacy") : "none";
    const hem = hemDir === "none" ? 0 : (num(t.hem) || +D.splashHem || 0);
    const hemIn = hemDir === "wall" ? hem : 0;           // влиза в общата дълбочина
    const Dp = (+t.D || 0) - hemIn;                      // дълбочина на самия плот
    const dR = frame ? 0 : rT - D.topReturn;           // по-дълга сгъвка на плота → краката навътре
    const front = frame ? fg : D.shelfGap + dR;        // предна страна на предните крака от предния ръб
    const sideStd = frame ? fg : (D.shelfGapW + 2 * dR) / 2;   // външна страна на краката от страничния ръб (стандартно)
    let sideL = num(t.sideL) || sideStd, sideR = num(t.sideR) || sideStd;   // отстояние отляво / отдясно
    // GN 1/1 направо между краката (тясна маса с 4 крака): краката се нагласят на 345 мм светло, ако не са зададени
    const gnGap = 345, gnProf = +t.legProfile || 30;
    const gnDirect = !!t.gn && !has6(t);
    if(gnDirect && !num(t.sideL) && !num(t.sideR)){ const sd = ((+t.L || 0) - 2 * gnProf - gnGap) / 2; if(sd >= 1){ sideL = sideR = Math.round(sd * 10) / 10; } }
    const side = sideL;
    const minBack = frame ? fg : t.splashOn ? 0 : rT;  // без борд: зад сгъвката; с борд задът е свободен; рамка: в тавата
    let back = t.splashOn ? minBack : Math.max(minBack, +t.legBack || 0);
    let span = Dp - front - back;
    if(num(t.legSpan)){ span = num(t.legSpan); back = Dp - front - span; }
    const legAuto = (+t.H || 0) - 1.5 - (+D.feet || 0);
    const legs = LEG_KEYS.map(k => num(t[k]) || legAuto);
    // долните плотове: между крайните крака, или — при 6 крака — от крайните до средните (лява/дясна част)
    const L = +t.L || 0, prof = +t.legProfile || 30, full = L - sideL - sideR, legs6 = has6(t), right = t.shelfSide === "right";
    let shL = full, shX = sideL, midX = null, bayAuto = 0;
    if(legs6){
      bayAuto = Math.round((L / 2 + prof / 2 - (right ? sideR : sideL)) * 10) / 10;
      shL = Math.min(full - prof - 50, Math.max(2 * prof + 100, num(t.bayL) || bayAuto));
      if(t.gn) shL = full - prof - 345;               // GN: средните крака — на 345 мм светло от крайните (стелажът е между тях)
      shX = right ? L - sideR - shL : sideL;
      midX = right ? shX : sideL + shL - prof;         // лявата страна на средните крака
    }
    // профилите в празната част (само при 6 крака): x0..x1 = светлото между средния и крайния крак
    // при GN — задължителна рамка от профил долу (на 150 мм): около стелажа при 6 крака, между краката при тясна маса
    // (ако тясната маса има долен плот, рамката му е тази рамка); при GN рамката е затворена — и отпред
    const gnFrame = !!t.gn && (legs6 || !t.baseOn);
    const rails = (legs6 && !!t.rails) || gnFrame, railH = Math.min(Math.max(10, (+t.H || 0) - 200), Math.max(10, num(t.railH) || (t.gn ? 150 : 100)));
    const railFront = false;                       // отпред няма профил — там се вадят тавите
    const railX0 = legs6 ? (right ? sideL + prof : sideL + shL) : rails ? sideL + prof : 0, railX1 = legs6 ? (right ? shX : L - sideR - prof) : rails ? L - sideR - prof : 0;
    let railXs = legs6 ? (right ? [sideL, midX] : [midX, L - sideR - prof]) : rails ? [sideL, L - sideR - prof] : [];
    // стелаж за GN 1/1: винкели 20×20 от двете страни на всяко ниво, на gnGap (345) светло — тавата 530×325 влиза отпред.
    //  - 6 крака: между крайните и средните крака (средните са на 345 мм светло от крайните);
    //  - 4 крака, тясна маса (gnDirect): направо между краката (краката — на 345 мм светло);
    //  - 4 крака, по-широка маса: стойки на 345 мм от крайните крака отляво/отдясно (gnSide); долните плотове — в другата част.
    const gn = !!t.gn, gnPitch = Math.max(40, num(t.gnPitch) || 120), gnLeft = t.gnSide !== "right";
    let gnX = null, gnA = 0, gnB = 0, gnLevels = 0, gnZ = [], gnOk = true;
    if(gn){
      if(legs6){   // между крайните и средните крака (без отделни стойки); долният плот — от другата страна
        gnA = right ? sideL + prof : midX + prof; gnB = right ? midX : L - sideR - prof;
        gnOk = shL >= 2 * prof + 100;                                                  // да остане място за долния плот
      } else {   // тясна маса: направо между двата крака
        gnA = sideL + prof; gnB = L - sideR - prof; gnOk = Math.abs(gnB - gnA - gnGap) <= 20;
      }
      const topZ = (+t.H || 0) - 1.5 - (frame ? prof : eT) - 40;                       // първият винкел: 40 мм под плота (рамката му) — да се бръкне за тавата …
      let lowZ = rails ? railH + prof + 30 : 80;                                       // … над профилите
      if(gnDirect) lowZ = Math.max(lowZ, (t.midOn ? Math.round(((+t.baseH || 0) + Math.max(0, (+t.H || 0) - 40)) / 2) : t.baseOn ? +t.baseH || 0 : 0) + 60);   // … над долния плот
      const max = Math.max(0, Math.floor((topZ - lowZ) / gnPitch) + 1);
      gnLevels = Math.min(max, Math.max(1, Math.round(num(t.gnLevels) || max)));
      for(let k = 0; k < gnLevels; k++) gnZ.push(Math.round((topZ - k * gnPitch) * 10) / 10);   // горната страна на винкела
    }
    const gnPosts = gn && gnOk && gnX != null ? [gnX] : [];
    // профилът отзад — на парчета между краката/стойките
    const railSegs = [];
    if(rails){ const cut = [railX0].concat(gnPosts.length ? [gnX, gnX + prof] : [], [railX1]);
      for(let i = 0; i + 1 < cut.length; i += 2) railSegs.push(Math.max(0, cut[i + 1] - cut[i])); }
    // рамката: царги между краката — под работния плот (отпред, отзад и при всеки чифт крака) и под всеки долен плот
    const frameRails = [];
    if(frame){
      const xs = [sideL].concat(legs6 ? [midX] : [], gnPosts, [L - sideR - prof]).sort((a, b) => a - b), dd = Math.max(0, span - 2 * prof);
      for(let i = 0; i + 1 < xs.length; i++) frameRails.push({ lvl:"top", dir:"x", x:xs[i] + prof, len:Math.max(0, xs[i + 1] - xs[i] - prof), qty:2 });
      xs.forEach(x => frameRails.push({ lvl:"top", dir:"y", x, len:dd, qty:1 }));
      [["base", t.baseOn], ["mid", t.midOn]].forEach(([lvl, on]) => { if(!on) return;
        frameRails.push({ lvl, dir:"x", x:shX + prof, len:Math.max(0, shL - 2 * prof), qty:2 });
        [shX, shX + shL - prof].forEach(x => frameRails.push({ lvl, dir:"y", x, len:dd, qty:1 })); });
    }
    return { frame, frameRails, shPad:frame ? fg : 0, frameLen:frameRails.reduce((a, r) => a + r.len * r.qty, 0), frameJoints:frameRails.reduce((a, r) => a + 2 * r.qty, 0),
             eT, eB, eM, rT, rB, rM, hemDir, hem, hemIn, Dp, front, side, sideL, sideR, sideStd, back, minBack, span, shL, shD:span, shX, full, legAuto, legs,
             legs6, right, midX, bayAuto, nLegs:legs6 ? 6 : 4, prof,
             rails, railH, railFront, railX0, railX1, railLen:railSegs.reduce((a, v) => a + v, 0) * (railFront ? 2 : 1), railSegs, railD:rails ? Math.max(0, span - 2 * prof) : 0, railXs,
             railJoints:rails ? 2 * (railSegs.length * (railFront ? 2 : 1) + railXs.length) : 0,
             gn, gnOk, gnX, gnA, gnB, gnGap, gnDirect, gnLeft, gnPitch, gnLevels, gnZ, gnPosts, gnAngle:gn && gnOk && gnLevels ? Math.max(0, span - 2 * prof) : 0,
             gnRoom:front + span - prof };   // място за тавата: от предния ръб на плота до задните крака (тавата влиза между предните крака)
  }

  /* ---------- isometric 3D drawing (same in the customer form and the admin) ---------- */
  function drawBlueprint(v, svgEl, D){
    const realL=v.L, realD=v.D, realH=v.H;
    if(!realL||!realD||!realH){ svgEl.innerHTML=''; return; }
    const g=tableGeo(v, D);
    const splashOn=v.splashOn, splashH=v.splashH, baseOn=v.baseOn, baseH=v.baseH, midOn=v.midOn;
    const legProfile=v.legProfile||30;

    const w=realL/1000, d=g.Dp/1000, h=realH/1000, zD=-g.hemIn/1000;   // zD: задният край на общата дълбочина
    const tt=Math.max(0.015,(g.eT+10)/1000), lg=legProfile/1000;
    const thB=Math.max(0.012,(g.eB+10)/1000), thM=Math.max(0.012,(g.eM+10)/1000);
    const legH=h-tt;

    const P=(x,y,z)=>({x:(x-z)*0.866, y:(x+z)*0.5 - y});
    const shapes=[];
    function box(x,y,z,bw,bh,bd,ct,cf,cr){
      const c=(X,Y,Z)=>P(x+X,y+Y,z+Z);
      shapes.push({t:'poly',fill:cr,pts:[c(bw,0,0),c(bw,bh,0),c(bw,bh,bd),c(bw,0,bd)]});
      shapes.push({t:'poly',fill:cf,pts:[c(0,0,bd),c(bw,0,bd),c(bw,bh,bd),c(0,bh,bd)]});
      shapes.push({t:'poly',fill:ct,pts:[c(0,bh,0),c(bw,bh,0),c(bw,bh,bd),c(0,bh,bd)]});
    }
    const TOP='url(#gT)',FRONT='url(#gF)',RIGHT='url(#gR)';
    const B2='url(#gT2)',B2F='url(#gF2)',B2R='url(#gR2)';

    // legs sit at the outline of the lower shelves
    const x0=g.sideL/1000, x1=w-g.sideR/1000, z0=Math.max(0,g.back/1000), z1=d-g.front/1000;
    const lxL=x0, lxR=Math.max(x0,x1-lg), backZ=z0, frontZ=Math.max(z0,z1-lg);
    const shelf=(yy,th)=>box(g.shX/1000,yy,z0, Math.max(0.01,g.shL/1000), th, Math.max(0.01,z1-z0), B2,B2F,B2R);
    const midLeg=z=>{ if(g.legs6) box(g.midX/1000,0,z,lg,Math.max(0.01,legH),lg,TOP,FRONT,RIGHT); };   // средният чифт крака
    // one leg; a shorter leg stands on a block (подложка)
    function leg(i,x,z){
      const raise=Math.max(0,(g.legAuto-g.legs[i])/1000);
      if(raise>0.0005){
        box(x-0.012,0,z-0.012,lg+0.024,raise,lg+0.024,'#e7dcc4','#cdbd98','#b8a67d');
        shapes.push({t:'cap',p:P(x+lg+0.02,raise/2,z+lg),txt:'подложка '+Math.round((g.legAuto-g.legs[i])*10)/10,dx:4,dy:4});
      }
      box(x,raise,z,lg,Math.max(0.01,legH-raise),lg,TOP,FRONT,RIGHT);
    }

    shapes.push({t:'shadow',pts:[P(-0.03,0,-0.03),P(w+0.03,0,-0.03),P(w+0.03,0,d+0.03),P(-0.03,0,d+0.03)]});
    leg(2,lxL,backZ); leg(3,lxR,backZ); midLeg(backZ);
    if(g.rails){ const ry=g.railH/1000;   // профили в празната част: отзад + отстрани
      box(g.railX0/1000,ry,backZ,Math.max(0.01,(g.railX1-g.railX0)/1000),lg,lg,TOP,FRONT,RIGHT);
      g.railXs.forEach(x=>box(x/1000,ry,backZ+lg,lg,lg,Math.max(0.01,frontZ-backZ-lg),TOP,FRONT,RIGHT));
      if(g.railFront) box(g.railX0/1000,ry,frontZ,Math.max(0.01,(g.railX1-g.railX0)/1000),lg,lg,TOP,FRONT,RIGHT); }   // при GN — и отпред

    if(g.frame){   // царгите на рамката — под тавите (рисуват се преди плотовете, за да ги покрият челните дъски)
      const b0=Math.min(legH-0.05, Math.max(0.03, baseH/1000)), lv={top:h-0.0015, base:b0, mid:(b0+legH)/2};
      g.frameRails.forEach(r=>{ const y=lv[r.lvl]-lg;
        if(r.dir==="x"){ box(r.x/1000,y,backZ,r.len/1000,lg,lg,TOP,FRONT,RIGHT); box(r.x/1000,y,frontZ,r.len/1000,lg,lg,TOP,FRONT,RIGHT); }
        else box(r.x/1000,y,backZ+lg,lg,lg,Math.max(0.01,frontZ-backZ-lg),TOP,FRONT,RIGHT); }); }
    let by=0, midY=0;
    if(baseOn||midOn){ by=Math.min(legH-0.05, Math.max(0.03, baseH/1000)); shelf(by,thB); }
    if(midOn){ midY=Math.min(legH-0.05, (by+legH)/2); shelf(midY,thM); }

    if(g.gnAngle){ const an=0.02;   // GN: стойките (ако има) + винкелите от двете страни на всяко ниво
      if(g.gnPosts.length) box(g.gnX/1000,0,backZ,lg,Math.max(0.01,legH),lg,TOP,FRONT,RIGHT);
      g.gnZ.forEach(z=>{ const y=z/1000-an; [g.gnA/1000, g.gnB/1000-an].forEach(ax=>box(ax,y,backZ+lg,an,an,Math.max(0.01,frontZ-backZ-lg),TOP,FRONT,RIGHT)); }); }
    leg(0,lxL,frontZ); leg(1,lxR,frontZ); midLeg(frontZ);
    if(g.gnPosts.length) box(g.gnX/1000,0,frontZ,lg,Math.max(0.01,legH),lg,TOP,FRONT,RIGHT);
    box(0,h-tt,0,w,tt,d,TOP,FRONT,RIGHT);
    if(splashOn){ const bs=Math.max(0.03, splashH/1000), hm=g.hem/1000, sh=0.006;
      if(hm>0) box(0,h,g.hemDir==="front"?0:-hm,w,bs,hm+sh,TOP,FRONT,RIGHT);   // борд с подгъвка горе (към стената; „напред“ — само при стари поръчки)
      else box(0,h,0,w,bs,sh,TOP,FRONT,RIGHT); }                              // без подгъвка: само ламарината нагоре

    const off=Math.max(w,d,h)*0.16+0.05;
    function dim(a,b,lp,txt,anchor,dx,dy,ext){
      shapes.push({t:'dim',pts:[a,b]});
      shapes.push({t:'text',p:lp,txt,anchor,dx:dx||0,dy:dy||0});
      if(ext) ext.forEach(e=>shapes.push({t:'ext',pts:e}));
    }
    dim(P(0,0,d+off),P(w,0,d+off),P(w/2,0,d+off),realL+'','middle',0,16,
        [[P(0,0,d),P(0,0,d+off)],[P(w,0,d),P(w,0,d+off)]]);
    dim(P(w+off,0,zD),P(w+off,0,d),P(w+off,0,(zD+d)/2),realD+'','start',8,4,
        [[P(w,0,zD),P(w+off,0,zD)],[P(w,0,d),P(w+off,0,d)]]);
    dim(P(w+off,0,d),P(w+off,h,d),P(w+off,h/2,d),realH+'','start',8,0,
        [[P(w,h,d),P(w+off,h,d)]]);
    if(g.back>0.5){ const sx=w+off*1.9;
      dim(P(sx,0,0),P(sx,0,backZ),P(sx,0,backZ/2),Math.round(g.back*10)/10+'','start',10,-2,
        [[P(w,0,0),P(sx,0,0)],[P(x1,0,backZ),P(sx,0,backZ)]]);
      shapes.push({t:'cap',p:P(sx,0,backZ/2),txt:'заден крак',dx:10,dy:14});
    }
    if(+v.legSpan>0){ const sx=w+off*2.8;   // зададено разстояние предни–задни крака (външно)
      dim(P(sx,0,backZ),P(sx,0,z1),P(sx,0,(backZ+z1)/2),Math.round(g.span*10)/10+'','start',10,-2,
        [[P(x1,0,backZ),P(sx,0,backZ)],[P(x1,0,z1),P(sx,0,z1)]]);
      shapes.push({t:'cap',p:P(sx,0,(backZ+z1)/2),txt:'между краката',dx:10,dy:14});
    }
    if(g.sideL!==g.sideStd||g.sideR!==g.sideStd){ const zz=d+off*0.45;   // зададено отстояние на краката отляво / отдясно
      [[0,x0,Math.round(g.sideL*10)/10],[x1,w,Math.round(g.sideR*10)/10]].forEach(([a,b,v])=>{
        dim(P(a,0,zz),P(b,0,zz),P((a+b)/2,0,zz),v+'','middle',0,16,[[P(a,0,d),P(a,0,zz)],[P(b,0,z1+lg),P(b,0,zz)]]); }); }
    if(g.legs6){ const a=g.shX/1000, b=(g.shX+g.shL)/1000, zz=d+off*0.45;   // 6 крака: от крайните до средните крака (външно)
      dim(P(a,0,zz),P(b,0,zz),P((a+b)/2,0,zz),Math.round(g.shL*10)/10+'','middle',0,16,[[P(a,0,z1+lg),P(a,0,zz)],[P(b,0,z1+lg),P(b,0,zz)]]);
      shapes.push({t:'cap',p:P((a+b)/2,0,zz),txt:'до средните крака',dx:-40,dy:30});
    }
    if(baseOn) dim(P(-off,0,d),P(-off,by,d),P(-off,by/2,d),baseH+'','end',-8,0,
        [[P(0,0,d),P(-off,0,d)],[P(0,by,d),P(-off,by,d)]]);
    if(midOn){ const mx2=-off*2.0;
      dim(P(mx2,0,d),P(mx2,midY,d),P(mx2,midY/2,d),v.mid2H+'','end',-8,0,
        [[P(0,midY,d),P(mx2,midY,d)]]);
      shapes.push({t:'cap',p:P(mx2,midY,d),txt:'втори плот',dx:-72,dy:-6});
    }

    let miX=1e9,maX=-1e9,miY=1e9,maY=-1e9;
    shapes.forEach(s=>{(s.pts?s.pts:[s.p]).forEach(p=>{miX=Math.min(miX,p.x);maX=Math.max(maX,p.x);miY=Math.min(miY,p.y);maY=Math.max(maY,p.y);});});
    const VW=560,VH=420,pad=46;
    const sc=Math.min((VW-2*pad)/(maX-miX),(VH-2*pad)/(maY-miY));
    const offx=(VW-(maX-miX)*sc)/2, offy=(VH-(maY-miY)*sc)/2;
    const mx=x=>offx+(x-miX)*sc, my=y=>offy+(y-miY)*sc;

    let svg='<defs><marker id="ar" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto"><path d="M1 1L8 4.5L1 8" fill="none" stroke="#1E6FF4" stroke-width="1.4"/></marker>'+
      '<linearGradient id="gT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3f8fc"/><stop offset="1" stop-color="#dae6f0"/></linearGradient>'+
      '<linearGradient id="gF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d2dde9"/><stop offset="1" stop-color="#b1c3d6"/></linearGradient>'+
      '<linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b7c7d9"/><stop offset="1" stop-color="#94a9be"/></linearGradient>'+
      '<linearGradient id="gT2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9f0f6"/><stop offset="1" stop-color="#d0dbe6"/></linearGradient>'+
      '<linearGradient id="gF2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c5d2df"/><stop offset="1" stop-color="#a9bbcd"/></linearGradient>'+
      '<linearGradient id="gR2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9bacd"/><stop offset="1" stop-color="#8aa1b7"/></linearGradient></defs>';
    shapes.forEach(s=>{ if(s.t==='shadow') svg+='<polygon points="'+s.pts.map(p=>mx(p.x).toFixed(1)+','+my(p.y).toFixed(1)).join(' ')+'" fill="#334155" opacity="0.07"/>'; });
    shapes.forEach(s=>{ if(s.t==='poly') svg+='<polygon points="'+s.pts.map(p=>mx(p.x).toFixed(1)+','+my(p.y).toFixed(1)).join(' ')+'" fill="'+s.fill+'" stroke="#5f7d9e" stroke-width="1" stroke-linejoin="round"/>'; });
    shapes.forEach(s=>{ if(s.t==='ext'){const a=s.pts[0],b=s.pts[1];svg+='<line x1="'+mx(a.x).toFixed(1)+'" y1="'+my(a.y).toFixed(1)+'" x2="'+mx(b.x).toFixed(1)+'" y2="'+my(b.y).toFixed(1)+'" stroke="#9fb3c8" stroke-width="0.8"/>';} });
    shapes.forEach(s=>{ if(s.t==='dim'){const a=s.pts[0],b=s.pts[1];svg+='<line x1="'+mx(a.x).toFixed(1)+'" y1="'+my(a.y).toFixed(1)+'" x2="'+mx(b.x).toFixed(1)+'" y2="'+my(b.y).toFixed(1)+'" stroke="#1E6FF4" stroke-width="1.1" marker-start="url(#ar)" marker-end="url(#ar)"/>';} });
    shapes.forEach(s=>{ if(s.t==='text') svg+='<text x="'+(mx(s.p.x)+s.dx).toFixed(1)+'" y="'+(my(s.p.y)+s.dy).toFixed(1)+'" font-size="14" font-weight="700" fill="#1552c7" text-anchor="'+s.anchor+'" style="paint-order:stroke;stroke:#f8fafc;stroke-width:3.5px">'+s.txt+'</text>'; });
    shapes.forEach(s=>{ if(s.t==='cap') svg+='<text x="'+(mx(s.p.x)+s.dx).toFixed(1)+'" y="'+(my(s.p.y)+s.dy).toFixed(1)+'" font-size="10" font-weight="600" fill="#a21caf" text-anchor="start" style="paint-order:stroke;stroke:#f8fafc;stroke-width:3px">'+s.txt+'</text>'; });
    svgEl.innerHTML=svg;
  }

  /* ---------- construction: one table ----------
     Top: one sheet. Front and sides: front board folded down, then a return folded inward under the plate.
          Back: борд folded up, or the same board + return when there is no борд.
     Shelves (долна основа, втори междинен плот): board down + return inward on all 4 sides, between the legs.
     Legs: 30×30 tube, welded straight to the folded edges of the top and shelves — no frame rails (царги). */
  function computeTable(t, idx){
    const s = t.legProfile || 30, th = t.thickness || 1.5;
    const g = tableGeo(t, S);
    const E = g.eT, R = g.rT, cT = S.topCut / (g.frame ? 4 : 2), cS = S.shelfCut / (g.frame ? 4 : 2), st = S.stretch;   // рамка: 1 огъване на страна → половината намаление
    const tag = "М" + (idx + 1);
    const rows = [], sheets = [], tubes = [], warns = [], schemes = [];
    const sheetMat = "Лист инокс " + th + " мм", tubeMat = "Тръба " + s + "×" + s;
    // flat width of a folded edge in the blank: board + return (the return comes out longer by `st` when bent),
    // minus half the blank reduction (the reduction is split over both sides)
    const flange = (e, r, c) => e + (r > 0 ? r - st : 0) - c;
    const profTxt = (e, r) => "челна дъска " + e + " мм надолу" + (r > 0 ? " + " + r + " мм навътре" : "");

    const fTop = flange(E, R, cT);
    const hem = t.splashOn ? g.hem : 0, back = t.splashOn ? t.splashH + hem - cT : fTop;
    const hemWhere = g.hemDir === "front" ? "напред (над плота)" : "назад към стената";
    const topW = t.L + 2*fTop, topD = g.Dp + fTop + back;
    rows.push({ kind:"sheet", part:"Работен плот" + (t.splashOn ? " с борд" : ""), mat:sheetMat, size:fmt(topW)+" × "+fmt(topD), qty:1,
      note:"Готов: "+t.L+" × "+fmt(g.Dp)+" мм"+(g.hemIn ? " (обща дълбочина "+t.D+" мм с подгъвката към стената)" : "")+". Отпред и отстрани: "+profTxt(E, R)+"; отзад: "+(t.splashOn ? "борд "+t.splashH+" мм нагоре"+(hem ? " + подгъвка "+hem+" мм "+hemWhere+" (огъване нагоре на "+fmt(back)+" мм и подгъвка на "+hem+" мм от задния ръб на заготовката)" : " (огъване нагоре на "+fmt(back)+" мм от задния ръб на заготовката)") : "същото")+
           ". Изрези в ъглите: отпред "+fmt(fTop)+"×"+fmt(fTop)+", отзад "+fmt(fTop)+"×"+fmt(back)+" мм. Виж схемата." });
    sheets.push({ label:tag+" плот", w:topW, h:topD });
    schemes.push({ title:"Работен плот" + (t.splashOn ? " с борд" : ""), qty:1, plateL:t.L, plateD:g.Dp, E, R,
      backUp:!!t.splashOn, splashH:t.splashH, hem, hemFront:g.hemDir === "front", backFlat:back, leg:0, blankW:topW, blankD:topD, cut:cT * 2 });

    // долните плотове са между краката: очертанието им = външните страни на краката (виж tableGeo)
    const shL = g.shL + 2 * g.shPad, shD = g.shD + 2 * g.shPad;   // рамка: тавата е по-голяма от рамката
    const shelves = [];
    const part6 = g.legs6 ? " (в " + (g.right ? "дясната" : "лявата") + " част — от крайните до средните крака)" : "";
    if(t.baseOn) shelves.push({ name:"Долна основа (плот)" + part6, short:"основа", who:"долната основа", at:t.baseH, E:g.eB, R:g.rB });
    if(t.midOn) shelves.push({ name:"Втори междинен плот" + part6, short:"междинен", who:"втория междинен плот", at:mid2H(t), E:g.eM, R:g.rM });
    if(t.midOn && !t.baseOn) warns.push("Втори междинен плот без долна основа — височината му е сметната спрямо полето за основата.");
    shelves.forEach(sh => {
      sh.f = flange(sh.E, sh.R, cS); sh.W = shL + 2*sh.f; sh.Dd = shD + 2*sh.f;
      rows.push({ kind:"sheet", part:sh.name, mat:sheetMat, size:fmt(sh.W)+" × "+fmt(sh.Dd), qty:1,
        note:"Готов: "+fmt(shL)+" × "+fmt(shD)+" мм. От 4-те страни: "+profTxt(sh.E, sh.R)+". Изрези в ъглите "+fmt(sh.f+s+g.shPad)+"×"+fmt(sh.f+s+g.shPad)+
             " мм (кант + крак "+s+"×"+s+"). Горна повърхност на "+sh.at+" мм от пода. Виж схемата." });
      sheets.push({ label:tag+" "+sh.short, w:sh.W, h:sh.Dd });
    });
    // one fold scheme per different shelf profile
    const groups = [];
    shelves.forEach(sh => { const gr = groups.find(x => x.E === sh.E && x.R === sh.R); if(gr) gr.list.push(sh); else groups.push({ E:sh.E, R:sh.R, W:sh.W, Dd:sh.Dd, list:[sh] }); });
    groups.forEach(gr => schemes.push({ title:gr.list.map(x => x.name).join(" и "), qty:gr.list.length, plateL:shL, plateD:shD,
      E:gr.E, R:gr.R, backUp:false, leg:s, blankW:gr.W, blankD:gr.Dd, cut:cS * 2 }));

    // legs: grouped by length; a shorter leg stands on a block, so the shelves are welded lower on it
    const welded = g.frame ? "царгите на рамката (под работния плот" + (shelves.length ? " и под " + shelves.map(sh => sh.who).join(", ") : "") + ")"
                           : ["работния плот"].concat(shelves.map(sh => sh.who)).join(", ");
    const pos = "Разположение (външни страни): отпред " + fmt(g.front) + " мм от ръба, отляво " + fmt(g.sideL) + " мм, отдясно " + fmt(g.sideR) + " мм, отзад " + fmt(g.back) +
      " мм; между предните и задните крака " + fmt(g.span) + " мм, между левите и десните " + fmt(g.full) + " мм" +
      (g.legs6 ? "; средният чифт: на " + fmt(shL) + " мм от " + (g.right ? "десните" : "левите") + " крака (външно), т.е. лявата му страна е на " + fmt(g.midX) + " мм от левия ръб" : "") + ". ";
    const byLen = [];
    g.legs.forEach((len, i) => { const gr = byLen.find(x => Math.abs(x.len - len) < 0.05); if(gr) gr.names.push(LEG_NAMES[i]); else byLen.push({ len, names:[LEG_NAMES[i]] }); });
    byLen.forEach((gr, j) => {
      const d = g.legAuto - gr.len;
      let note = (j === 0 ? pos : "") + "Височина " + t.H + " − лист " + th + (S.feet ? " − крачета " + S.feet : "") + " мм" +
        (d > 0.05 ? " − " + fmt(d) + " мм (стъпва на подложка " + fmt(d) + " мм)" : "") + ".";
      if(d > 0.05 && shelves.length)
        note += " Горна повърхност на " + shelves.map(sh => sh.who + " на " + fmt(sh.at - d) + " мм").join(", ") + " от долния край на крака.";
      note += g.frame ? " Заварява се към " + welded + "; плотовете се захлупват отгоре като тави." : " Заварява се директно към кантовете на: " + welded + ".";
      rows.push({ kind:"tube", part:"Крак" + (byLen.length > 1 ? " — " + gr.names.join(", ") : ""), mat:tubeMat, size:fmt(gr.len), qty:gr.names.length, note });
      if(d < -0.05) warns.push("Крак " + gr.names.join(", ") + " е по-дълъг от стандартния (" + fmt(g.legAuto) + " мм) — плотът няма да е хоризонтален.");
      if(gr.len <= 0) warns.push("Крак " + gr.names.join(", ") + " е с нулева или отрицателна дължина.");
      shelves.forEach(sh => { if(d > 0.05 && sh.at - d <= 0) warns.push("Крак " + gr.names.join(", ") + " е твърде къс — " + sh.who + " (на " + sh.at + " мм) е под долния му край."); });
    });
    if(g.legs6) rows.push({ kind:"tube", part:"Крак — среден преден и среден заден", mat:tubeMat, size:fmt(g.legAuto), qty:2,
      note:"Височина " + t.H + " − лист " + th + (S.feet ? " − крачета " + S.feet : "") + " мм. Заварява се към кантовете на работния плот" +
        (shelves.length ? " и на " + shelves.map(sh => sh.who).join(", ") + " (те свършват при средните крака)" : "") + "." });
    rows.push({ kind:"hw", part:S.feet ? "Регулируеми крачета" : "Тапи за краката", mat:"Окомплектовка", size:"—", qty:g.nLegs + 2 * g.gnPosts.length,
      note:S.feet ? "Височина "+S.feet+" мм." : "За тръба "+s+"×"+s+"." });
    g.legs.forEach(len => tubes.push({ label:tag+" крак", len }));
    if(g.legs6) [0, 1].forEach(() => tubes.push({ label:tag+" среден крак", len:g.legAuto }));
    if(g.frame){
      const lvTxt = { top:"под работния плот", base:"под долната основа", mid:"под втория междинен плот" };
      const lvTop = { top:t.H - th, base:t.baseH - th, mid:mid2H(t) - th };
      const grp = [];
      g.frameRails.forEach(r => { const name = (r.dir === "x" ? "Царга по дължината (отпред и отзад)" : "Царга по дълбочината (между предния и задния крак)") + " — " + lvTxt[r.lvl];
        const gr = grp.find(x => x.name === name && Math.abs(x.len - r.len) < 0.05); if(gr) gr.qty += r.qty; else grp.push({ name, len:r.len, qty:r.qty, lvl:r.lvl }); });
      rows.splice(rows.findIndex(r => r.kind === "hw"), 0, ...grp.map(gr => ({ kind:"tube", part:gr.name, mat:tubeMat, size:fmt(gr.len), qty:gr.qty,
        note:"Рамка: заварява се между краката, горната страна на " + fmt(lvTop[gr.lvl]) + " мм от пода (под листа), външно на нивото на краката. Тавата се захлупва отгоре." })));
      g.frameRails.forEach(r => { for(let q = 0; q < r.qty; q++) tubes.push({ label:tag + " царга", len:r.len }); });
    }
    if(g.rails){
      const at = "Долният ръб на " + fmt(g.railH) + " мм от пода (горният на " + fmt(g.railH + s) + " мм); " + (g.railFront ? "рамка около стелажа за GN — затворена (отпред, отзад и отстрани)." : "заварява се между краката, в празната част — отпред остава отворено.");
      const segs = []; g.railSegs.forEach(v => { const x = segs.find(z => Math.abs(z.len - v) < 0.05); if(x) x.qty++; else segs.push({ len:v, qty:1 }); });
      rows.splice(rows.findIndex(r => r.kind === "hw"), 0,
        ...segs.map(sg => ({ kind:"tube", part:(g.railFront ? "Профил отпред и отзад" : "Профил отзад") + " (между " + (g.gnPosts.length ? "краката и стойките за GN" : g.legs6 ? "средния и крайния крак" : "краката") + ")", mat:tubeMat, size:fmt(sg.len), qty:sg.qty * (g.railFront ? 2 : 1), note:at })),
        { kind:"tube", part:"Профил отстрани (между предния и задния крак — " + (g.legs6 ? "при средните и крайните крака" : "при левите и десните крака") + (g.gnPosts.length ? " и стойките за GN" : "") + ")", mat:tubeMat, size:fmt(g.railD), qty:g.railXs.length, note:at });
      g.railSegs.forEach(v => { tubes.push({ label:tag+" профил отзад", len:v }); if(g.railFront) tubes.push({ label:tag+" профил отпред", len:v }); }); g.railXs.forEach(() => tubes.push({ label:tag+" профил отстрани", len:g.railD }));
    }
    if(g.gnAngle && g.gnRoom < 530) warns.push("Масата е плитка за GN 1/1 (530 мм): от предния ръб до задните крака има само " + fmt(g.gnRoom) + " мм — тавата ще стърчи пред плота.");
    if(g.gn && !g.gnOk) warns.push(g.legs6 ? "Масата е твърде къса за стелаж за GN (345 мм светло) и долен плот до него — удължете масата."
      : g.gnDirect ? "За GN 1/1 светлото между краката трябва да е 345 мм, а е " + fmt(g.gnB - g.gnA) + " мм — махнете зададеното отстояние на краката отстрани или сменете дължината."
      : "Масата е твърде къса за стелаж за GN със стойки и долен плот до него.");
    if(g.gnAngle){
      const nGap = g.gnGap + " мм светло (GN 1/1 = 530 × 325 мм)";
      rows.splice(rows.findIndex(r => r.kind === "hw"), 0,
        ...(g.gnPosts.length ? [{ kind:"tube", part:"Стойка за GN (предна и задна)", mat:tubeMat, size:fmt(g.legAuto), qty:2,
          note:"Лявата страна на " + fmt(g.gnX) + " мм от левия ръб — " + nGap + " до крайните крака; заварява се към плота" + (g.rails ? " и профилите" : "") + "." }] : []),
        { kind:"tube", part:"Винкел 20×20 за GN — " + g.gnLevels + " нива × 2 страни", mat:"Винкел 20×20", size:fmt(g.gnAngle), qty:2 * g.gnLevels,
          note:"Горната страна на винкелите на " + g.gnZ.map(z => fmt(z)).join(", ") + " мм от пода (стъпка " + g.gnPitch + " мм); заваряват се от вътрешната страна на " +
            (g.gnPosts.length ? "крайните крака и стойките" : "краката") + ", по дълбочината; " + nGap + "." });
      if(g.gnPosts.length) [0, 1].forEach(() => tubes.push({ label:tag + " стойка GN", len:g.legAuto }));
    }

    // checks: nothing that cannot be built goes to the workshop silently
    if(t.L <= 0 || t.D <= 0 || t.H <= 0 || shL <= 0 || shD <= 0 || g.legAuto <= 0)
      warns.push("Размерите са твърде малки за тази конструкция — проверете дължина, дълбочина, височина и отстояния.");
    if(g.back < g.minBack - 0.05)
      warns.push("Задните крака излизат на " + fmt(g.back) + " мм от задния ръб — " + (t.splashOn ? "извън плота" : "по-малко от сгъвката на плота (" + g.rT + " мм)") +
        ". Намалете разстоянието между предните и задните крака (най-много " + fmt(g.Dp - g.front - g.minBack) + " мм).");
    if(!t.splashOn && !(+t.legSpan > 0) && (+t.legBack || 0) < g.rT)
      warns.push("Задните крака са преместени на " + g.rT + " мм от задния ръб — зад сгъвката на плота (" + g.rT + " мм), вместо на " + (+t.legBack || 0) + " мм.");
    if(t.L > 2400) warns.push("Масата е по-дълга от 2,4 м (" + t.L + " мм) — такива маси не правим.");
    if(g.span < 100) warns.push("Разстоянието между предните и задните крака е само " + fmt(g.span) + " мм.");
    [["работния плот", g.rT], ["долната основа", t.baseOn ? g.rB : 0], ["междинния плот", t.midOn ? g.rM : 0]].forEach(([n, r]) => {
      if(r && (r < 12 || r > 30)) warns.push("Сгъвката навътре на " + n + " е " + r + " мм — извън 12–30 мм."); });
    if(t.baseOn && t.baseH - g.eB < 0) warns.push("Кантът на долната основа (" + g.eB + " мм) стига под пода — основата е на " + t.baseH + " мм.");
    if(t.midOn && mid2H(t) - g.eM <= t.baseH) warns.push("Кантът на междинния плот (" + g.eM + " мм) стига до долната основа — проверете височините.");
    const highest = t.midOn ? mid2H(t) : t.baseOn ? t.baseH : 0;
    if(highest && highest >= t.H - th - g.eT) warns.push("Най-горният долен плот (на " + highest + " мм) стига до канта на работния плот (" + g.eT + " мм).");
    if(t.midOn && mid2H(t) <= t.baseH) warns.push("Вторият междинен плот не е над основата — проверете височините.");
    return { rows, sheets, tubes, warns, schemes, geo:g };
  }


  /* ---------- fold diagram: flat blank with bend lines + edge cross-section (schematic, not to scale) ---------- */
  function foldSvg(sc){
    // fold segments in proportion to each other (2 px per mm: 10 → 20, 30 → 60); the plate itself is not to scale
    const segPx = v => Math.max(18, Math.min(90, v * 2));
    const side = sc.R > 0 ? [sc.R, sc.E] : [sc.E];                 // outer edge → plate
    const backSegs = sc.backUp ? (sc.hem ? [sc.hem, sc.splashH] : [sc.splashH]) : side;
    const sp = side.map(segPx), bp = backSegs.map(segPx);
    const fx = sp.reduce((a, b) => a + b, 0), fyB = bp.reduce((a, b) => a + b, 0), fyF = fx;
    const k = Math.min(300 / sc.plateL, 190 / sc.plateD);
    const PW = Math.max(140, sc.plateL * k), PD = Math.max(90, sc.plateD * k);
    const nl = sc.leg ? 12 : 0;
    const X0 = 92, Y0 = 70, BW = 2*fx + PW, BH = fyB + PD + fyF;
    const t = (x, y, s, o) => '<text x="' + x + '" y="' + y + '" ' + (o || '') + '>' + s + '</text>';
    const ln = (x1, y1, x2, y2, st) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" ' + st + '/>';
    const RED = 'stroke="#dc2626" stroke-width="2" stroke-dasharray="7 4"', ORG = 'stroke="#ea580c" stroke-width="2" stroke-dasharray="3 3"',
          GRN = 'stroke="#16a34a" stroke-width="2" stroke-dasharray="7 4"', PUR = 'stroke="#9333ea" stroke-width="2" stroke-dasharray="3 3"', DIM = 'stroke="#475569" stroke-width="1"';
    let g = '';
    // blank outline with corner notches (flange, plus leg for shelves)
    const xa = X0 + fx + nl, xb = X0 + fx + PW - nl, ya = Y0 + fyB + nl, yb = Y0 + fyB + PD - nl;
    const pts = [[xa, Y0], [xb, Y0], [xb, ya], [X0 + BW, ya], [X0 + BW, yb], [xb, yb], [xb, Y0 + BH], [xa, Y0 + BH], [xa, yb], [X0, yb], [X0, ya], [xa, ya]];
    g += '<polygon points="' + pts.map(p => p.join(",")).join(" ") + '" fill="#eef5ff" stroke="#1e3a5f" stroke-width="2"/>';
    // bend lines: last one on each side is plate→board (red), earlier ones are returns (orange); борд bends up (green)
    let c = 0;
    sp.forEach((w, i) => { c += w; const st = i === sp.length - 1 ? RED : ORG;
      g += ln(X0 + c, ya, X0 + c, yb, st) + ln(X0 + BW - c, ya, X0 + BW - c, yb, st);
      g += ln(xa, Y0 + BH - c, xb, Y0 + BH - c, st); });
    c = 0;
    bp.forEach((w, i) => { c += w; const last = i === bp.length - 1, st = sc.backUp ? (last ? GRN : PUR) : (last ? RED : ORG); g += ln(xa, Y0 + c, xb, Y0 + c, st); });
    if(sc.backUp){   // where to bend, measured from the back edge of the blank
      g += t(X0 + BW / 2, Y0 + fyB - 7, "↑ огъване нагоре на " + fmt(sc.backFlat) + " мм от задния ръб", 'text-anchor="middle" font-size="12" font-weight="700" fill="#16a34a"');
      if(sc.hem) g += t(X0 + BW / 2, Y0 + bp[0] - 6, "подгъвка на " + fmt(sc.hem) + " мм от ръба", 'text-anchor="middle" font-size="11" font-weight="700" fill="#9333ea"');
    }
    g += t(X0 + BW / 2, Y0 + fyB + PD / 2 - 6, sc.leg ? "плот" : "работен плот", 'text-anchor="middle" font-size="13" fill="#15223a"');
    g += t(X0 + BW / 2, Y0 + fyB + PD / 2 + 12, fmt(sc.plateL) + " × " + fmt(sc.plateD), 'text-anchor="middle" font-size="15" font-weight="700" fill="#15223a"');
    g += t(X0 + BW / 2, Y0 + fyB + 18 + nl, sc.backUp ? "ОТЗАД (борд)" : "ОТЗАД", 'text-anchor="middle" font-size="11" fill="#64748b"');
    g += t(X0 + BW / 2, Y0 + fyB + PD - 8 - nl, "ОТПРЕД", 'text-anchor="middle" font-size="11" fill="#64748b"');
    // horizontal dimension chain (above) and total
    const hx = [0].concat(sp.map((w, i) => sp.slice(0, i + 1).reduce((a, b) => a + b, 0)));
    const hv = side.concat([sc.plateL], side.slice().reverse());
    const hpos = hx.concat([fx + PW]).concat(sp.slice().reverse().map((w, i) => fx + PW + sp.slice().reverse().slice(0, i + 1).reduce((a, b) => a + b, 0)));
    const yd = Y0 - 16;
    g += ln(X0, yd, X0 + BW, yd, DIM);
    hpos.forEach(x => g += ln(X0 + x, yd - 5, X0 + x, yd + 5, DIM));
    hv.forEach((v, i) => g += t(X0 + (hpos[i] + hpos[i + 1]) / 2, yd - 6, fmt(v), 'text-anchor="middle" font-size="12" font-weight="600" fill="#1552c7"'));
    g += ln(X0, Y0 - 40, X0 + BW, Y0 - 40, DIM) + ln(X0, Y0 - 45, X0, Y0 - 35, DIM) + ln(X0 + BW, Y0 - 45, X0 + BW, Y0 - 35, DIM);
    g += t(X0 + BW / 2, Y0 - 46, "заготовка " + fmt(sc.blankW) + " мм", 'text-anchor="middle" font-size="13" font-weight="700" fill="#15223a"');
    // vertical dimension chain (left): back flange (top), plate, front flange (bottom)
    const vv = backSegs.concat([sc.plateD], side.slice().reverse());
    const vpx = bp.concat([PD], sp.slice().reverse());
    const xd = X0 - 16;
    g += ln(xd, Y0, xd, Y0 + BH, DIM);
    let yy = Y0; g += ln(xd - 5, yy, xd + 5, yy, DIM);
    vv.forEach((v, i) => { const h = vpx[i]; g += t(xd - 6, yy + h / 2 + 4, fmt(v), 'text-anchor="end" font-size="12" font-weight="600" fill="#1552c7"'); yy += h; g += ln(xd - 5, yy, xd + 5, yy, DIM); });
    g += ln(X0 - 74, Y0, X0 - 74, Y0 + BH, DIM);
    g += t(X0 - 80, Y0 + BH / 2, "заготовка " + fmt(sc.blankD) + " мм", 'text-anchor="middle" font-size="13" font-weight="700" fill="#15223a" transform="rotate(-90 ' + (X0 - 80) + ' ' + (Y0 + BH / 2) + ')"');
    if(sc.leg){ const n = fmt((sc.blankW - sc.plateL) / 2 + sc.leg);
      g += t(X0 + 4, Y0 + BH + 18, "изрез в ъглите " + n + " × " + n + " мм (кант + крак " + sc.leg + "×" + sc.leg + ")", 'font-size="12" fill="#475569"'); }
    // cross-section of the edge
    const PX = X0 + BW + 70, PY = Y0 + 40, kp = Math.min(2.4, 80 / Math.max(sc.E, 1));
    const ex = PX + 150, eyB = PY + sc.E * kp, rx = ex - sc.R * kp;
    g += t(PX, Y0 - 16, "Сечение на ръба", 'font-size="14" font-weight="700" fill="#15223a"');
    g += '<path d="M' + PX + ',' + PY + ' L' + ex + ',' + PY + ' L' + ex + ',' + eyB + (sc.R > 0 ? ' L' + rx + ',' + eyB : '') + '" fill="none" stroke="#15223a" stroke-width="4" stroke-linejoin="miter"/>';
    g += t(PX + 4, PY - 8, sc.leg ? "плот" : "работен плот", 'font-size="12" fill="#475569"');
    g += ln(ex + 16, PY, ex + 16, eyB, DIM) + ln(ex + 11, PY, ex + 21, PY, DIM) + ln(ex + 11, eyB, ex + 21, eyB, DIM);
    g += t(ex + 24, (PY + eyB) / 2 + 5, sc.E + " мм", 'font-size="14" font-weight="700" fill="#dc2626"');
    g += t(ex + 24, (PY + eyB) / 2 + 21, "челна дъска", 'font-size="11" fill="#475569"');
    if(sc.R > 0){
      g += ln(rx, eyB + 14, ex, eyB + 14, DIM) + ln(rx, eyB + 9, rx, eyB + 19, DIM) + ln(ex, eyB + 9, ex, eyB + 19, DIM);
      g += t((rx + ex) / 2, eyB + 32, sc.R + " мм навътре", 'text-anchor="middle" font-size="14" font-weight="700" fill="#ea580c"');
    }
    let ly = eyB + 62 + (sc.backUp && sc.hem ? 26 : 0);
    if(sc.backUp){
      const kb = Math.min(1.2, 70 / Math.max(sc.splashH, 1)), bx = PX + 20, by = ly + sc.splashH * kb;
      g += t(PX, ly - (sc.hem ? 30 : 6), "Отзад — борд", 'font-size="12" font-weight="700" fill="#15223a"');
      g += '<path d="M' + (bx + 130) + ',' + by + ' L' + bx + ',' + by + ' L' + bx + ',' + ly + '" fill="none" stroke="#15223a" stroke-width="4"/>';
      g += t(bx + 10, (ly + by) / 2 + 5, sc.splashH + " мм нагоре", 'font-size="14" font-weight="700" fill="#16a34a"');
      if(sc.hem){ const hx = sc.hemFront ? bx + sc.hem * 1.6 : bx - sc.hem * 1.6;
        g += '<path d="M' + bx + ',' + ly + ' L' + hx + ',' + ly + '" fill="none" stroke="#15223a" stroke-width="4"/>';
        g += t(sc.hemFront ? bx + 4 : hx - 6, ly - 9, sc.hem + (sc.hemFront ? " мм напред" : " мм назад"), 'text-anchor="start" font-size="13" font-weight="700" fill="#9333ea"'); }
      ly = by + 26;
    }else{
      g += t(PX, ly, sc.leg ? "Еднакво от 4-те страни." : "Отзад — същото като отпред.", 'font-size="12" fill="#475569"');
      ly += 16;
    }
    // legend
    const LY = Math.max(Y0 + BH + (sc.leg ? 40 : 26), ly + 10);
    const leg = [[RED, "огъване 90° надолу (челна дъска)"]].concat(sc.R > 0 ? [[ORG, "обратно огъване 90° навътре"]] : []).concat(sc.backUp ? [[GRN, "борд — огъване нагоре"]] : []).concat(sc.backUp && sc.hem ? [[PUR, "подгъвка на борда (" + (sc.hemFront ? "напред" : "назад") + ")"]] : []);
    leg.forEach((l, i) => { const lx = 20 + i * 250; g += ln(lx, LY, lx + 34, LY, l[0]) + t(lx + 42, LY + 4, l[1], 'font-size="12" fill="#334155"'); });
    const VW = Math.max(PX + 260, 20 + leg.length * 250), VH = LY + 16;
    return '<figure class="scheme"><svg viewBox="0 0 ' + VW + ' ' + VH + '" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif">' + g + '</svg>' +
      '<figcaption>' + esc(sc.title) + (sc.qty > 1 ? ' — ' + sc.qty + ' бр. еднакви' : '') + ' · заготовка ' + fmt(sc.blankW) + ' × ' + fmt(sc.blankD) + ' мм' +
      (sc.cut ? ' (размерите по веригата са външни, след огъване; заготовката е намалена с ' + fmt(sc.cut) + ' мм заради огъванията)' : '') +
      ' · огъванията са в пропорция, плотът не е в мащаб</figcaption></figure>';
  }

  /* ---------- nesting rectangles on sheets (MaxRects, best short side fit, rotation allowed) ---------- */
  function newSheet(type, kerf){ return { type, W:type.W, H:type.H, free:[{ x:0, y:0, w:type.W + kerf, h:type.H + kerf }], placed:[] }; }
  // mode "ss": best short side fit (tight packing); "bl": keep parts toward the start of the sheet's length,
  // which leaves a clean full-width strip at the end that can be kept as an offcut
  function bestFit(sh, w, h, mode){
    let b = null;
    sh.free.forEach(r => [[w, h, false], [h, w, true]].forEach(([pw, ph, rot]) => {
      if(pw > r.w || ph > r.h) return;
      const sc = mode === "bl" ? r.x + pw : Math.min(r.w - pw, r.h - ph);
      const sc2 = mode === "bl" ? r.y + ph : Math.max(r.w - pw, r.h - ph);
      if(!b || sc < b.sc || (sc === b.sc && sc2 < b.sc2)) b = { x:r.x, y:r.y, w:pw, h:ph, rot, sc, sc2 };
    }));
    return b;
  }
  function placeRect(sh, n){
    const out = [];
    sh.free.forEach(f => {
      if(n.x >= f.x + f.w || n.x + n.w <= f.x || n.y >= f.y + f.h || n.y + n.h <= f.y){ out.push(f); return; }
      if(n.x > f.x) out.push({ x:f.x, y:f.y, w:n.x - f.x, h:f.h });
      if(n.x + n.w < f.x + f.w) out.push({ x:n.x + n.w, y:f.y, w:f.x + f.w - n.x - n.w, h:f.h });
      if(n.y > f.y) out.push({ x:f.x, y:f.y, w:f.w, h:n.y - f.y });
      if(n.y + n.h < f.y + f.h) out.push({ x:f.x, y:n.y + n.h, w:f.w, h:f.y + f.h - n.y - n.h });
    });
    sh.free = out.filter((a, i) => !out.some((b, j) => j !== i &&
      a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h && (j < i || a.w !== b.w || a.h !== b.h || a.x !== b.x || a.y !== b.y)));
  }
  function addPiece(sh, p, pos, kerf){
    placeRect(sh, pos);
    sh.placed.push({ label:p.label, x:pos.x, y:pos.y, w:pos.w - kerf, h:pos.h - kerf, rot:!!p.rot !== pos.rot });
  }

  // stock sheet sizes from the settings (size 0 = not used)
  function sheetTypes(){
    return [[S.sheetW, S.sheetH, S.sheetPrice], [S.sheet2W, S.sheet2H, S.sheet2Price]]
      .filter(([w, h]) => w > 0 && h > 0)
      .map(([w, h, p]) => ({ W:Math.max(w, h), H:Math.min(w, h), price:p || 0, name:Math.max(w, h) + "×" + Math.min(w, h) }))
      .filter((t, i, a) => a.findIndex(x => x.name === t.name) === i);
  }

  /* Offcuts kept after cutting: only a strip with the full width or the full length of the sheet (or offcut)
     it comes from. The full-width strip at the end has priority; a narrower strip than S.offMin is not kept. */
  function leftovers(sh, kerf, min){
    if(!sh.placed.length) return [];
    const maxX = Math.max(...sh.placed.map(p => p.x + p.w)), maxY = Math.max(...sh.placed.map(p => p.y + p.h));
    const rw = Math.floor(sh.W - maxX - kerf), bh = Math.floor(sh.H - maxY - kerf);
    if(rw >= min) return [{ x:sh.W - rw, y:0, w:rw, h:sh.H, full:"width" }];
    if(bh >= min) return [{ x:0, y:sh.H - bh, w:sh.W, h:bh, full:"length" }];
    return [];
  }
  const leftArea = sheets => sheets.reduce((a, sh) => a + leftovers(sh, S.kerf, S.offMin).reduce((b, l) => b + l.w * l.h, 0), 0);

  // parts go onto offcuts from the store first; the smallest offcut that fits is used, so big ones stay for big parts
  function useOffcuts(pieces, offcuts, kerf){
    const pool = offcuts.slice().sort((a, b) => a.w * a.h - b.w * b.h)
      .map(o => newSheet({ W:Math.max(o.w, o.h), H:Math.min(o.w, o.h), price:0, name:o.id, offcut:o }, kerf));
    const rest = [];
    pieces.slice().sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || b.w*b.h - a.w*a.h).forEach(p => {
      const w = p.w + kerf, h = p.h + kerf;
      let target = null, pos = null;
      pool.filter(sh => sh.placed.length).forEach(sh => { const b = bestFit(sh, w, h, "bl"); if(b && (!pos || b.sc < pos.sc)){ pos = b; target = sh; } });
      if(!pos) for(const sh of pool){ if(sh.placed.length) continue; const b = bestFit(sh, w, h, "bl"); if(b){ pos = b; target = sh; break; } }
      if(pos) addPiece(target, p, pos, kerf); else rest.push(p);
    });
    return { used:pool.filter(sh => sh.placed.length), rest };
  }

  /* New sheets: tries every sheet size on its own and a mixed fill, with several piece orders and both placement
     modes, then moves each sheet's pieces onto a cheaper size where they fit, and keeps the cheapest plan
     (ties: fewer sheets, then the larger usable offcut). Cost is the price per sheet when every size has one,
     otherwise the sheet area. */
  function packMulti(pieces, types, kerf){
    const priced = types.length > 0 && types.every(t => t.price > 0);
    const cost = t => priced ? t.price : t.W * t.H / 1e6;
    const fitsT = (p, t) => (p.w <= t.W && p.h <= t.H) || (p.h <= t.W && p.w <= t.H);
    const valid = pieces.filter(p => p.w > 0 && p.h > 0);
    const over = valid.filter(p => !types.some(t => fitsT(p, t)));
    const ok = valid.filter(p => types.some(t => fitsT(p, t)));
    const orders = [
      (a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || b.w*b.h - a.w*a.h,
      (a, b) => b.w*b.h - a.w*a.h,
      (a, b) => Math.min(b.w, b.h) - Math.min(a.w, a.h) || b.w*b.h - a.w*a.h,
      (a, b) => (b.w + b.h) - (a.w + a.h),
    ];
    const plans = [];
    ["ss", "bl"].forEach(mode => {
      function run(list, choose){
        const sheets = [];
        for(let i = 0; i < list.length; i++){
          const p = list[i], w = p.w + kerf, h = p.h + kerf;
          let target = null, pos = null;
          sheets.forEach(sh => { const b = bestFit(sh, w, h, mode); if(b && (!pos || b.sc < pos.sc)){ pos = b; target = sh; } });
          if(!pos){
            const t = choose(list.slice(i));
            if(!t) return null;
            target = newSheet(t, kerf); sheets.push(target); pos = bestFit(target, w, h, mode);
            if(!pos) return null;
          }
          addPiece(target, p, pos, kerf);
        }
        return sheets;
      }
      const only = t => rest => fitsT(rest[0], t) ? t : (types.find(x => fitsT(rest[0], x)) || null);
      // mixed: open the size whose fresh sheet, greedily filled with what is left, costs least per m² of blanks
      const mixed = rest => {
        let best = null;
        types.filter(t => fitsT(rest[0], t)).forEach(t => {
          const sh = newSheet(t, kerf); let area = 0;
          rest.forEach(p => { const b = bestFit(sh, p.w + kerf, p.h + kerf, mode); if(b){ placeRect(sh, b); area += p.w * p.h; } });
          const score = cost(t) / Math.max(area, 1);
          if(!best || score < best.score) best = { t, score };
        });
        return best && best.t;
      };
      function downgrade(sheets){
        sheets.forEach((sh, i) => {
          types.filter(t => cost(t) < cost(sh.type)).sort((a, b) => cost(a) - cost(b)).some(t => {
            const ns = newSheet(t, kerf);
            const ps = sh.placed.slice().sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || b.w*b.h - a.w*a.h);
            for(const p of ps){ const b = bestFit(ns, p.w + kerf, p.h + kerf, mode); if(!b) return false; addPiece(ns, p, b, kerf); }
            sheets[i] = ns; return true;
          });
        });
        return sheets;
      }
      orders.forEach(o => {
        const list = ok.slice().sort(o);
        types.forEach(t => { const r = run(list, only(t)); if(r) plans.push({ sheets:r, only:t.name }); });
        if(types.length > 1){ const r = run(list, mixed); if(r) plans.push({ sheets:downgrade(r), only:null }); }
      });
    });
    plans.forEach(pl => { pl.cost = pl.sheets.reduce((a, sh) => a + cost(sh.type), 0); pl.left = leftArea(pl.sheets); });
    const better = (a, b) => a.cost < b.cost - 1e-9 ||
      (Math.abs(a.cost - b.cost) < 1e-9 && (a.sheets.length < b.sheets.length || (a.sheets.length === b.sheets.length && a.left > b.left)));
    let best = null;
    plans.forEach(pl => { if(!best || better(pl, best)) best = pl; });
    // the best plan using one size only, for the comparison line
    const singles = types.map(t => {
      let b = null;
      plans.filter(pl => pl.only === t.name && pl.sheets.every(sh => sh.type.name === t.name)).forEach(pl => { if(!b || better(pl, b)) b = pl; });
      return b && { name:t.name, n:b.sheets.length, cost:b.cost };
    }).filter(Boolean);
    const sheets = best ? best.sheets.slice().sort((a, b) => b.W * b.H - a.W * a.H) : [];
    return { sheets, over, priced, cost:best ? best.cost : 0, singles };
  }

  /* ---------- cutting tube bars (first fit decreasing) ---------- */
  function packBars(pieces, stock, kerf){
    const bars = [], over = [];
    pieces.slice().sort((a, b) => b.len - a.len).forEach(p => {
      if(p.len <= 0) return;
      if(p.len > stock){ over.push(p); return; }
      let bar = bars.find(b => b.left >= p.len + (b.cuts.length ? kerf : 0));
      if(!bar){ bar = { cuts:[], left:stock }; bars.push(bar); }
      bar.left -= p.len + (bar.cuts.length ? kerf : 0);
      bar.cuts.push(p);
    });
    return { bars, over };
  }

  /* ---------- print view: the workshop document (materials, per-table cut lists and folds, sheets, tubes) ---------- */
  function recompute(){
    if(!order){ CURRENT = null; PRICING = null; return; }
    const o = order;
    const per = o.tables.map((t, i) => computeTable(t, i));
    const parts = (o.parts || []).map((p, i) => Object.assign({ p }, computePart(p, i)));
    (o.assemblies || []).forEach((a, ai) => asmCutParts(a, ai).forEach((p, j) => parts.push(Object.assign({ p, asm:a, ai, first:j === 0 }, computePart(p, 0)))));
    const sheetPieces = [], tubePieces = [];
    let feet = 0;
    per.forEach((r, i) => {
      const q = o.tables[i].qty, tth = o.tables[i].thickness || 1.5;
      feet += 4 * q;
      for(let k = 0; k < q; k++){
        r.sheets.forEach(p => sheetPieces.push(Object.assign({ th:tth }, p, { label: q > 1 ? p.label.replace(/^М(\d+)/, "М$1." + (k + 1)) : p.label })));
        r.tubes.forEach(p => tubePieces.push(Object.assign({}, p)));
      }
    });
    parts.forEach(r => {
      const q = r.p.qty;
      for(let k = 0; k < q; k++) r.sheets.forEach(p => sheetPieces.push(Object.assign({}, p, { label: q > 1 ? p.label + "." + (k + 1) : p.label })));
    });

    const s = 30, types = sheetTypes();
    // offcuts from the store go first; a confirmed order is shown against the store as it was before confirming
    const done = o.cut;
    const stockAll = done ? INV.items.filter(x => !done.added.includes(x.id)).concat(done.used) : INV.items;
    // one nesting per sheet thickness (offcuts of the same thickness; the sheet price is scaled from the 1.5 mm price)
    const ths = [...new Set(sheetPieces.map(p => +p.th || 1.5))].sort((a, b) => a - b);
    if(!ths.length) ths.push(1.5);
    let next = INV.next, k = 0;
    const created = [], allUsed = [], allSheets = [], over = [], groups = [];
    ths.forEach(th => {
      const tt = types.map(t => Object.assign({}, t, { price:(+t.price || 0) * th / 1.5 }));
      const oc = useOffcuts(sheetPieces.filter(p => (+p.th || 1.5) === th), stockAll.filter(x => (+x.th || 1.5) === th), S.kerf);
      const nest = packMulti(oc.rest, tt, S.kerf);
      // usable leftovers of every sheet and offcut, with the serial numbers they get when the cut is confirmed
      oc.used.concat(nest.sheets).forEach(sh => {
        sh.th = th;
        sh.left = leftovers(sh, S.kerf, S.offMin).map(l => {
          const id = done ? (done.added[k++] || "?") : serial(next++);
          const src = sh.type.offcut ? "от фира " + sh.type.offcut.id : "от лист " + sh.W + "×" + sh.H;
          const x = Object.assign({ id, src, th }, l); created.push(x); return x;
        });
      });
      allUsed.push(...oc.used); allSheets.push(...nest.sheets); over.push(...nest.over);
      groups.push({ th, oc, nest, types:tt });
    });
    CURRENT = { used:allUsed.map(sh => sh.type.offcut), created };

    const bars = packBars(tubePieces, S.tubeStock, S.kerf);
    const blankArea = sheetPieces.reduce((a, p) => a + Math.max(0, p.w) * Math.max(0, p.h), 0) / 1e6;
    const tubeM = tubePieces.reduce((a, p) => a + Math.max(0, p.len), 0) / 1000;
    const kgPerM = (s*s - Math.pow(Math.max(0, s - 2*S.tubeWall), 2)) * 0.00793;
    const sheetKg = sheetPieces.reduce((a, p) => a + Math.max(0, p.w) * Math.max(0, p.h) * (+p.th || 1.5), 0) / 1e6 * 7.93, tubeKg = tubeM * kgPerM;
    const nTables = o.tables.reduce((a, t) => a + t.qty, 0), nParts = parts.reduce((a, r) => a + r.p.qty, 0);

    /* ---- price of the order ----
       Cost (себестойност) = materials + labour, from the same formula as the client price:
         materials: each table as if cut from NEW whole sheets (pSheets — the offcut is not taken off), a designer part by
         its area (€/м²), tube by length, leg caps; labour: welds + bends. The cutting plan itself still uses the offcuts.
       Client price = cost × (1 + markupPct) → the profit is always markupPct of the cost.
       The whole sheets to buy are shown apart: what is left of them goes to the offcut store. */
    let matOurs = 0, tubeOurs = 0, weldOurs = 0, bendOurs = 0, capsOurs = 0;
    o.tables.forEach(t => { const pp = priceParts(t), q = t.qty;
      matOurs += pp.mat * q; tubeOurs += pp.tube * q; weldOurs += pp.weld * q; bendOurs += pp.bend * q; capsOurs += pp.caps * q; });
    parts.forEach(r => { matOurs += Math.max(0, r.g.area) / 1e6 * PRICE.sheetM2 * (r.p.th / 1.5) * r.p.qty; bendOurs += r.g.bends * PRICE.bend * r.p.qty; });
    (o.assemblies || []).forEach(a => { weldOurs += asmJoints(a).filter(j => j.on).reduce((s2, j) => s2 + j.cm * (+S.weldPerCm || 0), 0) * a.qty; });
    const costMaterials = matOurs + tubeOurs;
    const costTotal = costMaterials + weldOurs + bendOurs + capsOurs;
    const buySheets = allSheets.reduce((a, sh) => a + (+sh.type.price || 0), 0), buyTube = bars.bars.length * (+S.tubePrice || 0);
    PRICING = { client:orderClientPrice(o), costMaterials, weld:weldOurs, bend:bendOurs, caps:capsOurs, costTotal,
                buy:buySheets + buyTube, buySheets:allSheets.length, buyBars:bars.bars.length };

    // head: who and what
    const cr = fmtDT(o.created);
    let h = '<div class="card"><h2>' + esc(o.serial ? "Поръчка " + orderSerial(o.serial) : "Поръчка — чака потвърждение на разкроя") + '</h2>' +
      '<div class="printsum">Клиент: <b>' + esc(o.name || "—") + '</b> · Телефон: <b>' + esc(o.phone || "—") + '</b>' +
        (promoOf(o.promo) ? ' · Промокод: <b>' + esc(promoOf(o.promo).code) + ' (−' + promoOf(o.promo).pct + '%)</b>' : '') +
        (nTables ? ' · Маси: <b>' + nTables + '</b>' : '') + (nParts ? ' · Детайли: <b>' + nParts + '</b>' : '') +
        (deliveryText(o.delivery) ? '<br>Доставка: <b>' + esc(deliveryText(o.delivery)) + '</b>' : '') + '</div>' +
      '<div class="muted" style="margin-top:4px">' + esc(o.source ? "Файл: " + o.source : "Ръчно въведена поръчка") + (cr ? " · създадена от клиента " + esc(cr) : "") + '</div></div>';

    // the document has two parts for two people: 1) drawings with the sizes (assembly), 2) cutting and bending
    const hHead = h; let hDraw = ''; h = '';
    // materials for the whole order
    const what = [nTables ? nTables + (nTables === 1 ? ' маса' : ' маси') : '', nParts ? nParts + (nParts === 1 ? ' детайл' : ' детайла') : ''].filter(Boolean).join(', ') || 'празна';
    h += '<div class="card summary"><h2>Материали за цялата поръчка (' + what + ')</h2><div class="totals">';
    if(allUsed.length) h += tot("Фира от склада", allUsed.length + " бр.", allUsed.map(sh => sh.type.offcut.id + " (" + lw(sh.type.offcut) + (sh.th !== 1.5 ? ", " + sh.th + " мм" : "") + ")").join(", "));
    groups.forEach(gr => {
      gr.types.forEach(t => {
        const used = gr.nest.sheets.filter(sh => sh.type.name === t.name);
        if(!used.length) return;
        const util = used.reduce((a, sh) => a + sh.placed.reduce((b, p) => b + p.w * p.h, 0), 0) / (used.length * t.W * t.H);
        h += tot("Нови листове " + t.name + " мм, " + gr.th + " мм", used.length + " бр.", "използване " + Math.round(util * 100) + "%" + (gr.th !== 1.5 ? " · цена ≈ " + eur2(t.price) + "/бр. (от цената за 1.5 мм)" : ""));
      });
    });
    if(!allSheets.length) h += tot("Нови листове", "0 бр.", allUsed.length ? "всичко е от фира" : "няма детайли от лист");
    h += tot("Нова фира за склада", created.length + " бр.", created.length ? created.map(c => c.id + " (" + lw(c) + ")").join(", ") : "няма годни остатъци") +
      (tubePieces.length ? tot("Тръба " + s + "×" + s + " (пръти по " + fmt(S.tubeStock / 1000) + " м)", bars.bars.length + " бр.", "общо " + tubeM.toFixed(2) + " м — само крака") +
        tot(S.feet ? "Регулируеми крачета" : "Тапи за краката", feet + " бр.", "по 4 на маса") : '') +
      tot("Тегло (ориентировъчно)", Math.round(sheetKg + tubeKg) + " кг", "лист " + Math.round(sheetKg) + " кг" + (tubeKg ? " + тръба " + Math.round(tubeKg) + " кг" : "")) +
      '</div>';
    groups.forEach(gr => {
      const nest = gr.nest, money = v => nest.priced ? "€ " + v.toFixed(2) : v.toFixed(2) + " м²";
      if(nest.sheets.length && gr.types.length > 1){
        h += '<div class="compare"><b>Нови листове' + (groups.length > 1 ? ' ' + gr.th + ' мм' : '') + ' — ' + (nest.priced ? 'цена' : 'площ') + ':</b> избрано ' + nest.sheets.length + ' бр., ' + money(nest.cost) +
          nest.singles.map(x => ' · само ' + x.name + ': ' + x.n + ' бр., ' + money(x.cost)).join("") +
          (nest.priced ? '' : '<br><span class="muted">Въведете цените на листовете в настройките, за да се сравнява по цена вместо по площ.</span>') + '</div>';
      }
    });
    if(over.length) h += '<div class="warnbox">⚠ Не се събират на нито един лист (нужна е снадка или по-голям лист): ' +
      over.map(p => esc(p.label) + ' ' + fmt(p.w) + '×' + fmt(p.h)).join(", ") + '</div>';
    if(bars.over.length) h += '<div class="warnbox">⚠ По-дълги от прът ' + S.tubeStock + ' мм: ' +
      bars.over.map(p => esc(p.label) + ' ' + fmt(p.len)).join(", ") + '</div>';
    h += '</div>';

    // one card per table: what it is, what to cut, how to fold
    per.forEach((r, i) => {
      const t = o.tables[i], q = t.qty;
      const tv = tableViews(t, true);
      hDraw += '<div class="card tdraw"><h2>Маса ' + (i + 1) + (q > 1 ? ' — ' + q + ' бр. еднакви' : '') + '</h2><div class="printsum">' +
        '<b>' + t.L + ' × ' + t.D + ' × ' + t.H + ' мм</b> · брой: <b>' + q + '</b>' +
        ' · борд: ' + (t.splashOn ? t.splashH + ' мм' + (r.geo.hem ? ' + подгъвка ' + r.geo.hem + ' мм ' + (r.geo.hemDir === 'front' ? 'напред' : 'към стената') +
          (r.geo.hemIn ? ' (в дълбочината; плот ' + fmt(r.geo.Dp) + ' мм)' : r.geo.hemDir === 'legacy' ? ' (извън дълбочината — стара поръчка)' : '') : '') : 'НЕ') +
        ' · задни крака от задния ръб: ' + fmt(r.geo.back) + ' мм' +
        (r.geo.frame ? ' · <b>рамка от профил, плотовете — тави отгоре</b>' : '') +
        ' · челно лице / сгъвка: плот ' + r.geo.eT + ' / ' + r.geo.rT + ' мм' + (t.baseOn ? ', основа ' + r.geo.eB + ' / ' + r.geo.rB + ' мм' : '') +
          (t.midOn ? ', междинен ' + r.geo.eM + ' / ' + r.geo.rM + ' мм' : '') +
        ' · крака: предни–задни ' + fmt(r.geo.span) + ' мм (външно), от ръба отляво ' + fmt(r.geo.sideL) + ' / отдясно ' + fmt(r.geo.sideR) + ' мм' +
          LEG_KEYS.map((k, j) => +t[k] > 0 ? ', ' + LEG_NAMES[j] + ' ' + fmt(r.geo.legs[j]) + ' мм' : '').join('') +
          (r.geo.legs6 ? ' · <b>6 крака</b>: средните на ' + fmt(r.geo.shL) + ' мм от ' + (r.geo.right ? 'десните' : 'левите') + ' (външно)' +
            (r.geo.rails ? ', профили в празната част на ' + fmt(r.geo.railH) + ' мм от пода' : '') +
            '' : '') +
          (r.geo.gnAngle ? ' · <b>стелаж за GN 1/1</b>: ' + r.geo.gnLevels + ' нива през ' + r.geo.gnPitch + ' мм' + (r.geo.gnPosts.length ? ' (със стойки)' : ' (между краката)') : '') +
        ' · долна основа: ' + (t.baseOn ? t.baseH + ' мм от пода' + (r.geo.legs6 ? ', в ' + (r.geo.right ? 'дясната' : 'лявата') + ' част' : '') : 'НЕ') +
        ' · втори междинен плот: ' + (t.midOn ? '≈ ' + mid2H(t) + ' мм от пода' : 'НЕ') +
        (t.notes.trim() ? '<br><b>Бележка:</b> ' + esc(t.notes) : '') + '</div>' +
        r.warns.map(w => '<div class="warnbox">⚠ ' + esc(w) + '</div>').join("") +
        '<div class="drawgrid"><div class="draw3d">' + table3dSvg(t) + '</div><div class="dside">' + tv.side + '</div></div>' +
        '<div class="dfront">' + tv.front + '</div></div>';
      h += '<div class="card tcut"><h2>Маса ' + (i + 1) + ' — разкрой и сгъвки' + (q > 1 ? ' (' + q + ' бр. еднакви)' : '') + '</h2>' +
        '<div class="printsum"><b>' + t.L + ' × ' + t.D + ' × ' + t.H + ' мм</b> · брой: <b>' + q + '</b>' + (r.geo.frame ? ' · рамка от профил, плотовете — тави отгоре' : '') + '</div>' +
        '<h3>Детайли за рязане' + (q > 1 ? ' — за ' + q + ' маси' : '') + '</h3><div class="tw"><table class="cut"><thead><tr>' +
        '<th>Детайл</th><th>Материал</th><th>Размер за рязане (мм)</th><th>Бр.</th></tr></thead><tbody>' +
        r.rows.map(x => '<tr class="' + x.kind + '"><td>' + esc(x.part) + '</td><td>' + esc(x.mat) + '</td><td class="size">' + esc(x.size) +
          '</td><td class="q">' + (x.qty * q) + '</td></tr>').join("") +
        '</tbody></table></div>' +
        '<h3>Схема на огъванията</h3><div class="schemes">' + r.schemes.map(foldSvg).join("") + '</div></div>';
    });

    // one card per designed part: blank, bends from the edge, scheme
    parts.forEach((r, i) => {
      const p = r.p, q = p.qty;
      if(r.first) hDraw += asmCard(r.asm, r.ai);
      h += '<div class="card"><h2>' + esc(r.tag + " · " + p.name) + (q > 1 ? ' — ' + q + ' бр.' : '') + '</h2><div class="printsum">' +
        '<b>дъно ' + fmt(p.L) + ' × ' + fmt(p.W) + ' мм</b> · лист ' + p.th + ' мм · брой: <b>' + q + '</b> · огъвания: ' + r.g.bends + ' · тегло ≈ ' + r.g.kg.toFixed(1) + ' кг/бр.' +
        (p.notes.trim() ? '<br><b>Бележка:</b> ' + esc(p.notes) : '') + '</div>' +
        r.warns.map(w => '<div class="warnbox">⚠ ' + esc(w) + '</div>').join("") +
        '<h3>Детайл за рязане' + (q > 1 ? ' — ' + q + ' бр.' : '') + '</h3><div class="tw"><table class="cut"><thead><tr>' +
        '<th>Детайл</th><th>Материал</th><th>Размер за рязане (мм)</th><th>Бр.</th></tr></thead><tbody>' +
        r.rows.map(x => '<tr class="' + x.kind + '"><td>' + esc(x.part) + '</td><td>' + esc(x.mat) + '</td><td class="size">' + esc(x.size) +
          '</td><td class="q">' + (x.qty * q) + '</td></tr>').join("") + '</tbody></table></div>' +
        (r.bendRows.length ? '<h3>Огъвания — линии от ръба на заготовката (мм)</h3><div class="tw"><table class="cut bends"><thead><tr><th>Страна</th><th>Профил (външни размери)</th><th>Линии на огъване от ръба</th></tr></thead><tbody>' +
          r.bendRows.map(b => '<tr><td>' + esc(b.side) + '</td><td>' + esc(b.profile) + '</td><td class="size">' + esc(b.lines) + '</td></tr>').join("") + '</tbody></table></div>' : '') +
        '<h3>Схема</h3><div class="schemes">' + partSvg(p, r.g) + '</div></div>';
    });

    if(allUsed.length || allSheets.length){
      const thTxt = sh => sh.th !== 1.5 ? " · " + sh.th + " мм" : "";
      h += '<div class="card sheetscard"><h2>Разкрой на листовете</h2><div class="muted">Ориентировъчно разположение на заготовките (с ' + S.kerf +
        ' мм за рязане между тях). ↻ = завъртяна. Зелено = нова фира за склада.</div><div class="sheets" style="margin-top:10px">' +
        allUsed.map(sh => sheetSvg(sh, "Фира " + sh.type.offcut.id + thTxt(sh))).join("") +
        allSheets.map((sh, i) => sheetSvg(sh, "Лист " + (i + 1) + thTxt(sh))).join("") + '</div></div>';
    }
    if(bars.bars.length){
      h += '<div class="card"><h2>Рязане на тръбите</h2><div class="muted">Пръти по ' + S.tubeStock + ' мм, ' + S.kerf + ' мм загуба на рез.</div>' +
        bars.bars.map((b, i) => '<div class="bar"><div class="lbl">Прът ' + (i + 1) + ': ' +
          b.cuts.map(c => fmt(c.len)).join(" + ") + ' · остатък ' + fmt(b.left) + ' мм</div><div class="track">' +
          b.cuts.map(c => '<div class="seg" style="flex:0 0 ' + (c.len / S.tubeStock * 100) + '%" title="' + esc(c.label + ' ' + fmt(c.len)) + '">' + fmt(c.len) + '</div>').join("") +
          '</div></div>').join("") + '</div>';
    }
    $("printView").innerHTML = hHead +
      (hDraw ? '<div class="docpart"><h2 class="parthead">1. Чертежи с размерите — за сглобяване</h2>' + hDraw + '</div>' : '') +
      '<div class="docpart docpart2"><h2 class="parthead">' + (hDraw ? '2. ' : '') + 'Разкрой и сгъвки — за рязане и огъване</h2>' + h + '</div>';
    renderBar();
  }
  // the 3D drawing of a table as SVG text (the print view has no live <svg> per table)
  function table3dSvg(t){
    const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    el.setAttribute("viewBox", "0 0 560 420"); el.setAttribute("class", "draw"); el.setAttribute("font-family", "-apple-system,Segoe UI,Roboto,Arial,sans-serif");
    drawBlueprint(Object.assign({}, t, { mid2H:mid2H(t) }), el, S);
    return el.outerHTML;
  }
  function tot(k, v, d){ return '<div class="tot"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div><div class="d">' + esc(d) + '</div></div>'; }
  function sheetSvg(sh, title){
    const W = sh.W, H = sh.H;
    const used = sh.placed.reduce((a, p) => a + p.w * p.h, 0) / (W * H) * 100;
    const box = (x, y, w, h, name, sub, fill, stroke, dash, color) => {
      const turn = h > w * 1.6, bw = turn ? h : w, bh = turn ? w : h;
      // as large as the piece allows, but the label must stay inside it
      const fs = Math.min(Math.max(45, Math.min(bw, bh) / 4), 100, bw * 0.85 / (0.68 * Math.max(name.length, 6)), bh / 2.6);
      const cx = x + w / 2, cy = y + h / 2, rot = turn ? ' transform="rotate(-90 ' + cx + ' ' + cy + ')"' : '';
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="5"' + (dash ? ' stroke-dasharray="24 12"' : '') + '/>' +
        '<g' + rot + '><text x="' + cx + '" y="' + (cy - fs * 0.15) + '" font-size="' + fs + '" font-weight="700" fill="' + color + '" text-anchor="middle">' + esc(name) + '</text>' +
        '<text x="' + cx + '" y="' + (cy + fs * 1.05) + '" font-size="' + (fs * 0.8) + '" fill="' + color + '" text-anchor="middle">' + esc(sub) + '</text></g>';
    };
    const g = sh.placed.map(p => box(p.x, p.y, p.w, p.h, p.label + (p.rot ? " ↻" : ""), fmt(p.w) + "×" + fmt(p.h), "#dbeafe", "#1E6FF4", false, "#15223a")).join("") +
      (sh.left || []).map(l => box(l.x, l.y, l.w, l.h, l.id, lw(l), "url(#offc)", "#16a34a", true, "#14532d")).join("");
    const left = (sh.left || []).map(l => l.id + " " + lw(l)).join(", ");
    return '<div class="sheet"><svg viewBox="-10 -10 ' + (W + 20) + ' ' + (H + 20) + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><pattern id="offc" patternUnits="userSpaceOnUse" width="48" height="48" patternTransform="rotate(45)"><rect width="48" height="48" fill="#ecfdf5"/><rect width="16" height="48" fill="#bbf7d0"/></pattern></defs>' +
      '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#fff" stroke="#64748b" stroke-width="6"/>' + g + '</svg>' +
      '<div class="cap"><b>' + esc(title) + ' · ' + W + '×' + H + ' мм</b> · ' + sh.placed.length + (sh.placed.length === 1 ? ' заготовка' : ' заготовки') +
      ' · използване ' + Math.round(used) + '%' + (left ? ' · <span class="offtxt">нова фира: ' + esc(left) + '</span>' : '') + '</div></div>';
  }

  /* ---------- offcut store: kept in this browser, with export / import as backup ---------- */
  const INV_KEY = "mpr-admin-offcuts-v1";
  const serial = n => "Ф-" + String(n).padStart(4, "0");
  const lw = o => Math.max(o.w, o.h) + "×" + Math.min(o.w, o.h);   // offcut size as length × width
  let INV = loadInv(), CURRENT = null;
  function loadInv(){
    try{
      const d = JSON.parse(localStorage.getItem(INV_KEY) || "null");
      if(d && Array.isArray(d.items)) return { next:Math.max(1, +d.next || 1), items:d.items, done:d.done || {} };
    }catch(e){}
    return { next:1, items:[], done:{} };
  }
  function saveInv(){
    try{ localStorage.setItem(INV_KEY, JSON.stringify(INV)); cloudDirty(); return true; }
    catch(e){ stockMsg("⚠ Браузърът не позволява запазване — складът ще се загуби при затваряне. Свалете резервно копие.", "bad"); return false; }
  }
  function stockMsg(m, kind){ $("stockStatus").className = "status " + (kind || ""); $("stockStatus").textContent = m; }
  function renderStock(){
    const items = INV.items.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
    $("stockList").innerHTML = items.length
      ? '<div class="tw"><table class="cut stock"><thead><tr><th>№</th><th>Размер (мм)</th><th>Лист</th><th>Произход</th><th>Добавена</th><th></th></tr></thead><tbody>' +
        items.map(o => '<tr><td class="size">' + esc(o.id) + '</td><td class="size">' + esc(lw(o)).replace('×', ' × ') + '</td><td>' + esc(o.th || 1.5) + ' мм</td><td>' +
          esc(o.from || "") + '</td><td>' + esc(o.added ? new Date(o.added).toLocaleDateString("bg-BG") : "") +
          '</td><td><button class="btn danger" data-del="' + esc(o.id) + '" type="button">Премахни</button></td></tr>').join("") +
        '</tbody></table></div><div class="muted" style="margin-top:6px">' + items.length + (items.length === 1 ? ' парче' : ' парчета') +
        ' · ' + (items.reduce((a, o) => a + o.w * o.h, 0) / 1e6).toFixed(2) + ' м² · следващ номер ' + serial(INV.next) + '</div>'
      : '<div class="empty">Складът е празен. Фирата се добавя, когато потвърдите разкроя на поръчка, или ръчно отдолу.</div>';
    $("stockList").querySelectorAll("[data-del]").forEach(btn => btn.addEventListener("click", () => {
      if(btn.dataset.armed !== "1"){ btn.dataset.armed = "1"; btn.textContent = "Сигурно? Натисни пак"; return; }
      INV.items = INV.items.filter(o => o.id !== btn.dataset.del);
      saveInv(); renderStock(); recompute(); stockMsg("Премахната: " + btn.dataset.del + ".", "");
    }));
  }
  $("addOff").addEventListener("click", async () => {
    const a = Math.round(+$("addW").value || 0), b = Math.round(+$("addH").value || 0);
    if(a <= 0 || b <= 0){ stockMsg("Въведете дължина и ширина на парчето.", "warn"); return; }
    let n;
    try{ n = await takeSerials("offcut", 1); }
    catch(e){ stockMsg((e.offline ? "Няма връзка с облака" : "Грешка") + " — парчето не е добавено. Опитайте пак.", "bad"); return; }
    const id = serial(n), w = Math.max(a, b), h = Math.min(a, b);
    INV.items.push({ id, w, h, th:1.5, from:$("addNote").value.trim() || "добавена ръчно", added:new Date().toISOString() });
    saveInv(); renderStock(); recompute();
    $("addW").value = ""; $("addH").value = ""; $("addNote").value = "";
    stockMsg("✓ Добавена " + id + " (" + w + " × " + h + " мм). Напишете номера върху парчето.", "ok");
  });
  $("exportOff").addEventListener("click", () => {
    const data = { kind:"mpr-offcuts", v:1, saved:new Date().toISOString(), next:INV.next, items:INV.items, done:INV.done };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type:"application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "fira-sklad-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
    stockMsg("⬇ Резервното копие е свалено.", "ok");
  });
  $("importOff").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", async () => {
    const f = $("importFile").files[0]; $("importFile").value = "";
    if(!f) return;
    try{
      const d = JSON.parse(await f.text());
      if(!d || !Array.isArray(d.items)) throw new Error("bad");
      let n = 0;
      d.items.forEach(o => { if(o && o.id && +o.w > 0 && +o.h > 0 && !INV.items.some(x => x.id === o.id)){ INV.items.push(o); n++; } });
      Object.assign(INV.done, d.done || {});
      // pieces either copy says were cut stay out of the store
      const cut = new Set(Object.values(INV.done).flatMap(x => (x.used || []).map(u => u.id))
        .concat(ORD.orders.flatMap(o => o.cut ? o.cut.used.map(u => u.id) : [])));
      INV.items = INV.items.filter(o => !cut.has(o.id));
      const top = Math.max(0, ...INV.items.map(o => +String(o.id).replace(/\D/g, "") || 0));
      INV.next = Math.max(INV.next, +d.next || 1, top + 1);
      saveInv(); renderStock(); recompute();
      stockMsg("✓ Заредено копие: " + n + " нови парчета (общо " + INV.items.length + ").", "ok");
    }catch(e){ stockMsg("✕ Файлът не е резервно копие на склада.", "bad"); }
  });

  // IndexedDB document store (one PDF per order id)
  const DB_NAME="mpr-admin", DB_STORE="docs";
  function idb(){ return new Promise((res,rej)=>{ let r; try{ r=indexedDB.open(DB_NAME,1); }catch(e){ return rej(e); }
    r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains(DB_STORE)) r.result.createObjectStore(DB_STORE); };
    r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
  async function docPut(id,blob,name){ const db=await idb(); return new Promise((res,rej)=>{ const tx=db.transaction(DB_STORE,"readwrite"); tx.objectStore(DB_STORE).put({blob,name},id); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }
  async function docGet(id){ const db=await idb(); return new Promise((res,rej)=>{ const tx=db.transaction(DB_STORE,"readonly"); const rq=tx.objectStore(DB_STORE).get(id); rq.onsuccess=()=>res(rq.result||null); rq.onerror=()=>rej(rq.error); }); }
  async function docDel(id){ const db=await idb(); return new Promise((res,rej)=>{ const tx=db.transaction(DB_STORE,"readwrite"); tx.objectStore(DB_STORE).delete(id); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }
  function blobToB64(blob){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(",")[1]); r.onerror=rej; r.readAsDataURL(blob); }); }
  function b64ToBlob(b64,type){ const bin=atob(b64), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return new Blob([u],{type:type||"application/pdf"}); }

  async function openDoc(id, onMsg){
    const msg = onMsg || archMsg;
    try{ const d = await getDoc(id); if(!d){ msg(CLOUD ? "Документът не е намерен — може още да не е качен от устройството, на което е зареден." : "Документът липсва на това устройство."); return; }
      const url = URL.createObjectURL(d.blob); const a = document.createElement("a"); a.href = url; a.download = d.name || ("poruchka-" + id + ".pdf");
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    }catch(e){ msg("Грешка при отваряне на документа."); }
  }

  /* ---------- bottom bar: prices + the buttons that move the order on ---------- */
  function renderBar(){
    const el = $("bottomBar");
    if(!order){ el.innerHTML = ""; return; }
    const o = order, P = PRICING || {}, proc = o.stage === "processing";
    const diff = P.client != null && P.costTotal != null ? P.client - P.costTotal : null;
    let h = '<h2>' + (proc ? 'Цена, доставка и архивиране' : 'Цена и потвърждение') + '</h2>' +
      '<div class="pricebox procbox">' +
        '<div class="big"><span>Цена за клиента</span><b>' + esc(eur2(P.client)) + '</b></div>' +
        (promoOf(o.promo) ? '<div><span>Отстъпка ' + promoOf(o.promo).pct + '% (промокод ' + esc(promoOf(o.promo).code) + ') — включена</span><b>' + esc(eur2(P.client - orderGross(o))) + '</b></div>' : '') +
        '<div><span>Материали (маси: цели нови листове · детайли: по площ · тръба)</span><b>' + esc(eur2(P.costMaterials)) + '</b></div>' +
        '<div><span>Тапички на краката</span><b>' + esc(eur2(P.caps)) + '</b></div>' +
        '<div><span>Труд: заварки</span><b>' + esc(eur2(P.weld)) + '</b></div>' +
        '<div><span>Труд: огъвания</span><b>' + esc(eur2(P.bend)) + '</b></div>' +
        '<div><span>Себестойност общо</span><b>' + esc(eur2(P.costTotal)) + '</b></div>' +
        '<div><span>Печалба (' + PRICE.markupPct + '% надценка)</span><b class="' + (diff != null && diff < 0 ? 'neg' : 'pos') + '">' + esc(eur2(diff)) + '</b></div>' +
      '</div>' +
      (P.buy != null ? '<div class="muted" style="margin-top:6px">За купуване: ' + P.buySheets + (P.buySheets === 1 ? ' нов лист' : ' нови листа') +
        (P.buyBars ? ' + ' + P.buyBars + (P.buyBars === 1 ? ' прът' : ' пръта') + ' тръба' : '') + ' = <b>' + esc(eur2(P.buy)) + '</b> (цели листове — остатъкът им отива във фирата; не е себестойност на поръчката).</div>' : '');
    if(!proc){
      const c = CURRENT || { used:[], created:[] };
      h += '<div class="muted" style="margin-top:10px">При потвърждение поръчката получава <b>' + esc(orderSerial(o.serial || ORD.next)) + '</b> и отива в „В обработка“. ' +
        'От склада се взема фира: <b>' + esc(idsTxt(c.used.map(x => x.id))) + '</b> · добавя се нова фира: <b>' + esc(idsTxt(c.created.map(x => x.id))) +
        '</b>. Номерата на новата фира са тези от чертежа — напишете ги върху парчетата.</div>' +
        (o.delivery && o.delivery.type === "pickup" ? '' : econtBlock(o)) +
        '<div class="actions">' +
          '<button class="btn" id="bPrint" type="button">Печат</button>' +
          '<button class="btn cancel" id="bCancel" type="button">✕ Откажи поръчката</button>' +
          '<button class="btn primary big" id="bConfirm" type="button">✓ Потвърди разкроя</button>' +
        '</div>';
    }else{
      const d = o.cut;
      h += (d ? '<div class="donebox" style="margin-top:10px">✓ Разкроят е потвърден на ' + esc(fmtDT(d.at)) + '. Взета от склада: ' +
          esc(idsTxt(d.used.map(u => u.id))) + ' · добавена: ' + esc(idsTxt(d.added)) + '.</div>' : '') +
        '<div class="grid" style="margin-top:12px">' +
          '<label>Продажна цена <span class="u">(€)</span><input type="number" min="0" step="0.01" id="b-price" value="' + esc(o.price != null ? o.price : "") + '" placeholder="колко е продадена"></label>' +
          '<label>Място на доставка<input type="text" id="b-place" value="' + esc(o.place || "") + '" placeholder="адрес или обект"></label>' +
          '<label>Дата на доставка<input type="date" id="b-ddate" value="' + esc(o.deliveryDate || "") + '"></label>' +
        '</div>' + econtPanel(o) +
        '<div class="actions">' +
          '<button class="btn" id="bPrint" type="button">Печат</button>' +
          '<button class="btn" id="bBack" type="button">↶ Върни в Разкрой</button>' +
          '<button class="btn primary big" id="bArchive" type="button">Архивирай</button>' +
        '</div>';
    }
    h += '<div class="status" id="barStatus"></div>';
    el.innerHTML = h;
    if(!(o.delivery && o.delivery.type === "pickup")) autoQuote(o);
    $("bPrint").addEventListener("click", () => window.print());
    if(!proc){
      $("bConfirm").addEventListener("click", confirmOrder);
      const bc = $("bCancel");
      bc.addEventListener("click", () => {
        if(bc.dataset.armed !== "1"){ bc.dataset.armed = "1"; bc.textContent = "Сигурно? Поръчката ще бъде изтрита — натисни пак"; return; }
        cancelOrder();
      });
    }else{
      $("b-price").addEventListener("input", e => { const v = e.target.value.trim(); o.price = v === "" ? null : +v; saveSoon(); renderLists(); });
      $("b-place").addEventListener("input", e => { o.place = e.target.value; saveSoon(); renderLists(); });
      $("b-ddate").addEventListener("input", e => { o.deliveryDate = e.target.value; saveSoon(); renderLists(); });
      // delivery fields in the Econt panel: saved while typing, the panel is redrawn when a field is left
      const dl = document.querySelector(".dlvEdit");
      if(dl) dl.addEventListener("focusout", e => { if(e.relatedTarget && dl.contains(e.relatedTarget)) return;
        setTimeout(() => { const f = document.activeElement; if(f && f.closest && f.closest(".dlvEdit")) return; const y = window.scrollY; renderBar(); window.scrollTo(0, y); }, 0); });
      [["b-dlvType","type"],["b-dlvCity","city"],["b-dlvAddr","address"]].forEach(([id, k]) => {
        const el = $(id); if(!el) return;
        el.addEventListener("input", e => {
          o.delivery = normDelivery(Object.assign({ type:"address" }, o.delivery, { [k]:e.target.value }));
          if(!o.place || o.place === o._autoPlace){ o.place = o._autoPlace = deliveryText(o.delivery); const pl = $("b-place"); if(pl) pl.value = o.place; }
          saveSoon(); renderLists(); renderHead();
        });
        // redraw (labels, copy rows) only once the delivery fields are left — not while moving between them
        el.addEventListener("change", () => setTimeout(() => {
          const f = document.activeElement;
          if(f && f.closest && f.closest(".dlvEdit")) return;
          const y = window.scrollY; renderBar(); window.scrollTo(0, y);
        }, 0));
      });
      const wb = $("b-waybill");
      if(wb) wb.addEventListener("input", e => { o.waybill = e.target.value.replace(/\s+/g, ""); saveSoon(); renderLists();
        const tr = $("b-track"); if(tr){ tr.hidden = !o.waybill; tr.href = trackUrl(o.waybill); } });
      $("bBack").addEventListener("click", backToWork);
      $("bArchive").addEventListener("click", archiveOrder);
    }
  }
  /* ---------- доставка с Еконт (без договор): готови данни за формата на econt.com ----------
     Без договор Еконт не дава API, затова админът подготвя всичко за формата „Изпрати пратка“
     на сайта им (копиране с един клик), а номерът на товарителницата се пази към поръчката. */
  const ECONT_URL = "https://www.econt.com/services/shipment-create";
  const trackUrl = n => "https://www.econt.com/services/track-shipment/" + encodeURIComponent(n || "");
  // one package per table: outside size (cm, rounded up) and weight of the finished table (kg)
  function shipInfo(o){
    const s = 30, kgPerM = (s*s - Math.pow(Math.max(0, s - 2*S.tubeWall), 2)) * 0.00793;
    return o.tables.map((t, i) => {
      const r = computeTable(t, i);
      const kg = r.sheets.reduce((a, p) => a + Math.max(0, p.w) * Math.max(0, p.h), 0) / 1e6 * (t.thickness || 1.5) * 7.93 +
                 r.tubes.reduce((a, p) => a + Math.max(0, p.len), 0) / 1000 * kgPerM;
      const hTop = t.H + (t.splashOn ? (+t.splashH || 0) : 0);
      return { i, qty:t.qty, L:Math.ceil(t.L / 10), D:Math.ceil(t.D / 10), H:Math.ceil(hTop / 10), kg:Math.ceil(kg) };
    });
  }
  function econtPanel(o){
    const d = o.delivery || null;
    if(d && d.type === "pickup") return '<div class="econt"><h3>Доставка</h3><div class="muted">Клиентът ще вземе поръчката от вас — не е нужна товарителница.</div></div>';
    const pk = shipInfo(o), n = pk.reduce((a, p) => a + p.qty, 0), kg = pk.reduce((a, p) => a + p.kg * p.qty, 0);
    const sender = [S.senderName, S.senderPhone, S.senderCity, S.senderAddr];
    const rows = [
      ["Изпращач", S.senderName], ["Телефон на изпращача", S.senderPhone], ["Населено място (изпращач)", S.senderCity], ["Адрес на изпращача", S.senderAddr],
      ["Получател", o.name], ["Телефон на получателя", o.phone],
      ["Доставка", d ? (d.type === "office" ? "до офис на Еконт" : "до адрес") : ""],
      ["Населено място (получател)", d ? d.city : ""], [d && d.type === "office" ? "Офис на Еконт" : "Адрес на получателя", d ? d.address : (o.place || "")],
      ["Брой пакети", String(n)], ["Общо тегло (кг)", String(kg)],
      ["Съдържание", "Маса от неръждаема стомана (инокс)" + (n > 1 ? " — " + n + " бр." : "")],
      ["Плаща доставката", "Получателят"],
    ];
    const all = rows.filter(r => r[1]).map(r => r[0] + ": " + r[1]).concat(
      pk.map(p => "Пакет — маса " + (p.i + 1) + (p.qty > 1 ? " (" + p.qty + " бр.)" : "") + ": " + p.L + " × " + p.D + " × " + p.H + " см, ≈ " + p.kg + " кг" + (p.qty > 1 ? " всеки" : ""))).join("\n");
    const cp = (v) => v ? '<button class="btn small" type="button" data-copy="' + esc(v) + '">Копирай</button>' : '<span class="muted">—</span>';
    return '<div class="econt"><h3>Доставка с Еконт</h3>' +
      (sender.some(x => !String(x || "").trim()) ? '<div class="warnbox">Попълнете данните на изпращача веднъж в Настройки → „Изпращач за Еконт“.</div>' : '') +
      // the recipient's delivery: editable here too (old orders have none; it does not change the cut)
      '<div class="grid dlvEdit">' +
        '<label>Доставка<select id="b-dlvType">' + ["address","office"].map(k => '<option value="' + k + '"' + ((d ? d.type : "address") === k ? " selected" : "") + '>' + DLV[k] + '</option>').join("") + '</select></label>' +
        '<label>Населено място (получател)<input type="text" id="b-dlvCity" value="' + esc(d ? d.city : "") + '" placeholder="напр. Пловдив"></label>' +
        '<label>' + (d && d.type === "office" ? "Офис на Еконт" : "Адрес на получателя") + '<input type="text" id="b-dlvAddr" value="' + esc(d ? d.address : "") + '" placeholder="' + (d && d.type === "office" ? "кой офис" : "улица, №") + '"></label>' +
      '</div>' +
      (!(d && d.city) ? '<div class="note">' + (d ? 'Попълнете населеното място на получателя.' : 'Поръчката е от стара форма без адрес за доставка — попълнете населеното място и адреса тук.') +
        (o.place ? ' Записано място на доставка: „' + esc(o.place) + '“.' : '') + '</div>' : '') +
      '<div class="tw"><table class="cut econtTbl"><tbody>' +
        rows.map(r => '<tr><td>' + esc(r[0]) + '</td><td><b>' + esc(r[1] || "") + '</b></td><td>' + cp(r[1]) + '</td></tr>').join("") +
        pk.map(p => { const v = p.L + " × " + p.D + " × " + p.H + " см, ≈ " + p.kg + " кг";
          return '<tr><td>Пакет — маса ' + (p.i + 1) + (p.qty > 1 ? ' (' + p.qty + ' бр.)' : '') + '</td><td><b>' + esc(v) + '</b>' + (p.qty > 1 ? ' <span class="muted">всеки</span>' : '') +
            '<div class="muted">Д × Ш × В: ' + p.L + ' / ' + p.D + ' / ' + p.H + ' см · тегло ' + p.kg + ' кг</div></td><td>' + cp(v) + '</td></tr>'; }).join("") +
      '</tbody></table></div>' +
      '<div class="muted" style="margin-top:6px">Размерът е на сглобената маса (с борда); теглото е ориентировъчно — по разкроя.</div>' +
      '<div class="row">' +
        '<button class="btn" type="button" data-copy="' + esc(all) + '">Копирай всичко</button>' +
        '<a class="btn primary" href="' + ECONT_URL + '" target="_blank" rel="noopener noreferrer">Отвори Еконт → нова пратка</a>' +
      '</div>' +
      econtBlock(o) +
      '<div class="grid" style="margin-top:10px"><label>Номер на товарителницата<input type="text" id="b-waybill" value="' + esc(o.waybill || "") + '" placeholder="след като я създадете в Еконт"></label>' +
        '<div style="align-self:end"><a class="btn" id="b-track" href="' + trackUrl(o.waybill) + '" target="_blank" rel="noopener noreferrer"' + (o.waybill ? '' : ' hidden') + '>Проследи пратката</a></div></div>' +
      '</div>';
  }
  // the shipment as Econt's API wants it (for the price only)
  function econtLabel(o){
    const d = o.delivery || {}, pk = shipInfo(o);
    const n = pk.reduce((a, p) => a + p.qty, 0), kg = pk.reduce((a, p) => a + p.kg * p.qty, 0);
    const big = pk.reduce((m, p) => p.L * p.D * p.H > m.L * m.D * m.H ? p : m, pk[0] || { L:0, D:0, H:0 });
    const where = (city, street) => ({ city:{ country:{ code3:"BGR" }, name:String(city || "").trim() }, street:String(street || "").trim() });
    return {
      senderClient:{ name:S.senderName || "", phones:[S.senderPhone || ""] },
      senderAddress:where(S.senderCity, S.senderAddr),
      // the price does not depend on the phone; Econt wants one, so the sender's is used if the customer gave none
      receiverClient:{ name:o.name || "Клиент", phones:[o.phone || S.senderPhone || ""] },
      receiverAddress:where(d.city || "", d.type === "office" ? "" : (d.address || "")),
      packCount:n, shipmentType:"PACK", weight:kg,
      shipmentDimensionsL:big.L, shipmentDimensionsW:big.D, shipmentDimensionsH:big.H,
      shipmentDescription:"Маса от неръждаема стомана (инокс)",
      paymentReceiverMethod:"cash",
    };
  }
  /* the delivery price: Econt's tariff from the test account (until the own e-Econt login works) or the own login
     (Настройки → Изпращач за Еконт). It is asked once per address/size and kept with the order. */
  // Econt price calculator: switched off for now (set to true to bring it back — the function in Supabase stays)
  const ECONT_API = false;
  const econtDemo = () => S.econtMode !== "own";
  // what the price depends on (not the names): when this changes, the price is asked again
  function quoteKey(o){ const L = econtLabel(o); return hsh([L.senderAddress, L.receiverAddress, L.packCount, L.weight, L.shipmentDimensionsL, L.shipmentDimensionsW, L.shipmentDimensionsH, econtDemo()]); }
  function quoteTxt(o){
    const q = o.shipQuote;
    if(!q) return '<span class="muted">още не е изчислена</span>';
    const stale = q.key !== quoteKey(o);
    return '<b>≈ ' + esc(eur2(+q.price)) + '</b> <span class="muted">· плаща получателят · ' + (q.demo ? 'тарифа на Еконт (тестов профил)' : 'моят профил в Еконт') + ' · ' + esc(fmtDT(q.at)) +
      (stale ? ' · <b>адресът или размерите са променени — изчислете наново</b>' : '') + '</span>';
  }
  function econtBlock(o){
    if(!CLOUD || !ECONT_API) return '';
    return '<div class="econtCalc"><div><b>Доставка (Еконт):</b> <span id="econtQuote">' + quoteTxt(o) + '</span> ' +
      '<button class="btn small" type="button" id="b-econtCalc">' + (o.shipQuote ? 'Изчисли наново' : 'Изчисли') + '</button></div><div id="econtOut"></div></div>';
  }
  // ask by itself when the order has a town and there is no (current) price — once the user stops typing
  var QUOTING = new Set(), quoteTimer = null;
  function autoQuote(o){
    if(!ECONT_API || !CLOUD || !cloudReady || !o || !(o.delivery && o.delivery.city) || o.delivery.type === "pickup" || !S.senderCity) return;
    if(o.shipQuote && o.shipQuote.key === quoteKey(o)) return;
    clearTimeout(quoteTimer);
    quoteTimer = setTimeout(() => { if(order === o && !QUOTING.has(o.id) && $("econtOut")) econtCalc(o); }, 1500);
  }
  async function econtCalc(o, demo){
    if(demo === undefined) demo = econtDemo();
    const out = $("econtOut"), btn = $("b-econtCalc"); if(!out || !btn) return;
    const missing = [!S.senderCity && "населено място на изпращача (Настройки)", !(o.delivery && o.delivery.city) && "населено място на получателя"].filter(Boolean);
    if(missing.length){ out.innerHTML = '<div class="warnbox">Липсва: ' + esc(missing.join(", ")) + '.</div>'; return; }
    QUOTING.add(o.id);
    btn.disabled = true; btn.textContent = "Пита Еконт...";
    const label = econtLabel(o), key = quoteKey(o);
    try{
      const res = await CLOUD.fn("econt", { action:"calculate", label, demo:!!demo });
      const L = res && res.econt && res.econt.label;
      if(res && res.ok && L && L.totalPrice != null){
        o.shipQuote = { price:+L.totalPrice, currency:L.currency || "EUR", receiver:L.receiverDueAmount != null ? +L.receiverDueAmount : null, at:new Date().toISOString(), demo:!!demo, key };
        saveSoon(); renderLists();
        const qe = $("econtQuote"); if(qe) qe.innerHTML = quoteTxt(o);
        out.innerHTML = (demo ? '<div class="muted">Ориентировъчно — по тарифата на Еконт от тестовия им профил (без вашите отстъпки). Точната цена се вижда при създаване на пратката.</div>' : '') +
          ((o.delivery && o.delivery.type === "office") ? '<div class="muted">Сметнато до адрес в ' + esc(o.delivery.city) + ' — до офис обикновено е по-евтино.</div>' : '');
      }else{
        // Econt nests its errors (message + innerErrors[] + fields): collect every non-empty text
        const texts = [], walk = x => { if(!x || typeof x !== "object") return; if(typeof x.message === "string" && x.message.trim()) texts.push(x.message.trim());
          (x.innerErrors || []).forEach(walk); (x.fields || []).forEach(f => { if(typeof f === "string" && f.trim()) texts.push("поле: " + f); }); };
        const e = res && res.econt; walk(e);
        const msg = [...new Set(texts)].join("; ") || (res && res.error) || (e && e.raw ? String(e.raw).slice(0, 200) : "") || ("HTTP " + (res && res.status));
        const lg = res && res.login, badLogin = /потребителско|парола|password|user/i.test(msg);
        out.innerHTML = '<div class="warnbox">' + (demo ? 'Тестовият профил на Еконт' : 'Еконт') + ' не върна цена: ' + esc(msg) + '</div>' +
          (lg ? '<div class="muted" style="margin-top:6px">Пробвано с потребител <b>' + esc(lg.user) + '</b> (' + lg.userLength + ' знака) и парола от <b>' + lg.passLength + '</b> знака · ' + esc(lg.server) + '</div>' : '') +
          (badLogin && !demo ? '<div class="note" style="margin-top:6px">Проверете в Supabase → Edge Functions → Secrets: ECONT_USER е потребителското име за e-Econt (вижте го в профила си в e-Econt — може да не е имейлът), ECONT_PASS е паролата (ако влизате с Google, задайте си парола в e-Econt). ' +
            '<button class="btn small" type="button" id="b-econtDemo">Пробвай с тестовия профил на Еконт</button> — ако там излезе цена, заявката е наред и остава само входът.</div>' : '');
      }
      out.innerHTML += '<details class="muted"' + (o.shipQuote && o.shipQuote.key === key ? '' : ' open') + '><summary>Подробности (за проверка)</summary><pre class="econtRaw">' + esc(JSON.stringify({ sent:label, answer:res }, null, 1).slice(0, 6000)) + '</pre></details>';
    }catch(e){
      // the browser cannot tell "no internet" from "the function is missing" (Supabase's 404 fails the browser's pre-check)
      out.innerHTML = '<div class="warnbox">' + esc(e.offline
        ? (navigator.onLine === false ? "Няма интернет." : "Функцията „econt“ в Supabase не отговаря — най-често още не е пусната или името ѝ не е точно econt (Supabase → Edge Functions).")
        : (e.message || "Грешка")) + '</div>';
    }finally{ QUOTING.delete(o.id); const b = $("b-econtCalc"); if(b){ b.disabled = false; b.textContent = o.shipQuote ? "Изчисли наново" : "Изчисли"; } }
  }
  $("bottomBar").addEventListener("click", e => {
    if(e.target.closest("#b-econtCalc") && order) econtCalc(order);
    if(e.target.closest("#b-econtDemo") && order) econtCalc(order, true);
  });

  // copy buttons (anywhere in the bottom bar)
  async function copyText(txt){
    try{ await navigator.clipboard.writeText(txt); return true; }
    catch(e){
      const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); let ok = false; try{ ok = document.execCommand("copy"); }catch(e2){} ta.remove(); return ok;
    }
  }
  $("bottomBar").addEventListener("click", async e => {
    const b = e.target.closest("[data-copy]"); if(!b) return;
    const was = b.textContent, ok = await copyText(b.dataset.copy);
    b.textContent = ok ? "✓ Копирано" : "Не можа"; setTimeout(() => { b.textContent = was; }, 1400);
  });

  function snapPrices(o){
    const P = PRICING;
    if(P){ o.clientPrice = P.client; o.cost = P.costTotal; o.costMaterials = P.costMaterials; o.weld = P.weld; o.bend = P.bend; }
  }

  // Разкрой → В обработка: takes the offcuts from the store, adds the new ones, gives the order its number
  async function confirmOrder(){
    const o = order;
    if(!o || o.stage !== "new" || !CURRENT) return;
    const cur = CURRENT, btn = $("bConfirm");
    let ser, firstOff;
    try{
      if(btn){ btn.disabled = true; btn.textContent = "Потвърждаване..."; }
      ser = o.serial || await takeSerials("order", 1);
      firstOff = cur.created.length ? await takeSerials("offcut", cur.created.length) : 0;
    }catch(e){
      if(btn){ btn.disabled = false; btn.textContent = "✓ Потвърди разкроя"; }
      barMsg((e.offline ? "Няма връзка с облака" : "Грешка") + " — разкроят НЕ е потвърден (номерата се раздават от облака, за да не се повтарят). Опитайте пак.", "bad");
      return;
    }
    if(order !== o || o.stage !== "new") return;
    const now = new Date().toISOString(), usedIds = cur.used.map(x => x.id);
    o.serial = ser;
    const label = orderSerial(o.serial) + (o.name ? " · " + o.name : "");
    INV.items = INV.items.filter(x => !usedIds.includes(x.id));
    const added = cur.created.map((c, i) => {
      const id = serial(firstOff + i);
      INV.items.push({ id, w:Math.max(c.w, c.h), h:Math.min(c.w, c.h), th:+c.th || 1.5, from:c.src + " · " + label, added:now });
      return id;
    });
    o.cut = { at:now, used:cur.used.map(x => Object.assign({}, x)), added };
    snapPrices(o);
    o.stage = "processing"; o.confirmedAt = now; delete o.noData;
    if(!o.place && deliveryText(o.delivery)) o.place = deliveryText(o.delivery);
    saveInv(); saveOrders(); renderStock();
    SEL.work = null; TAB = "print";
    showPage("work");
    setStatus("✓ " + label + " — разкроят е потвърден и поръчката е преместена в „В обработка“. Взета фира: " + idsTxt(usedIds) + " · добавена: " + idsTxt(added) + ".", "ok");
  }
  // Разкрой: the order is dropped together with its document
  async function cancelOrder(){
    const o = order;
    if(!o || o.stage !== "new") return;
    ORD.orders = ORD.orders.filter(x => x.id !== o.id);
    saveOrders();
    if(o.hasDoc) await dropDoc(o.id);
    SEL.work = null;
    showPage("work");
    setStatus("Поръчката" + (o.name ? " на " + o.name : "") + " е отказана и премахната.", "");
  }
  // В обработка → Разкрой: undoes the cut, the store goes back to how it was before confirming
  function backToWork(){
    const o = order;
    if(!o || o.stage !== "processing") return;
    let gone = [];
    if(o.cut){
      gone = o.cut.added.filter(id => !INV.items.some(x => x.id === id));
      INV.items = INV.items.filter(x => !o.cut.added.includes(x.id));
      o.cut.used.forEach(u => { if(!INV.items.some(x => x.id === u.id)) INV.items.push(u); });
      o.cut = null;
    }
    o.stage = "new"; o.confirmedAt = null;
    saveInv(); saveOrders(); renderStock();
    SEL.processing = null; SEL.work = o.id; TAB = "edit";
    showPage("work");
    setStatus(gone.length ? "⚠ " + serTxt(o) + " е върната в Разкрой, но " + gone.join(", ") + " вече не е в склада (използвана в друга поръчка или премахната)."
                          : "↶ " + serTxt(o) + " е върната в Разкрой — складът е както преди потвърждението. Редактирайте и потвърдете отново.", gone.length ? "warn" : "ok");
  }
  // В обработка → Архив
  function archiveOrder(){
    const o = order;
    if(!o || o.stage !== "processing") return;
    snapPrices(o);
    const now = new Date().toISOString();
    o.stage = "archived"; o.archivedAt = now; o.savedAt = now;
    saveOrders();
    SEL.processing = null;
    showPage("processing");
    procMsg("✓ " + serTxt(o) + (o.name ? " (" + o.name + ")" : "") + " е архивирана.", "ok");
  }

  /* ---------- обединяване на чакащи поръчки: масите и детайлите отиват в най-старата, разкроят става общ ---------- */
  var WSEL = new Set();
  function mergeOrders(ids){
    const list = byStage("new").filter(o => ids.includes(o.id)).sort((a, b) => (a.addedAt || "").localeCompare(b.addedAt || ""));
    if(list.length < 2) return;
    if(list.filter(o => o.hasDoc).length > 1){ setStatus("⚠ Повече от една от избраните поръчки има PDF на клиент — те не се обединяват (всяка поръчка пази един документ).", "warn"); return; }
    const target = list.find(o => o.hasDoc) || list[0], rest = list.filter(o => o !== target);
    rest.forEach(o => {
      target.tables = (target.tables || []).concat(o.tables || []);
      target.parts = (target.parts || []).concat((o.parts || []).map(p => Object.assign({}, p, { pid:newPid() })));
      target.assemblies = (target.assemblies || []).concat((o.assemblies || []).map(a => Object.assign({}, a, { aid:newAid() })));
      if(!target.name && o.name) target.name = o.name;
      if(!target.phone && o.phone) target.phone = o.phone;
      if(!target.delivery && o.delivery) target.delivery = o.delivery;
      if(o.serial && !target.serial) target.serial = o.serial;
    });
    ORD.orders = ORD.orders.filter(o => !rest.includes(o));
    WSEL = new Set(); saveOrders();
    SEL.work = target.id; TAB = "print"; showPage("work");
    setStatus("✓ Обединени " + list.length + " поръчки в една — общ разкрой. Проверете името на клиента в „Маси — редакция“.", "ok");
  }

  /* ---------- lists: Разкрой (waiting) and В обработка (being made) ---------- */
  function renderLists(){
    const w = byStage("new").sort((a, b) => (a.addedAt || "").localeCompare(b.addedAt || ""));
    const p = byStage("processing").sort((a, b) => (+a.serial || 0) - (+b.serial || 0));
    $("cntWork").textContent = w.length ? w.length : "";
    $("cntProc").textContent = p.length ? p.length : "";
    $("workCount").textContent = w.length ? "(" + w.length + ")" : "";
    $("procCount").textContent = p.length ? "(" + p.length + ")" : "";
    const openBtn = (id, sel) => '<button class="btn small" data-open="' + esc(id) + '" type="button">' + (sel ? "Затвори" : "Отвори") + '</button>';
    [...WSEL].forEach(id => { if(!w.some(o => o.id === id)) WSEL.delete(id); });
    $("workList").innerHTML = w.length
      ? '<div class="tw"><table class="cut list"><thead><tr><th style="width:1%"></th><th>Клиент</th><th>Телефон</th><th>Маси</th><th>Цена за клиента</th><th>Заредена</th><th>Файл</th><th></th></tr></thead><tbody>' +
        w.map(o => '<tr class="' + (SEL.work === o.id ? "sel" : "") + '" data-row="' + esc(o.id) + '">' +
          '<td><input type="checkbox" data-wsel="' + esc(o.id) + '"' + (WSEL.has(o.id) ? " checked" : "") + ' title="за обединяване"></td>' +
          '<td><b>' + esc(o.name || "без име") + '</b>' + (o.serial ? ' <span class="muted">' + esc(orderSerial(o.serial)) + '</span>' : '') + '</td>' +
          '<td>' + esc(o.phone || "—") + '</td><td class="q">' + itemsTxt(o) + '</td>' +
          '<td class="size">' + esc(eur2(clientPriceOf(o))) + (ECONT_API && o.shipQuote ? '<br><span class="muted">+ доставка ≈ ' + esc(eur2(+o.shipQuote.price)) + '</span>' : '') + '</td><td>' + esc(fmtDT(o.addedAt)) + '</td>' +
          '<td class="muted">' + esc(o.source || "ръчно") + '</td><td>' + openBtn(o.id, SEL.work === o.id) + '</td></tr>').join("") +
        '</tbody></table></div>' +
        (w.length > 1 ? '<div class="row mergeBar"><span class="muted">' + (WSEL.size > 1 ? 'Избрани: <b>' + WSEL.size + '</b>' :
          'Отметнете две или повече поръчки, за да ги обедините в една — разкроят им става общ (по-малко листове).') + '</span>' +
          (WSEL.size > 1 ? '<button class="btn primary" id="mergeBtn" type="button">Обедини избраните в една поръчка</button>' : '') + '</div>' : '')
      : '<div class="empty">Няма чакащи поръчки. Заредете PDF отгоре — може няколко наведнъж.</div>';
    $("procList").innerHTML = p.length
      ? '<div class="tw"><table class="cut list"><thead><tr><th>№</th><th>Клиент</th><th>Телефон</th><th>Маси</th><th>Цена за клиента</th><th>Продажна</th><th>Доставка</th><th>Потвърдена</th><th></th></tr></thead><tbody>' +
        p.map(o => '<tr class="' + (SEL.processing === o.id ? "sel" : "") + '" data-row="' + esc(o.id) + '">' +
          '<td class="size">' + esc(serTxt(o)) + '</td><td><b>' + esc(o.name || "без име") + '</b></td><td>' + esc(o.phone || "—") + '</td>' +
          '<td class="q">' + itemsTxt(o) + '</td><td class="size">' + esc(eur2(o.clientPrice != null ? o.clientPrice : clientPriceOf(o))) + '</td>' +
          '<td class="size">' + esc(eur2(o.price)) + '</td>' +
          '<td>' + esc(o.place || "—") + (o.deliveryDate ? ' · ' + esc(o.deliveryDate) : '') + (ECONT_API && o.shipQuote ? '<br><span class="muted">Еконт ≈ ' + esc(eur2(+o.shipQuote.price)) + '</span>' : '') + (o.waybill ? '<br><span class="muted">Еконт ' + esc(o.waybill) + '</span>' : '') + '</td>' +
          '<td>' + esc(fmtDate(o.confirmedAt)) + '</td><td>' + openBtn(o.id, SEL.processing === o.id) + '</td></tr>').join("") +
        '</tbody></table></div>'
      : '<div class="empty">Няма поръчки в обработка. Поръчка идва тук, когато потвърдите разкроя ѝ в „Разкрой“.</div>';
    $("workList").querySelectorAll("[data-wsel]").forEach(c => c.addEventListener("change", () => { if(c.checked) WSEL.add(c.dataset.wsel); else WSEL.delete(c.dataset.wsel); renderLists(); }));
    const mb = $("mergeBtn"); if(mb) mb.addEventListener("click", () => mergeOrders([...WSEL]));
    [["workList", "work"], ["procList", "processing"]].forEach(([el, page]) => {
      $(el).querySelectorAll("[data-row]").forEach(tr => tr.addEventListener("click", e => {
        if(e.target.closest("input,a")) return;
        const id = tr.dataset.row, close = SEL[page] === id;
        SEL[page] = close ? null : id;
        if(!close){ const rec = findOrder(id); TAB = rec && rec.noData ? "edit" : "print"; }
        openViewer(); renderLists();
        if(!close) $("viewer").scrollIntoView({ behavior:"smooth", block:"start" });
      }));
    });
  }

  /* ---------- archive: finished orders ---------- */
  function archMsg(m, k){ const e = $("archStatus"); if(e){ e.className = "status " + (k || ""); e.textContent = m; } }
  function renderArchive(){
    const q = ($("archSearch").value || "").toLowerCase().trim();
    const all = byStage("archived");
    let list = all.slice().sort((a, b) => (b.archivedAt || b.savedAt || "").localeCompare(a.archivedAt || a.savedAt || ""));
    if(q) list = list.filter(o => ((o.serial ? orderSerial(o.serial) : "") + " " + (o.orderNo || "") + " " + (o.name || "") + " " + (o.phone || "") + " " + (o.place || "")).toLowerCase().includes(q));
    $("archiveList").innerHTML = list.length
      ? '<div class="tw"><table class="cut arch"><thead><tr><th>№</th><th>Клиент</th><th>Телефон</th><th>Архивирана</th><th>Маси</th><th>Клиентска цена</th><th>Себестойност</th><th>Продажна</th><th>Доставка</th><th>Документ</th><th></th></tr></thead><tbody>' +
        list.map(o => '<tr>' +
          '<td class="size">' + esc(serTxt(o)) + '</td>' +
          '<td>' + esc(o.name || "—") + '</td>' +
          '<td>' + esc(o.phone || "—") + '</td>' +
          '<td>' + esc(fmtDate(o.archivedAt || o.savedAt)) + '</td>' +
          '<td class="q">' + itemsTxt(o) + '</td>' +
          '<td class="size">' + esc(eur2(o.clientPrice)) + '</td>' +
          '<td class="size">' + esc(eur2(o.cost)) + '</td>' +
          '<td class="size">' + esc(eur2(o.price)) + '</td>' +
          '<td>' + esc(o.place || "—") + (o.deliveryDate ? ' · ' + esc(o.deliveryDate) : "") + (o.waybill ? '<br><span class="muted">Еконт ' + esc(o.waybill) + '</span>' : '') + '</td>' +
          '<td>' + (o.hasDoc ? '<button class="btn small" data-doc="' + esc(o.id) + '" type="button">Отвори</button>' : '—') + '</td>' +
          '<td class="acts"><button class="btn small" data-back="' + esc(o.id) + '" type="button" title="Връща поръчката в „В обработка“">↶ В обработка</button> ' +
          '<button class="btn small" data-copy="' + esc(o.id) + '" type="button" title="Нова поръчка в „Разкрой“ със същите маси">Копие в Разкрой</button> ' +
          '<button class="btn danger" data-rm="' + esc(o.id) + '" type="button">Премахни</button></td>' +
        '</tr>').join("") + '</tbody></table></div>' +
        '<div class="muted" style="margin-top:6px">' + list.length + (q ? ' от ' + all.length : '') + (all.length === 1 ? ' поръчка' : ' поръчки') + '</div>'
      : '<div class="empty">' + (all.length ? "Няма съвпадения." : "Архивът е празен. Поръчка идва тук, когато натиснете „Архивирай“ в „В обработка“.") + '</div>';
    $("archiveList").querySelectorAll("[data-doc]").forEach(b => b.addEventListener("click", () => openDoc(b.dataset.doc)));
    $("archiveList").querySelectorAll("[data-back]").forEach(b => b.addEventListener("click", () => {
      const o = findOrder(b.dataset.back); if(!o) return;
      o.stage = "processing"; o.archivedAt = null; saveOrders(); renderArchive(); renderLists();
      archMsg("↶ " + serTxt(o) + " е върната в „В обработка“.", "ok");
    }));
    $("archiveList").querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", () => {
      const o = findOrder(b.dataset.copy); if(!o) return;
      const rec = makeRecord({ name:o.name, phone:o.phone, tables:o.tables }, "копие на " + serTxt(o));
      ORD.orders.push(rec); saveOrders();
      SEL.work = rec.id; TAB = "edit"; showPage("work");
      setStatus("Копие на " + serTxt(o) + " е добавено в Разкрой — проверете размерите и потвърдете разкроя.", "ok");
    }));
    $("archiveList").querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", async () => {
      if(b.dataset.armed !== "1"){ b.dataset.armed = "1"; b.textContent = "Сигурно? Натисни пак"; return; }
      const o = findOrder(b.dataset.rm);
      ORD.orders = ORD.orders.filter(x => x.id !== b.dataset.rm); saveOrders();
      if(o && o.hasDoc) await dropDoc(o.id);
      renderArchive(); archMsg("Премахната от архива.", "");
    }));
  }
  $("archSearch").addEventListener("input", renderArchive);

  // backup of every order (Разкрой, В обработка, Архив) with the documents
  $("archExport").addEventListener("click", async () => {
    saveOrders();
    archMsg("Подготвям копие с документите...", "");
    const out = { kind:"mpr-orders", v:2, saved:new Date().toISOString(), next:ORD.next, orders:[] };
    for(const o of ORD.orders){
      const rec = Object.assign({}, o);
      if(o.hasDoc){ try{ const d = await getDoc(o.id); if(d){ rec.doc = await blobToB64(d.blob); rec.docName = d.name; } }catch(e){} }
      out.orders.push(rec);
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(out)], { type:"application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "arhiv-poruchki-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    archMsg("⬇ Резервното копие е свалено (" + ORD.orders.length + " поръчки).", "ok");
  });
  $("archImport").addEventListener("click", () => $("archImportFile").click());
  $("archImportFile").addEventListener("change", async () => {
    const f = $("archImportFile").files[0]; $("archImportFile").value = ""; if(!f) return;
    try{
      const d = JSON.parse(await f.text());
      if(!d || !Array.isArray(d.orders)) throw new Error("bad");
      let n = 0;
      for(const o of d.orders){
        if(!o || !o.id || !Array.isArray(o.tables)) continue;
        if(!STAGES[o.stage]){ o.stage = "archived"; o.archivedAt = o.archivedAt || o.savedAt || ""; }   // copies made before the stages
        if(o.doc){ try{ await docPut(o.id, b64ToBlob(o.doc, "application/pdf"), o.docName || o.id + ".pdf"); o.hasDoc = true; o.docCloud = false; }catch(e){} delete o.doc; }
        const i = ORD.orders.findIndex(x => x.id === o.id);
        if(i >= 0) ORD.orders[i] = o; else ORD.orders.push(o);
        n++;
      }
      const top = Math.max(0, ...ORD.orders.map(o => +o.serial || 0));
      ORD.next = Math.max(ORD.next, +d.next || 1, top + 1);
      saveOrders(); renderArchive(); renderLists();
      archMsg("✓ Заредени " + n + " поръчки от копието (общо " + ORD.orders.length + ").", "ok");
    }catch(e){ archMsg("✕ Файлът не е резервно копие на поръчките.", "bad"); }
  });

  /* ---------- облак: синхронизиране между устройствата ----------
     Облакът (Supabase) пази всичко: поръчки, PDF-и, фира, настройки и поредните номера. Всяко устройство
     държи копие в браузъра — за бърза работа и без интернет — и праща/взема промените:
       • запис на ред: промяна на това устройство печели; промяна от друго устройство се взема; изтрито
         на едното се трие и на другото (сравнява се с последното синхронизирано състояние на всеки ред);
       • №/Ф- номерата се раздават от базата (take_serial), затова не се повтарят между устройствата;
       • PDF-ите се качват във фонов режим и се свалят при нужда на другите устройства. */
  var CLOUD = (window.Cloud && Cloud.configured) ? Cloud : null;
  var cloudReady = false, syncing = null, syncAgain = false, syncTimer = null;
  var SYNC_KEY = "mpr-sync-v1", BACKUP_KEY = "mpr-last-backup";
  var SY = (function(){ try{ return JSON.parse(localStorage.getItem(SYNC_KEY) || "null") || {}; }catch(e){ return {}; } })();
  ["orders","offcuts","kv"].forEach(k => { if(!SY[k] || typeof SY[k] !== "object") SY[k] = {}; });
  if(!Array.isArray(SY.docDel)) SY.docDel = [];
  function saveSyncMeta(){ try{ localStorage.setItem(SYNC_KEY, JSON.stringify(SY)); }catch(e){} }

  // key order does not matter (the database reorders JSON keys)
  function stable(v){
    if(Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
    if(v && typeof v === "object") return "{" + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
    return JSON.stringify(v === undefined ? null : v);
  }
  function hsh(v){ const s = stable(v); let h = 5381; for(let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36) + s.length.toString(36); }

  const saveOrdersLocal = () => { try{ localStorage.setItem(ORD_KEY, JSON.stringify(ORD)); }catch(e){} };
  const saveInvLocal = () => { try{ localStorage.setItem(INV_KEY, JSON.stringify(INV)); }catch(e){} };
  const saveSettingsLocal = () => { try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} };
  const COLS = {
    orders:{ table:"orders", rows:() => ORD.orders.map(o => ({ id:o.id, data:o })),
      apply:(takes, drops) => {
        takes.forEach(r => { const d = Object.assign({}, r.data, { id:r.id }), ex = ORD.orders.find(o => o.id === r.id);
          if(ex){ Object.keys(ex).forEach(k => delete ex[k]); Object.assign(ex, d); } else ORD.orders.push(d); });
        if(drops.length) ORD.orders = ORD.orders.filter(o => !drops.includes(o.id));
        saveOrdersLocal(); } },
    offcuts:{ table:"offcuts", rows:() => INV.items.map(o => ({ id:o.id, data:o })),
      apply:(takes, drops) => {
        takes.forEach(r => { const d = Object.assign({}, r.data, { id:r.id }), i = INV.items.findIndex(o => o.id === r.id);
          if(i >= 0) INV.items[i] = d; else INV.items.push(d); });
        if(drops.length) INV.items = INV.items.filter(o => !drops.includes(o.id));
        saveInvLocal(); } },
    kv:{ table:"kv", rows:() => [{ id:"settings", data:S }, { id:"invDone", data:INV.done }, { id:"partsLib", data:LIB }],
      apply:(takes) => {
        takes.forEach(r => {
          if(r.id === "settings"){ S = Object.assign({}, DEFAULTS, r.data || {}); if(migrateSettings(S)) setTimeout(saveSettings, 0); else saveSettingsLocal(); }
          if(r.id === "invDone"){ INV.done = r.data || {}; saveInvLocal(); }
          if(r.id === "partsLib"){ LIB = { items:((r.data && r.data.items) || []).map(normPart), assemblies:((r.data && r.data.assemblies) || []).map(x => normAsm(x)) }; try{ localStorage.setItem(LIB_KEY, JSON.stringify(LIB)); }catch(e){} } }); } },
  };
  const rowData = (name, id) => { const r = COLS[name].rows().find(x => x.id === id); return r ? r.data : undefined; };
  function dirtyCount(){
    let n = 0;
    Object.keys(COLS).forEach(name => {
      const snap = SY[name], ids = new Set();
      COLS[name].rows().forEach(r => { ids.add(r.id); if(!snap[r.id] || snap[r.id].h !== hsh(r.data)) n++; });
      Object.keys(snap).forEach(id => { if(!ids.has(id)) n++; });
    });
    return n + SY.docDel.length + ORD.orders.filter(o => o.hasDoc && !o.docCloud).length;
  }

  // one collection: three-way merge against the last synced state of every row
  async function syncCol(name){
    const C = COLS[name], snap = SY[name];
    const local = new Map(C.rows().map(r => [r.id, r]));
    const remote = new Map((await CLOUD.list(C.table)).map(r => [r.id, r.updated_at]));
    const need = [...remote.keys()].filter(id => !snap[id] || snap[id].u !== remote.get(id));
    const fetched = new Map((need.length ? await CLOUD.fetchRows(C.table, need) : []).map(r => [r.id, r]));
    const ups = [], dels = [], takes = [], drops = [];
    new Set([...local.keys(), ...remote.keys(), ...Object.keys(snap)]).forEach(id => {
      const l = local.get(id), s = snap[id], ru = remote.get(id);
      if(l){
        const h = hsh(l.data);
        if(!s && ru !== undefined){ if(fetched.has(id)) takes.push(fetched.get(id)); }        // first sync of this device: the cloud's copy wins
        else if(!s || s.h !== h) ups.push({ id, h, body:JSON.parse(JSON.stringify(l.data)) }); // changed here
        else if(ru === undefined) drops.push(id);                                              // deleted elsewhere
        else if(s.u !== ru && fetched.has(id)) takes.push(fetched.get(id));                    // changed elsewhere
      }else if(s){
        if(ru === undefined) delete snap[id];
        else if(s.u !== ru){ if(fetched.has(id)) takes.push(fetched.get(id)); }                // changed elsewhere after we deleted
        else dels.push(id);                                                                    // deleted here
      }else if(ru !== undefined && fetched.has(id)) takes.push(fetched.get(id));               // new elsewhere
    });
    if(takes.length || drops.length){
      C.apply(takes, drops);
      takes.forEach(r => { snap[r.id] = { h:hsh(rowData(name, r.id)), u:r.updated_at }; });
      drops.forEach(id => delete snap[id]);
    }
    if(ups.length){
      const res = await CLOUD.upsert(C.table, ups.map(u => ({ id:u.id, data:u.body })));
      const at = new Map(res.map(x => [x.id, x.updated_at]));
      ups.forEach(u => { if(at.has(u.id)) snap[u.id] = { h:u.h, u:at.get(u.id) }; });
    }
    if(dels.length){ await CLOUD.remove(C.table, dels); dels.forEach(id => delete snap[id]); }
    return { ids:takes.map(r => r.id).concat(drops), any:takes.length + drops.length > 0 };
  }
  async function syncCounters(){
    const c = await CLOUD.counters();
    let changed = false;
    for(const [name, box] of [["order", ORD], ["offcut", INV]]){
      const cv = +c[name] || 0;
      if(box.next > cv) await CLOUD.rpc("take_serial", { p_name:name, p_count:0, p_min:box.next });   // the cloud must not hand out numbers we already used
      else if(cv > box.next){ box.next = cv; changed = true; }
    }
    if(changed){ saveOrdersLocal(); saveInvLocal(); }
  }
  async function uploadDocs(){
    let n = 0;
    for(const o of ORD.orders.slice()){
      if(!o.hasDoc || o.docCloud) continue;
      let d = null; try{ d = await docGet(o.id); }catch(e){}
      if(!d) continue;                                  // the PDF is on another device that has not uploaded it yet
      await CLOUD.docUp(o.id, d.blob);
      o.docCloud = true; n++;
    }
    if(n) saveOrdersLocal();
  }
  async function processDocDeletes(){
    if(!SY.docDel.length) return;
    const list = SY.docDel.slice();
    await CLOUD.docRemove(list);
    SY.docDel = SY.docDel.filter(id => !list.includes(id));
  }

  async function syncNow(){
    if(!CLOUD || !cloudReady) return;
    if(syncing){ syncAgain = true; return syncing; }
    syncing = (async () => {
      const changed = { orders:[], offcuts:false, kv:false };
      try{
        syncState("busy");
        await uploadDocs();
        await processDocDeletes();
        const o = await syncCol("orders"); changed.orders = o.ids;
        changed.offcuts = (await syncCol("offcuts")).any;
        changed.kv = (await syncCol("kv")).any;
        await syncCounters();
        saveSyncMeta();
        syncState(dirtyCount() ? "pending" : "ok");
      }catch(e){
        saveSyncMeta();
        if(e && e.status === 401){ syncState("error", { message:"Входът е изтекъл — влезте отново." }); }
        else syncState(e && e.offline ? "offline" : "error", e);
      }finally{ syncing = null; }
      afterRemoteChange(changed);
      if(syncAgain){ syncAgain = false; syncNow(); }
    })();
    return syncing;
  }
  function cloudDirty(){
    if(!CLOUD || !cloudReady) return;
    syncState("pending");
    clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, 800);
  }
  // redraw what another device changed (only what is affected)
  function afterRemoteChange(ch){
    if(!ch.orders.length && !ch.offcuts && !ch.kv) return;
    if(ch.kv){ buildSettings(); if(PAGE === "designer") renderDzLib(); }
    if(ch.offcuts) renderStock();
    renderLists();
    if(PAGE === "archive") renderArchive();
    if(order && ch.orders.includes(order.id)) openViewer();
    else if(order && (ch.offcuts || ch.kv)) recompute();
    else if(!order && (PAGE === "work" || PAGE === "processing") && SEL[PAGE]) openViewer();
    renderDataInfo();
  }

  // serial numbers: from the cloud when there is one (unique across devices), otherwise locally
  async function takeSerials(name, count){
    const box = name === "order" ? ORD : INV;
    if(!CLOUD){ const f = box.next; box.next += count; return f; }
    if(!cloudReady) throw Object.assign(new Error("not ready"), { offline:true });
    const f = +(await CLOUD.rpc("take_serial", { p_name:name, p_count:count, p_min:box.next }));
    if(!(f > 0)) throw new Error("Облакът не върна номер.");
    box.next = Math.max(box.next, f + count);
    return f;
  }
  // the PDF of an order: this device first, then the cloud (and keep a copy here)
  async function getDoc(id){
    let d = null; try{ d = await docGet(id); }catch(e){}
    if(d || !CLOUD || !cloudReady) return d;
    const blob = await CLOUD.docDown(id);
    if(!blob) return null;
    const rec = findOrder(id), name = (rec && rec.docName) || ("poruchka-" + id + ".pdf");
    try{ await docPut(id, blob, name); }catch(e){}
    return { blob, name };
  }
  async function dropDoc(id){
    try{ await docDel(id); }catch(e){}
    if(CLOUD){ SY.docDel.push(id); saveSyncMeta(); cloudDirty(); }
  }
  function barMsg(m, k){ const e = $("barStatus"); if(e){ e.className = "status " + (k || ""); e.textContent = m; } }

  function syncState(st, e){
    const el = $("syncState"); if(!el) return;
    const T = { ok:"☁ Записано в облака", busy:"☁ Синхронизиране…", pending:"☁ Записва…", offline:"⚠ Без връзка — пази се тук",
                error:"⚠ Облакът не записа", local:"Само на това устройство" };
    el.hidden = false; el.className = "sync noprint " + st; el.textContent = T[st] || st;
    el.title = st === "offline" ? "Няма връзка с облака. Промените се пазят на това устройство и ще се качат, когато връзката се върне."
             : st === "error" ? ((e && e.message) || "Грешка") : st === "local" ? "Облакът не е настроен — данните са само в този браузър." : "";
    renderDataInfo();
  }
  function renderDataInfo(){
    const el = $("dataInfo"); if(!el) return;
    const last = (() => { try{ return localStorage.getItem(BACKUP_KEY) || ""; }catch(e){ return ""; } })();
    el.innerHTML = (CLOUD
      ? 'Данните се пазят <b>в облака</b>' + (CLOUD.email() ? ' (вход: ' + esc(CLOUD.email()) + ')' : '') + ' и са достъпни от всяко устройство след вход. ' +
        'Това устройство държи копие за работа без интернет' + (cloudReady && dirtyCount() ? ' — <b>' + dirtyCount() + ' промени чакат качване</b>.' : '.')
      : '<b>Облакът не е настроен</b> — данните са само в този браузър. Изтриване на „бисквитки и данни на сайтове“ ги изтрива.') +
      '<br>Последно пълно резервно копие от това устройство: <b>' + (last ? esc(fmtDT(last)) : 'никога') + '</b>.';
    const nag = $("backupNag");
    if(nag){
      const days = last ? (Date.now() - new Date(last)) / 864e5 : Infinity, has = ORD.orders.length > 0;
      const lim = CLOUD ? 30 : 7;
      nag.hidden = !(has && days > lim);
      nag.textContent = "⚠ " + (last ? "Последното пълно резервно копие е отпреди " + Math.floor(days) + " дни." : "Още няма пълно резервно копие.") +
        " Свалете ново от Настройки → „Свали пълно резервно копие“" + (CLOUD ? " (облакът на безплатния план няма автоматични копия)." : ".");
    }
  }

  // full backup: orders with their PDFs, offcut store, settings, serial counters — one file
  $("fullExport").addEventListener("click", async () => {
    const st = $("dataStatus"); st.className = "status"; st.textContent = "Подготвям копието с документите...";
    const orders = [];
    for(const o of ORD.orders){
      const rec = Object.assign({}, o);
      if(o.hasDoc){ try{ const d = await getDoc(o.id); if(d){ rec.doc = await blobToB64(d.blob); rec.docName = d.name; } }catch(e){} }
      orders.push(rec);
    }
    const out = { kind:"mpr-full", v:1, saved:new Date().toISOString(), settings:S,
                  orders:{ next:ORD.next, orders }, offcuts:{ next:INV.next, items:INV.items, done:INV.done } };
    const url = URL.createObjectURL(new Blob([JSON.stringify(out)], { type:"application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "admin-pylno-kopie-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    try{ localStorage.setItem(BACKUP_KEY, new Date().toISOString()); }catch(e){}
    st.className = "status ok"; st.textContent = "⬇ Свалено: " + ORD.orders.length + " поръчки, " + INV.items.length + " парчета фира и настройките. Пазете файла на сигурно място (напр. Google Drive).";
    renderDataInfo();
  });
  $("fullImport").addEventListener("click", () => $("fullImportFile").click());
  $("fullImportFile").addEventListener("change", async () => {
    const f = $("fullImportFile").files[0]; $("fullImportFile").value = ""; if(!f) return;
    const st = $("dataStatus");
    try{
      const d = JSON.parse(await f.text());
      if(!d || d.kind !== "mpr-full") throw new Error("bad");
      let no = 0, nf = 0;
      for(const o of (d.orders && d.orders.orders) || []){
        if(!o || !o.id || !Array.isArray(o.tables)) continue;
        if(!STAGES[o.stage]){ o.stage = "archived"; o.archivedAt = o.archivedAt || o.savedAt || ""; }
        if(o.doc){ try{ await docPut(o.id, b64ToBlob(o.doc, "application/pdf"), o.docName || o.id + ".pdf"); o.hasDoc = true; o.docCloud = false; }catch(e){} delete o.doc; }
        const i = ORD.orders.findIndex(x => x.id === o.id);
        if(i >= 0) ORD.orders[i] = o; else ORD.orders.push(o);
        no++;
      }
      ORD.next = Math.max(ORD.next, +(d.orders && d.orders.next) || 1, 1 + Math.max(0, ...ORD.orders.map(o => +o.serial || 0)));
      const off = d.offcuts || {};
      (off.items || []).forEach(o => { if(o && o.id && +o.w > 0 && +o.h > 0 && !INV.items.some(x => x.id === o.id)){ INV.items.push(o); nf++; } });
      Object.assign(INV.done, off.done || {});
      INV.next = Math.max(INV.next, +off.next || 1, 1 + Math.max(0, ...INV.items.map(o => +String(o.id).replace(/\D/g, "") || 0)));
      if(d.settings) S = Object.assign({}, DEFAULTS, d.settings);
      saveSettings(); saveInv(); saveOrders();
      buildSettings(); renderStock(); renderLists(); renderArchive(); openViewer();
      st.className = "status ok"; st.textContent = "✓ Заредено: " + no + " поръчки, " + nf + " нови парчета фира и настройките." + (CLOUD ? " Качват се в облака..." : "");
    }catch(e){ st.className = "status bad"; st.textContent = "✕ Файлът не е пълно резервно копие на админа."; }
  });

  // logout: the data stays in the cloud; the copy on this device is removed
  $("logoutBtn").addEventListener("click", async () => {
    const b = $("logoutBtn");
    if(CLOUD && cloudReady){ await syncNow(); }
    const pending = CLOUD && cloudReady ? dirtyCount() : 0;
    if(b.dataset.armed !== "1"){
      b.dataset.armed = "1";
      b.textContent = pending ? "⚠ " + pending + " промени не са качени — натисни пак, за да излезеш все пак" : "Изход — натисни пак (данните остават в облака)";
      return;
    }
    await (CLOUD ? CLOUD.logout() : Promise.resolve());
    [ORD_KEY, OLD_ARCH_KEY, INV_KEY, KEY, SYNC_KEY].forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
    try{ indexedDB.deleteDatabase(DB_NAME); }catch(e){}
    location.reload();
  });

  function startCloud(){
    if(!CLOUD || cloudReady) return;
    cloudReady = true;
    $("menuAccount").hidden = false; $("menuEmail").textContent = CLOUD.email();
    syncNow();
    setInterval(() => { if(document.visibilityState === "visible") syncNow(); }, 60000);
    window.addEventListener("focus", () => syncNow());
    window.addEventListener("online", () => syncNow());
    document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible") syncNow(); });
  }

  /* ---------- Конструктор: детайли от лист (тави, кутии, плотове, Z-профили...) ----------
     Детайл = дъно L × W (външни размери) + верига огъвания по всяка от 4-те страни.
     Всеки сегмент от веригата: дължина (външен размер, както на чертеж) и посока в сечението:
     ↑ нагоре, ↓ надолу, → навън, ← навътре. Перпендикулярна посока = огъване 90°, обратна = подгъвка 180°.
     Заготовка = дъно + сегментите − корекция за всяко огъване (Настройки: 90° и 180°; или за детайла).
     В ъглите, където и двете съседни страни имат огъвания, се изрязва квадрат (широчина × широчина на перата). */
  const PART_DIRS = { up:"↑ нагоре", down:"↓ надолу", out:"→ навън", in:"← навътре" };
  const PART_EDGES = [["front","Отпред"],["back","Отзад"],["left","Ляво"],["right","Дясно"]];
  const isVertDir = d => d === "up" || d === "down";
  const bendAngle = (a, b) => isVertDir(a) !== isVertDir(b) ? 90 : (a === b ? 0 : 180);
  const newPid = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  function normPart(x){
    const p = x || {};
    const seg = s => ({ len:Math.max(0, +s.len || 0), dir:PART_DIRS[s.dir] ? s.dir : "up" });
    const edges = {};
    PART_EDGES.forEach(([e]) => { edges[e] = ((p.edges && p.edges[e]) || []).map(seg); });
    return { pid:p.pid || newPid(), name:String(p.name || "Детайл"), qty:Math.max(1, Math.round(+p.qty || 1)), th:+p.th > 0 ? +p.th : 1.5,
      L:Math.max(0, +p.L || 0), W:Math.max(0, +p.W || 0), bd90:Math.max(0, +p.bd90 || 0), bd180:Math.max(0, +p.bd180 || 0),
      edges, holes:(p.holes || []).map(h => ({ w:Math.max(0, +h.w || 0), h:Math.max(0, +h.h || 0), x:h.x === "" || h.x == null ? null : +h.x, y:h.y === "" || h.y == null ? null : +h.y })),
      notes:String(p.notes || "") };
  }
  function partGeo(p){
    const b90 = +p.bd90 > 0 ? +p.bd90 : (+S.bd90 || 0), b180 = +p.bd180 > 0 ? +p.bd180 : (+S.bd180 || 0);
    const ded = a => a === 180 ? b180 : a === 90 ? b90 : 0;
    const warns = [], ch = {};
    PART_EDGES.forEach(([e, name]) => {
      const segs = (p.edges[e] || []).filter(s => +s.len > 0);
      let prev = "out";
      const angles = segs.map(s => { const a = bendAngle(prev, s.dir); prev = s.dir; return a; });
      angles.forEach((a, i) => { if(a === 0) warns.push(name + ": сегмент " + (i + 1) + " е в същата посока като " + (i ? "предишния" : "дъното") + " — няма огъване (слейте ги)."); });
      const flats = segs.map((s, i) => +s.len - ded(angles[i]) / 2 - (i < segs.length - 1 ? ded(angles[i + 1]) / 2 : 0));
      flats.forEach((f, i) => { if(f <= 0) warns.push(name + ": сегмент " + (i + 1) + " (" + segs[i].len + " мм) е по-къс от корекцията за огъване."); });
      const flat = flats.reduce((a, b) => a + b, 0);
      const lines = []; let c = 0;
      segs.forEach((s, i) => { lines.push({ at:c, fromEdge:0, angle:angles[i], dir:s.dir }); c += flats[i]; });
      lines.forEach(l => { l.fromEdge = flat - l.at; });
      ch[e] = { name, segs, angles, flats, flat, lines, baseLoss:segs.length ? ded(angles[0]) / 2 : 0, bends:segs.length };
    });
    const Lf = p.L - ch.left.baseLoss - ch.right.baseLoss, Wf = p.W - ch.front.baseLoss - ch.back.baseLoss;
    const BW = Lf + ch.left.flat + ch.right.flat, BH = Wf + ch.front.flat + ch.back.flat;
    const corner = (a, b) => (ch[a].flat > 0 && ch[b].flat > 0) ? [ch[a].flat, ch[b].flat] : null;   // [x, y] size of the cut
    const notches = { bl:corner("left", "front"), br:corner("right", "front"), tl:corner("left", "back"), tr:corner("right", "back") };
    const holes = p.holes.filter(h => h.w > 0 && h.h > 0).map(h => {
      const x = h.x == null ? (Lf - h.w) / 2 : h.x, y = h.y == null ? (Wf - h.h) / 2 : h.y;
      if(x < 0 || y < 0 || x + h.w > Lf || y + h.h > Wf) warns.push("Отвор " + h.w + " × " + h.h + " мм излиза извън дъното.");
      return { w:h.w, h:h.h, x, y };
    });
    const area = BW * BH - Object.values(notches).filter(Boolean).reduce((a, n) => a + n[0] * n[1], 0) - holes.reduce((a, h) => a + h.w * h.h, 0);
    if(p.L <= 0 || p.W <= 0) warns.push("Въведете размерите на дъното.");
    const bends = PART_EDGES.reduce((a, [e]) => a + ch[e].bends, 0);
    return { ch, Lf, Wf, BW, BH, notches, holes, area, kg:Math.max(0, area) / 1e6 * p.th * 7.93, bends, warns, b90, b180 };
  }
  const profileTxt = c => c.segs.map((s, i) => s.len + " " + PART_DIRS[s.dir].split(" ")[0] + (c.angles[i] === 180 ? " (подгъвка 180°)" : "")).join(" · ");

  // flat blank (top view) with bend lines, corner cuts and openings + a cross-section of every bent edge
  function partSvg(p, g){
    const W = g.BW, H = g.BH; if(!(W > 0 && H > 0)) return "";
    const k = Math.min(560 / W, 300 / H), X0 = 70, Y0 = 46;
    const x = v => (X0 + v * k).toFixed(1), y = v => (Y0 + v * k).toFixed(1);
    const L = g.ch.left.flat, R = g.ch.right.flat, T = g.ch.back.flat, B = g.ch.front.flat;
    const xa = L, xb = L + g.Lf, ya = T, yb = T + g.Wf, n = g.notches;
    const pts = [];
    if(n.tl) pts.push([xa, 0]); else pts.push([0, 0]);
    if(n.tr) pts.push([xb, 0], [xb, ya], [W, ya]); else pts.push([W, 0]);
    if(n.br) pts.push([W, yb], [xb, yb], [xb, H]); else pts.push([W, H]);
    if(n.bl) pts.push([xa, H], [xa, yb], [0, yb]); else pts.push([0, H]);
    if(n.tl) pts.push([0, ya], [xa, ya]);
    let s = '<polygon points="' + pts.map(q => x(q[0]) + "," + y(q[1])).join(" ") + '" fill="#eef5ff" stroke="#1e3a5f" stroke-width="2"/>';
    const st = a => a === 180 ? 'stroke="#ea580c" stroke-width="2" stroke-dasharray="3 3"' : 'stroke="#dc2626" stroke-width="2" stroke-dasharray="7 4"';
    const ln = (x1, y1, x2, y2, a) => '<line x1="' + x(x1) + '" y1="' + y(y1) + '" x2="' + x(x2) + '" y2="' + y(y2) + '" ' + st(a) + '/>';
    g.ch.front.lines.forEach(l => s += ln(xa, yb + l.at, xb, yb + l.at, l.angle));
    g.ch.back.lines.forEach(l => s += ln(xa, ya - l.at, xb, ya - l.at, l.angle));
    g.ch.left.lines.forEach(l => s += ln(xa - l.at, ya, xa - l.at, yb, l.angle));
    g.ch.right.lines.forEach(l => s += ln(xb + l.at, ya, xb + l.at, yb, l.angle));
    g.holes.forEach(h => s += '<rect x="' + x(xa + h.x) + '" y="' + y(yb - h.y - h.h) + '" width="' + (h.w * k).toFixed(1) + '" height="' + (h.h * k).toFixed(1) +
      '" fill="#fff" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="5 3"/><text x="' + x(xa + h.x + h.w / 2) + '" y="' + y(yb - h.y - h.h / 2) +
      '" text-anchor="middle" font-size="11" fill="#6d28d9">отвор ' + fmt(h.w) + '×' + fmt(h.h) + '</text>');
    const t = (tx, ty, str, o) => '<text x="' + tx + '" y="' + ty + '" ' + (o || '') + '>' + str + '</text>';
    s += t(x(xa + g.Lf / 2), (+y(ya) + 16).toFixed(1), "дъно " + fmt(p.L) + " × " + fmt(p.W), 'text-anchor="middle" font-size="12" font-weight="700" fill="#15223a"');
    s += t(x(W / 2), Y0 - 22, "заготовка " + fmt(W) + " мм", 'text-anchor="middle" font-size="13" font-weight="700" fill="#15223a"');
    s += '<line x1="' + x(0) + '" y1="' + (Y0 - 14) + '" x2="' + x(W) + '" y2="' + (Y0 - 14) + '" stroke="#475569"/>';
    s += t(X0 - 18, y(H / 2), "заготовка " + fmt(H) + " мм", 'text-anchor="middle" font-size="13" font-weight="700" fill="#15223a" transform="rotate(-90 ' + (X0 - 18) + ' ' + y(H / 2) + ')"');
    s += t(x(W / 2), (+y(H) + 15).toFixed(1), "ОТПРЕД", 'text-anchor="middle" font-size="11" fill="#64748b"');
    const topH = Y0 + H * k + 30;
    // cross-sections, side by side under the blank
    const edgesBent = PART_EDGES.filter(([e]) => g.ch[e].segs.length);
    const maxSeg = Math.max(10, ...edgesBent.flatMap(([e]) => g.ch[e].segs.map(q => q.len)));
    // segments in proportion, but never too short to read (like the table fold schemes)
    const kp = Math.min(2.4, 100 / maxSeg), segPx = v => Math.max(24, v * kp), boxW = 200, boxH = 290;
    let cs = "";
    edgesBent.forEach(([e, name], i) => {
      const c = g.ch[e], ox = 20 + i * boxW, oy = topH + 20, cx0 = ox + 70, cy0 = oy + 145;
      let px = cx0, py = cy0, path = 'M' + (cx0 - 55) + ',' + cy0 + ' L' + cx0 + ',' + cy0, labels = "";
      let prev = "out";
      c.segs.forEach((sg, j) => {
        const v = { out:[1, 0], in:[-1, 0], up:[0, -1], down:[0, 1] }[sg.dir];
        if(bendAngle(prev, sg.dir) === 180){ const off = isVertDir(sg.dir) ? [6, 0] : [0, -6]; px += off[0]; py += off[1]; path += ' L' + px + ',' + py; }
        const nx = px + v[0] * segPx(sg.len), ny = py + v[1] * segPx(sg.len);
        path += ' L' + nx.toFixed(1) + ',' + ny.toFixed(1);
        // vertical: number beside the segment (on the side away from the base); horizontal: above or below it
        const side = sg.dir === "in" ? 1 : -1;
        const mx = (px + nx) / 2 + (isVertDir(sg.dir) ? 9 : 0), my = (py + ny) / 2 + (isVertDir(sg.dir) ? 4 : (side > 0 ? 15 : -8));
        labels += '<text x="' + mx.toFixed(1) + '" y="' + my.toFixed(1) + '" font-size="12" font-weight="700" fill="#1552c7"' + (isVertDir(sg.dir) ? '' : ' text-anchor="middle"') + '>' + fmt(sg.len) + '</text>';
        px = nx; py = ny; prev = sg.dir;
      });
      cs += '<text x="' + ox + '" y="' + (oy + 4) + '" font-size="12" font-weight="700" fill="#15223a">' + esc(name) + ' — сечение</text>' +
        '<path d="' + path + '" fill="none" stroke="#15223a" stroke-width="3.5" stroke-linejoin="miter"/>' + labels +
        '<text x="' + (cx0 - 55) + '" y="' + (cy0 + 16) + '" font-size="10" fill="#64748b">дъно</text>';
    });
    const VW = Math.max(X0 + W * k + 30, 20 + edgesBent.length * boxW), VH = topH + (edgesBent.length ? boxH : 0) + 24;
    const legend = '<line x1="20" y1="' + (VH - 10) + '" x2="54" y2="' + (VH - 10) + '" ' + st(90) + '/><text x="60" y="' + (VH - 6) + '" font-size="11" fill="#334155">огъване 90°</text>' +
      '<line x1="160" y1="' + (VH - 10) + '" x2="194" y2="' + (VH - 10) + '" ' + st(180) + '/><text x="200" y="' + (VH - 6) + '" font-size="11" fill="#334155">подгъвка 180°</text>';
    return '<figure class="scheme"><svg viewBox="0 0 ' + VW.toFixed(0) + ' ' + VH.toFixed(0) + '" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif">' +
      s + cs + legend + '</svg><figcaption>' + esc(p.name) + ' · заготовка ' + fmt(W) + ' × ' + fmt(H) + ' мм · горе = отзад · сеченията: размерите са външни; дъното е вляво от всяко сечение · огъванията в пропорция, дъното не е в мащаб</figcaption></figure>';
  }
  // the cut-list entry of one part (like computeTable for a table)
  function computePart(p, idx){
    const g = partGeo(p), tag = p.tag || ("Д" + (idx + 1));
    const n = g.notches, cuts = [["отпред ляво", n.bl], ["отпред дясно", n.br], ["отзад ляво", n.tl], ["отзад дясно", n.tr]].filter(c => c[1]);
    const note = "Готов: дъно " + fmt(p.L) + " × " + fmt(p.W) + " мм. " +
      PART_EDGES.filter(([e]) => g.ch[e].segs.length).map(([e, name]) => name + ": " + profileTxt(g.ch[e])).join("; ") + ". " +
      (cuts.length ? "Изрези в ъглите: " + cuts.map(c => c[0] + " " + fmt(c[1][0]) + "×" + fmt(c[1][1])).join(", ") + " мм. " : "") +
      (g.holes.length ? "Отвори: " + g.holes.map(h => fmt(h.w) + "×" + fmt(h.h) + " (на " + fmt(h.x) + " от ляво, " + fmt(h.y) + " от предната линия)").join(", ") + ". " : "") +
      "Корекция: " + fmt(g.b90) + " мм/90°" + (g.ch && Object.values(g.ch).some(c => c.angles.includes(180)) ? ", " + fmt(g.b180) + " мм/180°" : "") + ". Виж схемата.";
    const rows = [{ kind:"sheet", part:p.name, mat:"Лист инокс " + p.th + " мм", size:fmt(g.BW) + " × " + fmt(g.BH), qty:1, note }];
    const bendRows = PART_EDGES.filter(([e]) => g.ch[e].segs.length).map(([e, name]) => {
      const c = g.ch[e];
      return { side:name, profile:profileTxt(c), lines:c.lines.slice().reverse().map(l => fmt(l.fromEdge) + (l.angle === 180 ? " (180°)" : "")).join(" → ") };
    });
    return { g, tag, rows, bendRows, sheets:[{ label:tag, w:g.BW, h:g.BH, th:p.th }], warns:g.warns };
  }
  // client price of a part: like the tables — blank area + bends, with the markup (no welds)
  function partPrice(p){
    const g = partGeo(p);
    return (Math.max(0, g.area) / 1e6 * PRICE.sheetM2 * (p.th / 1.5) + g.bends * PRICE.bend) * (1 + PRICE.markupPct / 100) * p.qty;
  }
  // цената преди отстъпката (маси + детайли + елементи)
  function orderGross(o){
    const t = (o.tables && o.tables.length) ? priceFor({ tables:o.tables.map(normTable) }) : null;
    const parts = (o.parts || []).map(normPart).reduce((a, p) => a + partPrice(p), 0);
    const asms = (o.assemblies || []).map(x => normAsm(x)).reduce((a, x) => a + asmPrice(x), 0);
    return (t ? t.total : 0) + parts + asms;
  }
  // промокодът намалява цялата поръчка (същите кодове като в клиентската форма)
  function orderClientPrice(o){ const g = orderGross(o), pc = promoOf(o.promo); return pc ? g * (1 - pc.pct / 100) : g; }
  // print card of an element: the assembled 3D view, its parts and the welds
  function asmCard(a, ai){
    const r = asmSvg(a, { yaw:-0.55, pitch:0.62 }, { tags:a.items.map((x, j) => asmTag(ai, j)), VW:720, VH:380 }), J = asmJoints(a);
    return '<div class="card asmcard"><h2>Елемент Е' + (ai + 1) + ' · ' + esc(a.name) + (a.qty > 1 ? ' — ' + a.qty + ' бр.' : '') + '</h2>' +
      '<div class="printsum">Габарит: <b>' + r.size.map(v => fmt(v)).join(" × ") + ' мм</b> · детайли: <b>' + a.items.length + '</b> · заварки: <b>' + J.filter(j => j.on).length + '</b>' +
        (a.notes.trim() ? '<br><b>Бележка:</b> ' + esc(a.notes) : '') + '</div>' +
      '<figure class="scheme"><svg viewBox="0 0 ' + r.VW + ' ' + r.VH + '" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif" style="background:#f8fafc">' + r.svg + '</svg>' +
        '<figcaption>Сглобен вид · оранжево = заварка · детайлите са описани поотделно по-долу</figcaption></figure>' +
      '<div class="tw"><table class="cut"><thead><tr><th>Детайл</th><th>Име</th><th>Бр. в елемента</th><th>Позиция X / Y / Z (мм)</th><th>Завъртане</th></tr></thead><tbody>' +
        a.items.map((it, j) => '<tr><td class="size">' + asmTag(ai, j) + '</td><td>' + esc(it.part.name) + '</td><td class="q">' + it.part.qty + '</td><td class="size">' + it.pos.map(v => fmt(v)).join(" / ") +
          '</td><td>' + (it.rot.some(Boolean) ? it.rot.map((v, k) => v ? ["X","Y","Z"][k] + " " + v * 90 + "°" : "").filter(Boolean).join(", ") : "—") + '</td></tr>').join("") + '</tbody></table></div>' +
      (J.length ? '<h3>Заварки</h3><div class="tw"><table class="cut"><thead><tr><th>Свързани</th><th>Допир (мм)</th><th>Заварка</th></tr></thead><tbody>' +
        J.map(j => '<tr><td>' + asmTag(ai, j.a) + ' ↔ ' + asmTag(ai, j.b) + '</td><td class="size">' + fmt(j.len) + '</td><td>' + (j.on ? j.cm + ' см' : 'НЕ') + '</td></tr>').join("") + '</tbody></table></div>' : '') +
      '</div>';
  }

  /* ---------- Конструктор: страница ----------
     Библиотека от детайли (пази се и в облака) + редактор. Детайл от библиотеката се добавя като копие в поръчка;
     детайл от поръчка се редактира тук направо (докато разкроят не е потвърден). */
  var LIB_KEY = "mpr-admin-parts-v1";
  var LIB = (function(){ try{ const d = JSON.parse(localStorage.getItem(LIB_KEY) || "null"); if(d && Array.isArray(d.items)) return { items:d.items.map(normPart), assemblies:(d.assemblies || []).map(x => normAsm(x)) }; }catch(e){} return { items:[], assemblies:[] }; })();
  function saveLib(){ try{ localStorage.setItem(LIB_KEY, JSON.stringify(LIB)); }catch(e){} cloudDirty(); }
  const sideAll = segs => ({ front:segs, back:segs, left:segs, right:segs });
  const PART_TEMPLATES = [
    ["Тава", { name:"Тава", L:1400, W:300, edges:sideAll([{ len:50, dir:"up" }]) }],
    ["Плот с канти", { name:"Плот", L:1400, W:600, edges:{ front:[{ len:30, dir:"down" }, { len:12, dir:"in" }], back:[{ len:100, dir:"up" }, { len:20, dir:"out" }],
      left:[{ len:30, dir:"down" }, { len:12, dir:"in" }], right:[{ len:30, dir:"down" }, { len:12, dir:"in" }] } }],
    ["Рамка с отвор", { name:"Рамка", L:1580, W:550, edges:sideAll([{ len:30, dir:"down" }, { len:10, dir:"in" }]), holes:[{ w:1470, h:350 }] }],
    ["Z-профил", { name:"Z-профил", L:1400, W:20, edges:{ front:[{ len:30, dir:"down" }], back:[{ len:30, dir:"up" }] } }],
    ["Празен детайл", { name:"Детайл", L:1000, W:500 }],
  ];
  var DZ = { mode:"part", p:null, bind:null, libId:null };   // bind = { orderId, pid } when the part belongs to an order; ref = a part inside an assembly
  function dzPart(){
    if(DZ.ref) return DZ.ref();
    if(!DZ.bind) return DZ.p;
    const o = findOrder(DZ.bind.orderId), i = o && o.parts ? o.parts.findIndex(p => p.pid === DZ.bind.pid) : -1;
    if(i < 0) return null;
    if(!o.parts[i].edges || !o.parts[i].edges.front) o.parts[i] = normPart(o.parts[i]);
    return o.parts[i];
  }
  function openDesigner(bind){ DZ = { mode:"part", p:null, bind:bind || null, libId:null }; showPage("designer"); }
  // read-only when the part (or its assembly) belongs to an order whose cut is confirmed
  function dzRO(){
    const o = DZ.bind ? findOrder(DZ.bind.orderId) : (DZ.ref && DZ.asmBind ? findOrder(DZ.asmBind.orderId) : null);
    return !!(o && o.stage !== "new");
  }
  function dzChanged(structural){
    if(DZ.bind || (DZ.ref && DZ.asmBind)){ saveSoon(); renderLists(); }
    if(structural) renderDesigner(); else renderDzPreview();
  }

  var DZSEL = new Set();   // parts ticked in the library
  function renderDzLib(){
    const el = $("dzLib"); if(!el) return;
    [...DZSEL].forEach(id => { if(!LIB.items.some(p => p.pid === id)) DZSEL.delete(id); });
    const nSel = DZSEL.size, targets = byStage("new");
    el.innerHTML = LIB.items.length
      ? '<div class="tw"><table class="cut list dzlib"><thead><tr><th style="width:1%"><input type="checkbox" id="dzSelAll"' + (nSel && nSel === LIB.items.length ? " checked" : "") + ' title="Избери всички"></th><th>Библиотека</th><th>Дъно (мм)</th><th>Заготовка (мм)</th><th>Лист</th><th></th></tr></thead><tbody>' +
        LIB.items.map(p => { const g = partGeo(p);
          return '<tr class="' + (DZ.libId === p.pid && !DZ.bind ? "sel" : "") + '"><td><input type="checkbox" data-libsel="' + esc(p.pid) + '"' + (DZSEL.has(p.pid) ? " checked" : "") + '></td><td><b>' + esc(p.name) + '</b>' + (p.qty > 1 ? ' <span class="muted">× ' + p.qty + '</span>' : '') + '</td><td class="size">' + fmt(p.L) + ' × ' + fmt(p.W) + '</td><td class="size">' + fmt(g.BW) + ' × ' + fmt(g.BH) +
            '</td><td>' + p.th + ' мм</td><td class="acts"><button class="btn small" data-libopen="' + esc(p.pid) + '" type="button">Отвори</button> <button class="btn danger" data-libdel="' + esc(p.pid) + '" type="button">Изтрий</button></td></tr>'; }).join("") +
        '</tbody></table></div>' +
        '<div class="row dzBulk"><span class="muted">' + (nSel ? 'Избрани: <b>' + nSel + '</b>' : 'Отметнете няколко детайла, за да ги разкроите заедно в една поръчка (най-евтино подреждане на листовете).') + '</span>' +
          (nSel ? '<label class="dzTarget">в<select id="dzBulkTarget"><option value="">нова поръчка</option>' +
            targets.map(o => '<option value="' + esc(o.id) + '">' + esc((o.name || "без име") + (o.serial ? " · " + orderSerial(o.serial) : "") + " (Разкрой)") + '</option>').join("") + '</select></label>' +
            '<button class="btn primary" id="dzBulkAdd" type="button">Добави избраните в поръчка</button>' : '') + '</div>'
      : '<div class="muted"><b>Библиотеката е празна.</b> Детайл влиза тук с „Запази в библиотеката“ — най-долу в редактора или от картата на детайла в поръчка (Разкрой → Маси — редакция). Вижда се от всички устройства.</div>';
    el.querySelectorAll("[data-libsel]").forEach(c => c.addEventListener("change", () => { if(c.checked) DZSEL.add(c.dataset.libsel); else DZSEL.delete(c.dataset.libsel); renderDzLib(); }));
    const all = $("dzSelAll"); if(all) all.addEventListener("change", () => { DZSEL = new Set(all.checked ? LIB.items.map(p => p.pid) : []); renderDzLib(); });
    const bulk = $("dzBulkAdd");
    if(bulk) bulk.addEventListener("click", () => {
      const pick = LIB.items.filter(p => DZSEL.has(p.pid)).map(p => { const c = normPart(JSON.parse(JSON.stringify(p))); c.pid = newPid(); return c; });
      const tid = $("dzBulkTarget").value;
      let o = tid ? findOrder(tid) : null;
      if(!o){ o = makeRecord(null, ""); o.tables = []; o.parts = []; ORD.orders.push(o); }
      o.parts = (o.parts || []).concat(pick);
      saveOrders(); DZSEL = new Set();
      SEL.work = o.id; TAB = "print"; showPage("work");
      setStatus("✓ " + pick.length + (pick.length === 1 ? " детайл е добавен" : " детайла са добавени") + " в " + (tid ? "поръчката на " + (o.name || "без име") : "нова поръчка") + " — разкроени заедно. Попълнете клиента в „Маси — редакция“.", "ok");
    });
    el.querySelectorAll("[data-libopen]").forEach(b => b.addEventListener("click", () => {
      const it = LIB.items.find(p => p.pid === b.dataset.libopen); if(!it) return;
      DZ = { p:normPart(JSON.parse(JSON.stringify(it))), bind:null, libId:it.pid }; renderDesigner();
    }));
    el.querySelectorAll("[data-libdel]").forEach(b => b.addEventListener("click", () => {
      if(b.dataset.armed !== "1"){ b.dataset.armed = "1"; b.textContent = "Сигурно? Натисни пак"; return; }
      LIB.items = LIB.items.filter(p => p.pid !== b.dataset.libdel); if(DZ.libId === b.dataset.libdel) DZ.libId = null;
      saveLib(); renderDesigner();
    }));
  }

  function renderDesigner(){
    if(!$("dzEditor")) return;
    $("dzModes").innerHTML = [["part","Детайл"],["asm","Сглобка (елемент)"]].map(m => '<button class="tab' + ((DZ.mode || "part") === m[0] ? ' active' : '') + '" data-dzmode="' + m[0] + '" type="button">' + m[1] + '</button>').join("");
    $("dzModes").querySelectorAll("[data-dzmode]").forEach(b => b.addEventListener("click", () => {
      if((DZ.mode || "part") === b.dataset.dzmode && !DZ.ref) return;
      DZ = b.dataset.dzmode === "asm" ? { mode:"asm", asm:null, asmBind:null, asmLibId:null, asmSel:null, p:null, bind:null } : { mode:"part", p:null, bind:null, libId:null };
      renderDesigner();
    }));
    if(DZ.mode === "asm" && !DZ.ref){ renderAsmEditor(); return; }
    const p = dzPart(), bound = DZ.bind ? findOrder(DZ.bind.orderId) : null, ro = dzRO();
    if(DZ.bind && !p){ DZ = { mode:"part", p:null, bind:null, libId:null }; }
    $("dzBind").innerHTML = DZ.ref ? '<div class="note">Детайл от сглобка' + (DZ.asmBind ? ' в поръчка' : '') + (ro ? ' — само за преглед.' : ' — промените влизат в сглобката.') +
      ' <button class="btn small" id="dzBackAsm" type="button">← Към сглобката</button></div>' : bound && p ? '<div class="note">Детайл от поръчка <b>' + esc(serTxt(bound) + (bound.name ? " · " + bound.name : "")) + '</b>' +
      (ro ? ' — разкроят е потвърден, затова е само за преглед.' : ' — промените се записват направо в поръчката.') +
      ' <button class="btn small" id="dzBack" type="button">← Към поръчката</button></div>' : '';
    $("dzTop").innerHTML = (bound || DZ.ref) ? '' : '<span class="muted">Нов детайл от шаблон:</span> ' + PART_TEMPLATES.map((t, i) => '<button class="btn small" data-tpl="' + i + '" type="button">+ ' + esc(t[0]) + '</button>').join(" ");
    renderDzLib();
    $("dzTop").querySelectorAll("[data-tpl]").forEach(b => b.addEventListener("click", () => {
      DZ = { p:normPart(JSON.parse(JSON.stringify(PART_TEMPLATES[+b.dataset.tpl][1]))), bind:null, libId:null }; renderDesigner();
    }));
    const backA = $("dzBackAsm"); if(backA) backA.addEventListener("click", () => { DZ.mode = "asm"; DZ.ref = null; renderDesigner(); });
    const back = $("dzBack"); if(back) back.addEventListener("click", () => { SEL.work = bound.stage === "new" ? bound.id : SEL.work; if(bound.stage === "processing") SEL.processing = bound.id; showPage(bound.stage === "processing" ? "processing" : "work"); });
    if(!p){ $("dzEditor").innerHTML = '<div class="card"><div class="empty">Изберете шаблон или детайл от библиотеката, за да започнете.</div></div>'; return; }

    DZ.pop = null; DZ.pick = null;
    const dis = ro ? " disabled" : "";
    const num = (f, label, extra) => '<label>' + label + '<input type="number" data-f="' + f + '" value="' + esc(p[f] || (f === "bd90" || f === "bd180" ? "" : p[f])) + '"' + (extra || "") + dis + '></label>';
    let h = '<div class="card"><h2>3D модел</h2>' +
      '<div class="dz3dWrap" id="dz3dWrap"><svg id="dz3d" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif"></svg><div class="dzPop" id="dzPop" hidden></div></div>' +
      '<div class="row dzViews"><span class="muted">' + (ro ? 'Влачете, за да завъртите.' : 'Влачете, за да завъртите · <b>⊕</b> в края на страна добавя перо · клик върху перо = промяна или изтриване') + '</span>' +
      '<span class="dzViewBtns">' + [["iso","3D"],["front","отпред"],["side","отстрани"],["top","отгоре"],["under","отдолу"]].map(v => '<button class="btn small" type="button" data-view="' + v[0] + '">' + v[1] + '</button>').join("") + '</span></div></div>' +
      '<div class="card"><h2>Детайл</h2><div class="grid">' +
      '<label>Име<input type="text" data-f="name" value="' + esc(p.name) + '"' + dis + '></label>' +
      num("qty", "Брой", ' min="1" step="1"') + num("th", 'Дебелина на листа <span class="u">(мм)</span>', ' min="0.5" step="0.1"') +
      num("L", 'Дъно — дължина <span class="u">(мм, външно)</span>', ' min="0" step="1"') + num("W", 'Дъно — ширина <span class="u">(мм, външно)</span>', ' min="0" step="1"') +
      num("bd90", 'Корекция 90° <span class="u">(мм/огъване)</span>', ' min="0" step="0.1" placeholder="' + esc(S.bd90) + '"') +
      num("bd180", 'Корекция 180° <span class="u">(мм/подгъвка)</span>', ' min="0" step="0.1" placeholder="' + esc(S.bd180) + '"') +
      '</div><label style="margin-top:10px">Бележка<textarea rows="2" data-f="notes"' + dis + '>' + esc(p.notes) + '</textarea></label>' +
      '<h3>Огъвания по страните <span class="u">— от дъното навън; размерите са външни, като на чертеж</span></h3><div class="edges">';
    PART_EDGES.forEach(([e, name]) => {
      const along = e === "front" || e === "back" ? "по дължината" : "по ширината";
      h += '<div class="edge" data-e="' + e + '"><div class="edgeh"><b>' + name + '</b> <span class="muted">(' + along + ')</span></div>' +
        (p.edges[e].length ? p.edges[e].map((s, i) => '<div class="segrow" data-i="' + i + '"><span class="segn">' + (i + 1) + '.</span>' +
          '<input type="number" min="0" step="1" data-s="len" value="' + esc(s.len) + '"' + dis + '> мм ' +
          '<select data-s="dir"' + dis + '>' + Object.keys(PART_DIRS).map(d => '<option value="' + d + '"' + (s.dir === d ? " selected" : "") + '>' + PART_DIRS[d] + '</option>').join("") + '</select>' +
          (ro ? '' : '<button class="btn danger" data-segdel type="button">✕</button>') + '</div>').join("") : '<div class="muted">без огъване</div>') +
        (ro ? '' : '<button class="btn small" data-segadd type="button">+ огъване</button>') + '</div>';
    });
    h += '</div><h3>Отвори в дъното <span class="u">— празна позиция = в средата; позицията е от лявата и от предната линия на огъване</span></h3>' +
      p.holes.map((o, i) => '<div class="segrow hole" data-hi="' + i + '">' +
        ['w','h','x','y'].map(k => '<label>' + ({ w:"ширина", h:"височина", x:"от ляво", y:"отпред" })[k] + '<input type="number" min="0" step="1" data-h="' + k + '" value="' + esc(o[k] == null ? "" : o[k]) + '"' + (k === "x" || k === "y" ? ' placeholder="среда"' : '') + dis + '></label>').join("") +
        (ro ? '' : '<button class="btn danger" data-holedel type="button">✕</button>') + '</div>').join("") +
      (ro ? '' : '<button class="btn small" id="dzHoleAdd" type="button">+ отвор</button>') + '</div>' +
      '<div class="card"><h2>Заготовка и схема</h2><div id="dzPrev"></div></div>';
    // actions
    h += '<div class="card noprint"><div class="actions" style="justify-content:flex-start;margin-top:0">';
    if(DZ.ref){
      h += '<button class="btn" id="dzToLib" type="button">Запази копие в библиотеката</button>' +
        '<button class="btn primary" id="dzDoneAsm" type="button">Готово — към сглобката</button>';
    }else if(bound){
      h += '<button class="btn" id="dzToLib" type="button">Запази копие в библиотеката</button>' +
        '<button class="btn primary" id="dzDone" type="button">Готово — към поръчката</button>';
    }else{
      const targets = byStage("new");
      h += '<button class="btn" id="dzSave" type="button">' + (DZ.libId ? 'Запази промените в библиотеката' : 'Запази в библиотеката') + '</button>' +
        '<label class="dzTarget">Добави в<select id="dzTarget"><option value="">нова поръчка</option>' +
          targets.map(o => '<option value="' + esc(o.id) + '">' + esc((o.name || "без име") + (o.serial ? " · " + orderSerial(o.serial) : "") + " (Разкрой)") + '</option>').join("") + '</select></label>' +
        '<button class="btn primary" id="dzAdd" type="button">Добави в поръчка</button>';
    }
    h += '</div><div class="status" id="dzStatus"></div></div>';
    $("dzEditor").innerHTML = h;
    bindDz3D();
    renderDzPreview();
    const ed = $("dzEditor");
    // fields
    ed.querySelectorAll("[data-f]").forEach(inp => inp.addEventListener("input", () => {
      const f = inp.dataset.f;
      if(f === "name" || f === "notes") p[f] = inp.value;
      else if(f === "qty") p.qty = Math.max(1, Math.round(+inp.value || 1));
      else if(f === "th") p.th = +inp.value > 0 ? +inp.value : 1.5;
      else p[f] = Math.max(0, +inp.value || 0);
      dzChanged(false);
    }));
    ed.querySelectorAll(".edge").forEach(box => {
      const e = box.dataset.e;
      box.querySelectorAll(".segrow").forEach(row => {
        const i = +row.dataset.i;
        row.querySelectorAll("[data-s]").forEach(inp => inp.addEventListener("input", () => {
          const s = p.edges[e][i]; if(!s) return;
          if(inp.dataset.s === "len") s.len = Math.max(0, +inp.value || 0); else s.dir = inp.value;
          dzChanged(false);
        }));
        const del = row.querySelector("[data-segdel]"); if(del) del.addEventListener("click", () => { p.edges[e].splice(i, 1); dzChanged(true); });
      });
      const add = box.querySelector("[data-segadd]");
      if(add) add.addEventListener("click", () => {
        const last = p.edges[e][p.edges[e].length - 1];
        // a sensible next direction: after up/down go inward, after a horizontal segment go down
        p.edges[e].push({ len:last ? 10 : 30, dir:!last ? "up" : (isVertDir(last.dir) ? "in" : "down") });
        dzChanged(true);
      });
    });
    ed.querySelectorAll(".hole").forEach(row => {
      const i = +row.dataset.hi;
      row.querySelectorAll("[data-h]").forEach(inp => inp.addEventListener("input", () => {
        const k = inp.dataset.h, v = inp.value.trim();
        p.holes[i][k] = (k === "x" || k === "y") && v === "" ? null : Math.max(0, +v || 0);
        dzChanged(false);
      }));
      const del = row.querySelector("[data-holedel]"); if(del) del.addEventListener("click", () => { p.holes.splice(i, 1); dzChanged(true); });
    });
    const ha = $("dzHoleAdd"); if(ha) ha.addEventListener("click", () => { p.holes.push({ w:Math.round(p.L / 2), h:Math.round(p.W / 2), x:null, y:null }); dzChanged(true); });
    const msg = (m, k) => { const el = $("dzStatus"); el.className = "status " + (k || ""); el.textContent = m; };
    const saveToLib = asCopy => {
      const copy = normPart(JSON.parse(JSON.stringify(p)));
      if(!asCopy && DZ.libId && LIB.items.some(x => x.pid === DZ.libId)){ copy.pid = DZ.libId; LIB.items = LIB.items.map(x => x.pid === DZ.libId ? copy : x); }
      else{ copy.pid = newPid(); LIB.items.push(copy); if(!asCopy) DZ.libId = copy.pid; }
      saveLib(); renderDzLib(); msg("✓ Запазено в библиотеката: „" + copy.name + "“.", "ok");
    };
    if($("dzSave")) $("dzSave").addEventListener("click", () => { saveToLib(false); const b = $("dzSave"); if(b) b.textContent = "Запази промените в библиотеката"; });
    if($("dzToLib")) $("dzToLib").addEventListener("click", () => saveToLib(true));
    if($("dzDone")) $("dzDone").addEventListener("click", () => { $("dzBack") && $("dzBack").click(); });
    if($("dzDoneAsm")) $("dzDoneAsm").addEventListener("click", () => { $("dzBackAsm").click(); });
    if($("dzAdd")) $("dzAdd").addEventListener("click", () => {
      const copy = normPart(JSON.parse(JSON.stringify(p))); copy.pid = newPid();
      const tid = $("dzTarget").value;
      let o = tid ? findOrder(tid) : null;
      if(!o){ o = makeRecord(null, ""); o.tables = []; o.parts = []; o.name = ""; ORD.orders.push(o); }
      o.parts = (o.parts || []).concat([copy]);
      saveOrders();
      SEL.work = o.id; TAB = "print"; showPage("work");
      setStatus("✓ „" + copy.name + "“ е добавен в " + (tid ? "поръчката на " + (o.name || "без име") : "нова поръчка — попълнете клиента в „Маси — редакция“") + ".", "ok");
    });
  }
  function renderDzPreview(){
    renderDz3D();
    const el = $("dzPrev"), p = dzPart(); if(!el || !p) return;
    const g = partGeo(p), n = g.notches;
    const cuts = [["отпред ляво", n.bl], ["отпред дясно", n.br], ["отзад ляво", n.tl], ["отзад дясно", n.tr]].filter(c => c[1]);
    el.innerHTML = '<div class="totals">' +
      tot("Заготовка", fmt(g.BW) + " × " + fmt(g.BH) + " мм", "лист " + p.th + " мм · " + p.qty + " бр.") +
      tot("Огъвания", g.bends + " бр.", "корекция " + fmt(g.b90) + " мм/90°" + (g.b180 ? ", " + fmt(g.b180) + " мм/180°" : "")) +
      tot("Тегло", g.kg.toFixed(1) + " кг/бр.", "по заготовката, без изрезите") +
      tot("Цена за клиента", eur2(partPrice(p)), "площ + огъвания, с надценката" + (p.qty > 1 ? " · за " + p.qty + " бр." : "")) +
      '</div>' +
      g.warns.map(w => '<div class="warnbox">⚠ ' + esc(w) + '</div>').join("") +
      (cuts.length ? '<div class="muted" style="margin-top:8px">Изрези в ъглите: ' + esc(cuts.map(c => c[0] + " " + fmt(c[1][0]) + "×" + fmt(c[1][1]) + " мм").join(", ")) + '</div>' : '') +
      (PART_EDGES.some(([e]) => g.ch[e].segs.length) ? '<div class="tw"><table class="cut bends" style="margin-top:8px"><thead><tr><th>Страна</th><th>Профил</th><th>Линии на огъване от ръба на заготовката (мм)</th></tr></thead><tbody>' +
        PART_EDGES.filter(([e]) => g.ch[e].segs.length).map(([e, name]) => '<tr><td>' + name + '</td><td>' + esc(profileTxt(g.ch[e])) + '</td><td class="size">' +
          esc(g.ch[e].lines.slice().reverse().map(l => fmt(l.fromEdge) + (l.angle === 180 ? " (180°)" : "")).join(" → ")) + '</td></tr>').join("") + '</tbody></table></div>' : '') +
      '<div class="schemes" style="margin-top:10px">' + partSvg(p, g) + '</div>';
  }

  /* ---------- Конструктор: 3D модел (въртене с влачене, ⊕ за ново перо, клик върху перо = промяна) ----------
     Детайлът се сгъва в 3D от същите данни: дъно в равнината z=0 (x по дължината, y по ширината, отпред y=0),
     всяко перо е правоъгълник по ръба на предишния. Рисува се като SVG (без библиотеки) — по-далечните стени първи. */
  const EDGE_FRAMES = {
    front:{ a:p => [0, 0, 0], b:p => [p.L, 0, 0], out:[0, -1, 0] },
    back: { a:p => [0, p.W, 0], b:p => [p.L, p.W, 0], out:[0, 1, 0] },
    left: { a:p => [0, 0, 0], b:p => [0, p.W, 0], out:[-1, 0, 0] },
    right:{ a:p => [p.L, 0, 0], b:p => [p.L, p.W, 0], out:[1, 0, 0] },
  };
  const v3 = { add:(a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul:(a, k) => [a[0] * k, a[1] * k, a[2] * k],
    sub:(a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross:(a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] };
  function partFaces(p, g){
    const faces = [], ends = {};
    faces.push({ kind:"base", pts:[[0, 0, 0], [p.L, 0, 0], [p.L, p.W, 0], [0, p.W, 0]],
      holes:g.holes.map(h => { const x0 = h.x + (p.L - g.Lf) / 2, y0 = h.y + (p.W - g.Wf) / 2;
        return [[x0, y0, 0], [x0 + h.w, y0, 0], [x0 + h.w, y0 + h.h, 0], [x0, y0 + h.h, 0]]; }) });
    PART_EDGES.forEach(([e]) => {
      const F = EDGE_FRAMES[e], out = F.out;
      const dirv = { out, in:v3.mul(out, -1), up:[0, 0, 1], down:[0, 0, -1] };
      let A = F.a(p), B = F.b(p), prev = "out";
      (p.edges[e] || []).forEach((s, i) => {
        if(!(+s.len > 0)) return;
        if(bendAngle(prev, s.dir) === 180){   // a hem lies against the previous wall: show it a little apart
          const off = isVertDir(s.dir) ? v3.mul(out, -3 * p.th) : [0, 0, 3 * p.th];
          A = v3.add(A, off); B = v3.add(B, off);
        }
        const d = v3.mul(dirv[s.dir], +s.len), A2 = v3.add(A, d), B2 = v3.add(B, d);
        faces.push({ kind:"seg", edge:e, i, pts:[A, B, B2, A2] });
        A = A2; B = B2; prev = s.dir;
      });
      const lastDir = (p.edges[e] || []).filter(s => +s.len > 0).slice(-1)[0];
      ends[e] = { mid:v3.mul(v3.add(A, B), 0.5), push:lastDir ? dirv[lastDir.dir] : out };
    });
    return { faces, ends };
  }
  function renderDz3D(){
    const wrap = $("dz3dWrap"), p = dzPart(); if(!wrap || !p) return;
    const g = partGeo(p), ro = dzRO();
    const V = DZ.view || (DZ.view = { yaw:-0.55, pitch:0.62 });
    const { faces, ends } = partFaces(p, g);
    const cx = p.L / 2, cy = p.W / 2, cyw = Math.cos(V.yaw), syw = Math.sin(V.yaw), cp = Math.cos(V.pitch), sp = Math.sin(V.pitch);
    const pr = q => { const x = q[0] - cx, y = q[1] - cy, z = q[2];
      const x1 = x * cyw - y * syw, y1 = x * syw + y * cyw;
      return [x1, -(z * cp + y1 * sp), y1 * cp - z * sp]; };
    const proj = faces.map(f => ({ f, P:f.pts.map(pr), H:(f.holes || []).map(h => h.map(pr)) }));
    const all = proj.flatMap(q => q.P);
    PART_EDGES.forEach(([e]) => all.push(pr(ends[e].mid)));
    if(!all.length) return;
    const minX = Math.min(...all.map(q => q[0])), maxX = Math.max(...all.map(q => q[0])), minY = Math.min(...all.map(q => q[1])), maxY = Math.max(...all.map(q => q[1]));
    const VW = 640, VH = 400, pad = 46, k = Math.min((VW - 2 * pad) / Math.max(1, maxX - minX), (VH - 2 * pad) / Math.max(1, maxY - minY));
    const ox = (VW - (maxX - minX) * k) / 2, oy = (VH - (maxY - minY) * k) / 2;
    const sx = q => (ox + (q[0] - minX) * k).toFixed(1), sy = q => (oy + (q[1] - minY) * k).toFixed(1);
    // light from the upper front-left; both sides of a sheet are drawn
    const L = [-0.35, -0.5, 0.8], ln = Math.hypot(...L);
    const shade = (pts, sel) => {
      const n = v3.cross(v3.sub(pts[1], pts[0]), v3.sub(pts[3], pts[0])), nl = Math.hypot(...n) || 1;
      const lit = Math.abs((n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / nl / ln);
      const l = Math.round(64 + lit * 26);
      return sel ? "hsl(214,85%," + Math.min(80, l - 6) + "%)" : "hsl(210,22%," + l + "%)";
    };
    proj.forEach(q => { q.depth = q.P.reduce((a, r) => a + r[2], 0) / q.P.length + (q.f.kind === "base" ? 0.01 : 0); });
    proj.sort((a, b) => b.depth - a.depth);
    const selKey = DZ.pick ? DZ.pick.edge + ":" + DZ.pick.i : "";
    let svg = '<rect x="0" y="0" width="' + VW + '" height="' + VH + '" fill="transparent" data-bg="1"/>';
    proj.forEach(q => {
      const d = 'M' + q.P.map(r => sx(r) + ',' + sy(r)).join(' L') + ' Z' + q.H.map(h => ' M' + h.map(r => sx(r) + ',' + sy(r)).join(' L') + ' Z').join('');
      const sel = q.f.kind === "seg" && selKey === q.f.edge + ":" + q.f.i;
      svg += '<path d="' + d + '" fill-rule="evenodd" fill="' + shade(q.f.pts, sel) + '" stroke="' + (sel ? "#1552c7" : "#4a6785") + '" stroke-width="' + (sel ? 2.2 : 1) + '" stroke-linejoin="round"' +
        (q.f.kind === "seg" ? ' class="dzseg" data-edge="' + q.f.edge + '" data-i="' + q.f.i + '"' : '') + '/>';
    });
    // side names and the ⊕ handles at the free end of every side
    PART_EDGES.forEach(([e, name]) => {
      const E = ends[e], tip = pr(v3.add(E.mid, v3.mul(E.push, 22 / k)));
      if(!ro) svg += '<g class="dzplus" data-edge="' + e + '"><circle cx="' + sx(tip) + '" cy="' + sy(tip) + '" r="12" fill="#1E6FF4" stroke="#fff" stroke-width="2"/>' +
        '<text x="' + sx(tip) + '" y="' + (+sy(tip) + 5).toFixed(1) + '" text-anchor="middle" font-size="17" font-weight="700" fill="#fff">+</text></g>';
      const lab = pr(v3.add(E.mid, v3.mul(EDGE_FRAMES[e].out, 60 / k)));
      svg += '<text x="' + sx(lab) + '" y="' + sy(lab) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#64748b" style="paint-order:stroke;stroke:#f8fafc;stroke-width:3px" pointer-events="none">' + name.toUpperCase() + '</text>';
    });
    wrap.querySelector("svg").setAttribute("viewBox", "0 0 " + VW + " " + VH);
    wrap.querySelector("svg").innerHTML = svg;
    wrap.dataset.vw = VW;
    if(DZ.pop) placeDzPop();
  }
  // the little menu next to a ⊕ or a selected wall
  function openDzPop(kind, edge, i, at){
    DZ.pop = { kind, edge, i, at }; DZ.pick = kind === "seg" ? { edge, i } : null;
    const p = dzPart(), pop = $("dzPop"), name = (PART_EDGES.find(x => x[0] === edge) || [, ""])[1];
    const segs = p.edges[edge], last = kind === "add" ? segs.filter(s => +s.len > 0).slice(-1)[0] : (i > 0 ? segs[i - 1] : null);
    const cur = kind === "seg" ? segs[i] : null, prevDir = last ? last.dir : "out";
    const len = cur ? cur.len : (last ? (isVertDir(last.dir) ? 12 : 30) : 30);
    pop.innerHTML = '<div class="dzPopH">' + esc(name) + (kind === "add" ? ' — ново перо' : ' — перо ' + (i + 1)) + '<button type="button" class="dzPopX" data-pop="close">✕</button></div>' +
      '<label>Дължина <span class="u">(мм, външно)</span><input type="number" min="1" step="1" id="dzPopLen" value="' + esc(len) + '"></label>' +
      '<div class="dzPopDirs">' + Object.keys(PART_DIRS).map(d => {
        const a = bendAngle(prevDir, d), same = a === 0;
        return '<button type="button" class="btn small' + (cur && cur.dir === d ? ' primary' : '') + '" data-dir="' + d + '"' + (same ? ' disabled title="същата посока като предишното"' : '') + '>' +
          PART_DIRS[d] + (a === 180 ? '<span class="u"> 180°</span>' : '') + '</button>'; }).join("") + '</div>' +
      (kind === "seg" ? '<button type="button" class="btn danger" data-pop="del">Изтрий перото' + (i < segs.length - 1 ? ' (и следващите)' : '') + '</button>' : '<div class="muted">Изберете посока — перото се добавя в края на страната.</div>');
    pop.hidden = false; placeDzPop();
    pop.querySelectorAll("[data-dir]").forEach(b => b.addEventListener("click", () => {
      const L = Math.max(1, Math.round(+$("dzPopLen").value || len));
      if(kind === "add") segs.push({ len:L, dir:b.dataset.dir });
      else{ cur.len = L; cur.dir = b.dataset.dir; }
      closeDzPop(); dzChanged(true);
    }));
    $("dzPopLen").addEventListener("keydown", e => { if(e.key === "Enter" && cur){ cur.len = Math.max(1, Math.round(+e.target.value || cur.len)); closeDzPop(); dzChanged(true); } });
    $("dzPopLen").addEventListener("change", e => { if(cur){ cur.len = Math.max(1, Math.round(+e.target.value || cur.len)); dzChanged(false); } });
    const del = pop.querySelector('[data-pop="del"]'); if(del) del.addEventListener("click", () => { segs.splice(i); closeDzPop(); dzChanged(true); });
    pop.querySelector('[data-pop="close"]').addEventListener("click", () => { closeDzPop(); renderDz3D(); });
    if(kind === "seg") renderDz3D();
  }
  function closeDzPop(){ DZ.pop = null; DZ.pick = null; const pop = $("dzPop"); if(pop) pop.hidden = true; }
  function placeDzPop(){
    const pop = $("dzPop"), wrap = $("dz3dWrap"); if(!pop || !wrap || !DZ.pop) return;
    const svg = wrap.querySelector("svg"), r = svg.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), s = r.width / (+wrap.dataset.vw || 640);
    let x = r.left - wr.left + DZ.pop.at[0] * s + 14, y = r.top - wr.top + DZ.pop.at[1] * s - 20;
    x = Math.max(4, Math.min(x, wr.width - 250)); y = Math.max(4, Math.min(y, wr.height - 60));
    pop.style.left = x + "px"; pop.style.top = y + "px";
  }
  // drag = rotate; a click on ⊕ / a wall opens the menu (the 3D container is created once per editor render)
  function bindDz3D(){
    const wrap = $("dz3dWrap"); if(!wrap) return;
    const svg = wrap.querySelector("svg"), ro = dzRO();
    let drag = null;
    const vb = e => { const r = svg.getBoundingClientRect(), s = (+wrap.dataset.vw || 640) / r.width; return [(e.clientX - r.left) * s, (e.clientY - r.top) * s]; };
    svg.addEventListener("pointerdown", e => { drag = { x:e.clientX, y:e.clientY, yaw:DZ.view.yaw, pitch:DZ.view.pitch, moved:false, target:e.target, at:vb(e) }; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener("pointermove", e => {
      if(!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if(!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      DZ.view.yaw = drag.yaw + dx * 0.01;
      DZ.view.pitch = Math.max(-1.5, Math.min(1.5, drag.pitch + dy * 0.01));
      renderDz3D();
    });
    svg.addEventListener("pointerup", () => {
      const d = drag; drag = null;
      if(!d || d.moved || ro) return;
      const plus = d.target.closest && d.target.closest(".dzplus"), seg = d.target.closest && d.target.closest(".dzseg");
      if(plus) openDzPop("add", plus.dataset.edge, -1, d.at);
      else if(seg) openDzPop("seg", seg.dataset.edge, +seg.dataset.i, d.at);
      else if(DZ.pop){ closeDzPop(); renderDz3D(); }
    });
    wrap.parentElement.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => {
      DZ.view = ({ iso:{ yaw:-0.55, pitch:0.62 }, front:{ yaw:0, pitch:0.12 }, side:{ yaw:-1.5708, pitch:0.12 }, top:{ yaw:0, pitch:1.5 }, under:{ yaw:-0.55, pitch:-0.5 } })[b.dataset.view];
      closeDzPop(); renderDz3D();
    }));
  }

  /* ---------- Сглобка (елемент): детайли, наредени един до друг в 3D ----------
     Всеки детайл в сглобката има позиция (мм) и завъртане (стъпки по 90° около X, Y, Z). „Постави до“ слага
     детайла плътно до друг (от избрана страна, подравнен в центъра / началото / края). Детайли, чиито габарити
     се допират, се заваряват по подразбиране — всяка заварка може да се изключи или да ѝ се смени дължината. */
  const ASM_SIDES = { left:["ляво", 0, -1], right:["дясно", 0, 1], front:["отпред", 1, -1], back:["отзад", 1, 1], below:["отдолу", 2, -1], above:["отгоре", 2, 1] };
  const ASM_ALIGN = { center:"в центъра", start:"от началото", end:"от края" };
  const ASM_HUES = [210, 28, 145, 280, 0, 185, 50, 320];
  const newAid = () => "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const newIid = () => "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  function normAsm(x){
    const a = x || {};
    return { aid:a.aid || newAid(), name:String(a.name || "Елемент"), qty:Math.max(1, Math.round(+a.qty || 1)),
      items:(a.items || []).map(it => ({ iid:it.iid || newIid(), part:normPart(it.part), pos:[0, 1, 2].map(k => +((it.pos || [])[k]) || 0),
        rot:[0, 1, 2].map(k => ((Math.round(+((it.rot || [])[k]) || 0) % 4) + 4) % 4) })),
      welds:Object.assign({}, a.welds || {}), notes:String(a.notes || "") };
  }
  // quarter turns around X, then Y, then Z
  function rotQ(q, r){
    let x = q[0], y = q[1], z = q[2], t;
    for(let k = 0; k < r[0]; k++){ t = y; y = -z; z = t; }
    for(let k = 0; k < r[1]; k++){ t = x; x = z; z = -t; }
    for(let k = 0; k < r[2]; k++){ t = x; x = -y; y = t; }
    return [x, y, z];
  }
  function itemFaces(it){
    const g = partGeo(it.part), { faces } = partFaces(it.part, g), T = q => v3.add(rotQ(q, it.rot), it.pos);
    return faces.map(f => Object.assign({}, f, { pts:f.pts.map(T), holes:(f.holes || []).map(h => h.map(T)) }));
  }
  function boxOf(pts){
    const mn = [0, 1, 2].map(k => Math.min(...pts.map(q => q[k]))), mx = [0, 1, 2].map(k => Math.max(...pts.map(q => q[k])));
    return { min:mn, max:mx };
  }
  const itemBox = it => boxOf(itemFaces(it).flatMap(f => f.pts));
  // put `it` right next to `target`, on `side`, aligned on the other two axes
  function placeNext(it, target, side, align){
    const T = itemBox(target); it.pos = [0, 0, 0]; const M = itemBox(it);
    const [, ax, sg] = ASM_SIDES[side];
    const pos = [0, 0, 0];
    pos[ax] = sg > 0 ? T.max[ax] - M.min[ax] : T.min[ax] - M.max[ax];
    [0, 1, 2].filter(k => k !== ax).forEach(k => {
      pos[k] = align === "start" ? T.min[k] - M.min[k] : align === "end" ? T.max[k] - M.max[k] : (T.min[k] + T.max[k]) / 2 - (M.min[k] + M.max[k]) / 2;
    });
    it.pos = pos.map(v => Math.round(v * 10) / 10);
  }
  const pairKey = (a, b) => a < b ? a + "|" + b : b + "|" + a;
  // parts whose outlines touch (gap ≤ 1 mm on one axis, overlapping on the other two) = a joint, welded unless switched off
  function asmJoints(asm){
    const boxes = asm.items.map(it => ({ it, b:itemBox(it) })), out = [];
    for(let i = 0; i < boxes.length; i++) for(let j = i + 1; j < boxes.length; j++){
      const A = boxes[i].b, B = boxes[j].b;
      for(let ax = 0; ax < 3; ax++){
        const gap = Math.max(A.min[ax] - B.max[ax], B.min[ax] - A.max[ax]);
        const ov = [0, 1, 2].filter(k => k !== ax).map(k => Math.min(A.max[k], B.max[k]) - Math.max(A.min[k], B.min[k]));
        if(Math.abs(gap) <= 1 && ov.every(v => v > 0)){
          const key = pairKey(boxes[i].it.iid, boxes[j].it.iid), w = asm.welds[key] || {};
          // the joint marker: on the touching faces, in the middle of the overlap
          const mid = [0, 1, 2].map(k => k === ax ? (A.max[k] <= B.min[k] + 1 ? (A.max[k] + B.min[k]) / 2 : (B.max[k] + A.min[k]) / 2)
            : (Math.max(A.min[k], B.min[k]) + Math.min(A.max[k], B.max[k])) / 2);
          out.push({ key, a:i, b:j, ax, len:Math.max(...ov), on:w.on !== false, cm:+w.cm > 0 ? +w.cm : 12, mid });
          break;
        }
      }
    }
    return out;
  }
  const asmTag = (ai, j) => "Е" + (ai + 1) + "." + (j + 1);
  // the parts of an element as cut-list parts (quantity × number of elements)
  function asmCutParts(asm, ai){
    return asm.items.map((it, j) => Object.assign(normPart(JSON.parse(JSON.stringify(it.part))), { qty:it.part.qty * asm.qty, tag:asmTag(ai, j) }));
  }
  function asmPrice(asm){
    const m = 1 + PRICE.markupPct / 100;
    const parts = asm.items.reduce((a, it) => a + partPrice(Object.assign({}, it.part, { qty:it.part.qty })), 0);
    const welds = asmJoints(asm).filter(j => j.on).reduce((a, j) => a + j.cm * (+S.weldPerCm || 0), 0) * m;
    return (parts + welds) * asm.qty;
  }
  // the whole element in 3D (one colour per part, joints marked); `opts.sel` = selected item id
  function asmSvg(asm, V, opts){
    opts = opts || {};
    const all = [];
    asm.items.forEach((it, idx) => itemFaces(it).forEach(f => all.push({ f, idx })));
    if(!all.length) return { svg:'', VW:640, VH:400 };
    const pts = all.flatMap(q => q.f.pts), B = boxOf(pts), c = [0, 1, 2].map(k => (B.min[k] + B.max[k]) / 2);
    const cyw = Math.cos(V.yaw), syw = Math.sin(V.yaw), cp = Math.cos(V.pitch), sp = Math.sin(V.pitch);
    const pr = q => { const x = q[0] - c[0], y = q[1] - c[1], z = q[2] - c[2];
      const x1 = x * cyw - y * syw, y1 = x * syw + y * cyw; return [x1, -(z * cp + y1 * sp), y1 * cp - z * sp]; };
    const P = all.map(q => ({ q, P:q.f.pts.map(pr), H:(q.f.holes || []).map(h => h.map(pr)) }));
    const flat = P.flatMap(r => r.P);
    const minX = Math.min(...flat.map(r => r[0])), maxX = Math.max(...flat.map(r => r[0])), minY = Math.min(...flat.map(r => r[1])), maxY = Math.max(...flat.map(r => r[1]));
    const VW = opts.VW || 640, VH = opts.VH || 400, pad = 40, k = Math.min((VW - 2 * pad) / Math.max(1, maxX - minX), (VH - 2 * pad) / Math.max(1, maxY - minY));
    const ox = (VW - (maxX - minX) * k) / 2, oy = (VH - (maxY - minY) * k) / 2;
    const sx = r => (ox + (r[0] - minX) * k).toFixed(1), sy = r => (oy + (r[1] - minY) * k).toFixed(1);
    const L = [-0.35, -0.5, 0.8], ln = Math.hypot(...L);
    P.forEach(r => { r.depth = r.P.reduce((a, p) => a + p[2], 0) / r.P.length; });
    P.sort((a, b) => b.depth - a.depth);
    let svg = '<rect x="0" y="0" width="' + VW + '" height="' + VH + '" fill="transparent"/>';
    P.forEach(r => {
      const f = r.q.f, n = v3.cross(v3.sub(f.pts[1], f.pts[0]), v3.sub(f.pts[3], f.pts[0])), nl = Math.hypot(...n) || 1;
      const lit = Math.abs((n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / nl / ln), l = Math.round(60 + lit * 28);
      const it = asm.items[r.q.idx], sel = opts.sel === it.iid, hue = ASM_HUES[r.q.idx % ASM_HUES.length];
      const d = 'M' + r.P.map(p => sx(p) + ',' + sy(p)).join(' L') + ' Z' + r.H.map(h => ' M' + h.map(p => sx(p) + ',' + sy(p)).join(' L') + ' Z').join('');
      svg += '<path d="' + d + '" fill-rule="evenodd" fill="hsl(' + hue + ',' + (sel ? 70 : 30) + '%,' + l + '%)" stroke="' + (sel ? '#1e293b' : 'hsl(' + hue + ',35%,32%)') + '" stroke-width="' + (sel ? 1.8 : 0.9) + '"' +
        (opts.interactive ? ' class="asmface" data-iid="' + it.iid + '"' : '') + '/>';
    });
    asmJoints(asm).filter(j => j.on).forEach(j => { const m = pr(j.mid);
      svg += '<circle cx="' + sx(m) + '" cy="' + sy(m) + '" r="6" fill="#f97316" stroke="#fff" stroke-width="1.5" pointer-events="none"/>'; });
    asm.items.forEach((it, idx) => { const b = itemBox(it), top = pr([(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, b.max[2]]);
      svg += '<text x="' + sx(top) + '" y="' + (+sy(top) - 8).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="800" fill="hsl(' + ASM_HUES[idx % ASM_HUES.length] + ',60%,30%)" style="paint-order:stroke;stroke:#fff;stroke-width:3px" pointer-events="none">' +
        esc((opts.tags ? opts.tags[idx] : "Д" + (idx + 1))) + '</text>'; });
    return { svg, VW, VH, size:[0, 1, 2].map(k => B.max[k] - B.min[k]) };
  }

  /* ---------- Конструктор: режим „Сглобка“ ---------- */
  function dzAsm(){ if(DZ.asmBind){ const o = findOrder(DZ.asmBind.orderId); return o && (o.assemblies || []).find(a => a.aid === DZ.asmBind.aid) || null; } return DZ.asm; }
  function openAsm(bind){ DZ = { mode:"asm", p:null, bind:null, libId:null, asm:null, asmBind:bind || null, asmLibId:null, asmSel:null }; showPage("designer"); }
  function asmChanged(full){
    if(DZ.asmBind){ saveSoon(); renderLists(); }
    if(full) renderAsmEditor(); else { renderAsm3D(); renderAsmJoints(); }
  }
  function renderAsmLib(){
    const el = $("dzLib"); if(!el) return;
    el.innerHTML = LIB.assemblies.length
      ? '<div class="tw"><table class="cut list dzlib"><thead><tr><th>Сглобки в библиотеката</th><th>Детайли</th><th>Габарит (мм)</th><th></th></tr></thead><tbody>' +
        LIB.assemblies.map(a => { const r = a.items.length ? asmSvg(a, { yaw:-0.55, pitch:0.62 }) : { size:[0, 0, 0] };
          return '<tr class="' + (DZ.asmLibId === a.aid && !DZ.asmBind ? "sel" : "") + '"><td><b>' + esc(a.name) + '</b>' + (a.qty > 1 ? ' <span class="muted">× ' + a.qty + '</span>' : '') + '</td><td class="q">' + a.items.length +
            '</td><td class="size">' + r.size.map(v => fmt(v)).join(" × ") + '</td><td class="acts"><button class="btn small" data-aopen="' + esc(a.aid) + '" type="button">Отвори</button> <button class="btn danger" data-adel="' + esc(a.aid) + '" type="button">Изтрий</button></td></tr>'; }).join("") +
        '</tbody></table></div>'
      : '<div class="muted"><b>Няма запазени сглобки.</b> Направете нова отгоре и натиснете „Запази в библиотеката“.</div>';
    el.querySelectorAll("[data-aopen]").forEach(b => b.addEventListener("click", () => {
      const a = LIB.assemblies.find(x => x.aid === b.dataset.aopen); if(!a) return;
      DZ = { mode:"asm", p:null, bind:null, libId:null, asm:normAsm(JSON.parse(JSON.stringify(a))), asmBind:null, asmLibId:a.aid, asmSel:null }; renderDesigner();
    }));
    el.querySelectorAll("[data-adel]").forEach(b => b.addEventListener("click", () => {
      if(b.dataset.armed !== "1"){ b.dataset.armed = "1"; b.textContent = "Сигурно? Натисни пак"; return; }
      LIB.assemblies = LIB.assemblies.filter(a => a.aid !== b.dataset.adel); if(DZ.asmLibId === b.dataset.adel) DZ.asmLibId = null; saveLib(); renderDesigner();
    }));
  }
  function renderAsmEditor(){
    const a = dzAsm(), bound = DZ.asmBind ? findOrder(DZ.asmBind.orderId) : null, ro = !!(bound && bound.stage !== "new");
    $("dzBind").innerHTML = bound && a ? '<div class="note">Сглобка от поръчка <b>' + esc(serTxt(bound) + (bound.name ? " · " + bound.name : "")) + '</b>' +
      (ro ? ' — разкроят е потвърден, само за преглед.' : ' — промените се записват в поръчката.') + ' <button class="btn small" id="dzBack" type="button">← Към поръчката</button></div>' : '';
    $("dzTop").innerHTML = bound ? '' : '<button class="btn small" id="asmNew" type="button">+ Нова сглобка</button>';
    renderAsmLib();
    if($("asmNew")) $("asmNew").addEventListener("click", () => { DZ.asm = normAsm({ name:"Елемент" }); DZ.asmLibId = null; DZ.asmSel = null; renderAsmEditor(); });
    const back = $("dzBack"); if(back) back.addEventListener("click", () => { if(bound.stage === "processing"){ SEL.processing = bound.id; showPage("processing"); } else { SEL.work = bound.id; showPage("work"); } });
    if(!a){ $("dzEditor").innerHTML = '<div class="card"><div class="empty">Натиснете „+ Нова сглобка“ или отворете сглобка от библиотеката.</div></div>'; return; }
    const dis = ro ? " disabled" : "";
    const partOpts = '<optgroup label="Библиотека">' + LIB.items.map(p => '<option value="lib:' + esc(p.pid) + '">' + esc(p.name) + '</option>').join("") + '</optgroup>' +
      '<optgroup label="Шаблони">' + PART_TEMPLATES.map((t, i) => '<option value="tpl:' + i + '">' + esc(t[0]) + '</option>').join("") + '</optgroup>';
    let h = '<div class="card"><h2>Сглобка — 3D</h2>' +
      '<div class="dz3dWrap" id="asm3dWrap"><svg id="asm3d" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif"></svg></div>' +
      '<div class="row dzViews"><span class="muted" id="asmSize"></span><span class="dzViewBtns">' +
        [["iso","3D"],["front","отпред"],["side","отстрани"],["top","отгоре"],["under","отдолу"]].map(v => '<button class="btn small" type="button" data-aview="' + v[0] + '">' + v[1] + '</button>').join("") +
      '</span></div><div class="muted">Влачете, за да завъртите · клик върху детайл го избира · оранжевите точки са заварките.</div></div>' +
      '<div class="card"><h2>Елемент</h2><div class="grid">' +
        '<label>Име<input type="text" id="asmName" value="' + esc(a.name) + '"' + dis + '></label>' +
        '<label>Брой елементи<input type="number" min="1" step="1" id="asmQty" value="' + a.qty + '"' + dis + '></label></div>' +
      '<h3>Детайли</h3><div id="asmItems">';
    a.items.forEach((it, j) => {
      const g = partGeo(it.part), others = a.items.filter(x => x !== it), hue = ASM_HUES[j % ASM_HUES.length];
      h += '<div class="asmItem' + (DZ.asmSel === it.iid ? ' sel' : '') + '" data-iid="' + it.iid + '" style="border-left-color:hsl(' + hue + ',55%,50%)">' +
        '<div class="asmHead"><b>Д' + (j + 1) + '</b> ' + esc(it.part.name) + ' <span class="muted">· дъно ' + fmt(it.part.L) + ' × ' + fmt(it.part.W) + ' · заготовка ' + fmt(g.BW) + ' × ' + fmt(g.BH) + (it.part.qty > 1 ? ' · ' + it.part.qty + ' бр. в елемента' : '') + '</span>' +
          '<span class="asmBtns"><button class="btn small" data-aact="edit" type="button">' + (ro ? 'Виж детайла' : 'Редактирай детайла') + '</button>' + (ro ? '' : '<button class="btn danger" data-aact="del" type="button">✕</button>') + '</span></div>' +
        '<div class="asmCtl">' +
          '<span class="asmGrp">Позиция (мм): ' + ['X','Y','Z'].map((n, k) => '<label>' + n + '<input type="number" step="1" data-pos="' + k + '" value="' + esc(it.pos[k]) + '"' + dis + '></label>').join("") + '</span>' +
          '<span class="asmGrp">Завърти 90°: ' + ['X','Y','Z'].map((n, k) => '<button class="btn small" type="button" data-rot="' + k + '"' + dis + '>↻ ' + n + '</button>').join("") + '</span>' +
          (others.length ? '<span class="asmGrp">Постави до <select data-nt' + dis + '>' + others.map(o => '<option value="' + o.iid + '">Д' + (a.items.indexOf(o) + 1) + ' · ' + esc(o.part.name) + '</option>').join("") + '</select>' +
            '<select data-ns' + dis + '>' + Object.keys(ASM_SIDES).map(s => '<option value="' + s + '">' + ASM_SIDES[s][0] + '</option>').join("") + '</select>' +
            '<select data-na' + dis + '>' + Object.keys(ASM_ALIGN).map(s => '<option value="' + s + '">' + ASM_ALIGN[s] + '</option>').join("") + '</select>' +
            '<button class="btn small primary" type="button" data-aact="place"' + dis + '>Постави</button></span>' : '') +
        '</div></div>';
    });
    h += '</div>' + (ro ? '' : '<div class="row"><select id="asmAddSel">' + partOpts + '</select><button class="btn" id="asmAdd" type="button">+ Добави детайл</button>' +
      '<span class="muted">новият детайл се поставя вдясно от последния — после „Постави до“ го мести, където трябва</span></div>') +
      '<h3>Заварки</h3><div id="asmJoints"></div>' +
      '<label style="margin-top:10px">Бележка<textarea rows="2" id="asmNotes"' + dis + '>' + esc(a.notes) + '</textarea></label></div>';
    h += '<div class="card noprint"><div class="actions" style="justify-content:flex-start;margin-top:0">';
    if(bound) h += '<button class="btn" id="asmToLib" type="button">Запази копие в библиотеката</button><button class="btn primary" id="asmDone" type="button">Готово — към поръчката</button>';
    else{
      h += '<button class="btn" id="asmSave" type="button">' + (DZ.asmLibId ? 'Запази промените в библиотеката' : 'Запази в библиотеката') + '</button>' +
        '<label class="dzTarget">Добави в<select id="asmTarget"><option value="">нова поръчка</option>' +
          byStage("new").map(o => '<option value="' + esc(o.id) + '">' + esc((o.name || "без име") + (o.serial ? " · " + orderSerial(o.serial) : "") + " (Разкрой)") + '</option>').join("") + '</select></label>' +
        '<button class="btn primary" id="asmAddOrder" type="button">Добави в поръчка</button>';
    }
    h += '</div><div class="status" id="asmStatus"></div></div>';
    $("dzEditor").innerHTML = h;
    renderAsm3D(); renderAsmJoints(); bindAsm3D();
    const ed = $("dzEditor");
    $("asmName").addEventListener("input", e => { a.name = e.target.value; asmChanged(false); });
    $("asmQty").addEventListener("input", e => { a.qty = Math.max(1, Math.round(+e.target.value || 1)); asmChanged(false); });
    $("asmNotes").addEventListener("input", e => { a.notes = e.target.value; asmChanged(false); });
    ed.querySelectorAll(".asmItem").forEach(row => {
      const it = a.items.find(x => x.iid === row.dataset.iid);
      row.querySelectorAll("[data-pos]").forEach(inp => inp.addEventListener("input", () => { it.pos[+inp.dataset.pos] = +inp.value || 0; asmChanged(false); }));
      row.querySelectorAll("[data-rot]").forEach(b => b.addEventListener("click", () => { const k = +b.dataset.rot; it.rot[k] = (it.rot[k] + 1) % 4; DZ.asmSel = it.iid; asmChanged(true); }));
      const pl = row.querySelector('[data-aact="place"]');
      if(pl) pl.addEventListener("click", () => {
        const t = a.items.find(x => x.iid === row.querySelector("[data-nt]").value);
        placeNext(it, t, row.querySelector("[data-ns]").value, row.querySelector("[data-na]").value); DZ.asmSel = it.iid; asmChanged(true);
      });
      row.querySelector('[data-aact="edit"]').addEventListener("click", () => {
        const aid = a.aid, iid = it.iid, ab = DZ.asmBind, lib = DZ.asmLibId, asmObj = DZ.asm;
        DZ = { mode:"part", p:null, bind:null, libId:null, asm:asmObj, asmBind:ab, asmLibId:lib, asmSel:iid,
          ref:() => { const A = ab ? dzAsmFor(ab) : asmObj; const x = A && A.items.find(y => y.iid === iid); return x ? x.part : null; }, refAsm:true };
        renderDesigner();
      });
      const del = row.querySelector('[data-aact="del"]');
      if(del) del.addEventListener("click", () => {
        if(del.dataset.armed !== "1"){ del.dataset.armed = "1"; del.textContent = "Сигурно?"; return; }
        a.items = a.items.filter(x => x !== it); asmChanged(true);
      });
    });
    const add = $("asmAdd");
    if(add) add.addEventListener("click", () => {
      const v = $("asmAddSel").value; let part;
      if(v.startsWith("lib:")){ const src = LIB.items.find(p => p.pid === v.slice(4)); part = src ? normPart(JSON.parse(JSON.stringify(src))) : null; }
      else part = normPart(JSON.parse(JSON.stringify(PART_TEMPLATES[+v.slice(4)][1])));
      if(!part) return;
      part.pid = newPid();
      const it = { iid:newIid(), part, pos:[0, 0, 0], rot:[0, 0, 0] };
      const last = a.items[a.items.length - 1];
      a.items.push(it); if(last) placeNext(it, last, "right", "start");
      DZ.asmSel = it.iid; asmChanged(true);
    });
    const msg = (m, k) => { const el = $("asmStatus"); el.className = "status " + (k || ""); el.textContent = m; };
    const toLib = asCopy => {
      const copy = normAsm(JSON.parse(JSON.stringify(a)));
      if(!asCopy && DZ.asmLibId && LIB.assemblies.some(x => x.aid === DZ.asmLibId)){ copy.aid = DZ.asmLibId; LIB.assemblies = LIB.assemblies.map(x => x.aid === DZ.asmLibId ? copy : x); }
      else{ copy.aid = newAid(); LIB.assemblies.push(copy); if(!asCopy) DZ.asmLibId = copy.aid; }
      saveLib(); renderAsmLib(); msg("✓ Запазено в библиотеката: „" + copy.name + "“.", "ok");
    };
    if($("asmSave")) $("asmSave").addEventListener("click", () => toLib(false));
    if($("asmToLib")) $("asmToLib").addEventListener("click", () => toLib(true));
    if($("asmDone")) $("asmDone").addEventListener("click", () => $("dzBack").click());
    if($("asmAddOrder")) $("asmAddOrder").addEventListener("click", () => {
      if(!a.items.length){ msg("Добавете поне един детайл.", "warn"); return; }
      const copy = normAsm(JSON.parse(JSON.stringify(a))); copy.aid = newAid();
      const tid = $("asmTarget").value; let o = tid ? findOrder(tid) : null;
      if(!o){ o = makeRecord(null, ""); o.tables = []; o.parts = []; ORD.orders.push(o); }
      o.assemblies = (o.assemblies || []).concat([copy]);
      saveOrders(); SEL.work = o.id; TAB = "print"; showPage("work");
      setStatus("✓ Елементът „" + copy.name + "“ е добавен в " + (tid ? "поръчката на " + (o.name || "без име") : "нова поръчка — попълнете клиента в „Маси — редакция“") + ".", "ok");
    });
  }
  function dzAsmFor(bind){ const o = findOrder(bind.orderId); return o && (o.assemblies || []).find(a => a.aid === bind.aid) || null; }
  function renderAsm3D(){
    const wrap = $("asm3dWrap"), a = dzAsm(); if(!wrap || !a) return;
    const V = DZ.view || (DZ.view = { yaw:-0.55, pitch:0.62 });
    const r = asmSvg(a, V, { interactive:true, sel:DZ.asmSel });
    const svg = wrap.querySelector("svg"); svg.setAttribute("viewBox", "0 0 " + r.VW + " " + r.VH); svg.innerHTML = r.svg || '<text x="320" y="200" text-anchor="middle" fill="#64748b" font-size="14">Добавете детайли отдолу</text>';
    wrap.dataset.vw = r.VW;
    const sz = $("asmSize"); if(sz) sz.textContent = a.items.length ? "Габарит на елемента: " + r.size.map(v => fmt(v)).join(" × ") + " мм (Д × Ш × В)" : "";
  }
  function renderAsmJoints(){
    const el = $("asmJoints"), a = dzAsm(); if(!el || !a) return;
    const bound = DZ.asmBind ? findOrder(DZ.asmBind.orderId) : null, ro = !!(bound && bound.stage !== "new");
    const J = asmJoints(a);
    el.innerHTML = J.length ? '<div class="tw"><table class="cut joints"><thead><tr><th>Свързани</th><th>Допир (мм)</th><th>Заварка</th><th>Дължина (см)</th></tr></thead><tbody>' +
      J.map(j => '<tr><td>Д' + (j.a + 1) + ' ↔ Д' + (j.b + 1) + ' <span class="muted">' + esc(a.items[j.a].part.name + " / " + a.items[j.b].part.name) + '</span></td><td class="size">' + fmt(j.len) + '</td>' +
        '<td><input type="checkbox" data-wk="' + j.key + '"' + (j.on ? " checked" : "") + (ro ? " disabled" : "") + '></td>' +
        '<td><input type="number" min="1" step="1" data-wl="' + j.key + '" value="' + j.cm + '"' + (ro || !j.on ? " disabled" : "") + ' style="width:80px;margin-top:0"></td></tr>').join("") + '</tbody></table></div>' +
      '<div class="muted" style="margin-top:4px">Детайлите, които се допират, се заваряват по подразбиране. Цена: ' + fmt(S.weldPerCm) + ' €/см (Настройки), с надценката.</div>'
      : '<div class="muted">Няма допиращи се детайли — поставете ги един до друг („Постави до“), за да се заварят.</div>';
    el.querySelectorAll("[data-wk]").forEach(c => c.addEventListener("change", () => {
      a.welds[c.dataset.wk] = Object.assign({}, a.welds[c.dataset.wk], { on:c.checked }); asmChanged(false);
    }));
    el.querySelectorAll("[data-wl]").forEach(c => c.addEventListener("input", () => {
      a.welds[c.dataset.wl] = Object.assign({}, a.welds[c.dataset.wl], { cm:Math.max(1, +c.value || 12) }); if(DZ.asmBind){ saveSoon(); renderLists(); } renderAsm3D();
    }));
  }
  function bindAsm3D(){
    const wrap = $("asm3dWrap"); if(!wrap) return;
    const svg = wrap.querySelector("svg"); let drag = null;
    svg.addEventListener("pointerdown", e => { drag = { x:e.clientX, y:e.clientY, yaw:DZ.view.yaw, pitch:DZ.view.pitch, moved:false, target:e.target }; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener("pointermove", e => {
      if(!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if(!drag.moved && Math.hypot(dx, dy) < 5) return; drag.moved = true;
      DZ.view.yaw = drag.yaw + dx * 0.01; DZ.view.pitch = Math.max(-1.5, Math.min(1.5, drag.pitch + dy * 0.01)); renderAsm3D();
    });
    svg.addEventListener("pointerup", () => {
      const d = drag; drag = null; if(!d || d.moved) return;
      const f = d.target.closest && d.target.closest(".asmface");
      DZ.asmSel = f ? f.dataset.iid : null;
      renderAsm3D();
      document.querySelectorAll("#asmItems .asmItem").forEach(r => r.classList.toggle("sel", r.dataset.iid === DZ.asmSel));
      const row = f && document.querySelector('#asmItems .asmItem[data-iid="' + f.dataset.iid + '"]'); if(row) row.scrollIntoView({ block:"nearest", behavior:"smooth" });
    });
    wrap.parentElement.querySelectorAll("[data-aview]").forEach(b => b.addEventListener("click", () => {
      DZ.view = ({ iso:{ yaw:-0.55, pitch:0.62 }, front:{ yaw:0, pitch:0.12 }, side:{ yaw:-1.5708, pitch:0.12 }, top:{ yaw:0, pitch:1.5 }, under:{ yaw:-0.55, pitch:-0.5 } })[b.dataset.aview];
      renderAsm3D();
    }));
  }


  /* ---------- Палети: тегло, габарит и подреждане на поръчките за транспорт ----------
     Всяка маса е описана с истинските си части (плот с челните дъски, крака, долни плотове, борд), а
     детайлите и елементите — с габарита си. Програмата пробва всяка маса изправена, с краката нагоре и
     легнала на страна, на всяко място на палета: до другите, вътре в тях (между краката, над долния плот)
     или само отчасти вътре (напр. два крака в друга маса), или отгоре — докато нищо не се застъпва,
     стои стабилно и се събира във височината и теглото. Целта е възможно най-малко палети. */
  const PAL_DEFAULTS = { palAL:1200, palAW:800, palBL:1200, palBW:1000, palH:144, palKg:25, palMaxH:1800, palMaxKg:1000, palOver:0, palCustW:1200, palGap:10 };
  const palS = k => (S[k] != null && S[k] !== "" ? +S[k] : PAL_DEFAULTS[k]);
  const ordTag = o => o.serial ? "№" + String(o.serial).padStart(4, "0") : ((o.name || "без име").split(" ")[0]);
  // a table as its parts, in its own frame (x along the length, y from the front, z up from the floor)
  function tableComp(t, g){
    const prof = t.legProfile || 30, out = [], topZ = t.H, eT = Math.max(g.eT, 8);
    out.push({ x:0, y:0, z:topZ - eT, dx:t.L, dy:g.Dp, dz:eT, role:"top" });
    if(t.splashOn) out.push({ x:0, y:Math.max(0, g.Dp - 3), z:topZ, dx:t.L, dy:3 + g.hemIn, dz:+t.splashH || 0, role:"top" });
    const xs = [g.sideL, t.L - g.sideR - prof].concat(g.legs6 ? [g.midX] : [], g.gnPosts), ys = [g.front, g.front + g.span - prof];
    xs.forEach(x => ys.forEach(y => out.push({ x, y, z:0, dx:prof, dy:prof, dz:topZ - eT, role:"leg" })));
    const shelf = (at, e) => out.push({ x:g.shX, y:g.front, z:at - Math.max(e, 6), dx:g.shL, dy:g.shD, dz:Math.max(e, 6), role:"shelf" });
    if(g.rails){ out.push({ x:g.railX0, y:g.front + g.span - prof, z:g.railH, dx:g.railX1 - g.railX0, dy:prof, dz:prof, role:"leg" });
      if(g.railFront) out.push({ x:g.railX0, y:g.front, z:g.railH, dx:g.railX1 - g.railX0, dy:prof, dz:prof, role:"leg" });
      g.railXs.forEach(x => out.push({ x, y:g.front + prof, z:g.railH, dx:prof, dy:g.railD, dz:prof, role:"leg" })); }
    if(t.baseOn) shelf(t.baseH, g.eB);
    if(t.midOn) shelf(mid2H(t), g.eM);
    return out;
  }
  // the ways a piece may lie: quarter turns around X, Y, Z (see rotQ)
  const TABLE_POSES = [[[0,0,0],"изправена"],[[0,0,1],"изправена"],[[2,0,0],"с краката нагоре"],[[2,0,1],"с краката нагоре"],
    [[1,0,0],"легната на страна"],[[3,0,0],"легната на страна"],[[1,0,1],"легната на страна"],[[3,0,1],"легната на страна"]];
  const PIECE_POSES = [[[0,0,0],"легнал"],[[0,0,1],"легнал"],[[1,0,0],"на ръб"],[[1,0,1],"на ръб"],[[0,1,0],"на ръб"],[[0,1,1],"на ръб"]];
  function posed(comps, r){
    const out = comps.map(c => { const a = rotQ([c.x, c.y, c.z], r), b = rotQ([c.x + c.dx, c.y + c.dy, c.z + c.dz], r);
      return { x:Math.min(a[0], b[0]), y:Math.min(a[1], b[1]), z:Math.min(a[2], b[2]), dx:Math.abs(a[0] - b[0]), dy:Math.abs(a[1] - b[1]), dz:Math.abs(a[2] - b[2]), role:c.role }; });
    const mn = ["x", "y", "z"].map(k => Math.min(...out.map(c => c[k])));
    out.forEach(c => { c.x = Math.round((c.x - mn[0]) * 10) / 10; c.y = Math.round((c.y - mn[1]) * 10) / 10; c.z = Math.round((c.z - mn[2]) * 10) / 10; });
    return { comps:out, dx:Math.max(...out.map(c => c.x + c.dx)), dy:Math.max(...out.map(c => c.y + c.dy)), dz:Math.max(...out.map(c => c.z + c.dz)) };
  }
  function makeUnit(base, comps, table){
    const seen = new Set(), poses = [];
    (table ? TABLE_POSES : PIECE_POSES).forEach(([r, how], idx) => {
      const p = posed(comps, r), key = JSON.stringify(p.comps.map(c => [c.x, c.y, c.z, c.dx, c.dy, c.dz]).sort());
      if(seen.has(key)) return; seen.add(key);
      // nothing tall and thin standing up (a table standing on its legs is fine)
      if(idx > 1 && p.dz > 2 * Math.min(p.dx, p.dy) + 1) return;
      poses.push(Object.assign(p, { how, idx }));
    });
    const p0 = poses[0];
    return Object.assign(base, { comps, poses, L:p0.dx, D:p0.dy, H:p0.dz });
  }
  function palletUnits(orders){
    const units = [], kgPerM = (30 * 30 - Math.pow(Math.max(0, 30 - 2 * S.tubeWall), 2)) * 0.00793, room = Math.min(300, palS("palMaxH") - palS("palH"));
    orders.forEach(o => {
      const tag = ordTag(o);
      (o.tables || []).map(normTable).forEach((t, i) => {
        const r = computeTable(t, i), g = r.geo;
        const kg = r.sheets.reduce((a, p) => a + Math.max(0, p.w) * Math.max(0, p.h), 0) / 1e6 * (t.thickness || 1.5) * 7.93 + r.tubes.reduce((a, p) => a + Math.max(0, p.len), 0) / 1000 * kgPerM;
        for(let k = 0; k < t.qty; k++) units.push(makeUnit({ label:tag + " М" + (i + 1) + (t.qty > 1 ? "." + (k + 1) : ""), name:"маса " + t.L + "×" + t.D + "×" + t.H, kind:"table", kg }, tableComp(t, g), true));
      });
      (o.parts || []).map(normPart).forEach((p, i) => {
        // the same parts lie one on another, in piles up to 30 cm
        const g = partGeo(p), B = boxOf(partFaces(p, g).faces.flatMap(f => f.pts));
        const L = B.max[0] - B.min[0], D = B.max[1] - B.min[1], H = Math.max(2, B.max[2] - B.min[2]), per = Math.max(1, Math.floor(room / H));
        for(let k = 0; k < p.qty; k += per){
          const n = Math.min(per, p.qty - k);
          units.push(makeUnit({ label:tag + " Д" + (i + 1) + (p.qty > 1 ? " ×" + n : ""), name:p.name + (n > 1 ? " — купчина от " + n : ""), kind:"part", kg:g.kg * n },
            [{ x:0, y:0, z:0, dx:L, dy:D, dz:H * n, role:"part" }], false));
        }
      });
      (o.assemblies || []).map(a => normAsm(a)).forEach((a, i) => {
        if(!a.items.length) return;
        const boxes = a.items.map(it => itemBox(it)), mn = [0, 1, 2].map(k => Math.min(...boxes.map(b => b.min[k])));
        const comps = boxes.map(b => ({ x:b.min[0] - mn[0], y:b.min[1] - mn[1], z:b.min[2] - mn[2], dx:Math.max(1, b.max[0] - b.min[0]), dy:Math.max(1, b.max[1] - b.min[1]), dz:Math.max(1, b.max[2] - b.min[2]), role:"part" }));
        const kg = a.items.reduce((s2, it) => s2 + partGeo(it.part).kg * it.part.qty, 0);
        for(let k = 0; k < a.qty; k++) units.push(makeUnit({ label:tag + " Е" + (i + 1) + (a.qty > 1 ? "." + (k + 1) : ""), name:a.name, kind:"elem", kg }, comps, false));
      });
    });
    return units;
  }

  const EPS = 0.5, GAP = 50;   // a part of a piece may be up to 5 cm above what carries it (a table on its side rests on the board edge and the legs)
  const boxHit = (a, b) => a.x < b.x + b.dx - EPS && b.x < a.x + a.dx - EPS && a.y < b.y + b.dy - EPS && b.y < a.y + a.dy - EPS && a.z < b.z + b.dz - EPS && b.z < a.z + a.dz - EPS;
  // does the piece stand: something right under it, and its middle over what carries it
  function palStable(P, o, x, y, z, surf){
    let area = 0, touch = false, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    o.comps.forEach(k => {
      if(k.z > GAP + EPS) return;
      const kz = z + k.z;
      surf.forEach(s => {
        const gap = kz - s.top; if(gap < -EPS || gap > GAP + EPS) return;
        const ax = Math.max(x + k.x, s.x), bx = Math.min(x + k.x + k.dx, s.x + s.dx), ay = Math.max(y + k.y, s.y), by = Math.min(y + k.y + k.dy, s.y + s.dy);
        if(bx - ax <= 1 || by - ay <= 1) return;
        area += (bx - ax) * (by - ay); if(gap <= EPS) touch = true;
        x0 = Math.min(x0, ax); y0 = Math.min(y0, ay); x1 = Math.max(x1, bx); y1 = Math.max(y1, by);
      });
    });
    if(!touch || area <= 0) return false;
    const cx = x + o.dx / 2, cy = y + o.dy / 2;
    return cx >= x0 - EPS && cx <= x1 + EPS && cy >= y0 - EPS && cy <= y1 + EPS;
  }
  // push a piece toward the start of the pallet along one axis until one of its parts touches something —
  // that is how a table on its side goes with its legs into another table
  function palSlide(o, pos, near, a){
    const b = a === "x" ? "y" : "x", da = a === "x" ? "dx" : "dy", db = a === "x" ? "dy" : "dx";
    let lim = 0;
    for(const k of o.comps){
      const kz0 = pos.z + k.z, kz1 = kz0 + k.dz, kb0 = pos[b] + k[b], kb1 = kb0 + k[db], ka0 = pos[a] + k[a];
      for(const c of near){
        const g = palS("palGap");
        if(c.z >= kz1 - EPS || c.z + c.dz <= kz0 + EPS || c[b] - g >= kb1 - EPS || c[b] + c[db] + g <= kb0 + EPS) continue;
        const ce = c[a] + c[da] + palS("palGap");
        if(ce <= ka0 + EPS) lim = Math.max(lim, pos[a] - (ka0 - ce));
      }
    }
    return Math.round(lim * 10) / 10;
  }
  // best place for a piece on pallet P (or null): touching what is there, using the least floor and height
  function palPlace(P, u){
    const palH = palS("palH"), maxH = palS("palMaxH");
    const uniq = a => [...new Set(a.map(v => Math.round(v * 10) / 10))].sort((p, q) => p - q);
    const G = palS("palGap");   // room left between pieces (sideways; standing on something needs none)
    const xs = uniq([0].concat(P.comps.map(c => c.x + c.dx + G))), ys = uniq([0].concat(P.comps.map(c => c.y + c.dy + G)));
    const zs = uniq([palH].concat(P.comps.map(c => c.z + c.dz)));
    const surfAll = [{ x:P.ov, y:P.ov, dx:P.L, dy:P.Wd, top:palH }].concat(P.comps.map(c => ({ x:c.x, y:c.y, dx:c.dx, dy:c.dy, top:c.z + c.dz })));
    const E0 = P.ext || { x1:0, y1:0, h:0 };
    const scoreOf = (o, x, y, z) => {
      const ext = { x1:Math.max(E0.x1, x + o.dx), y1:Math.max(E0.y1, y + o.dy), h:Math.max(E0.h, z + o.dz) };
      return { ext, score:ext.x1 * ext.y1 / (P.maxW * P.maxD) + 0.6 * ext.h / maxH + 0.3 * (z - palH) / maxH + o.idx * 1e-4 + (x + y) * 1e-8 };
    };
    const hits = (o, x, y, z, near) => {
      for(const c of near){
        if(c.x - G >= x + o.dx - EPS || c.x + c.dx + G <= x + EPS || c.y - G >= y + o.dy - EPS || c.y + c.dy + G <= y + EPS) continue;
        const cg = { x:c.x - G, y:c.y - G, z:c.z, dx:c.dx + 2 * G, dy:c.dy + 2 * G, dz:c.dz };
        for(const k of o.comps) if(boxHit({ x:x + k.x, y:y + k.y, z:z + k.z, dx:k.dx, dy:k.dy, dz:k.dz }, cg)) return true;
      }
      return false;
    };
    let best = null;
    u.poses.forEach(o => {
      zs.forEach(z => {
        if(z + o.dz > maxH + EPS) return;
        const surf = surfAll.filter(s => s.top <= z + GAP + EPS && s.top >= z - EPS);
        if(!surf.length) return;
        const near = P.comps.filter(c => c.z < z + o.dz - EPS && c.z + c.dz > z + EPS);
        const lb = scoreOf(o, 0, 0, z).score;
        if(best && lb >= best.score) return;
        ys.forEach(y => {
          if(y + o.dy > P.maxD + EPS) return;
          xs.forEach(x => {
            if(x + o.dx > P.maxW + EPS) return;
            if(hits(o, x, y, z, near)) return;
            const cand = [{ x, y }];
            const s = { x, y, z };
            for(let r = 0; r < 2; r++){ s.y = palSlide(o, s, near, "y"); s.x = palSlide(o, s, near, "x"); }
            if(s.x !== x || s.y !== y) cand.unshift({ x:s.x, y:s.y });
            for(const q of cand){
              const sc = scoreOf(o, q.x, q.y, z);
              if(best && sc.score >= best.score) continue;
              if(!palStable(P, o, q.x, q.y, z, surf)) continue;
              best = { o, x:q.x, y:q.y, z, score:sc.score, ext:sc.ext };
            }
          });
        });
      });
    });
    return best;
  }
  // several orders of loading are tried; the plan with the fewest pallets (then the least floor, then the lowest) is kept
  const PAL_ORDERS = [(a, b) => b.L * b.D * b.H - a.L * a.D * a.H, (a, b) => b.L * b.D - a.L * a.D || b.H - a.H,
    (a, b) => Math.max(b.L, b.D) - Math.max(a.L, a.D) || b.L * b.D - a.L * a.D, (a, b) => b.kg - a.kg];
  function planPallets(orders){
    const units = palletUnits(orders);
    let win = null;
    PAL_ORDERS.forEach(order => [false, true].forEach(best => {
      const r = packPallets(units, order, best);
      const key = [r.length, r.filter(P => P.custom).length, r.reduce((a, P) => a + P.type.L * P.type.W, 0), r.reduce((a, P) => a + P.height, 0)];
      const i = win ? key.findIndex((v, j) => Math.abs(v - win.key[j]) > 0.5) : -1;
      if(!win || (i >= 0 && key[i] < win.key[i])) win = { key, pallets:r };
    }));
    return { pallets:win.pallets, units };
  }
  function packPallets(units, order, best){
    const palH = palS("palH"), maxH = palS("palMaxH"), maxKg = palS("palMaxKg"), ov = palS("palOver");
    const types = [{ name:"EUR", L:palS("palAL"), W:palS("palAW") }, { name:"Индустриален", L:palS("palBL"), W:palS("palBW") }]
      .filter(t => t.L > 0 && t.W > 0).map(t => ({ name:t.name, L:Math.max(t.L, t.W), W:Math.min(t.L, t.W) }));
    const pallets = [];
    const newPallet = (t, custom) => ({ type:t, custom, ov:custom ? 0 : ov, L:t.L, Wd:t.W, maxW:t.L + (custom ? 0 : 2 * ov), maxD:custom ? Math.max(t.W, palS("palCustW")) : t.W + 2 * ov,
      comps:[], items:[], kg:palS("palKg"), ext:null });
    const put = (P, u, b) => {
      const comps = b.o.comps.map(k => ({ x:b.x + k.x, y:b.y + k.y, z:b.z + k.z, dx:k.dx, dy:k.dy, dz:k.dz, role:k.role, owner:P.items.length }));
      P.comps.push(...comps); P.items.push({ u, o:b.o, x:b.x, y:b.y, z:b.z, comps }); P.kg += u.kg; P.ext = b.ext;
    };
    // the big ones first; each goes onto a pallet that already has room (the first one, or the one where it sits best), else onto a new one
    units.slice().sort(order).forEach(u => {
      if(best){
        let bb = null;
        pallets.forEach(P => { if(P.kg + u.kg > maxKg) return; const b = palPlace(P, u); if(b && (!bb || b.score < bb.b.score)) bb = { P, b }; });
        if(bb){ put(bb.P, u, bb.b); return; }
      }
      else for(const P of pallets){ if(P.kg + u.kg > maxKg) continue; const b = palPlace(P, u); if(b){ put(P, u, b); return; } }
      // new pallet: the biggest standard one it fits on (it is made smaller at the end if the load allows), else one made to size
      const big = types.slice().sort((a, b) => b.L * b.W - a.L * a.W);
      for(const t of big){ const P = newPallet(t, false), b = palPlace(P, u); if(b){ put(P, u, b); pallets.push(P); return; } }
      const o = u.poses.filter(p => p.dz + palH <= maxH + EPS).sort((a, b) => a.dx * a.dy - b.dx * b.dy)[0] || u.poses[0];
      const t = { name:"по размер", L:Math.ceil(Math.max(o.dx, o.dy) / 50) * 50, W:Math.ceil(Math.min(o.dx, o.dy) / 50) * 50 };
      const P = newPallet(t, true); let b = palPlace(P, u);
      if(!b){ const oo = o.dx >= o.dy ? o : posed(o.comps, [0, 0, 1]); b = { o:Object.assign(oo, { how:o.how, idx:o.idx }), x:0, y:0, z:palH, ext:{ x1:oo.dx, y1:oo.dy, h:palH + oo.dz } }; }
      put(P, u, b); pallets.push(P);
    });
    pallets.forEach(P => {
      // the smallest pallet that takes the load
      const need = { x:P.ext.x1, y:P.ext.y1 };
      if(P.custom){ P.type = { name:"по размер", L:Math.ceil(need.x / 50) * 50, W:Math.ceil(need.y / 50) * 50 }; P.L = P.type.L; P.Wd = P.type.W; }
      else{ const t = types.slice().sort((a, b) => a.L * a.W - b.L * b.W).find(t => need.x <= t.L + 2 * ov + EPS && need.y <= t.W + 2 * ov + EPS); if(t){ P.type = t; P.L = t.L; P.Wd = t.W; } }
      P.height = P.ext.h;
      P.warn = [];
      if(P.height > maxH + EPS) P.warn.push("По-висок от " + maxH + " мм (" + Math.round(P.height) + " мм).");
      if(P.kg > maxKg) P.warn.push("По-тежък от " + maxKg + " кг.");
      if(P.custom) P.warn.push("Нужен е палет по размер " + P.type.L + " × " + P.type.W + " мм (не се събира на стандартен палет).");
      // what is in / partly in / on what
      P.items.forEach((it, i) => {
        const bb = { x:it.x, y:it.y, z:it.z, dx:it.o.dx, dy:it.o.dy, dz:it.o.dz };
        it.rel = []; it.step = i + 1;
        P.items.forEach((h, j) => {
          if(j === i) return;
          const hb = { x:h.x, y:h.y, z:h.z, dx:h.o.dx, dy:h.o.dy, dz:h.o.dz };
          if(boxHit(bb, hb)){
            const inside = bb.x >= hb.x - EPS && bb.y >= hb.y - EPS && bb.z >= hb.z - EPS && bb.x + bb.dx <= hb.x + hb.dx + EPS && bb.y + bb.dy <= hb.y + hb.dy + EPS && bb.z + bb.dz <= hb.z + hb.dz + EPS;
            if(inside || j < i) it.rel.push({ j, t:inside ? "вътре в" : "отчасти вкарана в" });
          } else if(j < i && Math.abs(bb.z - (hb.z + hb.dz)) < GAP && bb.x < hb.x + hb.dx && hb.x < bb.x + bb.dx && bb.y < hb.y + hb.dy && hb.y < bb.y + bb.dy && bb.z > palH + EPS)
            it.rel.push({ j, t:"върху" });
        });
      });
    });
    return pallets;
  }
  // 3D: the pallet and every part of every piece; the tops are see-through so what is inside shows
  function pallet3D(P, V){
    const HUE = { table:210, part:28, elem:145 }, faces = [];
    const boxes = [{ x:P.ov, y:P.ov, z:0, dx:P.L, dy:P.Wd, dz:palS("palH"), pal:true }].concat(P.items.flatMap(it => it.comps.map(c => Object.assign({}, c, { kind:it.u.kind, inner:it.rel.some(r => r.t !== "върху") }))));
    boxes.forEach(b => {
      const X = [b.x, b.x + b.dx], Y = [b.y, b.y + b.dy], Z = [b.z, b.z + b.dz];
      const P8 = (i, j, k) => [X[i], Y[j], Z[k]];
      [[P8(0,0,0),P8(1,0,0),P8(1,1,0),P8(0,1,0)], [P8(0,0,1),P8(1,0,1),P8(1,1,1),P8(0,1,1)], [P8(0,0,0),P8(1,0,0),P8(1,0,1),P8(0,0,1)],
       [P8(0,1,0),P8(1,1,0),P8(1,1,1),P8(0,1,1)], [P8(0,0,0),P8(0,1,0),P8(0,1,1),P8(0,0,1)], [P8(1,0,0),P8(1,1,0),P8(1,1,1),P8(1,0,1)]].forEach(pts => faces.push({ pts, b }));
    });
    const B = boxOf(faces.flatMap(f => f.pts)), c = [0, 1, 2].map(k => (B.min[k] + B.max[k]) / 2);
    const cyw = Math.cos(V.yaw), syw = Math.sin(V.yaw), cp = Math.cos(V.pitch), sp = Math.sin(V.pitch);
    const pr = q => { const x = q[0] - c[0], y = q[1] - c[1], z = q[2] - c[2]; const x1 = x * cyw - y * syw, y1 = x * syw + y * cyw; return [x1, -(z * cp + y1 * sp), y1 * cp - z * sp]; };
    const PF = faces.map(f => ({ f, P:f.pts.map(pr) }));
    const flat = PF.flatMap(r => r.P), VW = 620, VH = 400, pad = 30;
    const minX = Math.min(...flat.map(r => r[0])), maxX = Math.max(...flat.map(r => r[0])), minY = Math.min(...flat.map(r => r[1])), maxY = Math.max(...flat.map(r => r[1]));
    const k = Math.min((VW - 2 * pad) / Math.max(1, maxX - minX), (VH - 2 * pad) / Math.max(1, maxY - minY)), ox = (VW - (maxX - minX) * k) / 2, oy = (VH - (maxY - minY) * k) / 2;
    const sx = r => (ox + (r[0] - minX) * k).toFixed(1), sy = r => (oy + (r[1] - minY) * k).toFixed(1);
    PF.forEach(r => { r.depth = r.P.reduce((a, p) => a + p[2], 0) / 4; });
    PF.sort((a, b) => b.depth - a.depth);
    let svg = '';
    PF.forEach(r => {
      const b = r.f.b, n = v3.cross(v3.sub(r.f.pts[1], r.f.pts[0]), v3.sub(r.f.pts[3], r.f.pts[0])), lit = Math.abs(n[2]) / (Math.hypot(...n) || 1);
      const hue = HUE[b.kind] || 210, fill = b.pal ? 'hsl(30,40%,' + (52 + lit * 14) + '%)' : 'hsl(' + (b.inner ? 12 : hue) + ',' + (b.inner ? 70 : 32) + '%,' + (56 + lit * 22) + '%)';
      const op = b.pal ? 1 : (b.role === "top" ? 0.55 : 0.92);
      svg += '<path d="M' + r.P.map(p => sx(p) + ',' + sy(p)).join(' L') + ' Z" fill="' + fill + '" fill-opacity="' + op + '" stroke="' + (b.pal ? '#7c5a32' : 'hsl(' + (b.inner ? 12 : hue) + ',45%,28%)') + '" stroke-width="0.9"/>';
    });
    P.items.forEach(it => { const t = pr([it.x + it.o.dx / 2, it.y + it.o.dy / 2, it.z + it.o.dz]);
      svg += palBadge(+sx(t), +sy(t) - 10, it.step); });
    return '<svg viewBox="0 0 ' + VW + ' ' + VH + '" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif" style="background:#f8fafc;width:100%;height:auto;display:block">' + svg + '</svg>';
  }
  const palBadge = (x, y, n) => '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="10" fill="#15223a" stroke="#fff" stroke-width="2"/><text x="' + x.toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">' + n + '</text>';
  // top view: the pallet and the outline of each piece (dashed = in or partly in another)
  function palletTop(P){
    const W = Math.max(P.L + 2 * P.ov, P.ext.x1), H = Math.max(P.Wd + 2 * P.ov, P.ext.y1), k = Math.min(560 / W, 300 / H), pad = 20;
    const R = (x, y, w, h, st) => '<rect x="' + (pad + x * k).toFixed(1) + '" y="' + (pad + y * k).toFixed(1) + '" width="' + (w * k).toFixed(1) + '" height="' + (h * k).toFixed(1) + '" ' + st + '/>';
    let s = R(P.ov, P.ov, P.L, P.Wd, 'fill="#f3e8d8" stroke="#7c5a32" stroke-width="2"');
    P.items.forEach(it => {
      const inner = it.rel.length > 0;
      s += R(it.x, it.y, it.o.dx, it.o.dy, inner ? 'fill="#fee2e2" fill-opacity=".55" stroke="#c2410c" stroke-width="1.4" stroke-dasharray="5 3"' : 'fill="#dbeafe" fill-opacity=".8" stroke="#1E6FF4" stroke-width="2"');
    });
    // the numbers last, each a little apart from those already drawn
    const used = [];
    P.items.forEach(it => {
      let cx = pad + (it.x + it.o.dx / 2) * k, cy = pad + (it.y + it.o.dy / 2) * k;
      while(used.some(q => Math.hypot(q[0] - cx, q[1] - cy) < 22)) cx += 24;
      used.push([cx, cy]); s += palBadge(cx, cy, it.step);
    });
    return '<svg viewBox="0 0 ' + (W * k + 2 * pad).toFixed(0) + ' ' + (H * k + 2 * pad).toFixed(0) + '" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif" style="width:100%;max-width:640px;height:auto;display:block;background:#fff">' + s + '</svg>';
  }

  /* ---------- страница „Палети“ ---------- */
  var PSEL = null;   // orders ticked for the plan (null = the ones in В обработка)
  const PAL_FIELDS = [["palAL","Палет 1 (EUR) — дължина"],["palAW","Палет 1 — ширина"],["palBL","Палет 2 — дължина"],["palBW","Палет 2 — ширина"],
    ["palH","Височина на палета"],["palKg","Тегло на палета (кг)"],["palMaxH","Макс. височина с товара"],["palMaxKg","Макс. тегло на палет (кг)"],
    ["palOver","Позволено надвисване (мм от всяка страна)"],["palCustW","Палет по размер — макс. ширина"],["palGap","Луфт между нещата (мм)"]];
  function renderPallets(){
    const host = $("palSettings"); if(!host) return;
    host.innerHTML = PAL_FIELDS.map(([k, l]) => '<label>' + esc(l) + '<input type="number" min="0" step="1" data-pal="' + k + '" value="' + esc(palS(k)) + '"></label>').join("");
    host.querySelectorAll("[data-pal]").forEach(inp => inp.addEventListener("input", () => { S[inp.dataset.pal] = Math.max(0, +inp.value || 0); saveSettings(); }));
    const list = byStage("processing").concat(byStage("new"));
    if(PSEL === null) PSEL = new Set(byStage("processing").map(o => o.id));
    $("palOrders").innerHTML = list.length ? '<div class="tw"><table class="cut list"><thead><tr><th style="width:1%"></th><th>Поръчка</th><th>Етап</th><th>Съдържа</th></tr></thead><tbody>' +
      list.map(o => '<tr><td><input type="checkbox" data-psel="' + esc(o.id) + '"' + (PSEL.has(o.id) ? " checked" : "") + '></td><td><b>' + esc(ordTag(o)) + '</b> ' + esc(o.name || "") + '</td><td>' + esc(STAGES[o.stage]) + '</td><td>' + esc(itemsTxt(o)) + '</td></tr>').join("") +
      '</tbody></table></div>' : '<div class="empty">Няма поръчки в „Разкрой“ или „В обработка“.</div>';
    $("palOrders").querySelectorAll("[data-psel]").forEach(c => c.addEventListener("change", () => { if(c.checked) PSEL.add(c.dataset.psel); else PSEL.delete(c.dataset.psel); }));
  }
  function runPallets(){
    const orders = ORD.orders.filter(o => PSEL && PSEL.has(o.id) && o.stage !== "archived");
    const out = $("palResult");
    if(!orders.length){ out.innerHTML = '<div class="card"><div class="empty">Отметнете поне една поръчка.</div></div>'; return; }
    const { pallets, units } = planPallets(orders);
    const totalKg = pallets.reduce((a, P) => a + P.kg, 0), all = pallets.flatMap(P => P.items.map(it => ({ P, it })));
    const relTxt = (P, it) => it.rel.map(r => r.t + " " + P.items[r.j].u.label).join(", ");
    const linked = all.filter(x => x.it.rel.length);
    let h = '<div class="card summary"><h2>Палети — ' + orders.map(ordTag).join(", ") + '</h2><div class="totals">' +
      tot("Палети", pallets.length + " бр.", pallets.map(P => P.type.name + " " + P.type.L + "×" + P.type.W).join(", ")) +
      tot("Общо тегло", Math.round(totalKg) + " кг", "с палетите") +
      tot("Една в/върху друга", linked.length + " бр.", linked.length ? linked.map(x => x.it.u.label + " " + relTxt(x.P, x.it)).join("; ") : "всичко стои отделно") +
      tot("Бройки", units.length + " бр.", "маси, детайли и елементи") + '</div></div>';
    pallets.forEach((P, i) => {
      h += '<div class="card palcard"><h2>Палет ' + (i + 1) + ' · ' + esc(P.type.name) + ' — ' + P.type.L + ' × ' + P.type.W + ' × ' + Math.round(P.height) + ' мм · ' + Math.round(P.kg) + ' кг</h2>' +
        P.warn.map(w => '<div class="warnbox">⚠ ' + esc(w) + '</div>').join("") +
        '<div class="palviews"><div>' + pallet3D(P, { yaw:-0.6, pitch:0.55 }) + '<div class="muted">3D · номерата са редът на товарене; в оранжево е вкараното в друга маса</div></div><div>' + palletTop(P) +
        '<div class="muted">Отгоре · кафяво = палетът, пунктир = вътре / отчасти в друга маса или върху нея</div></div></div>' +
        '<div class="tw"><table class="cut"><thead><tr><th>Ред</th><th>Какво</th><th>Как стои</th><th>Габарит Д × Ш × В (мм)</th><th>Тегло (кг)</th><th>Къде</th></tr></thead><tbody>' +
        P.items.map(it => '<tr><td class="q">' + it.step + '</td><td><b>' + esc(it.u.label) + '</b> ' + esc(it.u.name) + '</td><td>' + esc(it.o.how) + '</td><td class="size">' + fmt(it.o.dx) + ' × ' + fmt(it.o.dy) + ' × ' + fmt(it.o.dz) +
          '</td><td class="q">' + it.u.kg.toFixed(1) + '</td><td>' + esc(relTxt(P, it) || (it.z > palS("palH") + EPS ? "повдигната" : "на палета")) + '</td></tr>').join("") + '</tbody></table></div>' +
        '<div class="muted">Товари се по реда в първата колона.</div></div>';
    });
    out.innerHTML = h;
  }

  /* ---------- burger menu / pages ---------- */
  const PAGES = { work:"Разкрой", processing:"В обработка", pallets:"Палети", designer:"Конструктор", archive:"Архив", stock:"Фира — склад", settings:"Настройки" };
  function closeMenu(){ $("menu").hidden = true; $("menubg").hidden = true; }
  function showPage(name){
    if(!PAGES[name]) name = "work";
    PAGE = name;
    document.querySelectorAll(".page").forEach(s => { s.hidden = s.dataset.page !== name; });
    $("pageName").textContent = PAGES[name];
    document.querySelectorAll(".menuItem").forEach(b => b.classList.toggle("active", b.dataset.go === name));
    closeMenu();
    renderLists();
    openViewer();
    if(name === "archive") renderArchive();
    if(name === "designer") renderDesigner();
    if(name === "stock") renderStock();
    if(name === "pallets") renderPallets();
    window.scrollTo({ top:0 });
  }
  $("burger").addEventListener("click", () => { const open = !$("menu").hidden; if(open) closeMenu(); else { $("menu").hidden = false; $("menubg").hidden = false; } });
  $("menubg").addEventListener("click", closeMenu);
  document.querySelectorAll(".menuItem[data-go]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.go)));

  renderStock();
  buildSettings();
  $("palRun").addEventListener("click", runPallets);
  $("palPrint").addEventListener("click", () => { runPallets(); window.print(); });
  showPage("work");
  if(CLOUD){ renderDataInfo(); if(window.MPR_AUTHED) startCloud(); else document.addEventListener("mpr-auth", startCloud); }
  else syncState("local");
