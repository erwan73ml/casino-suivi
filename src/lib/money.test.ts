import { describe, expect, it } from "vitest";
import { ceilDiv, centsToInput, formatMoney, parseMoney, percent } from "./money";

const nb = (s: string) => s.replace(/ /g, " ");

describe("formatMoney", () => {
  it("formate au format français", () => {
    expect(nb(formatMoney(125050))).toBe("1 250,50 €");
    expect(nb(formatMoney(5))).toBe("0,05 €");
    expect(nb(formatMoney(-1999))).toBe("-19,99 €");
    expect(nb(formatMoney(100000000))).toBe("1 000 000,00 €");
  });
  it("affiche le signe sur demande", () => {
    expect(nb(formatMoney(1000, "EUR", { signed: true }))).toBe("+10,00 €");
  });
});

describe("parseMoney", () => {
  it.each([
    ["1 250,50", 125050],
    ["1250.5", 125050],
    ["1.250,50", 125050],
    ["1,250.50", 125050],
    ["12", 1200],
    ["0,1", 10],
    ["-3,20 €", -320],
    ["1 000", 100000],
    ["1.250", 125000],
    [12.34, 1234],
  ])("%s → %d", (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });
  it.each(["", "abc", "1,2,3,4", "12,345,6", "--5"])("refuse %s", (input) => {
    expect(parseMoney(input)).toBeNull();
  });
  it("ne souffre pas des erreurs de virgule flottante", () => {
    expect((parseMoney("0,10") ?? 0) + (parseMoney("0,20") ?? 0)).toBe(30);
    expect(parseMoney(0.1 + 0.2)).toBe(30);
  });
});

describe("utilitaires", () => {
  it("centsToInput", () => {
    expect(centsToInput(125050)).toBe("1250,50");
    expect(centsToInput(-5)).toBe("-0,05");
  });
  it("percent renvoie null si le total n'est pas positif", () => {
    expect(percent(50, 0)).toBeNull();
    expect(percent(25, 200)).toBe(12.5);
  });
  it("ceilDiv arrondit au centime supérieur", () => {
    expect(ceilDiv(1000, 3)).toBe(334);
  });
});
