/* Заключващ екран на админа.
   С облак (cloud-config.js попълнен): истински вход с имейл и парола в Supabase; достъп имат само имейлите,
   добавени като админи в базата. Без облак: старата парола (само преграда срещу случаен достъп). */
(function(){
  var g = function(id){ return document.getElementById(id); };
  function unlock(){ var el = g("gate"); if(el) el.style.display = "none"; }
  function authed(){ window.MPR_AUTHED = true; unlock(); document.dispatchEvent(new Event("mpr-auth")); }
  function err(m){ g("gateErr").textContent = m || ""; }

  if(window.Cloud && Cloud.configured){
    g("gateEmailBox").hidden = false;
    g("gateSub").textContent = "Вход с имейл и парола.";
    var busy = false;
    // a stored login opens straight away (also without internet — then the data on this device is used)
    Cloud.restore().then(function(ok){ if(ok) authed(); });
    var tryLogin = async function(){
      if(busy) return;
      var email = g("gateEmail").value.trim(), pass = g("gatePass").value;
      if(!email || !pass){ err("Въведи имейл и парола."); return; }
      busy = true; err(""); g("gateBtn").textContent = "Влизане...";
      try{
        await Cloud.login(email, pass, g("gateRemember").checked);
        var ok = await Cloud.rpc("is_admin", {});
        if(ok !== true){ await Cloud.logout(); err("Този профил няма достъп до админа."); return; }
        g("gatePass").value = ""; authed();
      }catch(e){
        err(e.offline ? "Няма връзка с интернет." : (e.status === 400 ? "Грешен имейл или парола." : (e.message || "Грешка при вход.")));
      }finally{ busy = false; g("gateBtn").textContent = "Вход"; }
    };
    g("gateBtn").addEventListener("click", tryLogin);
    ["gateEmail","gatePass"].forEach(function(id){
      g(id).addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); tryLogin(); } });
    });
    return;
  }

  // ---- без облак: старата парола ----
  var SALT = "mpr-kv-admin-2026";
  var HASH = "5ecd7ea987afa4074b6d6604f691b37e9085bdcb319afe75e88b69b003a90dc5";
  var KEY = "mpr-admin-auth";
  async function sha(s){ var b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return Array.from(new Uint8Array(b)).map(function(x){ return x.toString(16).padStart(2, "0"); }).join(""); }
  try{ if(localStorage.getItem(KEY) === HASH || sessionStorage.getItem(KEY) === HASH) authed(); }catch(e){}
  async function tryUnlock(){
    var pass = g("gatePass").value, h;
    try{ h = await sha(SALT + pass); }catch(e){ err("Браузърът не поддържа тази функция."); return; }
    if(h === HASH){
      try{ (g("gateRemember").checked ? localStorage : sessionStorage).setItem(KEY, HASH); }catch(e){}
      authed();
    }else{ err("Грешна парола."); g("gatePass").value = ""; }
  }
  g("gateBtn").addEventListener("click", tryUnlock);
  g("gatePass").addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); tryUnlock(); } });
})();
