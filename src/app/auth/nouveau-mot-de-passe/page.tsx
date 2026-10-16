"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function NewPasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("Au moins 8 caractères.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else window.location.href = "/";
  };
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="panneau panneau-or w-full max-w-sm space-y-4">
        <h1 className="titre text-xl font-semibold">Nouveau mot de passe</h1>
        <input type="password" className="champ" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Nouveau mot de passe" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn btn-or w-full" disabled={busy}>Enregistrer</button>
      </form>
    </div>
  );
}
