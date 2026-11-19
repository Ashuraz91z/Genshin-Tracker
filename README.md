<p align="center">
  <img src="web/public/assets/mark.svg" width="72" height="72" alt="Logo Genshin Tracker" />
</p>

<h1 align="center">Genshin Tracker</h1>

<p align="center">
  Votre carnet de progression pour Genshin Impact.<br />
  Retrouvez votre collection, préparez vos équipes et choisissez vos prochaines améliorations.
</p>

<p align="center">
  <a href="https://genshin-tracker.com">Ouvrir le site</a> ·
  <a href="https://github.com/Ashuraz91z/Genshin-Tracker/releases">Téléchargements</a> ·
  <a href="docs/SCANNER.md">Guide du scanner</a> ·
  <a href="docs/DEVELOPPEMENT.md">Développer et héberger</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/site-AGPL--3.0-6366f1?style=flat-square" alt="Licence du site : AGPL-3.0" /></a>
  <a href="InventoryKamera-FR/LICENSE"><img src="https://img.shields.io/badge/scanner-MIT-0f9d7a?style=flat-square" alt="Licence du scanner : MIT" /></a>
  <img src="https://img.shields.io/badge/scanner-Windows-334155?style=flat-square" alt="Scanner pour Windows" />
</p>

---

## Un compte, une vue d’ensemble

Genshin Tracker associe un site web et **Kamera FR**, un scanner Windows adapté au jeu en français. Importez les données relevées dans les menus du jeu, puis retrouvez-les dans un carnet consultable depuis votre navigateur.

| Dans le carnet | Ce que vous pouvez faire |
| --- | --- |
| **Personnages** | Consulter niveaux, constellations, talents et équipements identifiés. |
| **Inventaire** | Filtrer les armes, artéfacts et matériaux importés, puis corriger les artéfacts. |
| **Progression** | Repérer les ressources manquantes et préparer vos améliorations et activités de farm. |
| **Équipes** | Composer des équipes, préparer une rotation et lancer les simulations prises en charge par gcsim. |
| **Collection** | Comparer le catalogue du jeu à votre inventaire pour voir ce que vous possédez et ce qui manque. |
| **Synchronisation** | Relier votre PC et consulter les résultats et erreurs de chaque relevé. |

Le projet vise un suivi global de progression. Les quêtes, succès et données d’exploration ne sont pas suivis dans cette version.

## Commencer

### Avec Kamera FR sur Windows

1. Téléchargez le paquet **Kamera FR** dans les [Releases](https://github.com/Ashuraz91z/Genshin-Tracker/releases) et extrayez le dossier complet.
2. Créez votre compte sur le [site](https://genshin-tracker.com), puis connectez le scanner depuis son onglet **Connexion**.
3. Lancez un scan avec le jeu en français. Vos relevés sont conservés sur le PC et synchronisés avec votre carnet.

Prérequis Windows, réglages du jeu et dépannage : **[guide du scanner](docs/SCANNER.md)**.

### Avec un fichier d’inventaire existant

Ouvrez le site et choisissez **Importer sans compte**. Sélectionnez le fichier `.json` créé par Kamera FR ou un autre scanner compatible. Ce format d’échange, appelé **GOOD**, contient les personnages, armes, artéfacts et matériaux relevés.

En mode visiteur, le contenu importé reste dans la session de votre navigateur et n’est pas envoyé au serveur. Vous pouvez l’effacer depuis votre profil. Un compte permet de conserver votre carnet en ligne et de recevoir les scans du PC.

## Héberger votre propre carnet

Vous pouvez héberger votre propre instance. Le code est libre ; l’hébergement géré par Lux Audere est destiné à être payant.

Pour lancer le site sur votre machine, avec **Node.js 24+** et npm :

```sh
git clone https://github.com/Ashuraz91z/Genshin-Tracker.git
cd Genshin-Tracker/web
npm ci
npm run dev
```

Ouvrez **http://127.0.0.1:8788**. Un clone privé nécessite un accès au dépôt. Consultez le [guide développeur](docs/DEVELOPPEMENT.md) pour la production, les variables d’environnement et les tests.

## Documentation et contributions

- [Utiliser et dépanner le scanner Windows](docs/SCANNER.md)
- [Développer, tester et héberger le projet](docs/DEVELOPPEMENT.md)
- [Déploiement et stockage du site](web/README.md)
- [Provenance des composants et des données](UPSTREAM.md)
- [Notes techniques historiques](docs/HISTORIQUE.md)

Pour signaler un problème, ouvrez une [issue](https://github.com/Ashuraz91z/Genshin-Tracker/issues) avec les étapes, la version et le résultat attendu. Retirez les données personnelles des captures et journaux. Pour un problème de sécurité ou d’accès à un compte, écrivez à **contact@genshin-tracker.com** sans publier de mot de passe ni de clé d’appareil.

## Où va l’argent

Genshin Tracker n’est pas fait pour gagner de l’argent. L’objectif est d’**équilibrer les comptes** : l’abonnement (1,99 € par mois ou 14,99 € par an, après 14 jours d’essai gratuit) et les dons servent à payer ce que le site coûte, et tout le reste est **réinvesti dans le projet**.

Ce que l’argent paie aujourd’hui :

- l’hébergement du site et le nom de domaine ;
- l’envoi des e-mails du compte (confirmation, mot de passe oublié) ;
- les frais de paiement prélevés par Stripe.

Le code reste libre (AGPL-3.0) : chacun peut l’héberger gratuitement chez soi.

## Feuille de route

Les prochaines étapes, financées au fur et à mesure par les abonnements et les dons :

| Palier | Ce qui sera fait |
| --- | --- |
| **100 € récoltés** | Compte développeur Apple (environ 99 € par an) pour sortir une application iPhone. |
| Paliers suivants | Annoncés ici dès qu’ils seront fixés. |

En continu, sans palier :

- mise à jour des données du jeu et du simulateur à chaque nouvelle version de Genshin ;
- lecture automatique de l’UID Genshin par le scanner Kamera FR ;
- lettre d’information pour les comptes qui l’ont acceptée.

## Limites à connaître

Un scan OCR peut manquer des objets ou mal lire leurs caractéristiques : vérifiez le rapport et les quantités en jeu. Les simulations dépendent des équipements, de la rotation et des personnages pris en charge par le moteur. Elles ne garantissent pas les dégâts obtenus en jeu.

Le scanner automatise la navigation dans les menus. Le projet ne dispose pas d’une approbation de HoYoverse et ne garantit pas l’absence de sanction. Les tests automatisés ne remplacent pas un essai réel dans Genshin sur votre configuration Windows.

## Licences et crédits

| Composant | Licence |
| --- | --- |
| Site web et outils propres au projet | [GNU AGPL-3.0 uniquement](LICENSE) |
| Kamera FR et ses adaptations d’Inventory Kamera | [MIT](InventoryKamera-FR/LICENSE) |
| Moteur de simulation gcsim 2.50.0 (contributeurs de gcsim, non modifié) | [AGPL-3.0](web/public/simulator/LICENSE-gcsim.txt), code antérieur [MIT](web/public/simulator/LICENSE-gcsim-MIT.txt) |
| Référentiel genshin-db (theBowja et contributeurs) | [MIT](licenses/genshin-db-MIT.txt) |
| Autres composants, référentiels et modèles OCR | [Notices tierces](licenses/) et [provenance](UPSTREAM.md) |

Merci aux projets [Inventory Kamera](https://github.com/Andrewthe13th/Inventory_Kamera), [genshin-db](https://github.com/theBowja/genshin-db), [Tesseract](https://github.com/tesseract-ocr/tesseract) et [gcsim](https://github.com/genshinsim/gcsim). Les versions et notices utilisées figurent dans le dépôt ; la liste complète des composants et de leurs auteurs est aussi sur le site, dans [Mentions légales › Crédits](https://genshin-tracker.com/mentions-legales#credits).

**Un projet Lux Audere.** Genshin Tracker n’est ni affilié ni approuvé par HoYoverse. Genshin Impact, ses marques et ses illustrations appartiennent à leurs ayants droit ; les licences du code ne modifient pas ces droits.
