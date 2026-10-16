"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { useStore } from "@/components/store";
import { useFormulaire } from "@/components/formulaire";
import { SelecteurPeriode } from "@/components/periode";
import { TotauxCartes } from "@/components/totaux-cartes";
import { LimitePertes } from "@/components/limite";
import { TableauOperations } from "@/components/tableau";
import { Montant } from "@/components/ui";
import { filtrerPeriode, totaux, trierRecent } from "@/lib/calc";
import { periodeFor, periodeLabel, today } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export default function TableauDeBord() {
  const { operations, periode, setPeriode } = useStore();
  const ouvrir = useFormulaire();
  const surPeriode = useMemo(() => filtrerPeriode(operations, periode), [operations, periode]);
  const t = useMemo(() => totaux(surPeriode), [surPeriode]);
  const reperes = useMemo(() => {
    const j = today();
    return [
      { titre: "Gagné ce mois-ci", p: periodeFor("mois", j), champ: "gains" as const },
      { titre: "Perdu cette semaine", p: periodeFor("semaine", j), champ: "pertes" as const },
      { titre: "Bilan depuis le 1er janvier", p: periodeFor("annee", j), champ: "net" as const },
    ].map((r) => ({ ...r, t: totaux(filtrerPeriode(operations, r.p)) }));
  }, [operations]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.3em] text-or/70 uppercase">Tableau de bord</p>
          <h1 className="titre mt-1 text-3xl font-bold sm:text-4xl">Mes gains et pertes</h1>
          <p className="discret mt-1 text-sm">{periodeLabel(periode)} · {surPeriode.length} opération{surPeriode.length > 1 ? "s" : ""}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <button className="btn btn-gain px-5 py-3 text-base" onClick={() => ouvrir({ type: "gain" })}><Plus className="h-5 w-5" /> Ajouter un gain</button>
          <button className="btn btn-perte px-5 py-3 text-base" onClick={() => ouvrir({ type: "perte" })}><Minus className="h-5 w-5" /> Ajouter une perte</button>
        </div>
      </section>

      <SelecteurPeriode />
      <TotauxCartes t={t} />
      <LimitePertes />

      <section className="grid gap-4 sm:grid-cols-3">
        {reperes.map((r) => (
          <button key={r.titre} onClick={() => setPeriode(r.p)} className="panneau text-left transition hover:border-or/40" title={`Afficher : ${periodeLabel(r.p)}`}>
            <div className="text-xs text-white/55">{r.titre}</div>
            <div className="mt-1 font-display text-2xl font-bold">
              {r.champ === "net" ? <Montant cents={r.t.net} signed /> : <span className={`chiffres ${r.champ === "gains" ? "pos" : "neg"}`}>{formatMoney(r.t[r.champ])}</span>}
            </div>
            <div className="mt-1 text-xs text-white/40">{periodeLabel(r.p)}</div>
          </button>
        ))}
      </section>

      <section className="panneau">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="titre text-xl font-semibold">Dernières opérations</h2>
          <Link href="/historique" className="flex items-center gap-1 text-sm text-or hover:underline">Tout l&apos;historique <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <TableauOperations operations={trierRecent(surPeriode).slice(0, 6)} vide={operations.length ? "Aucune opération sur cette période." : "Aucune opération pour l'instant. Commencez avec « Ajouter un gain » ou « Ajouter une perte »."} />
      </section>
    </div>
  );
}
