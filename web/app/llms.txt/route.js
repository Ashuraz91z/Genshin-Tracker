import { plans } from '../../lib/plans.mjs';
// llms.txt: a plain summary for AI answer engines (https://llmstxt.org).
const month=plans.find(plan=>plan.id==='month').price,year=plans.find(plan=>plan.id==='year').price;
const body=`# Genshin Tracker

> Carnet en ligne, en français, pour suivre son compte Genshin Impact : personnages, armes, artéfacts, matériaux, équipes et conseils de progression. Service de Lux Audere, code libre sous AGPL-3.0. Projet indépendant, non affilié à HoYoverse.

## Fonctions
- Personnages : niveaux, talents, constellations et équipement.
- Inventaire : armes, artéfacts et matériaux, filtrables et corrigibles à la main.
- Équipes : composition et estimation des dégâts d'une rotation (moteur gcsim), avec les meilleurs artéfacts de l'inventaire.
- Farm : matériaux à farmer aujourd'hui selon un objectif (histoire, Abysse, Théâtre), avec rareté, source et temps de résine estimé.
- Import : Kamera FR, scanner Windows gratuit, lit les menus du jeu par captures d'écran et synchronise le carnet. Ne demande jamais les identifiants HoYoverse.
- Export des données au format GOOD à tout moment.

## Tarifs
- Essai gratuit de 14 jours, sans carte bancaire.
- Puis ${month} par mois (sans engagement) ou ${year} par an.

## Liens
- [Accueil](https://genshin-tracker.com/)
- [Aide et questions fréquentes](https://genshin-tracker.com/aide)
- [Conditions d'utilisation](https://genshin-tracker.com/conditions-utilisation)
- [Confidentialité](https://genshin-tracker.com/confidentialite)
- [Code source](https://github.com/Ashuraz91z/Genshin-Tracker)
`;
export function GET(){return new Response(body,{headers:{'Content-Type':'text/plain; charset=utf-8'}});}
