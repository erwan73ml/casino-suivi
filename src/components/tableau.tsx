"use client";

import { useState } from "react";
import { Dices, Pencil, Trash2, Trophy } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { CATEGORIE_LABELS, type Operation } from "@/lib/types";
import { useStore } from "./store";
import { useFormulaire } from "./formulaire";
import { Confirmation, cx, Vide } from "./ui";

function Type({ o }: { o: Operation }) {
  return <span className={cx("pastille", o.type === "gain" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300")}>{o.type === "gain" ? "Gain" : "Perte"}</span>;
}
function Cat({ o }: { o: Operation }) {
  const Icon = o.categorie === "casino" ? Dices : Trophy;
  return <span className="inline-flex items-center gap-1.5 text-white/80"><Icon className="h-3.5 w-3.5 text-or/80" />{CATEGORIE_LABELS[o.categorie]}</span>;
}
function Valeur({ o }: { o: Operation }) {
  return <span className={cx("chiffres font-semibold", o.type === "gain" ? "pos" : "neg")}>{formatMoney(o.type === "gain" ? o.montant_cents : -o.montant_cents, "EUR", { signed: true })}</span>;
}

export function TableauOperations({ operations, vide = "Aucune opération." }: { operations: Operation[]; vide?: string }) {
  const { supprimer } = useStore();
  const ouvrir = useFormulaire();
  const [aSupprimer, setASupprimer] = useState<Operation | null>(null);
  const [busy, setBusy] = useState(false);

  if (!operations.length) return <Vide>{vide}</Vide>;

  const actions = (o: Operation) => (
    <div className="flex justify-end gap-1">
      <button className="btn btn-ghost btn-sm" onClick={() => ouvrir({ operation: o })} aria-label="Modifier" title="Modifier"><Pencil className="h-4 w-4" /></button>
      <button className="btn btn-ghost btn-sm text-red-300" onClick={() => setASupprimer(o)} aria-label="Supprimer" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
    </div>
  );

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm" data-testid="tableau">
          <thead>
            <tr className="text-xs tracking-wider text-or/70 uppercase">
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Type</th>
              <th className="px-3 py-2 font-semibold">Catégorie</th>
              <th className="px-3 py-2 text-right font-semibold">Montant</th>
              <th className="px-3 py-2 font-semibold">Commentaire</th>
              <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {operations.map((o) => (
              <tr key={o.id} className="border-t border-white/5 hover:bg-white/[0.03]" data-testid="ligne">
                <td className="chiffres px-3 py-2.5 whitespace-nowrap">{formatDate(o.date)}</td>
                <td className="px-3 py-2.5"><Type o={o} /></td>
                <td className="px-3 py-2.5 whitespace-nowrap"><Cat o={o} /></td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap"><Valeur o={o} /></td>
                <td className="max-w-xs truncate px-3 py-2.5 text-white/65" title={o.commentaire ?? undefined}>{o.commentaire || <span className="text-white/25">—</span>}</td>
                <td className="px-3 py-1.5">{actions(o)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-white/5 md:hidden" data-testid="liste-mobile">
        {operations.map((o) => (
          <li key={o.id} className="flex items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm"><Type o={o} /><Cat o={o} /></div>
              <div className="mt-1 text-xs text-white/50">{formatDate(o.date)}{o.commentaire ? ` · ${o.commentaire}` : ""}</div>
            </div>
            <div className="flex flex-col items-end gap-1"><Valeur o={o} />{actions(o)}</div>
          </li>
        ))}
      </ul>
      <Confirmation
        open={!!aSupprimer}
        onClose={() => !busy && setASupprimer(null)}
        busy={busy}
        title="Supprimer cette opération ?"
        message={aSupprimer && <>{aSupprimer.type === "gain" ? "Gain" : "Perte"} de <strong>{formatMoney(aSupprimer.montant_cents)}</strong> ({CATEGORIE_LABELS[aSupprimer.categorie]}) du {formatDate(aSupprimer.date)}. Les totaux et les graphiques seront recalculés. Cette action est définitive.</>}
        onConfirm={async () => {
          if (!aSupprimer) return;
          setBusy(true);
          const ok = await supprimer(aSupprimer.id);
          setBusy(false);
          if (ok) setASupprimer(null);
        }}
      />
    </>
  );
}
