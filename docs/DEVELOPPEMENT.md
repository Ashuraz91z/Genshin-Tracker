# Développer et héberger Genshin Tracker

## Organisation du dépôt

| Chemin | Contenu |
| --- | --- |
| `web/` | Site Next.js et React, API Node.js, stockage SQLite et tests web. |
| `InventoryKamera-FR/` | Scanner C# / WinForms basé sur Inventory Kamera, adapté au français. |
| `scripts/` | Préparation des données, modèles OCR et paquets de distribution. |
| `tests/` | Tests C# du scanner et contrôles Python du référentiel. |
| `licenses/` | Licences et notices des composants tiers. |
| `docs/` | Guide du scanner, développement et notes historiques. |
| `reports/` et `research_notes/` | Cadrage et recherches techniques conservés comme sources de travail. |

Le [README du projet](../README.md) décrit les fonctions utilisateur. La [provenance](../UPSTREAM.md) et les fichiers `SOURCES.md` documentent les versions des référentiels et du moteur.

## Lancer le site en développement

Prérequis : **Node.js 24+** et npm.

```sh
git clone https://github.com/Ashuraz91z/Genshin-Tracker.git
cd Genshin-Tracker/web
npm ci
npm run dev
```

Le serveur écoute sur **http://127.0.0.1:8788**. Aucun compte ni inventaire de démonstration n’est préchargé. Vous pouvez importer un fichier d’inventaire en mode visiteur ou créer un compte local.

## Vérifier le site

Depuis `web/` :

```sh
npm run build
npm test
npm run test:engine
```

Le build prépare la sortie Next.js autonome et ses ressources. Les tests HTTP lancent un serveur de production avec une base temporaire. Les tests du moteur exécutent le WebAssembly gcsim sur un inventaire de test, sans accès à Genshin.

## Héberger une instance

```sh
cd web
npm ci
npm run build
npm start
```

`npm start` écoute sur le port **3000** par défaut (`PORT` permet de le changer). Placez le serveur derrière un reverse proxy HTTPS pour un accès distant. Le [guide d’exploitation](../web/README.md) décrit aussi Docker/Caddy et les migrations de stockage.

| Variable serveur | Rôle |
| --- | --- |
| `PUBLIC_URL` | Origine HTTPS exacte de l’instance ; nécessaire pour l’accès distant et le contrôle des origines. |
| `DATABASE_PATH` | Chemin vers la base SQLite persistante, hors du dossier de build. |
| `DOWNLOAD_PATH` | Chemin du ZIP Kamera FR servi au téléchargement, si vous proposez le compagnon. |
| `PORT` | Port du serveur autonome ; 3000 par défaut. |
| `HOST` / `HOSTNAME` | Interface d’écoute du serveur. |
| `ADMIN_EMAILS` | Adresses e-mail (séparées par des virgules) des comptes administrateurs. L’adresse doit être confirmée ; le panel est sur `/admin`. |
| `SUPPORT_EMAIL` | Boîte qui reçoit les demandes de la page `/aide` ; `contact@genshin-tracker.com` par défaut. |

Le volume SQLite contient les comptes, sessions, appareils associés et inventaires. Gardez le même `DATABASE_PATH` lors d’une mise à jour et effectuez une sauvegarde cohérente. **Ne supprimez pas la base ou le volume Docker pour déployer une nouvelle version.** N’ajoutez ni base utilisateur, ni export privé, ni `.env`, ni secret au dépôt.

## Construire le scanner Windows

Prérequis : **.NET SDK 8+**, **Python 3.9+** et un accès réseau pour les dépendances et modèles OCR. La cible de l’application reste .NET Framework 4.7.2.

Depuis la racine du dépôt :

```sh
bash scripts/build_windows.sh
```

Ce script récupère les modèles OCR figés et vérifie leurs empreintes, compile le compagnon, exécute les contrôles C#/Python, puis prépare le ZIP dans `dist/`. `DOTNET` et `PYTHON` permettent de choisir les exécutables. Une compilation depuis macOS ne valide pas WinForms, DPAPI ou la navigation réelle dans le jeu sur Windows.

Pour régénérer les données à partir d’un checkout de genshin-db :

```sh
python3 scripts/prepare_french_data.py /chemin/vers/genshin-db
python3 scripts/prepare_web_assets.py /chemin/vers/genshin-db
```

## Préparer les distributions

Le workflow [Build and release Windows app](../.github/workflows/release.yml) construit et teste le site, vérifie le moteur, puis compile et emballe le scanner et le serveur. Chaque push sur `main` produit une **release brouillon** (visible seulement par les collaborateurs du dépôt) pour la version de `web/package.json` ; les push suivants remplacent les fichiers de ce brouillon. Une version devient publique seulement quand on publie le brouillon après un essai réel sous Windows :

```bash
gh release edit vX.Y.Z --draft=false --latest
```

Une release déjà publique n’est jamais modifiée : changez la version dans `web/package.json` pour un nouveau cycle de test.

- Le paquet Windows inclut son guide utilisateur, les modèles, DLL et notices.
- Le paquet serveur inclut les sources web et le ZIP du compagnon attendu par `DOWNLOAD_PATH`.
- Les numéros de version du site et du scanner sont indépendants.
- `dist/`, les sorties de build, données locales et dépendances ne sont pas versionnés.

Avant une contribution, lancez les vérifications concernées, décrivez le changement et les limites de validation. Pour un changement du scanner, distinguez les tests automatisés d’un essai réel sur le jeu. Préservez les notices [AGPL du site](../LICENSE) et [MIT du scanner](../InventoryKamera-FR/LICENSE).
