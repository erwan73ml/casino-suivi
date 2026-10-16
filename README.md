# Mise & Bilan : suivi des gains et pertes (casino et paris sportifs)

Site personnel pour enregistrer ses gains et pertes nets au casino et aux paris sportifs,
avec tableau de bord, statistiques, calendrier, historique et sauvegarde permanente dans Supabase.

Choix techniques : Next.js 15 + TypeScript + Tailwind, graphiques Recharts, base de données et comptes Supabase,
hébergement Vercel. Le site peut utiliser **le même projet Supabase que « Mon Budget »** : ses tables sont préfixées
`jeux_` et ne touchent pas au budget. On se connecte avec le même e-mail et le même mot de passe.

## 1. Fonctionnalités

- **Tableau de bord** : total des gains, total des pertes, bilan net (vert si positif, rouge si négatif, neutre si nul),
  boutons « Ajouter un gain » et « Ajouter une perte », repères « gagné ce mois-ci », « perdu cette semaine »,
  « bilan depuis le 1er janvier », dernières opérations.
- **Saisie** : date, type, montant net en euros, catégorie (casino ou paris sportifs), commentaire facultatif.
  Modification et suppression (avec confirmation) depuis n'importe quel tableau.
- **Période** commune à toutes les pages : tout, jour, semaine (lundi → dimanche), mois, année, période personnalisée,
  avec flèches précédent / suivant. Totaux, graphiques et historique se recalculent aussitôt.
- **Statistiques** : histogramme mensuel gains / pertes avec le bilan de chaque mois, anneau gains / pertes,
  courbe du bilan cumulé depuis la première opération, comparaison casino contre paris sportifs.
- **Calendrier** : chaque jour montre son bilan (vert ou rouge) ; un clic affiche les opérations de la date.
- **Historique** : tableau trié par date, recherche, filtres type et catégorie, tri par montant, totaux de la sélection,
  export CSV (compatible Excel).
- **Limite personnelle de pertes** (facultative) par semaine, mois ou année : avertissement à 80 %, alerte quand elle est atteinte.
- **Sauvegarde** : chaque opération est enregistrée dans la base dès sa validation. L'indicateur en haut affiche
  « Données sauvegardées », « Enregistrement… », « Hors ligne » ou « Erreur de sauvegarde » avec un message clair.
  L'écran n'est mis à jour qu'après confirmation de la base : rien n'est affiché comme enregistré s'il ne l'est pas.

### Règles de calcul (`src/lib/calc.ts`)

- Montants stockés en **centimes entiers** (aucune erreur d'arrondi), toujours positifs ; le type dit gain ou perte.
- **Bilan net = total des gains nets − total des pertes nettes.**
- Une opération n'est jamais comptée deux fois : chaque saisie reçoit un identifiant unique à l'ouverture du formulaire,
  et l'enregistrement est idempotent (un double clic ou un nouvel essai après une coupure ne crée pas de doublon).
- Les montants saisis sont le bénéfice ou la perte nette, pas la mise.

### Sécurité

Row Level Security active : chaque compte ne lit et ne modifie que ses propres lignes. Les visiteurs non connectés
n'ont aucun accès. Un ami peut créer son propre compte via « Inscription » et ne verra que ses données.

## 2. Installer la base de données

1. Ouvrez votre projet sur https://supabase.com/dashboard (le même que « Mon Budget » convient).
2. Menu de gauche : **SQL Editor**.
3. Collez le contenu de `supabase/migrations/20261016100000_jeux.sql` puis cliquez sur **Run**.
   Le script peut être relancé sans risque.

Nouveau projet Supabase à la place : créez-le, exécutez le même script, puis dans
Authentication → Sign In / Providers → Email, gardez « Confirm email » activé (ou désactivez-le pour aller plus vite).

## 3. Lancer sur son ordinateur

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
cp .env.example .env.local    # puis remplissez les deux valeurs (Supabase → Project Settings → API)
npm run dev                   # http://localhost:3000
```

## 4. Mettre en ligne avec Vercel

1. Créez un dépôt GitHub (par exemple `casino-suivi`) et envoyez-y **tout le contenu du dossier**
   (y compris les dossiers `src`, `public`, `supabase`, `e2e`, `scripts`), sauf `node_modules`, `.next` et `.env.local`.
2. Sur https://vercel.com → **Add New… → Project** → importez le dépôt.
3. Dans **Environment Variables**, ajoutez :
   - `NEXT_PUBLIC_SUPABASE_URL` : l'URL du projet Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` : la clé publique `anon`
   (les mêmes valeurs que pour « Mon Budget » si vous utilisez le même projet)
4. **Deploy**. Notez l'adresse obtenue, par exemple `https://casino-suivi.vercel.app`.
5. Dans Supabase → **Authentication → URL Configuration → Redirect URLs**, ajoutez
   `https://casino-suivi.vercel.app/auth/callback` (votre vraie adresse). Ne changez pas la « Site URL » si elle
   pointe déjà vers « Mon Budget ».

## 5. Tests

```bash
npm test             # 36 tests des calculs, périodes et montants
npm run lint         # vérification TypeScript
npm run test:e2e     # parcours complet dans un vrai navigateur (Playwright installé, site lancé sur BASE_URL,
                     # Supabase avec confirmation d'e-mail désactivée)
```

Le parcours de bout en bout vérifie : inscription, saisies et totaux, couleurs du bilan, double clic sans doublon,
refus des montants invalides, chaque type de période, recherche, filtres, modification, suppression avec confirmation,
export CSV, message d'erreur en cas de coupure réseau puis nouvel essai sans doublon, limite de pertes,
les quatre graphiques, le calendrier, la persistance après rechargement et reconnexion, l'affichage mobile sans
débordement, et l'isolement entre deux comptes.

## 6. Organisation

```
src/lib/          calculs (calc.ts), dates et périodes, montants, types
src/components/   données et sauvegarde (store.tsx), formulaire, graphiques, calendrier, tableaux, décor
src/app/(app)/    pages : tableau de bord, statistiques, calendrier, historique, réglages
src/app/connexion connexion et inscription
supabase/         script SQL des tables et règles de sécurité
public/roulette.svg  roulette d'arrière-plan (régénérable avec node scripts/roulette.mjs)
```

## 7. Jeu responsable

Ce site est un outil de suivi financier : il ne donne aucun conseil de pari et n'incite pas à « se refaire ».
Joueurs Info Service : 09 74 75 13 13 (appel non surtaxé), www.joueurs-info-service.fr.
