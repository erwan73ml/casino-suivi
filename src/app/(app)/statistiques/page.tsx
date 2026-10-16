"use client";

import { useMemo } from "react";
import { useStore } from "@/components/store";
import { SelecteurPeriode } from "@/components/periode";
import { TotauxCartes } from "@/components/totaux-cartes";
import { GraphiqueAnneau, GraphiqueCategories, GraphiqueCumul, GraphiqueMensuel } from "@/components/graphiques";
import { Montant } from "@/components/ui";
import { cumul, filtrerPeriode, parCategorie, parMois, totaux } from "@/lib/calc";
import { periodeLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { CATEGORIE_LABELS, type Categorie } from "@/lib/types";

export default function Statistiques() {
  const { operations, periode } = useStore();
  const ops = useMemo(() => filtrerPeriode(operations, periode), [operations, periode]);
  const t = useMemo(() => totaux(ops), [ops]);
  const mois = useMemo(() => parMois(ops, periode), [ops, periode]);
  // La courbe part du bilan accumulé avant la période, pour rester fidèle au résultat depuis la première opération.
  const depart = useMemo(() => (periode.debut ? totaux(operations.filter((o) => o.date < periode.debut!)).net : 0), [operations, periode]);
  const courbe = useMemo(() => cumul(ops, depart), [ops, depart]);
  const cats = useMemo(() => parCategorie(ops), [ops]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.3em] text-or/70 uppercase">Statistiques</p>
        <h1 className="titre mt-1 text-3xl font-bold">Analyse de mes résultats</h1>
      </div>
      <SelecteurPeriode />
      <TotauxCartes t={t} compact />

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="panneau xl:col-span-2">
          <h2 className="titre text-lg font-semibold">Évolution mensuelle</h2>
          <p className="discret mb-4 text-xs">Gains et pertes de chaque mois. Le point indique le bilan du mois : vert s&apos;il est positif, rouge s&apos;il est négatif.</p>
          <GraphiqueMensuel data={mois} />
        </section>
        <section className="panneau">
          <h2 className="titre text-lg font-semibold">Répartition gains / pertes</h2>
          <p className="discret mb-4 text-xs">{periodeLabel(periode)}</p>
          <GraphiqueAnneau t={t} />
        </section>
      </div>

      <section className="panneau">
        <h2 className="titre text-lg font-semibold">Bilan cumulé</h2>
        <p className="discret mb-4 text-xs">
          Évolution de votre résultat net depuis la première opération enregistrée.
          {periode.debut && depart !== 0 && <> Au début de la période, votre bilan cumulé était de <Montant cents={depart} signed />.</>}
        </p>
        <GraphiqueCumul data={courbe} />
      </section>

      <section className="panneau">
        <h2 className="titre text-lg font-semibold">Casino contre paris sportifs</h2>
        <p className="discret mb-4 text-xs">Gains, pertes et bilan net de chaque catégorie.</p>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><GraphiqueCategories data={cats} /></div>
          <div className="space-y-3">
            {(Object.keys(cats) as Categorie[]).map((c) => (
              <div key={c} className="rounded-xl border border-white/10 bg-black/30 p-4" data-testid={`cat-${c}`}>
                <div className="mb-2 font-display text-lg text-or-clair">{CATEGORIE_LABELS[c]}</div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div><dt className="text-white/50">Gains</dt><dd className="chiffres pos font-semibold">{formatMoney(cats[c].gains)}</dd></div>
                  <div><dt className="text-white/50">Pertes</dt><dd className="chiffres neg font-semibold">{formatMoney(cats[c].pertes)}</dd></div>
                  <div><dt className="text-white/50">Bilan</dt><dd className="font-semibold"><Montant cents={cats[c].net} signed /></dd></div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
