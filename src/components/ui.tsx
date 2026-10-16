"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { signe } from "@/lib/calc";
import { useStore } from "./store";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/** Montant coloré : vert si positif, rouge si négatif, neutre si nul. */
export function Montant({ cents, signed = false, className }: { cents: number; signed?: boolean; className?: string }) {
  const s = signe(cents);
  return <span className={cx("chiffres", s === "positif" ? "pos" : s === "negatif" ? "neg" : "nul", className)}>{formatMoney(cents, "EUR", { signed })}</span>;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => ref.current?.querySelector<HTMLElement>("[data-autofocus], input, select, button")?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cx("panneau panneau-or apparait max-h-[92vh] w-full overflow-y-auto rounded-b-none sm:rounded-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="titre text-xl font-semibold">{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fermer"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirmation({ open, onClose, onConfirm, title, message, busy }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: React.ReactNode; busy?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="mb-5 text-sm text-white/80">{message}</div>
      <div className="flex justify-end gap-2">
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={busy} data-autofocus>{busy ? "Suppression…" : "Supprimer"}</button>
      </div>
    </Modal>
  );
}

export function Toasts() {
  const { toasts, fermerToast } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} role={t.kind === "erreur" ? "alert" : "status"} className={cx("apparait pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border px-4 py-2.5 text-sm shadow-xl backdrop-blur", t.kind === "erreur" ? "border-red-500/60 bg-red-950/90 text-red-100" : "border-or/40 bg-[#111114]/95 text-[#f4efe1]")}>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => fermerToast(t.id)} aria-label="Fermer" className="opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

export function Vide({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/50">{children}</div>;
}
