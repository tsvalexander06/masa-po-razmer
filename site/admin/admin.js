  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = n => String(Math.round(n*10)/10);

  /* ---------- workshop settings ---------- */
  const DEFAULTS = { topEdge:30, topReturn:12, shelfEdge:20, shelfReturn:12, topCut:8, shelfCut:16, stretch:2, splashHem:20, legInset:30, shelfGap:15, shelfGapW:25, feet:0, tubeWall:1.5,
                     tubeStock:6000, kerf:3, offMin:100, sheetW:2000, sheetH:1000, sheetPrice:90, sheet2W:2500, sheet2H:1250, sheet2Price:140, tubePrice:40 };
  const SETTINGS = [
    ["topEdge","Работен плот — челна дъска","мм, огъната надолу"],
    ["topReturn","Работен плот — обратно огъване","мм, навътре под плота"],
    ["shelfEdge","Долни плотове — челна дъска","мм, огъната надолу"],
    ["shelfReturn","Долни плотове — обратно огъване","мм, навътре"],
    ["legInset","Отстъп на краката","мм от страничния и предния ръб на плота"],
    ["shelfGap","Долен плот — намаление дълбочина","мм (за влизане между краката / заварка)"],
    ["shelfGapW","Долен плот — намаление ширина","мм, общо (за влизане между краката / заварка)"],
    ["feet","Регулируеми крачета","мм височина; 0 = без"],
    ["stretch","Удължение на перото при огъване","мм — перото излиза с толкова по-дълго (в заготовката: перо − това)"],
    ["splashHem","Борд — подгъвка горе","мм, назад към стената; 0 = без"],
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
    return s;
  }
  function saveSettings(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
  function buildSettings(){
    $("settings").innerHTML = SETTINGS.map(([k,l,h]) =>
      '<label>'+esc(l)+'<input type="number" step="any" min="0" data-k="'+k+'" value="'+esc(S[k])+'"><span class="hint">'+esc(h)+'</span></label>').join("");
    $("settings").querySelectorAll("input").forEach(inp => inp.addEventListener("input", () => {
      const v = parseFloat(inp.value);
      if(!isNaN(v) && v >= 0){ S[inp.dataset.k] = v; saveSettings(); recompute(); }
    }));
  }
  $("resetSettings").addEventListener("click", () => { S = Object.assign({}, DEFAULTS); saveSettings(); buildSettings(); recompute(); });

  /* ---------- order data ---------- */
  const TABLE_DEFAULT = { qty:1, L:1200, D:600, H:850, thickness:1.5, legProfile:30, splashOn:true, splashH:100,
                          legBack:70, baseOn:true, baseH:150, midOn:false, notes:"",
                          // допълнителни (0 = стандартно, от „Настройки“); shelfEdge — от по-стари поръчки (основа и междинен)
                          advOn:false, topEdge:0, shelfEdge:0, baseEdge:0, midEdge:0, topRet:0, baseRet:0, midRet:0,
                          legSpan:0, legFL:0, legFR:0, legBL:0, legBR:0,
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
     Цена = (материал по площ + тръба по дължина + заварки + огъвания) × (1 + надценка%). */
  const PRICE = {
    sheetM2: 45,        // € за м² разгъвка (≈ 90€ / 2.0 м²)
    tubeM: 40/6,        // € за метър тръба 30×30 (прът 6 м = 40€)
    weldPerFloor: 48,   // € за етаж (плот): 12 см × 4 крака × 1€/см
    bend: 0.5,          // € за огъване (90°)
    capEach: 3,         // € за тапичка на крак (4 на маса) — добавя се към цената, без надценка
    markupPct: 100,     // надценка % (клиентска цена = формула × 2)
    topEdge:30, topReturn:12, shelfEdge:20, shelfReturn:12, topCut:8, shelfCut:16, stretch:2, splashHem:20, legInset:30, shelfGap:15, shelfGapW:25, thickness:1.5
  };
  const pFloors = t => 1 + (t.baseOn?1:0) + (t.midOn?1:0);
  const pBends  = t => (6 + (t.splashOn?(tableGeo(t,PRICE).hem>0?2:1):2)) + 8*((t.baseOn?1:0)+(t.midOn?1:0));
  function pBlankM2(t){
    const P=PRICE, g=tableGeo(t,P), cT=P.topCut/2, cS=P.shelfCut/2;
    const ft=g.eT+g.rT-P.stretch-cT;
    const back = t.splashOn ? (+t.splashH||0)+g.hem-cT : ft;
    const topW=(t.L+2*ft)/1000, topD=(g.Dp+ft+back)/1000;
    const shelf=(e,r)=>{ const f=e+r-P.stretch-cS; return (g.shL>0&&g.shD>0)?((g.shL+2*f)/1000)*((g.shD+2*f)/1000):0; };
    return Math.max(0,topW*topD) + (t.baseOn?shelf(g.eB,g.rB):0) + (t.midOn?shelf(g.eM,g.rM):0);
  }
  const pTubeM = t => tableGeo(t,PRICE).legs.reduce((a,l)=>a+Math.max(0,l),0)/1000;
  function priceParts(t){
    const mat=pBlankM2(t)*PRICE.sheetM2, tube=pTubeM(t)*PRICE.tubeM,
          weld=pFloors(t)*PRICE.weldPerFloor, bend=pBends(t)*PRICE.bend;
    const caps=4*PRICE.capEach;   // тапички на краката — към цената, без надценка
    return { mat, tube, weld, bend, caps, base:mat+tube+weld+bend };
  }
  function priceFor(order){
    if(!order||!order.tables||!order.tables.length) return null;
    const m=1+PRICE.markupPct/100; let total=0; const lines=[];
    order.tables.forEach((t,i)=>{ const q=t.qty||1, pp=priceParts(t), per=pp.base*m+pp.caps;
      total+=per*q; lines.push({label:"Маса "+(i+1)+(q>1?" × "+q:""), amount:per*q}); });
    return { total, currency:"€", lines };
  }
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
    try{ localStorage.setItem(ORD_KEY, JSON.stringify(ORD)); return true; }
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
  const fmtDate = s => { const d = s ? new Date(s) : null; return d && !isNaN(d) ? d.toLocaleDateString("bg-BG") : ""; };
  const fmtDT = s => { const d = s ? new Date(s) : null; return d && !isNaN(d) ? d.toLocaleString("bg-BG", { dateStyle:"short", timeStyle:"short" }) : ""; };
  const idsTxt = list => list.length ? list.join(", ") : "—";
  const clientPriceOf = o => { const p = priceFor({ tables:(o.tables || []).map(normTable) }); return p ? p.total : null; };

  // the same order loaded twice is recognised by its client number, or by its content
  function fingerprint(o){
    const s = JSON.stringify([o.name || "", o.phone || "", o.created || "", (o.tables || []).map(t =>
      [+t.qty || 1, +t.L || 0, +t.D || 0, +t.H || 0, !!t.splashOn, +t.splashH || 0, +t.legBack || 0, !!t.baseOn, +t.baseH || 0, !!t.midOn]
        .concat(["topEdge","shelfEdge","baseEdge","midEdge","topRet","baseRet","midRet","legSpan","legFL","legFR","legBL","legBR","hem"].map(k => +t[k] || 0), [t.hemDir || ""]))]);
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

  function makeRecord(data, source){
    const d = data || {};
    return { id:newId(), stage:"new", serial:null, addedAt:new Date().toISOString(),
      name:d.name || "", phone:d.phone || "", created:d.created || "", source:source || "", orderNo:d.orderNo || "",
      priceFromPdf:d.price || null, tables:(d.tables && d.tables.length ? d.tables : [{ hemDir:"wall" }]).map(normTable),
      hasDoc:false, docName:"", cut:null, clientPrice:null, cost:null, costMaterials:null, price:null, place:"", deliveryDate:"" };
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
      (o.confirmedAt ? " · потвърдена " + esc(fmtDT(o.confirmedAt)) : "") + '</div>';
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
    ["legSpan","Предни–задни крака (външно)"],
    ["legFL","Крак преден ляв"], ["legFR","Крак преден десен"], ["legBL","Крак заден ляв"], ["legBR","Крак заден десен"],
  ];
  // the standard value of an advanced field (shown as the placeholder)
  function advAuto(t, k){
    const g = tableGeo(Object.assign({}, t, { [k]:0 }, k === "baseEdge" || k === "midEdge" ? { shelfEdge:0 } : {}), S);
    return { topEdge:g.eT, baseEdge:g.eB, midEdge:g.eM, topRet:g.rT, baseRet:g.rB, midRet:g.rM, legSpan:Math.round(g.span * 10) / 10,
             legFL:g.legAuto, legFR:g.legAuto, legBL:g.legAuto, legBR:g.legAuto }[k];
  }
  function renderEdit(){
    const o = order, ro = o.stage !== "new", dis = ro ? " disabled" : "";
    let h = '<div class="card"><h2>Клиент</h2>' +
      (ro ? '<div class="note" style="margin:0 0 12px">Разкроят е потвърден, затова полетата са заключени. За промяна на размерите натиснете „Върни в Разкрой“ най-долу.</div>' : '') +
      '<div class="grid"><label>Име<input type="text" id="o-name" value="' + esc(o.name) + '"' + dis + '></label>' +
      '<label>Телефон<input type="text" id="o-phone" value="' + esc(o.phone) + '"' + dis + '></label></div></div>';
    o.tables.forEach((t, i) => {
      h += '<div class="card tbl" data-i="' + i + '"><h2 class="tablehead"><span class="name">Маса ' + (i + 1) + '</span>' +
        (o.tables.length > 1 && !ro ? '<button class="btn danger" data-act="del" type="button">✕ Премахни</button>' : '') + '</h2>' +
        '<div class="tgrid"><div class="drawbox"><svg class="draw" viewBox="0 0 560 420" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif"></svg></div>' +
        '<div><div class="grid">' +
        FIELDS.map(([k,l,u]) => '<label>' + esc(l) + ' <span class="u">(' + u + ')</span><input type="number" min="0" step="1" data-k="' + k + '" value="' + esc(t[k]) + '"' + dis + '></label>').join("") +
        '</div><div class="chks">' +
        '<label class="chk"><input type="checkbox" data-k="splashOn"' + (t.splashOn ? " checked" : "") + dis + '> Борд</label>' +
        '<span class="hemctl"><label>Подгъвка на борда<select data-k="hemDir"' + dis + '>' +
          [["wall","към стената (в дълбочината)"],["front","напред"],["none","без"]].concat(!t.hemDir ? [["","към стената, извън дълбочината (стара поръчка)"]] : [])
            .map(([v,l]) => '<option value="' + v + '"' + ((t.hemDir || "") === v ? " selected" : "") + '>' + l + '</option>').join("") + '</select></label>' +
        '<label>Подгъвка <span class="u">(мм)</span><input type="number" min="0" step="1" data-k="hem" value="' + esc(+t.hem > 0 ? t.hem : "") + '"' + dis + '></label></span>' +
        '<label class="chk"><input type="checkbox" data-k="baseOn"' + (t.baseOn ? " checked" : "") + dis + '> Долна основа (плот)</label>' +
        '<label class="chk"><input type="checkbox" data-k="midOn"' + (t.midOn ? " checked" : "") + dis + '> Втори междинен плот <span class="u mid2info"></span></label>' +
        '</div><div class="muted" style="margin-top:6px">Ламарина 1.5 мм · профил на краката 30×30 мм</div>' +
        '<h3>Допълнителни настройки <span class="u">(мм; празно = стандартно — вижда се в полето)</span></h3><div class="grid advgrid">' +
        ADV_FIELDS.map(([k,l]) => '<label data-adv="' + k + '">' + esc(l) + '<input type="number" min="0" step="any" data-k="' + k + '" value="' + esc(+t[k] > 0 ? t[k] : (k === "baseEdge" || k === "midEdge") && +t.shelfEdge > 0 ? t.shelfEdge : "") + '"' + dis + '></label>').join("") +
        '</div>' +
        '<label style="margin-top:10px">Бележки на клиента<textarea rows="2" data-k="notes"' + dis + '>' + esc(t.notes) + '</textarea></label></div></div></div>';
    });
    if(!ro) h += '<div class="row" style="margin:-4px 0 16px"><button class="btn" id="addT" type="button">➕ Добави маса</button></div>';
    $("order").innerHTML = h;
    o.tables.forEach((t, i) => drawTable(i));
    if(ro) return;

    $("o-name").addEventListener("input", e => { o.name = e.target.value; recompute(); edited(); });
    $("o-phone").addEventListener("input", e => { o.phone = e.target.value; recompute(); edited(); });
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
  function drawTable(i){
    const card = document.querySelector('#order .tbl[data-i="' + i + '"]'); if(!card) return;
    const t = order.tables[i];
    drawBlueprint(Object.assign({}, t, { mid2H:mid2H(t) }), card.querySelector(".draw"), S);
    ADV_FIELDS.forEach(([k]) => { const inp = card.querySelector('[data-k="' + k + '"]'); if(inp) inp.placeholder = advAuto(t, k); });
    card.querySelectorAll('[data-adv="baseEdge"],[data-adv="baseRet"]').forEach(e => e.hidden = !t.baseOn);
    const hc = card.querySelector(".hemctl"); if(hc) hc.hidden = !t.splashOn;
    const hi = card.querySelector('[data-k="hem"]'); if(hi){ hi.placeholder = S.splashHem; hi.disabled = order.stage !== "new" || t.hemDir === "none"; }
    card.querySelectorAll('[data-adv="midEdge"],[data-adv="midRet"]').forEach(e => e.hidden = !t.midOn);
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
       т.е. плотът е D − подгъвката (стари поръчки без посока: към стената, но извън D). */
  const LEG_KEYS = ["legFL","legFR","legBL","legBR"];
  const LEG_NAMES = ["преден ляв","преден десен","заден ляв","заден десен"];
  function tableGeo(t, D){
    const num = v => (+v > 0 ? +v : 0);
    const eT = num(t.topEdge) || D.topEdge;
    const eB = num(t.baseEdge) || num(t.shelfEdge) || D.shelfEdge;
    const eM = num(t.midEdge) || num(t.shelfEdge) || D.shelfEdge;
    const rT = num(t.topRet) || D.topReturn, rB = num(t.baseRet) || D.shelfReturn, rM = num(t.midRet) || D.shelfReturn;
    const hemDir = t.splashOn ? (t.hemDir === "wall" || t.hemDir === "front" || t.hemDir === "none" ? t.hemDir : "legacy") : "none";
    const hem = hemDir === "none" ? 0 : (num(t.hem) || +D.splashHem || 0);
    const hemIn = hemDir === "wall" ? hem : 0;           // влиза в общата дълбочина
    const Dp = (+t.D || 0) - hemIn;                      // дълбочина на самия плот
    const dR = rT - D.topReturn;                       // по-дълга сгъвка на плота → краката навътре
    const front = D.shelfGap + dR;                     // предна страна на предните крака от предния ръб
    const side = (D.shelfGapW + 2 * dR) / 2;           // външна страна на краката от страничния ръб
    const minBack = t.splashOn ? 0 : rT;               // без борд: зад сгъвката; с борд задът е свободен
    let back = t.splashOn ? 0 : Math.max(minBack, +t.legBack || 0);
    let span = Dp - front - back;
    if(num(t.legSpan)){ span = num(t.legSpan); back = Dp - front - span; }
    const legAuto = (+t.H || 0) - 1.5 - (+D.feet || 0);
    const legs = LEG_KEYS.map(k => num(t[k]) || legAuto);
    return { eT, eB, eM, rT, rB, rM, hemDir, hem, hemIn, Dp, front, side, back, minBack, span, shL:(+t.L || 0) - 2 * side, shD:span, legAuto, legs };
  }

  /* ---------- isometric 3D drawing (same in the customer form and the admin) ---------- */
  function drawBlueprint(v, svgEl, D){
    const realL=v.L, realD=v.D, realH=v.H;
    if(!realL||!realD||!realH){ svgEl.innerHTML=''; return; }
    const g=tableGeo(v, D);
    const splashOn=v.splashOn, splashH=v.splashH, baseOn=v.baseOn, baseH=v.baseH, midOn=v.midOn;
    const legProfile=v.legProfile||30;

    const w=realL/1000, d=g.Dp/1000, h=realH/1000, zD=-g.hemIn/1000;   // zD: задният край на общата дълбочина
    const tt=Math.max(0.015,(g.eT+10)/1000), lg=legProfile/1000, st=0.03;
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
    const x0=g.side/1000, x1=w-g.side/1000, z0=Math.max(0,g.back/1000), z1=d-g.front/1000;
    const lxL=x0, lxR=Math.max(x0,x1-lg), backZ=z0, frontZ=Math.max(z0,z1-lg);
    const shelf=(yy,th)=>box(x0,yy,z0, Math.max(0.01,x1-x0), th, Math.max(0.01,z1-z0), B2,B2F,B2R);
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
    leg(2,lxL,backZ); leg(3,lxR,backZ);

    let by=0, midY=0;
    if(baseOn||midOn){ by=Math.min(legH-0.05, Math.max(0.03, baseH/1000)); shelf(by,thB); }
    if(midOn){ midY=Math.min(legH-0.05, (by+legH)/2); shelf(midY,thM); }

    leg(0,lxL,frontZ); leg(1,lxR,frontZ);
    box(0,h-tt,0,w,tt,d,TOP,FRONT,RIGHT);
    if(splashOn){ const bs=Math.max(0.03, splashH/1000), hm=g.hem/1000, toFront=g.hemDir==="front";
      if(hm>0 && !toFront) box(0,h+bs-0.006,-hm,w,0.006,hm,TOP,FRONT,RIGHT);   // подгъвка горе, назад към стената
      box(0,h,0,w,bs,st,TOP,FRONT,RIGHT);
      if(hm>0 && toFront) box(0,h+bs-0.006,st,w,0.006,hm,TOP,FRONT,RIGHT); }    // подгъвка горе, напред

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
    const E = g.eT, R = g.rT, cT = S.topCut / 2, cS = S.shelfCut / 2, st = S.stretch;
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
      backUp:!!t.splashOn, splashH:t.splashH, hem, hemFront:g.hemDir === "front", backFlat:back, leg:0, blankW:topW, blankD:topD, cut:S.topCut });

    // долните плотове са между краката: очертанието им = външните страни на краката (виж tableGeo)
    const shL = g.shL, shD = g.shD;
    const shelves = [];
    if(t.baseOn) shelves.push({ name:"Долна основа (плот)", short:"основа", who:"долната основа", at:t.baseH, E:g.eB, R:g.rB });
    if(t.midOn) shelves.push({ name:"Втори междинен плот", short:"междинен", who:"втория междинен плот", at:mid2H(t), E:g.eM, R:g.rM });
    if(t.midOn && !t.baseOn) warns.push("Втори междинен плот без долна основа — височината му е сметната спрямо полето за основата.");
    shelves.forEach(sh => {
      sh.f = flange(sh.E, sh.R, cS); sh.W = shL + 2*sh.f; sh.Dd = shD + 2*sh.f;
      rows.push({ kind:"sheet", part:sh.name, mat:sheetMat, size:fmt(sh.W)+" × "+fmt(sh.Dd), qty:1,
        note:"Готов: "+fmt(shL)+" × "+fmt(shD)+" мм. От 4-те страни: "+profTxt(sh.E, sh.R)+". Изрези в ъглите "+fmt(sh.f+s)+"×"+fmt(sh.f+s)+
             " мм (кант + крак "+s+"×"+s+"). Горна повърхност на "+sh.at+" мм от пода. Виж схемата." });
      sheets.push({ label:tag+" "+sh.short, w:sh.W, h:sh.Dd });
    });
    // one fold scheme per different shelf profile
    const groups = [];
    shelves.forEach(sh => { const gr = groups.find(x => x.E === sh.E && x.R === sh.R); if(gr) gr.list.push(sh); else groups.push({ E:sh.E, R:sh.R, W:sh.W, Dd:sh.Dd, list:[sh] }); });
    groups.forEach(gr => schemes.push({ title:gr.list.map(x => x.name).join(" и "), qty:gr.list.length, plateL:shL, plateD:shD,
      E:gr.E, R:gr.R, backUp:false, leg:s, blankW:gr.W, blankD:gr.Dd, cut:S.shelfCut }));

    // legs: grouped by length; a shorter leg stands on a block, so the shelves are welded lower on it
    const welded = ["работния плот"].concat(shelves.map(sh => sh.who)).join(", ");
    const pos = "Разположение (външни страни): отпред " + fmt(g.front) + " мм от ръба, отстрани " + fmt(g.side) + " мм, отзад " + fmt(g.back) +
      " мм; между предните и задните крака " + fmt(g.span) + " мм, между левите и десните " + fmt(shL) + " мм. ";
    const byLen = [];
    g.legs.forEach((len, i) => { const gr = byLen.find(x => Math.abs(x.len - len) < 0.05); if(gr) gr.names.push(LEG_NAMES[i]); else byLen.push({ len, names:[LEG_NAMES[i]] }); });
    byLen.forEach((gr, j) => {
      const d = g.legAuto - gr.len;
      let note = (j === 0 ? pos : "") + "Височина " + t.H + " − лист " + th + (S.feet ? " − крачета " + S.feet : "") + " мм" +
        (d > 0.05 ? " − " + fmt(d) + " мм (стъпва на подложка " + fmt(d) + " мм)" : "") + ".";
      if(d > 0.05 && shelves.length)
        note += " Горна повърхност на " + shelves.map(sh => sh.who + " на " + fmt(sh.at - d) + " мм").join(", ") + " от долния край на крака.";
      note += " Заварява се директно към кантовете на: " + welded + ".";
      rows.push({ kind:"tube", part:"Крак" + (byLen.length > 1 ? " — " + gr.names.join(", ") : ""), mat:tubeMat, size:fmt(gr.len), qty:gr.names.length, note });
      if(d < -0.05) warns.push("Крак " + gr.names.join(", ") + " е по-дълъг от стандартния (" + fmt(g.legAuto) + " мм) — плотът няма да е хоризонтален.");
      if(gr.len <= 0) warns.push("Крак " + gr.names.join(", ") + " е с нулева или отрицателна дължина.");
      shelves.forEach(sh => { if(d > 0.05 && sh.at - d <= 0) warns.push("Крак " + gr.names.join(", ") + " е твърде къс — " + sh.who + " (на " + sh.at + " мм) е под долния му край."); });
    });
    rows.push({ kind:"hw", part:S.feet ? "Регулируеми крачета" : "Тапи за краката", mat:"Окомплектовка", size:"—", qty:4,
      note:S.feet ? "Височина "+S.feet+" мм." : "За тръба "+s+"×"+s+"." });
    g.legs.forEach(len => tubes.push({ label:tag+" крак", len }));

    // checks: nothing that cannot be built goes to the workshop silently
    if(t.L <= 0 || t.D <= 0 || t.H <= 0 || shL <= 0 || shD <= 0 || g.legAuto <= 0)
      warns.push("Размерите са твърде малки за тази конструкция — проверете дължина, дълбочина, височина и отстояния.");
    if(g.back < g.minBack - 0.05)
      warns.push("Задните крака излизат на " + fmt(g.back) + " мм от задния ръб — " + (t.splashOn ? "извън плота" : "по-малко от сгъвката на плота (" + g.rT + " мм)") +
        ". Намалете разстоянието между предните и задните крака (най-много " + fmt(g.Dp - g.front - g.minBack) + " мм).");
    if(!t.splashOn && !(+t.legSpan > 0) && (+t.legBack || 0) < g.rT)
      warns.push("Задните крака са преместени на " + g.rT + " мм от задния ръб — зад сгъвката на плота (" + g.rT + " мм), вместо на " + (+t.legBack || 0) + " мм.");
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
    const sheetPieces = [], tubePieces = [];
    let feet = 0;
    per.forEach((r, i) => {
      const q = o.tables[i].qty;
      feet += 4 * q;
      for(let k = 0; k < q; k++){
        r.sheets.forEach(p => sheetPieces.push(Object.assign({}, p, { label: q > 1 ? p.label.replace(/^М(\d+)/, "М$1." + (k + 1)) : p.label })));
        r.tubes.forEach(p => tubePieces.push(Object.assign({}, p)));
      }
    });

    const th = 1.5, s = 30, types = sheetTypes();
    // offcuts from the store go first; a confirmed order is shown against the store as it was before confirming
    const done = o.cut;
    const stock = (done ? INV.items.filter(x => !done.added.includes(x.id)).concat(done.used) : INV.items)
      .filter(x => (+x.th || 1.5) === th);
    const oc = useOffcuts(sheetPieces, stock, S.kerf);
    const nest = packMulti(oc.rest, types, S.kerf);
    // usable leftovers of every sheet and offcut, with the serial numbers they get when the cut is confirmed
    let next = INV.next, k = 0;
    const created = [];
    oc.used.concat(nest.sheets).forEach(sh => {
      sh.left = leftovers(sh, S.kerf, S.offMin).map(l => {
        const id = done ? (done.added[k++] || "?") : serial(next++);
        const src = sh.type.offcut ? "от фира " + sh.type.offcut.id : "от лист " + sh.W + "×" + sh.H;
        const x = Object.assign({ id, src }, l); created.push(x); return x;
      });
    });
    CURRENT = { used:oc.used.map(sh => sh.type.offcut), created };

    const bars = packBars(tubePieces, S.tubeStock, S.kerf);
    const blankArea = sheetPieces.reduce((a, p) => a + Math.max(0, p.w) * Math.max(0, p.h), 0) / 1e6;
    const tubeM = tubePieces.reduce((a, p) => a + Math.max(0, p.len), 0) / 1000;
    const kgPerM = (s*s - Math.pow(Math.max(0, s - 2*S.tubeWall), 2)) * 0.00793;
    const sheetKg = blankArea * th * 7.93, tubeKg = tubeM * kgPerM;
    const nTables = o.tables.reduce((a, t) => a + t.qty, 0);
    const money = v => nest.priced ? "€ " + v.toFixed(2) : v.toFixed(2) + " м²";

    /* ---- price of the order ----
       Our cost: whole sheets actually needed (offcuts are free) + tube sticks.
       Welds + bends are our labour. Client price (quote) is the shared formula. */
    const sheetCostOurs = nest.sheets.reduce((a, sh) => a + (sh.type.offcut ? 0 : (+sh.type.price || 0)), 0);
    const tubeCostOurs = bars.bars.length * (+S.tubePrice || 0);
    let weldOurs = 0, bendOurs = 0;
    o.tables.forEach(t => { const p = priceParts(t); weldOurs += p.weld * t.qty; bendOurs += p.bend * t.qty; });
    const costMaterials = sheetCostOurs + tubeCostOurs;
    const capsOurs = o.tables.reduce((a, t) => a + priceParts(t).caps * t.qty, 0);   // тапички на краката
    const costTotal = costMaterials + weldOurs + bendOurs + capsOurs;
    const client = priceFor({ tables:o.tables });
    PRICING = { client:client ? client.total : 0, costMaterials, weld:weldOurs, bend:bendOurs, caps:capsOurs, costTotal };

    // head: who and what
    const cr = fmtDT(o.created);
    let h = '<div class="card"><h2>' + esc(o.serial ? "Поръчка " + orderSerial(o.serial) : "Поръчка — чака потвърждение на разкроя") + '</h2>' +
      '<div class="printsum">Клиент: <b>' + esc(o.name || "—") + '</b> · Телефон: <b>' + esc(o.phone || "—") + '</b> · Маси: <b>' + nTables + '</b></div>' +
      '<div class="muted" style="margin-top:4px">' + esc(o.source ? "Файл: " + o.source : "Ръчно въведена поръчка") + (cr ? " · създадена от клиента " + esc(cr) : "") + '</div></div>';

    // materials for the whole order
    h += '<div class="card summary"><h2>Материали за цялата поръчка (' + nTables + (nTables === 1 ? ' маса' : ' маси') + ')</h2><div class="totals">';
    if(oc.used.length) h += tot("Фира от склада", oc.used.length + " бр.", oc.used.map(sh => sh.type.offcut.id + " (" + lw(sh.type.offcut) + ")").join(", "));
    types.forEach(t => {
      const used = nest.sheets.filter(sh => sh.type.name === t.name);
      if(!used.length) return;
      const util = used.reduce((a, sh) => a + sh.placed.reduce((b, p) => b + p.w * p.h, 0), 0) / (used.length * t.W * t.H);
      h += tot("Нови листове " + t.name + " мм, " + th + " мм", used.length + " бр.", "използване " + Math.round(util * 100) + "%");
    });
    if(!nest.sheets.length) h += tot("Нови листове " + th + " мм", "0 бр.", oc.used.length ? "всичко е от фира" : "няма детайли от лист");
    h += tot("Нова фира за склада", created.length + " бр.", created.length ? created.map(c => c.id + " (" + lw(c) + ")").join(", ") : "няма годни остатъци") +
      tot("Тръба " + s + "×" + s + " (пръти по " + fmt(S.tubeStock / 1000) + " м)", bars.bars.length + " бр.", "общо " + tubeM.toFixed(2) + " м — само крака") +
      tot(S.feet ? "Регулируеми крачета" : "Тапи за краката", feet + " бр.", "по 4 на маса") +
      tot("Тегло на готовите маси (ориентировъчно)", Math.round(sheetKg + tubeKg) + " кг", "лист " + Math.round(sheetKg) + " кг + тръба " + Math.round(tubeKg) + " кг") +
      '</div>';
    if(nest.sheets.length && types.length > 1){
      h += '<div class="compare"><b>Нови листове — ' + (nest.priced ? 'цена' : 'площ') + ':</b> избрано ' + nest.sheets.length + ' бр., ' + money(nest.cost) +
        nest.singles.map(x => ' · само ' + x.name + ': ' + x.n + ' бр., ' + money(x.cost)).join("") +
        (nest.priced ? '' : '<br><span class="muted">Въведете цените на листовете в настройките, за да се сравнява по цена вместо по площ.</span>') + '</div>';
    }
    if(nest.over.length) h += '<div class="warnbox">⚠ Не се събират на нито един лист (нужна е снадка или по-голям лист): ' +
      nest.over.map(p => esc(p.label) + ' ' + fmt(p.w) + '×' + fmt(p.h)).join(", ") + '</div>';
    if(bars.over.length) h += '<div class="warnbox">⚠ По-дълги от прът ' + S.tubeStock + ' мм: ' +
      bars.over.map(p => esc(p.label) + ' ' + fmt(p.len)).join(", ") + '</div>';
    h += '</div>';

    // one card per table: what it is, what to cut, how to fold
    per.forEach((r, i) => {
      const t = o.tables[i], q = t.qty;
      h += '<div class="card"><h2>Маса ' + (i + 1) + (q > 1 ? ' — ' + q + ' бр. еднакви' : '') + '</h2><div class="printsum">' +
        '<b>' + t.L + ' × ' + t.D + ' × ' + t.H + ' мм</b> · брой: <b>' + q + '</b>' +
        ' · борд: ' + (t.splashOn ? t.splashH + ' мм' + (r.geo.hem ? ' + подгъвка ' + r.geo.hem + ' мм ' + (r.geo.hemDir === 'front' ? 'напред' : 'към стената') +
          (r.geo.hemIn ? ' (в дълбочината; плот ' + fmt(r.geo.Dp) + ' мм)' : r.geo.hemDir === 'legacy' ? ' (извън дълбочината — стара поръчка)' : '') : '') : 'НЕ') +
        ' · задни крака от задния ръб: ' + fmt(r.geo.back) + ' мм' +
        ' · челно лице / сгъвка: плот ' + r.geo.eT + ' / ' + r.geo.rT + ' мм' + (t.baseOn ? ', основа ' + r.geo.eB + ' / ' + r.geo.rB + ' мм' : '') +
          (t.midOn ? ', междинен ' + r.geo.eM + ' / ' + r.geo.rM + ' мм' : '') +
        ' · крака: предни–задни ' + fmt(r.geo.span) + ' мм (външно)' +
          LEG_KEYS.map((k, j) => +t[k] > 0 ? ', ' + LEG_NAMES[j] + ' ' + fmt(r.geo.legs[j]) + ' мм' : '').join('') +
        ' · долна основа: ' + (t.baseOn ? t.baseH + ' мм от пода' : 'НЕ') +
        ' · втори междинен плот: ' + (t.midOn ? '≈ ' + mid2H(t) + ' мм от пода' : 'НЕ') +
        (t.notes.trim() ? '<br><b>Бележка:</b> ' + esc(t.notes) : '') + '</div>' +
        r.warns.map(w => '<div class="warnbox">⚠ ' + esc(w) + '</div>').join("") +
        '<h3>Детайли за рязане' + (q > 1 ? ' — за ' + q + ' маси' : '') + '</h3><div class="tw"><table class="cut"><thead><tr>' +
        '<th>Детайл</th><th>Материал</th><th>Размер за рязане (мм)</th><th>Бр.</th><th>Бележка</th></tr></thead><tbody>' +
        r.rows.map(x => '<tr class="' + x.kind + '"><td>' + esc(x.part) + '</td><td>' + esc(x.mat) + '</td><td class="size">' + esc(x.size) +
          '</td><td class="q">' + (x.qty * q) + '</td><td>' + esc(x.note) + '</td></tr>').join("") +
        '</tbody></table></div>' +
        '<h3>Схема на огъванията</h3><div class="schemes">' + r.schemes.map(foldSvg).join("") + '</div></div>';
    });

    if(oc.used.length || nest.sheets.length){
      h += '<div class="card sheetscard"><h2>Разкрой на листовете</h2><div class="muted">Ориентировъчно разположение на заготовките (с ' + S.kerf +
        ' мм за рязане между тях). ↻ = завъртяна. Зелено = нова фира за склада.</div><div class="sheets" style="margin-top:10px">' +
        oc.used.map(sh => sheetSvg(sh, "Фира " + sh.type.offcut.id)).join("") +
        nest.sheets.map((sh, i) => sheetSvg(sh, "Лист " + (i + 1))).join("") + '</div></div>';
    }
    if(bars.bars.length){
      h += '<div class="card"><h2>Рязане на тръбите</h2><div class="muted">Пръти по ' + S.tubeStock + ' мм, ' + S.kerf + ' мм загуба на рез.</div>' +
        bars.bars.map((b, i) => '<div class="bar"><div class="lbl">Прът ' + (i + 1) + ': ' +
          b.cuts.map(c => fmt(c.len)).join(" + ") + ' · остатък ' + fmt(b.left) + ' мм</div><div class="track">' +
          b.cuts.map(c => '<div class="seg" style="flex:0 0 ' + (c.len / S.tubeStock * 100) + '%" title="' + esc(c.label + ' ' + fmt(c.len)) + '">' + fmt(c.len) + '</div>').join("") +
          '</div></div>').join("") + '</div>';
    }
    $("printView").innerHTML = h;
    renderBar();
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
    try{ localStorage.setItem(INV_KEY, JSON.stringify(INV)); return true; }
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
  $("addOff").addEventListener("click", () => {
    const a = Math.round(+$("addW").value || 0), b = Math.round(+$("addH").value || 0);
    if(a <= 0 || b <= 0){ stockMsg("Въведете дължина и ширина на парчето.", "warn"); return; }
    const id = serial(INV.next++), w = Math.max(a, b), h = Math.min(a, b);
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
    try{ const d = await docGet(id); if(!d){ msg("Документът липсва на това устройство."); return; }
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
        '<div><span>Себестойност материали</span><b>' + esc(eur2(P.costMaterials)) + '</b></div>' +
        '<div><span>Заварки</span><b>' + esc(eur2(P.weld)) + '</b></div>' +
        '<div><span>Огъвания</span><b>' + esc(eur2(P.bend)) + '</b></div>' +
        '<div><span>Тапички на краката</span><b>' + esc(eur2(P.caps)) + '</b></div>' +
        '<div><span>Себестойност общо</span><b>' + esc(eur2(P.costTotal)) + '</b></div>' +
        '<div><span>Разлика (цена − себестойност)</span><b class="' + (diff != null && diff < 0 ? 'neg' : 'pos') + '">' + esc(eur2(diff)) + '</b></div>' +
      '</div>';
    if(!proc){
      const c = CURRENT || { used:[], created:[] };
      h += '<div class="muted" style="margin-top:10px">При потвърждение поръчката получава <b>' + esc(orderSerial(o.serial || ORD.next)) + '</b> и отива в „В обработка“. ' +
        'От склада се взема фира: <b>' + esc(idsTxt(c.used.map(x => x.id))) + '</b> · добавя се нова фира: <b>' + esc(idsTxt(c.created.map(x => x.id))) +
        '</b>. Номерата на новата фира са тези от чертежа — напишете ги върху парчетата.</div>' +
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
        '</div>' +
        '<div class="actions">' +
          '<button class="btn" id="bPrint" type="button">Печат</button>' +
          '<button class="btn" id="bBack" type="button">↶ Върни в Разкрой</button>' +
          '<button class="btn primary big" id="bArchive" type="button">Архивирай</button>' +
        '</div>';
    }
    h += '<div class="status" id="barStatus"></div>';
    el.innerHTML = h;
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
      $("bBack").addEventListener("click", backToWork);
      $("bArchive").addEventListener("click", archiveOrder);
    }
  }
  function snapPrices(o){
    const P = PRICING;
    if(P){ o.clientPrice = P.client; o.cost = P.costTotal; o.costMaterials = P.costMaterials; o.weld = P.weld; o.bend = P.bend; }
  }

  // Разкрой → В обработка: takes the offcuts from the store, adds the new ones, gives the order its number
  function confirmOrder(){
    const o = order;
    if(!o || o.stage !== "new" || !CURRENT) return;
    const now = new Date().toISOString(), usedIds = CURRENT.used.map(x => x.id);
    if(!o.serial) o.serial = ORD.next++;
    const label = orderSerial(o.serial) + (o.name ? " · " + o.name : "");
    INV.items = INV.items.filter(x => !usedIds.includes(x.id));
    const added = CURRENT.created.map(c => {
      const id = serial(INV.next++);
      INV.items.push({ id, w:Math.max(c.w, c.h), h:Math.min(c.w, c.h), th:1.5, from:c.src + " · " + label, added:now });
      return id;
    });
    o.cut = { at:now, used:CURRENT.used.map(x => Object.assign({}, x)), added };
    snapPrices(o);
    o.stage = "processing"; o.confirmedAt = now; delete o.noData;
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
    if(o.hasDoc){ try{ await docDel(o.id); }catch(e){} }
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

  /* ---------- lists: Разкрой (waiting) and В обработка (being made) ---------- */
  function renderLists(){
    const w = byStage("new").sort((a, b) => (a.addedAt || "").localeCompare(b.addedAt || ""));
    const p = byStage("processing").sort((a, b) => (+a.serial || 0) - (+b.serial || 0));
    $("cntWork").textContent = w.length ? w.length : "";
    $("cntProc").textContent = p.length ? p.length : "";
    $("workCount").textContent = w.length ? "(" + w.length + ")" : "";
    $("procCount").textContent = p.length ? "(" + p.length + ")" : "";
    const openBtn = (id, sel) => '<button class="btn small" data-open="' + esc(id) + '" type="button">' + (sel ? "Затвори" : "Отвори") + '</button>';
    $("workList").innerHTML = w.length
      ? '<div class="tw"><table class="cut list"><thead><tr><th>Клиент</th><th>Телефон</th><th>Маси</th><th>Цена за клиента</th><th>Заредена</th><th>Файл</th><th></th></tr></thead><tbody>' +
        w.map(o => '<tr class="' + (SEL.work === o.id ? "sel" : "") + '" data-row="' + esc(o.id) + '">' +
          '<td><b>' + esc(o.name || "без име") + '</b>' + (o.serial ? ' <span class="muted">' + esc(orderSerial(o.serial)) + '</span>' : '') + '</td>' +
          '<td>' + esc(o.phone || "—") + '</td><td class="q">' + nTablesOf(o) + '</td>' +
          '<td class="size">' + esc(eur2(clientPriceOf(o))) + '</td><td>' + esc(fmtDT(o.addedAt)) + '</td>' +
          '<td class="muted">' + esc(o.source || "ръчно") + '</td><td>' + openBtn(o.id, SEL.work === o.id) + '</td></tr>').join("") +
        '</tbody></table></div>'
      : '<div class="empty">Няма чакащи поръчки. Заредете PDF отгоре — може няколко наведнъж.</div>';
    $("procList").innerHTML = p.length
      ? '<div class="tw"><table class="cut list"><thead><tr><th>№</th><th>Клиент</th><th>Телефон</th><th>Маси</th><th>Цена за клиента</th><th>Продажна</th><th>Доставка</th><th>Потвърдена</th><th></th></tr></thead><tbody>' +
        p.map(o => '<tr class="' + (SEL.processing === o.id ? "sel" : "") + '" data-row="' + esc(o.id) + '">' +
          '<td class="size">' + esc(serTxt(o)) + '</td><td><b>' + esc(o.name || "без име") + '</b></td><td>' + esc(o.phone || "—") + '</td>' +
          '<td class="q">' + nTablesOf(o) + '</td><td class="size">' + esc(eur2(o.clientPrice != null ? o.clientPrice : clientPriceOf(o))) + '</td>' +
          '<td class="size">' + esc(eur2(o.price)) + '</td>' +
          '<td>' + esc(o.place || "—") + (o.deliveryDate ? ' · ' + esc(o.deliveryDate) : '') + '</td>' +
          '<td>' + esc(fmtDate(o.confirmedAt)) + '</td><td>' + openBtn(o.id, SEL.processing === o.id) + '</td></tr>').join("") +
        '</tbody></table></div>'
      : '<div class="empty">Няма поръчки в обработка. Поръчка идва тук, когато потвърдите разкроя ѝ в „Разкрой“.</div>';
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
          '<td class="q">' + nTablesOf(o) + '</td>' +
          '<td class="size">' + esc(eur2(o.clientPrice)) + '</td>' +
          '<td class="size">' + esc(eur2(o.cost)) + '</td>' +
          '<td class="size">' + esc(eur2(o.price)) + '</td>' +
          '<td>' + esc(o.place || "—") + (o.deliveryDate ? ' · ' + esc(o.deliveryDate) : "") + '</td>' +
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
      if(o && o.hasDoc){ try{ await docDel(o.id); }catch(e){} }
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
      if(o.hasDoc){ try{ const d = await docGet(o.id); if(d){ rec.doc = await blobToB64(d.blob); rec.docName = d.name; } }catch(e){} }
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
        if(o.doc){ try{ await docPut(o.id, b64ToBlob(o.doc, "application/pdf"), o.docName || o.id + ".pdf"); o.hasDoc = true; }catch(e){} delete o.doc; }
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

  /* ---------- burger menu / pages ---------- */
  const PAGES = { work:"Разкрой", processing:"В обработка", archive:"Архив", stock:"Фира — склад", settings:"Настройки" };
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
    if(name === "stock") renderStock();
    window.scrollTo({ top:0 });
  }
  $("burger").addEventListener("click", () => { const open = !$("menu").hidden; if(open) closeMenu(); else { $("menu").hidden = false; $("menubg").hidden = false; } });
  $("menubg").addEventListener("click", closeMenu);
  document.querySelectorAll(".menuItem").forEach(b => b.addEventListener("click", () => showPage(b.dataset.go)));

  renderStock();
  buildSettings();
  showPage("work");
