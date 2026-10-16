"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "reset";

function translate(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return "E-mail ou mot de passe incorrect.";
  if (/Email not confirmed/i.test(msg)) return "Confirmez d'abord votre adresse e-mail grâce au lien reçu.";
  if (/already registered|already exists/i.test(msg)) return "Un compte existe déjà avec cette adresse.";
  if (/Password should be/i.test(msg)) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (/rate limit/i.test(msg)) return "Trop de tentatives. Patientez quelques minutes.";
  if (/Failed to fetch/i.test(msg)) return "Connexion au serveur impossible. Vérifiez votre connexion internet.";
  return msg;
}

function LoginForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("erreur") ? "Le lien est invalide ou a expiré." : null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Adresse e-mail invalide.");
    if (mode !== "reset" && password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (mode === "signup" && password !== password2) return setError("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    const supabase = supabaseBrowser();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/";
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (data.session) {
          window.location.href = "/";
          return;
        }
        setInfo("Compte créé. Un e-mail de confirmation vous a été envoyé : cliquez sur le lien pour activer votre compte.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/nouveau-mot-de-passe`,
        });
        if (error) throw error;
        setInfo("Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé.");
      }
    } catch (err) {
      setError(translate((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/roulette.svg" alt="" className="h-20 w-20 drop-shadow-[0_0_24px_rgba(212,175,55,0.5)]" />
          <h1 className="titre text-4xl font-bold tracking-wide">Mise &amp; Bilan</h1>
          <p className="text-xs tracking-[0.3em] text-white/55 uppercase">Suivi casino · paris sportifs</p>
        </div>
        <div className="panneau panneau-or">
          {mode !== "reset" && (
            <div className="mb-5 grid grid-cols-2 rounded-xl bg-black/40 p-1">
              {(["login", "signup"] as Mode[]).map((m) => (
                <button key={m} type="button" onClick={() => { setMode(m); setError(null); }} className={`rounded-lg py-2 text-sm font-medium transition ${mode === m ? "bg-or/20 text-or-clair" : "text-white/55 hover:text-white"}`}>
                  {m === "login" ? "Connexion" : "Inscription"}
                </button>
              ))}
            </div>
          )}
          {mode === "reset" && <h2 className="titre mb-4 text-lg font-semibold">Mot de passe oublié</h2>}
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label className="etiquette" htmlFor="email">Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute top-3 left-3 h-4 w-4 text-white/40" />
                <input id="email" type="email" autoComplete="email" className="champ pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            {mode !== "reset" && (
              <div>
                <label className="etiquette" htmlFor="password">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute top-3 left-3 h-4 w-4 text-white/40" />
                  <input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} className="champ pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                </div>
              </div>
            )}
            {mode === "signup" && (
              <div>
                <label className="etiquette" htmlFor="password2">Confirmer le mot de passe</label>
                <input id="password2" type="password" autoComplete="new-password" className="champ" value={password2} onChange={(e) => setPassword2(e.target.value)} required />
              </div>
            )}
            {error && <p className="rounded-xl border border-red-500/50 bg-red-950/70 px-3 py-2 text-sm text-red-200" role="alert">{error}</p>}
            {info && <p className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{info}</p>}
            <button type="submit" className="btn btn-or w-full py-2.5" disabled={busy}>
              {busy ? "Patientez…" : mode === "login" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
            </button>
          </form>
          <div className="mt-4 text-center text-sm">
            {mode === "reset" ? (
              <button className="text-or hover:underline" onClick={() => setMode("login")}>Retour à la connexion</button>
            ) : (
              <button className="text-or hover:underline" onClick={() => setMode("reset")}>Mot de passe oublié ?</button>
            )}
          </div>
        </div>
        <p className="mt-5 text-center text-xs leading-relaxed text-white/45">Vos données sont stockées dans une base sécurisée et visibles uniquement depuis votre compte.<br />Jouer comporte des risques. Joueurs Info Service : 09 74 75 13 13.</p>
      </div>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
