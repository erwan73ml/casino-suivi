"use client";

import { useEffect, useState } from "react";
import { Download, LogOut, ShieldAlert } from "lucide-react";
import { useStore } from "@/components/store";
import { LimitePertes } from "@/components/limite";
import { cx } from "@/components/ui";
import { centsToInput, formatMoney, parseMoney } from "@/lib/money";
import { totaux, versCSV } from "@/lib/calc";
import type { LimitePeriode } from "@/lib/types";
import { telechargerCSV } from "@/lib/telechargement";

export default function Reglages() {
  const { user, operations, reglages, enregistrerReglages, deconnexion } = useStore();
  const [active, setActive] = useState(reglages.limite_pertes_cents !== null);
  const [montant, setMontant] = useState(centsToInput(reglages.limite_pertes_cents));
  const [periode, setPeriode] = useState<LimitePeriode>(reglages.limite_periode);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => {
    setActive(reglages.limite_pertes_cents !== null);
    setMontant(centsToInput(reglages.limite_pertes_cents));
    setPeriode(reglages.limite_periode);
  }, [reglages]);

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    let cents: number | null = null;
    if (active) {
      cents = parseMoney(montant);
      if (cents === null || cents <= 0) return setErreur("Indiquez un montant supérieur à 0, par exemple 200.");
    }
    setEnvoi(true);
    await enregistrerReglages({ limite_pertes_cents: cents, limite_periode: periode });
    setEnvoi(false);
  };
  const t = totaux(operations);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.3em] text-or/70 uppercase">Réglages</p>
        <h1 className="titre mt-1 text-3xl font-bold">Mon compte</h1>
      </div>

      <section className="panneau panneau-or">
        <h2 className="titre mb-1 flex items-center gap-2 text-lg font-semibold"><ShieldAlert className="h-5 w-5" /> Limite personnelle de pertes</h2>
        <p className="discret mb-4 text-sm">Facultatif. Fixez un plafond de pertes : une alerte s&apos;affiche dès que vous l&apos;atteignez, et un avertissement à partir de 80 %.</p>
        <form onSubmit={enregistrer} className="space-y-4" noValidate>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[#d4af37]" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Activer une limite de pertes
          </label>
          <div className={cx("grid gap-4 sm:grid-cols-2", !active && "pointer-events-none opacity-40")}>
            <div>
              <label className="etiquette" htmlFor="limite">Montant maximum de pertes (€)</label>
              <input id="limite" inputMode="decimal" className={cx("champ chiffres", erreur && "champ-erreur")} placeholder="200,00" value={montant} onChange={(e) => setMontant(e.target.value)} disabled={!active} />
              {erreur && <p className="mt-1 text-xs text-red-400">{erreur}</p>}
            </div>
            <div>
              <label className="etiquette" htmlFor="limite-periode">Période</label>
              <select id="limite-periode" className="champ" value={periode} onChange={(e) => setPeriode(e.target.value as LimitePeriode)} disabled={!active}>
                <option value="semaine">Par semaine (lundi → dimanche)</option>
                <option value="mois">Par mois</option>
                <option value="annee">Par année</option>
              </select>
            </div>
          </div>
          <button className="btn btn-or" disabled={envoi}>{envoi ? "Enregistrement…" : "Enregistrer"}</button>
        </form>
        <div className="mt-5"><LimitePertes /></div>
      </section>

      <section className="panneau">
        <h2 className="titre mb-1 text-lg font-semibold">Mes données</h2>
        <p className="discret mb-4 text-sm">
          {operations.length} opération{operations.length > 1 ? "s" : ""} sauvegardée{operations.length > 1 ? "s" : ""} dans votre compte ({formatMoney(t.gains)} de gains, {formatMoney(t.pertes)} de pertes).
          Elles sont enregistrées dans une base de données sécurisée, visibles uniquement par vous.
        </p>
        <button className="btn" onClick={() => telechargerCSV(versCSV(operations), `sauvegarde-operations-${new Date().toISOString().slice(0, 10)}.csv`)} disabled={!operations.length}><Download className="h-4 w-4" /> Télécharger une copie (CSV)</button>
      </section>

      <section className="panneau">
        <h2 className="titre mb-1 text-lg font-semibold">Compte</h2>
        <p className="discret mb-4 text-sm">Connecté avec <strong className="text-white/85">{user?.email}</strong></p>
        <button className="btn" onClick={deconnexion}><LogOut className="h-4 w-4" /> Se déconnecter</button>
      </section>
    </div>
  );
}
