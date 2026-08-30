const split = (v) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const urls = split(process.env.SUPABASE_URLS);
const keys = split(process.env.SUPABASE_KEYS);

if (!urls.length) {
  console.error("❌ SUPABASE_URLS est vide");
  process.exit(1);
}
if (urls.length !== keys.length) {
  console.error(`❌ ${urls.length} URL(s) pour ${keys.length} clé(s) — les deux listes doivent avoir la même taille et le même ordre`);
  process.exit(1);
}

let failed = 0;

for (const [i, url] of urls.entries()) {
  // le dashboard donne l'URL avec /rest/v1/ — on accepte les deux formes
  const base = url.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  const key = keys[i];
  try {
    const res = await fetch(`${base}/rest/v1/keep_alive?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const body = await res.text();
    if (!res.ok) {
      failed++;
      console.error(`❌ ${base} — HTTP ${res.status} ${body.slice(0, 200)}`);
    } else if (body.trim() === "[]") {
      // ponytail: table joignable mais vide — le ping compte quand même comme activité
      console.warn(`⚠️  ${base} — OK mais table keep_alive vide (as-tu lancé sql/setup.sql ?)`);
    } else {
      console.log(`✅ ${base} — OK`);
    }
  } catch (err) {
    failed++;
    console.error(`❌ ${base} — ${err.message}`);
  }
}

if (failed) {
  console.error(`\n${failed}/${urls.length} base(s) en échec`);
  process.exit(1);
}
console.log(`\n${urls.length}/${urls.length} base(s) pinguée(s)`);
