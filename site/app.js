  const COMPANY_WHATSAPP = "359893457703";
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tables = [];
  let seq = 0;
  let priceShown = false;

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
    <p class="hint" style="margin:8px 0 2px">Размерите са в милиметри. Чертежът се мащабира спрямо въведените размери.</p>

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

    <label class="toggle"><input type="checkbox" class="f-splashOn" checked> С борд (кант отзад)</label>
    <div class="sub f-splashBox">
      <label>Височина на борда <span class="hint">(мм)</span></label>
      <input type="number" class="f-splashH" value="100" min="20" max="300" step="10">
    </div>

    <label>Отстояние на задните крака от задния ръб/борд <span class="hint">(мм, мин. 70 мм)</span></label>
    <input type="number" class="f-legBack" value="70" min="70" max="400" step="1">

    <label class="toggle"><input type="checkbox" class="f-baseOn" checked> Долна основа (плот)</label>
    <div class="sub f-baseBox">
      <label>Разстояние от пода до основата <span class="hint">(мм)</span></label>
      <input type="number" class="f-baseH" value="150" min="20" max="600" step="10">
    </div>

    <label class="toggle"><input type="checkbox" class="f-midOn"> Втори междинен плот</label>
    <div class="sub f-midBox">
      <p class="hint">Вторият междинен плот се поставя автоматично <b>по средата между долната основа (плот) и горния работен плот</b>. <span class="f-mid2info"></span></p>
      <p class="hint" style="margin-top:6px">Тази опция включва и долната основа (плот) — задайте нейната височина по-горе.</p>
    </div>

    <label>Бележки <span class="hint">(по избор)</span></label>
    <textarea class="f-notes" placeholder="напр. отвор за мивка, усилена конструкция, инокс 304..."></textarea>
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
    return {
      L:+q('.f-L').value||0, D:+q('.f-D').value||0, H,
      splashOn:q('.f-splashOn').checked, splashH:+q('.f-splashH').value||0,
      legBack:Math.max(70, +q('.f-legBack').value||0),
      baseOn:q('.f-baseOn').checked, baseH,
      midOn:q('.f-midOn').checked, mid2H,
      notes:q('.f-notes').value.trim(),
      legProfile:30
    };
  }

  /* ---------- isometric 3D blueprint ---------- */
  function drawBlueprint(v, svgEl){
    const realL=v.L, realD=v.D, realH=v.H;
    if(!realL||!realD||!realH){ svgEl.innerHTML=''; return; }
    const splashOn=v.splashOn, splashH=v.splashH;
    const legBack=v.legBack, baseOn=v.baseOn, baseH=v.baseH;
    const midOn=v.midOn;
    const legProfile=v.legProfile||30;

    const w=realL/1000, d=realD/1000, h=realH/1000;
    const tt=0.04, lg=legProfile/1000, st=0.03;
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

    const backZ=Math.min(d*0.45, Math.max(0, legBack/1000));
    const lxL=0.03, lxR=w-0.03-lg, frontZ=d-0.03-lg;
    const gw=PRICE.shelfGapW/2000;  // половината намаление на ширина от всяка страна
    const baseZ0=backZ, baseZ1=d-PRICE.shelfGap/1000, baseX0=gw, baseX1=w-gw;  // долен плот: наравно с краката по ширина, по-малък отзад+shelfGap
    const shelf=(yy)=>box(baseX0,yy,baseZ0, baseX1-baseX0, st, baseZ1-baseZ0, B2,B2F,B2R);

    shapes.push({t:'shadow',pts:[P(-0.03,0,-0.03),P(w+0.03,0,-0.03),P(w+0.03,0,d+0.03),P(-0.03,0,d+0.03)]});
    box(lxL,0,backZ,lg,legH,lg,TOP,FRONT,RIGHT);
    box(lxR,0,backZ,lg,legH,lg,TOP,FRONT,RIGHT);

    let by=0, midY=0;
    if(baseOn||midOn){ by=Math.min(legH-0.05, Math.max(0.03, baseH/1000)); shelf(by); }
    if(midOn){
      midY=Math.min(legH-0.05, (by+legH)/2);
      shelf(midY);
    }

    box(lxL,0,frontZ,lg,legH,lg,TOP,FRONT,RIGHT);
    box(lxR,0,frontZ,lg,legH,lg,TOP,FRONT,RIGHT);
    box(0,h-tt,0,w,tt,d,TOP,FRONT,RIGHT);
    if(splashOn){ const bs=Math.max(0.03, splashH/1000); box(0,h,0,w,bs,st,TOP,FRONT,RIGHT); }

    const off=Math.max(w,d,h)*0.16+0.05;
    function dim(a,b,lp,txt,anchor,dx,dy,ext){
      shapes.push({t:'dim',pts:[a,b]});
      shapes.push({t:'text',p:lp,txt,anchor,dx:dx||0,dy:dy||0});
      if(ext) ext.forEach(e=>shapes.push({t:'ext',pts:e}));
    }
    dim(P(0,0,d+off),P(w,0,d+off),P(w/2,0,d+off),realL+'','middle',0,16,
        [[P(0,0,d),P(0,0,d+off)],[P(w,0,d),P(w,0,d+off)]]);
    dim(P(w+off,0,0),P(w+off,0,d),P(w+off,0,d/2),realD+'','start',8,4,
        [[P(w,0,0),P(w+off,0,0)],[P(w,0,d),P(w+off,0,d)]]);
    dim(P(w+off,0,d),P(w+off,h,d),P(w+off,h/2,d),realH+'','start',8,0,
        [[P(w,h,d),P(w+off,h,d)]]);
    if(legBack>0){ const sx=w+off*1.9;
      dim(P(sx,0,0),P(sx,0,backZ),P(sx,0,backZ/2),legBack+'','start',10,-2,
        [[P(w,0,0),P(sx,0,0)],[P(w,0,backZ),P(sx,0,backZ)]]);
      shapes.push({t:'cap',p:P(sx,0,backZ/2),txt:'заден крак',dx:10,dy:14});
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
    s+="Задни крака отстояние от ръба: "+v.legBack+" мм\n";
    s+="Долна основа (плот): "+(v.baseOn?"ДА (на "+v.baseH+" мм от пода)":"НЕ")+"\n";
    s+="Втори междинен плот: "+(v.midOn?"ДА (по средата между основата и работния плот, ≈ "+v.mid2H+" мм от пода)":"НЕ")+"\n";
    if(v.notes) s+="Бележки:    "+v.notes+"\n";
    return s;
  }

  /* ---------- render everything ---------- */
  function renderAll(){
    tables.forEach((t,i)=>{
      t.card.querySelector('.num').textContent = "Маса "+(i+1);
      t.card.querySelector('.rm').style.display = tables.length>1 ? "inline-flex" : "none";
      const v = readTable(t);
      t.vals = v;
      t.card.querySelector('.f-splashBox').style.display = v.splashOn?"block":"none";
      t.card.querySelector('.f-baseBox').style.display = v.baseOn?"block":"none";
      t.card.querySelector('.f-midBox').style.display = v.midOn?"block":"none";
      t.card.querySelector('.f-mid2info').textContent = v.midOn ? "(≈ "+v.mid2H+" мм от пода)" : "";
      drawBlueprint(v, t.card.querySelector('.draw'));
      t.specText = tableSpec(v, i+1);
    });

    let s="ПОРЪЧКА № "+orderNumber()+"\n══════════════\n";
    tables.forEach(t=>{ s += t.specText + "\n"; });
    s += "══════════════\n";
    s += "Брой маси: "+tables.length+"\n";
    const nm=$("name").value.trim(), ph=$("phone").value.trim();
    if(nm) s+="Име:     "+nm+"\n";
    if(ph) s+="Телефон: "+ph+"\n";
    const o=buildOrder();
    $("spec").textContent=s;
    renderPrice(o);
  }

  function renderPrice(o){
    const box=$("price");
    if(!priceShown){ box.hidden=true; return; }
    box.hidden=false;
    const p=o&&o.price;
    if(!p){
      box.innerHTML='<div class="pmsg">Автоматичната цена ще бъде добавена скоро. Изпратете поръчката и ще се свържем с вас за потвърждение и цена.</div>';
      return;
    }
    box.innerHTML='<div class="plabel">Ориентировъчна цена</div><div class="pbig">'+esc(fmtMoney(p.total))+'</div>'+
      (p.lines&&p.lines.length?'<div class="plines">'+p.lines.map(l=>'<div><span>'+esc(l.label)+'</span><b>'+esc(fmtMoney(l.amount))+'</b></div>').join("")+'</div>':'')+
      '<div class="pnote">Цената е ориентировъчна и се потвърждава от нас.</div>';
  }

  $("name").addEventListener("input", renderAll);
  $("phone").addEventListener("input", renderAll);
  $("orderNo").addEventListener("input", renderAll);
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
    seq=0; $("name").value=""; $("phone").value=""; $("orderNo").value=genOrderNo();
    priceShown=false; $("price").hidden=true; pdfCache=null; $("ok").textContent="";
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
    const H = Math.max(1754, 180 + dh + 60 + specH + 150);
    const C=document.createElement("canvas"); C.width=W; C.height=H;
    const x=C.getContext("2d");
    x.fillStyle="#ffffff"; x.fillRect(0,0,W,H);
    x.fillStyle="#1E6FF4"; x.fillRect(0,0,W,14);
    if(logoImg){ const lw=500, lh=lw*logoImg.height/logoImg.width; x.drawImage(logoImg,70,46,lw,lh); }
    else { x.fillStyle="#1552c7"; x.font="bold 46px Arial,sans-serif"; x.fillText("KONVEKTOMAT.STORE",70,96); }
    x.textAlign="right";
    if(meta&&meta.orderNo){ x.fillStyle="#1552c7"; x.font="bold 26px Arial,sans-serif"; x.fillText("№ "+meta.orderNo, W-70, 92); }
    if(label){ x.fillStyle="#64748b"; x.font="22px Arial,sans-serif"; x.fillText(label, W-70, 126); }
    x.textAlign="left";
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
    const meta={ orderNo:o.orderNo, priceText:o.price?("Ориентировъчна цена: "+fmtMoney(o.price.total)):"Цена: по запитване" };
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
  function orderNumber(){ const el=$("orderNo"); if(!el.value.trim()) el.value=genOrderNo(); return el.value.trim(); }
  function tablesSnapshot(){
    return tables.map(t=>{
      const v=t.vals;
      return { L:v.L, D:v.D, H:v.H, thickness:1.5, legProfile:v.legProfile,
        splashOn:v.splashOn, splashH:v.splashH, legBack:v.legBack,
        baseOn:v.baseOn, baseH:v.baseH, midOn:v.midOn, mid2H:v.mid2H, notes:v.notes };
    });
  }
  // The whole order as data. Reads the current field values (does NOT call renderAll).
  // Price is derived here, so it always matches the order.
  function buildOrder(){
    const o={ v:1, orderNo:orderNumber(), name:$("name").value.trim(), phone:$("phone").value.trim(), tables:tablesSnapshot() };
    o.price=priceFor(o);
    return o;
  }

  /* ===== ЦЕНА ЗА КЛИЕНТА — ДРЪЖ ИДЕНТИЧНО в app.js и admin/admin.js =====
     Цена = (материал по площ + тръба по дължина + заварки + огъвания) × (1 + надценка%).
     - материал: площ на разгъвката × PRICE.sheetM2 (€/м²)
     - тръба: дължина на краката × PRICE.tubeM (€/м)
     - заварки: 48€ на етаж (12см × 4 крака × 1€/см) — плот + всеки долен плот
     - огъвания: 0.5€ на огъване */
  const PRICE = {
    sheetM2: 45,        // € за м² разгъвка (≈ 90€ / 2.0 м²)
    tubeM: 40/6,        // € за метър тръба 30×30 (прът 6 м = 40€)
    weldPerFloor: 48,   // € за етаж (плот): 12 см × 4 крака × 1€/см
    bend: 0.5,          // € за огъване (90°)
    markupPct: 100,     // надценка % (клиентска цена = формула × 2)
    topEdge:30, topReturn:10, shelfEdge:20, shelfReturn:10, legInset:30, shelfGap:10, shelfGapW:20, thickness:1.5
  };
  const pFloors = t => 1 + (t.baseOn?1:0) + (t.midOn?1:0);
  const pBends  = t => (6 + (t.splashOn?1:2)) + 8*((t.baseOn?1:0)+(t.midOn?1:0));
  function pBlankM2(t){
    const P=PRICE, ft=P.topEdge+P.topReturn, fs=P.shelfEdge+P.shelfReturn;
    const back = t.splashOn ? (+t.splashH||0) : ft;
    const topW=(t.L+2*ft)/1000, topD=(t.D+ft+back)/1000;
    const shL=t.L-P.shelfGapW, shD=t.D-(+t.legBack||0)-P.shelfGap;
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

  /* Tamper-evidence signature over the order (HMAC-SHA256).
     ВАЖНО: ключът е в кода на страницата, затова това доказва промяна, но не е
     абсолютна защита. Истинската защита е admin да преизчисли цената от размерите
     и да сравни с подписа — подменена цена просто се игнорира. */
  const ORDER_SECRET = "kv-mpr-sign-2026-v1";
  function canonicalOrder(d){
    return JSON.stringify({ v:d.v, orderNo:d.orderNo, name:d.name, phone:d.phone, created:d.created, tables:d.tables, price:d.price });
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
  $("orderNo").value = genOrderNo();
  createTable();
