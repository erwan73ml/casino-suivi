"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AuthChangeEvent, User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { periodeFor, today as todayIso, type Periode } from "@/lib/dates";
import type { Operation, Reglages } from "@/lib/types";

export type SyncState = "chargement" | "enregistre" | "enregistrement" | "erreur" | "hors-ligne";

export interface Toast {
  id: number;
  kind: "succes" | "erreur";
  message: string;
}

export type NouvelleOperation = Omit<Operation, "id" | "user_id" | "created_at" | "updated_at">;

interface StoreValue {
  user: User | null;
  operations: Operation[];
  reglages: Reglages;
  chargement: boolean;
  erreurChargement: string | null;
  sync: { state: SyncState; message: string | null; derniere: Date | null };
  periode: Periode;
  setPeriode: (p: Periode) => void;
  ajouter: (o: NouvelleOperation, id?: string) => Promise<boolean>;
  modifier: (id: string, o: NouvelleOperation) => Promise<boolean>;
  supprimer: (id: string) => Promise<boolean>;
  enregistrerReglages: (r: Reglages) => Promise<boolean>;
  recharger: () => Promise<void>;
  toasts: Toast[];
  fermerToast: (id: number) => void;
  deconnexion: () => Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore doit être utilisé dans <StoreProvider>");
  return v;
}

const REGLAGES_DEFAUT: Reglages = { limite_pertes_cents: null, limite_periode: "mois" };
const COLONNES = "id, date, type, categorie, montant_cents, commentaire, created_at, updated_at";

/** Traduit les erreurs techniques en messages clairs. */
export function expliquer(err: unknown): string {
  const e = err as { message?: string; code?: string } | null;
  const msg = e?.message ?? String(err);
  if (typeof navigator !== "undefined" && !navigator.onLine) return "Vous êtes hors ligne : rien n'a été enregistré. Réessayez une fois la connexion revenue.";
  if (/Failed to fetch|NetworkError|fetch failed|Load failed/i.test(msg)) return "Le serveur est injoignable : rien n'a été enregistré. Vérifiez votre connexion et réessayez.";
  if (e?.code === "23514") return "Données refusées : vérifiez le montant (supérieur à 0) et les champs saisis.";
  if (e?.code === "42P01" || /does not exist|schema cache/i.test(msg)) return "La base de données n'est pas encore prête : exécutez le script SQL d'installation dans Supabase.";
  if (e?.code === "42501" || /row-level security|JWT|session/i.test(msg)) return "Votre session a expiré : reconnectez-vous.";
  return `Échec de l'enregistrement : ${msg}`;
}

export const nouvelId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const supabase = supabaseBrowser();
  const [user, setUser] = useState<User | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [reglages, setReglages] = useState<Reglages>(REGLAGES_DEFAUT);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(0);
  const [erreurSync, setErreurSync] = useState<string | null>(null);
  const [derniere, setDerniere] = useState<Date | null>(null);
  const [enLigne, setEnLigne] = useState(true);
  const [periode, setPeriode] = useState<Periode>(() => periodeFor("tout", todayIso()));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((message: string, kind: Toast["kind"] = "succes") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "erreur" ? 9000 : 3500);
  }, []);
  const fermerToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const recharger = useCallback(async () => {
    setChargement(true);
    setErreurChargement(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) return;
      // Lecture paginée : aucune limite au nombre d'opérations conservées.
      const toutes: Operation[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("jeux_operations").select(COLONNES).order("date", { ascending: false }).order("created_at", { ascending: false }).range(from, from + 999);
        if (error) throw error;
        toutes.push(...(data as Operation[]).map((o) => ({ ...o, montant_cents: Number(o.montant_cents) })));
        if (!data || data.length < 1000) break;
      }
      const { data: r, error: er } = await supabase.from("jeux_reglages").select("limite_pertes_cents, limite_periode").maybeSingle();
      if (er) throw er;
      setOperations(toutes);
      setReglages(r ? { limite_pertes_cents: r.limite_pertes_cents === null ? null : Number(r.limite_pertes_cents), limite_periode: r.limite_periode } : REGLAGES_DEFAUT);
      setErreurSync(null);
      setDerniere(new Date());
    } catch (err) {
      setErreurChargement(expliquer(err).replace("Échec de l'enregistrement", "Impossible de charger vos données"));
    } finally {
      setChargement(false);
    }
  }, [supabase]);

  useEffect(() => {
    recharger();
    const { data: sub } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "SIGNED_OUT") window.location.href = "/connexion";
    });
    const on = () => setEnLigne(true);
    const off = () => setEnLigne(false);
    setEnLigne(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [recharger, supabase]);

  /** Exécute une écriture : l'écran n'est mis à jour qu'après confirmation de la base. */
  const ecrire = useCallback(
    async <T,>(action: () => Promise<{ data: T | null; error: unknown }>, succes: string): Promise<T | null> => {
      setEnCours((n) => n + 1);
      try {
        const { data, error } = await action();
        if (error) throw error;
        if (data === null || (Array.isArray(data) && data.length === 0)) throw new Error("La base n'a pas confirmé l'enregistrement.");
        setErreurSync(null);
        setDerniere(new Date());
        toast(succes);
        return data;
      } catch (err) {
        const m = expliquer(err);
        setErreurSync(m);
        toast(m, "erreur");
        return null;
      } finally {
        setEnCours((n) => n - 1);
      }
    },
    [toast],
  );

  const ajouter = useCallback(
    async (o: NouvelleOperation, idFormulaire?: string) => {
      // Identifiant créé à l'ouverture du formulaire + upsert : un double envoi ne crée jamais de doublon.
      const id = idFormulaire ?? nouvelId();
      const row = await ecrire(
        async () => supabase.from("jeux_operations").upsert({ id, ...o }, { onConflict: "id", ignoreDuplicates: false }).select(COLONNES).single(),
        o.type === "gain" ? "Gain enregistré" : "Perte enregistrée",
      );
      if (!row) return false;
      const saved = { ...(row as Operation), montant_cents: Number((row as Operation).montant_cents) };
      setOperations((list) => [saved, ...list.filter((x) => x.id !== saved.id)]);
      return true;
    },
    [ecrire, supabase],
  );

  const modifier = useCallback(
    async (id: string, o: NouvelleOperation) => {
      const row = await ecrire(async () => supabase.from("jeux_operations").update(o).eq("id", id).select(COLONNES).single(), "Opération modifiée");
      if (!row) return false;
      const saved = { ...(row as Operation), montant_cents: Number((row as Operation).montant_cents) };
      setOperations((list) => list.map((x) => (x.id === id ? saved : x)));
      return true;
    },
    [ecrire, supabase],
  );

  const supprimer = useCallback(
    async (id: string) => {
      const rows = await ecrire(async () => supabase.from("jeux_operations").delete().eq("id", id).select("id"), "Opération supprimée");
      if (!rows) return false;
      setOperations((list) => list.filter((x) => x.id !== id));
      return true;
    },
    [ecrire, supabase],
  );

  const enregistrerReglages = useCallback(
    async (r: Reglages) => {
      const row = await ecrire(
        async () => supabase.from("jeux_reglages").upsert({ user_id: user?.id, ...r }, { onConflict: "user_id" }).select("limite_pertes_cents, limite_periode").single(),
        "Réglages enregistrés",
      );
      if (!row) return false;
      setReglages(r);
      return true;
    },
    [ecrire, supabase, user],
  );

  const deconnexion = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/connexion";
  }, [supabase]);

  const sync = useMemo(() => {
    let state: SyncState = "enregistre";
    if (chargement) state = "chargement";
    else if (!enLigne) state = "hors-ligne";
    else if (enCours > 0) state = "enregistrement";
    else if (erreurSync || erreurChargement) state = "erreur";
    return { state, message: erreurSync ?? erreurChargement, derniere };
  }, [chargement, enLigne, enCours, erreurSync, erreurChargement, derniere]);

  const value: StoreValue = {
    user, operations, reglages, chargement, erreurChargement, sync, periode, setPeriode,
    ajouter, modifier, supprimer, enregistrerReglages, recharger, toasts, fermerToast, deconnexion,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
