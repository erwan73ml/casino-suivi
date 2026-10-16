export type TypeOperation = "gain" | "perte";
export type Categorie = "casino" | "paris_sportifs";
export type LimitePeriode = "semaine" | "mois" | "annee";

export interface Operation {
  id: string;
  user_id?: string;
  date: string; // AAAA-MM-JJ
  type: TypeOperation;
  categorie: Categorie;
  montant_cents: number; // montant net, toujours positif
  commentaire: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Reglages {
  limite_pertes_cents: number | null;
  limite_periode: LimitePeriode;
}

export const TYPE_LABELS: Record<TypeOperation, string> = { gain: "Gain", perte: "Perte" };
export const CATEGORIE_LABELS: Record<Categorie, string> = { casino: "Casino", paris_sportifs: "Paris sportifs" };
export const LIMITE_LABELS: Record<LimitePeriode, string> = { semaine: "par semaine", mois: "par mois", annee: "par an" };
