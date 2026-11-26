# Notes techniques historiques

Archive du README conservée le 17 novembre 2026. Les versions, résultats de tests et limites ci-dessous décrivent les étapes de développement de l’époque ; ils ne constituent pas une description à jour du produit. Consultez le [README du projet](../README.md), le [guide du scanner](SCANNER.md) et le [guide développeur](DEVELOPPEMENT.md) pour démarrer.

---

# Genshin Tracker — site Next.js 0.4 / Kamera FR 0.3

Un compagnon Windows et un site personnel pour retrouver les données de son compte Genshin. Le jeu reste en français. Base complète d'Inventory Kamera, interface revue et synchronisation après les scans.

## Utiliser l'application Windows

1. Extraire **tout** `GenshinTracker-KameraFR-0.4.1.zip` dans un dossier où vous pouvez écrire. Garder les DLL, `tessdata` et `inventorylists` à côté de `InventoryKamera.FR.exe`.
2. Lancer l'exécutable. Prérequis hérités : **.NET Framework 4.7.2+** et **Visual C++ 2015–2022**. Le manifeste demande les droits administrateur pour piloter le jeu. Exécutable non signé.
3. Utiliser Genshin en **français**, clavier/souris, format **16:9 ou 16:10**, HDR désactivé. Les touches B/C/1 peuvent être configurées dans Options.
4. Dans **Options du scan**, préciser le nom personnalisé du Voyageur et du Nomade si nécessaire, ainsi que le dossier des exports.
5. Ouvrir le menu Paimon puis cliquer **Scanner Genshin**. Ne pas déplacer la souris pendant le parcours. **ENTRÉE arrête le scan** ; les actions s'arrêtent aussi si Genshin perd le premier plan.
6. Consulter les onglets **Lecture en direct**, **Journal et erreurs** et les exports GOOD / `.rapport.json`.

Les raretés minimales sont à 1 par défaut. L'OCR est un modèle Tesseract français/anglais préentraîné avec 1 519 correspondances des noms du jeu : pas de traduction automatique et pas de nouvel entraînement sur des captures.

## Connecter le site et l'application

Sur le site, créer un compte du tracker. Dans **Connexion** de l’application, saisir l’adresse du site, le pseudo et le mot de passe du tracker : le PC est relié automatiquement. Le mot de passe n’est pas conservé ; une clé protégée par Windows permet de reprendre la synchronisation aux prochains démarrages. Le code temporaire du site reste une autre méthode, nécessaire une seule fois.

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

## Licence

Copyright (c) 2026 Lux Audere.

Le code original du site et les outils propres à ce dépôt sont sous **GNU AGPL version 3 uniquement** (`AGPL-3.0-only`), voir [LICENSE](../LICENSE). Vous pouvez les utiliser, les modifier, les distribuer et proposer votre propre hébergement, y compris payant, en respectant cette licence. Une version modifiée accessible en ligne doit proposer à ses utilisateurs le code source correspondant sous la même licence. Le logiciel est fourni sans garantie.

Le compagnon Windows dans `InventoryKamera-FR/`, y compris nos adaptations, reste sous sa [licence MIT](../InventoryKamera-FR/LICENSE). Les composants tiers, données, modèles OCR et ressources du jeu conservent leurs licences et droits respectifs : voir `licenses/`, `UPSTREAM.md`, `web/public/assets/SOURCES.md` et `web/public/simulator/`. La licence AGPL ne confère aucun droit supplémentaire sur les illustrations de Genshin Impact.

Code source : https://github.com/Ashuraz91z/Genshin-Tracker . Le dépôt reste privé pendant la préparation de sa publication. Le service en ligne géré par Lux Audere est destiné à être payant ; l’auto-hébergement du code est autorisé par ses licences.


## GitHub et livraison

Code du site : `web/` ; code de l'application : `InventoryKamera-FR/`. Le workflow GitHub Actions construit et teste Next.js en mode production, puis compile l’application et publie les paquets dans Releases. Le serveur de production se lance par `npm run build` puis `npm start` depuis `web/` (variable `PORT`, 3000 par défaut), ou avec Docker/Caddy. Les modèles OCR sont récupérés automatiquement au build depuis une version officielle figée et vérifiés par SHA-256. Les exécutables, bases SQLite, connexions locales et fichiers `.env` ne sont pas versionnés. Guide Hostinger : `web/README.md`.

### Correctif Windows 0.2.2

Un dossier d’export vide utilise automatiquement `Documents\GenshinTracker\Exports`. Un chemin invalide ou inaccessible affiche un avertissement avant le scan. Le bouton d’ouverture du dossier et l’export utilisent le même contrôle.

### Activation du jeu (Windows 0.2.2)

Avant la première capture, Kamera attend jusqu’à 15 secondes que Genshin soit au premier plan. Si Windows refuse l’activation automatique, revenir dans le jeu avec Alt+Tab en gardant le menu Paimon ouvert. Pendant le scan, quitter le jeu arrête toujours les actions. Comportement à valider sur le PC Windows.

## Compte et diagnostic — Kamera FR 0.3.0 / site 0.4.0

- **Mon compte** dans l’application affiche les données réellement enregistrées sur le site : personnages, niveaux et aptitudes, compteurs de collection et 30 derniers relevés. Actualisation après connexion/envoi, au démarrage et toutes les 30 secondes hors scan ; bouton manuel disponible. Les clés existantes restent compatibles.
- **Journal et erreurs** montre les étapes horodatées, la préparation de l’export et les résultats par catégorie (reçu, appliqué, vide, ancien ou conservé). Les rapports incluent jusqu’à 500 étapes, consultables sur le site. Les erreurs HTTP du serveur sont expliquées ; les envois refusés restent en attente.
- Un relevé vide des personnages/matériaux n’avance plus leur date de référence : un relevé valide arrivé plus tard peut être appliqué. Les personnages incomplets restent dans le rapport, sans inventer de statistiques.
- Lors d’un import manuel sur un inventaire déjà rempli, le site propose explicitement de remplacer les armes/artéfacts. Sans ce choix, les anciens équipements sont conservés si le nouveau fichier ne confirme pas un scan complet. Le remplacement manuel reste marqué non vérifié.
- Déployer le site 0.4.0 avant d’utiliser les nouvelles fonctions de l’application ; mettre à disposition `GenshinTracker-KameraFR-0.4.0.zip` et ajuster DOWNLOAD_PATH. Ne pas déplacer ni recréer la base SQLite existante.

Les tests de transport ne remplacent pas un essai Genshin/DPAPI réel sur Windows. L’application affiche les données exportées ; elle ne calcule pas de statistiques de combat absentes du fichier.

### Connexion Windows 0.3.1

L’onglet Connexion affiche le compte déjà relié dès le démarrage et après identification. Le formulaire est masqué tant que le PC est associé. **Changer de compte / se reconnecter** le réouvre explicitement ; **Garder le compte actuel** l’annule. Aucun jeton ni compte existant n’est supprimé et les champs secrets sont vidés à la fermeture du formulaire.

### Synchronisation et exports — Windows 0.3.2 / site 0.4.2

Un export crée deux fichiers complémentaires : `…json` contient l’inventaire GOOD à importer ; `….rapport.json` contient les erreurs et étapes du même scan. Ils ne représentent pas deux scans. Le raccourci Entrée est désarmé dès la fin de collecte : fermer le message de résultat ne recrée plus un export interrompu.

Un HTTP 401 est affiché comme accès refusé, sans prétendre que le PC est connecté. Les réponses d’une ancienne connexion ne remplacent plus l’état du nouveau compte. Reconnectez-vous une fois puis utilisez **Réessayer l’envoi**. Si le site/compte a changé, les anciens envois restent isolés ; **Envoyer un fichier GOOD existant** permet de choisir explicitement le fichier destinataire sans refaire le scan.

La file reprend automatiquement toutes les 30 secondes hors scan (sauf accès refusé). Un fichier définitivement refusé en 400/413/415/422 est conservé dans `outbox/<compte>/refused` avec le motif et ne bloque plus les autres. Réseau/401/429/5xx conservent les envois pour reprise. Le résultat est visible en bas de l’application dans tous les onglets.

Le site utilise un stockage persistant hors des builds quand PUBLIC_URL est défini et DATABASE_PATH absent. Sur Hostinger (`hbuilds`), il utilise `tracker-data/tracker.sqlite` à côté de `hbuilds`. Il recherche l’ancienne base dans les builds et en copie une sauvegarde SQLite cohérente si aucune base persistante n’existe ; comptes et clés sont conservés, les originaux restent en place. Une configuration explicite DATABASE_PATH est toujours prioritaire.

### Artéfacts OCR — Windows 0.4.0 / site 0.4.5

Le parseur ne confond plus le numéro de ligne OCR avec l’index d’une sous-statistique. Les lignes sans nombre ne provoquent plus d’index hors limites. Les aperçus de statistiques « à activer » complets sont ignorés ; les suffixes tronqués et les statistiques actives illisibles rendent la pièce invalide plutôt que d’inventer une valeur. Une sous-statistique sans clé ou invalide empêche désormais l’export de cette pièce.

Une exception de traitement est rapportée avec type de pièce, numéro, exception interne et pile d’appel ; la capture et le diagnostic restent sous `logging/ocr-errors/`. La pièce fautive est ignorée et le worker poursuit les suivantes. Les bitmaps sont libérés dans finally. Une tâche de lecture de personnage équipé n’est plus lancée hors du groupe attendu lorsque la pièce n’est pas équipée.

Le serveur peut reprendre les anciens fichiers contenant des artéfacts invalides : les pièces refusées sont exclues avec leur motif dans le rapport, et les autres catégories/pièces valides sont traitées. Un inventaire existant n’est pas remplacé si des pièces ont été rejetées, même avec l’option de remplacement manuel. Le relevé reste partiel/non vérifié ; comparer les quantités à celles du jeu. Le HTTP 400 « Statistiques secondaires invalides » n’est pas un échec d’authentification.

### Équipements du jeu français — Kamera FR 0.4.1

- La lecture du propriétaire accepte désormais « Équipé par Sangonomiya Kokomi » sans deux-points, pour les armes comme pour les artéfacts ; les libellés avec deux-points restent reconnus.
- Garder « Lier les armes » et « Lier les artéfacts » cochés. Un ancien GOOD dont `location` est vide ne permet pas de retrouver rétroactivement les propriétaires : refaire uniquement les catégories Armes / Artéfacts suffit.
- Extraire le ZIP 0.4.1 complet. Les données du compte sur le site et l’association de l’appareil sont conservées. Le correctif ne change pas la base de données.

### Nouvelle adresse du site — Kamera FR 0.4.2 / site 0.6.1

- L’adresse proposée par défaut est désormais `https://genshin-tracker.com` ; l’ancienne adresse `genshin.lux-audere.com` ne répond plus.
- Une adresse déjà enregistrée dans Kamera est conservée : si elle pointe vers genshin-tracker.com, la mise à jour n’est pas nécessaire.
- Site : simulateur gcsim 2.50.0, crédits des composants dans les mentions légales.

### Interface HUD — Kamera FR 0.5.0 / site 0.7.0

- Nouvelle interface de Kamera dans les couleurs du site : cadres à équerres dorées, boutons à coins coupés, en-tête animé avec l'état du scanner, jauges sur les compteurs, journaux en console.
- Choix de la langue du jeu (EN ou FR) dans Kamera.
- Le scan, la synchronisation et l'association de l'appareil ne changent pas. Extraire le ZIP 0.5.0 complet.
- Site : éditeur d'artéfacts avec tirages par ligne, conseils de domaine selon le RA estimé, et autres améliorations depuis la 0.6.1.

### Interface en verre — Kamera FR 0.6.1 / site 0.7.2

- Kamera affiche une nouvelle interface moderne (WebView2, présent sur Windows 10 et 11) : panneaux en verre flouté, fond animé, compteurs en anneaux, viseurs sur les captures OCR, barre de titre sombre sur Windows 11. Mêmes couleurs que le site.
- Le scan, les réglages, la connexion et l'envoi au site fonctionnent comme avant. Si WebView2 manque, l'interface 0.5 s'affiche à la place.
- Extraire le ZIP 0.6.1 complet (nouvelles DLL Microsoft.Web.WebView2).
- 0.6.1 : la 0.6.0 n'embarquait que le chargeur WebView2 32 bits et retombait sur l'interface 0.5 ; corrigé.

### Interface en anglais — Kamera FR 0.6.2 / site 0.7.3

- Kamera peut s'afficher en français ou en anglais : sélecteur FR / EN en bas du menu latéral. Le choix est retenu sur le PC ; par défaut, la langue de Windows.
- Les messages du scan et de la synchronisation sont traduits ; le journal détaillé reste en français.
- La langue du jeu (Options) reste un réglage séparé.
- 0.6.3 : Kamera plantait au démarrage quand la langue du jeu était réglée sur English (modèle OCR `genshin_fast_09_04_21` absent du paquet). L'anglais utilise maintenant le modèle `eng` fourni.

### Profil et monnaies — Kamera FR 0.7.0 / site 0.8.0

- Nouvelle case **Profil et monnaies** (cochée par défaut) : Kamera relève le pseudo et l'UID (menu Paimon), les primogemmes, les destins, les astéries et astrions libres (écran des vœux, touche F3) et les moras (écran des personnages).
- Sans nom de Voyageur saisi, le pseudo du menu Paimon sert de nom au Voyageur.
- Site : carte « Votre compte en jeu » sur la vue d'ensemble ; la prévision de primogemmes reprend les primogemmes et pierres de la fatalité du dernier scan.
- Zones de lecture calibrées sur un écran 1920×1080 en français ; à vérifier sur les autres résolutions.
- 0.7.1 : pseudo gardé avec ses majuscules ; icônes colorées ignorées à la lecture (elles étaient lues comme des chiffres) ; primogemmes et destins lus séparément ; astéries (Starglitter) et astrions (Stardust) remis dans le bon ordre ; moras lus sur la page Constellation.
- 0.7.2 : les deux destins sont relevés — Pierre de la fatalité (rose, bannières événement) et Pierre de la destinée (bleue, bannière permanente). Kamera reconnaît la bannière ouverte puis passe à l'autre type de bannière avec les flèches. Noms français du jeu sur le site.
