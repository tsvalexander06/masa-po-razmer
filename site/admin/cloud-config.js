/* Връзка с облака (Supabase). Попълва се веднъж, след като проектът в Supabase е създаден:
   url — „Project URL“ (https://<проект>.supabase.co), key — „Publishable key“ (или „anon public“).
   И двете са публични по замисъл; данните са защитени от входа и от правилата в supabase/schema.sql.
   Празно = админът работи само с данните в този браузър (както досега). */
window.MPR_CLOUD = {
  url: "",
  key: ""
};
