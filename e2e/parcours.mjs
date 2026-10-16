import { chromium } from "playwright";
// Parcours de bout en bout : node e2e/parcours.mjs
// (site lancé sur BASE_URL, Supabase avec confirmation d'e-mail désactivée, date du jour : n'importe laquelle)
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const SHOTS = process.env.SHOTS;
const norm = (s) => s.replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { console.error("✘", m); process.exitCode = 1; };
const pad = (n) => String(n).padStart(2, "0");
const d = new Date();
const AUJ = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const lundi = new Date(d); lundi.setDate(d.getDate() - ((d.getDay() + 6) % 7));
const LUNDI = `${lundi.getFullYear()}-${pad(lundi.getMonth() + 1)}-${pad(lundi.getDate())}`;
const MOIS_PREC = (() => { const x = new Date(d.getFullYear(), d.getMonth() - 1, 5); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-05`; })();
const AN_PREC = `${d.getFullYear() - 1}-12-31`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, locale: "fr-FR" });
const page = await ctx.newPage();
page.on("pageerror", (e) => fail("Erreur JS : " + e.message));
const email = `joueur.${Date.now()}@example.com`;
const pwd = "motdepasse-solide-42";

const carte = (id) => page.getByTestId(id).locator(".font-display");
async function attendreSauvegarde() {
  await page.waitForFunction(() => document.querySelector('[data-testid="sync-state"]')?.getAttribute("data-state") === "enregistre", null, { timeout: 15000 });
}
async function verifier(attendus, quoi) {
  let ok = true;
  for (const [id, val] of Object.entries(attendus)) {
    const t = norm(await carte(id).first().innerText());
    if (t !== val) { ok = false; fail(`${quoi} — ${id} : attendu « ${val} », obtenu « ${t} »`); }
  }
  if (ok) log(`${quoi} : ${Object.values(attendus).join(" | ")}`);
}
async function ajouter({ type, montant, date, categorie = "Casino", commentaire }) {
  await page.getByRole("button", { name: type === "gain" ? "Ajouter un gain" : "Ajouter une perte" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Montant net (€)").fill(montant);
  if (date) await dlg.getByLabel("Date").fill(date);
  await dlg.getByRole("radio", { name: categorie }).click();
  if (commentaire) await dlg.getByLabel("Commentaire (facultatif)").fill(commentaire);
  await dlg.getByRole("button", { name: /^Enregistrer (le gain|la perte)/ }).click();
  await dlg.waitFor({ state: "detached" });
  await attendreSauvegarde();
}
async function periode(nom) {
  await page.getByTestId("periode").getByRole("tab", { name: nom }).click();
}
async function sansDebordement(quoi) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (w > 0) fail(`${quoi} : débordement horizontal de ${w}px`); else log(`${quoi} : pas de débordement horizontal`);
}

// 1. Inscription
await page.goto(BASE + "/");
await page.waitForURL("**/connexion");
await page.getByRole("button", { name: "Inscription" }).click();
await page.getByLabel("Adresse e-mail").fill(email);
await page.getByLabel("Mot de passe", { exact: true }).fill(pwd);
await page.getByLabel("Confirmer le mot de passe").fill(pwd);
await page.getByRole("button", { name: "Créer mon compte" }).click();
await page.waitForURL(BASE + "/");
await page.getByRole("heading", { name: "Mes gains et pertes" }).waitFor();
await attendreSauvegarde();
await verifier({ "total-gains": "0,00 €", "total-pertes": "0,00 €", "bilan-net": "0,00 €" }, "compte neuf");
if (SHOTS) await page.waitForTimeout(1800), await page.screenshot({ path: `${SHOTS}/0-vide.png` });

// 2. Saisies et mise à jour immédiate des totaux
await ajouter({ type: "gain", montant: "150,50", commentaire: "Roulette, casino de Deauville" });
await verifier({ "total-gains": "150,50 €", "total-pertes": "0,00 €", "bilan-net": "+150,50 €" }, "après un gain");
if ((await page.getByTestId("bilan-net").getAttribute("data-signe")) !== "positif") fail("bilan positif non signalé en vert");
await ajouter({ type: "perte", montant: "200", date: LUNDI, categorie: "Paris sportifs", commentaire: "Match PSG – OM" });
await verifier({ "total-gains": "150,50 €", "total-pertes": "200,00 €", "bilan-net": "-49,50 €" }, "après une perte");
if ((await page.getByTestId("bilan-net").getAttribute("data-signe")) !== "negatif") fail("bilan négatif non signalé en rouge");
await ajouter({ type: "gain", montant: "49,50", date: MOIS_PREC, categorie: "Paris sportifs" });
await verifier({ "bilan-net": "0,00 €" }, "bilan nul");
if ((await page.getByTestId("bilan-net").getAttribute("data-signe")) !== "nul") fail("bilan nul non neutre");
await ajouter({ type: "perte", montant: "30", date: AN_PREC });
await verifier({ "total-gains": "200,00 €", "total-pertes": "230,00 €", "bilan-net": "-30,00 €" }, "4 opérations");

// 3. Double clic sur « Enregistrer » : une seule opération
await page.getByRole("button", { name: "Ajouter un gain" }).click();
await page.getByRole("dialog").getByLabel("Montant net (€)").fill("10");
await page.getByRole("dialog").getByRole("button", { name: "Enregistrer le gain" }).dblclick();
await page.getByRole("dialog").waitFor({ state: "detached" });
await attendreSauvegarde();
await verifier({ "total-gains": "210,00 €" }, "double clic compté une seule fois");

// 4. Validation du formulaire
await page.getByRole("button", { name: "Ajouter une perte" }).click();
await page.getByRole("dialog").getByLabel("Montant net (€)").fill("-5");
await page.getByRole("dialog").getByRole("button", { name: "Enregistrer la perte" }).click();
await page.getByText("Le montant doit être supérieur à 0").waitFor();
await page.getByRole("dialog").getByLabel("Montant net (€)").fill("abc");
await page.getByRole("dialog").getByRole("button", { name: "Enregistrer la perte" }).click();
await page.getByText("Montant invalide").waitFor();
await page.keyboard.press("Escape");
log("montants négatifs ou invalides refusés");

// 5. Périodes
await periode("Mois");
await verifier({ "total-gains": "160,50 €", "total-pertes": d.getMonth() === lundi.getMonth() ? "200,00 €" : "0,00 €" }, "ce mois-ci");
await page.getByRole("button", { name: "Période précédente" }).click();
const prec = norm(await carte("total-gains").innerText());
if (d.getMonth() === lundi.getMonth() && prec !== "49,50 €") fail(`mois précédent : ${prec}`); else log("mois précédent : " + prec);
await periode("Semaine");
await verifier({ "total-pertes": "200,00 €" }, "perdu cette semaine");
await periode("Année");
await verifier({ "bilan-net": "+10,00 €" }, "bilan depuis le début de l'année");
await periode("Personnalisée");
await page.getByLabel("Date de début").fill(AN_PREC);
await page.getByLabel("Date de fin").fill(AN_PREC);
await verifier({ "total-pertes": "30,00 €", "total-gains": "0,00 €" }, "période personnalisée");
await periode("Jour");
await verifier({ "total-gains": "160,50 €" }, "aujourd'hui");
await periode("Tout");
await verifier({ "bilan-net": "-20,00 €" }, "depuis le début");

// 6. Historique : recherche, filtres, modification, suppression
await page.getByRole("link", { name: "Historique" }).first().click();
await page.getByRole("heading", { name: "Toutes mes opérations" }).waitFor();
const lignes = () => page.getByTestId("tableau").getByTestId("ligne");
if ((await lignes().count()) !== 5) fail(`historique : ${await lignes().count()} lignes au lieu de 5`); else log("historique : 5 lignes");
const premiereDate = norm(await lignes().first().locator("td").first().innerText());
if (!premiereDate.startsWith(AUJ.slice(8, 10))) fail("historique non trié par date : " + premiereDate); else log("historique trié du plus récent au plus ancien");
await page.getByPlaceholder("Rechercher").fill("deauville");
if ((await lignes().count()) !== 1) fail("recherche « deauville »"); else log("recherche par commentaire");
await page.getByPlaceholder("Rechercher").fill("");
await page.getByLabel("Type").selectOption("perte");
await verifier({ "total-pertes": "230,00 €", "total-gains": "0,00 €" }, "filtre pertes");
await page.getByLabel("Catégorie").selectOption("paris_sportifs");
if ((await lignes().count()) !== 1) fail("filtre pertes + paris sportifs"); else log("filtres combinés");
await lignes().first().getByRole("button", { name: "Modifier" }).click();
await page.getByRole("dialog").getByLabel("Montant net (€)").fill("120");
await page.getByRole("dialog").getByRole("button", { name: "Enregistrer", exact: true }).click();
await page.getByRole("dialog").waitFor({ state: "detached" });
await attendreSauvegarde();
await verifier({ "total-pertes": "120,00 €" }, "modification recalculée");
await page.getByLabel("Type").selectOption("");
await page.getByLabel("Catégorie").selectOption("");
await verifier({ "total-gains": "210,00 €", "total-pertes": "150,00 €", "bilan-net": "+60,00 €" }, "totaux après modification");
await lignes().last().getByRole("button", { name: "Supprimer" }).click();
await page.getByRole("dialog").getByText("Cette action est définitive").waitFor();
await page.getByRole("dialog").getByRole("button", { name: "Annuler" }).click();
if ((await lignes().count()) !== 5) fail("annuler a supprimé"); else log("annulation de suppression");
await lignes().last().getByRole("button", { name: "Supprimer" }).click();
await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
await page.getByRole("dialog").waitFor({ state: "detached" });
await attendreSauvegarde();
await verifier({ "total-pertes": "120,00 €", "bilan-net": "+90,00 €" }, "suppression recalculée");
const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exporter en CSV" }).click()]);
const csv = await (await import("node:fs/promises")).readFile(await dl.path(), "utf8");
if (!csv.includes("Paris sportifs;-120,00;Match PSG – OM")) fail("export CSV : " + csv.slice(0, 200)); else log("export CSV");
if (SHOTS) await page.waitForTimeout(1800), await page.screenshot({ path: `${SHOTS}/3-historique.png`, fullPage: true });

// 7. Erreur de sauvegarde affichée clairement, rien n'est compté
await page.route("**/rest/v1/jeux_operations**", (r) => (r.request().method() === "GET" ? r.continue() : r.abort("failed")));
await page.goto(BASE + "/");
await attendreSauvegarde();
await page.getByRole("button", { name: "Ajouter un gain" }).click();
await page.getByRole("dialog").getByLabel("Montant net (€)").fill("999");
await page.getByRole("dialog").getByRole("button", { name: "Enregistrer le gain" }).click();
await page.getByTestId("erreur-sauvegarde").waitFor();
const etat = await page.getByTestId("sync-state").getAttribute("data-state");
if (etat !== "erreur") fail("indicateur pas en erreur : " + etat);
if (!(await page.getByRole("dialog").isVisible())) fail("le formulaire s'est fermé malgré l'échec");
log("erreur : " + norm(await page.getByTestId("erreur-sauvegarde").innerText()));
await page.unroute("**/rest/v1/jeux_operations**");
await page.getByRole("dialog").getByRole("button", { name: "Enregistrer le gain" }).click();
await page.getByRole("dialog").waitFor({ state: "detached" });
await attendreSauvegarde();
await verifier({ "total-gains": "1 209,00 €" }, "nouvel essai réussi, comptée une fois");
// supprime ce gain de test
await page.goto(BASE + "/historique");
await page.getByTestId("tableau").getByTestId("ligne").filter({ hasText: "999,00" }).getByRole("button", { name: "Supprimer" }).click();
await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
await attendreSauvegarde();

// 8. Limite de pertes
await page.goto(BASE + "/reglages");
await page.getByLabel("Activer une limite de pertes").check();
await page.getByLabel("Montant maximum de pertes (€)").fill("100");
await page.getByLabel("Période").selectOption("annee");
await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
await attendreSauvegarde();
await page.goto(BASE + "/");
await attendreSauvegarde();
const niveau = await page.getByTestId("limite").getAttribute("data-niveau");
if (niveau !== "atteinte") fail("limite : " + niveau); else log("alerte limite atteinte : " + norm(await page.getByTestId("limite").innerText()).slice(0, 90));
if (SHOTS) await page.waitForTimeout(1800), await page.screenshot({ path: `${SHOTS}/1-accueil.png`, fullPage: true });

// 9. Statistiques
await page.goto(BASE + "/statistiques");
for (const g of ["graph-mensuel", "graph-anneau", "graph-cumul", "graph-categories"]) {
  await page.getByTestId(g).locator("svg.recharts-surface").first().waitFor();
}
log("4 graphiques affichés");
const casino = norm(await page.getByTestId("cat-casino").innerText());
const paris = norm(await page.getByTestId("cat-paris_sportifs").innerText());
if (!casino.includes("+160,50 €") || !paris.includes("-70,50 €")) fail(`catégories : ${casino} / ${paris}`); else log("casino +160,50 € / paris sportifs -70,50 €");
if (SHOTS) await page.waitForTimeout(1800), await page.screenshot({ path: `${SHOTS}/2-statistiques.png`, fullPage: true });

// 10. Calendrier
await page.goto(BASE + "/calendrier");
await page.getByTestId("calendrier").locator(`[data-date="${LUNDI}"]`).click();
const lab = norm(await page.getByTestId("cal-label").innerText());
await verifier({ "total-pertes": "120,00 €" }, `calendrier, ${lab}`);
if (SHOTS) await page.waitForTimeout(1800), await page.screenshot({ path: `${SHOTS}/4-calendrier.png`, fullPage: true });

// 11. Persistance : rechargement, déconnexion, reconnexion
await page.goto(BASE + "/");
await page.reload();
await attendreSauvegarde();
await periode("Tout");
await verifier({ "bilan-net": "+90,00 €" }, "après rechargement");
await page.getByRole("button", { name: "Se déconnecter" }).click();
await page.waitForURL("**/connexion");
await page.getByLabel("Adresse e-mail").fill(email);
await page.getByLabel("Mot de passe", { exact: true }).fill(pwd);
await page.getByRole("button", { name: "Se connecter" }).click();
await page.waitForURL(BASE + "/");
await attendreSauvegarde();
await verifier({ "total-gains": "210,00 €", "total-pertes": "120,00 €", "bilan-net": "+90,00 €" }, "après reconnexion");

// 12. Mobile
const mob = await browser.newContext({ viewport: { width: 375, height: 800 }, locale: "fr-FR", storageState: await ctx.storageState(), isMobile: true, hasTouch: true });
const mp = await mob.newPage();
for (const p of ["/", "/statistiques", "/calendrier", "/historique", "/reglages"]) {
  await mp.goto(BASE + p);
  await mp.waitForFunction(() => document.querySelector('[data-testid="sync-state"]')?.getAttribute("data-state") === "enregistre");
  await mp.waitForTimeout(400);
  const w = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (w > 0) fail(`mobile ${p} : débordement de ${w}px`); else log(`mobile ${p} : pas de débordement`);
  if (SHOTS) await mp.waitForTimeout(1500), await mp.screenshot({ path: `${SHOTS}/m${p.replace(/\//g, "_") || "_"}.png`, fullPage: true });
}
await mob.close();

// 13. Un deuxième compte ne voit rien
const ctx2 = await browser.newContext({ viewport: { width: 1200, height: 900 }, locale: "fr-FR" });
const p2 = await ctx2.newPage();
await p2.goto(BASE + "/connexion");
await p2.getByRole("button", { name: "Inscription" }).click();
await p2.getByLabel("Adresse e-mail").fill(`ami.${Date.now()}@example.com`);
await p2.getByLabel("Mot de passe", { exact: true }).fill(pwd);
await p2.getByLabel("Confirmer le mot de passe").fill(pwd);
await p2.getByRole("button", { name: "Créer mon compte" }).click();
await p2.waitForURL(BASE + "/");
await p2.waitForFunction(() => document.querySelector('[data-testid="sync-state"]')?.getAttribute("data-state") === "enregistre");
const b2 = norm(await p2.getByTestId("total-gains").locator(".font-display").innerText());
if (b2 !== "0,00 €") fail("le 2e compte voit des données : " + b2); else log("un autre compte ne voit aucune donnée");
await ctx2.close();

if (SHOTS) {
  await page.goto(BASE + "/connexion").catch(() => {});
}
await browser.close();
console.log(process.exitCode ? "\nÉCHEC" : "\nTOUT EST OK");
