// Génère public/roulette.svg : une roulette européenne (37 cases) en image vectorielle.
import { writeFileSync } from "node:fs";

const ordre = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const rouges = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const C = 500, R1 = 470, R2 = 400, R3 = 330;
const pt = (r, a) => [C + r * Math.sin(a), C - r * Math.cos(a)].map((v) => v.toFixed(2));
const step = (2 * Math.PI) / ordre.length;

let cases = "", chiffres = "", separations = "";
ordre.forEach((n, i) => {
  const a0 = i * step - step / 2, a1 = a0 + step;
  const [x0, y0] = pt(R1, a0), [x1, y1] = pt(R1, a1), [x2, y2] = pt(R3, a1), [x3, y3] = pt(R3, a0);
  const fill = n === 0 ? "#0f7a3d" : rouges.has(n) ? "#b3121f" : "#121212";
  cases += `<path d="M${x0} ${y0}A${R1} ${R1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${R3} ${R3} 0 0 0 ${x3} ${y3}Z" fill="${fill}"/>`;
  const [sx0, sy0] = pt(R1, a0), [sx1, sy1] = pt(R3, a0);
  separations += `<line x1="${sx0}" y1="${sy0}" x2="${sx1}" y2="${sy1}"/>`;
  const [tx, ty] = pt(435, i * step);
  chiffres += `<text x="${tx}" y="${ty}" transform="rotate(${((i * 360) / ordre.length).toFixed(2)} ${tx} ${ty})">${n}</text>`;
});

let rayons = "";
for (let i = 0; i < 4; i++) {
  const a = (i * Math.PI) / 2 + Math.PI / 4;
  const [x0, y0] = pt(40, a), [x1, y1] = pt(230, a);
  rayons += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"/><circle cx="${x1}" cy="${y1}" r="14"/>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
<defs>
<radialGradient id="bois" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#5a3a1c"/><stop offset="0.7" stop-color="#3a2410"/><stop offset="1" stop-color="#1e1208"/></radialGradient>
<linearGradient id="or" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e27a"/><stop offset="0.5" stop-color="#c9a227"/><stop offset="1" stop-color="#8a6d12"/></linearGradient>
</defs>
<circle cx="${C}" cy="${C}" r="498" fill="#1b120a"/>
<circle cx="${C}" cy="${C}" r="488" fill="none" stroke="url(#or)" stroke-width="16"/>
<g>${cases}</g>
<g stroke="url(#or)" stroke-width="3">${separations}</g>
<circle cx="${C}" cy="${C}" r="${R1}" fill="none" stroke="url(#or)" stroke-width="5"/>
<circle cx="${C}" cy="${C}" r="${R2}" fill="none" stroke="url(#or)" stroke-width="2" opacity=".6"/>
<g fill="#f5f0e1" font-family="Georgia, serif" font-size="30" font-weight="700" text-anchor="middle" dominant-baseline="central">${chiffres}</g>
<circle cx="${C}" cy="${C}" r="${R3}" fill="url(#bois)" stroke="url(#or)" stroke-width="8"/>
<circle cx="${C}" cy="${C}" r="250" fill="none" stroke="url(#or)" stroke-width="2" opacity=".5"/>
<g stroke="url(#or)" stroke-width="16" stroke-linecap="round" fill="url(#or)">${rayons}</g>
<circle cx="${C}" cy="${C}" r="60" fill="url(#or)"/>
<circle cx="${C}" cy="${C}" r="24" fill="#f6e27a"/>
<circle cx="${pt(385, 1.1)[0]}" cy="${pt(385, 1.1)[1]}" r="11" fill="#fafafa"/>
</svg>`;
writeFileSync(new URL("../public/roulette.svg", import.meta.url), svg);
console.log(`roulette.svg : ${svg.length} octets`);
