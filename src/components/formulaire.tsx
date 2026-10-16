"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Dices, Trophy } from "lucide-react";
import { centsToInput, formatMoney, parseMoney } from "@/lib/money";
import { isValidIso, today } from "@/lib/dates";
import type { Categorie, Operation, TypeOperation } from "@/lib/types";
import { nouvelId, useStore } from "./store";
import { cx, Modal } from "./ui";

type Ouvrir = (opts: { type?: TypeOperation; operation?: Operation; date?: string }) => void;
const Ctx = createContext<Ouvrir>(() => {});
export const useFormulaire = () => useContext(Ctx);

interface Etat {
  id: string; // identifiant de la nouvelle opération (ou de celle modifiée)
  edition: boolean;
  date: string;
  type: TypeOperation;
  categorie: Categorie;
  montant: string;
  commentaire: string;
}

export function FormulaireProvider({ children }: { children: React.ReactNode }) {
  const { ajouter, modifier } = useStore();
  const [etat, setEtat] = useState<Etat | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);

  const ouvrir: Ouvrir = useCallback(({ type, operation, date }) => {
    setErreurs({});
    setEtat(
      operation
        ? { id: operation.id, edition: true, date: operation.date, type: operation.type, categorie: operation.categorie, montant: centsToInput(operation.montant_cents), commentaire: operation.commentaire ?? "" }
        : { id: nouvelId(), edition: false, date: date ?? today(), type: type ?? "gain", categorie: "casino", montant: "", commentaire: "" },
    );
  }, []);
  const fermer = useCallback(() => !envoi && setEtat(null), [envoi]);

  const valider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!etat || envoi) return;
    const errs: Record<string, string> = {};
    const cents = parseMoney(etat.montant);
    if (!isValidIso(etat.date)) errs.date = "Date invalide.";
    if (cents === null) errs.montant = "Montant invalide. Exemple : 125,50";
    else if (cents <= 0) errs.montant = "Le montant doit être supérieur à 0 (le type indique gain ou perte).";
    else if (cents > 100000000000) errs.montant = "Montant trop élevé.";
    if (etat.commentaire.length > 500) errs.commentaire = "500 caractères maximum.";
    setErreurs(errs);
    if (Object.keys(errs).length) return;
    setEnvoi(true);
    const data = { date: etat.date, type: etat.type, categorie: etat.categorie, montant_cents: cents!, commentaire: etat.commentaire.trim() || null };
    const ok = etat.edition ? await modifier(etat.id, data) : await ajouter(data, etat.id);
    setEnvoi(false);
    if (ok) setEtat(null);
  };

  const apercu = etat ? parseMoney(etat.montant) : null;

  return (
    <Ctx.Provider value={ouvrir}>
      {children}
      <Modal open={!!etat} onClose={fermer} title={etat?.edition ? "Modifier l'opération" : etat?.type === "perte" ? "Ajouter une perte" : "Ajouter un gain"}>
        {etat && (
          <form onSubmit={valider} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-black/40 p-1" role="radiogroup" aria-label="Type">
              {(["gain", "perte"] as const).map((t) => (
                <button key={t} type="button" role="radio" aria-checked={etat.type === t} onClick={() => setEtat({ ...etat, type: t })}
                  className={cx("rounded-lg py-2 text-sm font-semibold transition", etat.type === t ? (t === "gain" ? "bg-emerald-600 text-white" : "bg-red-700 text-white") : "text-white/60 hover:text-white")}>
                  {t === "gain" ? "Gain" : "Perte"}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="etiquette" htmlFor="f-montant">Montant net (€)</label>
                <input id="f-montant" data-autofocus inputMode="decimal" autoComplete="off" placeholder="0,00" className={cx("champ chiffres text-lg", erreurs.montant && "champ-erreur")} value={etat.montant} onChange={(e) => setEtat({ ...etat, montant: e.target.value })} />
                {erreurs.montant && <p className="mt-1 text-xs text-red-400">{erreurs.montant}</p>}
              </div>
              <div>
                <label className="etiquette" htmlFor="f-date">Date</label>
                <input id="f-date" type="date" className={cx("champ", erreurs.date && "champ-erreur")} value={etat.date} max="2100-12-31" onChange={(e) => setEtat({ ...etat, date: e.target.value })} />
                {erreurs.date && <p className="mt-1 text-xs text-red-400">{erreurs.date}</p>}
              </div>
            </div>
            <div>
              <span className="etiquette">Catégorie</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Catégorie">
                {([["casino", "Casino", Dices], ["paris_sportifs", "Paris sportifs", Trophy]] as const).map(([c, l, Icon]) => (
                  <button key={c} type="button" role="radio" aria-checked={etat.categorie === c} onClick={() => setEtat({ ...etat, categorie: c })}
                    className={cx("flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition", etat.categorie === c ? "border-or bg-or/15 text-or-clair" : "border-white/15 text-white/60 hover:text-white")}>
                    <Icon className="h-4 w-4" /> {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="etiquette" htmlFor="f-commentaire">Commentaire (facultatif)</label>
              <textarea id="f-commentaire" rows={2} maxLength={500} className={cx("champ resize-none", erreurs.commentaire && "champ-erreur")} placeholder="Ex. : soirée au casino de Deauville, match PSG – OM…" value={etat.commentaire} onChange={(e) => setEtat({ ...etat, commentaire: e.target.value })} />
            </div>
            <p className="discret text-xs">Indiquez le bénéfice net ou la perte nette de l&apos;opération, pas la mise totale.{apercu !== null && apercu > 0 && <> Effet sur le bilan : <strong className={etat.type === "gain" ? "pos" : "neg"}>{formatMoney(etat.type === "gain" ? apercu : -apercu, "EUR", { signed: true })}</strong></>}</p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn" onClick={fermer} disabled={envoi}>Annuler</button>
              <button type="submit" className={cx("btn", etat.type === "gain" ? "btn-gain" : "btn-perte")} disabled={envoi}>{envoi ? "Enregistrement…" : etat.edition ? "Enregistrer" : etat.type === "gain" ? "Enregistrer le gain" : "Enregistrer la perte"}</button>
            </div>
          </form>
        )}
      </Modal>
    </Ctx.Provider>
  );
}
