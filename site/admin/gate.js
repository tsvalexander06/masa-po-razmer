/* Прост заключващ екран за админа — преграда срещу случаен достъп, не силна
   защита (статичен сайт). Паролата не е в кода; тук е само отпечатъкът ѝ. */
(function(){
  var SALT="mpr-kv-admin-2026";
  var HASH="5ecd7ea987afa4074b6d6604f691b37e9085bdcb319afe75e88b69b003a90dc5";
  var KEY="mpr-admin-auth";
  async function sha(s){ var b=await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,"0");}).join(""); }
  function unlock(){ var g=document.getElementById("gate"); if(g) g.style.display="none"; }
  try{ if(localStorage.getItem(KEY)===HASH || sessionStorage.getItem(KEY)===HASH) unlock(); }catch(e){}
  async function tryUnlock(){
    var pass=document.getElementById("gatePass").value, h;
    try{ h=await sha(SALT+pass); }catch(err){ document.getElementById("gateErr").textContent="Браузърът не поддържа тази функция."; return; }
    if(h===HASH){
      try{ (document.getElementById("gateRemember").checked?localStorage:sessionStorage).setItem(KEY,HASH); }catch(e){}
      unlock();
    }else{
      document.getElementById("gateErr").textContent="Грешна парола.";
      document.getElementById("gatePass").value="";
    }
  }
  document.getElementById("gateBtn").addEventListener("click", tryUnlock);
  document.getElementById("gatePass").addEventListener("keydown", function(e){ if(e.key==="Enter"){ e.preventDefault(); tryUnlock(); } });
})();
