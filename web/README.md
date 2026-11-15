# Site Genshin Tracker

Tableau de bord français, application serveur Node.js 24+ sans dépendance npm, stockage SQLite. Le site est préparé pour l'hébergement autonome sur les serveurs de Lucas ; aucune publication distante effectuée sans cible identifiée.

## Démarrer localement

```sh
cd web
npm start
```

Ouvrir http://127.0.0.1:8788 puis créer un compte (pseudo et mot de passe de 12 caractères minimum). Aucun compte HoYoverse requis. La base est créée dans `web/data/tracker.sqlite`, hors Git. Aucun compte ou inventaire de démonstration n'est préchargé.

## Relier l'application

1. Sur le site : **Relier Kamera**, qui affiche l'adresse du site et un code valable 10 minutes.
2. Dans Kamera FR 0.2.0 : **Connexion**, saisir l'adresse et le code, puis **Associer mon compte**.
3. Après chaque export, le GOOD et son rapport sont envoyés automatiquement. Le site actualise les données toutes les 5 secondes tant qu'il est visible.
4. Hors ligne, les envois restent dans `%LOCALAPPDATA%\GenshinTracker\outbox`, séparés par site et compte. Utiliser **Réessayer l'envoi** ou redémarrer l'application. Les exports restent également dans le dossier choisi.
5. Pour révoquer un appareil : **Synchronisation → Dissocier** sur le site. Une nouvelle association sera nécessaire.

HTTPS est obligatoire pour une adresse distante ; HTTP est accepté uniquement sur la boucle locale. Le PC Windows et le Mac n'ont pas le même `localhost` : utiliser l'adresse HTTPS du serveur pour le PC de jeu. Le site permet aussi un import manuel GOOD, sans garantie de complétude.

## Politique de mise à jour

- Personnages : fusion par clé GOOD ; champs lus mis à jour, personnages absents conservés.
- Matériaux : quantités fournies mises à jour ; ressources absentes conservées.
- Armes et artéfacts : remplacement seulement si le rapport signale un parcours terminé sans erreur, la catégorie sélectionnée et un compteur du jeu égal au nombre d'objets. Cela ne garantit pas l'exactitude OCR. Les inventaires précédents sont conservés sinon ; un premier relevé partiel peut initialiser un compte vide et est marqué partiel.
- Les scans en retard ne régressent pas les catégories plus récentes. Un scan reçu deux fois n'est pas appliqué deux fois.
- Historique : 30 derniers relevés visibles, avec erreurs, personnages incomplets et catégories conservées. Le serveur garde les métadonnées de tous les relevés ; le GOOD brut reste dans les exports locaux de l'application.
- La synchronisation ne supprime ni compte ni export local. Les données non couvertes par Kamera restent inconnues.

## Héberger avec HTTPS

Prérequis : Docker Compose, domaine pointant vers le serveur, ports 80/443 accessibles pour Caddy. Depuis le dossier `web` :

```sh
cp .env.example .env
# Renseigner le vrai DOMAIN dans .env.
docker compose up -d --build
```

Le build attend `dist/GenshinTracker-KameraFR-0.2.0.zip` à la racine du projet. Caddy gère HTTPS. La base est dans le volume `tracker-data`, les certificats dans `caddy-data`. Ne pas exposer directement le port Node sur Internet.

Pour un reverse proxy existant, lancer Node avec `HOST=127.0.0.1`, `PORT`, `PUBLIC_URL=https://votre-domaine` et `DATABASE_PATH` selon l'installation. L'origine publique doit correspondre exactement à celle du navigateur. Aucun secret serveur n'est nécessaire dans `.env` ; les sessions et clés d'appareils sont générées aléatoirement.

Sauvegarder le répertoire SQLite, avec ses fichiers WAL/SHM si présents, après arrêt du service pour une copie cohérente. Protéger les sauvegardes comme les données du compte. Le service utilise un seul processus et une base locale ; ce déploiement vise un petit service personnel.

## Tests et limites

```sh
npm test
```

Tests HTTP/SQLite : association et usage unique du code, isolation de comptes, révocation, rejouabilité, scans partiels et anciens, validation, origine des requêtes, import et persistance. Le transport de l'application compile, mais DPAPI, interface WinForms et scan réel n'ont pas été exécutés sur Windows.

Direction visuelle UI/UX Pro Max documentée dans `design-system/genshin-tracker/pages/dashboard.md`. Le navigateur intégré est indisponible et l'accès natif à Safari a été refusé : rendu et responsive non vérifiés visuellement dans cette session. Les portraits disponibles et le catalogue sont locaux ; leurs sources sont dans `public/assets/SOURCES.md`.


## Depuis GitHub vers Hostinger

Le dépôt contient le code du site et de l'application. Les ZIP compilés sont dans **Releases**, produits par `.github/workflows/release.yml` après le push sur main. Pour déployer, le plus direct est de télécharger le paquet **Serveur**, qui contient également le ZIP Windows attendu par le Dockerfile.

Depuis un clone Git seul, créer `dist/` et y placer l'asset `GenshinTracker-KameraFR-0.2.0.zip` téléchargé de la release avant le build Docker. Le moteur exige Node.js 24+ et un répertoire SQLite persistant. Un hébergement limité aux fichiers statiques ou PHP ne suffit pas : le site possède une API et une base de données. Aucun serveur Hostinger n'a été modifié dans cette livraison.
