# Genshin Tracker — site Next.js 0.3

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

Le paquet serveur de la release inclut les sources Next et le ZIP Windows attendu par le Dockerfile. Depuis un clone Git seul, télécharger l'asset `GenshinTracker-KameraFR-0.2.0.zip` dans `dist/` avant le build Docker.

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
| `DOWNLOAD_PATH` | Chemin absolu vers le ZIP Kamera FR 0.2 |

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
