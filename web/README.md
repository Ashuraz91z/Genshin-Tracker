# Genshin Tracker — exploitation du site

Ce guide décrit le lancement, le déploiement et le stockage du site. Les sections de mise à jour conservent les détails de migration des versions précédentes.

Copyright (c) 2026 Lux Audere. Code original du site sous AGPL-3.0-only, sans garantie ; voir `../LICENSE` ou `public/licenses/agpl-3.0.txt`. Les composants et ressources tiers conservent leurs propres licences. Code source : https://github.com/Ashuraz91z/Genshin-Tracker (dépôt privé pendant la préparation de publication). Le service hébergé est destiné à être payant ; l’auto-hébergement est autorisé.

**Next.js 16.4.6 / React 19.3.1, App Router, Route Handlers Node.js et SQLite.** Le design bleu nuit/or/menthe est conservé, avec des composants React et de vraies routes `/`, `/characters`, `/inventory` et `/sync`.

## Démarrer

Prérequis : Node.js 24+ et npm.

```sh
cd web
npm ci
npm run dev
```

Ouvrir http://127.0.0.1:8788. Pour la production :

```sh
npm ci
npm run build
npm start
```

Configurer l'origine publique HTTPS et un stockage persistant avant de déployer. La base par défaut reste `web/data/tracker.sqlite`. Aucun compte ni inventaire de démonstration n'est ajouté. Si une base de la version 0.2 existe, **garder son chemin**, avec ses éventuels fichiers WAL/SHM : comptes, sessions, clés de PC et données utilisent le même schéma.

## Application Windows

Kamera FR 0.2 reste compatible : les URL et formats d'API n'ont pas changé. Les PC déjà associés conservent leurs clés si la base est conservée et le domaine ne change pas.

Sur le site : **Relier Kamera**. Dans l'application : **Connexion**, saisir l'adresse HTTPS et le code temporaire. Après chaque export, le relevé GOOD et son rapport sont envoyés automatiquement ; le site actualise les données toutes les 5 secondes lorsqu'il est visible. Les envois hors ligne restent séparés par site/compte ; utiliser **Réessayer l'envoi** ou redémarrer l'app. Un appareil se révoque depuis **Synchronisation → Dissocier**.

Le PC Windows et le Mac n'ont pas le même `localhost`. À distance, utiliser l'adresse HTTPS du serveur. Un import GOOD manuel reste disponible.

## Données et sécurité

- Personnages fusionnés par clé ; quantités de matériaux actualisées ; absences conservées.
- Armes/artéfacts remplacés seulement avec parcours terminé sans erreur et compteur concordant. Sinon, inventaire précédent conservé ; un premier relevé peut être marqué partiel.
- Rejouer un scan ou recevoir un ancien relevé ne fait pas régresser les données récentes.
- Comptes isolés, mots de passe scrypt, cookies HttpOnly/SameSite, contrôle de l'origine des requêtes et clés d'appareils hachées/révocables.
- Politique CSP avec nonce unique par rendu pour les scripts et styles Next.js, sans `unsafe-inline` ni `unsafe-eval` en production.
- Les fichiers SQLite et `.env*` sont exclus de Git, des paquets et du traçage standalone. Le service vise un petit usage personnel : les limites de tentatives d'authentification sont partagées par instance.

L'exhaustivité du compte et la précision OCR restent à vérifier dans le jeu. Captures et GOOD bruts restent dans les exports locaux de Kamera ; le serveur conserve les données structurées et les métadonnées des scans.

## Hostinger / serveur autonome

L'hébergement doit exécuter **Node.js 24+** avec disque persistant, ou Docker. Un hébergement statique/PHP seul ne suffit pas. Aucun serveur Hostinger n'a été modifié.

Le paquet serveur de la release inclut les sources Next et le ZIP Windows attendu par le Dockerfile. Depuis un clone Git seul, télécharger l'asset `GenshinTracker-KameraFR-0.6.0.zip` dans `dist/` avant le build Docker.

Depuis `web/`, avec domaine pointant vers le serveur et ports 80/443 disponibles :

```sh
cp .env.example .env
# Renseigner DOMAIN dans .env.
docker compose up -d --build
```

Le Dockerfile compile Next puis utilise sa sortie **standalone**. Le script de build y copie aussi `public` et `.next/static`. Caddy gère HTTPS ; SQLite reste dans le volume `tracker-data`. Ne pas supprimer ce volume lors d'une mise à jour.

Pour une installation Node sans Docker : dossier de travail `web`, installation `npm ci`, build `npm run build`, démarrage `npm start` (port `PORT`, 3000 par défaut). Variables serveur :

| Variable | Usage |
|---|---|
| `PUBLIC_URL` | Origine publique exacte, par exemple `https://genshin.example.com` |
| `DATABASE_PATH` | Chemin absolu vers le SQLite persistant |
| `DOWNLOAD_PATH` | Chemin absolu vers le ZIP Kamera FR proposé au téléchargement |
| `ADMIN_EMAILS` | E-mails confirmés des administrateurs (panel `/admin`), séparés par des virgules |
| `SUPPORT_EMAIL` | Destinataire des demandes de `/aide` (par défaut `contact@genshin-tracker.com`) |

Le mode `npm start` lance le serveur standalone avec `HOSTNAME` (par défaut `0.0.0.0`, ou la valeur de l’ancien `HOST` si elle est définie) et le port `PORT` (3000 par défaut) ; placer un reverse proxy HTTPS devant et limiter l'accès direct au port. Le mode dev écoute uniquement sur `127.0.0.1`. Le lanceur conserve explicitement le chemin `web/data/tracker.sqlite`, même si le serveur standalone change de dossier de travail. Les chemins `DATABASE_PATH` et `DOWNLOAD_PATH` relatifs sont résolus par rapport à `web/`, comme avant la migration.

Sauvegarder la base après arrêt du service pour une copie cohérente. Protéger le dossier de données et ses sauvegardes.

## Tests et livraison

```sh
npm run build
npm test
```

Les tests couvrent les règles de synchronisation via le même gestionnaire que Next, puis lancent un vrai serveur Next **en production** avec une base temporaire : sessions et clés d'appareil existantes, pages/ressources, nonces CSP, association, refus d'origine et réception d'un scan Kamera.

GitHub Actions construit et teste le site, puis produit les paquets Windows et serveur. Les binaires sont dans Releases. Le test ne lance pas Genshin ni l'interface WinForms et ne remplace pas une vérification visuelle du navigateur.

Sources : [Next Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route), [CSP et nonces](https://nextjs.org/docs/app/guides/content-security-policy), [sortie standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output). Portraits et référentiel : `public/assets/SOURCES.md`. Direction UI/UX Pro Max : `design-system/genshin-tracker/pages/dashboard.md` à la racine du dépôt.

## Consulter sans compte

Sur l’écran d’accueil, **Importer sans compte** ouvre un export GOOD `.json` (16 Mo maximum). La validation et l’affichage s’effectuent dans le navigateur : aucun contenu du fichier n’est envoyé au serveur. La session locale utilise `sessionStorage`, reste disponible après navigation/rechargement et peut être effacée via le profil visiteur. Le navigateur peut restaurer une session fermée selon ses réglages ; utilisez **Effacer la session visiteur** sur un appareil partagé. Un nouvel import remplace la vue locale. Les scans restent non vérifiés ; ce mode ne prouve pas un inventaire complet. L’association Kamera et la synchronisation serveur nécessitent un compte.

## Mise à jour 0.4.0

Kamera FR 0.3.0 peut se connecter avec le pseudo/mot de passe du tracker via `/api/device/login`, puis conserve sa clé de PC. Le mot de passe n’est pas enregistré dans l’application. Les clés déjà associées restent valides ; une reconnexion du même PC avec sa clé existante la réutilise. L’accès aux données côté application emploie `/api/device/account` avec cette clé, révocable depuis le site. Aucun accès aux autres comptes et aucune association avec HoYoverse.

Déployer le serveur avant le compagnon Windows ; sauvegarder et garder le même DATABASE_PATH. Aucun changement de schéma SQLite. Mettre le nouveau ZIP à disposition et actualiser DOWNLOAD_PATH si une valeur personnalisée était définie. Les anciennes applications continuent d’envoyer leurs scans.

Le journal détaille les quantités reçues et la décision pour chaque catégorie. Les rapports du nouveau compagnon contiennent les étapes horodatées. Les anciens rapports restent lisibles. L’import manuel exige un choix explicite pour remplacer un inventaire d’équipements existant ; cette permission n’est jamais acceptée depuis un envoi automatique d’appareil.

## Stockage persistant — 0.4.2

Si DATABASE_PATH est absent et PUBLIC_URL distant défini, la base n’est plus créée dans la sortie Next du déploiement. Sur Hostinger, un chemin contenant `hbuilds` utilise le dossier frère `tracker-data/tracker.sqlite`. Sinon, le stockage est dans `~/.local/share/genshin-tracker/<hôte-public>/tracker.sqlite`. Le mode localhost conserve `data/tracker.sqlite`. Une valeur explicite DATABASE_PATH garde toujours la priorité.

Au démarrage du serveur, si la base persistante n’existe pas, les bases de ce site encore présentes dans les dossiers de builds sont examinées ; la plus récemment utilisée contenant des comptes est copiée avec VACUUM INTO, WAL compris, sans modifier la source. La publication du fichier est atomique. Aucune base persistante existante n’est écrasée. Cela ne récupère pas une base déjà supprimée par l’hébergeur et ne fusionne pas plusieurs comptes historiques. Sauvegarder la base et conserver ce dossier lors des mises à jour.

131 portraits sur 133 entrées du catalogue sont maintenant locaux ; Mitya et Valeriy restent représentés par leurs initiales faute d’image dans le référentiel utilisé. Les URL alternatives HoYoWiki sont employées lorsque les anciens liens de portraits ne fonctionnent plus.

Sur Hostinger, la préparation du paquet après build tente aussi cette sauvegarde avant le basculement du dossier `current/nodejs`. Vérifier le déploiement et l’accès au compte après la première mise à jour. L’import manuel n’actualise pas la date du dernier scan d’un PC : cette date indique uniquement un envoi réellement reçu de cet appareil.

## Catalogue, corrections et équipes — site 0.5

- Une fiche personnage est une page accessible par `/characters/<clé GOOD>`. « Ajouter un artéfact » ouvre le catalogue du jeu ou l’inventaire existant. La statistique principale est déterminée par le type, la rareté et le niveau ; les sous-statistiques sont saisies et validées.
- Les corrections et équipes sont enregistrées dans la table additive `customizations`, isolée par compte. Les scans d’origine restent dans `accounts` ; une correction manuelle est appliquée à la lecture et peut être annulée pour retrouver le dernier scan. Un nouveau scan ne supprime pas ces corrections. Aucune réinitialisation de base nécessaire.
- En visiteur, ces ajouts restent dans la session de l’onglet ; importer un autre GOOD réinitialise la vue locale et ses corrections.
- `/teams` permet de sauvegarder jusqu’à 50 équipes (1 à 4 personnages importés), leurs hypothèses et leur rotation. Les résultats sont recalculés à la demande dans le navigateur et ne sont pas envoyés à un service externe.
- Le moteur WebAssembly gcsim **v2.47.2**, publié sous MIT, est conservé dans `public/simulator/` avec les licences, la provenance et le hash de compilation. Les versions suivantes peuvent avoir une autre licence ; ne pas remplacer le binaire sans vérifier. Préparation reproductible : compiler le tag `v2.47.2` avec Go 1.27.4 (`GOOS=js GOARCH=wasm go build -trimpath -ldflags='-s -w' -o main.wasm ./cmd/wasm`), puis `python3 scripts/prepare_simulator.py <sources-gcsim> <main.wasm> <GOROOT>`.
- Les statistiques principales des artéfacts viennent du référentiel gcsim ; l’adaptateur additionne les pièces GOOD et laisse au moteur les statistiques de base, armes, constellations, talents, sets et interactions.
- Une arme manquante, des pièces/sous-statistiques manquantes, plusieurs candidats pour un emplacement ou un personnage/équipement non pris en charge empêchent une estimation présentée comme complète. Le support du moteur est plus ancien que le catalogue du jeu : 112 entrées de personnages du catalogue peuvent être converties, pas tous les nouveaux personnages.
- Hypothèses : un ennemi immobile sans bouclier, résistance commune modifiable, durée bornée à 5–120 s ; énergie normale ou illimitée explicitement choisie, 20/100/500 itérations. La rotation de base n’est pas optimisée. Le résultat dépend de la rotation, des données du scan et de la version du moteur ; ce n’est pas une promesse de dégâts en jeu.
- La CSP autorise la compilation WASM et les workers locaux, sans autoriser l’évaluation JavaScript générale. Les calculs peuvent être arrêtés ; délai limite de 60 s.
- Vérification : `npm test` et `npm run test:engine` (vrai moteur WASM, 20 itérations sur une fixture GOOD, durée et dégâts contrôlés).
