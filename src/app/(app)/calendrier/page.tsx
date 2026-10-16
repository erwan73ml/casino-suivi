"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useStore } from "@/components/store";
import { useFormulaire } from "@/components/formulaire";
import { SelecteurPeriode } from "@/components/periode";
import { TotauxCartes } from "@/components/totaux-cartes";
import { TableauOperations } from "@/components/tableau";
import { cx } from "@/components/ui";
import { filtrerPeriode, parJour, totaux, trierRecent } from "@/lib/calc";
import { addDays, daysInMonth, formatMonth, inPeriode, iso, JOURS_COURTS, monthKey, nextMonthKey, periodeFor, periodeLabel, startOfWeek, today, weekday } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

function court(cents: number) {
  const e = Math.abs(cents) / 100;
  const s = e >= 1000 ? `${(e / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k` : e.toLocaleString("fr-FR", { maximumFractionDigits: e < 10 ? 2 : 0 });
  return `${cents > 0 ? "+" : cents < 0 ? "−" : ""}${s} €`;
}

export default function Calendrier() {
  const { operations, periode, setPeriode } = useStore();
  const ouvrir = useFormulaire();
  const [mois, setMois] = useState(() => monthKey(periode.debut ?? today()));
  useEffect(() => {
    if (periode.debut) setMois(monthKey(periode.debut));
  }, [periode.debut]);

  const jours = useMemo(() => parJour(operations), [operations]);
  const ops = useMemo(() => filtrerPeriode(operations, periode), [operations, periode]);
  const t = useMemo(() => totaux(ops), [ops]);
  const totalMois = useMemo(() => totaux(filtrerPeriode(operations, periodeFor("mois", `${mois}-01`))), [operations, mois]);

  const [y, m] = mois.split("-").map(Number);
  const premier = iso(y, m, 1);
  const debutGrille = startOfWeek(premier);
  const nbCases = Math.ceil((weekday(premier) + daysInMonth(y, m)) / 7) * 7;
  const cases = Array.from({ length: nbCases }, (_, i) => addDays(debutGrille, i));
  const auj = today();
  const jourSeul = periode.mode === "jour" ? periode.debut : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.3em] text-or/70 uppercase">Calendrier</p>
        <h1 className="titre mt-1 text-3xl font-bold">Mes opérations jour par jour</h1>
        <p className="discret mt-1 text-sm">Touchez une date pour voir ses opérations, ou choisissez une semaine, un mois, une année ou une période personnalisée.</p>
      </div>
      <SelecteurPeriode />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="panneau panneau-or lg:col-span-3" data-testid="calendrier">
          <div className="mb-4 flex items-center justify-between gap-2">
            <button className="btn btn-sm" onClick={() => setMois(nextMonthKey(mois, -1))} aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></button>
            <div className="text-center">
              <button className="titre text-xl font-semibold capitalize hover:underline" onClick={() => setPeriode(periodeFor("mois", premier))} title="Afficher tout le mois">{formatMonth(mois)}</button>
              <div className="text-xs text-white/55">Bilan du mois : <span className={cx("chiffres font-semibold", totalMois.net > 0 ? "pos" : totalMois.net < 0 ? "neg" : "nul")}>{formatMoney(totalMois.net, "EUR", { signed: true })}</span></div>
            </div>
            <button className="btn btn-sm" onClick={() => setMois(nextMonthKey(mois, 1))} aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] tracking-wider text-or/70 uppercase sm:gap-1.5 sm:text-xs">
            {JOURS_COURTS.map((j) => <div key={j} className="pb-1">{j}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {cases.map((d) => {
              const p = jours.get(d);
              const dansMois = monthKey(d) === mois;
              const selection = periode.debut !== null && inPeriode(d, periode);
              const n = p?.net ?? 0;
              return (
                <button key={d} onClick={() => setPeriode(periodeFor("jour", d))} data-date={d} aria-pressed={jourSeul === d}
                  aria-label={`${d}${p ? ` : bilan ${formatMoney(n, "EUR", { signed: true })}` : " : aucune opération"}`}
                  className={cx(
                    "flex aspect-square min-h-11 flex-col items-center justify-between rounded-lg border p-1 text-xs transition sm:aspect-auto sm:h-20 sm:p-1.5",
                    dansMois ? "bg-black/35" : "bg-black/10 opacity-40",
                    p ? (n > 0 ? "border-emerald-500/50" : n < 0 ? "border-red-500/50" : "border-white/25") : "border-white/5",
                    selection && "ring-2 ring-or/70",
                    "hover:border-or/60",
                  )}>
                  <span className={cx("self-start font-medium", d === auj && "rounded-full bg-or px-1.5 text-noir")}>{Number(d.slice(8))}</span>
                  {p && (
                    <>
                      <span className={cx("h-1.5 w-1.5 rounded-full sm:hidden", n > 0 ? "bg-emerald-400" : n < 0 ? "bg-red-400" : "bg-white/60")} />
                      <span className={cx("chiffres hidden w-full truncate text-right text-[11px] font-semibold sm:block", n > 0 ? "pos" : n < 0 ? "neg" : "nul")}>{court(n)}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/55">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Journée gagnante</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" /> Journée perdante</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full ring-2 ring-or/70" /> Période sélectionnée</span>
          </div>
        </section>

        <section className="space-y-4 lg:col-span-2">
          <div className="panneau">
            <div className="titre text-lg font-semibold" data-testid="cal-label">{periodeLabel(periode)}</div>
            <p className="mt-1 text-sm">
              {t.nbGains + t.nbPertes === 0 ? <span className="text-white/55">Aucune opération sur cette période.</span>
                : t.net > 0 ? <span className="pos">Bilan positif sur la période.</span>
                : t.net < 0 ? <span className="neg">Bilan négatif sur la période.</span>
                : <span className="nul">Bilan à l&apos;équilibre sur la période.</span>}
            </p>
            {jourSeul && (
              <div className="mt-3 flex gap-2">
                <button className="btn btn-gain btn-sm" onClick={() => ouvrir({ type: "gain", date: jourSeul })}><Plus className="h-4 w-4" /> Gain ce jour</button>
                <button className="btn btn-perte btn-sm" onClick={() => ouvrir({ type: "perte", date: jourSeul })}><Plus className="h-4 w-4" /> Perte ce jour</button>
              </div>
            )}
          </div>
          <TotauxCartes t={t} compact vertical />
        </section>
      </div>

      <section className="panneau">
        <h2 className="titre mb-3 text-lg font-semibold">Opérations de la période</h2>
        <TableauOperations operations={trierRecent(ops)} vide="Aucune opération sur cette période." />
      </section>
    </div>
  );
}
