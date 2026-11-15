# Genshin Tracker — site Next.js 0.3 / Kamera FR 0.2

Un compagnon Windows et un site personnel pour retrouver les données de son compte Genshin. Le jeu reste en français. Base complète d'Inventory Kamera, interface revue et synchronisation après les scans.

## Utiliser l'application Windows

1. Extraire **tout** `GenshinTracker-KameraFR-0.2.0.zip` dans un dossier où vous pouvez écrire. Garder les DLL, `tessdata` et `inventorylists` à côté de `InventoryKamera.FR.exe`.
2. Lancer l'exécutable. Prérequis hérités : **.NET Framework 4.7.2+** et **Visual C++ 2015–2022**. Le manifeste demande les droits administrateur pour piloter le jeu. Exécutable non signé.
3. Utiliser Genshin en **français**, clavier/souris, format **16:9 ou 16:10**, HDR désactivé. Les touches B/C/1 peuvent être configurées dans Options.
4. Dans **Options du scan**, préciser le nom personnalisé du Voyageur et du Nomade si nécessaire, ainsi que le dossier des exports.
5. Ouvrir le menu Paimon puis cliquer **Scanner Genshin**. Ne pas déplacer la souris pendant le parcours. **ENTRÉE arrête le scan** ; les actions s'arrêtent aussi si Genshin perd le premier plan.
6. Consulter les onglets **Lecture en direct**, **Journal et erreurs** et les exports GOOD / `.rapport.json`.

Les raretés minimales sont à 1 par défaut. L'OCR est un modèle Tesseract français/anglais préentraîné avec 1 519 correspondances des noms du jeu : pas de traduction automatique et pas de nouvel entraînement sur des captures.

## Connecter le site et l'application

Sur le site, créer un compte puis cliquer **Relier Kamera**. Dans **Connexion** de l'application, saisir l'adresse du site et le code temporaire. Les scans suivants seront envoyés automatiquement après l'export local.

- Le code est valable 10 minutes et utilisable une seule fois.
- La clé d'appareil est chiffrée par Windows DPAPI pour l'utilisateur connecté ; aucun mot de passe du site n'est enregistré par Kamera.
- En cas de panne réseau, le relevé reste dans une file locale séparée par site/compte. **Réessayer l'envoi** ou redémarrer l'application. Les exports locaux sont conservés même après réception.
- L'appareil peut être révoqué depuis **Synchronisation** sur le site.
- HTTPS est obligatoire à distance. `localhost` désigne la machine qui l'utilise, pas votre autre ordinateur.
- Le serveur fusionne personnages et matériaux. Un inventaire d'armes/artéfacts déjà présent est conservé si le nouveau scan est partiel ; les données plus anciennes ne remplacent pas les plus récentes.

Le site utilise **Next.js 16.4.6 et React 19.3.1**, avec l’App Router et les Route Handlers pour l’API. SQLite et les URL de synchronisation sont conservés, ainsi que les comptes et clés d’appareils existants si la base est conservée. Le site a quatre vues : tableau de bord, personnages/aptitudes, inventaire filtrable et journal de synchronisation. Un import GOOD manuel est aussi disponible. Les données sont persistantes en SQLite et rattachées au compte authentifié.

## Lancer le site localement

Avec Node.js 24 ou supérieur, depuis le dossier du projet :

```sh
cd web
npm ci
npm run dev
```

Ouvrir **http://127.0.0.1:8788**. Aucun compte ou inventaire factice n'est préchargé. Le déploiement autonome Docker/Caddy est décrit dans `web/README.md` (ou `SITE.md` dans le paquet Windows). Domaine et serveur de production restent à désigner ; aucun hébergement distant n'a été modifié.

## Vérification et limites

Vérifié : compilation de l'exécutable Windows ; 1 553 cas de reconnaissance/parsing ; 10 contrôles du référentiel ; 40 000 ajouts concurrents d'inventaire sans perte ; ressources WinForms ; tests HTTP/SQLite d'association, isolation des comptes, révocation, doublons, scans partiels/anciens, validation et persistance ; vérification des fichiers et empreintes du paquet.

Non exécuté sur Windows : lancement de l'interface, DPAPI, association réelle depuis l'exécutable, captures, clics et OCR dans Genshin. Le rendu web/mobile n'a pas pu être inspecté visuellement : navigateur intégré indisponible et accès à Safari refusé. Les tests API utilisent un client HTTP simulant le compagnon, pas l'exécutable Windows.

La fin d'un parcours ou des compteurs concordants ne garantissent pas un relevé complet. Kamera couvre les personnages/aptitudes, armes, artéfacts et deux onglets de matériaux. Quêtes, succès, exploration, événements, autres onglets et avatars personnalisés sans données d'aptitudes restent non couverts. Les objets illisibles peuvent manquer dans GOOD et doivent être vérifiés dans le rapport. Pas encore d'écran de correction/reprise objet par objet. Aucune arme de remplacement n'est inventée si l'équipement d'un personnage est inconnu.

La géométrie de capture reste dérivée de Kamera et peut demander une calibration sur votre version du jeu. Les captures de diagnostic sont activées par défaut pour les premiers essais et peuvent prendre de la place ; elles sont locales et archivées, pas envoyées au site. Compatibilité anti-cheat non établie.

## Construire et tester

Avec .NET SDK 8 et Python 3.9+ :

```sh
bash scripts/build_windows.sh
cd web && npm ci && npm run build && npm test
```

Le projet C# SDK cible .NET Framework 4.7.2. Le build fonctionne depuis macOS mais ne teste pas l'interface Windows.

Régénérer les données depuis un checkout genshin-db :

```sh
python3 scripts/prepare_french_data.py /chemin/vers/genshin-db
python3 scripts/prepare_web_assets.py /chemin/vers/genshin-db
```

Sources et versions : `UPSTREAM.md`, `inventorylists/source.json`, `web/public/assets/SOURCES.md`. Licences et attributions dans `licenses`. Genshin Impact et ses contenus appartiennent à leurs ayants droit ; outil communautaire non affilié à HoYoverse.


## GitHub et livraison

Code du site : `web/` ; code de l'application : `InventoryKamera-FR/`. Le workflow GitHub Actions construit et teste Next.js en mode production, puis compile l’application et publie les paquets dans Releases. Le serveur de production se lance par `npm run build` puis `npm start` depuis `web/` (variable `PORT`, 3000 par défaut), ou avec Docker/Caddy. Les modèles OCR sont récupérés automatiquement au build depuis une version officielle figée et vérifiés par SHA-256. Les exécutables, bases SQLite, connexions locales et fichiers `.env` ne sont pas versionnés. Guide Hostinger : `web/README.md`.
