"use client";

import { useId } from "react";
import { Area, AreaChart, Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";
import { formatDate, formatMonth } from "@/lib/dates";
import type { PointCumul, PointMois, Totaux } from "@/lib/calc";
import type { Categorie } from "@/lib/types";
import { CATEGORIE_LABELS } from "@/lib/types";
import { Vide } from "./ui";

const VERT = "#22c55e";
const ROUGE = "#ef4444";
const OR = "#d4af37";
const AXE = { fill: "rgba(244,239,225,0.55)", fontSize: 11 };
const GRILLE = "rgba(255,255,255,0.07)";

/** Graduation compacte : 1250 € → « 1,3 k€ ». */
function court(cents: number) {
  const e = cents / 100;
  if (Math.abs(e) >= 1000) return `${(e / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k€`;
  return `${e.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
}

type Ligne = { name?: string | number; value?: number | string; color?: string; dataKey?: string | number; payload?: Record<string, unknown> };
function Bulle({ active, payload, label, titre }: { active?: boolean; payload?: Ligne[]; label?: string | number; titre?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-or/40 bg-[#0d0d10]/95 px-3 py-2 text-xs shadow-xl">
      {label !== undefined && <div className="mb-1 font-semibold text-or-clair">{titre ? titre(String(label)) : label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-white/70"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
          <span className="chiffres font-semibold">{formatMoney(Number(p.value), "EUR", { signed: p.dataKey === "net" || p.dataKey === "cumul" })}</span>
        </div>
      ))}
    </div>
  );
}

/** Graphique 1 : gains et pertes de chaque mois, avec le bilan mensuel (point vert ou rouge). */
export function GraphiqueMensuel({ data }: { data: PointMois[] }) {
  if (!data.some((d) => d.nbGains + d.nbPertes > 0)) return <Vide>Aucune opération sur cette période.</Vide>;
  return (
    <div className="h-72 sm:h-80" data-testid="graph-mensuel">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRILLE} vertical={false} />
          <XAxis dataKey="mois" tickFormatter={(m) => formatMonth(m, true)} tick={AXE} axisLine={false} tickLine={false} minTickGap={8} />
          <YAxis tickFormatter={court} tick={AXE} axisLine={false} tickLine={false} width={62} />
          <Tooltip content={<Bulle titre={(m) => formatMonth(m)} />} cursor={{ fill: "rgba(212,175,55,0.08)" }} />
          <Legend wrapperStyle={{ fontSize: 12, color: "rgba(244,239,225,0.75)" }} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" />
          <Bar dataKey="gains" name="Gains" fill={VERT} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="pertes" name="Pertes" fill={ROUGE} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Line
            dataKey="net" name="Bilan du mois" stroke={OR} strokeWidth={2} isAnimationActive={false}
            dot={(p: { cx?: number; cy?: number; payload?: PointMois; index?: number }) => (
              <circle key={p.index} cx={p.cx} cy={p.cy} r={5} stroke={OR} strokeWidth={1.5} fill={(p.payload?.net ?? 0) > 0 ? VERT : (p.payload?.net ?? 0) < 0 ? ROUGE : "#a8a29e"} />
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Graphique 2 : répartition gains / pertes en anneau, bilan au centre. */
export function GraphiqueAnneau({ t }: { t: Totaux }) {
  if (t.gains + t.pertes === 0) return <Vide>Aucune opération sur cette période.</Vide>;
  const data = [
    { name: "Gains", value: t.gains, color: VERT },
    { name: "Pertes", value: t.pertes, color: ROUGE },
  ];
  const total = t.gains + t.pertes;
  return (
    <div className="relative h-72 sm:h-80" data-testid="graph-anneau">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="86%" paddingAngle={2} stroke="#0b0b0d" strokeWidth={3} startAngle={90} endAngle={-270}>
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip content={<Bulle />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] tracking-[0.2em] text-white/50 uppercase">Bilan net</span>
        <span className={`chiffres font-display text-xl font-bold sm:text-2xl ${t.net > 0 ? "pos" : t.net < 0 ? "neg" : "nul"}`}>{formatMoney(t.net, "EUR", { signed: true })}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-5 text-xs">
        {data.map((d) => (
          <span key={d.name} className="flex items-center gap-1.5 text-white/75"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.name} · {Math.round((d.value / total) * 100)} %</span>
        ))}
      </div>
    </div>
  );
}

/** Graphique 3 : bilan cumulé, vert au-dessus de zéro, rouge en dessous. */
export function GraphiqueCumul({ data }: { data: PointCumul[] }) {
  const id = useId().replace(/:/g, "");
  const idTrait = `trait-${id}`;
  const idRemplissage = `remplissage-${id}`;
  if (!data.length) return <Vide>Aucune opération sur cette période.</Vide>;
  const points = data.length === 1 ? [{ ...data[0] }, { ...data[0] }] : data;
  const max = Math.max(...points.map((d) => d.cumul), 0);
  const min = Math.min(...points.map((d) => d.cumul), 0);
  const zero = max === min ? 0.5 : max / (max - min);
  // Une ligne parfaitement plate n'a pas de hauteur : le dégradé ne s'afficherait pas, on prend une couleur unie.
  const valeurs = points.map((d) => d.cumul);
  const plate = Math.max(...valeurs) === Math.min(...valeurs);
  const couleurPlate = valeurs[0] > 0 ? VERT : valeurs[0] < 0 ? ROUGE : "#a8a29e";
  return (
    <div className="relative h-72 sm:h-80" data-testid="graph-cumul">
      {/* Dégradés déclarés à part : Recharts 3 n'affiche pas les <defs> placés dans le graphique. */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <linearGradient id={idTrait} x1="0" y1="0" x2="0" y2="1">
          <stop offset={zero} stopColor={VERT} />
          <stop offset={zero} stopColor={ROUGE} />
        </linearGradient>
        <linearGradient id={idRemplissage} x1="0" y1="0" x2="0" y2="1">
          <stop offset={0} stopColor={VERT} stopOpacity={0.35} />
          <stop offset={zero} stopColor={VERT} stopOpacity={0.04} />
          <stop offset={zero} stopColor={ROUGE} stopOpacity={0.04} />
          <stop offset={1} stopColor={ROUGE} stopOpacity={0.35} />
        </linearGradient>
      </defs>
      </svg>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRILLE} vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d) => formatDate(d).slice(0, 5)} tick={AXE} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tickFormatter={court} tick={AXE} axisLine={false} tickLine={false} width={62} />
          <Tooltip content={<Bulle titre={(d) => formatDate(d, "long")} />} cursor={{ stroke: OR, strokeOpacity: 0.4 }} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="cumul" name="Bilan cumulé" stroke={plate ? couleurPlate : `url(#${idTrait})`} strokeWidth={2.5} fill={plate ? couleurPlate : `url(#${idRemplissage})`} fillOpacity={plate ? 0.12 : 1} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Graphique 4 : casino contre paris sportifs. */
export function GraphiqueCategories({ data }: { data: Record<Categorie, Totaux> }) {
  const lignes = (Object.keys(data) as Categorie[]).map((c) => ({ categorie: CATEGORIE_LABELS[c], ...data[c] }));
  if (!lignes.some((l) => l.nbGains + l.nbPertes > 0)) return <Vide>Aucune opération sur cette période.</Vide>;
  return (
    <div className="h-72 sm:h-80" data-testid="graph-categories">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={lignes} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRILLE} vertical={false} />
          <XAxis dataKey="categorie" tick={{ ...AXE, fontSize: 13 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={court} tick={AXE} axisLine={false} tickLine={false} width={62} />
          <Tooltip content={<Bulle />} cursor={{ fill: "rgba(212,175,55,0.08)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" />
          <Bar dataKey="gains" name="Gains" fill={VERT} radius={[4, 4, 0, 0]} maxBarSize={56} />
          <Bar dataKey="pertes" name="Pertes" fill={ROUGE} radius={[4, 4, 0, 0]} maxBarSize={56} />
          <Bar dataKey="net" name="Bilan net" fill={OR} radius={[4, 4, 0, 0]} maxBarSize={56}>
            {lignes.map((l) => <Cell key={l.categorie} fill={l.net >= 0 ? OR : "#8a6d12"} />)}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
