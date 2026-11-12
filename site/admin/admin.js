  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = n => String(Math.round(n*10)/10);

  /* ---------- workshop settings ---------- */
  const DEFAULTS = { topEdge:30, topReturn:10, shelfEdge:20, shelfReturn:10, legInset:30, feet:0, bendDed:0, tubeWall:1.5,
                     tubeStock:6000, kerf:3, offMin:100, sheetW:2000, sheetH:1000, sheetPrice:90, sheet2W:2500, sheet2H:1250, sheet2Price:140, tubePrice:40 };
  const SETTINGS = [
    ["topEdge","Работен плот — челна дъска","мм, огъната надолу"],
    ["topReturn","Работен плот — обратно огъване","мм, навътре под плота"],
    ["shelfEdge","Долни плотове — челна дъска","мм, огъната надолу"],
    ["shelfReturn","Долни плотове — обратно огъване","мм, навътре"],
    ["legInset","Отстъп на краката","мм от страничния и предния ръб на плота"],
    ["feet","Регулируеми крачета","мм височина; 0 = без"],
    ["bendDed","Корекция за огъване","мм на всяко огъване (изважда се от заготовката)"],
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
                          legBack:70, baseOn:true, baseH:150, midOn:false, notes:"" };
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
    markupPct: 0,       // надценка % — ЗАДАЙ стойността (сега 0 = без надценка)
    topEdge:30, topReturn:10, shelfEdge:20, shelfReturn:10, legInset:30, thickness:1.5
  };
  const pFloors = t => 1 + (t.baseOn?1:0) + (t.midOn?1:0);
  const pBends  = t => (6 + (t.splashOn?1:2)) + 8*((t.baseOn?1:0)+(t.midOn?1:0));
  function pBlankM2(t){
    const P=PRICE, ft=P.topEdge+P.topReturn, fs=P.shelfEdge+P.shelfReturn;
    const back = t.splashOn ? (+t.splashH||0) : ft;
    const topW=(t.L+2*ft)/1000, topD=(t.D+ft+back)/1000;
    const shL=t.L-2*P.legInset, shD=t.D-(+t.legBack||0);
    const sh=(shL>0&&shD>0)?((shL+2*fs)/1000)*((shD+2*fs)/1000):0;
    return Math.max(0,topW*topD) + ((t.baseOn?1:0)+(t.midOn?1:0))*Math.max(0,sh);
  }
  const pTubeM = t => 4*Math.max(0,(t.H - PRICE.thickness))/1000;
  function priceParts(t){
    const mat=pBlankM2(t)*PRICE.sheetM2, tube=pTubeM(t)*PRICE.tubeM,
          weld=pFloors(t)*PRICE.weldPerFloor, bend=pBends(t)*PRICE.bend;
    return { mat, tube, weld, bend, base:mat+tube+weld+bend };
  }
  function priceFor(order){
    if(!order||!order.tables||!order.tables.length) return null;
    const m=1+PRICE.markupPct/100; let total=0; const lines=[];
    order.tables.forEach((t,i)=>{ const q=t.qty||1, per=priceParts(t).base*m;
      total+=per*q; lines.push({label:"Маса "+(i+1)+(q>1?" × "+q:""), amount:per*q}); });
    return { total, currency:"€", lines };
  }
  const eur2 = v => (v==null?"—":(Math.round(v*100)/100).toFixed(2)+" €");
  let PRICING = null; // latest computed pricing for the loaded order (set in recompute)

  // the customer form stores "MPR1:<base64 JSON>" in the PDF's Keywords field
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

  let order = null;

  function setStatus(msg, kind){ $("status").className = "status " + (kind || ""); $("status").textContent = msg; }

  async function loadFile(file){
    if(!file) return;
    try{
      // an order saved as .json (same shape as the data inside the PDF)
      if(/\.json$/i.test(file.name)){
        const data = JSON.parse(await file.text());
        if(!data || !Array.isArray(data.tables) || !data.tables.length) throw new Error("bad_json");
        order = { name:data.name || "", phone:data.phone || "", created:data.created || "", source:data.source || file.name,
                  orderNo:data.orderNo || "", priceFromPdf:data.price || null, doc:null, archive:{},
                  tables:data.tables.map(normTable) };
        setStatus("✓ Заредена поръчка от „" + file.name + "“: " + order.tables.length + (order.tables.length === 1 ? " маса." : " маси."), "ok");
        renderOrder();
        return;
      }
      const buf = await file.arrayBuffer();
      const data = decodeOrderFromPdf(buf);
      // keep the PDF so it can be saved as the order's document in the archive
      const doc = { bytes:buf.slice(0), name:file.name };
      if(data){
        order = { name:data.name || "", phone:data.phone || "", created:data.created || "", source:file.name,
                  orderNo:data.orderNo || "", priceFromPdf:data.price || null, doc, archive:{},
                  tables:data.tables.map(normTable) };
        setStatus("✓ Заредена поръчка от „" + file.name + "“: " + order.tables.length + (order.tables.length === 1 ? " маса." : " маси."), "ok");
      }else{
        order = { name:"", phone:"", created:"", source:file.name, orderNo:"", priceFromPdf:null, doc, archive:{}, tables:[normTable({})] };
        setStatus("⚠ В „" + file.name + "“ няма данни за поръчката — вероятно е създаден преди обновлението на формата. Въведете размерите от PDF-а ръчно по-долу.", "warn");
      }
      renderOrder();
    }catch(e){
      setStatus(e && e.message === "not_pdf" ? "✕ „" + file.name + "“ не е PDF файл." :
                /\.json$/i.test(file.name) ? "✕ „" + file.name + "“ не е файл с поръчка." : "✕ PDF-ът не може да бъде прочетен.", "bad");
    }
  }

  const drop = $("drop");
  drop.addEventListener("click", () => $("file").click());
  drop.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); $("file").click(); } });
  $("file").addEventListener("change", () => { loadFile($("file").files[0]); $("file").value = ""; });
  ["dragenter","dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave","drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => loadFile(e.dataTransfer.files[0]));
  $("manual").addEventListener("click", () => {
    order = { name:"", phone:"", created:"", source:"", orderNo:"", priceFromPdf:null, doc:null, archive:{}, tables:[normTable({})] };
    setStatus("Ръчна поръчка — въведете размерите.", "");
    renderOrder();
  });
  $("print").addEventListener("click", () => window.print());

  /* ---------- order editor ---------- */
  const FIELDS = [
    ["qty","Брой еднакви маси","бр."], ["L","Дължина","мм"], ["D","Дълбочина","мм"], ["H","Височина","мм"],
    ["legBack","Задни крака от ръба","мм"], ["splashH","Височина на борда","мм"], ["baseH","Долна основа от пода","мм"],
  ];
  function renderOrder(){
    $("print").disabled = !order;
    if(!order){ $("order").innerHTML = ""; $("results").innerHTML = ""; return; }
    const created = order.created ? new Date(order.created) : null;
    let h = '<div class="card"><h2>Клиент</h2><div class="grid editor">'+
      '<label>Име<input type="text" id="o-name" value="'+esc(order.name)+'"></label>'+
      '<label>Телефон<input type="text" id="o-phone" value="'+esc(order.phone)+'"></label></div>'+
      '<div class="printonly printsum" id="o-print"></div>'+
      '<div class="muted" style="margin-top:8px">'+
        (order.source ? 'Файл: '+esc(order.source) : 'Ръчно въведена поръчка')+
        (created && !isNaN(created) ? ' · Създадена: '+esc(created.toLocaleString("bg-BG")) : '')+
      '</div></div>';
    // --- save-to-archive panel ---
    const aid = (order.orderNo||"").trim() || orderKey();
    const prev = ARCH.orders.find(o => o.id === aid);
    const a = order.archive || {};
    const pfPrice = (a.price!=null && a.price!=="") ? a.price : (prev ? prev.price : "");  // ръчна продажна цена
    const pfPlace = (a.place!=null ? a.place : (prev ? prev.place : "")) || "";
    const pfDate  = (a.deliveryDate!=null ? a.deliveryDate : (prev ? prev.deliveryDate : "")) || "";
    const docNote = order.doc ? ("Документ за прикачане: " + esc(order.doc.name))
      : (prev && prev.hasDoc ? ("Запазен документ: " + esc(prev.docName||"PDF")) : "Без документ — заредете PDF на поръчката, за да се запази.");
    h += '<div class="card noprint" id="archPanel"><h2>Запазване в архива</h2>'+
      (order.orderNo ? '<div class="muted">Поръчка № <b>'+esc(order.orderNo)+'</b></div>' : '<div class="muted">Поръчка без номер — ще се запише с вътрешен номер.</div>')+
      '<div class="pricebox" id="archCalc"></div>'+
      '<div class="grid" style="margin-top:10px">'+
      '<label>Продажна цена <span class="u">(€)</span><input type="number" min="0" step="0.01" id="arch-price" value="'+esc(pfPrice)+'" placeholder="колко е продадена"></label>'+
      '<label>Място на доставка<input type="text" id="arch-place" value="'+esc(pfPlace)+'" placeholder="адрес или обект"></label>'+
      '<label>Дата на доставка<input type="date" id="arch-ddate" value="'+esc(pfDate)+'"></label>'+
      '</div>'+
      '<div class="row"><button class="btn primary" id="archSave" type="button">'+(prev?'Обнови в архива':'Запази в архива')+'</button></div>'+
      '<div class="muted" style="margin-top:6px">'+docNote+'. Цената за клиента и себестойността се смятат автоматично; „Продажна цена“ въвеждате ръчно.</div></div>';
    order.tables.forEach((t, i) => {
      h += '<div class="card tbl" data-i="'+i+'">'+
        '<h2 class="tablehead"><span class="name">Маса '+(i+1)+'</span>'+
        (order.tables.length > 1 ? '<button class="btn danger noprint" data-act="del" type="button">✕ Премахни</button>' : '')+
        '</h2><div class="printonly printsum"></div><div class="editor"><div class="grid">'+
        FIELDS.map(([k,l,u]) => '<label>'+esc(l)+' <span class="u">('+u+')</span><input type="number" min="0" step="1" data-k="'+k+'" value="'+esc(t[k])+'"></label>').join("")+
        '<label class="chk"><input type="checkbox" data-k="splashOn"'+(t.splashOn?" checked":"")+'> Борд</label>'+
        '<label class="chk"><input type="checkbox" data-k="baseOn"'+(t.baseOn?" checked":"")+'> Долна основа (плот)</label>'+
        '<label class="chk"><input type="checkbox" data-k="midOn"'+(t.midOn?" checked":"")+'> Втори междинен плот</label>'+
        '</div>'+
        '<label style="margin-top:10px">Бележки на клиента<textarea rows="2" data-k="notes">'+esc(t.notes)+'</textarea></label></div>'+
        '<div class="cutout"></div></div>';
    });
    h += '<div class="row noprint" style="margin:-4px 0 16px"><button class="btn" id="addT" type="button">➕ Добави маса</button></div>';
    $("order").innerHTML = h;

    $("o-name").addEventListener("input", e => order.name = e.target.value);
    $("o-phone").addEventListener("input", e => order.phone = e.target.value);
    // keep the archive fields on the order so they survive re-renders (e.g. adding a table)
    $("arch-price").addEventListener("input", e => { (order.archive=order.archive||{}).price = e.target.value; });
    $("arch-place").addEventListener("input", e => { (order.archive=order.archive||{}).place = e.target.value; });
    $("arch-ddate").addEventListener("input", e => { (order.archive=order.archive||{}).deliveryDate = e.target.value; });
    $("archSave").addEventListener("click", saveToArchive);
    $("addT").addEventListener("click", () => { order.tables.push(normTable({})); renderOrder(); });
    document.querySelectorAll(".tbl").forEach(card => {
      const t = order.tables[+card.dataset.i];
      card.querySelectorAll("[data-k]").forEach(inp => {
        inp.addEventListener("input", () => {
          const k = inp.dataset.k;
          if(inp.type === "checkbox"){
            t[k] = inp.checked;
            // same rule as the customer form: the second shelf needs the base
            if(k === "midOn" && t.midOn){ t.baseOn = true; card.querySelector('[data-k="baseOn"]').checked = true; }
            if(k === "baseOn" && !t.baseOn){ t.midOn = false; card.querySelector('[data-k="midOn"]').checked = false; }
          }else if(inp.tagName === "TEXTAREA"){ t[k] = inp.value; }
          else{ t[k] = k === "qty" ? Math.max(1, Math.round(+inp.value || 1)) : (+inp.value || 0); }
          recompute();
        });
      });
      const del = card.querySelector('[data-act="del"]');
      if(del) del.addEventListener("click", () => { order.tables.splice(+card.dataset.i, 1); renderOrder(); });
    });
    recompute();
  }

  /* ---------- construction: one table ----------
     Top: one sheet. Front and sides: front board folded down, then a return folded inward under the plate.
          Back: борд folded up, or the same board + return when there is no борд.
     Shelves (долна основа, втори междинен плот): board down + return inward on all 4 sides, between the legs.
     Legs: 30×30 tube, welded straight to the folded edges of the top and shelves — no frame rails (царги). */
  function computeTable(t, idx){
    const s = t.legProfile || 30, th = t.thickness || 1.5;
    const E = S.topEdge, R = S.topReturn, F = S.shelfEdge, Rs = S.shelfReturn, I = S.legInset, B = S.bendDed;
    const tag = "М" + (idx + 1);
    const rows = [], sheets = [], tubes = [], warns = [], schemes = [];
    const sheetMat = "Лист инокс " + th + " мм", tubeMat = "Тръба " + s + "×" + s;
    // flat width of a double-folded edge: board + return, two bends
    const flange = (e, r) => e + r - (r > 0 ? 2 : 1) * B;
    const profTxt = (e, r) => "челна дъска " + e + " мм надолу" + (r > 0 ? " + " + r + " мм навътре" : "");

    const fTop = flange(E, R);
    const back = t.splashOn ? t.splashH - B : fTop;
    const topW = t.L + 2*fTop, topD = t.D + fTop + back;
    rows.push({ kind:"sheet", part:"Работен плот" + (t.splashOn ? " с борд" : ""), mat:sheetMat, size:fmt(topW)+" × "+fmt(topD), qty:1,
      note:"Готов: "+t.L+" × "+t.D+" мм. Отпред и отстрани: "+profTxt(E, R)+"; отзад: "+(t.splashOn ? "борд "+t.splashH+" мм нагоре" : "същото")+
           ". Изрези в ъглите: отпред "+fmt(fTop)+"×"+fmt(fTop)+", отзад "+fmt(fTop)+"×"+fmt(back)+" мм. Виж схемата." });
    sheets.push({ label:tag+" плот", w:topW, h:topD });
    schemes.push({ title:"Работен плот" + (t.splashOn ? " с борд" : ""), qty:1, plateL:t.L, plateD:t.D, E, R,
      backUp:!!t.splashOn, splashH:t.splashH, leg:0, blankW:topW, blankD:topD });

    // долният плот е наравно отпред с горния и само отзад е по-малък със заден отстъп (legBack)
    const shL = t.L - 2*I, shD = t.D - t.legBack;
    const shelves = [];
    if(t.baseOn) shelves.push({ name:"Долна основа (плот)", short:"основа", at:t.baseH });
    if(t.midOn) shelves.push({ name:"Втори междинен плот", short:"междинен", at:mid2H(t) });
    if(t.midOn && !t.baseOn) warns.push("Втори междинен плот без долна основа — височината му е сметната спрямо полето за основата.");
    const fSh = flange(F, Rs), shW = shL + 2*fSh, shDd = shD + 2*fSh;
    shelves.forEach(sh => {
      rows.push({ kind:"sheet", part:sh.name, mat:sheetMat, size:fmt(shW)+" × "+fmt(shDd), qty:1,
        note:"Готов: "+fmt(shL)+" × "+fmt(shD)+" мм. От 4-те страни: "+profTxt(F, Rs)+". Изрези в ъглите "+fmt(fSh+s)+"×"+fmt(fSh+s)+
             " мм (кант + крак "+s+"×"+s+"). Горна повърхност на "+sh.at+" мм от пода. Виж схемата." });
      sheets.push({ label:tag+" "+sh.short, w:shW, h:shDd });
    });
    if(shelves.length) schemes.push({ title:shelves.map(x => x.name).join(" и "), qty:shelves.length, plateL:shL, plateD:shD,
      E:F, R:Rs, backUp:false, leg:s, blankW:shW, blankD:shDd });

    const leg = t.H - th - S.feet;
    const welded = ["работния плот"].concat(shelves.map(sh => sh.short === "основа" ? "долната основа" : "втория междинен плот")).join(", ");
    rows.push({ kind:"tube", part:"Крак", mat:tubeMat, size:fmt(leg), qty:4,
      note:"Височина "+t.H+" − лист "+th+(S.feet ? " − крачета "+S.feet : "")+" мм. Заварява се директно към кантовете на: "+welded+"." });
    rows.push({ kind:"hw", part:S.feet ? "Регулируеми крачета" : "Тапи за краката", mat:"Окомплектовка", size:"—", qty:4,
      note:S.feet ? "Височина "+S.feet+" мм." : "За тръба "+s+"×"+s+"." });
    for(let i = 0; i < 4; i++) tubes.push({ label:tag+" крак", len:leg });

    if(t.L <= 0 || t.D <= 0 || t.H <= 0 || shL <= 0 || shD <= 0 || leg <= 0)
      warns.push("Размерите са твърде малки за тази конструкция — проверете дължина, дълбочина, височина и отстояния.");
    if(t.midOn && mid2H(t) <= t.baseH) warns.push("Вторият междинен плот не е над основата — проверете височините.");
    return { rows, sheets, tubes, warns, schemes };
  }

  /* ---------- fold diagram: flat blank with bend lines + edge cross-section (schematic, not to scale) ---------- */
  function foldSvg(sc){
    // fold segments in proportion to each other (2 px per mm: 10 → 20, 30 → 60); the plate itself is not to scale
    const segPx = v => Math.max(18, Math.min(90, v * 2));
    const side = sc.R > 0 ? [sc.R, sc.E] : [sc.E];                 // outer edge → plate
    const backSegs = sc.backUp ? [sc.splashH] : side;
    const sp = side.map(segPx), bp = backSegs.map(segPx);
    const fx = sp.reduce((a, b) => a + b, 0), fyB = bp.reduce((a, b) => a + b, 0), fyF = fx;
    const k = Math.min(300 / sc.plateL, 190 / sc.plateD);
    const PW = Math.max(140, sc.plateL * k), PD = Math.max(90, sc.plateD * k);
    const nl = sc.leg ? 12 : 0;
    const X0 = 92, Y0 = 70, BW = 2*fx + PW, BH = fyB + PD + fyF;
    const t = (x, y, s, o) => '<text x="' + x + '" y="' + y + '" ' + (o || '') + '>' + s + '</text>';
    const ln = (x1, y1, x2, y2, st) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" ' + st + '/>';
    const RED = 'stroke="#dc2626" stroke-width="2" stroke-dasharray="7 4"', ORG = 'stroke="#ea580c" stroke-width="2" stroke-dasharray="3 3"',
          GRN = 'stroke="#16a34a" stroke-width="2" stroke-dasharray="7 4"', DIM = 'stroke="#475569" stroke-width="1"';
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
    bp.forEach((w, i) => { c += w; const st = sc.backUp ? GRN : (i === bp.length - 1 ? RED : ORG); g += ln(xa, Y0 + c, xb, Y0 + c, st); });
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
    let ly = eyB + 62;
    if(sc.backUp){
      const kb = Math.min(1.2, 70 / Math.max(sc.splashH, 1)), bx = PX + 20, by = ly + sc.splashH * kb;
      g += t(PX, ly - 6, "Отзад — борд", 'font-size="12" font-weight="700" fill="#15223a"');
      g += '<path d="M' + (bx + 130) + ',' + by + ' L' + bx + ',' + by + ' L' + bx + ',' + ly + '" fill="none" stroke="#15223a" stroke-width="4"/>';
      g += t(bx + 10, (ly + by) / 2 + 5, sc.splashH + " мм нагоре", 'font-size="14" font-weight="700" fill="#16a34a"');
      ly = by + 26;
    }else{
      g += t(PX, ly, sc.leg ? "Еднакво от 4-те страни." : "Отзад — същото като отпред.", 'font-size="12" fill="#475569"');
      ly += 16;
    }
    // legend
    const LY = Math.max(Y0 + BH + (sc.leg ? 40 : 26), ly + 10);
    const leg = [[RED, "огъване 90° надолу (челна дъска)"]].concat(sc.R > 0 ? [[ORG, "обратно огъване 90° навътре"]] : []).concat(sc.backUp ? [[GRN, "борд — огъване нагоре"]] : []);
    leg.forEach((l, i) => { const lx = 20 + i * 250; g += ln(lx, LY, lx + 34, LY, l[0]) + t(lx + 42, LY + 4, l[1], 'font-size="12" fill="#334155"'); });
    const VW = Math.max(PX + 260, 20 + leg.length * 250), VH = LY + 16;
    return '<figure class="scheme"><svg viewBox="0 0 ' + VW + ' ' + VH + '" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif">' + g + '</svg>' +
      '<figcaption>' + esc(sc.title) + (sc.qty > 1 ? ' — ' + sc.qty + ' бр. еднакви' : '') + ' · заготовка ' + fmt(sc.blankW) + ' × ' + fmt(sc.blankD) + ' мм · огъванията са в пропорция, плотът не е в мащаб</figcaption></figure>';
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

  /* ---------- render results ---------- */
  function recompute(){
    if(!order){ $("results").innerHTML = ""; return; }
    const per = order.tables.map((t, i) => computeTable(t, i));
    const sheetPieces = [], tubePieces = [];
    let feet = 0;
    per.forEach((r, i) => {
      const q = order.tables[i].qty;
      feet += 4 * q;
      for(let k = 0; k < q; k++){
        r.sheets.forEach(p => sheetPieces.push(Object.assign({}, p, { label: q > 1 ? p.label.replace(/^М(\d+)/, "М$1." + (k + 1)) : p.label })));
        r.tubes.forEach(p => tubePieces.push(Object.assign({}, p)));
      }
    });

    const op = $("o-print");
    if(op) op.innerHTML = 'Клиент: <b>' + esc(order.name || "—") + '</b> · Телефон: <b>' + esc(order.phone || "—") + '</b>';

    // per-table cut lists, inside each table card
    document.querySelectorAll(".tbl").forEach(card => {
      const i = +card.dataset.i, r = per[i], q = order.tables[i].qty;
      const t = order.tables[i];
      card.querySelector(".printsum").innerHTML =
        '<b>' + t.L + ' × ' + t.D + ' × ' + t.H + ' мм</b> · брой: <b>' + q + '</b>' +
        ' · борд: ' + (t.splashOn ? t.splashH + ' мм' : 'НЕ') +
        ' · задни крака от ръба: ' + t.legBack + ' мм' +
        ' · долна основа: ' + (t.baseOn ? t.baseH + ' мм от пода' : 'НЕ') +
        ' · втори междинен плот: ' + (t.midOn ? '≈ ' + mid2H(t) + ' мм от пода' : 'НЕ') +
        (t.notes.trim() ? '<br><b>Бележка:</b> ' + esc(t.notes) : '');
      let h = r.warns.map(w => '<div class="warnbox">⚠ ' + esc(w) + '</div>').join("");
      h += '<h3>Детайли за рязане' + (q > 1 ? ' — за ' + q + ' маси' : '') + '</h3><div class="tw"><table class="cut"><thead><tr>' +
        '<th>Детайл</th><th>Материал</th><th>Размер за рязане (мм)</th><th>Бр.</th><th>Бележка</th></tr></thead><tbody>' +
        r.rows.map(x => '<tr class="' + x.kind + '"><td>' + esc(x.part) + '</td><td>' + esc(x.mat) + '</td><td class="size">' + esc(x.size) +
          '</td><td class="q">' + (x.qty * q) + '</td><td>' + esc(x.note) + '</td></tr>').join("") +
        '</tbody></table></div>';
      h += '<h3>Схема на огъванията</h3><div class="schemes">' + r.schemes.map(foldSvg).join("") + '</div>';
      card.querySelector(".cutout").innerHTML = h;
    });

    const th = 1.5, s = 30, types = sheetTypes();
    // offcuts from the store go first; a confirmed order is shown against the store as it was before confirming
    const key = orderKey(), done = INV.done[key];
    const stock = (done ? INV.items.filter(o => !done.added.includes(o.id)).concat(done.used) : INV.items)
      .filter(o => (+o.th || 1.5) === th);
    const oc = useOffcuts(sheetPieces, stock, S.kerf);
    const nest = packMulti(oc.rest, types, S.kerf);
    // usable leftovers of every sheet and offcut, with the serial numbers they get when the cut is confirmed
    let next = INV.next, k = 0;
    const created = [];
    oc.used.concat(nest.sheets).forEach(sh => {
      sh.left = leftovers(sh, S.kerf, S.offMin).map(l => {
        const id = done ? (done.added[k++] || "?") : serial(next++);
        const src = sh.type.offcut ? "от фира " + sh.type.offcut.id : "от лист " + sh.W + "×" + sh.H;
        const o = Object.assign({ id, src }, l); created.push(o); return o;
      });
    });
    CURRENT = { key, used:oc.used.map(sh => sh.type.offcut), created };

    const bars = packBars(tubePieces, S.tubeStock, S.kerf);
    const blankArea = sheetPieces.reduce((a, p) => a + Math.max(0, p.w) * Math.max(0, p.h), 0) / 1e6;
    const tubeM = tubePieces.reduce((a, p) => a + Math.max(0, p.len), 0) / 1000;
    const kgPerM = (s*s - Math.pow(Math.max(0, s - 2*S.tubeWall), 2)) * 0.00793;
    const sheetKg = blankArea * th * 7.93, tubeKg = tubeM * kgPerM;
    const nTables = order.tables.reduce((a, t) => a + t.qty, 0);
    const money = v => nest.priced ? "€ " + v.toFixed(2) : v.toFixed(2) + " м²";
    const ids = list => list.length ? list.join(", ") : "—";

    /* ---- price of the order ----
       Our cost: whole sheets actually needed (offcuts are free) + tube sticks.
       Welds + bends are our labour. Client price (quote) is the shared formula. */
    const sheetCostOurs = nest.sheets.reduce((a, sh) => a + (sh.type.offcut ? 0 : (+sh.type.price || 0)), 0);
    const tubeCostOurs = bars.bars.length * (+S.tubePrice || 0);
    let weldOurs = 0, bendOurs = 0;
    order.tables.forEach((t, i) => { const q = order.tables[i].qty, p = priceParts(t); weldOurs += p.weld*q; bendOurs += p.bend*q; });
    const costMaterials = sheetCostOurs + tubeCostOurs;      // материали (себестойност)
    const costTotal = costMaterials + weldOurs + bendOurs;   // пълна себестойност
    const client = priceFor({ tables: order.tables });       // цена за клиента (с надценка)
    PRICING = { client: client ? client.total : 0, costMaterials, weld: weldOurs, bend: bendOurs, costTotal };
    const ac = $("archCalc");
    if(ac) ac.innerHTML =
      '<div><span>Цена за клиента</span><b>'+esc(eur2(PRICING.client))+'</b></div>'+
      '<div><span>Себестойност материали (листове + тръба)</span><b>'+esc(eur2(costMaterials))+'</b></div>'+
      '<div><span>Заварки</span><b>'+esc(eur2(weldOurs))+'</b></div>'+
      '<div><span>Огъвания</span><b>'+esc(eur2(bendOurs))+'</b></div>'+
      '<div><span>Себестойност общо</span><b>'+esc(eur2(costTotal))+'</b></div>';

    let h = '<div class="card summary"><h2>Материали за цялата поръчка (' + nTables + (nTables === 1 ? ' маса' : ' маси') + ')</h2><div class="totals">';
    if(oc.used.length) h += tot("Фира от склада", oc.used.length + " бр.", oc.used.map(sh => sh.type.offcut.id + " (" + lw(sh.type.offcut) + ")").join(", "));
    types.forEach(t => {
      const used = nest.sheets.filter(sh => sh.type.name === t.name);
      if(!used.length) return;
      const util = used.reduce((a, sh) => a + sh.placed.reduce((b, p) => b + p.w * p.h, 0), 0) / (used.length * t.W * t.H);
      h += tot("Нови листове " + t.name + " мм, " + th + " мм", used.length + " бр.", "използване " + Math.round(util * 100) + "%");
    });
    if(!nest.sheets.length) h += tot("Нови листове " + th + " мм", "0 бр.", oc.used.length ? "всичко е от фира" : "няма детайли от лист");
    h += tot("Нова фира за склада", created.length + " бр.", created.length ? created.map(c => c.id + " (" + lw(c) + ")").join(", ") : "няма годни остатъци") +
      tot("Тръба " + s + "×" + s + " (пръти по " + fmt(S.tubeStock / 1000) + " м)", bars.bars.length + " бр.",
          "общо " + tubeM.toFixed(2) + " м — само крака") +
      tot(S.feet ? "Регулируеми крачета" : "Тапи за краката", feet + " бр.", "по 4 на маса") +
      tot("Тегло на готовите маси (ориентировъчно)", Math.round(sheetKg + tubeKg) + " кг",
          "лист " + Math.round(sheetKg) + " кг + тръба " + Math.round(tubeKg) + " кг") +
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
    h += '<div class="commit noprint">' + (done
      ? '<div class="donebox">✓ Разкроят е потвърден на ' + esc(new Date(done.at).toLocaleString("bg-BG")) + '. Взета от склада: ' +
          esc(ids(done.used.map(u => u.id))) + ' · добавена: ' + esc(ids(done.added)) + '.</div>' +
        '<button class="btn" id="undoCut" type="button">↶ Отмени потвърждението</button>'
      : '<button class="btn primary" id="commitCut" type="button">✓ Потвърди разкроя — поръчката е нарязана</button>' +
        '<div class="muted">Ще вземе от склада: ' + esc(ids(CURRENT.used.map(o => o.id))) + ' · ще добави: ' + esc(ids(created.map(c => c.id))) +
        '. Номерата на новата фира са тези от чертежа — напишете ги върху парчетата.</div>') + '</div>';
    h += '</div>';

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
    $("results").innerHTML = h;
    const cb = $("commitCut"); if(cb) cb.addEventListener("click", commitCut);
    const ub = $("undoCut"); if(ub) ub.addEventListener("click", undoCut);
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
  // an order's identity: the same order loaded again is recognised as already cut
  function orderKey(){
    const s = JSON.stringify([order.name, order.phone, order.created, order.tables]);
    let h = 5381; for(let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return "o" + h.toString(36) + s.length.toString(36);
  }
  const orderLabel = () => (order.source || "ръчна поръчка") + (order.name ? " · " + order.name : "");
  function commitCut(){
    if(!CURRENT || INV.done[CURRENT.key]) return;
    const now = new Date().toISOString(), usedIds = CURRENT.used.map(o => o.id);
    INV.items = INV.items.filter(o => !usedIds.includes(o.id));
    const added = CURRENT.created.map(c => {
      const id = serial(INV.next++);
      INV.items.push({ id, w:Math.max(c.w, c.h), h:Math.min(c.w, c.h), th:1.5, from:c.src + " · " + orderLabel(), added:now });
      return id;
    });
    INV.done[CURRENT.key] = { at:now, label:orderLabel(), used:CURRENT.used.map(o => Object.assign({}, o)), added };
    saveInv(); renderStock(); recompute();
    stockMsg("✓ Разкроят е потвърден: взета фира " + (usedIds.join(", ") || "—") + "; добавена " + (added.join(", ") || "—") + ".", "ok");
  }
  function undoCut(){
    const key = CURRENT && CURRENT.key, d = key && INV.done[key];
    if(!d) return;
    const gone = d.added.filter(id => !INV.items.some(o => o.id === id));
    INV.items = INV.items.filter(o => !d.added.includes(o.id));
    d.used.forEach(u => { if(!INV.items.some(o => o.id === u.id)) INV.items.push(u); });
    delete INV.done[key];
    saveInv(); renderStock(); recompute();
    stockMsg(gone.length ? "⚠ Потвърждението е отменено, но " + gone.join(", ") + " вече не е в склада (използвана в друга поръчка или премахната)."
                         : "↶ Потвърждението е отменено — складът е както преди поръчката.", gone.length ? "warn" : "ok");
  }
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
      const cut = new Set(Object.values(INV.done).flatMap(x => (x.used || []).map(u => u.id)));
      INV.items = INV.items.filter(o => !cut.has(o.id));
      const top = Math.max(0, ...INV.items.map(o => +String(o.id).replace(/\D/g, "") || 0));
      INV.next = Math.max(INV.next, +d.next || 1, top + 1);
      saveInv(); renderStock(); recompute();
      stockMsg("✓ Заредено копие: " + n + " нови парчета (общо " + INV.items.length + ").", "ok");
    }catch(e){ stockMsg("✕ Файлът не е резервно копие на склада.", "bad"); }
  });

  /* ---------- orders archive ----------
     Metadata lives in localStorage; the order PDFs live in IndexedDB (too big for localStorage).
     Backup/restore carries both. Everything stays in this browser — nothing is uploaded. */
  const ARCH_KEY="mpr-admin-orders-v1";
  let ARCH=loadArch();
  function loadArch(){ try{ const d=JSON.parse(localStorage.getItem(ARCH_KEY)||"null"); if(d&&Array.isArray(d.orders)) return d; }catch(e){} return {orders:[]}; }
  function saveArch(){ try{ localStorage.setItem(ARCH_KEY,JSON.stringify(ARCH)); return true; }catch(e){ archMsg("⚠ Браузърът не позволява запазване — свалете резервно копие.","bad"); return false; } }
  function archMsg(m,k){ $("archStatus").className="status "+(k||""); $("archStatus").textContent=m; }
  function eur(v){ return v==null?"—":(Math.round(v*100)/100).toFixed(2)+" €"; }

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

  async function saveToArchive(){
    if(!order) return;
    const id=(order.orderNo||"").trim() || orderKey();
    const priceIn=$("arch-price")?$("arch-price").value.trim():"";
    const P = PRICING || {};
    const rec={
      id, orderNo:(order.orderNo||"").trim(), savedAt:new Date().toISOString(), created:order.created||"",
      name:($("o-name")?$("o-name").value:order.name||"").trim(), phone:($("o-phone")?$("o-phone").value:order.phone||"").trim(),
      price: priceIn!=="" ? +priceIn : null,                                   // продажна цена (ръчна)
      clientPrice: P.client!=null ? P.client : null,                          // цена за клиента (авто)
      cost: P.costTotal!=null ? P.costTotal : null,                           // себестойност общо
      costMaterials: P.costMaterials!=null ? P.costMaterials : null,
      place:($("arch-place")?$("arch-place").value:"").trim(), deliveryDate:$("arch-ddate")?$("arch-ddate").value:"",
      source:order.source||"",
      tables:order.tables.map(t=>({L:t.L,D:t.D,H:t.H,qty:t.qty,splashOn:t.splashOn,splashH:t.splashH,legBack:t.legBack,baseOn:t.baseOn,baseH:t.baseH,midOn:t.midOn,notes:t.notes})),
      hasDoc:false, docName:""
    };
    if(order.doc&&order.doc.bytes){
      try{ await docPut(id,new Blob([order.doc.bytes],{type:"application/pdf"}),order.doc.name); rec.hasDoc=true; rec.docName=order.doc.name; }
      catch(e){ rec.hasDoc=false; }
    }else{ const p=ARCH.orders.find(o=>o.id===id); if(p&&p.hasDoc){ rec.hasDoc=true; rec.docName=p.docName; } }
    const i=ARCH.orders.findIndex(o=>o.id===id);
    if(i>=0) ARCH.orders[i]=rec; else ARCH.orders.unshift(rec);
    saveArch(); renderArchive();
    archMsg("✓ Запазена в архива"+(rec.orderNo?" ("+rec.orderNo+")":"")+". "+(rec.hasDoc?"Документът е прикачен.":"Без документ."), "ok");
    $("archiveCard").scrollIntoView({behavior:"smooth", block:"start"});
  }
  function openArchived(id){
    const o=ARCH.orders.find(x=>x.id===id); if(!o) return;
    order={ name:o.name, phone:o.phone, created:o.created, source:o.orderNo?("Архив: "+o.orderNo):"Архив",
      orderNo:o.orderNo, priceFromPdf:(o.price!=null?{total:o.price,currency:"€"}:null), doc:null,
      archive:{ price:o.price!=null?o.price:"", place:o.place, deliveryDate:o.deliveryDate }, tables:o.tables.map(normTable) };
    setStatus("Заредена от архива: "+(o.orderNo||"поръчка")+". (Документът остава в архива — заредете PDF, за да го замените.)","ok");
    renderOrder(); window.scrollTo({top:0,behavior:"smooth"});
  }
  async function openDoc(id){
    try{ const d=await docGet(id); if(!d){ archMsg("Документът липсва на това устройство.","warn"); return; }
      const url=URL.createObjectURL(d.blob); const a=document.createElement("a"); a.href=url; a.download=d.name||("poruchka-"+id+".pdf");
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000);
    }catch(e){ archMsg("Грешка при отваряне на документа.","bad"); }
  }
  async function removeArchived(id){
    ARCH.orders=ARCH.orders.filter(o=>o.id!==id); saveArch(); try{ await docDel(id); }catch(e){}
    renderArchive(); archMsg("Премахната от архива.","");
  }
  function renderArchive(){
    const q=($("archSearch").value||"").toLowerCase().trim();
    let list=ARCH.orders.slice().sort((a,b)=>(b.savedAt||"").localeCompare(a.savedAt||""));
    if(q) list=list.filter(o=>((o.orderNo||"")+" "+(o.name||"")+" "+(o.phone||"")+" "+(o.place||"")).toLowerCase().includes(q));
    $("archiveList").innerHTML = list.length
      ? '<div class="tw"><table class="cut arch"><thead><tr><th>№</th><th>Запазена</th><th>Клиент</th><th>Телефон</th><th>Маси</th><th>Клиентска цена</th><th>Себестойност</th><th>Продажна</th><th>Доставка</th><th>Документ</th><th></th></tr></thead><tbody>'+
        list.map(o=>'<tr>'+
          '<td class="size">'+esc(o.orderNo||"—")+'</td>'+
          '<td>'+esc(o.savedAt?new Date(o.savedAt).toLocaleDateString("bg-BG"):"")+'</td>'+
          '<td>'+esc(o.name||"—")+'</td>'+
          '<td>'+esc(o.phone||"—")+'</td>'+
          '<td class="q">'+o.tables.reduce((a,t)=>a+(t.qty||1),0)+'</td>'+
          '<td class="size">'+esc(eur(o.clientPrice))+'</td>'+
          '<td class="size">'+esc(eur(o.cost))+'</td>'+
          '<td class="size">'+esc(eur(o.price))+'</td>'+
          '<td>'+esc(o.place||"—")+(o.deliveryDate?' · '+esc(o.deliveryDate):"")+'</td>'+
          '<td>'+(o.hasDoc?'<button class="btn" data-doc="'+esc(o.id)+'" type="button">Отвори</button>':'—')+'</td>'+
          '<td style="white-space:nowrap"><button class="btn" data-open="'+esc(o.id)+'" type="button">Зареди</button> <button class="btn danger" data-rm="'+esc(o.id)+'" type="button">Премахни</button></td>'+
        '</tr>').join("")+'</tbody></table></div>'+
        '<div class="muted" style="margin-top:6px">'+list.length+(q?' от '+ARCH.orders.length:'')+(ARCH.orders.length===1?' поръчка':' поръчки')+'</div>'
      : '<div class="empty">'+(ARCH.orders.length?"Няма съвпадения.":"Архивът е празен. Заредете поръчка и натиснете „Запази в архива“.")+'</div>';
    $("archiveList").querySelectorAll("[data-doc]").forEach(b=>b.addEventListener("click",()=>openDoc(b.dataset.doc)));
    $("archiveList").querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>openArchived(b.dataset.open)));
    $("archiveList").querySelectorAll("[data-rm]").forEach(b=>b.addEventListener("click",()=>{
      if(b.dataset.armed!=="1"){ b.dataset.armed="1"; b.textContent="Сигурно? Натисни пак"; return; } removeArchived(b.dataset.rm);
    }));
  }
  $("archSearch").addEventListener("input", renderArchive);
  $("archExport").addEventListener("click", async ()=>{
    archMsg("Подготвям копие с документите...","");
    const out={ kind:"mpr-orders", v:1, saved:new Date().toISOString(), orders:[] };
    for(const o of ARCH.orders){ const rec=Object.assign({},o);
      if(o.hasDoc){ try{ const d=await docGet(o.id); if(d){ rec.doc=await blobToB64(d.blob); rec.docName=d.name; } }catch(e){} }
      out.orders.push(rec);
    }
    const url=URL.createObjectURL(new Blob([JSON.stringify(out)],{type:"application/json"}));
    const a=document.createElement("a"); a.href=url; a.download="arhiv-poruchki-"+new Date().toISOString().slice(0,10)+".json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000);
    archMsg("⬇ Резервното копие е свалено ("+ARCH.orders.length+" поръчки).","ok");
  });
  $("archImport").addEventListener("click", ()=>$("archImportFile").click());
  $("archImportFile").addEventListener("change", async ()=>{
    const f=$("archImportFile").files[0]; $("archImportFile").value=""; if(!f) return;
    try{ const d=JSON.parse(await f.text()); if(!d||!Array.isArray(d.orders)) throw new Error("bad");
      let n=0;
      for(const o of d.orders){ if(!o||!o.id) continue;
        if(o.doc){ try{ await docPut(o.id,b64ToBlob(o.doc,"application/pdf"),o.docName||o.id+".pdf"); o.hasDoc=true; }catch(e){} delete o.doc; }
        const i=ARCH.orders.findIndex(x=>x.id===o.id); if(i>=0) ARCH.orders[i]=o; else ARCH.orders.push(o); n++;
      }
      saveArch(); renderArchive(); archMsg("✓ Заредени "+n+" поръчки от копието (общо "+ARCH.orders.length+").","ok");
    }catch(e){ archMsg("✕ Файлът не е резервно копие на архива.","bad"); }
  });

  renderStock();
  renderArchive();
  buildSettings();
  renderOrder();
