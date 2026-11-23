  const COMPANY_WHATSAPP = "359893457703";
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tables = [];
  let seq = 0;
  let priceShown = false;
  let ORDER_NO = "";  // авто номер — вижда се само като име на PDF файла и скрито за админа

  const CURRENCY = "€";
  const fmtMoney = v => (Math.round(v*100)/100).toFixed(2) + " " + CURRENCY;
  // readable, hard-to-collide order number: П-<date>-<4 chars>
  function genOrderNo(){
    const d=new Date(), p=n=>String(n).padStart(2,"0");
    const ymd=""+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate());
    const A="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let r="";
    const buf=(window.crypto&&crypto.getRandomValues)?crypto.getRandomValues(new Uint32Array(4)):null;
    for(let i=0;i<4;i++) r+=A[(buf?buf[i]:Math.floor(Math.random()*4294967296))%A.length];
    return "П-"+ymd+"-"+r;
  }

  /* ---------- per-table template ---------- */
  const TPL = `
    <h2><span class="num" style="margin-right:auto">Маса</span><button class="rm" type="button">✕ Премахни</button></h2>

    <h3>Чертеж (3D изглед)</h3>
    <svg class="bp draw" viewBox="0 0 560 420" xmlns="http://www.w3.org/2000/svg"></svg>

    <h3>Размери и опции</h3>
    <div class="row">
      <div>
        <label>Дължина <span class="hint">(мм)</span></label>
        <input type="number" class="f-L" value="1200" min="200" max="3000" step="10">
      </div>
      <div>
        <label>Дълбочина <span class="hint">(мм)</span></label>
        <input type="number" class="f-D" value="600" min="200" max="1200" step="10">
      </div>
    </div>
    <label>Височина <span class="hint">(мм)</span></label>
    <input type="number" class="f-H" value="850" min="400" max="1200" step="10">

    <label class="toggle"><input type="checkbox" class="f-splashOn"> С борд (кант отзад)</label>
    <div class="sub f-splashBox">
      <label>Височина на борда <span class="hint">(мм)</span></label>
      <input type="number" class="f-splashH" value="100" min="20" max="300" step="10">
      <label>Подгъвка горе на борда</label>
      <div class="row">
        <div><span class="hint">Посока</span><select class="f-hemDir">
          <option value="wall" selected>Към стената</option>
          <option value="none">Без подгъвка</option>
        </select></div>
        <div class="f-hemSizeBox"><span class="hint">Размер (мм, 10–60)</span><input type="number" class="f-hem" value="20" min="10" max="60" step="1"></div>
      </div>
      <p class="info f-hemInfo"></p>
    </div>

    <div class="f-legBackBox">
      <label>Отстояние на задните крака от задния ръб (стената) <span class="hint">(мм, мин. 12 мм)</span></label>
      <input type="number" class="f-legBack" value="70" min="12" max="400" step="1">
    </div>

    <label class="toggle"><input type="checkbox" class="f-legs6"> 6 крака (още един чифт крака по средата)</label>
    <div class="sub f-legs6Box">
      <label>Долният плот е</label>
      <select class="f-shelfSide">
        <option value="left" selected>в лявата част (гледано отпред)</option>
        <option value="right">в дясната част (гледано отпред)</option>
      </select>
      <label>Разстояние от крайните до средните крака <span class="hint">(мм, външно — колкото е дълъг долният плот; празно = средните крака са по средата)</span></label>
      <input type="number" class="f-bayL" min="100" max="3000" step="1">
      <p class="info f-legs6Info"></p>
      <label class="toggle"><input type="checkbox" class="f-rails" checked> Профили 30×30 в празната част (отзад и отстрани, отпред е отворено)</label>
      <div class="f-railBox">
        <label>Височина на профилите от пода <span class="hint">(мм, до долния им ръб)</span></label>
        <input type="number" class="f-railH" value="100" min="10" max="1000" step="1">
      </div>
      <label class="toggle"><input type="checkbox" class="f-gn"> Стелаж за тави GN 1/1 (530 × 325 мм) в празната част</label>
      <div class="f-gnBox">
        <div class="row">
          <div><span class="hint">Брой нива</span><input type="number" class="f-gnLevels" min="1" max="20" step="1"></div>
          <div><span class="hint">Разстояние между нивата (мм)</span><input type="number" class="f-gnPitch" value="120" min="40" max="400" step="1"></div>
        </div>
        <p class="info f-gnInfo"></p>
      </div>
    </div>

    <label class="toggle"><input type="checkbox" class="f-baseOn" checked> Долен плот</label>
    <div class="sub f-baseBox">
      <label>Разстояние от пода до долния плот <span class="hint">(мм)</span></label>
      <input type="number" class="f-baseH" value="150" min="20" max="600" step="10">
    </div>

    <label class="toggle"><input type="checkbox" class="f-midOn"> Втори междинен плот</label>
    <div class="sub f-midBox">
      <p class="hint">Вторият междинен плот се поставя автоматично <b>по средата между долния плот и горния работен плот</b>. <span class="f-mid2info"></span></p>
      <p class="hint" style="margin-top:6px">Тази опция включва и долния плот — задайте неговата височина по-горе.</p>
    </div>

    <label class="toggle"><input type="checkbox" class="f-advOn"> Допълнителни настройки</label>
    <div class="sub f-advBox">
      <p class="hint">Само ако е нужно — иначе се използват стандартните стойности.</p>
      <label>Челно лице (височина на канта)</label>
      <div class="row3">
        <div><span class="hint">Работен плот</span><select class="f-topEdge"><option value="20">20 мм</option><option value="30" selected>30 мм</option><option value="40">40 мм</option><option value="50">50 мм</option><option value="60">60 мм</option></select></div>
        <div class="f-advBase"><span class="hint">Долен плот</span><select class="f-baseEdge"><option value="20" selected>20 мм</option><option value="30">30 мм</option><option value="40">40 мм</option><option value="50">50 мм</option><option value="60">60 мм</option></select></div>
        <div class="f-advMid"><span class="hint">Втори междинен плот</span><select class="f-midEdge"><option value="20" selected>20 мм</option><option value="30">30 мм</option><option value="40">40 мм</option><option value="50">50 мм</option><option value="60">60 мм</option></select></div>
      </div>
      <label>Сгъвка отдолу навътре <span class="hint">(мм, от 12 до 30)</span></label>
      <div class="row3">
        <div><span class="hint">Работен плот</span><input type="number" class="f-topRet" value="12" min="12" max="30" step="1"></div>
        <div class="f-advBase"><span class="hint">Долен плот</span><input type="number" class="f-baseRet" value="12" min="12" max="30" step="1"></div>
        <div class="f-advMid"><span class="hint">Втори междинен плот</span><input type="number" class="f-midRet" value="12" min="12" max="30" step="1"></div>
      </div>
      <label>Разстояние от предните до задните крака <span class="hint">(мм, външно; празно = стандартно)</span></label>
      <input type="number" class="f-legSpan" min="100" max="1200" step="1">
      <label>Отстояние на краката от ръба отстрани <span class="hint">(мм, до външната страна на крака; празно = стандартно)</span></label>
      <div class="row">
        <div><span class="hint">От левия ръб</span><input type="number" class="f-sideL" min="1" max="1000" step="0.5"></div>
        <div><span class="hint">От десния ръб</span><input type="number" class="f-sideR" min="1" max="1000" step="0.5"></div>
      </div>
      <p class="hint f-spanInfo"></p>
      <label>Височина на всеки крак <span class="hint">(мм, ако крак стъпва на нещо; празно = стандартно; ляво/дясно гледано отпред)</span></label>
      <div class="row">
        <div><span class="hint">Преден ляв</span><input type="number" class="f-legFL" min="50" step="0.5"></div>
        <div><span class="hint">Преден десен</span><input type="number" class="f-legFR" min="50" step="0.5"></div>
        <div><span class="hint">Заден ляв</span><input type="number" class="f-legBL" min="50" step="0.5"></div>
        <div><span class="hint">Заден десен</span><input type="number" class="f-legBR" min="50" step="0.5"></div>
      </div>
      <p class="hint f-legInfo"></p>
    </div>

    <label>Бележки <span class="hint">(по избор)</span></label>
    <textarea class="f-notes" placeholder="напр. отвор за мивка, усилена конструкция, инокс 304..."></textarea>

    <div class="row">
      <div>
        <label>Дебелина на ламарината</label>
        <p class="info">Ламарината е с дебелина <b>1.5 мм</b>.</p>
      </div>
      <div>
        <label>Размер на профила на крака</label>
        <p class="info">Профилът на краката е <b>30 × 30 мм</b>.</p>
      </div>
    </div>
  `;

  function createTable(){
    seq++;
    const card = document.createElement('div');
    card.className = 'card tableCard';
    card.innerHTML = TPL;
    $("tables").appendChild(card);
    const t = { card };
    const midCb = card.querySelector('.f-midOn'), baseCb = card.querySelector('.f-baseOn');
    // registered before the render listeners so they run first
    midCb.addEventListener('input', ()=>{ if(midCb.checked) baseCb.checked = true; });
    baseCb.addEventListener('input', ()=>{ if(!baseCb.checked) midCb.checked = false; });
    card.querySelectorAll('input,textarea,select').forEach(el=>{
      el.addEventListener('input', renderAll);
      el.addEventListener('change', renderAll);
    });
    card.querySelector('.rm').addEventListener('click', ()=>{
      const i = tables.indexOf(t);
      if(i>=0) tables.splice(i,1);
      card.remove();
      renderAll();
    });
    tables.push(t);
    renderAll();
    return t;
  }

  /* ---------- read a table's values ---------- */
  function readTable(t){
    const q = s => t.card.querySelector(s);
    const H = +q('.f-H').value||0;
    const baseH = +q('.f-baseH').value||0;
    const topUnder = Math.max(0, H-40);
    const mid2H = Math.round((baseH + topUnder)/2);
    const v = {
      L:+q('.f-L').value||0, D:+q('.f-D').value||0, H,
      splashOn:q('.f-splashOn').checked, splashH:+q('.f-splashH').value||0,
      hemDir:q('.f-hemDir').value, hem:q('.f-hemDir').value==="none" ? 0 : Math.min(60, Math.max(10, Math.round(+q('.f-hem').value||20))),
      legBack:Math.max(12, +q('.f-legBack').value||0),   // минимум 12 мм (зад перото 12 мм)
      baseOn:q('.f-baseOn').checked, baseH,
      midOn:q('.f-midOn').checked, mid2H,
      notes:q('.f-notes').value.trim(),
      legProfile:30, frame:false,   // рамка: само от админа (и винаги при 6 крака — виж isFrame)
      legs6:q('.f-legs6').checked, shelfSide:q('.f-shelfSide').value === "right" ? "right" : "left", bayL:0,
      rails:q('.f-legs6').checked && q('.f-rails').checked, railH:0,
      gn:q('.f-legs6').checked && q('.f-gn').checked, gnLevels:0, gnPitch:0
    };
    if(v.gn){ v.gnPitch = Math.min(400, Math.max(40, Math.round(+q('.f-gnPitch').value || 120))); if(v.gnPitch === 120) v.gnPitch = 0;
      const lv = Math.round(+q('.f-gnLevels').value || 0); if(lv > 0) v.gnLevels = lv; }
    if(v.rails) v.railH = tableGeo(Object.assign({}, v, { railH:+q('.f-railH').value || 100 }), PRICE).railH;
    if(v.legs6){   // разстоянието до средните крака — в границите, които стават; стандартното се пази като 0
      const g = tableGeo(v, PRICE), x = +q('.f-bayL').value || 0;
      if(x){ v.bayL = Math.round(tableGeo(Object.assign({}, v, { bayL:x }), PRICE).shL * 10) / 10; if(v.bayL === g.shL) v.bayL = 0; }
    }
    readAdvanced(t, v);
    return v;
  }
  // the advanced settings; everything 0 = the standard value. Values are clamped to what can be built.
  function readAdvanced(t, v){
    const q = s => t.card.querySelector(s), n = s => +q(s).value || 0;
    const ret = x => Math.min(30, Math.max(12, Math.round(x || 12)));
    v.advOn = q('.f-advOn').checked;
    ["topEdge","baseEdge","midEdge","topRet","baseRet","midRet","legSpan","sideL","sideR"].concat(LEG_KEYS).forEach(k => v[k] = 0);
    if(v.advOn){
      v.topEdge = n('.f-topEdge'); v.baseEdge = n('.f-baseEdge'); v.midEdge = n('.f-midEdge');
      if(!isFrame(v)){ v.topRet = ret(n('.f-topRet')); v.baseRet = ret(n('.f-baseRet')); v.midRet = ret(n('.f-midRet')); }   // тави: без сгъвка навътре
      const g0 = tableGeo(v, PRICE);                       // with the standard leg positions
      v.legBack = Math.max(g0.minBack, v.legBack);         // back legs stay behind the top's return
      const auto = tableGeo(v, PRICE);
      const maxSpan = auto.Dp - auto.front - auto.minBack, sp = n('.f-legSpan');
      if(sp) v.legSpan = Math.round(Math.min(maxSpan, Math.max(100, sp)) * 10) / 10;
      ["sideL","sideR"].forEach(k => { const x = n('.f-' + k);   // отстояние отляво / отдясно: остават поне 300 мм между краката
        if(x) v[k] = Math.round(Math.min(Math.max(1, (v.L - 300) / 2), Math.max(1, x)) * 10) / 10;
        if(v[k] === auto.sideStd) v[k] = 0; });
      LEG_KEYS.forEach(k => { const x = n('.f-' + k);
        if(x) v[k] = Math.round(Math.min(auto.legAuto, Math.max(50, x)) * 10) / 10;
        if(v[k] === auto.legAuto) v[k] = 0; });
    }
    return v;
  }
  function tableSpecAdvanced(v){
    if(!v.advOn) return "";
    const g = tableGeo(v, PRICE);
    let s = "Челно лице: работен плот "+g.eT+" мм"+(v.baseOn?", долен плот "+g.eB+" мм":"")+(v.midOn?", втори междинен плот "+g.eM+" мм":"")+"\n";
    s += "Сгъвка навътре: работен плот "+g.rT+" мм"+(v.baseOn?", долен плот "+g.rB+" мм":"")+(v.midOn?", втори междинен плот "+g.rM+" мм":"")+"\n";
    if(v.legSpan) s += "Разстояние между предните и задните крака (външно): "+v.legSpan+" мм\n";
    if(v.sideL || v.sideR) s += "Краката от ръба: отляво "+g.sideL+" мм, отдясно "+g.sideR+" мм (външно)\n";
    const legs = LEG_KEYS.map((k,i) => v[k] ? LEG_NAMES[i]+" "+v[k]+" мм" : "").filter(Boolean);
    if(legs.length) s += "Височина на краката: "+legs.join(", ")+" (останалите "+g.legAuto+" мм)\n";
    return s;
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
  const isFrame = t => !!(t && (t.frame || t.legs6));
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
    const sideL = num(t.sideL) || sideStd, sideR = num(t.sideR) || sideStd, side = sideL;   // отстояние отляво / отдясно
    const minBack = frame ? fg : t.splashOn ? 0 : rT;  // без борд: зад сгъвката; с борд задът е свободен; рамка: в тавата
    let back = t.splashOn ? minBack : Math.max(minBack, +t.legBack || 0);
    let span = Dp - front - back;
    if(num(t.legSpan)){ span = num(t.legSpan); back = Dp - front - span; }
    const legAuto = (+t.H || 0) - 1.5 - (+D.feet || 0);
    const legs = LEG_KEYS.map(k => num(t[k]) || legAuto);
    // долните плотове: между крайните крака, или — при 6 крака — от крайните до средните (лява/дясна част)
    const L = +t.L || 0, prof = +t.legProfile || 30, full = L - sideL - sideR, legs6 = !!t.legs6, right = t.shelfSide === "right";
    let shL = full, shX = sideL, midX = null, bayAuto = 0;
    if(legs6){
      bayAuto = Math.round((L / 2 + prof / 2 - (right ? sideR : sideL)) * 10) / 10;
      shL = Math.min(full - prof - 50, Math.max(2 * prof + 100, num(t.bayL) || bayAuto));
      shX = right ? L - sideR - shL : sideL;
      midX = right ? shX : sideL + shL - prof;         // лявата страна на средните крака
    }
    // профилите в празната част (само при 6 крака): x0..x1 = светлото между средния и крайния крак
    const rails = legs6 && !!t.rails, railH = Math.min(Math.max(10, (+t.H || 0) - 200), Math.max(10, num(t.railH) || 100));
    const railX0 = legs6 ? (right ? sideL + prof : sideL + shL) : 0, railX1 = legs6 ? (right ? shX : L - sideR - prof) : 0;
    let railXs = legs6 ? (right ? [sideL, midX] : [midX, L - sideR - prof]) : [];
    // стелаж за GN 1/1 (само при 6 крака, в празната част до крайните крака): чифт стойки 30×30 (отпред и отзад) на
    // gnGap светло от крайните крака + винкели 20×20 от двете страни на всяко ниво (тавата 530×325 влиза отпред)
    const gn = legs6 && !!t.gn, gnGap = 345, gnPitch = Math.max(40, num(t.gnPitch) || 120);
    let gnX = null, gnLevels = 0, gnZ = [], gnOk = true;
    if(gn){
      gnX = right ? sideL + prof + gnGap : L - sideR - prof - gnGap - prof;            // лявата страна на стойките
      gnOk = right ? gnX + prof <= midX - 20 : gnX >= midX + prof + 20;                // да не опира в средните крака
      const topZ = (+t.H || 0) - 1.5 - prof, lowZ = rails ? railH + prof + 30 : 80;     // винкелите: под рамката на плота … над профилите
      const max = Math.max(0, Math.floor((topZ - lowZ) / gnPitch) + 1);
      gnLevels = Math.min(max, Math.max(1, Math.round(num(t.gnLevels) || max)));
      for(let k = 0; k < gnLevels; k++) gnZ.push(Math.round((topZ - k * gnPitch) * 10) / 10);   // горната страна на винкела
      if(gnOk) railXs = railXs.concat([gnX]).sort((a, b) => a - b);
    }
    const gnPosts = gn && gnOk ? [gnX] : [];
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
             rails, railH, railX0, railX1, railLen:railSegs.reduce((a, v) => a + v, 0), railSegs, railD:rails ? Math.max(0, span - 2 * prof) : 0, railXs,
             railJoints:rails ? 2 * (railSegs.length + railXs.length) : 0,
             gn, gnOk, gnX, gnGap, gnPitch, gnLevels, gnZ, gnPosts, gnAngle:gn && gnOk ? Math.max(0, span - 2 * prof) : 0 };
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
      g.railXs.forEach(x=>box(x/1000,ry,backZ+lg,lg,lg,Math.max(0.01,frontZ-backZ-lg),TOP,FRONT,RIGHT)); }

    if(g.frame){   // царгите на рамката — под тавите (рисуват се преди плотовете, за да ги покрият челните дъски)
      const b0=Math.min(legH-0.05, Math.max(0.03, baseH/1000)), lv={top:h-0.0015, base:b0, mid:(b0+legH)/2};
      g.frameRails.forEach(r=>{ const y=lv[r.lvl]-lg;
        if(r.dir==="x"){ box(r.x/1000,y,backZ,r.len/1000,lg,lg,TOP,FRONT,RIGHT); box(r.x/1000,y,frontZ,r.len/1000,lg,lg,TOP,FRONT,RIGHT); }
        else box(r.x/1000,y,backZ+lg,lg,lg,Math.max(0.01,frontZ-backZ-lg),TOP,FRONT,RIGHT); }); }
    let by=0, midY=0;
    if(baseOn||midOn){ by=Math.min(legH-0.05, Math.max(0.03, baseH/1000)); shelf(by,thB); }
    if(midOn){ midY=Math.min(legH-0.05, (by+legH)/2); shelf(midY,thM); }

    if(g.gnPosts.length){ const gx=g.gnX/1000, an=0.02, ex=[g.right?x0+lg:x1-lg, gx+(g.right?0:lg)];   // GN: стойките + винкелите
      box(gx,0,backZ,lg,Math.max(0.01,legH),lg,TOP,FRONT,RIGHT);
      g.gnZ.forEach(z=>{ const y=z/1000-an; [[g.right?x0+lg:gx+lg],[g.right?gx-an:x1-lg-an]].forEach(([ax])=>box(ax,y,backZ+lg,an,an,Math.max(0.01,frontZ-backZ-lg),TOP,FRONT,RIGHT)); }); }
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

  /* ---------- per-table spec text ---------- */
  function tableSpec(v, n){
    let s="🔧 МАСА "+n+" — ИНОКС ПО РАЗМЕР\n──────────────\n";
    s+="Дължина:    "+v.L+" мм\n";
    s+="Дълбочина:  "+v.D+" мм\n";
    s+="Височина:   "+v.H+" мм\n";
    s+="Дебелина ламарина: 1.5 мм\n";
    s+="Профил крак: 30 × 30 мм\n";
    s+="Борд:       "+(v.splashOn?"ДА ("+v.splashH+" мм)":"НЕ")+"\n";
    if(v.splashOn) s+="Подгъвка на борда: "+(v.hemDir==="wall" ? v.hem+" мм към стената (включена в дълбочината "+v.D+" мм; плот "+(v.D-v.hem)+" мм)"
                                          : v.hemDir==="front" ? v.hem+" мм напред" : "НЕ")+"\n";
    if(!v.splashOn) s+="Задни крака отстояние от ръба: "+v.legBack+" мм\n";
    if(v.legs6){ const g = tableGeo(v, PRICE);
      s+="Крака:      6 (среден чифт на "+(Math.round(g.shL*10)/10)+" мм от "+(g.right?"десните":"левите")+" крака, външно)\n";
      if(v.rails) s+="Профили в празната част: отзад и отстрани, на "+v.railH+" мм от пода (отпред е отворено)\n";
      if(g.gnPosts.length) s+="Стелаж за GN 1/1: "+g.gnLevels+" нива през "+g.gnPitch+" мм (345 мм светло)\n"; }
    s+="Долен плот: "+(v.baseOn?"ДА (на "+v.baseH+" мм от пода"+(v.legs6?", в "+(v.shelfSide==="right"?"дясната":"лявата")+" част":"")+")":"НЕ")+"\n";
    s+="Втори междинен плот: "+(v.midOn?"ДА (по средата между долния и работния плот, ≈ "+v.mid2H+" мм от пода)":"НЕ")+"\n";
    s+=tableSpecAdvanced(v);
    if(v.notes) s+="Бележки:    "+v.notes+"\n";
    return s;
  }

  // the advanced box: which plates are shown, standard values as hints, what the entered values mean
  function renderAdvanced(t, v){
    const q = s => t.card.querySelector(s);
    q('.f-advBox').style.display = v.advOn ? "block" : "none";
    t.card.querySelectorAll('.f-advBase').forEach(e => e.style.visibility = v.baseOn ? "visible" : "hidden");
    t.card.querySelectorAll('.f-advMid').forEach(e => e.style.visibility = v.midOn ? "visible" : "hidden");
    { const r = q('.f-topRet').closest('.row3'); if(r){ r.style.display = isFrame(v) ? "none" : ""; if(r.previousElementSibling) r.previousElementSibling.style.display = isFrame(v) ? "none" : ""; } }
    if(!v.advOn) return;
    const g = tableGeo(v, PRICE), auto = tableGeo(Object.assign({}, v, { legSpan:0 }), PRICE);
    q('.f-legSpan').placeholder = "стандартно " + Math.round(auto.span * 10) / 10;
    q('.f-spanInfo').textContent = v.legSpan
      ? "Задните крака ще са на " + Math.round(g.back * 10) / 10 + " мм от задния ръб" + (v.splashOn ? " (борд)" : "") + "; долните плотове ще са дълбоки " + v.legSpan + " мм. Най-много " + Math.round((g.Dp - g.front - g.minBack) * 10) / 10 + " мм."
      : "";
    LEG_KEYS.forEach(k => q('.f-' + k).placeholder = String(g.legAuto));
    q('.f-sideL').placeholder = q('.f-sideR').placeholder = "стандартно " + g.sideStd;
    const raised = LEG_KEYS.map((k, i) => v[k] ? LEG_NAMES[i] + ": " + v[k] + " мм — стъпва на " + Math.round((g.legAuto - v[k]) * 10) / 10 + " мм" : "").filter(Boolean);
    q('.f-legInfo').textContent = raised.length ? raised.join("; ") + ". Плотът остава хоризонтален на " + v.H + " мм." : "";
  }

  /* ---------- render everything ---------- */
  function renderAll(){
    tables.forEach((t,i)=>{
      t.card.querySelector('.num').textContent = "Маса "+(i+1);
      t.card.querySelector('.rm').style.display = tables.length>1 ? "inline-flex" : "none";
      const v = readTable(t);
      t.vals = v;
      t.card.querySelector('.f-splashBox').style.display = v.splashOn?"block":"none";
      t.card.querySelector('.f-hemSizeBox').style.visibility = v.hemDir==="none" ? "hidden" : "visible";
      { const g = tableGeo(v, PRICE);
        t.card.querySelector('.f-hemInfo').textContent = v.hemDir==="wall"
          ? "Общата дълбочина "+v.D+" мм е до стената и включва подгъвката: плот "+g.Dp+" мм + подгъвка "+v.hem+" мм."
          : "Без подгъвка — дълбочината на плота е "+v.D+" мм."; }
      t.card.querySelector('.f-legBackBox').style.display = (v.splashOn || v.legSpan) ? "none" : "block";
      t.card.querySelector('.f-legs6Box').style.display = v.legs6 ? "block" : "none";
      t.card.querySelector('.f-railBox').style.display = v.rails ? "block" : "none";
      t.card.querySelector('.f-gnBox').style.display = v.gn ? "block" : "none";
      if(v.gn){ const g = tableGeo(v, PRICE);
        t.card.querySelector('.f-gnLevels').placeholder = "до " + g.gnLevels;
        t.card.querySelector('.f-gnInfo').textContent = g.gnOk
          ? "Две стойки 30×30 на 345 мм от крайните крака и винкели 20×20 — тавите влизат отпред. Нива: " + g.gnLevels + " (горното на " + g.gnZ[0] + " мм от пода, долното на " + g.gnZ[g.gnZ.length - 1] + " мм)." + (g.gnAngle < 530 ? " Внимание: масата е плитка за GN 1/1 (530 мм) — тавата ще стърчи отпред." : "")
          : "Празната част е твърде къса за стелажа — намалете разстоянието до средните крака или удължете масата."; }
      if(v.legs6){ const g = tableGeo(v, PRICE);
        t.card.querySelector('.f-bayL').placeholder = "по средата " + g.bayAuto;
        t.card.querySelector('.f-legs6Info').textContent = "Средните крака са на " + (Math.round(g.shL * 10) / 10) + " мм от " + (g.right ? "десните" : "левите") +
          " крака (външно)" + (v.baseOn ? " — там е долният плот" + (v.midOn ? " и вторият междинен плот" : "") : "") + ". От другата страна остава празно до " +
          (Math.round((g.full - g.shL) * 10) / 10) + " мм."; }
      renderAdvanced(t, v);
      t.card.querySelector('.f-baseBox').style.display = v.baseOn?"block":"none";
      t.card.querySelector('.f-midBox').style.display = v.midOn?"block":"none";
      t.card.querySelector('.f-mid2info').textContent = v.midOn ? "(≈ "+v.mid2H+" мм от пода)" : "";
      drawBlueprint(v, t.card.querySelector('.draw'), PRICE);
      t.specText = tableSpec(v, i+1);
    });

    let s="";
    tables.forEach(t=>{ s += t.specText + "\n"; });
    s += "══════════════\n";
    s += "Брой маси: "+tables.length+"\n";
    const nm=$("name").value.trim(), ph=$("phone").value.trim();
    if(nm) s+="Име:     "+nm+"\n";
    if(ph) s+="Телефон: "+ph+"\n";
    s+="Доставка: "+deliveryText(readDelivery())+"\n";
    { const pc=promoOf($("promo").value); if(pc) s+="Промокод: "+pc.code+" (−"+pc.pct+"%)\n"; }
    const o=buildOrder();
    $("spec").textContent=s;
    renderPrice(o);
  }

  function renderPrice(o){
    const box=$("price");
    $("promoBox").hidden=!priceShown;   // промокодът — под цената, след „Калкулирай цена“
    if(!priceShown){ box.hidden=true; return; }
    box.hidden=false;
    const p=o&&o.price;
    if(!p){
      box.innerHTML='<div class="pmsg">Автоматичната цена ще бъде добавена скоро. Изпратете поръчката и ще се свържем с вас за потвърждение и цена.</div>';
      return;
    }
    box.innerHTML='<div class="pbig">'+esc(fmtMoney(p.total))+'</div>'+
      (p.lines&&p.lines.length?'<div class="plines">'+p.lines.map(l=>'<div><span>'+esc(l.label)+'</span><b>'+esc(fmtMoney(l.amount))+'</b></div>').join("")+'</div>':'')+
      '<div class="pnote">Цената се потвърждава от нас.</div>';
  }

  $("name").addEventListener("input", renderAll);
  $("phone").addEventListener("input", renderAll);
  // промокод: показва дали важи; цената се смята наново
  function renderPromo(){
    const v=$("promo").value.trim(), pc=promoOf(v), el=$("promoMsg");
    el.textContent = !v ? "" : pc ? "✓ Отстъпка "+pc.pct+"% за цялата поръчка" : "Невалиден промокод";
    el.className = "hint" + (v ? (pc ? " promo-ok" : " promo-bad") : "");
  }
  $("promo").addEventListener("input", ()=>{ renderPromo(); pdfCache=null; renderAll(); });
  /* ---------- доставка ---------- */
  const DLV = { address:"до адрес", office:"до офис на Еконт", pickup:"взимане от нас" };
  function readDelivery(){
    const type = DLV[$("dlvType").value] ? $("dlvType").value : "address";
    return type === "pickup" ? { type } : { type, city:$("dlvCity").value.trim(), address:$("dlvAddr").value.trim() };
  }
  function deliveryText(d){
    if(!d || d.type === "pickup") return "взимане от нас";
    return DLV[d.type] + ((d.city || d.address) ? " — " + [d.city, d.address].filter(Boolean).join(", ") : " (не е попълнен)");
  }
  function renderDelivery(){
    const t = $("dlvType").value;
    $("dlvBox").style.display = t === "pickup" ? "none" : "block";
    $("dlvAddrLbl").textContent = t === "office" ? "Офис на Еконт" : "Адрес за доставка";
    $("dlvAddr").placeholder = t === "office" ? "кой офис — напр. Еконт Люлин 5" : "улица, №, вход, етаж";
  }
  ["dlvType","dlvCity","dlvAddr"].forEach(id => { $(id).addEventListener("input", () => { renderDelivery(); renderAll(); }); $(id).addEventListener("change", () => { renderDelivery(); renderAll(); }); });
  renderDelivery();
  $("calc").addEventListener("click", ()=>{ priceShown=true; renderAll(); $("price").scrollIntoView({behavior:"smooth", block:"nearest"}); });
  $("addTable").addEventListener("click", ()=>{
    const t = createTable();
    t.card.scrollIntoView({behavior:"smooth", block:"start"});
  });

  // new order — two-step confirm so an accidental tap doesn't wipe the form
  let newArmed=false, newTimer=null;
  function resetNewBtn(){ newArmed=false; $("newOrder").textContent="Нова поръчка"; }
  $("newOrder").addEventListener("click", ()=>{
    if(!newArmed){ newArmed=true; $("newOrder").textContent="Нова поръчка? Натиснете пак"; clearTimeout(newTimer); newTimer=setTimeout(resetNewBtn,4000); return; }
    clearTimeout(newTimer); resetNewBtn();
    tables.slice().forEach(t=>{ const i=tables.indexOf(t); if(i>=0) tables.splice(i,1); t.card.remove(); });
    seq=0; $("name").value=""; $("phone").value=""; $("promo").value=""; renderPromo(); $("dlvType").value="address"; $("dlvCity").value=""; $("dlvAddr").value=""; renderDelivery(); ORDER_NO=genOrderNo();
    priceShown=false; $("price").hidden=true; $("promoBox").hidden=true; pdfCache=null; $("ok").textContent="";
    createTable();
    window.scrollTo({top:0, behavior:"smooth"});
  });

  /* ---------- branded sheet per table ---------- */
  function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});}
  // break lines that are wider than maxW at spaces; continuation lines are indented
  function wrapLines(ctx, lines, maxW){
    const out=[];
    lines.forEach(line=>{
      if(ctx.measureText(line).width<=maxW){ out.push(line); return; }
      let cur="";
      line.split(" ").forEach(word=>{
        const next=cur?cur+" "+word:word;
        if(cur && ctx.measureText(next).width>maxW){ out.push(cur); cur="    "+word; }
        else cur=next;
      });
      if(cur) out.push(cur);
    });
    return out;
  }
  async function tableCanvas(t, label, meta){
    const svg=t.card.querySelector('.draw').cloneNode(true);
    svg.setAttribute("width","1060"); svg.setAttribute("height","795");
    const xml=new XMLSerializer().serializeToString(svg);
    const drawImg=await loadImg("data:image/svg+xml;charset=utf-8,"+encodeURIComponent(xml));
    let logoImg=null; try{ logoImg=await loadImg($("brandLogo").src); }catch(e){}

    const W=1240, dw=1100, dh=dw*795/1060;
    const mctx=document.createElement("canvas").getContext("2d");
    mctx.font="28px 'Courier New',monospace";
    const specLines=wrapLines(mctx, t.specText.split("\n").filter(l=>l.trim()!==""), W-140);
    const specH = 50 + specLines.length*38;
    const H = Math.max(1754, 180 + dh + 60 + specH + 230);   // + footer: client, delivery, price
    const C=document.createElement("canvas"); C.width=W; C.height=H;
    const x=C.getContext("2d");
    x.fillStyle="#ffffff"; x.fillRect(0,0,W,H);
    x.fillStyle="#1E6FF4"; x.fillRect(0,0,W,14);
    if(logoImg){ const lw=500, lh=lw*logoImg.height/logoImg.width; x.drawImage(logoImg,70,46,lw,lh); }
    else { x.fillStyle="#1552c7"; x.font="bold 46px Arial,sans-serif"; x.fillText("KONVEKTOMAT.STORE",70,96); }
    if(label){ x.textAlign="right"; x.fillStyle="#64748b"; x.font="22px Arial,sans-serif"; x.fillText(label, W-70, 104); x.textAlign="left"; }
    x.fillStyle="#64748b"; x.font="26px Arial,sans-serif";
    x.fillText("Маса по поръчка — инокс",70,150);
    const dyimg=180;
    x.strokeStyle="#d5dde7"; x.strokeRect(70,dyimg,dw,dh);
    x.drawImage(drawImg,70,dyimg,dw,dh);
    let y=dyimg+dh+60;
    x.fillStyle="#0f2744"; x.font="bold 32px Arial,sans-serif";
    x.fillText("Спецификация",70,y); y+=50;
    x.fillStyle="#15223a"; x.font="28px 'Courier New',monospace";
    specLines.forEach(ln=>{ x.fillText(ln,70,y); y+=38; });

    y+=20;
    x.strokeStyle="#1E6FF4"; x.beginPath(); x.moveTo(70,y); x.lineTo(W-70,y); x.stroke(); y+=40;
    x.fillStyle="#15223a"; x.font="26px Arial,sans-serif";
    const nm=$("name").value.trim(), ph=$("phone").value.trim();
    x.fillText("Клиент: "+(nm||"—")+"     Телефон: "+(ph||"—"), 70, y);
    y+=36; x.font="24px Arial,sans-serif";
    wrapLines(x, ["Доставка: "+deliveryText(readDelivery())], W-140).forEach(l=>{ x.fillText(l, 70, y); y+=32; }); y-=32;
    if(meta&&meta.priceText){ y+=40; x.fillStyle="#1552c7"; x.font="bold 30px Arial,sans-serif"; x.fillText(meta.priceText, 70, y); }
    return C;
  }

  async function allCanvases(meta){
    const out=[];
    for(let i=0;i<tables.length;i++){
      const label = tables.length>1 ? ("Маса "+(i+1)+" от "+tables.length) : "";
      out.push(await tableCanvas(tables[i], label, meta));
    }
    return out;
  }

  /* ---------- save a file to the viewer's device ---------- */
  async function saveBlob(blob, filename){
    const dl=(window.claude&&claude.use)?await claude.use("downloads"):null;
    if(dl){ await dl.save({filename,data:blob}); return; }
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  /* ---------- WhatsApp: send the PDF ---------- */
  // ASCII-only filename (the readable order number stays inside the PDF)
  function pdfName(){ const n=orderNumber().replace(/[^0-9A-Za-z]+/g,"-").replace(/^-+|-+$/g,""); return "poruchka-"+(n||"masi")+".pdf"; }
  let pdfCache=null; // the last PDF built, for this exact order
  // open the WhatsApp chat only — the PDF carries the order, no text message
  function waLink(){ return "https://wa.me/"+COMPANY_WHATSAPP; }
  function canShareFile(file){
    try{ return !!(navigator.share && navigator.canShare && navigator.canShare({files:[file]})); }catch(e){ return false; }
  }
  // phones: open the share menu with the PDF so the customer picks WhatsApp
  async function sharePdf(file){
    await navigator.share({files:[file], title:"Поръчка маси — konvektomat.store"});
    $("ok").textContent="✓ Изберете WhatsApp и чата с нас в менюто за споделяне";
  }
  // computers (or where sharing files is blocked): save the PDF and open the WhatsApp chat
  async function downloadAndOpenChat(file){
    await saveBlob(file,pdfName());
    const link=waLink();
    $("ok").innerHTML='PDF-ът е свален — прикачете го в чата: <a href="'+link+'" target="_blank" rel="noopener">отвори WhatsApp ›</a>';
    window.open(link,"_blank","noopener");
  }
  $("wa").addEventListener("click",async()=>{
    renderAll();
    const key=$("spec").textContent;
    try{
      // PDF already built for this exact order: share at once, while the tap still counts
      if(pdfCache && pdfCache.key===key){
        if(canShareFile(pdfCache.file)){
          try{ await sharePdf(pdfCache.file); }
          catch(e){ if(e&&e.name==="AbortError"){ $("ok").textContent=""; return; } await downloadAndOpenChat(pdfCache.file); }
        }else{ await downloadAndOpenChat(pdfCache.file); }
        return;
      }
      $("ok").textContent="Подготвям PDF...";
      const blob=await buildPdfBlob();
      const file=new File([blob],pdfName(),{type:"application/pdf"});
      pdfCache={key,file};
      if(canShareFile(file)){
        try{ await sharePdf(file); }
        catch(e){
          if(e&&e.name==="AbortError"){ $("ok").textContent=""; return; }
          // building took a moment and the browser wants a fresh tap
          $("ok").textContent="PDF-ът е готов — натиснете бутона още веднъж, за да го изпратите.";
        }
        return;
      }
      await downloadAndOpenChat(file);
    }catch(e){
      if(e&&e.name==="AbortError"){ $("ok").textContent=""; return; }
      $("ok").textContent=(e&&e.code==="declined")?"Свалянето е отказано.":"Грешка при подготовка на PDF.";
    }
  });

  /* ---------- PDF (one table per page) ---------- */
  async function buildPdfBlob(){
    const {jsPDF}=window.jspdf;
    const o=buildOrder();
    const meta={ priceText:o.price?("Цена: "+fmtMoney(o.price.total)+(o.price.promo?" (с отстъпка "+o.price.discountPct+"%, промокод "+o.price.promo+")":"")):"Цена: по запитване" };
    const cs=await allCanvases(meta);
    const doc=new jsPDF({unit:"mm",format:"a4",orientation:"portrait",compress:true});
    const maxW=190, maxH=277;
    cs.forEach((canvas,i)=>{
      const img=canvas.toDataURL("image/jpeg",0.85);
      let drawW=maxW, drawH=maxW*canvas.height/canvas.width;
      if(drawH>maxH){ drawH=maxH; drawW=maxH*canvas.width/canvas.height; }
      const offx=(210-drawW)/2;
      if(i>0) doc.addPage();
      doc.addImage(img,"JPEG",offx,10,drawW,drawH,undefined,"FAST");
    });
    // machine-readable copy of the order for the admin cut-list app (admin/)
    doc.setProperties({ title:"Order "+o.orderNo+" - konvektomat.store", subject:"Custom inox tables order", keywords:await encodeOrder() });
    return doc.output("blob");
  }

  /* ---------- order data ---------- */
  function orderNumber(){ if(!ORDER_NO) ORDER_NO=genOrderNo(); return ORDER_NO; }
  function tablesSnapshot(){
    return tables.map(t=>{
      const v=t.vals;
      return { L:v.L, D:v.D, H:v.H, thickness:1.5, legProfile:v.legProfile,
        splashOn:v.splashOn, splashH:v.splashH, hemDir:v.hemDir, hem:v.hem, legBack:v.legBack,
        baseOn:v.baseOn, baseH:v.baseH, midOn:v.midOn, mid2H:v.mid2H, notes:v.notes,
        advOn:v.advOn, topEdge:v.topEdge, baseEdge:v.baseEdge, midEdge:v.midEdge, topRet:v.topRet, baseRet:v.baseRet, midRet:v.midRet,
        legSpan:v.legSpan, legFL:v.legFL, legFR:v.legFR, legBL:v.legBL, legBR:v.legBR,
        legs6:v.legs6, shelfSide:v.shelfSide, bayL:v.bayL, rails:v.rails, railH:v.railH, sideL:v.sideL, sideR:v.sideR, frame:v.frame,
        gn:v.gn, gnLevels:v.gnLevels, gnPitch:v.gnPitch };
    });
  }
  // The whole order as data. Reads the current field values (does NOT call renderAll).
  // Price is derived here, so it always matches the order.
  function buildOrder(){
    const pc=promoOf($("promo").value);
    const o={ v:1, orderNo:orderNumber(), name:$("name").value.trim(), phone:$("phone").value.trim(), delivery:readDelivery(), tables:tablesSnapshot() };
    if(pc) o.promo=pc.code;
    o.price=priceFor(o);
    return o;
  }

  /* ===== ЦЕНА ЗА КЛИЕНТА — ДРЪЖ ИДЕНТИЧНО в app.js и admin/admin.js =====
     Цена = (лист + тръба по дължина + заварки + огъвания + тапички) × (1 + надценка%).
     - лист: всяка маса се смята сама, все едно се реже от НОВИ листове. Лист, зает над 2/3
       (PRICE.fullSheetAt), се плаща цял; под 2/3 — само използваната ламарина (площта на заготовките
       × цената на м² от този лист). Избира се най-евтината комбинация от PRICE.sheets. В „Разкрой“ реалният
       разкрой си ползва фирата от склада — това не променя цената.
     - тръба: дължина на краката × PRICE.tubeM (€/м)
     - заварки: 48€ на етаж (12см × 4 крака × 1€/см) — плот + всеки долен плот
     - огъвания: 0.5€ на огъване */
  const PRICE = {
    sheetM2: 45,        // € за м² — само за детайлите от Конструктора и за заготовка, по-голяма от всеки лист
    sheets: [[2000, 1000, 90], [2500, 1250, 140]],   // нови листове: дължина, ширина (мм), цена (€)
    fullSheetAt: 2/3,   // над тази част от листа се плаща целият лист; под нея — само използваната ламарина
    kerf: 3,            // мм между заготовките при рязане
    angleM: 25/6,       // € за метър винкел 20×20 (прът 6 м ≈ 25€) — за стелажа за GN
    tubeM: 40/6,        // € за метър тръба 30×30 (прът 6 м = 40€)
    weldPerFloor: 24,   // € за етаж (плот): 12 см × 4 крака × 0.5€/см
    bend: 1,            // € за огъване (90°)
    capEach: 3,         // € за тапичка на крак (4 на маса)
    markupPct: 120,     // надценка % върху целия труд и материалите (клиентска цена = себестойност × 2.2)
    topEdge:30, topReturn:12, shelfEdge:20, shelfReturn:12, topCut:8, shelfCut:16, stretch:2, splashHem:20, legInset:30, shelfGap:15, shelfGapW:25, thickness:1.5, frameGap:2
  };
  const pFloors = t => (isFrame(t) ? tableGeo(t,PRICE).frameJoints/4 : (t.legs6?1.5:1) + (t.baseOn?1:0) + (t.midOn?1:0)) + (()=>{ const g=tableGeo(t,PRICE); return g.railJoints/4 + (g.gnPosts.length ? g.gnLevels : 0); })();   // профили: 2 на парче; GN: 2 винкела × 2 края на ниво   // 1 етаж = 4 заварки; рамка: 2 на царга
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
  const pAngleM = t => { const g=tableGeo(t,PRICE); return g.gnPosts.length ? 2*g.gnLevels*g.gnAngle/1000 : 0; };   // винкели 20×20 за GN
  function priceParts(t){
    const mat=pSheets(t).cost, tube=pTubeM(t)*PRICE.tubeM + pAngleM(t)*PRICE.angleM,
          weld=pFloors(t)*PRICE.weldPerFloor, bend=pBends(t)*PRICE.bend;
    const caps=((t.legs6?6:4)+(tableGeo(t,PRICE).gnPosts.length?2:0))*PRICE.capEach;   // тапички на краката (и на стойките за GN)
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

  /* Tamper-evidence signature over the order (HMAC-SHA256).
     ВАЖНО: ключът е в кода на страницата, затова това доказва промяна, но не е
     абсолютна защита. Истинската защита е admin да преизчисли цената от размерите
     и да сравни с подписа — подменена цена просто се игнорира. */
  const ORDER_SECRET = "kv-mpr-sign-2026-v1";
  function canonicalOrder(d){
    return JSON.stringify({ v:d.v, orderNo:d.orderNo, name:d.name, phone:d.phone, delivery:d.delivery, promo:d.promo, created:d.created, tables:d.tables, price:d.price });
  }
  async function signOrder(d){
    try{
      if(!(window.crypto&&crypto.subtle)) return "";
      const enc=new TextEncoder();
      const key=await crypto.subtle.importKey("raw", enc.encode(ORDER_SECRET), {name:"HMAC",hash:"SHA-256"}, false, ["sign"]);
      const mac=await crypto.subtle.sign("HMAC", key, enc.encode(canonicalOrder(d)));
      return [...new Uint8Array(mac)].map(b=>b.toString(16).padStart(2,"0")).join("");
    }catch(e){ return ""; }
  }
  // "MPR1:<base64 of UTF-8 JSON>" in the PDF Keywords. Read by admin/index.html.
  // Includes orderNo, price and a signature — keep in step with admin.
  async function encodeOrder(){
    const d=buildOrder();
    d.created=new Date().toISOString();
    d.sig=await signOrder(d);
    const bytes=new TextEncoder().encode(JSON.stringify(d));
    let bin=""; bytes.forEach(b=>bin+=String.fromCharCode(b));
    return "MPR1:"+btoa(bin);
  }
  $("pdf").addEventListener("click",async()=>{
    renderAll(); $("ok").textContent="Подготвям PDF...";
    try{
      const blob=await buildPdfBlob();
      const dl=(window.claude&&claude.use)?await claude.use("downloads"):null;
      if(dl){
        try{ await dl.save({filename:pdfName(),data:blob}); $("ok").textContent="✓ PDF-ът е готов"; }
        catch(e){ $("ok").textContent=(e&&e.code==="declined")?"Свалянето е отказано.":"PDF неуспешен тук — работи на сайта."; }
      }else{
        const url=URL.createObjectURL(blob);
        const a=document.createElement("a"); a.href=url; a.download=pdfName();
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1500);
        $("ok").textContent="✓ PDF-ът се сваля";
      }
    }catch(e){ $("ok").textContent="Грешка при генериране на PDF."; }
    setTimeout(()=>$("ok").textContent="",3500);
  });

  /* ---------- init ---------- */
  ORDER_NO = genOrderNo();
  createTable();
