import type { Categorie, LimitePeriode, Operation, Reglages } from "./types";
import { inPeriode, monthKey, nextMonthKey, periodeFor, type Periode } from "./dates";

export interface Totaux {
  gains: number;
  pertes: number;
  net: number; // gains − pertes
  nbGains: number;
  nbPertes: number;
}

/**
 * Bilan net = total des gains nets − total des pertes nettes.
 * Chaque opération est comptée une seule fois, par identifiant : un doublon d'identifiant
 * (par exemple une même ligne reçue deux fois) n'est jamais additionné deux fois.
 */
export function totaux(ops: Operation[]): Totaux {
  const seen = new Set<string>();
  let gains = 0, pertes = 0, nbGains = 0, nbPertes = 0;
  for (const o of ops) {
    if (seen.has(o.id)) continue;
    seen.add(o.id);
    if (o.type === "gain") {
      gains += o.montant_cents;
      nbGains++;
    } else {
      pertes += o.montant_cents;
      nbPertes++;
    }
  }
  return { gains, pertes, net: gains - pertes, nbGains, nbPertes };
}

export function filtrerPeriode(ops: Operation[], p: Periode): Operation[] {
  return ops.filter((o) => inPeriode(o.date, p));
}

/** Tri chronologique inverse (plus récent d'abord), puis par date de saisie. */
export function trierRecent(ops: Operation[]): Operation[] {
  return [...ops].sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : (b.created_at ?? "").localeCompare(a.created_at ?? "")));
}

export interface PointMois extends Totaux {
  mois: string; // AAAA-MM
}

/** Gains, pertes et bilan de chaque mois, sans trou entre le premier et le dernier mois. */
export function parMois(ops: Operation[], p?: Periode): PointMois[] {
  if (!ops.length && !(p?.debut && p?.fin)) return [];
  const groups = new Map<string, Operation[]>();
  for (const o of ops) {
    const k = monthKey(o.date);
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }
  const keys = [...groups.keys()].sort();
  let first = p?.debut ? monthKey(p.debut) : keys[0];
  let last = p?.fin ? monthKey(p.fin) : keys[keys.length - 1];
  if (!first || !last) return [];
  if (first > last) [first, last] = [last, first];
  const out: PointMois[] = [];
  for (let k = first; k <= last; k = nextMonthKey(k)) {
    out.push({ mois: k, ...totaux(groups.get(k) ?? []) });
    if (out.length > 240) break;
  }
  return out;
}

export interface PointJour extends Totaux {
  date: string;
}

export function parJour(ops: Operation[]): Map<string, PointJour> {
  const groups = new Map<string, Operation[]>();
  for (const o of ops) groups.set(o.date, [...(groups.get(o.date) ?? []), o]);
  const out = new Map<string, PointJour>();
  for (const [date, list] of groups) out.set(date, { date, ...totaux(list) });
  return out;
}

export interface PointCumul {
  date: string;
  net: number; // bilan du jour
  cumul: number; // bilan cumulé depuis le premier jour
}

/** Bilan cumulé jour après jour. `depart` = bilan cumulé avant la première opération affichée. */
export function cumul(ops: Operation[], depart = 0): PointCumul[] {
  const jours = [...parJour(ops).values()].sort((a, b) => a.date.localeCompare(b.date));
  let c = depart;
  return jours.map((j) => {
    c += j.net;
    return { date: j.date, net: j.net, cumul: c };
  });
}

export function parCategorie(ops: Operation[]): Record<Categorie, Totaux> {
  return {
    casino: totaux(ops.filter((o) => o.categorie === "casino")),
    paris_sportifs: totaux(ops.filter((o) => o.categorie === "paris_sportifs")),
  };
}

export interface EtatLimite {
  limite: number;
  periode: LimitePeriode;
  pertes: number; // total des pertes enregistrées sur la période en cours
  ratio: number; // 0 → 1+
  niveau: "ok" | "proche" | "atteinte";
  debut: string;
  fin: string;
}

/** Suivi de la limite personnelle de pertes sur la semaine, le mois ou l'année en cours. */
export function etatLimite(ops: Operation[], r: Reglages | null, ref: string): EtatLimite | null {
  if (!r?.limite_pertes_cents) return null;
  const p = periodeFor(r.limite_periode, ref);
  const pertes = totaux(filtrerPeriode(ops, p).filter((o) => o.type === "perte")).pertes;
  const ratio = pertes / r.limite_pertes_cents;
  return {
    limite: r.limite_pertes_cents,
    periode: r.limite_periode,
    pertes,
    ratio,
    niveau: ratio >= 1 ? "atteinte" : ratio >= 0.8 ? "proche" : "ok",
    debut: p.debut!,
    fin: p.fin!,
  };
}

export function signe(n: number): "positif" | "negatif" | "nul" {
  return n > 0 ? "positif" : n < 0 ? "negatif" : "nul";
}

/** Export CSV (séparateur « ; », compatible Excel français). */
export function versCSV(ops: Operation[]): string {
  const esc = (v: string) => {
    let s = v;
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // évite l'injection de formules dans Excel
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lignes = [["Date", "Type", "Catégorie", "Montant (€)", "Commentaire"].join(";")];
  for (const o of trierRecent(ops)) {
    const montant = `${o.type === "perte" ? "-" : ""}${Math.floor(o.montant_cents / 100)},${String(o.montant_cents % 100).padStart(2, "0")}`;
    lignes.push([o.date, o.type === "gain" ? "Gain" : "Perte", o.categorie === "casino" ? "Casino" : "Paris sportifs", montant, esc(o.commentaire ?? "")].join(";"));
  }
  return "﻿" + lignes.join("\r\n");
}
