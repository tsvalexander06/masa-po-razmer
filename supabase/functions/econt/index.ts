// Еконт за админа: САМО изчисляване на цена (mode "calculate" — не създава пратка и не струва нищо).
// Потребителят и паролата за e-Econt стоят като тайни в Supabase (ECONT_USER, ECONT_PASS) — не са в сайта.
// Отговаря само на влезли админи (проверка с public.is_admin() от supabase/schema.sql).
// По желание: ECONT_BASE = https://demo.econt.com/ee/services за тестовата среда на Еконт.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Само POST." }, 405);

  // 1. only a logged-in admin may use it
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const apikey = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const chk = await fetch(url + "/rest/v1/rpc/is_admin", {
    method: "POST", headers: { apikey, Authorization: auth, "Content-Type": "application/json" }, body: "{}",
  }).catch(() => null);
  if (!chk || !chk.ok || (await chk.json().catch(() => false)) !== true) return json({ error: "Нямате достъп." }, 403);

  // 2. the Econt login
  const user = Deno.env.get("ECONT_USER"), pass = Deno.env.get("ECONT_PASS");
  if (!user || !pass) return json({ error: "Липсват ECONT_USER и ECONT_PASS в Supabase → Edge Functions → Secrets." }, 500);
  const base = (Deno.env.get("ECONT_BASE") ?? "https://ee.econt.com/services").replace(/\/+$/, "");

  // 3. price only — the mode is fixed here, whatever the page sends
  let body: { action?: string; label?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Невалидна заявка." }, 400); }
  if (body.action !== "calculate") return json({ error: "Позволено е само изчисляване на цена." }, 400);

  let r: Response;
  try {
    r = await fetch(base + "/Shipments/LabelService.createLabel.json", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + b64(user + ":" + pass) },
      body: JSON.stringify({ label: body.label ?? {}, mode: "calculate" }),
    });
  } catch (e) {
    return json({ error: "Няма връзка с Еконт: " + String(e) }, 502);
  }
  const text = await r.text();
  let econt: unknown;
  try { econt = JSON.parse(text); } catch { econt = { raw: text.slice(0, 2000) }; }
  return json({ ok: r.ok, status: r.status, econt });
});
