// Dates manipulées sous forme de chaînes « AAAA-MM-JJ », sans fuseau horaire :
// une opération du 31 décembre reste le 31 décembre quel que soit le fuseau.

export type PeriodeMode = "tout" | "jour" | "semaine" | "mois" | "annee" | "perso";

export interface Periode {
  mode: PeriodeMode;
  debut: string | null; // inclus ; null = depuis toujours
  fin: string | null; // inclus ; null = jusqu'à aujourd'hui et au-delà
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const JOURS_COURTS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

const pad = (n: number) => String(n).padStart(2, "0");

export function iso(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parts(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
}

export function isValidIso(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = parts(date);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function today(): string {
  const now = new Date();
  return iso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = parts(date);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Jour de la semaine, lundi = 0 … dimanche = 6. */
export function weekday(date: string): number {
  const [y, m, d] = parts(date);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function startOfWeek(date: string): string {
  return addDays(date, -weekday(date));
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function nextMonthKey(key: string, n = 1): string {
  const [y, m] = key.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

export function periodeFor(mode: PeriodeMode, ref: string, custom?: { debut: string; fin: string }): Periode {
  const [y, m] = parts(ref);
  switch (mode) {
    case "tout":
      return { mode, debut: null, fin: null };
    case "jour":
      return { mode, debut: ref, fin: ref };
    case "semaine": {
      const debut = startOfWeek(ref);
      return { mode, debut, fin: addDays(debut, 6) };
    }
    case "mois":
      return { mode, debut: iso(y, m, 1), fin: iso(y, m, daysInMonth(y, m)) };
    case "annee":
      return { mode, debut: iso(y, 1, 1), fin: iso(y, 12, 31) };
    case "perso": {
      const a = custom?.debut ?? ref;
      const b = custom?.fin ?? ref;
      return a <= b ? { mode, debut: a, fin: b } : { mode, debut: b, fin: a };
    }
  }
}

/** Période précédente (-1) ou suivante (+1) de même nature. */
export function shiftPeriode(p: Periode, dir: 1 | -1): Periode {
  if (!p.debut || !p.fin) return p;
  switch (p.mode) {
    case "jour":
      return periodeFor("jour", addDays(p.debut, dir));
    case "semaine":
      return periodeFor("semaine", addDays(p.debut, 7 * dir));
    case "mois":
      return periodeFor("mois", `${nextMonthKey(monthKey(p.debut), dir)}-01`);
    case "annee": {
      const y = parts(p.debut)[0] + dir;
      return periodeFor("annee", iso(y, 1, 1));
    }
    default:
      return p;
  }
}

export function inPeriode(date: string, p: Periode): boolean {
  return (!p.debut || date >= p.debut) && (!p.fin || date <= p.fin);
}

export function formatDate(date: string, style: "court" | "long" = "court"): string {
  const [y, m, d] = parts(date);
  if (style === "long") return `${d === 1 ? "1er" : d} ${MOIS[m - 1]} ${y}`;
  return `${pad(d)}/${pad(m)}/${y}`;
}

export function formatMonth(key: string, court = false): string {
  const [y, m] = key.split("-").map(Number);
  return court ? `${MOIS_COURTS[m - 1]} ${String(y).slice(2)}` : `${MOIS[m - 1]} ${y}`;
}

export function periodeLabel(p: Periode): string {
  if (!p.debut || !p.fin) return "Depuis le début";
  switch (p.mode) {
    case "jour":
      return `Le ${formatDate(p.debut, "long")}`;
    case "semaine":
      return `Semaine du ${formatDate(p.debut)} au ${formatDate(p.fin)}`;
    case "mois": {
      const l = formatMonth(monthKey(p.debut));
      return l.charAt(0).toUpperCase() + l.slice(1);
    }
    case "annee":
      return `Année ${parts(p.debut)[0]}`;
    default:
      return `Du ${formatDate(p.debut)} au ${formatDate(p.fin)}`;
  }
}
