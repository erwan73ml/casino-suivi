"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, CheckCircle2, CloudOff, History, LayoutDashboard, Loader2, LogOut, Minus, Plus, Settings, TriangleAlert } from "lucide-react";
import { useStore } from "./store";
import { useFormulaire } from "./formulaire";
import { cx, Toasts } from "./ui";

const NAV = [
  { href: "/", label: "Tableau de bord", court: "Accueil", icon: LayoutDashboard },
  { href: "/statistiques", label: "Statistiques", court: "Stats", icon: BarChart3 },
  { href: "/calendrier", label: "Calendrier", court: "Calendrier", icon: CalendarDays },
  { href: "/historique", label: "Historique", court: "Historique", icon: History },
  { href: "/reglages", label: "Réglages", court: "Réglages", icon: Settings },
];

export function IndicateurSauvegarde() {
  const { sync, recharger } = useStore();
  const v = {
    chargement: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: "Chargement…", cls: "text-white/60 border-white/15" },
    enregistrement: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: "Enregistrement…", cls: "text-or-clair border-or/40" },
    enregistre: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, text: "Données sauvegardées", cls: "text-emerald-300 border-emerald-500/40" },
    erreur: { icon: <TriangleAlert className="h-3.5 w-3.5" />, text: "Erreur de sauvegarde", cls: "text-red-300 border-red-500/60 bg-red-950/60" },
    "hors-ligne": { icon: <CloudOff className="h-3.5 w-3.5" />, text: "Hors ligne", cls: "text-amber-300 border-amber-500/50" },
  }[sync.state];
  return (
    <button type="button" onClick={() => sync.state === "erreur" && recharger()} data-testid="sync-state" data-state={sync.state} aria-live="polite"
      title={sync.message ?? (sync.derniere ? `Dernière synchronisation : ${sync.derniere.toLocaleTimeString("fr-FR")}` : undefined)}
      className={cx("pastille border bg-black/40 py-1", v.cls)}>
      {v.icon}<span className="hidden whitespace-nowrap sm:inline lg:hidden xl:inline">{v.text}</span>
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user, deconnexion, chargement, erreurChargement, sync, recharger } = useStore();
  const ouvrir = useFormulaire();
  const pret = !chargement && !erreurChargement;
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-or/20 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/roulette.svg" alt="" className="h-9 w-9 drop-shadow-[0_0_10px_rgba(212,175,55,0.45)]" />
            <span className="hidden leading-tight sm:block">
              <span className="titre block text-lg font-bold tracking-wide">Mise &amp; Bilan</span>
              <span className="block text-[10px] tracking-[0.25em] text-white/50 uppercase">Casino · Paris sportifs</span>
            </span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV.map(({ href, label, court, icon: Icon }) => {
              const actif = href === "/" ? path === "/" : path.startsWith(href);
              return (
                <Link key={href} href={href} className={cx("flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition", actif ? "bg-or/15 text-or-clair" : "text-white/65 hover:bg-white/5 hover:text-white")}>
                  <Icon className="h-4 w-4" /> <span className="xl:hidden">{court}</span><span className="hidden xl:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <IndicateurSauvegarde />
            <button className="btn btn-gain btn-sm" disabled={!pret} onClick={() => ouvrir({ type: "gain" })}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Gain</span></button>
            <button className="btn btn-perte btn-sm" disabled={!pret} onClick={() => ouvrir({ type: "perte" })}><Minus className="h-4 w-4" /><span className="hidden sm:inline">Perte</span></button>
            <button className="btn btn-ghost btn-sm" onClick={deconnexion} title={user?.email ? `Se déconnecter (${user.email})` : "Se déconnecter"} aria-label="Se déconnecter"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      {sync.state === "erreur" && sync.message && (
        <div role="alert" className="mx-auto mt-4 flex max-w-7xl items-start gap-3 px-4 sm:px-6" data-testid="erreur-sauvegarde">
          <div className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-red-500/60 bg-red-950/80 px-4 py-3 text-sm text-red-100">
            <TriangleAlert className="h-5 w-5 shrink-0 text-red-400" />
            <span className="flex-1">{sync.message}</span>
            <button className="btn btn-sm" onClick={recharger}>Réessayer</button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:pb-12">
        {chargement ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-white/60"><Loader2 className="h-8 w-8 animate-spin text-or" /> Chargement de vos données…</div>
        ) : erreurChargement ? (
          <div className="panneau mx-auto max-w-lg text-center">
            <TriangleAlert className="mx-auto mb-3 h-8 w-8 text-red-400" />
            <p className="mb-4">{erreurChargement}</p>
            <button className="btn btn-or" onClick={recharger}>Réessayer</button>
          </div>
        ) : (
          children
        )}
        <footer className="mt-12 border-t border-white/10 pt-5 text-center text-xs leading-relaxed text-white/45">
          Outil de suivi financier personnel. Jouer comporte des risques : endettement, isolement, dépendance.
          Pour être aidé, appelez le <a href="tel:0974751313" className="text-or/80 underline-offset-2 hover:underline">09 74 75 13 13</a> (Joueurs Info Service, appel non surtaxé).
        </footer>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-or/20 bg-black/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Navigation principale">
        {NAV.map(({ href, court, icon: Icon }) => {
          const actif = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href} className={cx("flex flex-col items-center gap-0.5 py-2 text-[10px]", actif ? "text-or-clair" : "text-white/55")}>
              <Icon className="h-5 w-5" /> {court}
            </Link>
          );
        })}
      </nav>
      <Toasts />
    </div>
  );
}
