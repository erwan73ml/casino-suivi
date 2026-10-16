"use client";

import { TrendingDown, TrendingUp, Scale } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { signe, type Totaux } from "@/lib/calc";
import { cx } from "./ui";

/** Les trois grandes cases : total des gains, total des pertes, bilan net. */
export function TotauxCartes({ t, compact = false, vertical = false }: { t: Totaux; compact?: boolean; vertical?: boolean }) {
  const s = signe(t.net);
  const taille = compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl";
  return (
    <div className={cx("grid gap-4", vertical ? "sm:grid-cols-3 lg:grid-cols-1" : "sm:grid-cols-3")}>
      <div className="panneau relative overflow-hidden border-emerald-500/25" data-testid="total-gains">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-700 via-emerald-400 to-emerald-700" />
        <div className="flex items-center justify-between"><span className="titre-carte">Total des gains</span><TrendingUp className="h-5 w-5 text-emerald-400" /></div>
        <div className={cx("chiffres mt-3 font-display font-bold pos", taille)}>{formatMoney(t.gains)}</div>
        <div className="discret mt-1 text-xs">{t.nbGains} gain{t.nbGains > 1 ? "s" : ""} enregistré{t.nbGains > 1 ? "s" : ""}</div>
      </div>
      <div className="panneau relative overflow-hidden border-red-500/25" data-testid="total-pertes">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-800 via-red-500 to-red-800" />
        <div className="flex items-center justify-between"><span className="titre-carte">Total des pertes</span><TrendingDown className="h-5 w-5 text-red-400" /></div>
        <div className={cx("chiffres mt-3 font-display font-bold neg", taille)}>{formatMoney(t.pertes)}</div>
        <div className="discret mt-1 text-xs">{t.nbPertes} perte{t.nbPertes > 1 ? "s" : ""} enregistrée{t.nbPertes > 1 ? "s" : ""}</div>
      </div>
      <div className={cx("panneau panneau-or relative overflow-hidden", s === "positif" && "border-emerald-400/40", s === "negatif" && "border-red-400/40")} data-testid="bilan-net" data-signe={s}>
        <div className="lisere absolute inset-x-0 top-0 h-1" />
        <div className="flex items-center justify-between"><span className="titre-carte">Bilan net</span><Scale className="h-5 w-5 text-or" /></div>
        <div className={cx("chiffres mt-3 font-display font-bold", taille, s === "positif" ? "pos lueur-pos" : s === "negatif" ? "neg lueur-neg" : "nul")}>{formatMoney(t.net, "EUR", { signed: true })}</div>
        <div className="discret mt-1 text-xs">{s === "positif" ? "Bilan positif" : s === "negatif" ? "Bilan négatif" : "Bilan à l'équilibre"} · gains − pertes</div>
      </div>
    </div>
  );
}
