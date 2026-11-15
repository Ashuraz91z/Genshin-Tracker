# Capture Windows et données Genshin

Recherche du 15 novembre 2026. Cadrage documentaire, aucun logiciel testé sur le jeu.

## Comment observer les écrans et les clics sous Windows ?

### Takeaway
La capture de fenêtre et les événements souris sont exposés par Windows. Cela rend un compagnon local plausible, sans prouver sa compatibilité avec le client Genshin actuel. Observer des clics et en produire automatiquement sont deux périmètres distincts à clarifier.

### Cited Findings
- Windows.Graphics.Capture fournit les images d'une fenêtre ou d'un écran choisi dans une interface système ; il faut vérifier la prise en charge et traiter les changements de taille. La documentation précise aussi des contraintes HDR. — [Microsoft, capture](https://learn.microsoft.com/en-us/windows/apps/develop/media-authoring-processing/screen-capture)
- LowLevelMouseProc permet de recevoir les événements souris ; le callback doit répondre vite. Microsoft recommande généralement Raw Input plutôt que les hooks bas niveau pour observer efficacement des entrées destinées à d'autres threads. — [Microsoft, souris](https://learn.microsoft.com/en-us/windows/win32/winmsg/lowlevelmouseproc)
- SendInput produit touches, mouvements et clics ; UIPI limite les entrées aux processus de niveau d'intégrité égal ou inférieur. La présence de l'API ne garantit donc pas qu'elle puisse piloter le jeu dans la configuration choisie. — [Microsoft, SendInput](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput)

### Inferences
- Proposition : un petit compagnon Windows C#/.NET pour capture et lecture locale, relié par HTTPS au site. Choisir définitivement le framework d'interface après un test de capture et OCR sur le PC cible.
- Si observation demandée : démarrage/arrêt explicites, événements filtrés lorsque Genshin est au premier plan, capture après stabilisation de l'écran, horodatage et coordonnées relatives à la fenêtre. Un clic seul ne permet pas de connaître l'objet sélectionné : il faut interpréter l'image.
- Première preuve utile : lire correctement un écran d'artéfact en conditions fixées et afficher les champs reconnus, avec correction manuelle ; conserver une capture locale pour expliquer les erreurs. Pas besoin de serveur pour ce premier test.
- Le site recevrait des données structurées après validation ; ne pas transmettre une vidéo continue par défaut. Pas de collecte du clavier ou du chat sans besoin confirmé.

### Gaps
- « Messages et clics » peut désigner écrans et clics automatiques, actions observées ou chat. Attendre la précision avant de figer la V1.
- Langue du jeu, Windows, résolution, HDR, mode fenêtré, contrôleur, PC de jeu et cas d'usage sont inconnus. Pas de garantie anti-cheat ni de validation réelle sur le compte.

## Peut-on réutiliser un scanner existant ?

### Takeaway
Oui, des projets ouverts effectuent déjà OCR et navigation d'inventaire ; le chemin le plus court pour prouver l'import du compte est de tester leur export GOOD avant de réécrire un scanner complet.

### Cited Findings
- Inventory Kamera annonce l'OCR des personnages, armes, artéfacts et matériaux, avec export JSON GOOD. Sa documentation exige l'anglais, les ratios 16:9 ou 16:10, ne prend pas en charge HDR et précise que le scan automatique utilise souris et clavier. Licence du dépôt MIT. — [Inventory Kamera](https://github.com/Andrewthe13th/Inventory_Kamera)
- AdeptiScanner propose lecture manuelle et automatique ; son mode automatique réclame les droits administrateur et prend la souris. Son auteur présente l'acceptabilité comme son interprétation des conditions, et conseille d'éviter l'automatisation en cas d'inquiétude : ce n'est pas une autorisation officielle. — [AdeptiScanner](https://github.com/D1firehail/AdeptiScanner-GI)
- Enka.Network indique récupérer les données de la vitrine des personnages. Cela ne documente pas un accès à tout l'inventaire ou à toutes les quêtes. — [Enka.Network](https://enka.network/)

### Inferences
- Proposition : prévoir import/export GOOD comme interopérabilité, tout en ajoutant séparément progression, quêtes, événements et provenance. GOOD ne doit pas être présenté comme une extraction universelle du compte.
- Si navigation automatique retenue, tester un seul menu, reconnaître l'écran avant chaque action, suspendre à la perte de focus et fournir un arrêt immédiat. Ne pas copier une boucle de coordonnées aveugle.

### Gaps
- Aucun scanner n'a été exécuté ; compatibilité avec la version actuelle du jeu et taux d'erreur inconnus. Aucun engagement officiel d'absence de sanction trouvé dans ce passage de recherche. La documentation des projets ne constitue pas une telle garantie.
- La définition GOOD complète n'a pas pu être chargée par le navigateur de recherche ; le fait qu'Inventory Kamera exporte ce format est confirmé par son propre dépôt.

## Quelles sources pour le référentiel en parallèle ?

### Takeaway
Séparer données structurées du jeu, conseils de builds et actualités temporaires. Une source unique ne couvre pas de façon démontrée l'ensemble demandé.

### Cited Findings
- genshin-db fournit notamment personnages, talents, armes, artéfacts, matériaux et domaines, avec langues du jeu dont le français. Le dépôt prévient que les formats peuvent changer entre versions ; l'API publique n'inclut pas certaines fonctions de statistiques. — [genshin-db](https://github.com/theBowja/genshin-db)
- KQM publie ses propres guides de personnages, armes, artéfacts et équipes, avec des versions associées aux guides. Ce sont des recommandations de theorycrafting, à différencier des caractéristiques intrinsèques d'un objet. — [KQM](https://keqingmains.com/)

### Inferences
- Référentiel proposé : identifiants stables, noms FR, coûts de progression, sources de matériaux et disponibilités ; ajouter version du jeu, URL source et date de vérification.
- Construire des règles de calendrier distinctes : rotation quotidienne des récompenses, reset quotidien/hebdomadaire, réapparition des ressources et échéances d'événements ne signifient pas la même chose. Conserver serveur et fuseau.
- Actualités et événements : privilégier annonces officielles HoYoLAB/HoYoverse et une validation éditoriale au départ ; garder date de début/fin et conditions d'accès, plutôt que promettre une collecte universelle immédiate.

### Gaps
- Aucun calendrier particulier ni événement actuel vérifié ; le site officiel d'actualités n'a pas fourni de texte exploitable lors de l'ouverture. Aucun flux officiel stable confirmé dans cette recherche.
- Exhaustivité des quêtes/exploration, fraîcheur de toutes les catégories, droits de republication des contenus tiers et couverture des coûts à vérifier avant intégration massive.
