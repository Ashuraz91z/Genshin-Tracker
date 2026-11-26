# Kamera FR : installation et utilisation

Kamera FR lit les menus de Genshin Impact sur Windows avec la reconnaissance de texte (OCR). Il relève les personnages et leurs talents, les armes, les artéfacts et les matériaux pris en charge. Le jeu reste en français.

## Installer le scanner

1. Téléchargez le paquet Windows dans les [Releases de Genshin Tracker](https://github.com/Ashuraz91z/Genshin-Tracker/releases), et non l’archive du bouton « Code » de GitHub.
2. Extrayez **tout le ZIP** dans un dossier où vous pouvez écrire. Gardez les DLL, `tessdata` et `inventorylists` à côté de `InventoryKamera.FR.exe`.
3. Installez **.NET Framework 4.7.2 ou supérieur** et le **Microsoft Visual C++ Redistributable 2015–2022**, si nécessaire.
4. Lancez `InventoryKamera.FR.exe`. L’exécutable demande les droits administrateur pour interagir avec le jeu ; il n’est pas signé.

La version du site et celle du scanner ont des numéros indépendants. Choisissez le paquet Kamera FR proposé dans la release, même si son nom de version diffère de celui du site.

## Préparer Genshin Impact

- Langue du jeu : **français**.
- Contrôles : clavier et souris.
- Résolution : format **16:9 ou 16:10** ; HDR désactivé.
- Raccourcis par défaut : inventaire **B**, personnages **C**, personnage actif **1**. Les touches B/C/1 sont configurables dans les options du scanner.
- Dans **Options du scan**, indiquez les noms personnalisés du Voyageur et du Nomade, si vous les avez renommés, et le dossier des exports.

Les raretés minimales sont à 1 par défaut. Sélectionnez les catégories que vous voulez relever avant de commencer.

## Relier le PC au carnet

Créez un compte sur [Genshin Tracker](https://genshin-tracker.com). Dans l’onglet **Connexion** du scanner, renseignez l’adresse du site, votre pseudo et votre mot de passe **du tracker**. Utilisez un mot de passe différent de celui de HoYoverse.

Le scanner ne conserve pas ce mot de passe. Il mémorise une clé d’appareil protégée par Windows pour reprendre les synchronisations. Vous pouvez révoquer cet accès depuis **Synchronisation** sur le site.

Vous pouvez aussi générer un code d’association depuis le site et le saisir dans le scanner. Ce code est à usage unique et valable dix minutes. Gardez-le privé.

Pour un site hébergé à distance, utilisez son adresse HTTPS. `localhost` désigne l’ordinateur qui l’utilise : cette adresse ne permet pas au scanner d’atteindre un site installé sur un autre ordinateur.

## Lancer un scan

1. Ouvrez le menu Paimon dans Genshin.
2. Lancez **Scanner Genshin** dans Kamera FR, puis laissez le jeu au premier plan.
3. Ne touchez pas la souris ni le clavier pendant le parcours : le scanner les utilise pour naviguer.
4. Appuyez sur **Entrée** pour interrompre le scan. Quitter la fenêtre du jeu suspend également les actions.
5. Consultez **Lecture en direct**, **Journal et erreurs**, puis les fichiers exportés.

Avec **Profil et monnaies** coché, le scan commence par relever le pseudo et l'UID dans le menu Paimon, puis ouvre l'écran des vœux avec **F3** (primogemmes, destins de la bannière affichée, astérions et astéries libres) et l'écran des personnages (moras). Gardez la touche des vœux sur F3. Le destin lu dépend de la bannière ouverte : entrelacé sur une bannière événement, lié sur la bannière permanente.

Les captures et la géométrie de lecture peuvent demander une adaptation à votre configuration. Le projet ne garantit pas la compatibilité avec toutes les versions du jeu ni l’absence de sanction ; il n’est pas approuvé par HoYoverse.

## Comprendre les fichiers exportés

| Fichier | Contenu | Usage |
| --- | --- | --- |
| `…json` | Inventaire au format GOOD | À sélectionner sur le site pour importer les personnages, équipements et matériaux relevés. |
| `….rapport.json` | Étapes, erreurs et informations sur le scan | À consulter pour comprendre un relevé incomplet ; ce n’est pas le fichier d’inventaire. |

Le format **GOOD** est un format d’échange JSON utilisé par plusieurs outils Genshin. Ce fichier contient un relevé d’inventaire, pas une sauvegarde complète du jeu : il ne contient pas vos quêtes ni votre exploration.

Après un scan, le scanner garde les exports sur le PC et tente de les envoyer au compte associé. Les captures OCR de diagnostic restent locales, sauf si vous décidez de les transmettre pour obtenir de l’aide.

## Résoudre les problèmes courants

| Problème | Que faire |
| --- | --- |
| Le jeu n’arrive pas au premier plan | Le scanner attend jusqu’à quinze secondes. Revenez dans Genshin avec Alt+Tab en laissant le menu Paimon ouvert. |
| Un objet ou son propriétaire est mal reconnu | Vérifiez langue, résolution, HDR et noms personnalisés. Consultez le rapport ; ne supposez pas que le scan est complet. |
| La synchronisation échoue ou le réseau est coupé | Les exports restent locaux et les relevés sont mis en attente. Utilisez **Réessayer l’envoi** sans recommencer le scan. |
| Le site refuse l’accès avec un HTTP 401 | Reconnectez le scanner au compte voulu. Les données locales ne sont pas supprimées. |
| Vous avez changé de site ou de compte | Les files d’envoi restent séparées. Utilisez **Envoyer un fichier GOOD existant** pour choisir ce que vous transférez. |
| Une catégorie est incomplète | Relancez uniquement les catégories concernées et comparez les compteurs en jeu. Un parcours terminé ne garantit pas un inventaire exhaustif. |

Sur le site, un scan partiel ne remplace pas un inventaire complet d’équipements déjà connu. Un remplacement manuel est possible après un choix explicite dans l’interface ; il peut retirer les équipements absents du fichier. Lisez ce choix avant de confirmer.

Pour obtenir de l’aide, ouvrez une [issue](https://github.com/Ashuraz91z/Genshin-Tracker/issues) avec les étapes et la version. Retirez les noms personnels, chemins locaux, clés et mots de passe des journaux ou captures avant de les partager.

## Licence

Kamera FR adapte [Inventory Kamera](https://github.com/Andrewthe13th/Inventory_Kamera) sous licence MIT. Les notices sont incluses dans le paquet. Les bibliothèques et modèles OCR conservent leurs licences respectives ; Genshin Impact et ses contenus appartiennent à leurs ayants droit.
