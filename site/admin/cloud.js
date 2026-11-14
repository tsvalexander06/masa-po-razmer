/* Облачно хранилище на админа (Supabase): вход с имейл и парола, таблици и PDF-и.
   Говори директно с REST API-то на Supabase (без външни библиотеки). Ключът в cloud-config.js
   е публичен по замисъл — достъпът до данните се пази от входа и от правилата в базата (supabase/schema.sql). */
(function(){
  var CFG = window.MPR_CLOUD || {};
  var configured = !!(CFG.url && CFG.key);
  var BASE = configured ? String(CFG.url).replace(/\/+$/, "") : "";
  var SKEY = "mpr-cloud-session";
  var sess = loadSess();

  function CloudError(msg, status, offline){ var e = new Error(msg); e.status = status || 0; e.offline = !!offline; e.cloud = true; return e; }
  function loadSess(){
    try{ var s = localStorage.getItem(SKEY) || sessionStorage.getItem(SKEY); return s ? JSON.parse(s) : null; }catch(e){ return null; }
  }
  function storeSess(s){
    try{
      localStorage.removeItem(SKEY); sessionStorage.removeItem(SKEY);
      if(s) (s.remember ? localStorage : sessionStorage).setItem(SKEY, JSON.stringify(s));
    }catch(e){}
  }
  async function raw(path, opts){
    try{ return await fetch(BASE + path, opts); }
    catch(e){ throw CloudError("Няма връзка с облака.", 0, true); }
  }
  async function readJson(r){ var t = await r.text(); if(!t) return null; try{ return JSON.parse(t); }catch(e){ return null; } }

  /* ---------- вход ---------- */
  async function authReq(grant, body){
    var r = await raw("/auth/v1/token?grant_type=" + grant, { method:"POST", headers:{ apikey:CFG.key, "Content-Type":"application/json" }, body:JSON.stringify(body) });
    var j = (await readJson(r)) || {};
    if(!r.ok) throw CloudError(j.error_description || j.msg || j.message || j.error || ("Грешка при вход (" + r.status + ")"), r.status);
    return { access:j.access_token, refresh:j.refresh_token, exp:Date.now() + (+j.expires_in || 3600) * 1000, email:(j.user && j.user.email) || "" };
  }
  async function login(email, password, remember){
    var s = await authReq("password", { email:email, password:password });
    s.remember = !!remember; sess = s; storeSess(sess);
    return sess;
  }
  async function refresh(){
    if(!sess || !sess.refresh) throw CloudError("Няма вход.", 401);
    var s;
    try{ s = await authReq("refresh_token", { refresh_token:sess.refresh }); }
    catch(e){ if(!e.offline){ sess = null; storeSess(null); } throw e; }
    s.email = s.email || sess.email; s.remember = sess.remember; sess = s; storeSess(sess);
    return sess;
  }
  async function token(){
    if(!sess) throw CloudError("Няма вход.", 401);
    if(Date.now() > sess.exp - 60000) await refresh();
    return sess.access;
  }
  // a stored login: refresh it if needed. true = logged in (also offline, with the stored login)
  async function restore(){
    if(!configured || !sess) return false;
    try{ await token(); return true; }
    catch(e){ return !!(e.offline && sess); }
  }
  async function logout(){
    var s = sess; sess = null; storeSess(null);
    if(s){ try{ await raw("/auth/v1/logout", { method:"POST", headers:{ apikey:CFG.key, Authorization:"Bearer " + s.access } }); }catch(e){} }
  }

  /* ---------- заявки ---------- */
  async function req(path, opts, retried){
    opts = opts || {};
    var headers = Object.assign({ apikey:CFG.key, Authorization:"Bearer " + (await token()) }, opts.headers || {});
    var r = await raw(path, Object.assign({}, opts, { headers:headers }));
    if(r.status === 401 && !retried){ await refresh(); return req(path, opts, true); }
    if(!r.ok){ var t = ""; try{ t = await r.text(); }catch(e){} throw CloudError("Облакът върна грешка " + r.status + (t ? ": " + t.slice(0, 200) : ""), r.status); }
    return r;
  }
  var quote = function(s){ return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; };
  var inList = function(ids){ return encodeURIComponent("in.(" + ids.map(quote).join(",") + ")"); };

  // every table has: id text, data jsonb, updated_at timestamptz (set by the database)
  async function list(table){ return (await readJson(await req("/rest/v1/" + table + "?select=id,updated_at"))) || []; }
  async function fetchRows(table, ids){
    var out = [];
    for(var i = 0; i < ids.length; i += 40){
      var part = (await readJson(await req("/rest/v1/" + table + "?select=id,data,updated_at&id=" + inList(ids.slice(i, i + 40))))) || [];
      out = out.concat(part);
    }
    return out;
  }
  async function upsert(table, rows){
    var out = [];
    for(var i = 0; i < rows.length; i += 50){
      var r = await req("/rest/v1/" + table + "?select=id,updated_at", { method:"POST",
        headers:{ "Content-Type":"application/json", Prefer:"resolution=merge-duplicates,return=representation" }, body:JSON.stringify(rows.slice(i, i + 50)) });
      out = out.concat((await readJson(r)) || []);
    }
    return out;
  }
  async function remove(table, ids){
    for(var i = 0; i < ids.length; i += 40)
      await req("/rest/v1/" + table + "?id=" + inList(ids.slice(i, i + 40)), { method:"DELETE", headers:{ Prefer:"return=minimal" } });
  }
  async function rpc(fn, args){
    return readJson(await req("/rest/v1/rpc/" + fn, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(args || {}) }));
  }
  async function counters(){
    var rows = (await readJson(await req("/rest/v1/counters?select=name,value"))) || [], o = {};
    rows.forEach(function(r){ o[r.name] = +r.value || 0; });
    return o;
  }

  /* ---------- PDF-и (частна кофа "docs") ---------- */
  function docKey(id){
    var b = new TextEncoder().encode(String(id)), h = "";
    for(var i = 0; i < b.length; i++) h += b[i].toString(16).padStart(2, "0");
    return "doc-" + h + ".pdf";
  }
  async function docUp(id, blob){
    await req("/storage/v1/object/docs/" + docKey(id), { method:"POST", headers:{ "Content-Type":"application/pdf", "x-upsert":"true", "cache-control":"3600" }, body:blob });
  }
  async function docDown(id){
    try{ var r = await req("/storage/v1/object/authenticated/docs/" + docKey(id)); return await r.blob(); }
    catch(e){ if(e.status === 400 || e.status === 404) return null; throw e; }
  }
  async function docRemove(ids){
    if(!ids.length) return;
    await req("/storage/v1/object/docs", { method:"DELETE", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ prefixes:ids.map(docKey) }) });
  }

  window.Cloud = {
    configured:configured, url:BASE,
    login:login, logout:logout, restore:restore, refresh:refresh,
    email:function(){ return sess ? sess.email : ""; }, loggedIn:function(){ return !!sess; },
    list:list, fetchRows:fetchRows, upsert:upsert, remove:remove, rpc:rpc, counters:counters,
    docUp:docUp, docDown:docDown, docRemove:docRemove
  };
})();
