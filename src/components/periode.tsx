"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { periodeFor, periodeLabel, shiftPeriode, today, type PeriodeMode } from "@/lib/dates";
import { useStore } from "./store";
import { cx } from "./ui";

const MODES: [PeriodeMode, string][] = [
  ["tout", "Tout"],
  ["jour", "Jour"],
  ["semaine", "Semaine"],
  ["mois", "Mois"],
  ["annee", "Année"],
  ["perso", "Personnalisée"],
];

/** Sélecteur de période partagé par toutes les pages : totaux, graphiques et historique suivent la même période. */
export function SelecteurPeriode() {
  const { periode, setPeriode } = useStore();
  const ref = periode.debut ?? today();
  const navigable = periode.mode !== "tout" && periode.mode !== "perso";
  return (
    <div className="panneau flex flex-col gap-3 p-3 sm:p-4" data-testid="periode">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Période">
        {MODES.map(([m, l]) => (
          <button key={m} role="tab" aria-selected={periode.mode === m} onClick={() => setPeriode(m === "perso" ? periodeFor("perso", today(), { debut: periode.debut ?? today(), fin: periode.fin ?? today() }) : periodeFor(m, m === periode.mode ? ref : today()))}
            className={cx("rounded-full border px-3 py-1 text-xs font-medium transition sm:text-sm", periode.mode === m ? "border-or bg-or/15 text-or-clair" : "border-white/10 text-white/60 hover:border-white/30 hover:text-white")}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {navigable && <button className="btn btn-sm" onClick={() => setPeriode(shiftPeriode(periode, -1))} aria-label="Période précédente"><ChevronLeft className="h-4 w-4" /></button>}
        <span className="titre min-w-0 text-base font-semibold sm:text-lg" data-testid="periode-label">{periodeLabel(periode)}</span>
        {navigable && <button className="btn btn-sm" onClick={() => setPeriode(shiftPeriode(periode, 1))} aria-label="Période suivante"><ChevronRight className="h-4 w-4" /></button>}
        {navigable && <button className="btn btn-sm btn-ghost text-or" onClick={() => setPeriode(periodeFor(periode.mode, today()))}>Aujourd&apos;hui</button>}
        {periode.mode === "perso" && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <label className="flex items-center gap-2 text-xs text-white/60">Du
              <input type="date" aria-label="Date de début" className="champ w-auto py-1.5" value={periode.debut ?? ""} onChange={(e) => e.target.value && setPeriode(periodeFor("perso", today(), { debut: e.target.value, fin: periode.fin ?? e.target.value }))} />
            </label>
            <label className="flex items-center gap-2 text-xs text-white/60">au
              <input type="date" aria-label="Date de fin" className="champ w-auto py-1.5" value={periode.fin ?? ""} onChange={(e) => e.target.value && setPeriode(periodeFor("perso", today(), { debut: periode.debut ?? e.target.value, fin: e.target.value }))} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
