"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { useStore } from "@/components/store";
import { SelecteurPeriode } from "@/components/periode";
import { TotauxCartes } from "@/components/totaux-cartes";
import { TableauOperations } from "@/components/tableau";
import { filtrerPeriode, totaux, trierRecent, versCSV } from "@/lib/calc";
import { formatDate } from "@/lib/dates";
import { CATEGORIE_LABELS } from "@/lib/types";
import { telechargerCSV } from "@/lib/telechargement";

type Tri = "date-desc" | "date-asc" | "montant-desc" | "montant-asc";
const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Historique() {
  const { operations, periode } = useStore();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | "gain" | "perte">("");
  const [cat, setCat] = useState<"" | "casino" | "paris_sportifs">("");
  const [tri, setTri] = useState<Tri>("date-desc");

  const liste = useMemo(() => {
    const recherche = sansAccents(q.trim());
    let l = filtrerPeriode(operations, periode).filter(
      (o) =>
        (!type || o.type === type) &&
        (!cat || o.categorie === cat) &&
        (!recherche ||
          sansAccents([o.commentaire ?? "", CATEGORIE_LABELS[o.categorie], o.type, formatDate(o.date), (o.montant_cents / 100).toFixed(2).replace(".", ",")].join(" ")).includes(recherche)),
    );
    l = trierRecent(l);
    if (tri === "date-asc") l.reverse();
    if (tri === "montant-desc") l.sort((a, b) => b.montant_cents - a.montant_cents);
    if (tri === "montant-asc") l.sort((a, b) => a.montant_cents - b.montant_cents);
    return l;
  }, [operations, periode, q, type, cat, tri]);
  const t = useMemo(() => totaux(liste), [liste]);
  const filtre = q || type || cat;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.3em] text-or/70 uppercase">Historique</p>
          <h1 className="titre mt-1 text-3xl font-bold">Toutes mes opérations</h1>
        </div>
        <button className="btn" onClick={() => telechargerCSV(versCSV(liste), `operations-${new Date().toISOString().slice(0, 10)}.csv`)} disabled={!liste.length}><Download className="h-4 w-4" /> Exporter en CSV</button>
      </div>
      <SelecteurPeriode />
      <TotauxCartes t={t} compact />
      <section className="panneau">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Rechercher</span>
            <Search className="absolute top-3 left-3 h-4 w-4 text-white/40" />
            <input className="champ pl-9" placeholder="Rechercher (commentaire, montant…)" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <select className="champ" value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="Type">
            <option value="">Gains et pertes</option>
            <option value="gain">Gains uniquement</option>
            <option value="perte">Pertes uniquement</option>
          </select>
          <select className="champ" value={cat} onChange={(e) => setCat(e.target.value as typeof cat)} aria-label="Catégorie">
            <option value="">Toutes les catégories</option>
            <option value="casino">Casino</option>
            <option value="paris_sportifs">Paris sportifs</option>
          </select>
          <select className="champ" value={tri} onChange={(e) => setTri(e.target.value as Tri)} aria-label="Tri">
            <option value="date-desc">Plus récentes d&apos;abord</option>
            <option value="date-asc">Plus anciennes d&apos;abord</option>
            <option value="montant-desc">Montant décroissant</option>
            <option value="montant-asc">Montant croissant</option>
          </select>
        </div>
        <p className="discret mb-2 text-xs" data-testid="nb-resultats">{liste.length} opération{liste.length > 1 ? "s" : ""}{filtre ? " correspondant aux filtres" : ""}</p>
        <TableauOperations operations={liste} vide={operations.length ? "Aucune opération ne correspond à cette recherche." : "Aucune opération enregistrée pour l'instant."} />
      </section>
    </div>
  );
}
