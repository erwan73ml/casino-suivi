import { describe, expect, it } from "vitest";
import { cumul, etatLimite, filtrerPeriode, parCategorie, parMois, totaux, trierRecent, versCSV } from "./calc";
import { periodeFor, shiftPeriode, periodeLabel, startOfWeek, isValidIso } from "./dates";
import type { Operation } from "./types";

let n = 0;
const op = (date: string, type: "gain" | "perte", euros: number, categorie: "casino" | "paris_sportifs" = "casino", commentaire: string | null = null): Operation => ({
  id: `id-${++n}`, date, type, categorie, montant_cents: Math.round(euros * 100), commentaire, created_at: `2026-01-01T00:00:${String(n % 60).padStart(2, "0")}Z`,
});

const ops = [
  op("2026-01-05", "gain", 120.5),
  op("2026-01-20", "perte", 50, "paris_sportifs"),
  op("2026-03-02", "perte", 200),
  op("2026-03-02", "gain", 30.1, "paris_sportifs"),
  op("2026-10-12", "gain", 75, "paris_sportifs"),
  op("2026-10-14", "perte", 40),
];

describe("totaux", () => {
  it("bilan net = gains − pertes, en centimes exacts", () => {
    const t = totaux(ops);
    expect(t.gains).toBe(12050 + 3010 + 7500);
    expect(t.pertes).toBe(5000 + 20000 + 4000);
    expect(t.net).toBe(t.gains - t.pertes);
    expect(t.net).toBe(-6440);
  });
  it("ne compte jamais une même opération deux fois", () => {
    expect(totaux([...ops, ops[0], ops[2]])).toEqual(totaux(ops));
  });
  it("aucune opération : tout à zéro", () => {
    expect(totaux([])).toEqual({ gains: 0, pertes: 0, net: 0, nbGains: 0, nbPertes: 0 });
  });
  it("modification et suppression recalculent correctement", () => {
    const modif = ops.map((o) => (o.id === ops[2].id ? { ...o, type: "gain" as const } : o));
    expect(totaux(modif).net).toBe(-6440 + 2 * 20000);
    expect(totaux(ops.filter((o) => o.id !== ops[0].id)).net).toBe(-6440 - 12050);
  });
});

describe("périodes", () => {
  it("jour, semaine (lundi → dimanche), mois, année", () => {
    expect(periodeFor("jour", "2026-10-14")).toMatchObject({ debut: "2026-10-14", fin: "2026-10-14" });
    expect(periodeFor("semaine", "2026-10-14")).toMatchObject({ debut: "2026-10-12", fin: "2026-10-18" });
    expect(startOfWeek("2026-10-18")).toBe("2026-10-12");
    expect(periodeFor("mois", "2024-02-10")).toMatchObject({ debut: "2024-02-01", fin: "2024-02-29" });
    expect(periodeFor("annee", "2026-05-01")).toMatchObject({ debut: "2026-01-01", fin: "2026-12-31" });
    expect(periodeFor("perso", "2026-01-01", { debut: "2026-03-01", fin: "2026-01-15" })).toMatchObject({ debut: "2026-01-15", fin: "2026-03-01" });
  });
  it("navigation précédente / suivante", () => {
    expect(shiftPeriode(periodeFor("mois", "2026-01-15"), -1)).toMatchObject({ debut: "2025-12-01", fin: "2025-12-31" });
    expect(shiftPeriode(periodeFor("semaine", "2026-12-30"), 1)).toMatchObject({ debut: "2027-01-04" });
    expect(shiftPeriode(periodeFor("annee", "2026-01-15"), 1)).toMatchObject({ debut: "2027-01-01" });
  });
  it("filtre : combien ai-je gagné ce mois-ci, perdu cette semaine, bilan de l'année", () => {
    expect(totaux(filtrerPeriode(ops, periodeFor("mois", "2026-10-16"))).gains).toBe(7500);
    expect(totaux(filtrerPeriode(ops, periodeFor("semaine", "2026-10-16"))).pertes).toBe(4000);
    expect(totaux(filtrerPeriode(ops, periodeFor("annee", "2026-10-16"))).net).toBe(-6440);
    expect(filtrerPeriode(ops, periodeFor("tout", "2026-10-16"))).toHaveLength(6);
  });
  it("libellés en français", () => {
    expect(periodeLabel(periodeFor("mois", "2026-10-16"))).toBe("Octobre 2026");
    expect(periodeLabel(periodeFor("jour", "2026-10-01"))).toBe("Le 1er octobre 2026");
    expect(periodeLabel(periodeFor("tout", "2026-10-01"))).toBe("Depuis le début");
  });
  it("valide les dates", () => {
    expect(isValidIso("2026-02-29")).toBe(false);
    expect(isValidIso("2024-02-29")).toBe(true);
    expect(isValidIso("2026-13-01")).toBe(false);
  });
});

describe("graphiques", () => {
  it("mois consécutifs, y compris les mois vides", () => {
    const m = parMois(ops);
    expect(m.map((x) => x.mois)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(m[0].net).toBe(7050);
    expect(m[1].net).toBe(0);
    expect(m[2].net).toBe(-16990);
  });
  it("courbe cumulée qui finit sur le bilan total", () => {
    const c = cumul(ops);
    expect(c[0]).toEqual({ date: "2026-01-05", net: 12050, cumul: 12050 });
    expect(c.find((x) => x.date === "2026-03-02")?.net).toBe(-16990);
    expect(c[c.length - 1].cumul).toBe(totaux(ops).net);
  });
  it("casino contre paris sportifs : la somme des deux = total", () => {
    const c = parCategorie(ops);
    expect(c.casino.net + c.paris_sportifs.net).toBe(totaux(ops).net);
    expect(c.paris_sportifs).toMatchObject({ gains: 10510, pertes: 5000 });
  });
});

describe("limite de pertes", () => {
  it("compte les pertes de la période en cours", () => {
    expect(etatLimite(ops, { limite_pertes_cents: 5000, limite_periode: "mois" }, "2026-10-16")).toMatchObject({ pertes: 4000, niveau: "proche" });
    expect(etatLimite(ops, { limite_pertes_cents: 4000, limite_periode: "semaine" }, "2026-10-16")?.niveau).toBe("atteinte");
    expect(etatLimite(ops, { limite_pertes_cents: 100000, limite_periode: "annee" }, "2026-10-16")).toMatchObject({ pertes: 29000, niveau: "ok" });
    expect(etatLimite(ops, { limite_pertes_cents: null, limite_periode: "mois" }, "2026-10-16")).toBeNull();
  });
});

describe("historique et export", () => {
  it("tri du plus récent au plus ancien", () => {
    expect(trierRecent(ops)[0].date).toBe("2026-10-14");
    expect(trierRecent(ops).at(-1)?.date).toBe("2026-01-05");
  });
  it("CSV au format français, sans injection de formule", () => {
    const csv = versCSV([op("2026-10-01", "perte", 1250.5, "casino", "=SOMME(A1)")]);
    expect(csv).toContain("2026-10-01;Perte;Casino;-1250,50;'=SOMME(A1)");
  });
});
