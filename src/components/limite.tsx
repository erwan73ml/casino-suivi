"use client";

import Link from "next/link";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { etatLimite } from "@/lib/calc";
import { formatMoney } from "@/lib/money";
import { today } from "@/lib/dates";
import { LIMITE_LABELS } from "@/lib/types";
import { useStore } from "./store";
import { cx } from "./ui";

const PERIODE_EN_COURS = { semaine: "cette semaine", mois: "ce mois-ci", annee: "cette année" } as const;

/** Suivi de la limite personnelle de pertes (facultative). */
export function LimitePertes() {
  const { operations, reglages } = useStore();
  const e = etatLimite(operations, reglages, today());
  if (!e) {
    return (
      <div className="panneau flex flex-wrap items-center gap-3 text-sm text-white/70">
        <ShieldCheck className="h-5 w-5 text-or" />
        <span className="flex-1">Aucune limite personnelle de pertes définie.</span>
        <Link href="/reglages" className="btn btn-sm">Définir une limite</Link>
      </div>
    );
  }
  const pct = Math.min(100, Math.round(e.ratio * 100));
  const atteinte = e.niveau === "atteinte";
  return (
    <div role={atteinte ? "alert" : undefined} data-testid="limite" data-niveau={e.niveau}
      className={cx("panneau", atteinte ? "border-red-500/70 bg-red-950/60" : e.niveau === "proche" ? "border-amber-500/60" : "")}>
      <div className="flex flex-wrap items-center gap-3">
        <ShieldAlert className={cx("h-5 w-5", atteinte ? "text-red-400" : e.niveau === "proche" ? "text-amber-400" : "text-or")} />
        <div className="flex-1 text-sm">
          {atteinte ? (
            <strong className="text-red-200">Limite de pertes atteinte {PERIODE_EN_COURS[e.periode]} : {formatMoney(e.pertes)} de pertes pour une limite de {formatMoney(e.limite)}.</strong>
          ) : e.niveau === "proche" ? (
            <span className="text-amber-200">Vous approchez de votre limite : {formatMoney(e.pertes)} de pertes sur {formatMoney(e.limite)} {PERIODE_EN_COURS[e.periode]}.</span>
          ) : (
            <span className="text-white/75">Limite personnelle : {formatMoney(e.pertes)} de pertes sur {formatMoney(e.limite)} {LIMITE_LABELS[e.periode]}.</span>
          )}
        </div>
        <span className="chiffres text-sm font-semibold text-white/80">{Math.round(e.ratio * 100)} %</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div className={cx("h-full rounded-full transition-all", atteinte ? "bg-red-500" : e.niveau === "proche" ? "bg-amber-400" : "bg-or")} style={{ width: `${pct}%` }} />
      </div>
      {atteinte && <p className="mt-3 text-xs text-red-200/80">Vous vous étiez fixé cette limite : c&apos;est le moment de faire une pause. Besoin d&apos;en parler ? Joueurs Info Service, 09 74 75 13 13.</p>}
    </div>
  );
}
