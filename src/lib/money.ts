// Gestion des montants en centimes entiers : aucun calcul en virgule flottante
// n'est conservé, ce qui évite les erreurs du type 0,1 + 0,2 = 0,30000000000000004.

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, signed: boolean) {
  const key = `${currency}-${signed}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay: signed ? "exceptZero" : "auto",
    });
    formatters.set(key, f);
  }
  return f;
}

/** Formate des centimes au format français : 125050 → « 1 250,50 € ». */
export function formatMoney(cents: number, currency = "EUR", opts: { signed?: boolean } = {}): string {
  // Intl utilise des espaces insécables fines ; on les normalise en espace insécable simple.
  return formatter(currency, !!opts.signed)
    .format(cents / 100)
    .replace(/ /g, " ");
}

/** Convertit une saisie utilisateur (« 1 250,50 », « 12.5 », « -3,2 € ») en centimes. null si invalide. */
export function parseMoney(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return Math.round(input * 100);
  }
  let s = input.trim().replace(/[€\s  ]/g, "").replace(/EUR$/i, "");
  if (!s) return null;
  let negative = false;
  if (s.startsWith("-") || s.startsWith("−")) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  // Détermine le séparateur décimal : le dernier « , » ou « . » suivi de 1 ou 2 chiffres.
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const decIdx = Math.max(lastComma, lastDot);
  let intPart = s;
  let decPart = "";
  if (decIdx >= 0) {
    const after = s.slice(decIdx + 1);
    if (after.length >= 1 && after.length <= 2) {
      intPart = s.slice(0, decIdx);
      decPart = after;
    } else if (after.length === 3 && lastComma >= 0 !== lastDot >= 0) {
      // « 1.250 » ou « 1,250 » : séparateur de milliers
      intPart = s;
    } else {
      return null;
    }
  }
  if (decPart && intPart.includes(s.charAt(decIdx))) return null; // « 1,2,3 »
  const groups = intPart.split(/[.,']/);
  if (groups.length > 1 && groups.slice(1).some((g) => g.length !== 3)) return null;
  intPart = groups.join("");
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(decPart)) return null;
  if (!intPart && !decPart) return null;
  const cents = Number(intPart || "0") * 100 + Number(decPart.padEnd(2, "0") || "0");
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

/** Valeur à afficher dans un champ de saisie : 125050 → « 1250,50 ». */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const neg = cents < 0;
  const abs = Math.abs(cents);
  return `${neg ? "-" : ""}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

/** Somme sûre d'une liste de centimes. */
export function sum(values: number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/** Pourcentage (nombre décimal) ; null si le dénominateur n'est pas positif. */
export function percent(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return (part / whole) * 100;
}

export function formatPercent(p: number | null, digits = 0): string {
  if (p === null || !Number.isFinite(p)) return "—";
  return `${p.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;
}

/** Division en centimes arrondie à l'entier supérieur (utile pour « à épargner par mois »). */
export function ceilDiv(cents: number, n: number): number {
  if (n <= 0) return cents;
  return Math.ceil(cents / n);
}
